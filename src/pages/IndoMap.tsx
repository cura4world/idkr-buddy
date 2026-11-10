// src/pages/IndoMap.tsx
// 인도네시아 학습 지도: 실제 해안선 SVG + 핀치줌/팬 + 3단 줌(섬→도시→관광지)
// 핀 탭 → 하단 시트: 고정 사진 목록(mapPhotos) + 미리 써 둔 지점 내용(mapContent) + 그 지역 단어
// 원고가 없는 지점만 예전처럼 Gemini 설명을 생성합니다 (IndexedDB 캐싱)
//
// 2026-11-10 시안(MP1-Map · MP2-Sheet) 반영
//   · 헤더는 화면 헤더 규칙대로 뒤로가기 + PETA INDONESIA
//   · 범례 칩 왼쪽 아래, +/− 오른쪽 아래, 그 밑에 조금 띄워 가로로 보기 버튼
//   · 가로로 보기: 먼저 screen.orientation.lock("landscape") (전체 화면이 필요한 웹뷰가 많음).
//     안 되면 지도 화면 전체를 CSS 로 90° 돌려 가로로 보여 줍니다(닫기 버튼, 뒤로가기로도 닫힘).
//     돌린 화면에서는 손가락 좌표를 지도 좌표로 바꿀 때 회전을 되돌립니다(localPt).
//   · 시트: 사진 출처 문구 없음(설정 > 앱 정보 > 사진 출처), 사진 4:3, 차분한 종류 칩, 청록 스피커
//   · 공개판: 선교 역사 핀(staff)은 관리자·Special Member 에게만

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReadingTracker } from "@/lib/readingTimer";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, Plus, Minus, Volume2, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  MAP_VIEW,
  NEIGHBOR_SHAPES,
  NEIGHBOR_LABELS,
  MAP_CITIES,
  MAP_SPOTS,
  MAP_FAITH,
  MAP_CULTURE,
  MAP_ISLANDS,
  INDONESIA_PATH,
  MapPlace,
} from "@/lib/mapData";
import { fetchPlaceInfo, MapPlaceInfo } from "@/lib/map";
import { getPlacePhotos } from "@/lib/mapPhotos";
import type { MapContentEntry, MapWord } from "@/lib/mapContent";
import { hasGeminiApiKey } from "@/lib/gemini";
import { isStoreApp } from "@/lib/platform";
import { usePlan } from "@/lib/plan";
import { addWordIfAbsent, hasWordInCategory, ensureMapWordbook, MAP_WORDBOOK_ID } from "@/lib/store";

const KMIN = 1;
// 최대 64배. 탭 허용 반경이 56px이라 32배에서는 지도 좌표 4.5 이내의 두 핀을
// 손가락으로 구분해 누를 수 없었습니다 (자카르타–브카시 3.4, 스마랑–드막 4.7).
const KMAX = 64;
// 탭 판정에서 tier 4(종교·역사 / 민족·문화) 핀에 주는 덤(px). 이 핀들은 깊이 확대해야만 보이고,
// 큰 도시 바로 옆에 있는 곳이 많아(이스티크랄–자카르타 0.9) 거의 같은 거리면 tier 4 를 고릅니다.
const DEEP_PIN_BONUS_PX = 12;

type PinType = "city" | "spot" | "faith" | "culture";
interface Pin extends MapPlace {
  type: PinType;
}

type LandMode = "off" | "native" | "css";

// tier별로 핀이 나타나기 시작하는 줌 배율. render와 findPin이 같은 값을 써야
// "보이는데 안 눌리는" 핀이 생기지 않습니다.
// 대도시(tier 1)는 1.05 부터 — 처음 여는 배율(1.55)에서 흐리지 않고 또렷하게 보이도록(시안 MP1, 0.5 구간에 걸쳐 나타남).
const tierStart = (tier: number): number =>
  tier === 1 ? 1.05 : tier === 2 ? 2.4 : tier === 3 ? 3.0 : 4.5;

const PINS: Pin[] = [
  ...MAP_CITIES.map((p) => ({ ...p, type: "city" as PinType })),
  ...MAP_SPOTS.map((p) => ({ ...p, type: "spot" as PinType })),
  ...MAP_FAITH.map((p) => ({ ...p, type: "faith" as PinType })),
  ...MAP_CULTURE.map((p) => ({ ...p, type: "culture" as PinType })),
];

const TYPE_LABEL: Record<PinType, string> = {
  city: "도시",
  spot: "관광지",
  faith: "종교·역사",
  culture: "민족·문화",
};
// 시트의 종류 칩 — 지도 점 색을 옅게 누른 차분한 색
const TYPE_CHIP: Record<PinType, { bg: string; fg: string }> = {
  city: { bg: "#FCEEE2", fg: "#9A4A12" },
  spot: { bg: "#FBF1D9", fg: "#8A6A12" },
  faith: { bg: "#E4EEF6", fg: "#2B5F86" },
  culture: { bg: "#EFE9F6", fg: "#5B4A8C" },
};

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

