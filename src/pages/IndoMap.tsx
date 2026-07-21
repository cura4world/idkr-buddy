// src/pages/IndoMap.tsx
// 인도네시아 학습 지도: 실제 해안선 SVG + 핀치줌/팬 + 3단 줌(섬→도시→관광지)
// 핀 탭 → 하단 시트: Gemini 설명(IndexedDB 캐싱) + 관련 단어(담기/사전/발음)

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Volume2, Star, BookOpen, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAP_VIEW,
  MAP_CITIES,
  MAP_SPOTS,
  MAP_ISLANDS,
  INDONESIA_PATH,
  MapPlace,
} from "@/lib/mapData";
import { fetchPlaceInfo, MapPlaceInfo } from "@/lib/map";
import { hasGeminiApiKey } from "@/lib/gemini";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";

const MY_WORDBOOK_ID = "my-wordbook";
const KMIN = 1;
const KMAX = 9;

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
  const [savedTick, setSavedTick] = useState(0);
  const sheetOpenRef = useRef(false);
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

    // 섬 이름: 항상 표시, 확대할수록 화면상 크기가 조금씩 커짐 (1/k^0.7)
    const islScale = 1 / Math.pow(s.k, 0.7);
    MAP_ISLANDS.forEach((p, i) => {
      islandRefs.current[i]?.setAttribute(
        "transform",
        "translate(" + p.x + " " + p.y + ") scale(" + islScale + ")"
      );
    });

    // 핀: 역스케일 + 줌 레벨별 표시 (도시 k≥1.5, 관광지 k≥2.8)
    PINS.forEach((p, i) => {
      const el = pinRefs.current[i];
      if (!el) return;
      const op =
        p.type === "city"
          ? s.k < 1.5
            ? 0
            : Math.min(1, (s.k - 1.5) / 0.5)
          : s.k < 2.8
            ? 0
            : Math.min(1, (s.k - 2.8) / 0.7);
      el.setAttribute("transform", "translate(" + p.x + " " + p.y + ") scale(" + 1 / s.k + ")");
      el.setAttribute("opacity", op.toFixed(2));
      pinVisible.current[i] = op > 0.35;
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
      let best: Pin | null = null;
      let bestD = 1e9;
      PINS.forEach((pin, i) => {
        if (!pinVisible.current[i]) return;
        const sx = pin.x * s.k + s.tx;
        const sy = pin.y * s.k + s.ty;
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (d < 20 && d < bestD) {
          bestD = d;
          best = pin;
        }
      });
      if (best) openSheet(best);
    },
    [toVb] // eslint-disable-line react-hooks/exhaustive-deps
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
    setSelected(pin);
    setInfo(null);
    if (!sheetOpenRef.current) {
      sheetOpenRef.current = true;
      try {
        history.pushState({ kkMapSheet: true }, "");
      } catch (e) {}
    }
    const reqId = ++reqIdRef.current;
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

  // ---------- 단어장 담기 ----------
  const addToWordbook = (w: { word: string; meaning: string; example: string; exampleKo: string }) => {
    const r = addWordIfAbsent({
      word: w.word,
      meaning: w.meaning,
      example: w.example,
      exampleMeaning: w.exampleKo,
      categoryId: MY_WORDBOOK_ID,
    });
    toast(r.added ? '"' + w.word + '" 내 단어장에 담았어요' : "이미 내 단어장에 있어요");
    setSavedTick((t) => t + 1);
  };

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
        .kkm-pin-name { font-size: 11px; fill: #ffffff; text-anchor: middle;
          paint-order: stroke; stroke: rgba(9,34,40,0.85); stroke-width: 3px; }
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
                <text className="kkm-isl" fontSize={22}>
                  {p.id}
                </text>
                <text className="kkm-isl kkm-isl-ko" fontSize={12.5} y={16}>
                  {p.ko}
                </text>
              </g>
            ))}
            {PINS.map((p, i) => (
              <g key={p.type + "-" + p.id} ref={(el) => (pinRefs.current[i] = el)} opacity={0}>
                <circle r={p.type === "spot" ? 5 : 5.5} className={"kkm-pin-dot" + (p.type === "spot" ? " spot" : "")} />
                <text className="kkm-pin-name" y={-10}>
                  {p.ko}
                </text>
              </g>
            ))}
          </g>
        </svg>

        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 text-[11px] font-gothic text-white/50 bg-[rgba(9,34,40,0.55)] px-3.5 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
          핀치로 확대 · 도시(주황)와 관광지(노랑)를 탭해보세요
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

      {/* 하단 시트 */}
      {selected && (
        <div className="fixed inset-0 z-40" onClick={() => closeSheet()}>
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
                    {info.descId && (
                      <div className="flex items-start gap-2 bg-teal-600/5 border border-teal-600/15 rounded-xl px-3.5 py-3">
                        <p className="font-word text-[15px] text-teal-900 leading-relaxed flex-1 content-bump">
                          {info.descId}
                        </p>
                        <button
                          onClick={() => speak(info.descId, "id")}
                          className="w-7 h-7 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0 active:bg-teal-600/20 mt-0.5"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    )}
                    <p className="mt-3 text-sm font-gothic text-gray-700 leading-relaxed whitespace-pre-line content-bump">
                      {info.desc}
                    </p>

                    {/* 관련 단어 */}
                    {info.words.length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-gothic font-semibold text-gray-400 tracking-wide mb-2">
                          관련 단어
                        </p>
                        <div className="space-y-2">
                          {info.words.map((w) => {
                            const saved = hasWordInCategory(MY_WORDBOOK_ID, w.word);
                            void savedTick;
                            return (
                              <div key={w.word} className="bg-gray-50 rounded-xl px-3.5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-word font-semibold text-[15px] text-gray-900 content-bump">
                                    {w.word}
                                  </span>
                                  <button
                                    onClick={() => speak(w.word, "id")}
                                    className="w-7 h-7 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center active:bg-teal-600/20"
                                  >
                                    <Volume2 size={13} />
                                  </button>
                                  <span className="text-sm font-gothic text-gray-600 flex-1 truncate">
                                    {w.meaning}
                                  </span>
                                  <button
                                    onClick={() => addToWordbook(w)}
                                    className={
                                      "w-8 h-8 rounded-full flex items-center justify-center active:scale-95 " +
                                      (saved ? "bg-violet-500/15 text-violet-600" : "bg-gray-200/70 text-gray-400")
                                    }
                                    title={saved ? "저장됨" : "내 단어장에 담기"}
                                  >
                                    <Star size={15} fill={saved ? "currentColor" : "none"} />
                                  </button>
                                  <button
                                    onClick={() => navigate("/dictionary?q=" + encodeURIComponent(w.word) + "&from=map")}
                                    className="w-8 h-8 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center active:bg-teal-600/20"
                                    title="사전에서 보기"
                                  >
                                    <BookOpen size={15} />
                                  </button>
                                </div>
                                {w.example && (
                                  <p className="mt-1.5 text-[13px] font-word text-gray-600 leading-snug">
                                    {w.example}
                                    {w.exampleKo && (
                                      <span className="block font-gothic text-gray-400 text-xs mt-0.5">
                                        {w.exampleKo}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => navigate("/dictionary?q=" + encodeURIComponent(selected.id) + "&from=map")}
                      className="mt-5 w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold active:bg-teal-800"
                    >
                      사전에서 &quot;{selected.id}&quot; 보기
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
