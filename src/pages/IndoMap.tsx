// src/pages/IndoMap.tsx
// 인도네시아 학습 지도: 실제 해안선 SVG + 핀치줌/팬 + 3단 줌(섬→도시→관광지)
// 핀 탭 → 하단 시트: 이미지 보기(영구 저장) + Gemini 설명(IndexedDB 캐싱) + 사전 연결

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Volume2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAP_VIEW,
  MAP_CITIES,
  MAP_SPOTS,
  MAP_ISLANDS,
  INDONESIA_PATH,
  MapPlace,
} from "@/lib/mapData";
import { fetchPlaceInfo, fetchPlacePhotos, MapPlaceInfo } from "@/lib/map";
import { hasGeminiApiKey } from "@/lib/gemini";

const KMIN = 1;
const KMAX = 22;

type PinType = "city" | "spot";
interface Pin extends MapPlace {
  type: PinType;
}

const PINS: Pin[] = [
  ...MAP_CITIES.map((p) => ({ ...p, type: "city" as PinType })),
  ...MAP_SPOTS.map((p) => ({ ...p, type: "spot" as PinType })),
];

// TTS (앱 공통 패턴: AndroidTTS 우선 + speechSynthesis 폴백)
const speak = (text: string, lang: "id" | "ko") => {
  if ((window as any).AndroidTTS) {
    try {
      (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID");
    } catch (e) {}
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
    utterance.rate = 0.9;
    speechSynthesis?.cancel?.();
    setTimeout(() => {
      try {
        speechSynthesis?.speak?.(utterance);
      } catch (e) {}
    }, 150);
  } catch (e) {}
};

const IndoMap = () => {
  const navigate = useNavigate();

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<SVGGElement>(null);
  const islandRefs = useRef<(SVGGElement | null)[]>([]);
  const pinRefs = useRef<(SVGGElement | null)[]>([]);

  // 제스처 상태는 ref로 관리 (매 프레임 리렌더 방지)
  const vs = useRef({ k: 1, tx: 0, ty: 0 });
  const pointers = useRef<Record<number, { x: number; y: number }>>({});
  const gesture = useRef<{ mode: "pan" | "pinch"; d?: number; t?: number; moved?: number } | null>(null);
  const lastTap = useRef(0);
  const pinVisible = useRef<boolean[]>(PINS.map(() => false));

  // 하단 시트
  const [selected, setSelected] = useState<Pin | null>(null);
  const [info, setInfo] = useState<MapPlaceInfo | null>(null);
  const [infoState, setInfoState] = useState<"idle" | "loading" | "error">("idle");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoState, setPhotoState] = useState<"idle" | "loading" | "error">("idle");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const sheetOpenRef = useRef(false);
  const sheetOpenedAt = useRef(0);
  const reqIdRef = useRef(0);

  // ---------- 좌표 변환 ----------
  const pxToVb = useCallback(() => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const scale = Math.min(r.width / MAP_VIEW.w, r.height / MAP_VIEW.h);
    const ox = r.left + (r.width - MAP_VIEW.w * scale) / 2;
    const oy = r.top + (r.height - MAP_VIEW.h * scale) / 2;
    return { scale, ox, oy };
  }, []);

  const toVb = useCallback(
    (cx: number, cy: number) => {
      const m = pxToVb();
      return { x: (cx - m.ox) / m.scale, y: (cy - m.oy) / m.scale };
    },
    [pxToVb]
  );

  // ---------- 렌더 ----------
  const render = useCallback(() => {
    const s = vs.current;
    s.k = Math.max(KMIN, Math.min(KMAX, s.k));
    s.tx = Math.max(MAP_VIEW.w - MAP_VIEW.w * s.k, Math.min(0, s.tx));
    s.ty = Math.max(MAP_VIEW.h - MAP_VIEW.h * s.k, Math.min(0, s.ty));

    viewRef.current?.setAttribute(
      "transform",
      "translate(" + s.tx + " " + s.ty + ") scale(" + s.k + ")"
    );

    // 섬 이름: 항상 표시, 확대할수록 화면상 크기가 커짐 (1/k^0.6)
    const islScale = 1 / Math.pow(s.k, 0.6);
    MAP_ISLANDS.forEach((p, i) => {
      islandRefs.current[i]?.setAttribute(
        "transform",
        "translate(" + p.x + " " + p.y + ") scale(" + islScale + ")"
      );
    });

    // 핀: 부분 역스케일(1/k^0.65 — 확대할수록 화면상 글자가 커짐)
    // tier별 표시 시점: 1=대도시 k≥1.35, 2=중소도시 k≥2.4, 3=관광지 k≥3.0
    const pinScale = 1 / Math.pow(s.k, 0.65);
    PINS.forEach((p, i) => {
      const el = pinRefs.current[i];
      if (!el) return;
      const start = p.tier === 1 ? 1.35 : p.tier === 2 ? 2.4 : 3.0;
      const op = s.k < start ? 0 : Math.min(1, (s.k - start) / 0.5);
      el.setAttribute("transform", "translate(" + p.x + " " + p.y + ") scale(" + pinScale + ")");
      el.setAttribute("opacity", op.toFixed(2));
      pinVisible.current[i] = op > 0.35;
    });

    // 라벨 겹침 방지: 대도시→중소도시→관광지 우선순위로 배치하고,
    // 겹치는 라벨은 글자만 숨김(점은 유지). 확대할수록 라벨이 작아져 다시 나타남.
    const placedRects: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const order = PINS.map((_, i) => i).sort((a, b) => PINS[a].tier - PINS[b].tier);
    order.forEach((i) => {
      const p = PINS[i];
      const el = pinRefs.current[i];
      if (!el) return;
      const txt = el.querySelector("text");
      if (!txt) return;
      if (!pinVisible.current[i]) {
        txt.setAttribute("opacity", "0");
        return;
      }
      const w = (p.id.length * 10.5 + 14) * pinScale;
      const h = 30 * pinScale;
      const cx = p.x;
      const cy = p.y - 15 * pinScale;
      const rect = { x1: cx - w / 2, y1: cy - h, x2: cx + w / 2, y2: cy + 6 * pinScale };
      const hit = placedRects.some(
        (q) => rect.x1 < q.x2 && rect.x2 > q.x1 && rect.y1 < q.y2 && rect.y2 > q.y1
      );
      if (hit) {
        txt.setAttribute("opacity", "0");
      } else {
        txt.setAttribute("opacity", "1");
        placedRects.push(rect);
      }
    });
  }, []);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const s = vs.current;
      const p = toVb(px, py);
      const nk = Math.max(KMIN, Math.min(KMAX, s.k * factor));
      const f = nk / s.k;
      s.tx = p.x - (p.x - s.tx) * f;
      s.ty = p.y - (p.y - s.ty) * f;
      s.k = nk;
      render();
    },
    [render, toVb]
  );

  // ---------- 핀 탭 ----------
  const handleTap = useCallback(
    (cx: number, cy: number) => {
      const s = vs.current;
      const p = toVb(cx, cy);
      // 탭 허용 반경을 화면 픽셀 기준으로 계산. 넉넉히 44px.
      const m = pxToVb();
      const tol = 44 / m.scale;
      let best: Pin | null = null;
      let bestD = 1e9;
      // 표시된(op>0) 핀이면 라벨이 겹쳐 숨겨졌어도 점은 눌리게 함
      PINS.forEach((pin, i) => {
        const start = pin.tier === 1 ? 1.35 : pin.tier === 2 ? 2.4 : 3.0;
        if (s.k < start) return;
        const sx = pin.x * s.k + s.tx;
        const sy = pin.y * s.k + s.ty;
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (d < tol && d < bestD) {
          bestD = d;
          best = pin;
        }
      });
      if (best) openSheet(best);
    },
    [toVb, pxToVb] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ---------- 제스처 (핀치줌 / 팬 / 탭 / 더블탭) ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    render();

    const onDown = (e: PointerEvent) => {
      wrap.setPointerCapture(e.pointerId);
      pointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      const ids = Object.keys(pointers.current);
      if (ids.length === 1) {
        gesture.current = { mode: "pan", t: performance.now(), moved: 0 };
      } else if (ids.length === 2) {
        const a = pointers.current[+ids[0]];
        const b = pointers.current[+ids[1]];
        gesture.current = { mode: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) };
      }
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture.current;
      if (!pointers.current[e.pointerId] || !g) return;
      const prev = pointers.current[e.pointerId];
      pointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      const ids = Object.keys(pointers.current);

      if (g.mode === "pan" && ids.length === 1) {
        const m = pxToVb();
        vs.current.tx += (e.clientX - prev.x) / m.scale;
        vs.current.ty += (e.clientY - prev.y) / m.scale;
        g.moved = (g.moved || 0) + Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        render();
      } else if (g.mode === "pinch" && ids.length === 2) {
        const a = pointers.current[+ids[0]];
        const b = pointers.current[+ids[1]];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (g.d && g.d > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / g.d);
        g.d = d;
      }
    };

    const onUp = (e: PointerEvent) => {
      const g = gesture.current;
      const wasPan = g && g.mode === "pan";
      const moved = g ? g.moved || 99 : 99;
      const t0 = g ? g.t || 0 : 0;
      delete pointers.current[e.pointerId];
      const remain = Object.keys(pointers.current).length;

      if (wasPan && remain === 0) {
        const dt = performance.now() - t0;
        if (moved < 8 && dt < 350) {
          const now = performance.now();
          if (now - lastTap.current < 300) {
            // 더블탭: 확대 / 최대 줌이면 전체로
            zoomAt(e.clientX, e.clientY, vs.current.k >= KMAX * 0.9 ? 1 / vs.current.k : 2);
            lastTap.current = 0;
          } else {
            lastTap.current = now;
            handleTap(e.clientX, e.clientY);
          }
        }
        gesture.current = null;
      } else if (remain === 1) {
        gesture.current = { mode: "pan", t: performance.now(), moved: 99 };
      } else if (remain === 0) {
        gesture.current = null;
      }
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, [render, zoomAt, handleTap, pxToVb]);

  // ---------- 시트 열기/닫기 (+ 뒤로가기 한 단계) ----------
  const openSheet = (pin: Pin) => {
    sheetOpenedAt.current = Date.now();
    setSelected(pin);
    setInfo(null);
    setPhotos([]);
    setLightbox(null);
    if (!sheetOpenRef.current) {
      sheetOpenRef.current = true;
      try {
        history.pushState({ kkMapSheet: true }, "");
      } catch (e) {}
    }
    const reqId = ++reqIdRef.current;

    // 실제 사진 (위키피디아, 무과금)
    setPhotoState("loading");
    fetchPlacePhotos(pin.id)
      .then((urls) => {
        if (reqIdRef.current !== reqId) return;
        setPhotos(urls);
        setPhotoState(urls.length ? "idle" : "error");
      })
      .catch(() => {
        if (reqIdRef.current === reqId) setPhotoState("error");
      });
    if (!hasGeminiApiKey()) {
      setInfoState("error");
      return;
    }
    setInfoState("loading");
    fetchPlaceInfo(pin.id, pin.ko, pin.type)
      .then((r) => {
        if (reqIdRef.current === reqId) {
          setInfo(r);
          setInfoState("idle");
        }
      })
      .catch(() => {
        if (reqIdRef.current === reqId) setInfoState("error");
      });
  };

  const closeSheet = useCallback((viaPop = false) => {
    reqIdRef.current++;
    setSelected(null);
    if (sheetOpenRef.current && !viaPop) {
      sheetOpenRef.current = false;
      try {
        history.back();
      } catch (e) {}
    } else {
      sheetOpenRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (sheetOpenRef.current) closeSheet(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeSheet]);

  const zoomBtn =
    "w-10 h-10 rounded-xl bg-[rgba(9,34,40,0.6)] border border-white/15 text-white/90 flex items-center justify-center active:bg-[rgba(9,34,40,0.8)]";

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <style>{`
        .kkm-country { fill: #17555c; stroke: #3e8d95; stroke-width: 0.7; }
        .kkm-isl { font-family: Lora, serif; font-style: italic; fill: #c4e0e3; text-anchor: middle;
          letter-spacing: 0.5px; paint-order: stroke; stroke: rgba(9,34,40,0.7); stroke-width: 2.5px; }
        .kkm-isl-ko { font-family: inherit; font-style: normal; fill: #9cc3c8; }
        .kkm-pin-dot { fill: #f97316; stroke: #fff; stroke-width: 1.6; }
        .kkm-pin-dot.spot { fill: #fbbf24; }
        .kkm-pin-name { font-size: 20px; fill: #ffffff; text-anchor: middle; font-weight: 600;
          paint-order: stroke; stroke: rgba(9,34,40,0.85); stroke-width: 4px; }
      `}</style>

      {/* 헤더 */}
      <header className="relative flex items-center gap-2 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15"
          title="홈으로"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 지도</h1>
          <p className="mt-1 text-xs font-word italic text-white/45">Peta Indonesia</p>
        </div>
      </header>

      {/* 지도 */}
      <div ref={wrapRef} className="relative flex-1 min-h-0 touch-none overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full block"
          viewBox={"0 0 " + MAP_VIEW.w + " " + MAP_VIEW.h}
          preserveAspectRatio="xMidYMid meet"
        >
          <g ref={viewRef}>
            <path className="kkm-country" d={INDONESIA_PATH} />
            {MAP_ISLANDS.map((p, i) => (
              <g key={p.id} ref={(el) => (islandRefs.current[i] = el)}>
                <text className="kkm-isl" fontSize={34}>
                  {p.id}
                </text>
                <text className="kkm-isl kkm-isl-ko" fontSize={19} y={24}>
                  {p.ko}
                </text>
              </g>
            ))}
            {PINS.map((p, i) => (
              <g key={p.type + "-" + p.id} ref={(el) => (pinRefs.current[i] = el)} opacity={0}>
                <circle r={p.tier === 1 ? 9 : p.tier === 2 ? 8 : 7.5} className={"kkm-pin-dot" + (p.type === "spot" ? " spot" : "")} />
                <text className="kkm-pin-name" y={-15}>
                  {p.id}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* 범례 (좌측 하단, +/- 버튼과 같은 높이) */}
        <div className="absolute left-3.5 bottom-4 flex flex-col gap-2.5 pointer-events-none">
          <div className="flex items-center gap-2 bg-[rgba(9,34,40,0.6)] rounded-full pl-2 pr-3 py-1.5">
            <span className="w-3 h-3 rounded-full bg-[#f97316] border border-white/80 shrink-0" />
            <span className="text-[11px] font-gothic text-white/85">도시</span>
          </div>
          <div className="flex items-center gap-2 bg-[rgba(9,34,40,0.6)] rounded-full pl-2 pr-3 py-1.5">
            <span className="w-3 h-3 rounded-full bg-[#fbbf24] border border-white/80 shrink-0" />
            <span className="text-[11px] font-gothic text-white/85">관광지</span>
          </div>
        </div>
        <div className="absolute right-3.5 bottom-4 flex flex-col gap-2">
          <button
            className={zoomBtn}
            onClick={() => {
              const r = wrapRef.current!.getBoundingClientRect();
              zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.5);
            }}
            title="확대"
          >
            <Plus size={18} />
          </button>
          <button
            className={zoomBtn}
            onClick={() => {
              const r = wrapRef.current!.getBoundingClientRect();
              zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.5);
            }}
            title="축소"
          >
            <Minus size={18} />
          </button>
        </div>
      </div>

      {/* 사진 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="확대 사진" className="max-w-full max-h-full rounded-lg object-contain" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* 하단 시트 */}
      {selected && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            // 핀 탭에서 이어지는 합성 click이 시트를 즉시 닫는 것 방지
            if (Date.now() - sheetOpenedAt.current < 500) return;
            closeSheet();
          }}
        >
          <div
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[75dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3 shrink-0" />
            <div className="px-5 pt-3 pb-6 overflow-y-auto">
              {/* 이름 */}
              <div className="flex items-center gap-2.5 flex-wrap pr-8">
                <h2 className="text-xl font-bold text-gray-900">{selected.ko}</h2>
                <span className="font-word italic text-[15px] text-gray-500">{selected.id}</span>
                <button
                  onClick={() => speak(selected.id, "id")}
                  className="w-8 h-8 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center active:bg-teal-600/20"
                  title="발음 듣기"
                >
                  <Volume2 size={15} />
                </button>
                <span
                  className={
                    "text-[11px] font-gothic font-semibold px-2.5 py-1 rounded-full " +
                    (selected.type === "spot"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-orange-500/15 text-orange-700")
                  }
                >
                  {selected.type === "spot" ? "관광지" : "도시"}
                </span>
              </div>
              <p className="mt-1 text-xs font-gothic text-gray-400">{selected.hint}</p>

              {/* 실제 사진 (위키피디아) — 썸네일 3장, 탭하면 확대 */}
              {photoState === "loading" ? (
                <div className="mt-3 flex items-center justify-center gap-2 py-8 bg-gray-50 rounded-xl text-sm font-gothic text-gray-400">
                  <Loader2 size={16} className="animate-spin" /> 사진을 불러오는 중...
                </div>
              ) : photos.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {photos.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(u)}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 active:opacity-80"
                    >
                      <img src={u} alt={selected.ko + " 사진 " + (i + 1)} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => closeSheet()}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:bg-gray-200"
              >
                <X size={16} />
              </button>

              {/* 설명 */}
              <div className="mt-4">
                {infoState === "loading" && (
                  <div className="py-6 text-center text-sm font-gothic text-gray-400">
                    설명을 불러오는 중입니다…
                  </div>
                )}
                {infoState === "error" && (
                  <div className="py-4 text-center">
                    <p className="text-sm font-gothic text-gray-500">
                      {hasGeminiApiKey()
                        ? "설명을 불러오지 못했어요."
                        : "설정에서 Gemini API 키를 입력하면 설명을 볼 수 있어요."}
                    </p>
                    {hasGeminiApiKey() && (
                      <button
                        onClick={() => openSheet(selected)}
                        className="mt-2 text-xs font-gothic font-semibold text-teal-700 bg-teal-600/10 px-4 py-2 rounded-full active:bg-teal-600/20"
                      >
                        다시 시도
                      </button>
                    )}
                  </div>
                )}
                {info && (
                  <>
                    <p className="mt-1 text-sm font-gothic text-gray-700 leading-relaxed whitespace-pre-line content-bump">
                      {info.desc}
                    </p>

                    <button
                      onClick={() => navigate("/dictionary?q=" + encodeURIComponent(selected.id) + "&from=map")}
                      className="mt-5 w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold active:bg-teal-800"
                    >
                      사전에서 {selected.id} 보기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndoMap;
