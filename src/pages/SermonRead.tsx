// src/pages/SermonRead.tsx
// 설교문 읽기 (/sermon/:id).
// 가독성이 목적인 화면이라 위아래 스크롤만 됩니다 — 좌우 스와이프 플립은 없습니다.
// 인도네시아어 단어를 탭하면 성경 읽기와 같은 뜻 팝업이 아래에서 올라옵니다.
// 인도네시아어와 한국어를 뒤집지 않고 한 화면에 위아래로 같이 보여줍니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookMarked,
  Minus,
  Plus,
  ChevronUp,
  ChevronDown,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  X,
  Check,
  PenLine,
  Highlighter,
  Eraser,
  Undo2,
  Trash2,
  Maximize,
  Minimize,
} from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { goBackOr } from "@/lib/nav";
import { toast } from "sonner";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import {
  SermonBlock,
  SermonRecord,
  getCachedSermon,
  fetchSermon,
  saveSermon,
  formatSermonDate,
} from "@/lib/sermon";
import {
  InkChunk,
  InkRecord,
  InkStroke,
  getInk,
  saveInk,
  deleteInk,
} from "@/lib/sermonInk";


const speak = (text: string, lang: "id" | "ko") => {
  if ((window as any).AndroidTTS) {
    try { (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID"); } catch (e) {}
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
    utterance.rate = 0.9;
    (speechSynthesis as any)?.cancel?.();
    setTimeout(() => { try { (speechSynthesis as any)?.speak?.(utterance); } catch (e) {} }, 150);
  } catch (e) {}
};

// ---------- 글자 크기 (이 화면 전용) ----------
// 앱 전체 배율(fontScale.ts)과는 별개입니다.
const FONT_KEY = "sermon-font-step";
const SCALE = [0.85, 0.92, 1.0, 1.08, 1.16, 1.26, 1.36, 1.48, 1.60];
const BASE_PX = 17;

const loadFontStep = (): number => {
  try {
    const n = parseInt(localStorage.getItem(FONT_KEY) || "3", 10);
    if (isFinite(n) && n >= 0 && n < SCALE.length) return n;
  } catch (e) {}
  return 3;
};

const saveFontStep = (n: number) => {
  try {
    localStorage.setItem(FONT_KEY, String(n));
  } catch (e) {}
};

// ---------- 블록 종류별 모양 ----------
// 글자 크기는 전부 em 으로 줍니다. Tailwind 임의값(text-[1.0625rem])을 쓰면 배율이 먹지 않습니다.
// ID_BASE 에는 글자색을 넣지 않습니다. 여기에 text-foreground 를 두면
// 뒤에 붙이는 text-cyan-600 같은 색과 같은 특이도로 충돌하고,
// Tailwind 출력 순서상 커스텀 색(foreground)이 뒤에 나와 항상 이깁니다.
const ID_BASE = "font-word leading-[1.75] break-words";
const KO_BASE = "font-gothic text-muted-foreground leading-[1.7] break-words mt-1.5";
// 성경 인용(ref/verse) 공통 색 — 뉴스 '과학기술' 배지와 같은 cyan-600 입니다.
const BIBLE_COLOR = "text-cyan-600";
const BIBLE_BORDER = "border-cyan-600";

interface KindStyle {
  wrap: string;
  idClass: string;
  idSize: string;
  koClass: string;
  koSize: string;
}

const KIND_STYLE: Record<string, KindStyle> = {
  title: {
    wrap: "mb-6",
    idClass: ID_BASE + " font-semibold text-foreground",
    idSize: "1.25em",
    koClass: KO_BASE + " font-semibold text-foreground",
    koSize: "0.87em",
  },
  ref: {
    // 성경 계열(ref/verse)은 이탤릭 대신 진한 파랑으로 구분합니다.
    // Lora 이탤릭의 k 가 R 처럼 보여 가독성이 떨어지기 때문입니다.
    wrap: "mb-6 -mt-4",
    idClass: ID_BASE + " " + BIBLE_COLOR,
    idSize: "0.9em",
    koClass: KO_BASE,
    koSize: "0.68em",
  },
  heading: {
    wrap: "mt-8 mb-5 scroll-mt-16",
    idClass: ID_BASE + " font-semibold text-indigo-600",
    idSize: "1.15em",
    koClass: KO_BASE + " font-semibold text-foreground",
    koSize: "0.71em",
  },
  verse: {
    wrap: "mb-5 border-l-2 " + BIBLE_BORDER + " pl-3",
    idClass: ID_BASE + " " + BIBLE_COLOR,
    idSize: "0.95em",
    koClass: KO_BASE,
    koSize: "0.64em",
  },
  hymn: {
    // 찬양 가사는 본문과 같은 검정, 워드에 적힌 대로 왼쪽 정렬입니다.
    // (가운데 정렬하면 줄바꿈 위치가 흔들려 절 구분이 흐려집니다.)
    wrap: "mb-5",
    idClass: ID_BASE + " text-foreground",
    idSize: "0.95em",
    koClass: KO_BASE,
    koSize: "0.64em",
  },
  body: {
    wrap: "mb-5",
    idClass: ID_BASE + " text-foreground",
    idSize: "1em",
    koClass: KO_BASE,
    koSize: "0.64em",
  },
};

const styleFor = (kind: string): KindStyle => KIND_STYLE[kind] || KIND_STYLE.body;

// ---------- 필기(S펜) 도구 ----------
// 아래 수치는 갤럭시 탭 실기기 시험으로 확정된 값입니다. 임의로 바꾸지 마세요.
const PEN_COLORS = ["#3F3F3F","#8A8A8A","#E0705A","#C0392B","#E39A3C","#C9A227",
                    "#86D3BC","#54AE8F","#2F8F6B","#8FAFD8","#5E86C0","#2E62C4",
                    "#34406E","#8C5BA6"];
const PEN_W = [1.2, 1.45, 1.7, 1.9, 2.8];        // 기본 index 3
const HL_COLORS = ["#FFE94A","#A8E05F","#FFA94D","#FF8FB1","#7FD3F7","#C79BE8"];
const HL_W = [9, 13, 17, 25];                     // 기본 index 2

// 도구막대 굵기 버튼 안에 그릴 선의 두께(px). 실제 획 굵기(PEN_W/HL_W)와는 별개입니다.
// 실제 값을 그대로 쓰면 다섯 칸이 2~3px 로 붙어 단계가 눈에 안 보입니다.
const PEN_W_VIEW = [2, 3, 4, 5.5, 8];
const HL_W_VIEW = [4, 6, 9, 13];

const HL_ALPHA = 0.45;
const TOOL_KEY = "sermon-ink-tool";
const SVG_NS = "http://www.w3.org/2000/svg";

interface InkToolState {
  tool: "pen" | "hl";
  penColor: string;
  penW: number;
  hlColor: string;
  hlW: number;
}

const DEFAULT_TOOL: InkToolState = {
  tool: "pen",
  penColor: PEN_COLORS[0],
  penW: 3,
  hlColor: HL_COLORS[0],
  hlW: 2,
};

const pickIdx = (v: any, len: number, fallback: number): number =>
  typeof v === "number" && isFinite(v) && v >= 0 && v < len ? Math.floor(v) : fallback;

const pickColor = (v: any, list: string[], fallback: string): string =>
  typeof v === "string" && list.indexOf(v) >= 0 ? v : fallback;

const loadInkTool = (): InkToolState => {
  try {
    const raw = localStorage.getItem(TOOL_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return {
        tool: o && o.tool === "hl" ? "hl" : "pen",
        penColor: pickColor(o && o.penColor, PEN_COLORS, DEFAULT_TOOL.penColor),
        penW: pickIdx(o && o.penW, PEN_W.length, DEFAULT_TOOL.penW),
        hlColor: pickColor(o && o.hlColor, HL_COLORS, DEFAULT_TOOL.hlColor),
        hlW: pickIdx(o && o.hlW, HL_W.length, DEFAULT_TOOL.hlW),
      };
    }
  } catch (e) {}
  return DEFAULT_TOOL;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// 중점 기준 2차 곡선. M p0, Q p[i] mid(p[i],p[i+1]) ..., L last
const pathD = (pts: number[]): string => {
  const n = Math.floor(pts.length / 2);
  if (n === 0) return "";
  if (n === 1) return "M " + pts[0] + " " + pts[1] + " L " + (pts[0] + 0.01) + " " + pts[1];
  let d = "M " + pts[0] + " " + pts[1];
  for (let i = 1; i < n - 1; i++) {
    const cx = pts[i * 2];
    const cy = pts[i * 2 + 1];
    const mx = (cx + pts[(i + 1) * 2]) / 2;
    const my = (cy + pts[(i + 1) * 2 + 1]) / 2;
    d += " Q " + cx + " " + cy + " " + mx + " " + my;
  }
  d += " L " + pts[(n - 1) * 2] + " " + pts[(n - 1) * 2 + 1];
  return d;
};

// 한 획 = 그룹 하나. 펜은 연필 질감 필터, 형광펜은 곱하기 블렌드.
const makeInkGroup = (tool: "pen" | "hl", color: string): SVGGElement => {
  const g = document.createElementNS(SVG_NS, "g") as SVGGElement;
  g.setAttribute("data-tool", tool);
  g.setAttribute("data-color", color);
  if (tool === "pen") g.setAttribute("filter", "url(#sermonPencil)");
  else g.setAttribute("style", "mix-blend-mode:multiply");
  return g;
};

// 굵기·진하기가 같은 구간 하나
const makeInkPath = (
  tool: "pen" | "hl",
  color: string,
  w: number,
  a: number,
  pts: number[],
): SVGPathElement => {
  const p = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", color);
  p.setAttribute("stroke-linecap", tool === "pen" ? "round" : "butt");
  p.setAttribute("stroke-linejoin", "round");
  p.setAttribute("stroke-width", String(w));
  p.setAttribute("stroke-opacity", String(a));
  p.setAttribute("data-w", String(w));
  p.setAttribute("data-a", String(a));
  (p as any).__pts = pts;
  if (pts.length > 0) p.setAttribute("d", pathD(pts));
  return p;
};

// 획(그룹) 단위 지우개 판정: bBox ±12px 로 거르고, 경로를 24등분해 12px 안이면 맞음
const hitInkGroup = (g: SVGGElement, x: number, y: number): boolean => {
  let bb: DOMRect | null = null;
  try {
    bb = g.getBBox() as DOMRect;
  } catch (e) {
    return false;
  }
  if (!bb) return false;
  if (x < bb.x - 12 || x > bb.x + bb.width + 12) return false;
  if (y < bb.y - 12 || y > bb.y + bb.height + 12) return false;
  const paths = g.getElementsByTagName("path");
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i] as SVGPathElement;
    let len = 0;
    try {
      len = p.getTotalLength();
    } catch (e) {
      continue;
    }
    for (let s = 0; s <= 24; s++) {
      let pt: DOMPoint;
      try {
        pt = p.getPointAtLength((len * s) / 24) as DOMPoint;
      } catch (e) {
        break;
      }
      const dx = pt.x - x;
      const dy = pt.y - y;
      if (dx * dx + dy * dy <= 144) return true;
    }
  }
  return false;
};

const SermonRead = () => {
  const navigate = useNavigate();
  const { widthClass, canWide, wide, toggle } = useWideMode();
  const location = useLocation();
  const params = useParams();
  const id = params.id || "";

  const [rec, setRec] = useState<SermonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const [fontStep, setFontStep] = useState(loadFontStep);

  const subOpenRef = useRef(false);
  const subPushedRef = useRef(false);

  // 단어 탭 팝업 (성경 읽기와 동일한 3단 캐시)
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  // ---------- 필기(S펜) ----------
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<SVGGElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const [inkMode, setInkMode] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [inkTool, setInkTool] = useState<InkToolState>(loadInkTool);
  const [eraser, setEraser] = useState(false);
  const [eraseMenu, setEraseMenu] = useState(false);
  const [inkTick, setInkTick] = useState(0);
  const [inkH, setInkH] = useState(0);
  const [barHidden, setBarHidden] = useState(false);
  // 몰입(전체화면) 모드. 실제 전체화면이 먹히지 않는 WebView(APK)에서도 헤더를 접어 화면을 넓혀줍니다.
  const [immersive, setImmersive] = useState(false);
  // 지우개 메뉴는 도구막대(가로 스크롤 + transform) 밖에서 fixed 로 띄웁니다. 그 위치.
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  // 그리는 중에는 리렌더로 획이 끊기므로, 엔진은 아래 ref 만 읽습니다.
  const toolRef = useRef<InkToolState>(inkTool);
  const eraserRef = useRef(false);
  const fontStepRef = useRef(0);
  const inkTouchedRef = useRef(false); // 사용자가 필기를 건드린 적이 있는지 (빈 저장으로 지워지는 사고 방지)
  const pendingInkRef = useRef<InkRecord | null>(null);
  const inkLoadedForRef = useRef("");
  const saveTimerRef = useRef<number | null>(null);
  const saveNowRef = useRef<() => void>(() => {});
  const wasInkRef = useRef(false);
  // 그리기 엔진이 도구막대를 숨길 때 쓰는 통로. 엔진 effect 의 의존성을 늘리지 않으려고 ref 로 둡니다.
  const hideBarRef = useRef<(() => void) | null>(null);
  const eraseAnchorRef = useRef<HTMLDivElement | null>(null);

  // ---------- 본문 불러오기 (폰 저장분 우선, 없으면 서버) ----------
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);

    getCachedSermon(id)
      .then((cached) => {
        if (cancelled) return null;
        if (cached) {
          setRec(cached);
          setLoading(false);
          return null;
        }
        return fetchSermon(id).then((fresh) => {
          if (cancelled) return null;
          saveSermon(fresh);
          setRec(fresh);
          setLoading(false);
          return null;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  // ---- 담을 단어장 (사전에서 고른 대상을 앱 전체가 함께 씁니다) ----
  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerOpenRef = useRef(false);
  const pickerPushedRef = useRef(false);
  const saveTargetName = (saveTargets.find((c) => c.id === saveTargetId) || { name: "" }).name;

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    saveSaveTargetId(id);
  };

  // 시트는 히스토리를 한 칸 더 쌓습니다 — 뒤로가기를 누르면 시트만 닫히고 팝업은 남습니다.
  const openPicker = () => {
    if (pickerOpenRef.current) return;
    setSaveTargets(loadSaveTargets());
    setPickerOpen(true);
    pickerOpenRef.current = true;
    try {
      window.history.pushState({ wordbookPicker: true }, "");
      pickerPushedRef.current = true;
    } catch (e) {
      pickerPushedRef.current = false;
    }
  };

  const closePicker = () => {
    if (!pickerOpenRef.current) return;
    if (pickerPushedRef.current) {
      pickerPushedRef.current = false;
      // pickerOpenRef 는 여기서 내리지 않습니다 — popstate 핸들러가 이것을 보고 닫습니다.
      try { window.history.back(); return; } catch (e) {}
    }
    pickerOpenRef.current = false;
    setPickerOpen(false);
  };

  // 대상이 바뀌면 그 단어장 기준으로 담김 여부를 다시 판정합니다.
  useEffect(() => {
    if (!popupWord || !saveTargetId) {
      setPopupSaved(false);
      return;
    }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  // ---------- 목차 시트 / 단어 팝업: 폰 뒤로가기로도 닫히게 (성경 읽기와 같은 방식) ----------
  const pushSub = () => {
    if (subOpenRef.current) return;
    subOpenRef.current = true;
    try {
      window.history.pushState({ sermonSub: true }, "");
      subPushedRef.current = true;
    } catch (e) {
      subPushedRef.current = false;
    }
  };

  const resetSub = () => {
    setPopupWord(null);
    setInkMode(false); // 폰 뒤로가기 → 필기 모드만 종료
  };

  const closeSub = () => {
    if (subPushedRef.current) {
      subPushedRef.current = false;
      // subOpenRef 는 여기서 내리지 않습니다.
      // popstate 핸들러가 subOpenRef 를 보고 resetSub() 를 실행하기 때문입니다.
      try {
        window.history.back();
        // popstate 가 오지 않는 드문 경우를 대비한 안전장치
        window.setTimeout(() => {
          if (subOpenRef.current) {
            subOpenRef.current = false;
            resetSub();
          }
        }, 300);
        return;
      } catch (e) {
        // 아래에서 직접 닫습니다
      }
    }
    subOpenRef.current = false;
    resetSub();
  };

  useEffect(() => {
    const onPop = () => {
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (팝업은 그대로).
      if (pickerOpenRef.current) {
        pickerOpenRef.current = false;
        pickerPushedRef.current = false;
        setPickerOpen(false);
        return;
      }
      if (subOpenRef.current) {
        subOpenRef.current = false;
        subPushedRef.current = false;
        resetSub();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openWordPopup = async (rawToken: string, sentence: string) => {
    const word = rawToken.replace(new RegExp("[^A-Za-z\\-']", "g"), "").trim();
    if (!word) return;
    const key = word.toLowerCase();
    const reqId = ++popupReqId.current;
    setPopupWord(word);
    setPopupSentence(sentence);
    setPopupSaved(!!saveTargetId && hasWordInCategory(saveTargetId, word));
    pushSub();

    const cached = wordCache.current.get(key);
    if (cached) {
      setPopupMeaning(cached.meaning);
      setPopupInfo(cached.info);
      setPopupSentenceKo(cached.sentenceKo);
      setPopupLoading(false);
      return;
    }

    setPopupMeaning("");
    setPopupInfo("");
    setPopupSentenceKo("");
    setPopupLoading(true);

    const stored = await getLookupWord(word);
    if (stored && popupReqId.current === reqId) {
      const rec2 = { meaning: stored.meaning, info: stored.info, sentenceKo: "" };
      wordCache.current.set(key, rec2);
      setPopupMeaning(rec2.meaning);
      setPopupInfo(rec2.info);
      setPopupLoading(false);
      return;
    }

    quickLookupWord(word, sentence)
      .then((r) => {
        wordCache.current.set(key, r);
        saveLookupWord(word, r.meaning, r.info);
        if (popupReqId.current !== reqId) return;
        setPopupMeaning(r.meaning);
        setPopupInfo(r.info);
        setPopupSentenceKo(r.sentenceKo);
      })
      .catch(() => {
        if (popupReqId.current === reqId) setPopupMeaning("뜻을 불러오지 못했어요. 다시 탭해주세요");
      })
      .finally(() => {
        if (popupReqId.current === reqId) setPopupLoading(false);
      });
  };

  const copyPopupWord = async () => {
    if (!popupWord) return;
    try {
      await navigator.clipboard.writeText(popupWord);
      toast("복사되었습니다");
    } catch (e) {
      toast("복사에 실패했어요");
    }
  };

  const openInDictionary = () => {
    if (!popupWord) return;
    navigate("/dictionary?q=" + encodeURIComponent(popupWord) + "&from=sermon");
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning || !saveTargetId) return;
    const { added } = addWordIfAbsent({
      word: popupWord,
      meaning: popupMeaning,
      example: popupSentence,
      exampleMeaning: popupSentenceKo,
      categoryId: saveTargetId,
    });
    setPopupSaved(true);
    toast(added ? `${saveTargetName}에 담았습니다` : `이미 ${saveTargetName}에 있는 단어입니다`);
  };

  const renderTokens = (text: string, keyPrefix: string) =>
    text.split(" ").map((tok, ti) => (
      <span key={keyPrefix + ti}>
        <span
          onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
          className="cursor-pointer rounded active:bg-indigo-500/20"
        >
          {tok}
        </span>{" "}
      </span>
    ));

  const changeFont = (delta: number) => {
    setFontStep((prev) => {
      const next = Math.max(0, Math.min(SCALE.length - 1, prev + delta));
      saveFontStep(next);
      return next;
    });
  };

  // ---------- 필기: 도구 상태를 ref 로 미러링 (엔진은 리렌더와 무관하게 읽습니다) ----------
  useEffect(() => {
    toolRef.current = inkTool;
    try {
      localStorage.setItem(TOOL_KEY, JSON.stringify(inkTool));
    } catch (e) {}
  }, [inkTool]);

  useEffect(() => {
    eraserRef.current = eraser;
  }, [eraser]);

  useEffect(() => {
    fontStepRef.current = fontStep;
  });

  // ---------- 필기: 저장 ----------
  // SVG 노드가 곧 원본입니다. 저장할 때만 InkStroke[] 로 직렬화합니다.
  const serializeInk = (): InkStroke[] => {
    const layer = strokesRef.current;
    if (!layer) return [];
    const out: InkStroke[] = [];
    for (let i = 0; i < layer.children.length; i++) {
      const g = layer.children[i] as SVGGElement;
      const tool: "pen" | "hl" = g.getAttribute("data-tool") === "hl" ? "hl" : "pen";
      const color = g.getAttribute("data-color") || PEN_COLORS[0];
      const chunks: InkChunk[] = [];
      const paths = g.getElementsByTagName("path");
      for (let j = 0; j < paths.length; j++) {
        const p = paths[j] as SVGPathElement;
        const pts = ((p as any).__pts || []) as number[];
        if (pts.length < 2) continue;
        chunks.push({
          w: parseFloat(p.getAttribute("data-w") || "2") || 2,
          a: parseFloat(p.getAttribute("data-a") || "1") || 1,
          pts: pts.map((v) => Math.round(v * 10) / 10),
        });
      }
      if (chunks.length > 0) out.push({ tool, color, chunks });
    }
    return out;
  };

  const saveInkNow = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!id || !inkTouchedRef.current) return;
    const strokes = serializeInk();
    if (strokes.length === 0) {
      deleteInk(id);
      return;
    }
    saveInk({
      id,
      fontStep: fontStepRef.current,
      width: wrapRef.current ? wrapRef.current.clientWidth : 0,
      strokes,
      updatedAt: Date.now(),
    });
  };

  useEffect(() => {
    saveNowRef.current = saveInkNow;
  });

  // 획이 끝날 때마다 800ms 디바운스
  const scheduleInkSave = () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      saveNowRef.current();
    }, 800);
  };

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") saveNowRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveNowRef.current();
      }
    };
  }, []);

  // 필기 층 높이를 본문 래퍼에 맞춥니다 (본문 로드·글자 크기 변경·회전·리사이즈).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sync = () => setInkH(wrap.scrollHeight);
    sync();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(sync);
      ro.observe(wrap);
    } catch (e) {}
    window.addEventListener("resize", sync);
    return () => {
      try {
        if (ro) ro.disconnect();
      } catch (e) {}
      window.removeEventListener("resize", sync);
    };
  }, [rec, fontStep, inkMode]);

  // ---------- 필기: 불러오기 ----------
  useEffect(() => {
    if (!rec || !id) return;
    if (inkLoadedForRef.current === id) return;
    let cancelled = false;
    getInk(id).then((r) => {
      if (cancelled) return;
      inkLoadedForRef.current = id;
      if (!r || !r.strokes || r.strokes.length === 0) return;
      pendingInkRef.current = r;
      setHasInk(true);
      setFontStep(r.fontStep); // 필기 당시 글자 크기를 강제 적용 (안 그러면 본문이 재배치되어 어긋납니다)
      setInkTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [rec, id]);

  // 글자 크기가 반영된 뒤(rAF)에 SVG 로 다시 그려 넣습니다.
  useEffect(() => {
    if (inkTick === 0) return;
    const raf = window.requestAnimationFrame(() => {
      const r = pendingInkRef.current;
      const layer = strokesRef.current;
      const wrap = wrapRef.current;
      if (!r || !layer || !wrap) return;
      pendingInkRef.current = null; // 한 번만 그립니다 (그린 뒤엔 SVG 가 원본)
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      const curW = wrap.clientWidth || r.width || 1;
      const k = r.width > 0 ? curW / r.width : 1; // 폭이 달라졌으면(회전 등) 좌표에 배율
      r.strokes.forEach((s) => {
        const g = makeInkGroup(s.tool, s.color);
        s.chunks.forEach((c) => {
          const pts = k === 1 ? c.pts.slice() : c.pts.map((v) => v * k);
          if (pts.length < 2) return;
          g.appendChild(makeInkPath(s.tool, s.color, c.w, c.a, pts));
        });
        if (g.firstChild) layer.appendChild(g);
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [inkTick, fontStep, rec]);

  // ---------- 필기: 모드 전환 ----------
  const enterInkMode = () => {
    setEraser(false);
    setEraseMenu(false);
    setBarHidden(false);
    setImmersive(false);
    setInkMode(true);
    pushSub();
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    } catch (e) {
      // WebView(APK) 에서는 안 될 수 있습니다 — 실패해도 그대로 진행
    }
  };

  const exitInkMode = () => {
    setInkMode(false);
    setEraseMenu(false);
    setBarHidden(false);
    closeSub();
  };

  // 필기 모드를 벗어나면 즉시 저장하고 전체화면도 풉니다.
  useEffect(() => {
    if (inkMode) {
      wasInkRef.current = true;
      return;
    }
    if (!wasInkRef.current) return;
    wasInkRef.current = false;
    setBarHidden(false); // 다음에 들어올 때 도구막대가 보이도록
    setImmersive(false); // 헤더 복구
    try {
      if (document.fullscreenElement && (document as any).exitFullscreen) {
        (document as any).exitFullscreen().catch(() => {});
      }
    } catch (e) {}
    saveNowRef.current();
  }, [inkMode]);

  // ---------- 필기: 도구막대 동작 ----------
  const selectTool = (t: "pen" | "hl") => {
    setInkTool((p) => ({ ...p, tool: t }));
    setEraser(false);
    setEraseMenu(false);
  };

  const selectWidth = (i: number) => {
    setInkTool((p) => (p.tool === "pen" ? { ...p, penW: i } : { ...p, hlW: i }));
    setEraser(false);
  };

  // 색을 고르면 지우개가 풀리고 직전 도구(펜/형광펜)로 돌아옵니다.
  const selectColor = (c: string) => {
    setInkTool((p) => (p.tool === "pen" ? { ...p, penColor: c } : { ...p, hlColor: c }));
    setEraser(false);
  };

  const undoInk = () => {
    const layer = strokesRef.current;
    if (!layer || !layer.lastElementChild) return;
    layer.removeChild(layer.lastElementChild);
    inkTouchedRef.current = true;
    setHasInk(!!layer.firstElementChild);
    scheduleInkSave();
  };

  const clearAllInk = () => {
    setEraseMenu(false);
    if (!hasInk) return;
    if (!window.confirm("이 설교문의 필기를 모두 지울까요?")) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const layer = strokesRef.current;
    if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
    pendingInkRef.current = null;
    inkTouchedRef.current = true;
    setHasInk(false); // → 글자 크기 −/+ 즉시 다시 활성화
    deleteInk(id);
    toast("필기를 모두 지웠습니다");
  };

  // ---------- 필기: 도구막대 자동 숨김 ----------
  // 엔진(onDown)은 이 ref 만 호출합니다 — 상태를 직접 참조하지 않습니다.
  useEffect(() => {
    hideBarRef.current = () => setBarHidden(true);
    return () => {
      hideBarRef.current = null;
    };
  }, []);

  // ---------- 필기: 전체화면(몰입) 토글 ----------
  // APK 의 WebView 는 requestFullscreen 이 있어도 상태바·내비바를 실제로 감추지 않습니다.
  // 그래서 시스템 전체화면은 "되면 좋고"로 시도하고, 화면을 넓히는 일은 앱 헤더를 접어서 직접 합니다.
  useEffect(() => {
    const onFs = () => {
      // 시스템에서 전체화면이 풀리면(뒤로가기·Esc) 몰입 모드도 같이 풉니다.
      if (!document.fullscreenElement) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    const next = !immersive;
    setImmersive(next);
    try {
      if (next) {
        const el = document.documentElement as any;
        if (el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if (document.fullscreenElement) {
        const d = document as any;
        if (d.exitFullscreen) d.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // 지우개 메뉴 열기 — 도구막대 밖에 fixed 로 띄우므로 여는 순간 버튼 위치를 재둡니다.
  const toggleEraseMenu = () => {
    if (eraseMenu) {
      setEraseMenu(false);
      return;
    }
    const el = eraseAnchorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setMenuPos({ left: r.left, top: r.bottom + 4 });
    }
    setEraseMenu(true);
  };

  const warnFontLocked = () => {
    if (!hasInk) return;
    toast("필기가 있는 설교문은 글자 크기를 바꿀 수 없습니다. 필기를 모두 지우면 조절할 수 있습니다");
  };

  // ---------- 필기: 그리기 엔진 ----------
  // 여기서는 setState 를 쓰지 않습니다. 획이 끝난 뒤(pointerup/지우기 종료)에만 상태를 건드립니다.
  useEffect(() => {
    if (!inkMode) return;
    const surface = surfaceRef.current;
    const wrap = wrapRef.current;
    const layer = strokesRef.current;
    if (!surface || !wrap || !layer) return;

    // S펜 필압 원본 최대치가 1.0 이 아니라 0.55~0.64 부근이라 관측 최대값으로 정규화합니다.
    let PMAX = 0.55;
    const norm = (raw: number): number => {
      if (!raw || raw <= 0) return -1; // 압력 0 이벤트가 간헐적으로 섞임 → 직전 값 유지
      if (raw > PMAX) PMAX = Math.min(1, raw);
      return Math.max(0.05, Math.min(1, raw / PMAX));
    };

    let drawing = false;
    let erasing = false;
    let penNear = false;
    let penTimer: number | null = null;
    let lastPenX = -9999;
    let lastPenY = -9999;

    let group: SVGGElement | null = null;
    let chunk: SVGPathElement | null = null;
    let pts: number[] = [];
    let qkey = "";
    let smoothP = 0.5;
    let strokeTool: "pen" | "hl" = "pen";
    let activeId = -1;

    // pointercancel 로 끊긴 획 이어붙이기용
    let resumeG: SVGGElement | null = null;
    let resumeX = 0;
    let resumeY = 0;
    let resumeT = 0;

    // ① 펜 근접 감지 — 600ms 무이벤트면 해제 (그리는 중엔 유지)
    const markPen = () => {
      penNear = true;
      if (penTimer !== null) window.clearTimeout(penTimer);
      penTimer = window.setTimeout(() => {
        if (!drawing) penNear = false;
      }, 600);
    };

    const pos = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const qk = (w: number, a: number) => String(Math.round(w * 2)) + ":" + String(Math.round(a * 8));

    const pushPt = (x: number, y: number) => {
      pts.push(x, y);
      if (chunk) chunk.setAttribute("d", pathD(pts));
    };

    const startStroke = (x: number, y: number, n: number) => {
      const t = toolRef.current;
      strokeTool = t.tool;
      const color = t.tool === "pen" ? t.penColor : t.hlColor;
      const now = Date.now();
      const dx = x - resumeX;
      const dy = y - resumeY;
      const canResume =
        !!resumeG && now - resumeT < 250 && dx * dx + dy * dy < 900;
      if (canResume && resumeG) {
        group = resumeG; // 같은 획으로 이어붙임
      } else {
        group = makeInkGroup(t.tool, color);
        layer.appendChild(group);
      }
      smoothP = n >= 0 ? n : 0.5;
      pts = [];
      if (canResume) pts.push(resumeX, resumeY); // 끊긴 지점에서 이어서 시작
      resumeG = null;
      if (t.tool === "pen") {
        const a = clamp(0.26 + smoothP * 0.86, 0.26, 1);
        const w = PEN_W[t.penW] * (0.45 + smoothP * 1.15);
        qkey = qk(w, a);
        chunk = makeInkPath("pen", color, w, a, pts);
      } else {
        qkey = "";
        chunk = makeInkPath("hl", color, HL_W[t.hlW], HL_ALPHA, pts);
      }
      group.appendChild(chunk);
      pushPt(x, y);
    };

    const movePen = (x: number, y: number, raw: number) => {
      const n = norm(raw);
      if (n >= 0) smoothP = smoothP * 0.62 + n * 0.38;
      const t = toolRef.current;
      const a = clamp(0.26 + smoothP * 0.86, 0.26, 1);
      const w = PEN_W[t.penW] * (0.45 + smoothP * 1.15);
      const k = qk(w, a);
      // 조각이 3점 이상 쌓였을 때만 나눕니다. 새 조각은 반드시 이전 조각의 마지막 점에서 시작
      // (안 그러면 점선이 됩니다)
      if (k !== qkey && pts.length >= 6 && group) {
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        pts = [lx, ly];
        chunk = makeInkPath("pen", t.penColor, w, a, pts);
        group.appendChild(chunk);
        qkey = k;
      }
      pushPt(x, y);
    };

    const eraseAt = (x: number, y: number) => {
      const kids = layer.children;
      for (let i = kids.length - 1; i >= 0; i--) {
        const g = kids[i] as SVGGElement;
        if (hitInkGroup(g, x, y)) layer.removeChild(g);
      }
    };

    const endStroke = () => {
      drawing = false;
      group = null;
      chunk = null;
      pts = [];
      inkTouchedRef.current = true;
      setHasInk(true);
      scheduleInkSave();
    };

    const onDown = (e: PointerEvent) => {
      // ④ 손가락은 스크롤 전용
      if (e.pointerType !== "pen") return;
      markPen();
      if (hideBarRef.current) hideBarRef.current(); // 펜이 닿으면 도구막대를 접습니다 (ref 경유 — 의존성 그대로)
      e.preventDefault();
      activeId = e.pointerId;
      try {
        surface.setPointerCapture(e.pointerId);
      } catch (err) {}
      const pt = pos(e);
      // S펜 옆 버튼을 누른 채 문지르면 지우개로 동작
      const useEraser = eraserRef.current || (e.buttons & 32) !== 0;
      if (useEraser) {
        erasing = true;
        eraseAt(pt.x, pt.y);
        return;
      }
      drawing = true;
      startStroke(pt.x, pt.y, norm(e.pressure));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "pen") markPen();
      if (!drawing && !erasing) return;
      if (e.pointerId !== activeId) return;
      e.preventDefault();
      let list: PointerEvent[] = [e];
      try {
        const co = (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() : null;
        if (co && co.length > 0) list = co as PointerEvent[];
      } catch (err) {}
      for (let i = 0; i < list.length; i++) {
        const ev = list[i];
        const pt = pos(ev);
        if (erasing) {
          eraseAt(pt.x, pt.y);
          continue;
        }
        if (strokeTool === "pen") movePen(pt.x, pt.y, ev.pressure);
        else pushPt(pt.x, pt.y);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return;
      try {
        surface.releasePointerCapture(e.pointerId);
      } catch (err) {}
      activeId = -1;
      if (erasing) {
        erasing = false;
        inkTouchedRef.current = true;
        setHasInk(!!layer.firstElementChild);
        scheduleInkSave();
        return;
      }
      if (!drawing) return;
      endStroke();
    };

    // 250ms · 30px(거리² < 900) 안에서 다시 시작하면 같은 획으로 잇습니다.
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return;
      activeId = -1;
      if (erasing) {
        erasing = false;
        inkTouchedRef.current = true;
        setHasInk(!!layer.firstElementChild);
        scheduleInkSave();
        return;
      }
      if (!drawing) return;
      if (group && pts.length >= 2) {
        resumeG = group;
        resumeX = pts[pts.length - 2];
        resumeY = pts[pts.length - 1];
        resumeT = Date.now();
      }
      endStroke();
    };

    // ② 펜 접촉·손바닥이 스크롤을 만들지 못하게 막습니다.
    //    단, 펜을 손에 든 채(호버 중)라도 펜촉에서 멀리 떨어진 손가락 터치는
    //    스크롤로 허용합니다 — 안 그러면 펜을 쥐고 있는 동안 스크롤이 전부 막힙니다.
    const onTouchStart = (e: TouchEvent) => {
      if (drawing || erasing) {
        e.preventDefault();
        return;
      }
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i] as any;
        if ((t.radiusX || 0) > 22 || (t.radiusY || 0) > 22) {
          e.preventDefault(); // 접촉면이 크면 손바닥 — 펜 유무와 무관하게 항상
          return;
        }
        if (penNear) {
          // 아래 두 규칙은 "펜을 쥐고 쓰는 자세"에서만 의미가 있습니다.
          // 펜이 없을 때까지 걸면 손가락 스크롤이 대부분 막힙니다.
          if (t.clientY > window.innerHeight * 0.66) {
            e.preventDefault(); // 아래쪽 1/3 = 글씨 쓸 때 손바닥이 얹히는 구역
            return;
          }
          const dx = t.clientX - lastPenX;
          const dy = t.clientY - lastPenY;
          if (dx * dx + dy * dy < 6400) {
            e.preventDefault(); // 펜촉 80px 반경 안 = 펜 자신의 접촉으로 간주
            return;
          }
        }
      }
    };

    // ③ 그리는 동안에는 스크롤 금지
    const onTouchMove = (e: TouchEvent) => {
      if (drawing || erasing) e.preventDefault();
    };

    const onDocPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "pen") {
        markPen();
        lastPenX = e.clientX;
        lastPenY = e.clientY;
      }
    };

    surface.addEventListener("pointerdown", onDown, { passive: false });
    surface.addEventListener("pointermove", onMove, { passive: false });
    surface.addEventListener("pointerup", onUp);
    surface.addEventListener("pointercancel", onCancel);
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("pointermove", onDocPointerMove, { passive: true });
    document.addEventListener("pointerover", onDocPointerMove, { passive: true });

    return () => {
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("pointermove", onDocPointerMove);
      document.removeEventListener("pointerover", onDocPointerMove);
      if (penTimer !== null) window.clearTimeout(penTimer);
    };
  }, [inkMode]);

  const blocks: SermonBlock[] = (rec && rec.blocks) || [];

  const fontPx = Math.round(BASE_PX * SCALE[fontStep]) + "px";

  const renderBlock = (b: SermonBlock, i: number) => {
    if (!b) return null;
    // 찬양 중의 빈 줄 — 절·후렴을 구분하는 여백입니다 (업로드 도구가 빈 블록으로 보냅니다).
    if (b.kind === "hymn" && !b.id && !b.ko) {
      return <div key={i} className="h-4" aria-hidden="true" />;
    }
    const st = styleFor(b.kind);
    return (
      <div
        key={i}
        id={b.kind === "heading" ? "sec-" + i : undefined}
        className={st.wrap}
      >
        {b.id ? (
          <p className={st.idClass} style={{ fontSize: st.idSize }}>
            {renderTokens(b.id, "w" + i + "-")}
          </p>
        ) : null}
        {b.ko ? (
          <p className={st.koClass} style={{ fontSize: st.koSize }}>
            {b.ko}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <header
        className={
          "sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 items-center gap-3 " +
          (inkMode && immersive ? "hidden" : "flex")
        }
      >
        <button
          onClick={() => goBackOr(navigate, location.key, "/sermon")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <BookMarked size={16} className="text-white" />
        </span>
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-none truncate">
          {rec ? rec.title || "설교문" : "설교문"}
        </h1>
        {canWide ? (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground active:text-foreground"
            title={wide ? "원래 크기로" : "넓게 보기"}
            aria-label={wide ? "원래 크기로" : "넓게 보기"}
          >
            {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        ) : null}
      </header>

      {/* 필기 도구막대 — 헤더(높이 61px) 바로 아래에 붙어 따라옵니다.
          sticky 는 흐름상의 위치에서만 동작하므로 헤더 바로 다음에 두어야 합니다. */}
      {inkMode ? (
        <div
          className={
            "sticky relative z-20 bg-background border-b border-border px-3 py-1.5 transition-transform duration-200 ease-out " +
            (immersive ? "top-0 " : "top-[60px] ") +
            (barHidden ? "-translate-y-full pointer-events-none" : "translate-y-0")
          }
        >
          {/* 1줄: 도구 │ 굵기 │ 되돌리기·전체화면·완료
              px-1/py-1 은 선택 표시(ring)가 가로 스크롤 영역에 잘리지 않게 두는 여백입니다.
              같은 크기의 음수 마진으로 상쇄해 실제 자리 차지는 그대로입니다. */}
          <div
            className="flex flex-nowrap items-center gap-1 overflow-x-auto px-1 -mx-1 py-1 -my-1"
            style={{ scrollbarWidth: "none" }}
          >
            {/* 손잡이 — 수동으로 접기 */}
            <button
              type="button"
              onClick={() => setBarHidden(true)}
              className="w-5 h-8 flex items-center justify-center text-foreground/40 shrink-0"
              aria-label="도구막대 숨기기"
            >
              <ChevronUp size={14} />
            </button>

            <button
              type="button"
              onClick={() => selectTool("pen")}
              className={
                "h-8 px-2.5 rounded-full border border-border bg-card flex items-center gap-1 text-[0.6875rem] font-gothic shrink-0 " +
                (!eraser && inkTool.tool === "pen" ? "ring-2 ring-foreground text-foreground" : "text-foreground/70")
              }
            >
              <PenLine size={14} /> 펜
            </button>
            <button
              type="button"
              onClick={() => selectTool("hl")}
              className={
                "h-8 px-2.5 rounded-full border border-border bg-card flex items-center gap-1 text-[0.6875rem] font-gothic shrink-0 " +
                (!eraser && inkTool.tool === "hl" ? "ring-2 ring-foreground text-foreground" : "text-foreground/70")
              }
            >
              <Highlighter size={14} /> 형광펜
            </button>

            {/* 지우개 ▾ — 왼쪽은 토글, 오른쪽 화살표는 메뉴 */}
            <div
              ref={eraseAnchorRef}
              className={
                "relative flex items-center rounded-full border border-border bg-card shrink-0 " +
                (eraser ? "ring-2 ring-foreground" : "")
              }
            >
              <button
                type="button"
                onClick={() => {
                  setEraser((v) => !v);
                  setEraseMenu(false);
                }}
                className={
                  "h-8 pl-2.5 pr-1 flex items-center gap-1 text-[0.6875rem] font-gothic " +
                  (eraser ? "text-foreground" : "text-foreground/70")
                }
              >
                <Eraser size={14} /> 지우개
              </button>
              <button
                type="button"
                onClick={toggleEraseMenu}
                className="h-8 pr-2 pl-0.5 flex items-center text-foreground/70"
                aria-label="지우개 메뉴"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <span className="mx-0.5 h-5 w-px bg-border shrink-0" />

            {/* 굵기 — 표시선은 PEN_W_VIEW/HL_W_VIEW (실제 획 굵기와 별개) */}
            {(inkTool.tool === "pen" ? PEN_W_VIEW : HL_W_VIEW).map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectWidth(i)}
                className={
                  "h-7 w-8 rounded-md border border-border bg-card flex items-center justify-center shrink-0 " +
                  ((inkTool.tool === "pen" ? inkTool.penW : inkTool.hlW) === i ? "ring-2 ring-foreground" : "")
                }
                aria-label={"굵기 " + String(i + 1)}
              >
                <span
                  style={{
                    display: "block",
                    width: "1rem",
                    height: String(w) + "px",
                    borderRadius: "9999px",
                    background: inkTool.tool === "pen" ? inkTool.penColor : inkTool.hlColor,
                  }}
                />
              </button>
            ))}

            <span className="mx-0.5 h-5 w-px bg-border shrink-0" />
            <span className="ml-auto shrink-0" />

            <button
              type="button"
              onClick={undoInk}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground/70 active:bg-muted shrink-0"
              aria-label="되돌리기"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground/70 active:bg-muted shrink-0"
              aria-label={immersive ? "전체화면 끄기" : "전체화면"}
            >
              {immersive ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
            <button
              type="button"
              onClick={exitInkMode}
              className="h-8 px-3.5 rounded-full bg-primary text-white text-[0.6875rem] font-medium shrink-0"
            >
              완료
            </button>
          </div>

          {/* 2줄: 색 — 한 줄 고정.
              펜(14색)은 justify-between 으로 폭 전체에 퍼뜨리고, 형광펜(6색)은 왼쪽으로 모읍니다. */}
          <div
            className={
              "mt-1.5 flex flex-nowrap items-center overflow-x-auto px-1 -mx-1 py-1 -my-1 " +
              (inkTool.tool === "pen" ? "justify-between gap-1" : "justify-start gap-2")
            }
            style={{ scrollbarWidth: "none" }}
          >
            {(inkTool.tool === "pen" ? PEN_COLORS : HL_COLORS).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectColor(c)}
                className={
                  "w-6 h-6 rounded-full border border-black/10 shrink-0 " +
                  ((inkTool.tool === "pen" ? inkTool.penColor : inkTool.hlColor) === c && !eraser
                    ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                    : "")
                }
                style={{ background: c }}
                aria-label={"색 " + c}
              />
            ))}
          </div>

          {/* 리본(탭) — 접어도 화면에 남아 다시 펴는 손잡이가 됩니다.
              컨테이너 아래(top-full)에 매달려 있어, 컨테이너가 자기 높이만큼 올라가 숨으면
              이 리본만 헤더 아래로 삐죽 나와 보입니다. */}
          <button
            type="button"
            onClick={() => setBarHidden((v) => !v)}
            className="pointer-events-auto absolute right-3 top-full flex h-6 w-10 items-center justify-center rounded-b-lg border border-t-0 border-border bg-card shadow-sm text-foreground/60 active:bg-muted"
            aria-label={barHidden ? "도구막대 펴기" : "도구막대 접기"}
          >
            {barHidden ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      ) : null}

      {/* 지우개 메뉴 — 도구막대 1줄은 가로 스크롤(overflow-x-auto)이라 그 안의 드롭다운은 세로로 잘려
          보이지 않습니다. 그래서 도구막대 밖에서 fixed 로, 버튼 위치를 재어 띄웁니다. */}
      {inkMode && eraseMenu && menuPos ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEraseMenu(false)} />
          <div
            className="fixed z-50 min-w-[9rem] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
            style={{ left: String(menuPos.left) + "px", top: String(menuPos.top) + "px" }}
          >
            <button
              type="button"
              onClick={() => {
                setEraser(true);
                setEraseMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[0.6875rem] font-gothic text-foreground active:bg-muted"
            >
              <Eraser size={14} /> 획 지우개
            </button>
            <button
              type="button"
              onClick={clearAllInk}
              disabled={!hasInk}
              className="w-full flex items-center gap-2 border-t border-border px-3 py-2.5 text-[0.6875rem] font-gothic text-red-600 active:bg-muted disabled:opacity-40"
            >
              <Trash2 size={14} /> 전체 지우기
            </button>
          </div>
        </>
      ) : null}

      <div className="px-4 py-4 pb-24">
        {/* 날짜 + 글자 크기 (성경 읽기의 '위치 필 + 듣기' 자리와 같은 배치) */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <span className="inline-flex items-center min-w-0 font-gothic text-indigo-600 bg-indigo-500/10 rounded-full px-3 py-1 text-sm">
            <span className="truncate">{formatSermonDate(id)}</span>
          </span>
          <span className="ml-auto mr-14 shrink-0 flex items-center gap-2">
            {/* 필기가 있으면 잠급니다 — 글자 크기를 바꾸면 본문이 재배치되어 필기가 어긋나기 때문입니다.
                disabled 버튼은 클릭 이벤트를 아예 만들지 않아, 잠금 안내는 감싼 span 이 받습니다. */}
            <span onClick={warnFontLocked} className="inline-flex">
              <button
                type="button"
                onClick={() => changeFont(-1)}
                disabled={fontStep <= 0 || hasInk}
                className={
                  "w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30" +
                  (hasInk ? " pointer-events-none" : "")
                }
                aria-label="글자 작게"
              >
                <Minus size={16} />
              </button>
            </span>
            <span onClick={warnFontLocked} className="inline-flex">
              <button
                type="button"
                onClick={() => changeFont(1)}
                disabled={fontStep >= SCALE.length - 1 || hasInk}
                className={
                  "w-9 h-9 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30" +
                  (hasInk ? " pointer-events-none" : "")
                }
                aria-label="글자 크게"
              >
                <Plus size={16} />
              </button>
            </span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-16">
            <Loader2 size={16} className="animate-spin" /> 설교문을 불러오는 중...
          </div>
        ) : error || !rec ? (
          <div className="text-center py-16">
            <p className="text-sm font-gothic text-muted-foreground mb-3">
              설교문을 불러오지 못했어요
            </p>
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-indigo-500 text-white"
            >
              <RotateCcw size={13} /> 다시 시도
            </button>
          </div>
        ) : (
          <div ref={wrapRef} className="relative">
            <div style={{ fontSize: fontPx }}>{blocks.map(renderBlock)}</div>
            {/* 필기 층 — 포토샵 레이어처럼 본문 위에 얹습니다.
                읽기 모드에서는 pointer-events:none 이라 단어 탭·스크롤에 영향이 없습니다. */}
            <svg
              ref={svgRef}
              className="absolute inset-0 w-full pointer-events-none overflow-visible"
              style={inkH > 0 ? { height: String(inkH) + "px" } : undefined}
            >
              <defs>
                {/* 연필 질감 (실기기 시험으로 확정된 값 — 바꾸지 마세요) */}
                <filter
                  id="sermonPencil"
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.62"
                    numOctaves={2}
                    seed={5}
                    result="warp"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="warp"
                    scale={0.9}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="rough"
                  />
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="1.35"
                    numOctaves={3}
                    seed={17}
                    result="grit"
                  />
                  <feColorMatrix
                    in="grit"
                    type="matrix"
                    result="gritA"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.42 0 0 0 0.68"
                  />
                  <feComposite in="rough" in2="gritA" operator="in" />
                </filter>
              </defs>
              <g ref={strokesRef} />
            </svg>
            {inkMode ? (
              <div
                ref={surfaceRef}
                className="absolute inset-0"
                style={{
                  touchAction: "pan-y",
                  height: inkH > 0 ? String(inkH) + "px" : undefined,
                }}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* 빠른 이동 — 본문과 같은 폭에 붙여 넓은 화면에서도 본문 오른쪽에 옵니다 */}
      {!loading && !error && rec && !inkMode ? (
        <div className={"fixed inset-x-0 bottom-6 z-40 mx-auto " + widthClass + " pointer-events-none"}>
          <div className="flex flex-col items-end gap-2 pr-4">
            <button
              type="button"
              onClick={enterInkMode}
              className="pointer-events-auto w-11 h-11 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground/70 active:bg-muted"
              aria-label="필기"
            >
              <PenLine size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {popupWord && (
        <div className="fixed inset-0 z-50" onClick={closeSub}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className={"absolute bottom-0 left-0 right-0 " + widthClass + " mx-auto bg-card rounded-t-2xl px-5 pt-5 pb-7"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-lg font-bold text-gray-900 break-words min-w-0 font-word">{popupWord}</p>
              <button
                onClick={() => speak(popupWord, "id")}
                className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="발음 듣기"
              >
                <Volume2 size={15} />
              </button>
              <span className="flex-1" />
              <button
                onClick={closeSub}
                className="shrink-0 w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            {popupLoading ? (
              <div className="flex items-center gap-2 text-gray-400 mt-2 text-sm">
                <Loader2 size={15} className="animate-spin" /> 뜻을 찾고 있어요...
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-900 mt-1.5 break-words font-gothic">{popupMeaning}</p>
                {popupInfo && (
                  <p className="text-xs text-gray-500 mt-1 break-words font-gothic">{popupInfo}</p>
                )}
              </>
            )}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 min-w-0 flex items-stretch overflow-hidden rounded-full text-xs font-medium">
                <button
                  onClick={savePopupWord}
                  disabled={popupSaved || popupLoading || !popupMeaning || !saveTargetId}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 ${
                    popupSaved || !saveTargetId ? "bg-gray-100 text-gray-400" : "bg-primary text-white disabled:opacity-50"
                  }`}
                >
                  {popupSaved ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                  <span className="truncate">
                    {popupSaved ? "저장됨" : saveTargetId ? `${saveTargetName}에 담기` : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로 ⌄ 는 잠그지 않습니다 */}
                <button
                  onClick={(e) => { e.stopPropagation(); openPicker(); }}
                  title="담을 단어장 고르기"
                  className="shrink-0 flex items-center px-2.5 border-l border-white/30 bg-primary text-white"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              <button
                onClick={copyPopupWord}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-gray-700"
              >
                복사
              </button>
              <button
                onClick={openInDictionary}
                className="shrink-0 rounded-full py-2 px-3.5 text-xs font-medium bg-black/5 text-gray-700"
              >
                사전에서 보기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 담을 단어장 고르는 시트 — 팝업(z-50)보다 위에 오도록 한 단계 더 띄웁니다 */}
      <div className="relative z-[60]">
        <WordbookPickerSheet
          open={pickerOpen}
          onOpenChange={(o) => { if (!o) closePicker(); }}
          targetId={saveTargetId}
          onPick={chooseSaveTarget}
          onChanged={() => setSaveTargets(loadSaveTargets())}
        />
      </div>
    </div>
  );
};

export default SermonRead;