// 가로로 보기 아이콘 (시안 MP1 — 가로 화면 + 도는 화살표)
const RotateIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5.2" y="8.7" width="13.6" height="6.6" rx="1.5" />
    <g transform="rotate(12 12 12)">
      <path d="M3.2 10.2A9 9 0 0 1 12.6 3" />
      <path d="m10.4 1.4 2.2 1.6-1.6 2.2" />
      <path d="M20.8 13.8A9 9 0 0 1 11.4 21" />
      <path d="m13.6 22.6-2.2-1.6 1.6-2.2" />
    </g>
  </svg>
);

// 약속(Promise)이 끝나지 않는 웹뷰가 있어 마감을 둡니다. 마감이 지나면 실패로 봅니다.
function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const ZB = "w-10 h-10 rounded-full flex items-center justify-center text-white active:opacity-80";
const ZB_STYLE = { background: "rgba(9,34,40,0.72)" };

const IndoMap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staff } = usePlan();
  const publicEdition = isStoreApp();

  // ---------- 탐험 점수 (보이지 않음) ----------
  // 2분 구경 = 1점. 화면에는 아무 표시도 없고 플로팅도 띄우지 않습니다.
  const trackerRef = useRef<ReadingTracker | null>(null);
  useEffect(() => {
    const t = new ReadingTracker(() => {}, {
      category: "explore",
      secPerPoint: 120,
      pointsPerUnit: 1,
      bonus: 0,
      autoUnlock: true,
    });
    trackerRef.current = t;
    t.attach();
    t.setUnit("map");
    t.setSide(true);
    return () => {
      t.dispose();
      trackerRef.current = null;
    };
  }, []);

  // ---------- 지점 내용(정적) ----------
  // 지역별 원고 모듈은 덩치가 크므로 정적 import 하지 않고, 지도에 들어올 때 한 번만
  // 불러옵니다. 지도를 열지 않는 사람의 첫 로드에는 영향이 없습니다.
  const contentRef = useRef<((id: string) => MapContentEntry | null) | null>(null);
  useEffect(() => {
    let alive = true;
    import("@/lib/mapContent")
      .then((m) => {
        if (alive) contentRef.current = m.getMapContent;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  // 로드가 끝나기 전에 핀을 누른 경우에만 여기서 기다립니다.
  const takeContent = useCallback(async (id: string): Promise<MapContentEntry | null> => {
    if (!contentRef.current) {
      try {
        const m = await import("@/lib/mapContent");
        contentRef.current = m.getMapContent;
      } catch (e) {
        return null;
      }
    }
    return contentRef.current ? contentRef.current(id) : null;
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<SVGGElement>(null);
  const islandRefs = useRef<(SVGGElement | null)[]>([]);
  const pinRefs = useRef<(SVGGElement | null)[]>([]);

  // 제스처 상태는 ref로 관리 (매 프레임 리렌더 방지). 좌표는 모두 지도 상자 안쪽 좌표(localPt)입니다.
  const vs = useRef({ k: 1, tx: 0, ty: 0 });
  const initViewDone = useRef(false);
  const pointers = useRef<Record<number, { x: number; y: number }>>({});
  const gesture = useRef<{ mode: "pan" | "pinch"; d?: number; t?: number; moved?: number; sx?: number; sy?: number } | null>(null);
  const multiTouched = useRef(false); // 이번 제스처 동안 두 손가락이 닿은 적이 있는지 (핀치)
  const lastTap = useRef(0);
  const pinVisible = useRef<boolean[]>(PINS.map(() => false));

  // 선교 역사 핀(staff)은 관리자·Special Member 에게만. render/findPin 이 같은 값을 보도록 ref 로도 둡니다.
  const staffRef = useRef(staff);
  staffRef.current = staff;
  const pinShown = (p: Pin) => !p.staff || staffRef.current;

  const toggleCities = () => {
    const v = !showCitiesRef.current;
    showCitiesRef.current = v;
    setShowCities(v);
    renderRef.current();
  };
  const toggleSpots = () => {
    const v = !showSpotsRef.current;
    showSpotsRef.current = v;
    setShowSpots(v);
    renderRef.current();
  };
  const toggleFaith = () => {
    const v = !showFaithRef.current;
    showFaithRef.current = v;
    setShowFaith(v);
    renderRef.current();
  };
  const toggleCulture = () => {
    const v = !showCultureRef.current;
    showCultureRef.current = v;
    setShowCulture(v);
    renderRef.current();
  };

  // 하단 시트
  const [selected, setSelected] = useState<Pin | null>(null);
  const [info, setInfo] = useState<MapPlaceInfo | null>(null);
  // 미리 써 둔 정적 내용. 있으면 Gemini 를 부르지 않습니다.
  const [entry, setEntry] = useState<MapContentEntry | null>(null);
  // 이 시트의 단어가 이미 단어장에 담겨 있는지 (단어 → true)
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [infoState, setInfoState] = useState<"idle" | "loading" | "error">("idle");
  const [lightbox, setLightbox] = useState<string | null>(null);
  // 처음에는 도시만 켜 둡니다. 나머지는 범례 버튼으로 켭니다.
  // state(버튼 색)와 ref(렌더 루프)는 반드시 같은 값으로 짝을 맞춰야 합니다.
  const [showCities, setShowCities] = useState(true);
  const [showSpots, setShowSpots] = useState(false);
  const [showFaith, setShowFaith] = useState(false);
  const [showCulture, setShowCulture] = useState(false);
  const showCitiesRef = useRef(true);
  const showSpotsRef = useRef(false);
  const showFaithRef = useRef(false);
  const showCultureRef = useRef(false);
  const sheetOpenRef = useRef(false);
  // 우리가 직접 부른 history.back() 이 일으킨 popstate 는 건너뜁니다.
  // (가로 보기 중 시트를 닫을 때 그 뒤로가기가 가로 보기까지 닫지 않도록)
  const ignorePopRef = useRef(0);
  const sheetOpenedAt = useRef(0);
  const reqIdRef = useRef(0);
  const openSheetRef = useRef<(pin: Pin) => void>(() => {});

  // 가로로 보기
  const [land, setLand] = useState<LandMode>("off");
  const landRef = useRef<LandMode>("off");
  const landPushedRef = useRef(false);
  const landBusyRef = useRef(false);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  // ---------- 좌표 변환 ----------
  // 화면(client) 좌표 → 지도 상자 안쪽 좌표. CSS 로 90° 돌린 가로 보기에서는 회전을 되돌립니다:
  //   돌린 상자 안의 점 (lx, ly) 는 화면의 (innerWidth − ly, lx) 에 그려지므로 lx = cy, ly = innerWidth − cx.
  //   (가로 보기에서는 헤더를 숨기므로 지도 상자의 왼쪽 위가 돌린 화면의 원점입니다.)
  const localPt = useCallback((cx: number, cy: number) => {
    if (landRef.current === "css") return { x: cy, y: window.innerWidth - cx };
    const w = wrapRef.current;
    if (!w) return { x: cx, y: cy };
    const r = w.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  }, []);

  // 지도 상자 안쪽 px → viewBox 배율과 여백. 크기는 회전의 영향을 받지 않는 레이아웃 크기를 씁니다.
  const pxToVb = useCallback(() => {
    const w = wrapRef.current;
    const W = w ? w.clientWidth : MAP_VIEW.w;
    const H = w ? w.clientHeight : MAP_VIEW.h;
    const scale = Math.min(W / MAP_VIEW.w, H / MAP_VIEW.h) || 1;
    const ox = (W - MAP_VIEW.w * scale) / 2;
    const oy = (H - MAP_VIEW.h * scale) / 2;
    return { scale, ox, oy };
  }, []);

  const toVb = useCallback(
    (lx: number, ly: number) => {
      const m = pxToVb();
      return { x: (lx - m.ox) / m.scale, y: (ly - m.oy) / m.scale };
    },
    [pxToVb]
  );

  // ---------- 렌더 ----------
  const renderRef = useRef<() => void>(() => {});
  const render = useCallback(() => {
    const s = vs.current;
    s.k = Math.max(KMIN, Math.min(KMAX, s.k));
    // 주변국을 볼 수 있도록 사방으로 여유(PAD)를 두고 팬 허용
    const PADX = MAP_VIEW.w * 0.55;
    const PADY = MAP_VIEW.h * 1.1;
    s.tx = Math.max(MAP_VIEW.w - MAP_VIEW.w * s.k - PADX, Math.min(PADX, s.tx));
    s.ty = Math.max(MAP_VIEW.h - MAP_VIEW.h * s.k - PADY, Math.min(PADY, s.ty));

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
    // tier별 표시 시점: 1=대도시 k≥1.05, 2=중소도시 k≥2.4, 3=관광지 k≥3.0,
    //                   4=종교·역사/민족·문화 k≥4.5 (tierStart 참조)
    const pinScale = 1 / Math.pow(s.k, 0.65);
    PINS.forEach((p, i) => {
      const el = pinRefs.current[i];
      if (!el) {
        pinVisible.current[i] = false;
        return;
      }
      const start = tierStart(p.tier);
      const kindOn =
        p.type === "spot"
          ? showSpotsRef.current
          : p.type === "faith"
            ? showFaithRef.current
            : p.type === "culture"
              ? showCultureRef.current
              : showCitiesRef.current;
      const op = !kindOn || s.k < start ? 0 : Math.min(1, (s.k - start) / 0.5);
      el.setAttribute("transform", "translate(" + p.x + " " + p.y + ") scale(" + pinScale + ")");
      el.setAttribute("opacity", op.toFixed(2));
      el.style.pointerEvents = kindOn ? "" : "none";
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
      // 충분히 확대(k≥6)하면 겹침 무시하고 모든 이름 표시
      if (s.k >= 6) {
        txt.setAttribute("opacity", "1");
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
  renderRef.current = render;

  const zoomAt = useCallback(
    (lx: number, ly: number, factor: number) => {
      const s = vs.current;
      const p = toVb(lx, ly);
      const nk = Math.max(KMIN, Math.min(KMAX, s.k * factor));
      const f = nk / s.k;
      s.tx = p.x - (p.x - s.tx) * f;
      s.ty = p.y - (p.y - s.ty) * f;
      s.k = nk;
      render();
    },
    [render, toVb]
  );

  const zoomCenter = (factor: number) => {
    const w = wrapRef.current;
    if (!w) return;
    zoomAt(w.clientWidth / 2, w.clientHeight / 2, factor);
  };

  // ---------- 핀 탭 ----------
  // 지도 상자 안쪽 좌표에서 가장 가까운 (그 줌에서 표시되는) 핀을 반환. 없으면 null.
  const findPin = useCallback(
    (lx: number, ly: number): Pin | null => {
      const s = vs.current;
      const m = pxToVb();
      // 탭 허용 반경 56px → viewBox 단위로 변환 (손가락 터치 크기 고려)
      const tol = 56 / m.scale;
      const bonus = DEEP_PIN_BONUS_PX / m.scale;
      // 탭 지점을 view group 적용 전 좌표계로 (pin.x*k+tx 와 같은 좌표계)
      const p = toVb(lx, ly);
      let best: Pin | null = null;
      let bestD = 1e9;
      PINS.forEach((pin) => {
        if (pin.staff && !staffRef.current) return;
        const start = tierStart(pin.tier);
        const kindOn =
          pin.type === "spot"
            ? showSpotsRef.current
            : pin.type === "faith"
              ? showFaithRef.current
              : pin.type === "culture"
                ? showCultureRef.current
                : showCitiesRef.current;
        if (!kindOn || s.k < start) return;
        const sx = pin.x * s.k + s.tx;
        const sy = pin.y * s.k + s.ty;
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (d >= tol) return;
        const score = d - (pin.tier === 4 ? bonus : 0);
        if (score < bestD) {
          bestD = score;
          best = pin;
        }
      });
      return best;
    },
    [pxToVb, toVb]
  );

  // ---------- 제스처 (핀치줌 / 팬 / 탭 / 더블탭) ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // 처음 열었을 때(시안 MP1): 1.55배로 자바~술라웨시 가운데(viewBox 430, 245)를 화면 가운데에 둡니다.
    // 이 배율이면 대도시(tier 1) 핀이 처음부터 보입니다.
    if (!initViewDone.current && wrap.clientWidth > 0) {
      initViewDone.current = true;
      const k0 = 1.55;
      const c = toVb(wrap.clientWidth / 2, wrap.clientHeight / 2);
      vs.current = { k: k0, tx: c.x - 430 * k0, ty: c.y - 245 * k0 };
    }
    render();

    const onDown = (e: PointerEvent) => {
      // 지도 위 버튼(범례·확대·축소·가로 보기)은 제스처로 잡지 않습니다. 여기서 포인터를 붙잡으면
      // click 이 버튼이 아니라 지도 상자로 가서 버튼이 눌리지 않습니다(크롬 — 2026-11 확인).
      try {
        const t = e.target as Element | null;
        if (t && typeof t.closest === "function" && t.closest("button")) return;
      } catch (err) {}
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (err) {}
      const lp = localPt(e.clientX, e.clientY);
      pointers.current[e.pointerId] = lp;
      const ids = Object.keys(pointers.current);
      if (ids.length === 1) {
        gesture.current = { mode: "pan", t: performance.now(), moved: 0, sx: lp.x, sy: lp.y };
      } else if (ids.length === 2) {
        const a = pointers.current[+ids[0]];
        const b = pointers.current[+ids[1]];
        gesture.current = { mode: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) };
        multiTouched.current = true;
      }
      if (ids.length === 1 && Object.keys(pointers.current).length === 1) {
        // 완전히 새로운 단일 터치 시작 → 핀치 이력 초기화
        multiTouched.current = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture.current;
      if (!pointers.current[e.pointerId] || !g) return;
      const prev = pointers.current[e.pointerId];
      const lp = localPt(e.clientX, e.clientY);
      pointers.current[e.pointerId] = lp;
      const ids = Object.keys(pointers.current);

      if (g.mode === "pan" && ids.length === 1) {
        const m = pxToVb();
        vs.current.tx += (lp.x - prev.x) / m.scale;
        vs.current.ty += (lp.y - prev.y) / m.scale;
        g.moved = (g.moved || 0) + Math.hypot(lp.x - prev.x, lp.y - prev.y);
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
      const t0 = g ? g.t || 0 : 0;
      const lp = localPt(e.clientX, e.clientY);
      delete pointers.current[e.pointerId];
      const remain = Object.keys(pointers.current).length;

      if (wasPan && remain === 0) {
        const dt = performance.now() - t0;
        // 탭 판정: 시작점→끝점 직선거리(미세 흔들림 허용) 12px + 핀치 이력 없을 때만.
        const sx = g && g.sx != null ? g.sx : lp.x;
        const sy = g && g.sy != null ? g.sy : lp.y;
        const dist = Math.hypot(lp.x - sx, lp.y - sy);
        const wasPinch = multiTouched.current;
        multiTouched.current = false; // 소진
        if (!wasPinch && dist < 12 && dt < 300) {
          // 핀 히트가 있으면 즉시 열기(더블탭 대기 없음). 핀이 없을 때만 더블탭 줌 후보.
          const hit = findPin(lp.x, lp.y);
          if (hit) {
            openSheetRef.current(hit);
            lastTap.current = 0;
          } else {
            const now = performance.now();
            if (now - lastTap.current < 300) {
              zoomAt(lp.x, lp.y, vs.current.k >= KMAX * 0.9 ? 1 / vs.current.k : 2);
              lastTap.current = 0;
            } else {
              lastTap.current = now;
            }
          }
        }
        gesture.current = null;
      } else if (remain === 1) {
        gesture.current = { mode: "pan", t: performance.now(), moved: 99 };
      } else if (remain === 0) {
        gesture.current = null;
        multiTouched.current = false;
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
  }, [render, zoomAt, findPin, localPt, pxToVb, toVb]);

  // 화면 크기가 바뀌면(회전·가로 보기) 다시 그립니다.
  useEffect(() => {
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      renderRef.current();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => renderRef.current());
    return () => cancelAnimationFrame(id);
  }, [land, vp, staff]);

  // ---------- 시트 열기/닫기 (+ 뒤로가기 한 단계) ----------
  const openSheet = (pin: Pin) => {
    sheetOpenedAt.current = Date.now();
    setSelected(pin);
    setEntry(null);
    setSavedWords({});
    setInfo(null);
    setLightbox(null);
    if (!sheetOpenRef.current) {
      sheetOpenRef.current = true;
      try {
        history.pushState({ kkMapSheet: true }, "");
      } catch (e) {}
    }
    const reqId = ++reqIdRef.current;
    setInfoState("loading");

    void (async () => {
      const e = await takeContent(pin.id);
      if (reqIdRef.current !== reqId) return;

      // 미리 써 둔 내용이 있으면 여기서 끝입니다 (Gemini 호출 없음, 과금 없음)
      if (e) {
        setEntry(e);
        const marks: Record<string, boolean> = {};
        e.words.forEach((w) => {
          marks[w.word] = hasWordInCategory(MAP_WORDBOOK_ID, w.word);
        });
        setSavedWords(marks);
        setInfoState("idle");
        return;
      }
      if (!hasGeminiApiKey()) {
        setInfoState("error");
        return;
      }
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
    })();
  };
  // 단어 담기 — "지도에서 배운 단어" 단어장에만 담습니다 (처음 담을 때 폴더가 생깁니다).
  // 중복 방지와 Medali 저장 점수는 addWordIfAbsent 안에서 처리됩니다.
  const saveMapWord = (w: MapWord) => {
    ensureMapWordbook();
    const r = addWordIfAbsent({
      word: w.word,
      meaning: w.meaning,
      example: w.example,
      exampleMeaning: w.exampleKo,
      categoryId: MAP_WORDBOOK_ID,
    });
    setSavedWords((prev) => ({ ...prev, [w.word]: true }));
    toast.success(r.added ? "지도에서 배운 단어에 담았습니다" : "이미 담긴 단어입니다");
  };

  openSheetRef.current = openSheet;

  const closeSheet = useCallback((viaPop = false) => {
    reqIdRef.current++;
    setSelected(null);
    if (sheetOpenRef.current && !viaPop) {
      sheetOpenRef.current = false;
      try {
        ignorePopRef.current++;
        history.back();
      } catch (e) {}
    } else {
      sheetOpenRef.current = false;
    }
  }, []);

  // ---------- 가로로 보기 ----------
  const leaveNative = () => {
    try {
      const so = (screen as any).orientation;
      if (so && typeof so.unlock === "function") so.unlock();
    } catch (e) {}
    try {
      if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => {});
    } catch (e) {}
  };

  const setLandMode = (m: LandMode) => {
    landRef.current = m;
    setLand(m);
  };

  const exitLandscape = useCallback((viaPop = false) => {
    if (landRef.current === "off") return;
    if (landRef.current === "native") leaveNative();
    landRef.current = "off";
    setLand("off");
    if (landPushedRef.current && !viaPop) {
      landPushedRef.current = false;
      try {
        ignorePopRef.current++;
        history.back();
      } catch (e) {}
    } else {
      landPushedRef.current = false;
    }
  }, []);

  const enterLandscape = async () => {
    if (landBusyRef.current || landRef.current !== "off") return;
    landBusyRef.current = true;
    let mode: LandMode = "css";
    let enteredFs = false;
    try {
      // 1) 진짜 화면 회전. 크롬·많은 웹뷰는 전체 화면일 때만 lock 을 받아 줍니다.
      const so = (screen as any).orientation;
      if (so && typeof so.lock === "function") {
        const de = document.documentElement as any;
        if (!document.fullscreenElement && de && typeof de.requestFullscreen === "function") {
          try {
            await withDeadline(de.requestFullscreen(), 1500);
            enteredFs = true;
          } catch (e) {}
        }
        await withDeadline(so.lock("landscape"), 1500);
        mode = "native";
      }
    } catch (e) {
      mode = "css";
    }
    if (mode === "css" && enteredFs) {
      try {
        if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => {});
      } catch (e) {}
    }
    landBusyRef.current = false;
    setLandMode(mode);
    try {
      history.pushState({ kkMapLand: true }, "");
      landPushedRef.current = true;
    } catch (e) {}
  };

  // 진짜 회전 중에 시스템이 전체 화면을 풀면(뒤로가기 제스처 등) 가로 보기도 끝냅니다.
  useEffect(() => {
    const onFs = () => {
      if (landRef.current === "native" && !document.fullscreenElement) exitLandscape();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [exitLandscape]);

  // 지도를 떠날 때 회전 잠금을 풉니다.
  useEffect(() => {
    return () => {
      if (landRef.current === "native") leaveNative();
    };
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (ignorePopRef.current > 0) {
        ignorePopRef.current--;
        return;
      }
      if (sheetOpenRef.current) {
        closeSheet(true);
        return;
      }
      if (landRef.current !== "off") exitLandscape(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeSheet, exitLandscape]);

  const landscape = land !== "off";
  // CSS 회전 가로 보기: 화면 전체를 덮는 상자를 시계 방향 90° 돌립니다.
  // 시트·사진 확대(fixed)는 이 상자 안에 있으므로 함께 돌아갑니다(변형된 조상이 fixed 의 기준이 됨).
  const rootStyle: React.CSSProperties | undefined =
    land === "css"
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          width: vp.h + "px",
          height: vp.w + "px",
          transform: "translateX(" + vp.w + "px) rotate(90deg)",
          transformOrigin: "top left",
          zIndex: 50,
        }
      : undefined;

  const photos = selected ? getPlacePhotos(selected.id) : [];
  const chip = selected ? TYPE_CHIP[selected.type] : TYPE_CHIP.city;

  const legend: { on: boolean; color: string; label: string; toggle: () => void }[] = [
    { on: showCities, color: "#f97316", label: "도시", toggle: toggleCities },
    { on: showSpots, color: "#fbbf24", label: "관광지", toggle: toggleSpots },
    { on: showFaith, color: "#38bdf8", label: "종교·역사", toggle: toggleFaith },
    { on: showCulture, color: "#c084fc", label: "민족·문화", toggle: toggleCulture },
  ];

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden" style={rootStyle}>
      <style>{`
        .kkm-country { fill: #17555c; stroke: #3e8d95; stroke-width: 0.7; }
        .kkm-neighbor { fill: #123c42; stroke: #2c5860; stroke-width: 0.6; pointer-events: none; }
        .kkm-neighbor-label { font-family: inherit; font-size: 15px; fill: #5c7f84; text-anchor: middle;
          pointer-events: none; letter-spacing: 0.5px; }
        .kkm-isl { font-family: Lora, serif; font-style: italic; fill: #c4e0e3; text-anchor: middle;
          letter-spacing: 0.5px; paint-order: stroke; stroke: rgba(9,34,40,0.7); stroke-width: 2.5px; }
        .kkm-isl-ko { font-family: inherit; font-style: normal; fill: #9cc3c8; }
        .kkm-pin-dot { fill: #f97316; stroke: #fff; stroke-width: 1.6; }
        .kkm-pin-dot.spot { fill: #fbbf24; }
        .kkm-pin-dot.faith { fill: #38bdf8; }
        .kkm-pin-dot.culture { fill: #c084fc; }
        .kkm-pin-name { font-size: 20px; fill: #ffffff; text-anchor: middle; font-weight: 600;
          paint-order: stroke; stroke: rgba(9,34,40,0.85); stroke-width: 4px; }
        .kkm-lb-backdrop { animation: kkmLbFade 0.18s ease-out; }
        .kkm-lb-img { animation: kkmLbPop 0.28s cubic-bezier(0.22,1,0.36,1); transform-origin: center bottom; }
        @keyframes kkmLbFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kkmLbPop { from { opacity: 0; transform: translateY(40px) scale(0.85); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* 헤더 — 화면 헤더 규칙(뒤로가기 + 인니어 대문자 제목). 가로 보기에서는 숨기고 닫기 버튼을 둡니다. */}
      {landscape ? null : (
        <header className="bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => goBackOr(navigate, location.key, "/insight")}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">PETA INDONESIA</h1>
        </header>
      )}

      {/* 지도 */}
      <div ref={wrapRef} className="relative flex-1 min-h-0 touch-none overflow-hidden" style={{ backgroundColor: "#0b2f37" }}>
        <svg
          ref={svgRef}
          className="w-full h-full block"
          viewBox={"0 0 " + MAP_VIEW.w + " " + MAP_VIEW.h}
          preserveAspectRatio="xMidYMid meet"
        >
          <g ref={viewRef}>
            {/* 주변국: 회색, 버튼 없음, 국경선 + 국가명만 */}
            {NEIGHBOR_SHAPES.map((c) => (
              <path key={c.id} className="kkm-neighbor" d={c.d} />
            ))}
            {NEIGHBOR_LABELS.map((c) => (
              <text key={c.id} className="kkm-neighbor-label" x={c.x} y={c.y}>
                {c.ko}
              </text>
            ))}
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
            {PINS.map((p, i) =>
              pinShown(p) ? (
                <g key={p.type + "-" + p.id} ref={(el) => (pinRefs.current[i] = el)} opacity={0}>
                  <circle
                    r={p.tier === 1 ? 9 : p.tier === 2 ? 8 : p.tier === 3 ? 7.5 : 7}
                    className={"kkm-pin-dot" + (p.type === "city" ? "" : " " + p.type)}
                  />
                  <text className="kkm-pin-name" y={-15}>
                    {p.id}
                  </text>
                </g>
              ) : null
            )}
          </g>
        </svg>

        {/* 범례 겸 토글 버튼 (왼쪽 아래). 도시 → 관광지 → 종교·역사 → 민족·문화 순으로 세로 일렬 */}
        <div className="absolute left-3.5 bottom-4 flex flex-col items-start gap-1.5">
          {legend.map((l) => (
            <button
              key={l.label}
              onClick={l.toggle}
              className="flex items-center gap-[7px] h-7 pl-2 pr-[11px] rounded-[14px] transition-opacity"
              style={{ background: l.on ? "rgba(9,34,40,0.72)" : "rgba(9,34,40,0.4)", opacity: l.on ? 1 : 0.55 }}
            >
              <span
                className="w-[11px] h-[11px] rounded-full border border-white/80 shrink-0"
                style={{ background: l.color }}
              />
              <span className="font-gothic text-[0.71875rem] text-white/[0.88]">{l.label}</span>
            </button>
          ))}
        </div>

        {/* 확대 · 축소 · (조금 띄워) 가로로 보기 */}
        <div className="absolute right-3.5 bottom-4 flex flex-col gap-2">
          <button className={ZB} style={ZB_STYLE} onClick={() => zoomCenter(1.5)} title="확대" aria-label="확대">
            <Plus size={18} strokeWidth={2.2} />
          </button>
          <button className={ZB} style={ZB_STYLE} onClick={() => zoomCenter(1 / 1.5)} title="축소" aria-label="축소">
            <Minus size={18} strokeWidth={2.2} />
          </button>
          <button
            className={ZB + " mt-1.5"}
            style={ZB_STYLE}
            onClick={() => (landscape ? exitLandscape() : void enterLandscape())}
            title={landscape ? "세로로 보기" : "가로로 보기"}
            aria-label={landscape ? "세로로 보기" : "가로로 보기"}
          >
            <RotateIcon />
          </button>
        </div>

        {/* 가로 보기 닫기 */}
        {landscape ? (
          <button
            className={ZB + " absolute right-3.5 top-3.5"}
            style={ZB_STYLE}
            onClick={() => exitLandscape()}
            title="가로 보기 닫기"
            aria-label="가로 보기 닫기"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>

      {/* 사진 확대 — 기존 화면 위에 팝업 애니메이션 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 kkm-lb-backdrop"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="확대 사진"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[82%] rounded-2xl object-contain shadow-2xl kkm-lb-img"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* 하단 시트 */}
      {selected && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(5,20,24,0.35)" }}
          onClick={() => {
            // 핀 탭에서 이어지는 합성 click이 시트를 즉시 닫는 것 방지
            if (Date.now() - sheetOpenedAt.current < 500) return;
            closeSheet();
          }}
        >
          <div
            className="absolute left-0 right-0 bottom-0 mx-auto max-w-[560px] bg-white rounded-t-[22px] flex flex-col"
            style={{ maxHeight: land === "css" ? "88%" : "75dvh", boxShadow: "0 -4px 24px rgba(5,20,24,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[#DDE3E6] mx-auto mt-2.5 shrink-0" />
            <button
              onClick={() => closeSheet()}
              className="absolute right-4 top-[22px] w-8 h-8 rounded-full bg-[#F1F4F5] text-[#646C72] flex items-center justify-center active:bg-[#E5EAEC]"
              aria-label="닫기"
            >
              <X size={14} strokeWidth={2.2} />
            </button>
            <div className="px-5 pt-3 pb-6 overflow-y-auto">
              {/* 이름 */}
              <div className="flex items-center gap-[9px] flex-wrap pr-10">
                <h2 className="font-gothic text-[1.25rem] font-bold text-[#1D1F1E]">{selected.ko}</h2>
                <span className="font-word italic text-[0.9375rem] text-[#646C72]">{selected.id}</span>
                <button
                  onClick={() => speak(selected.id, "id")}
                  className="w-8 h-8 rounded-full bg-[#E3EEEC] text-[#2C6D63] flex items-center justify-center active:opacity-80 shrink-0"
                  title="발음 듣기"
                  aria-label="발음 듣기"
                >
                  <Volume2 size={15} strokeWidth={2} />
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2 min-w-0">
                <span
                  className="h-[22px] px-[9px] rounded-[11px] flex items-center font-gothic text-[0.71875rem] font-semibold shrink-0"
                  style={{ background: chip.bg, color: chip.fg }}
                >
                  {TYPE_LABEL[selected.type]}
                </span>
                <span className="font-gothic text-[0.78125rem] text-[#9AA1A6] truncate">{selected.hint}</span>
              </div>

              {/* 사진 — 고정 목록(mapPhotos)에서 최대 2장, 4:3. 탭하면 확대. 없으면 영역을 그리지 않습니다.
                  출처는 시트에 적지 않고 설정 > 앱 정보 > 사진 출처에 모읍니다. */}
              {photos.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {photos.map((ph, i) => (
                    <button
                      key={ph.file}
                      onClick={() => setLightbox(ph.thumb)}
                      className="rounded-xl overflow-hidden bg-[#EEF1F3] active:opacity-80 flex items-center justify-center text-[#B7BDC1]"
                      style={{ aspectRatio: "4 / 3" }}
                    >
                      <img
                        src={ph.thumb}
                        alt={selected.ko + " 사진 " + (i + 1)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          try {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          } catch (err) {}
                        }}
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* 설명 */}
              <div className="mt-3.5">
                {infoState === "loading" && (
                  <div className="py-6 text-center font-gothic text-[0.875rem] text-[#9AA1A6]">
                    설명을 불러오는 중입니다…
                  </div>
                )}
                {infoState === "error" && (
                  <div className="py-4 text-center">
                    <p className="font-gothic text-[0.875rem] text-[#646C72] break-keep">
                      {!publicEdition && !hasGeminiApiKey()
                        ? "설정에서 Gemini API 키를 입력하면 설명을 볼 수 있습니다."
                        : "설명을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요."}
                    </p>
                    {publicEdition || hasGeminiApiKey() ? (
                      <button
                        onClick={() => openSheet(selected)}
                        className="mt-2.5 h-9 px-4 rounded-full bg-[#E3EEEC] text-[#2C6D63] font-gothic text-[0.8125rem] font-semibold active:opacity-80"
                      >
                        다시 시도
                      </button>
                    ) : null}
                  </div>
                )}
                {(entry || info) && (
                  <p
                    className="font-gothic text-[0.90625rem] leading-[1.7] text-[#33393C] whitespace-pre-line"
                    style={{ wordBreak: "keep-all" }}
                  >
                    {entry ? entry.desc : info ? info.desc : ""}
                  </p>
                )}

                {entry && entry.words.length > 0 && (
                  <div>
                    <p className="mt-5 mx-1 mb-2 font-gothic text-[0.875rem] font-bold text-[#3B4245]">이 지역에서 배우는 단어</p>
                    <div className="flex flex-col gap-2">
                      {entry.words.map((w) => (
                        <div key={w.word} className="rounded-2xl bg-[#F5F7F8] py-3 pr-3 pl-4">
                          <div className="flex items-center gap-2">
                            <span className="font-word text-base font-semibold text-[#1D1F1E]">{w.word}</span>
                            <button
                              onClick={() => speak(w.word, "id")}
                              className="w-7 h-7 rounded-full bg-[#E3EEEC] text-[#2C6D63] flex items-center justify-center active:opacity-80 shrink-0"
                              title="발음 듣기"
                              aria-label="발음 듣기"
                            >
                              <Volume2 size={13} strokeWidth={2} />
                            </button>
                            <span className="flex-1 min-w-0 font-gothic text-[0.84375rem] text-[#4A5257]">{w.meaning}</span>
                            <button
                              onClick={() => saveMapWord(w)}
                              disabled={!!savedWords[w.word]}
                              className={
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 " +
                                (savedWords[w.word]
                                  ? "bg-[#2C6D63] text-white"
                                  : "bg-white border border-[#DDE3E6] text-[#646C72] active:bg-[#F1F4F5]")
                              }
                              title={savedWords[w.word] ? "이미 담긴 단어" : "단어장에 담기"}
                              aria-label={savedWords[w.word] ? "이미 담긴 단어" : "단어장에 담기"}
                            >
                              {savedWords[w.word] ? <Check size={15} strokeWidth={2.4} /> : <Plus size={15} strokeWidth={2.2} />}
                            </button>
                          </div>
                          <p className="mt-1.5 font-word text-[0.875rem] text-[#3B4245]">{w.example}</p>
                          <p className="mt-0.5 font-gothic text-[0.78125rem] text-[#646C72]">{w.exampleKo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
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
