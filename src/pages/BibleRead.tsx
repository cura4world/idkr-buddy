// src/pages/BibleRead.tsx
// 성경 읽기 — 장 단위 통독. 한 페이지 안에서 보기 방식을 고릅니다.
//   IN     인도네시아어(TB)만
//   한     한국어(새번역)만
//   IN·한  한 절씩 인니어 → 한국어로 번갈아
// 단어 탭·표현 찾기·낭독은 인도네시아어 본문에서만 동작합니다(한국어는 읽기 전용).
// 형광펜 3색은 본문을 끌어 고른 뒤 색을 누르면 어절 단위로 칠해지고,
// 장별로 IndexedDB("kata-bible-hl")에 남습니다.
// 마지막 읽던 위치는 localStorage("bible-last-pos"), 보기 방식은 "bible-view-mode".

import { useState, useEffect, useRef, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown,
  Loader2, RotateCcw, Volume2, X, Check, Plus, Minus, Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import { BIBLE_BOOKS, getBook, fetchChapter, fetchChapterKo, BibleVerse } from "@/lib/bible";
import { quickLookupWord } from "@/lib/story";
import { getLookupWord, saveLookupWord } from "@/lib/wordStore";
import { addWordIfAbsent, hasWordInCategory, isFailedMeaning, LOOKUP_FAIL_TEXT } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import { ttsPlayer } from "@/lib/tts";
import { bibleAudioPlayer } from "@/lib/bibleAudio";
import BibleDial from "@/components/BibleDial";
import BibleAudioButton from "@/components/BibleAudioButton";
import BibleAudioSeekBar from "@/components/BibleAudioSeekBar";
import {
  HlColor, ChapterHl, HL_RGB, HL_ORDER, hlStyle, loadChapterHl, saveChapterHl,
} from "@/lib/bibleHighlight";
import { ReadingTracker } from "@/lib/readingTimer";
import { writeReturnTicket, takeReturnTicket, currentScrollY, restoreScrollTo } from "@/lib/readReturn";
import PointFloat from "@/components/PointFloat";
import { cleanPhrase, useSelectedPhrase } from "@/lib/phraseSelect";
import PhraseFindBar from "@/components/PhraseFindBar";

const LAST_POS_KEY = "bible-last-pos";

// ---------- 보기 방식 ----------
// 예전에는 앞뒤로 뒤집는 카드였습니다. 뒤집기를 없앤 것은 한 페이지 안에서 셋 중
// 하나를 고르게 하기 위해서이고, 고른 방식은 기기에 남아 다음에도 그대로 열립니다.
type ViewMode = "id" | "ko" | "both";
const VIEW_KEY = "bible-view-mode";
const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "id", label: "TB" },
  { id: "ko", label: "새번역" },
  { id: "both", label: "TB-새번역" },
];

const loadViewMode = (): ViewMode => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "id" || v === "ko" || v === "both") return v;
  } catch (e) {}
  return "both";   // 처음 여는 사람은 두 본문이 함께 보이는 쪽이 기본입니다
};

const saveViewMode = (m: ViewMode) => {
  try { localStorage.setItem(VIEW_KEY, m); } catch (e) {}
};

// ---------- 글자 크기 (이 화면 전용) ----------
// 설교문 읽기와 같은 방식입니다. 다만 배율을 rem 으로 주므로
// 앱 전체 배율(fontScale.ts)에 이 배율이 곱해집니다. 본문 글자는 전부 em 입니다.
const FONT_KEY = "bible-font-step";
const SCALE = [0.85, 0.92, 1.0, 1.08, 1.16, 1.26, 1.36, 1.48, 1.60];

const loadFontStep = (): number => {
  try {
    const n = parseInt(localStorage.getItem(FONT_KEY) || "2", 10);
    if (isFinite(n) && n >= 0 && n < SCALE.length) return n;
  } catch (e) {}
  return 2;
};

const saveFontStep = (n: number) => {
  try {
    localStorage.setItem(FONT_KEY, String(n));
  } catch (e) {}
};

interface BiblePos {
  bookId: string;
  chapter: number;
}

const loadLastPos = (): BiblePos => {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.bookId === "string" && typeof p.chapter === "number" && getBook(p.bookId)) {
        return { bookId: p.bookId, chapter: p.chapter };
      }
    }
  } catch (e) {}
  return { bookId: "kejadian", chapter: 1 };
};

const saveLastPos = (pos: BiblePos) => {
  try { localStorage.setItem(LAST_POS_KEY, JSON.stringify(pos)); } catch (e) {}
};

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

const BibleRead = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { widthClass, canWide, wide, toggle } = useWideMode();

  // ---------- 위치 / 본문 ----------
  const [pos, setPos] = useState<BiblePos>(loadLastPos);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);     // 앞면 TB
  const [versesKo, setVersesKo] = useState<BibleVerse[] | null>(null); // 뒷면 새번역
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [koError, setKoError] = useState(false);
  const [mode, setMode] = useState<ViewMode>(loadViewMode);

  const showId = mode !== "ko";
  const showKo = mode !== "id";
  const chapterKey = pos.bookId + ":" + pos.chapter;

  // ---------- 형광펜 ----------
  const [hl, setHl] = useState<ChapterHl>({});
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // 고른 토큰 열쇠는 selectionchange 에서 미리 잡아 둡니다 —
  // 폰에서는 색 단추를 누르는 순간 이미 선택이 풀려 있어 그때 읽으면 늦습니다.
  const selKeysRef = useRef<string[]>([]);
  const selAtRef = useRef(0);
  const [hasSel, setHasSel] = useState(false);

  // ---------- 읽기 점수 (보이지 않는 타이머) ----------
  // 화면에는 아무 표시도 없고, 한국어 면을 처음 여는 순간에만 "+N"이 한 번 뜽니다.
  const trackerRef = useRef<ReadingTracker | null>(null);
  const [floatVal, setFloatVal] = useState(0);
  const [floatSeq, setFloatSeq] = useState(0);

  useEffect(() => {
    const t = new ReadingTracker((pt) => {
      setFloatVal(pt);
      setFloatSeq((n) => n + 1);
    });
    trackerRef.current = t;
    t.attach();
    return () => {
      t.dispose();
      trackerRef.current = null;
    };
  }, []);

  // 인니어가 보이는 동안만 초가 쌓이고, 한국어가 화면에 올라오면 해금됩니다.
  // (IN·한 은 한국어가 이미 같이 보이므로 그 자리에서 해금합니다)
  useEffect(() => {
    const t = trackerRef.current;
    if (!t) return;
    t.setSide(showId);
    if (showKo) t.koreanOpened();
  }, [mode, showId, showKo]);

  // ---------- 본문 글자 크기 ----------
  const [fontStep, setFontStep] = useState(loadFontStep);

  const changeFont = (delta: number) => {
    setFontStep((prev) => {
      const next = Math.max(0, Math.min(SCALE.length - 1, prev + delta));
      saveFontStep(next);
      return next;
    });
  };

  const bodyFontSize = SCALE[fontStep] + "rem";

  // ---------- 보기를 바꿔도 같은 절이 화면 같은 자리에 오도록 ----------
  //
  // 장이 길면 뜻을 보려고 한국어로 넘겼을 때 위치가 어긋나 다시 찾아야 했습니다.
  // 바꾸기 직전에 "지금 화면 맨 위에 걸린 절"과 그 절이 화면에서 몇 px에 있었는지를
  // 적어 두었다가, 바뀐 화면에서 같은 절을 같은 높이에 놓습니다.
  // 인니어·한국어 모두 절 번호를 그리므로 절 번호를 열쇠로 쓸 수 있습니다.

  // 머리글(제목 줄 + 도구 줄)이 화면에 계속 붙어 있으므로, 그 아래가 "화면 맨 위"입니다.
  // 높이를 숫자로 박아 두면 도구 줄이 바뀔 때마다 어긋나므로 실제 높이를 잽니다.
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const anchorLine = () => (stickyRef.current ? stickyRef.current.offsetHeight : 96) + 8;

  const verseRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const pendingAnchor = useRef<{ verse: number; offset: number; side: "id" | "ko" } | null>(null);

  // 화면 맨 위(헤더 바로 아래)에 걸려 있는 절을 찾습니다
  const anchorOf = (side: "id" | "ko") => {
    const line = anchorLine();
    let best: { verse: number; offset: number } | null = null;
    let firstTop: { verse: number; offset: number } | null = null;
    Object.keys(verseRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      const el = verseRefs.current[k];
      if (!el) return;
      const n = Number(k.slice(side.length + 1));
      if (!n) return;
      const top = el.getBoundingClientRect().top;
      // 기준선을 지난 절 중 가장 아래에 있는 것 = 지금 맨 위에 보이는 절
      if (top <= line && (!best || top > best.offset)) best = { verse: n, offset: top };
      // 아직 아무 절도 기준선을 안 지났을 때를 대비해 첫 절도 들고 있습니다
      if (!firstTop || n < firstTop.verse) firstTop = { verse: n, offset: top };
    });
    return best || firstTop;
  };

  // 반대쪽에서 같은 절을 찾습니다. 번역마다 절 나눔이 조금 다를 수 있어
  // 같은 번호가 없으면 그 위의 가장 가까운 절로 갑니다.
  const findVerseEl = (side: "id" | "ko", verse: number) => {
    const exact = verseRefs.current[side + "-" + verse];
    if (exact) return exact;
    let bestN = 0;
    Object.keys(verseRefs.current).forEach((k) => {
      if (!k.startsWith(side + "-")) return;
      if (!verseRefs.current[k]) return;
      const n = Number(k.slice(side.length + 1));
      if (n && n <= verse && n > bestN) bestN = n;
    });
    return bestN ? verseRefs.current[side + "-" + bestN] : null;
  };

  // 좌우 스와이프 뒤집기는 쓰지 않습니다 —
  // 형광펜 때문에 본문을 옆으로 끌어 고르는 동작이 늘어나 서로 부딪힙니다.
  const changeMode = (m: ViewMode) => {
    if (m === mode) return;
    const from: "id" | "ko" = showId ? "id" : "ko";
    const to: "id" | "ko" = m !== "ko" ? "id" : "ko";
    // anchorOf 안의 대입이 콜백에서 일어나 추론 타입이 좁아지므로 여기서 명시합니다
    const a = anchorOf(from) as { verse: number; offset: number } | null;
    pendingAnchor.current = a ? { verse: a.verse, offset: a.offset, side: to } : null;
    setMode(m);
    saveViewMode(m);
  };

  // 보기를 바꾼 뒤(또는 한국어 본문이 늦게 도착한 뒤) 적어둔 자리로 맞춥니다
  useEffect(() => {
    const a = pendingAnchor.current;
    if (!a) return;
    const el = findVerseEl(a.side, a.verse);
    if (!el) return; // 아직 안 그려졌으면 다음 렌더에서 다시 시도합니다
    pendingAnchor.current = null;
    const top = window.scrollY + el.getBoundingClientRect().top - a.offset;
    window.scrollTo({ top: Math.max(0, top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, verses, versesKo]);

  const loadToken = useRef(0);
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  const book = getBook(pos.bookId);

  // ---------- 책/장 선택 다이얼 (앞면 전용) ----------
  // 위치 필은 overflow-hidden 컨테이너 안에 있어 안쪽에 두면 잘립니다.
  // 그래서 다이얼은 fixed 로 띄우고, 열 때 필의 화면 좌표를 재서 넘깁니다.
  const bookPillRef = useRef<HTMLButtonElement | null>(null);
  const chapPillRef = useRef<HTMLButtonElement | null>(null);
  const [dialKind, setDialKind] = useState<"book" | "chapter" | null>(null);
  const [dialAnchor, setDialAnchor] = useState<{ left: number; top: number } | null>(null);

  // ---------- 뒤로가기 (시트/팝업만 한 단계 닫기) ----------
  const subOpenRef = useRef(false);
  // 히스토리를 실제로 쌓았는지 (사전으로 나갈 때 그 칸을 덮어쓸지 판단하는 데 씁니다)
  const subPushedRef = useRef(false);
  const pushSub = () => {
    if (!subOpenRef.current) {
      subOpenRef.current = true;
      try {
        window.history.pushState({ bibleSub: true }, "");
        subPushedRef.current = true;
      } catch (e) {
        subPushedRef.current = false;
      }
    }
  };
  const resetSub = () => {
    setDialKind(null);
    setPopupWord(null);
  };
  const closeSub = () => {
    if (subOpenRef.current) window.history.back();
    else resetSub();
  };
  // 다이얼 열기 — 필의 화면 좌표를 한 번 재서 넘깁니다.
  // 열려 있는 동안은 막이 화면을 덮어 본문이 스크롤되지 않으므로 다시 잴 필요가 없습니다.
  const openDial = (kind: "book" | "chapter", el: HTMLButtonElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDialAnchor({ left: r.left, top: r.bottom });
    setDialKind(kind);
    pushSub();
  };
  useEffect(() => {
    const onPop = () => {
      // 시트가 팝업 위에 떠 있으면 시트만 닫습니다 (팝업은 그대로).
      if (wbPickerOpenRef.current) {
        wbPickerOpenRef.current = false;
        wbPickerPushedRef.current = false;
        setWbPickerOpen(false);
        return;
      }
      if (subOpenRef.current) {
        subOpenRef.current = false;
        subPushedRef.current = false;
        resetSub();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // 페이지를 벗어나면 낭독도 함께 정지 (setState 없이 정리만)
      bibleAudioPlayer.stop();
      ttsPlayer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 돌아올 자리로 되돌리기 ----------
  // 마운트할 때 표를 집어 듭니다.
  // 보기 방식은 localStorage 에 남아 그대로 열리므로 표에서는 스크롤만 씁니다.
  const pendingReturnRef = useRef<{ y: number } | null>(null);
  const cancelRestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const t = takeReturnTicket("bible");
    if (t && t.key === pos.bookId + ":" + pos.chapter) {
      pendingReturnRef.current = { y: t.y };
    }
    return () => {
      if (cancelRestoreRef.current) cancelRestoreRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 지금 보기 방식이 쓰는 본문이 모두 도착한 뒤에 자리를 되돌립니다.
  // (IN·한 에서 한국어가 늦게 오면 높이가 늘어나 자리가 어긋납니다)
  useEffect(() => {
    const p = pendingReturnRef.current;
    if (!p || loading) return;
    if (showId && !verses) return;
    if (showKo && !versesKo && !koError) return;
    pendingReturnRef.current = null;
    cancelRestoreRef.current = restoreScrollTo(p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, verses, versesKo, koError, mode]);

  // ---------- 장 로드 ----------
  const loadChapter = async (p: BiblePos) => {
    const token = ++loadToken.current;
    setLoading(true);
    setError(false);
    setKoError(false);
    setVerses(null);
    setVersesKo(null);
    // 보기 방식은 장을 옮겨도 그대로 둡니다 (예전 뒤집기와 다른 점)
    const key = p.bookId + ":" + p.chapter;
    trackerRef.current?.setUnit(key);
    // setUnit 이 해금을 되돌리므로 지금 보기 방식을 다시 알려 줍니다
    trackerRef.current?.setSide(mode !== "ko");
    if (mode !== "id") trackerRef.current?.koreanOpened();
    // 장을 옮기면 맨 위부터 읽으므로 이전 장의 절 위치는 버립니다
    verseRefs.current = {};
    pendingAnchor.current = null;
    selKeysRef.current = [];
    selAtRef.current = 0;
    setHasSel(false);
    setHl({});
    loadChapterHl(key)
      .then((m) => { if (loadToken.current === token) setHl(m); })
      .catch(() => {});
    ttsPlayer.stop();
    bibleAudioPlayer.stop();
    try {
      const tb = await fetchChapter(p.bookId, p.chapter);
      if (loadToken.current !== token) return;
      setVerses(tb);
      saveLastPos(p);
    } catch (e) {
      if (loadToken.current !== token) return;
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(false);
    // 한국어(새번역)는 뒷면용으로 백그라운드 로드 (실패해도 앞면은 정상)
    fetchChapterKo(p.bookId, p.chapter)
      .then((ko) => { if (loadToken.current === token) setVersesKo(ko); })
      .catch(() => { if (loadToken.current === token) setKoError(true); });
  };

  useEffect(() => {
    loadChapter(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.bookId, pos.chapter]);

  const goChapter = (delta: number) => {
    if (!book) return;
    const next = pos.chapter + delta;
    if (next >= 1 && next <= book.chapters) {
      setPos({ bookId: pos.bookId, chapter: next });
      scrollTopRef.current?.scrollIntoView?.();
      return;
    }
    // 책 경계를 넘어가면 이전/다음 책으로
    const idx = BIBLE_BOOKS.findIndex((b) => b.id === pos.bookId);
    if (delta > 0 && idx < BIBLE_BOOKS.length - 1) {
      setPos({ bookId: BIBLE_BOOKS[idx + 1].id, chapter: 1 });
      scrollTopRef.current?.scrollIntoView?.();
    } else if (delta < 0 && idx > 0) {
      const prev = BIBLE_BOOKS[idx - 1];
      setPos({ bookId: prev.id, chapter: prev.chapters });
      scrollTopRef.current?.scrollIntoView?.();
    }
  };

  // ---------- 단어 탭 → 미니 팝업 (묵상과 동일한 3단 캐시) ----------
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupSentence, setPopupSentence] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupMeaning, setPopupMeaning] = useState("");
  const [popupInfo, setPopupInfo] = useState("");
  const [popupSentenceKo, setPopupSentenceKo] = useState("");
  const [popupSaved, setPopupSaved] = useState(false);
  const popupReqId = useRef(0);
  const wordCache = useRef(new Map<string, { meaning: string; info: string; sentenceKo: string }>());

  // ---- 담을 단어장 (사전에서 고른 대상을 앱 전체가 함께 씁니다) ----
  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [wbPickerOpen, setWbPickerOpen] = useState(false);
  const wbPickerOpenRef = useRef(false);
  const wbPickerPushedRef = useRef(false);
  const saveTargetName = (saveTargets.find((c) => c.id === saveTargetId) || { name: "" }).name;

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    saveSaveTargetId(id);
  };

  // 시트는 히스토리를 한 칸 더 쌓습니다 — 뒤로가기를 누르면 시트만 닫히고 팝업은 남습니다.
  const openWbPicker = () => {
    if (wbPickerOpenRef.current) return;
    setSaveTargets(loadSaveTargets());
    setWbPickerOpen(true);
    wbPickerOpenRef.current = true;
    try {
      window.history.pushState({ wordbookPicker: true }, "");
      wbPickerPushedRef.current = true;
    } catch (e) {
      wbPickerPushedRef.current = false;
    }
  };

  const closeWbPicker = () => {
    if (!wbPickerOpenRef.current) return;
    if (wbPickerPushedRef.current) {
      wbPickerPushedRef.current = false;
      // wbPickerOpenRef 는 여기서 내리지 않습니다 — popstate 핸들러가 이것을 보고 닫습니다.
      try { window.history.back(); return; } catch (e) {}
    }
    wbPickerOpenRef.current = false;
    setWbPickerOpen(false);
  };

  // 대상이 바뀌면 그 단어장 기준으로 담김 여부를 다시 판정합니다.
  useEffect(() => {
    if (!popupWord || !saveTargetId) {
      setPopupSaved(false);
      return;
    }
    setPopupSaved(hasWordInCategory(saveTargetId, popupWord));
  }, [popupWord, saveTargetId]);

  // 본문에서 고른 표현 찾기
  const { phrase: selPhrase, take: takeSelPhrase } = useSelectedPhrase();

  // ---------- 형광펜: 고른 범위에 걸친 어절 모으기 ----------
  //
  // 문단(data-hlp)을 먼저 걸러 내고 그 안의 어절(data-hlk)만 잽니다.
  // 한 장이 1,000어절이 넘는 곳(시편 119편)이 있어 전부 재면 손끝이 무거워집니다.
  // 경계에 살짝 닿기만 한 어절은 빼려고 intersectsNode 대신 경계점을 비교합니다.
  const collectSelectedKeys = (): string[] => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
      const range = sel.getRangeAt(0);
      const root = bodyRef.current;
      if (!root) return [];
      const out: string[] = [];
      const probe = document.createRange();
      const overlaps = (el: Element): boolean => {
        probe.selectNodeContents(el);
        // 고른 범위의 시작이 이 요소의 끝보다 뒤 → 겹치지 않음
        if (range.compareBoundaryPoints(Range.END_TO_START, probe) >= 0) return false;
        // 고른 범위의 끝이 이 요소의 시작보다 앞 → 겹치지 않음
        if (range.compareBoundaryPoints(Range.START_TO_END, probe) <= 0) return false;
        return true;
      };
      const paras = root.querySelectorAll("[data-hlp]");
      for (let i = 0; i < paras.length; i++) {
        if (!overlaps(paras[i])) continue;
        const toks = paras[i].querySelectorAll("[data-hlk]");
        for (let j = 0; j < toks.length; j++) {
          if (!overlaps(toks[j])) continue;
          const k = (toks[j] as HTMLElement).dataset.hlk;
          if (k) out.push(k);
        }
      }
      return out;
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    let timer = 0;
    const onSel = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const keys = collectSelectedKeys();
        // 고른 것이 없어졌다고 해서 열쇠를 곧바로 버리지 않습니다 —
        // 색 단추를 누르는 순간 웹뷰가 먼저 선택을 풀어 버리는 기기가 있습니다.
        // 그래서 마지막으로 고른 것을 4초 동안 들고 있습니다(applyHl).
        if (keys.length > 0) {
          selKeysRef.current = keys;
          selAtRef.current = Date.now();
          setHasSel(true);
        } else {
          setHasSel(false);
        }
      }, 180);
    };
    document.addEventListener("selectionchange", onSel);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 색 단추·쓰레기통이 함께 쓰는 문지기.
  // 고른 것이 없거나 너무 오래됐으면 안내만 하고 null 을 돌려줍니다.
  const takeSelKeys = (): string[] | null => {
    const keys = selKeysRef.current;
    if (keys.length === 0 || Date.now() - selAtRef.current > 4000) {
      toast("본문을 끌어 고른 뒤 눌러 주세요");
      return null;
    }
    return keys;
  };

  const finishHl = (next: ChapterHl) => {
    setHl(next);
    saveChapterHl(chapterKey, next).catch(() => {});
    trackerRef.current?.touch();
    try {
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    } catch (e) {}
    selKeysRef.current = [];
    selAtRef.current = 0;
    setHasSel(false);
  };

  // 색을 누르면 칠합니다. 고른 곳이 이미 전부 그 색이면 지웁니다(같은 색 다시 누르기).
  const applyHl = (c: HlColor) => {
    const keys = takeSelKeys();
    if (!keys) return;
    const erase = keys.every((k) => hl[k] === c);
    const next: ChapterHl = { ...hl };
    keys.forEach((k) => {
      if (erase) delete next[k];
      else next[k] = c;
    });
    finishHl(next);
  };

  // 쓰레기통 — 고른 범위 안의 형광펜을 색에 상관없이 모두 지웁니다.
  const eraseHl = () => {
    const keys = takeSelKeys();
    if (!keys) return;
    const hit = keys.filter((k) => hl[k]);
    if (hit.length === 0) {
      toast("고른 곳에는 형광펜이 없어요");
      return;
    }
    const next: ChapterHl = { ...hl };
    hit.forEach((k) => { delete next[k]; });
    finishHl(next);
  };

  const openPhrasePopup = () => {
    const s = takeSelPhrase();
    if (!s.phrase) return;
    openWordPopup(s.phrase, s.sentence);
  };

  const openWordPopup = async (rawToken: string, sentence: string) => {
    // 글자를 고르는 중이면 팝업을 열지 않습니다
    // (선택을 끝내며 나는 탭이 단어 팝업을 잘못 여는 것을 막습니다)
    const liveSel = window.getSelection();
    if (liveSel && !liveSel.isCollapsed) return;
    trackerRef.current?.touch();
    const word = cleanPhrase(rawToken);
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
      const rec = { meaning: stored.meaning, info: stored.info, sentenceKo: "" };
      wordCache.current.set(key, rec);
      setPopupMeaning(rec.meaning);
      setPopupInfo(rec.info);
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
        if (popupReqId.current === reqId) setPopupMeaning(LOOKUP_FAIL_TEXT);
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
    // 돌아올 자리를 표로 한 장 적어 둡니다 (스크롤 + 보고 있던 면)
    writeReturnTicket("bible", chapterKey, currentScrollY(), mode === "ko");
    // 단어 팝업이 쌓아 둔 히스토리 한 칸을 사전 화면으로 덮어씁니다.
    // 그래야 사전에서 뒤로가기 한 번에 성경 읽기로 돌아옵니다.
    // (pushState 가 실패해 쌓인 칸이 없으면 덮어쓰면 안 됩니다 — 성경 칸 자체가 사라집니다)
    navigate(
      "/dictionary?q=" + encodeURIComponent(popupWord) + "&from=bible",
      { replace: subPushedRef.current }
    );
  };

  const savePopupWord = () => {
    if (!popupWord || popupSaved || popupLoading || !popupMeaning || isFailedMeaning(popupMeaning) || !saveTargetId) return;
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

  // ---------- 렌더 도우미 ----------
  //
  // 어절마다 span 을 하나씩 그립니다. data-hlk 는 형광펜 열쇠(칸 이름)이고,
  // data-idw 는 "인니어 본문"이라는 표시입니다 — 표현 찾기가 이것으로 본문을 가립니다.
  // 한국어 본문에는 data-idw 를 붙이지 않으므로 탭·표현 찾기가 걸리지 않습니다.
  // 어절 뒤의 공백을 같은 span 안에 두어야 칠한 곳이 끊기지 않고 이어집니다.
  const renderTokens = (
    text: string,
    keyPrefix: string,
    side: string,
    verse: number,
    tappable: boolean,
  ) =>
    text.split(" ").map((tok, ti) => {
      const hk = side + ":" + verse + ":" + ti;
      const c = hl[hk];
      return (
        <span
          key={keyPrefix + ti}
          data-hlk={hk}
          {...(tappable ? { "data-idw": "1" } : {})}
          style={c ? hlStyle(c) : undefined}
        >
          {tappable ? (
            <span
              onClick={(e) => { e.stopPropagation(); openWordPopup(tok, text); }}
              className="cursor-pointer rounded active:bg-sky-500/20"
            >
              {tok}
            </span>
          ) : (
            tok
          )}{" "}
        </span>
      );
    });

  // 표제(시편 머리말)는 절번호 없이 1절 위에 한 줄로 얹습니다.
  // 하박국 3:1처럼 절 전체가 표제인 곳은 본문이 비어 절 문단을 그리지 않습니다.
  const renderTbVerse = (v: BibleVerse) => (
    <Fragment key={v.verse}>
      {v.intro ? (
        <p data-hlp="1" className="mb-2 text-[0.82em] leading-snug font-word italic text-gray-500">
          {renderTokens(v.intro, "bs" + v.verse + "-", "idi", v.verse, true)}
        </p>
      ) : null}
      {v.text ? (
        <p
          data-hlp="1"
          ref={(el) => { verseRefs.current["id-" + v.verse] = el; }}
          className="mb-2 text-[1em] leading-relaxed font-word text-gray-900"
        >
          <span className="text-sky-500/70 text-[0.75em] align-super mr-1 select-none">{v.verse}</span>
          {renderTokens(v.text, "b" + v.verse + "-", "id", v.verse, true)}
        </p>
      ) : null}
    </Fragment>
  );

  const renderKoVerse = (v: BibleVerse) => (
    <p
      key={"k" + v.verse}
      data-hlp="1"
      ref={(el) => { verseRefs.current["ko-" + v.verse] = el; }}
      className={
        "text-[0.875em] leading-relaxed font-gothic " +
        (mode === "both" ? "mb-4 text-gray-600" : "mb-2 text-gray-800")
      }
    >
      <span className="text-sky-500/70 text-[0.75em] align-super mr-1 select-none">{v.verse}</span>
      {renderTokens(v.text, "k" + v.verse + "-", "ko", v.verse, false)}
    </p>
  );

  // IN·한 은 절 번호를 열쇠로 짝을 맞춥니다. 번역마다 절 나눔이 조금 달라
  // 한쪽에만 있는 번호가 생길 수 있으므로 두 목록의 합집합을 순서대로 돕니다.
  const renderBoth = () => {
    const tbMap: Record<number, BibleVerse> = {};
    const koMap: Record<number, BibleVerse> = {};
    const nums: number[] = [];
    (verses || []).forEach((v) => {
      tbMap[v.verse] = v;
      if (nums.indexOf(v.verse) < 0) nums.push(v.verse);
    });
    (versesKo || []).forEach((v) => {
      koMap[v.verse] = v;
      if (nums.indexOf(v.verse) < 0) nums.push(v.verse);
    });
    nums.sort((a, b) => a - b);
    return nums.map((n) => (
      <Fragment key={"p" + n}>
        {tbMap[n] ? renderTbVerse(tbMap[n]) : null}
        {koMap[n] ? renderKoVerse(koMap[n]) : null}
      </Fragment>
    ));
  };

  // 위치 필 라벨: 한국어만 볼 때는 한국어 책이름("룻기"), 그 밖에는 인니어("RUT")
  const bookLabel = book ? (mode === "ko" ? book.ko : book.idName.toUpperCase()) : "";

  // ---------- 화면 ----------
  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <div ref={scrollTopRef} />
      <PointFloat value={floatVal} seq={floatSeq} />
      <div
        ref={stickyRef}
        className="sticky top-0 z-30 bg-background text-foreground border-b border-border"
      >
        {/* 제목 줄 — 책·장 선택은 오른쪽 끝에 붙입니다 */}
        <div className="px-4 pt-1.5 pb-1 flex items-center gap-2">
          <button
            onClick={() => goBackOr(navigate, location.key, "/devotion")}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="shrink-0 font-gothic text-base font-semibold uppercase tracking-[0.08em]">ALKITAB</h1>
          <span className="ml-auto min-w-0 flex items-center gap-1.5">
            <button
              ref={bookPillRef}
              onClick={() => openDial("book", bookPillRef.current)}
              className="inline-flex items-center min-w-0 font-bold text-sky-600 bg-sky-500/10 rounded-full px-3.5 py-1 text-sm"
            >
              <span className="truncate">{bookLabel}</span>
            </button>
            <button
              ref={chapPillRef}
              onClick={() => openDial("chapter", chapPillRef.current)}
              className="shrink-0 font-bold text-sky-600 bg-sky-500/10 rounded-full px-3.5 py-1 text-sm"
            >
              {pos.chapter}
            </button>
          </span>
          {canWide ? (
            <button
              type="button"
              onClick={toggle}
              className="shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground active:text-foreground"
              title={wide ? "원래 크기로" : "넓게 보기"}
              aria-label={wide ? "원래 크기로" : "넓게 보기"}
            >
              {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          ) : null}
        </div>

        {/* 도구 줄 — 보기 방식 · 형광펜 · 지우기 · 글자 크기 · 듣기 */}
        {/* 재생 중에는 낭독 조작이 넓어지므로 줄을 넘기지 않고 옆으로 밀리게 둡니다 */}
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeMode(m.id)}
              className={
                "shrink-0 h-7 px-3 rounded-full border font-gothic text-[0.6875rem] " +
                (mode === m.id
                  ? "bg-sky-500 border-sky-500 text-white font-bold"
                  : "border-border text-gray-600 active:bg-muted")
              }
            >
              {m.label}
            </button>
          ))}

          <span className="ml-auto shrink-0 flex items-center gap-1">
            {/* 형광펜 — 고른 곳이 없으면 흐리게 두어 "먼저 고르라"는 뜻을 보입니다 */}
            {HL_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyHl(c)}
                className={
                  "w-6 h-6 rounded-full border transition-opacity " +
                  (hasSel ? "border-gray-400" : "border-gray-200 opacity-40")
                }
                style={{ backgroundColor: "rgb(" + HL_RGB[c] + ")" }}
                aria-label="형광펜"
                title="고른 부분 칠하기 (같은 색을 다시 누르면 지워집니다)"
              />
            ))}
            <button
              type="button"
              onClick={eraseHl}
              className={
                "w-6 h-6 rounded-full border flex items-center justify-center transition-opacity " +
                (hasSel ? "border-gray-400 text-gray-600" : "border-gray-200 text-gray-400 opacity-40")
              }
              aria-label="형광펜 지우기"
              title="고른 부분의 형광펜 모두 지우기"
            >
              <Trash2 size={13} />
            </button>
            <span className="w-1" />
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={fontStep <= 0}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="글자 작게"
              title="글자 작게"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={fontStep >= SCALE.length - 1}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/80 active:bg-muted disabled:opacity-30"
              aria-label="글자 크게"
              title="글자 크게"
            >
              <Plus size={13} />
            </button>
            {/* 낭독은 인도네시아어 본문에만 있습니다 (새번역만 볼 때는 숨깁니다) */}
            {showId && !loading && !error && verses && verses.length > 0 ? (
              <BibleAudioButton bookId={pos.bookId} chapter={pos.chapter} label="" />
            ) : null}
          </span>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="-mx-4 bg-card border-y border-border/60 overflow-hidden px-4 py-4">
              {/* 낭독 시크바 — 재생 중이 아니면 컴포넌트가 null을 반환합니다 */}
              {showId && <BibleAudioSeekBar bookId={pos.bookId} chapter={pos.chapter} />}

              {/* 본문 */}
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" /> 본문을 불러오는 중...
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 font-gothic mb-3">본문을 불러오지 못했어요</p>
                  <button
                    onClick={() => loadChapter(pos)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white"
                  >
                    <RotateCcw size={13} /> 다시 시도
                  </button>
                </div>
              ) : (
                <div ref={bodyRef} style={{ fontSize: bodyFontSize }}>
                  {mode === "id" ? (verses || []).map(renderTbVerse) : null}
                  {mode === "both" ? renderBoth() : null}
                  {mode === "ko" && versesKo ? versesKo.map(renderKoVerse) : null}

                  {/* 한국어가 필요한 보기인데 아직 못 받은 경우 */}
                  {showKo && !versesKo ? (
                    koError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-600 font-gothic mb-3">한국어 본문을 불러오지 못했어요</p>
                        <button
                          onClick={() => loadChapter(pos)}
                          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white"
                        >
                          <RotateCcw size={13} /> 다시 시도
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                        <Loader2 size={16} className="animate-spin" /> 한국어 본문을 불러오는 중...
                      </div>
                    )
                  ) : null}

                  <p className="mt-5 text-[0.625rem] text-gray-400 font-gothic text-right leading-relaxed">
                    {showId ? (
                      <>
                        Alkitab Terjemahan Baru (TB)
                        <br />
                        Lembaga Alkitab Indonesia
                      </>
                    ) : null}
                    {showId && showKo ? <br /> : null}
                    {showKo ? "성경전서 새번역 · 대한성서공회" : null}
                  </p>
                </div>
              )}
        </div>
        <p className="text-center text-muted-foreground text-xs mt-3">
          {showId
            ? "단어를 탭하면 뜻, 본문을 끌어 고른 뒤 색을 누르면 형광펜"
            : "본문을 끌어 고른 뒤 색을 누르면 형광펜 (단어 뜻·듣기는 IN 보기에서)"}
        </p>

        {/* 이전 장 / 다음 장 */}
        {!loading && !error && book && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => goChapter(-1)}
              disabled={pos.chapter <= 1 && BIBLE_BOOKS[0].id === pos.bookId}
              className="flex-1 flex items-center justify-center gap-1 rounded-full py-2.5 text-xs font-medium bg-card border border-border/60 text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> 이전 장
            </button>
            <button
              onClick={() => goChapter(1)}
              disabled={pos.chapter >= book.chapters && BIBLE_BOOKS[BIBLE_BOOKS.length - 1].id === pos.bookId}
              className="flex-1 flex items-center justify-center gap-1 rounded-full py-2.5 text-xs font-medium bg-card border border-border/60 text-gray-700 disabled:opacity-30"
            >
              다음 장 <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 책/장 선택 다이얼 */}
      <BibleDial
        open={dialKind !== null}
        kind={dialKind === "chapter" ? "chapter" : "book"}
        anchor={dialAnchor}
        currentBookId={pos.bookId}
        currentChapter={pos.chapter}
        onClose={closeSub}
        onSelect={(bookId, chapter) => {
          setPos({ bookId, chapter });
          closeSub();
          scrollTopRef.current?.scrollIntoView?.();
        }}
      />

      {/* 단어 미니 팝업 */}
      <PhraseFindBar phrase={selPhrase} onFind={openPhrasePopup} hidden={!!popupWord} widthClass={widthClass} />
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
                  disabled={popupSaved || popupLoading || !popupMeaning || isFailedMeaning(popupMeaning) || !saveTargetId}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 ${
                    popupSaved || !saveTargetId ? "bg-gray-100 text-gray-400" : "bg-primary text-white disabled:opacity-50"
                  }`}
                >
                  {popupSaved ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                  <span className="truncate">
                    {popupSaved ? "저장됨" : saveTargetId ? saveTargetName : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로 ⌄ 는 잠그지 않습니다 */}
                <button
                  onClick={(e) => { e.stopPropagation(); openWbPicker(); }}
                  title="담을 단어장 고르기"
                  className={`shrink-0 flex items-center px-2.5 border-l ${
                    popupSaved || !saveTargetId
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-white/30 bg-primary text-white"
                  }`}
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
          open={wbPickerOpen}
          onOpenChange={(o) => { if (!o) closeWbPicker(); }}
          targetId={saveTargetId}
          onPick={chooseSaveTarget}
          onChanged={() => setSaveTargets(loadSaveTargets())}
        />
      </div>
    </div>
  );
};

export default BibleRead;
