import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, takePurgedFailedWords } from "@/lib/store";
import { getBook } from "@/lib/bible";
import {
  PHRASE_KINDS,
  PhraseKind,
  Phrase,
  loadKinds,
  saveKinds,
  loadSavedPhrase,
  phraseIsStale,
  msUntilNextDay,
  takePhrase,
  prefetchNextPhrase,
  clearNextPhrase,
  phraseToQuery,
} from "@/lib/peribahasa";
import SettingsDialog, { REOPEN_SETTINGS_KEY } from "@/components/SettingsDialog";
import MedaliBadge from "@/components/MedaliBadge";
import MedaliNudge from "@/components/MedaliNudge";
import MedaliSheet from "@/components/MedaliSheet";
import MedaliIdDialog from "@/components/MedaliIdDialog";
import { needsMedaliId, syncMedali } from "@/lib/medaliSync";
import { getEdition, takeRevokedNotice } from "@/lib/access";
import { isStoreApp } from "@/lib/platform";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import {
  RotateCcw,
  SlidersHorizontal,
  Bookmark,
  Check,
  Settings,
  Search,
  Mic,
  Star,
  Library,
  BookOpen,
  Heart,
  Newspaper,
  ScrollText,
  Compass,
  ChevronRight,
  BookMarked,
  MessagesSquare,
  Gamepad2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";
const BIBLE_LAST_POS_KEY = "bible-last-pos";

// 사전 화면(Dictionary.tsx)이 저장하는 최근 검색어를 읽기만 합니다. 쓰기는 사전 쪽에서만 합니다.
const DICT_HISTORY_KEY = "dict-search-history";
const HOME_HISTORY_MAX = 10;

function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(DICT_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string" && x.trim() !== "").slice(0, HOME_HISTORY_MAX);
  } catch (e) {
    return [];
  }
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* 해뜨는 모양 (lucide Sunrise에는 위쪽 화살표가 있어 직접 그립니다) */
const SunriseIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true"
  >
    <path d="M12 2v3M4.9 6.9l2.1 2.1M2 14h3M19 14h3M17 9l2.1-2.1" />
    <path d="M8 14a4 4 0 0 1 8 0" />
    <path d="M3 18h18M5 21h14" />
  </svg>
);

type IconComp = LucideIcon | ((p: { size?: number; className?: string }) => React.ReactElement);

type RowProps = {
  icon: IconComp;
  title: string;
  sub: string;
  meta?: string;
  onClick: () => void;
  last?: boolean;
};

const Row = ({ icon: Icon, title, sub, meta, onClick, last }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
      (last ? "" : "border-b border-border")
    }
  >
    <Icon size={20} className="text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[0.9375rem] leading-tight text-foreground truncate">{title}</p>
      <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">{sub}</p>
    </div>
    {meta ? (
      <span className="shrink-0 max-w-[46%] truncate pl-2.5 font-word text-[0.78125rem] text-muted-foreground">
        {meta}
      </span>
    ) : null}
    <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2.5 px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    {children}
  </p>
);

/* ── 공개판(스토어 앱) 홈 — 시안 H5(무료) · H6(Plus·Special Member·관리자) ─────────── */

const H_DEEP = "#104B60";
const H_LINE = "#E3E8EB";
const H_LOCK = "#8F7E4E";
const hrem = (px: number) => px / 16 + "rem";

// 문장 종류 꼬리표 (홈 카드 제목 옆)
const KIND_TAG: Record<string, string> = {
  peribahasa: "속담",
  ungkapan: "관용구",
  alkitab: "성경",
  kosakataku: "내 단어장",
  kosakata: "단어장",
  percakapan: "회화",
};

// 무료 사용자의 "다른 문장" 은 하루 한 번 (결정 문서 무료와 Plus 표)
const FREE_PHRASE_DAY_KEY = "kata-free-phrase-refresh-day";
function localDay(): string {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

// 잠긴 메뉴를 누르면 그 자리에서 피어오르는 안내 (시안 H5 의 안개 말풍선)
const FOG_CSS =
  "@keyframes kataFog{0%{opacity:0;transform:translate(-50%,4px) scale(.98);filter:blur(6px)}" +
  "18%{opacity:1;transform:translate(-50%,-6px) scale(1);filter:blur(0)}" +
  "62%{opacity:1;transform:translate(-50%,-14px) scale(1);filter:blur(0)}" +
  "100%{opacity:0;transform:translate(-50%,-36px) scale(1.03);filter:blur(8px)}}" +
  ".kata-fog{animation:kataFog 2.4s ease-out forwards}";

// 잠긴 메뉴: 안내가 다 떠오른 뒤 구독 화면으로 넘어갑니다
const LOCK_NAV_DELAY_MS = 700;

const FLOWER_PETAL = "M0 0 C8 -6 12 -18 5 -24 C-1 -22 -4 -10 0 0 Z";

const LockMark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={H_LOCK} strokeWidth="2"
    strokeLinecap="round" aria-hidden="true" className="shrink-0">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const ChevronMark = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B5BCC1" strokeWidth="2"
    aria-hidden="true" className="shrink-0">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

type PubRowProps = {
  tileBg: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  locked: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  last?: boolean;
};

const PubRow = ({ tileBg, icon, title, sub, locked, onClick, last }: PubRowProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={locked ? title + ", Plus 회원 기능" : undefined}
    className="w-full flex items-center text-left active:bg-black/[0.03] transition-colors"
    style={{ gap: 12, padding: "12px 16px", borderBottom: last ? "0" : "1px solid " + H_LINE }}
  >
    <span
      className="shrink-0 flex items-center justify-center"
      style={{ width: 32, height: 32, borderRadius: 9, background: tileBg }}
    >
      {icon}
    </span>
    <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
      <span className="truncate" style={{ fontSize: hrem(15) }}>{title}</span>
      <span className="font-word truncate" style={{ fontSize: hrem(11.5), color: "#646C72" }}>{sub}</span>
    </span>
    {locked ? <LockMark /> : <ChevronMark />}
  </button>
);

const tileIcon = (stroke: string, children: React.ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Index = () => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 설정 창에서 다른 화면(회원키 관리)으로 갔다가 뒤로 돌아오면 설정 창을 다시 엽니다.
  // 설정 창은 화면(라우트)이 아니라 메인 위에 뜬 창이라, 표시가 없으면 메인만 보입니다.
  // 표시는 SettingsDialog 가 나갈 때 남기고, 다시 열릴 때 지웁니다.
  useEffect(() => {
    // 공개판은 설정이 "내 정보" 탭에 있어 그 화면이 이 표시를 받습니다(MyInfo.tsx)
    if (isStoreApp()) return;
    try {
      const at = Number(sessionStorage.getItem(REOPEN_SETTINGS_KEY) || "0");
      if (at > 0 && Date.now() - at < 30 * 60 * 1000) setSettingsOpen(true);
      else if (at > 0) sessionStorage.removeItem(REOPEN_SETTINGS_KEY);
    } catch (e) {}
  }, []);

  // 짝꿍 비교용 아이디. 없으면 첫 진입에 닫을 수 없는 팝업이 떠서 받습니다.
  // 태블릿·세컨폰처럼 "사용 안 함"을 고른 기기는 다시 묻지 않습니다.
  const [needId, setNeedId] = useState(false);
  useEffect(() => {
    if (needsMedaliId()) {
      setNeedId(true);
      return;
    }
    // 아이디가 있으면 기기끼리 점수를 맞춥니다 (받기 → 재계산 → 올리기, 5분에 한 번)
    syncMedali().catch(() => {});

    // 밖에서 오프라인으로 쓰다가 Wi-Fi에 붙는 경우가 있어, 화면이 다시 보일 때도 맞춥니다.
    const onShow = () => {
      try {
        if (document.visibilityState === "visible") syncMedali().catch(() => {});
      } catch {}
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  // 훈장 팝업 — 폰의 뒤로가기로 팝업만 닫히게 히스토리를 한 칸 쌓습니다.
  // (옵션 시트·검색 기록과 같은 방식. 각 리스너가 자기 ref만 보므로 서로 간섭하지 않습니다.)
  const [medaliOpen, setMedaliOpen] = useState(false);
  const medaliOpenRef = useRef(false);
  const medaliPushedRef = useRef(false);

  const openMedali = () => {
    if (medaliOpenRef.current) return;
    setMedaliOpen(true);
    medaliOpenRef.current = true;
    try {
      window.history.pushState({ medaliSheet: true }, "");
      medaliPushedRef.current = true;
    } catch (e) {
      medaliPushedRef.current = false;
    }
  };

  const closeMedali = () => {
    if (!medaliOpenRef.current) return;
    medaliOpenRef.current = false;
    setMedaliOpen(false);
    if (medaliPushedRef.current) {
      medaliPushedRef.current = false;
      try { window.history.back(); } catch (e) {}
    }
  };

  useEffect(() => {
    const onPopMedali = () => {
      if (medaliOpenRef.current) {
        medaliOpenRef.current = false;
        medaliPushedRef.current = false;
        setMedaliOpen(false);
      }
    };
    window.addEventListener("popstate", onPopMedali);
    return () => window.removeEventListener("popstate", onPopMedali);
  }, []);
  const [kinds, setKinds] = useState<PhraseKind[]>(() => loadKinds());
  const [phrase, setPhrase] = useState<Phrase | null>(() => loadSavedPhrase());
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [kindSheetOpen, setKindSheetOpen] = useState(false);
  const sheetOpenRef = useRef(false);
  const sheetPushedRef = useRef(false);

  // 검색
  const [query, setQuery] = useState("");
  const [voiceLang, setVoiceLang] = useState<"ko" | "id">("ko");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 검색창을 누르면 최근 검색어를 보여줍니다.
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const hideHistoryRef = useRef<any>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const histOpenRef = useRef(false);
  const histPushedRef = useRef(false);

  const allCategories = getCategories();
  const hasMyWordbook = allCategories.some((c) => c.id === MY_WORDBOOK_ID);
  const myWordCount = getWordsByCategory(MY_WORDBOOK_ID).length;
  const folderCount = allCategories.filter((c) => c.id !== MY_WORDBOOK_ID).length;

  // 오늘 날짜(인니어 표기) + 오늘의 문장
  const now = new Date();
  const dateLabel = HARI[now.getDay()] + ", " + now.getDate() + " " + BULAN[now.getMonth()];

  // 오늘의 문장
  // 미리 받아둔 문장을 즉시 올리고, 곧바로 그다음 문장을 백그라운드에서 만들어 둡니다.
  const phraseBusy = useRef(false);
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  const refreshPhrase = useCallback((next: PhraseKind[]) => {
    if (phraseBusy.current) return;
    phraseBusy.current = true;
    setPhraseLoading(true);
    takePhrase(next)
      .then((p) => setPhrase(p))
      .catch(() => {})
      .finally(() => {
        phraseBusy.current = false;
        setPhraseLoading(false);
        // 다음에 볼 문장을 지금 만들어 둡니다 (실패해도 화면에는 영향 없음)
        prefetchNextPhrase(next).catch(() => {});
      });
  }, []);

  useEffect(() => {
    if (phrase) {
      // 이번 실행에서 이미 띄운 문장이 있으면 그대로 두고, 다음 문장만 채워 둡니다
      prefetchNextPhrase(kinds).catch(() => {});
      return;
    }
    refreshPhrase(kinds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 앱이 화면으로 돌아올 때마다 날짜가 지났는지 봅니다.
  // 안드로이드가 앱을 메모리에 며칠 붙들고 있어도 다음날이면 새 문장으로 넘어갑니다.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      if (!phraseIsStale()) return;
      refreshPhrase(kindsRef.current);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [refreshPhrase]);

  // 앱을 켜 둔 채로 자정을 넘기는 경우 (복귀 이벤트가 안 뜨므로 타이머로 챙깁니다)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (phraseIsStale()) refreshPhrase(kindsRef.current);
    }, msUntilNextDay());
    return () => window.clearTimeout(t);
  }, [phrase, refreshPhrase]);

  // 옵션 시트: 폰의 뒤로가기로도 닫히도록 히스토리를 한 칸 쌓습니다.
  const openKindSheet = () => {
    setKindSheetOpen(true);
    sheetOpenRef.current = true;
    try {
      window.history.pushState({ kindSheet: true }, "");
      sheetPushedRef.current = true;
    } catch (e) {
      sheetPushedRef.current = false;
    }
  };

  const closeKindSheet = () => {
    if (sheetPushedRef.current) {
      sheetPushedRef.current = false;
      sheetOpenRef.current = false;
      try { window.history.back(); return; } catch (e) { /* 아래에서 직접 닫습니다 */ }
    }
    sheetOpenRef.current = false;
    setKindSheetOpen(false);
  };

  useEffect(() => {
    const onPop = () => {
      if (sheetOpenRef.current) {
        sheetOpenRef.current = false;
        sheetPushedRef.current = false;
        setKindSheetOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openSearchHistory = () => {
    if (histOpenRef.current) return;
    if (hideHistoryRef.current) window.clearTimeout(hideHistoryRef.current);
    setHistory(loadSearchHistory());
    setShowHistory(true);
    histOpenRef.current = true;
    // 폰의 뒤로가기로도 닫힐 수 있도록 히스토리를 한 칸 쌓습니다.
    try {
      window.history.pushState({ homeHistoryPanel: true }, "");
      histPushedRef.current = true;
    } catch (e) {
      histPushedRef.current = false;
    }
  };

  const closeSearchHistory = () => {
    if (!histOpenRef.current) return;
    histOpenRef.current = false;
    setShowHistory(false);
    if (histPushedRef.current) {
      histPushedRef.current = false;
      try { window.history.back(); } catch (e) {}
    }
  };

  // 폰의 뒤로가기 — 목록만 닫고 메인에 머무릅니다.
  useEffect(() => {
    const onPopHistory = () => {
      if (histOpenRef.current) {
        histOpenRef.current = false;
        histPushedRef.current = false;
        setShowHistory(false);
      }
    };
    window.addEventListener("popstate", onPopHistory);
    return () => window.removeEventListener("popstate", onPopHistory);
  }, []);

  // 최근 검색어 목록은 검색 영역 바깥을 누르면 닫습니다.
  // 폰에서는 카드처럼 포커스를 받지 않는 요소를 눌러도 input 의 blur 가 안 나는 경우가 있어
  // blur 만으로는 목록이 남아 있게 됩니다.
  useEffect(() => {
    if (!showHistory) return;
    const onDown = (e: any) => {
      const area = searchAreaRef.current;
      if (area && e.target && area.contains(e.target)) return;
      closeSearchHistory();
      try { searchInputRef.current?.blur(); } catch (err) {}
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showHistory]);

  const openPhrase = () => {
    if (!phrase) return;
    navigate("/phrase?" + phraseToQuery(phrase));
  };

  const toggleKind = (key: PhraseKind) => {
    setKinds((prev) => {
      const on = prev.indexOf(key) >= 0;
      if (on && prev.length <= 1) return prev; // 최소 하나는 남깁니다
      const next = on ? prev.filter((k) => k !== key) : prev.concat([key]);
      saveKinds(next);
      // 미리 받아둔 문장은 예전 설정으로 만든 것이라 버립니다
      clearNextPhrase();
      refreshPhrase(next);
      return next;
    });
  };

  // 뜻 대신 조회 실패 안내문이 저장돼 있던 단어를 store.ts 가 시작할 때 지웁니다.
  // 지운 것이 있으면 어떤 단어였는지 한 번만 알려 줍니다 (필요하면 다시 담으면 됩니다).
  useEffect(() => {
    const purged = takePurgedFailedWords();
    if (purged.length === 0) return;
    const head = purged.slice(0, 3).join(", ");
    const more = purged.length > 3 ? " 외 " + (purged.length - 3) + "개" : "";
    toast("뜻이 없던 단어를 정리했습니다: " + head + more);
  }, []);

  // 판(관리자·회원·공개)에 따라 보이는 구역이 다릅니다.
  //   말씀과 기도 — 관리자판·회원판 / 설교 — 관리자판만
  const [edition] = useState(getEdition);
  const wordOn = edition !== "public";
  const sermonOn = edition === "admin";
  const storeApp = isStoreApp();
  const newsOn = !storeApp; // 뉴스는 스토어 앱에서만 뺍니다(브라우저 화면은 예전 그대로)

  // 공개판 홈: 등급은 usePlan() 하나로만 판단합니다
  const { plus } = usePlan();
  const [fog, setFog] = useState<{ text: string; x: number; y: number; n: number } | null>(null);
  const fogTimers = useRef<number[]>([]);
  const lockNavTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      fogTimers.current.forEach((t) => window.clearTimeout(t));
      fogTimers.current = [];
      if (lockNavTimer.current !== null) window.clearTimeout(lockNavTimer.current);
      lockNavTimer.current = null;
    };
  }, []);

  // 누른 자리 바로 위에 안내를 띄웁니다 (가로는 화면 가운데 근처로 모읍니다)
  const showFog = (el: HTMLElement | null, text: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    try {
      if (el) {
        const r = el.getBoundingClientRect();
        const mid = window.innerWidth / 2;
        x = Math.min(Math.max(r.left + r.width / 2, mid - 45), mid + 45);
        y = r.top - 6;
      }
    } catch (e) {}
    fogTimers.current.forEach((t) => window.clearTimeout(t));
    fogTimers.current = [];
    setFog((prev) => ({ text, x, y, n: (prev ? prev.n : 0) + 1 }));
    fogTimers.current.push(window.setTimeout(() => setFog(null), 2500));
  };

  // 무료 사용자가 잠긴 메뉴를 누르면: 안내가 떠오르고, 곧 구독 화면으로 넘어갑니다.
  // 넘어갈 때는 setState 없이 navigate 만 부릅니다(언마운트 중 setState 금지 규칙).
  const tapLocked = (e: React.MouseEvent<HTMLElement>, text: string) => {
    if (lockNavTimer.current !== null) return;
    showFog(e.currentTarget, text);
    lockNavTimer.current = window.setTimeout(() => {
      lockNavTimer.current = null;
      navigate(PAYWALL_PATH);
    }, LOCK_NAV_DELAY_MS);
  };

  // 무료: "다른 문장" 은 하루 한 번
  const tapNextPhrase = (e: React.MouseEvent<HTMLElement>) => {
    if (!plus) {
      let used = "";
      try { used = localStorage.getItem(FREE_PHRASE_DAY_KEY) || ""; } catch (err) {}
      if (used === localDay()) {
        showFog(e.currentTarget, "새 문장은 하루 한 번 받을 수 있습니다");
        return;
      }
      try { localStorage.setItem(FREE_PHRASE_DAY_KEY, localDay()); } catch (err) {}
    }
    refreshPhrase(kinds);
  };
  useEffect(() => {
    if (takeRevokedNotice()) toast("회원키가 해제되어 받아 둔 성경·교재를 이 기기에서 지웠습니다");
  }, []);

  // 성경 마지막 읽은 위치
  const [biblePos, setBiblePos] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BIBLE_LAST_POS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && typeof p.bookId === "string" && typeof p.chapter === "number") {
        const b = getBook(p.bookId);
        if (b) setBiblePos(b.idName + " " + p.chapter);
      }
    } catch (e) {}
  }, []);

  // 일대일 마지막 본 쪽
  const [oneToOnePos, setOneToOnePos] = useState("");
  useEffect(() => {
    try {
      const n = localStorage.getItem("onetoone-last-page");
      if (n) setOneToOnePos(n + "쪽");
    } catch (e) {}
  }, []);

  // 음성 인식 정리
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop?.(); } catch (e) {}
      try { window.speechSynthesis?.cancel?.(); } catch (e) {}
      if (hideHistoryRef.current) window.clearTimeout(hideHistoryRef.current);
    };
  }, []);

  const goSearch = (term?: string) => {
    const t = (term !== undefined ? term : query).trim();
    if (!t) return;
    navigate("/dictionary?q=" + encodeURIComponent(t));
  };

  const speechSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startVoice = () => {
    if (!speechSupported) {
      toast("이 기기에서는 음성 검색을 쓸 수 없습니다");
      return;
    }
    if (listening) {
      try { recognitionRef.current?.stop?.(); } catch (e) {}
      setListening(false);
      return;
    }
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = voiceLang === "ko" ? "ko-KR" : "id-ID";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onresult = (ev: any) => {
        const text = ev?.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        if (text) {
          setQuery(text);
          goSearch(text);
        }
      };
      rec.onerror = (ev: any) => {
        setListening(false);
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          toast("마이크 권한이 필요합니다. 폰 설정에서 허용해 주세요");
        }
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch (e) {
      setListening(false);
      toast("음성 검색을 시작하지 못했습니다");
    }
  };

  // 문장 종류 고르기 시트 — 공개판·관리자판 공용
  const kindSheet = kindSheetOpen ? (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={closeKindSheet}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
        <h2 className="px-4 text-base font-semibold text-foreground">볼 문장을 고르세요</h2>
        <p className="px-4 pb-3.5 pt-1.5 text-[0.78125rem] leading-relaxed text-muted-foreground">
          여러 개를 고르면 그중 하나가 무작위로 나옵니다.
        </p>
        <div className="border-t border-border">
          {PHRASE_KINDS.map((info) => {
            const on = kinds.indexOf(info.key) >= 0;
            return (
              <button
                key={info.key}
                type="button"
                onClick={() => toggleKind(info.key)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left active:bg-muted/60"
              >
                <span
                  className={
                    "flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-md border-2 " +
                    (on ? "border-primary bg-primary text-white" : "border-border text-transparent")
                  }
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.875rem] leading-tight text-foreground">{info.ko}</span>
                  <span className="mt-0.5 block font-word text-[0.71875rem] text-muted-foreground">
                    {info.id}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={closeKindSheet}
          className="mx-4 mt-4 h-12 w-[calc(100%-2rem)] rounded-[13px] bg-primary text-[0.9375rem] font-medium text-white"
        >
          완료
        </button>
      </div>
    </>
  ) : null;

  // 최근 검색어 — 검색창을 눌렀을 때만 (최대 10개). 본문 위에 떠있는 플로팅 박스
  const historyBox = showHistory && query.trim() === "" && history.length > 0 ? (
    <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl bg-card shadow-[0_10px_24px_-8px_rgba(8,32,38,0.35)]">
      {history.map((term, i) => (
        <button
          key={term + i}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => goSearch(term)}
          className={
            "w-full flex items-center gap-2.5 px-4 py-2.5 text-left active:bg-muted/60 transition-colors " +
            (i === history.length - 1 ? "" : "border-b border-border")
          }
        >
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[0.875rem] text-foreground/80">{term}</span>
        </button>
      ))}
    </div>
  ) : null;

  // ── 공개판(스토어 앱) 홈 — 시안 H5(무료) · H6(Plus 이상). 설정은 하단 탭 "내 정보"로 옮겼습니다.
  if (storeApp) {
    const sectionTitle = (t: string) => (
      <p
        className="font-gothic"
        style={{ margin: "0 4px 9px", fontSize: hrem(14), fontWeight: 700, letterSpacing: "0.02em", color: "#3B4245" }}
      >
        {t}
      </p>
    );
    const listBox = "bg-white overflow-hidden";
    const listStyle = { border: "1px solid " + H_LINE, borderRadius: 16 };
    const iconBtnPub = "shrink-0 flex items-center justify-center active:bg-black/5 rounded-full";
    const kindTag = phrase ? KIND_TAG[phrase.kind] || "" : "";

    return (
      <div
        className="w-full max-w-lg mx-auto bg-background flex flex-col"
        style={{ minHeight: "calc(100dvh - var(--kata-tabbar-h, 0px))", color: "#141819" }}
      >
        <style>{FOG_CSS}</style>

        {/* ── 머리 ── */}
        <div className="relative shrink-0" style={{ background: H_DEEP, padding: "28px 20px 26px" }}>
          {/* 장식만 블록 안에서 잘라냅니다(최근 검색어 박스가 잘리지 않게) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute left-0 top-0" width="390" height="170" aria-hidden="true">
              <defs>
                <g id="kataHomeFlower">
                  {[0, 72, 144, 216, 288].map((r) => (
                    <path key={r} d={FLOWER_PETAL} transform={"rotate(" + r + ")"} />
                  ))}
                </g>
              </defs>
              <g opacity="0.3">
                {[
                  "translate(196 30) scale(0.72) rotate(14)",
                  "translate(174 66) scale(0.4) rotate(-20)",
                  "translate(10 160) scale(0.85) rotate(30)",
                  "translate(52 154) scale(0.42) rotate(-8)",
                  "translate(376 152) scale(0.6) rotate(50)",
                ].map((t) => (
                  <g key={t} transform={t}>
                    <use href="#kataHomeFlower" fill="#ffffff" />
                    <circle r="4" fill="#F6C27A" />
                  </g>
                ))}
              </g>
            </svg>
            {/* 통코난 지붕 (토라자 전통 가옥) */}
            <svg
              className="absolute"
              style={{ right: -6, top: 8 }}
              width="190" height="122" viewBox="0 0 140 90" fill="none" stroke="#ffffff" strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.34" aria-hidden="true"
            >
              <path d="M4 10 C26 30 46 34 70 34 C94 34 114 30 136 10" />
              <path d="M18 22 C34 40 50 44 70 44 C90 44 106 40 122 22" />
              <path d="M4 10 L18 22 M136 10 L122 22" />
              <path d="M30 27 C44 37 56 39 70 39 C84 39 96 37 110 27" />
              <path d="M40 44 L100 44 L96 66 L44 66 Z" />
              <path d="M50 51 L90 51 M48 58 L92 58" />
              <path d="M58 51 L62 58 L66 51 L70 58 L74 51 L78 58 L82 51" />
              <path d="M50 66 L50 84 M70 66 L70 84 M90 66 L90 84" />
              <path d="M28 84 L112 84" />
            </svg>
            <svg
              className="absolute left-0 right-0 bottom-0 w-full"
              height="34" viewBox="0 0 400 34" preserveAspectRatio="none" fill="none" stroke="#ffffff"
              strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"
            >
              <path d="M-10 12 Q40 4 90 12 T190 12 T290 12 T390 12 T490 12" opacity="0.2" />
              <path d="M-10 22 Q50 14 110 22 T230 22 T350 22 T470 22" opacity="0.14" />
              <path d="M-10 31 Q60 24 130 31 T270 31 T410 31" opacity="0.1" />
            </svg>
          </div>

          <div className="relative flex items-start justify-between">
            <div className="min-w-0 flex flex-col" style={{ gap: 6 }}>
              <p
                className="font-gothic uppercase"
                style={{ margin: 0, fontSize: hrem(11), fontWeight: 600, letterSpacing: "0.1em", color: "#CFE1E7" }}
              >
                {dateLabel}
              </p>
              <div className="flex items-center" style={{ gap: 8 }}>
                <h1 className="font-word text-white" style={{ margin: 0, fontSize: hrem(28), fontWeight: 600, lineHeight: 1 }}>
                  Kata kata<span style={{ color: "#F29B6B" }}>.</span>
                </h1>
                {plus ? (
                  <span
                    className="font-gothic flex items-center"
                    style={{ height: 20, padding: "0 8px", borderRadius: 10, background: "#F6E7C4", color: "#5A4610", fontSize: hrem(10.5), fontWeight: 700, letterSpacing: "0.06em" }}
                  >
                    PLUS
                  </span>
                ) : null}
              </div>
            </div>
            <div className="relative flex items-center shrink-0">
              <MedaliBadge onClick={openMedali} />
              <MedaliNudge />
            </div>
          </div>

          {/* 검색 */}
          <div ref={searchAreaRef} className="relative" style={{ marginTop: 16 }}>
            <div className="flex items-center min-w-0" style={{ gap: 8 }}>
              <div
                className="flex-1 min-w-0 flex items-center bg-white"
                style={{ height: 46, borderRadius: 23, gap: 8, padding: "0 6px 0 16px" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C6D63" strokeWidth="2" aria-hidden="true" className="shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={searchInputRef}
                  size={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
                  onFocus={openSearchHistory}
                  onClick={openSearchHistory}
                  onBlur={() => {
                    hideHistoryRef.current = window.setTimeout(() => closeSearchHistory(), 160);
                  }}
                  placeholder="단어·문장 (인니어/한국어)"
                  aria-label="검색"
                  className="flex-1 min-w-0 w-full bg-transparent outline-none text-[#141819] placeholder:text-muted-foreground"
                  style={{ fontSize: hrem(14) }}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  onClick={startVoice}
                  aria-label="음성 검색"
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, color: listening ? "#DC2626" : "#646C72" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => goSearch()}
                className="shrink-0 font-gothic text-white active:bg-white/30"
                style={{ width: 46, height: 46, borderRadius: 23, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.32)", fontSize: hrem(12), fontWeight: 500 }}
              >
                검색
              </button>
            </div>
            {historyBox}
          </div>
        </div>

        {/* ── 본문 ── */}
        <div
          className="flex-1 flex flex-col"
          style={{ padding: plus ? "16px 16px 16px" : "14px 16px 16px", gap: plus ? 22 : 18 }}
        >
          {/* 오늘의 인도네시아어 */}
          <section
            role="button"
            tabIndex={0}
            onClick={() => openPhrase()}
            onKeyDown={(e) => { if (e.key === "Enter") openPhrase(); }}
            className="bg-white active:bg-[#F7F9FA] transition-colors"
            style={{ border: "1px solid " + H_LINE, borderRadius: 16, padding: "14px 16px 16px" }}
          >
            <div className="flex items-center" style={{ gap: 2 }}>
              <p
                className="font-gothic shrink-0"
                style={{ margin: 0, fontSize: hrem(14), fontWeight: 700, letterSpacing: "0.02em", color: "#3B4245" }}
              >
                BAHASA HARI INI
              </p>
              {kindTag ? (
                <span
                  className="font-gothic flex items-center shrink-0"
                  style={{ marginLeft: 8, height: 20, padding: "0 8px", borderRadius: 10, background: "#FCE6D9", color: "#9A4419", fontSize: hrem(11), fontWeight: 600 }}
                >
                  {kindTag}
                </span>
              ) : null}
              <span className="flex-1" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate("/phrase/saved"); }}
                className={iconBtnPub}
                style={{ width: 34, height: 34, color: "#646C72" }}
                aria-label="저장한 문장"
              >
                <Bookmark size={15} strokeWidth={1.9} fill="none" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); tapNextPhrase(e); }}
                className={iconBtnPub}
                style={{ width: 34, height: 34, color: "#646C72" }}
                aria-label="다른 문장"
              >
                <RotateCcw size={15} strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openKindSheet(); }}
                className={iconBtnPub}
                style={{ width: 34, height: 34, color: "#646C72" }}
                aria-label="문장 종류 고르기"
              >
                <SlidersHorizontal size={15} strokeWidth={1.9} />
              </button>
            </div>
            {phraseLoading && !phrase ? (
              <div className="mt-3.5 space-y-2">
                <div className="h-4 w-4/5 rounded bg-muted" />
                <div className="h-3 w-3/5 rounded bg-muted" />
              </div>
            ) : phrase ? (
              <>
                <p className="font-word" style={{ margin: "8px 0 0", fontSize: hrem(19), fontWeight: 500, lineHeight: 1.5 }}>
                  {phrase.id}
                </p>
                {phrase.ko ? (
                  <p style={{ margin: "4px 0 0", fontSize: hrem(13), lineHeight: 1.6, color: "#4D565B" }}>{phrase.ko}</p>
                ) : null}
              </>
            ) : null}
          </section>

          {/* 단어장 */}
          <section>
            {sectionTitle("단어장")}
            <div className={listBox} style={listStyle}>
              <PubRow
                tileBg="#DDF0EA"
                icon={tileIcon("#2C6D63", (
                  <>
                    <path d="M4 4h4v16H4zM10 4h4v16h-4z" />
                    <path d="M15.5 5.2l3.9-1 3.6 14.6-3.9 1z" />
                  </>
                ))}
                title="기본 단어장 폴더"
                sub="Kosakata"
                locked={!plus}
                onClick={(e) => (plus ? navigate("/wordbooks") : tapLocked(e, "기본 단어장은 Plus 회원 기능입니다"))}
              />
              <PubRow
                tileBg="#DCEAF6"
                icon={tileIcon("#2B5F86", (
                  <>
                    <path d="M3 5h12v8H8l-5 4z" />
                    <path d="M9 16h7l5 4v-9h-3" />
                  </>
                ))}
                title="회화집 폴더"
                sub="Percakapan"
                locked={!plus}
                onClick={(e) => (plus ? navigate("/percakapan") : tapLocked(e, "회화집은 Plus 회원 기능입니다"))}
                last
              />
            </div>
          </section>

          {/* 인도네시아 */}
          <section>
            {sectionTitle("인도네시아")}
            <div className={listBox} style={listStyle}>
              <PubRow
                tileBg="#FCE6D9"
                icon={tileIcon("#B4501F", (
                  <>
                    <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" />
                    <path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
                  </>
                ))}
                title="이야기"
                sub="Cerita"
                locked={false}
                onClick={() => navigate("/story")}
              />
              <PubRow
                tileBg="#E9E4F5"
                icon={tileIcon("#5B4A8A", (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
                  </>
                ))}
                title="인도네시아 이해 · 지도"
                sub="Wawasan"
                locked={!plus}
                onClick={(e) => (plus ? navigate("/insight") : tapLocked(e, "인도네시아 이해는 Plus 회원 기능입니다"))}
                last
              />
            </div>
          </section>

          {/* Plus 줄 — 무료에게만 (Plus·Special Member·관리자에게는 사라집니다) */}
          {!plus ? (
            <button
              type="button"
              onClick={() => navigate(PAYWALL_PATH)}
              className="w-full flex items-center text-left active:opacity-90"
              style={{ gap: 12, padding: "11px 12px 11px 14px", background: "#FFF6DC", border: "1px solid #F1E0AE", borderRadius: 16 }}
            >
              <span
                className="shrink-0 flex items-center justify-center bg-white"
                style={{ width: 32, height: 32, borderRadius: 9 }}
              >
                <svg width="22" height="22" viewBox="-26 -26 52 52" aria-hidden="true">
                  {[0, 72, 144, 216, 288].map((r) => (
                    <path key={r} d={FLOWER_PETAL} fill="#D9A94A" transform={"rotate(" + r + ")"} />
                  ))}
                  <circle r="5" fill="#8A6A12" />
                </svg>
              </span>
              <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
                <span style={{ fontSize: hrem(15) }}>Kata kata Plus</span>
                <span className="font-gothic" style={{ fontSize: hrem(11.5), color: "#6E5612" }}>
                  회화·게임·소리 읽기 모두 열기
                </span>
              </span>
              <span
                className="shrink-0 flex items-center text-center text-white font-gothic"
                style={{ height: 42, padding: "0 13px", borderRadius: 21, background: "#8A6A12", fontSize: hrem(12), fontWeight: 700, lineHeight: 1.3 }}
              >
                Plus<br />7일 무료 체험
              </span>
            </button>
          ) : null}
        </div>

        {fog ? (
          <div
            key={fog.n}
            role="status"
            className="kata-fog fixed z-40 pointer-events-none whitespace-nowrap font-gothic"
            style={{
              left: fog.x, top: fog.y, padding: "7px 14px", borderRadius: 16,
              background: "rgba(226,231,234,0.94)", backdropFilter: "blur(6px)",
              boxShadow: "0 4px 14px rgba(16,40,50,0.08)", fontSize: hrem(12.5), fontWeight: 500, color: "#4D565B",
            }}
          >
            {fog.text}
          </div>
        ) : null}

        {kindSheet}
        <MedaliSheet open={medaliOpen} onOpenChange={(o) => { if (!o) closeMedali(); }} />
        <MedaliIdDialog open={needId} onDone={() => setNeedId(false)} />
      </div>
    );
  }

  const iconBtn =
    "w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 active:bg-white/20 transition-colors";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      {/* ── 상단 브랜드 블록 ── */}
      <div
        className="relative px-5 pt-7 pb-6"
        style={{ backgroundColor: "hsl(var(--brand-deep))" }}
      >
        {/* 배경 장식만 블록 안에서 잘라냅니다.
            (블록 자체에 overflow-hidden 을 주면 최근 검색어 플로팅 박스가 잘립니다) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 피니시 범선 (술라웨시 전통 목조선) */}
        <svg
          className="absolute -right-1.5 top-1.5 pointer-events-none"
          width="168"
          height="126"
          viewBox="0 0 140 110"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.26"
          aria-hidden="true"
        >
          <path d="M10 84 Q70 104 130 84" />
          <path d="M10 84 L130 84" />
          <path d="M52 84 L52 12" />
          <path d="M92 84 L92 26" />
          <path d="M50 16 L50 78 L18 78 Z" />
          <path d="M56 20 L56 78 L88 78 Z" />
          <path d="M96 30 L96 78 L126 78 Z" />
          <path d="M52 12 L52 6" />
        </svg>

        {/* 물결 */}
        <svg
          className="absolute left-0 right-0 bottom-0 w-full pointer-events-none"
          height="34"
          viewBox="0 0 400 34"
          preserveAspectRatio="none"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M-10 12 Q40 4 90 12 T190 12 T290 12 T390 12 T490 12" opacity="0.18" />
          <path d="M-10 22 Q50 14 110 22 T230 22 T350 22 T470 22" opacity="0.13" />
          <path d="M-10 31 Q60 24 130 31 T270 31 T410 31" opacity="0.09" />
        </svg>
        </div>

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-white/60">
              {dateLabel}
            </p>
            <h1 className="mt-1.5 font-word text-[1.6875rem] font-semibold leading-none tracking-tight text-white">
              Kata kata<span className="text-accent">.</span>
            </h1>
          </div>
          <div className="relative flex items-center gap-1.5 shrink-0">
            <MedaliBadge onClick={openMedali} />
            <MedaliNudge />
            <button type="button" onClick={() => setSettingsOpen(true)} className={iconBtn} title="설정">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div ref={searchAreaRef} className="relative mt-4">
          <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 h-[46px] flex items-center gap-2 rounded-full bg-card px-4">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
              onFocus={openSearchHistory}
              // 뒤로가기로 닫은 뒤에도 입력창은 포커스를 유지합니다.
              // 그때는 onFocus 가 안 떠므로 탭 자체로도 다시 열어줍니다.
              onClick={openSearchHistory}
              onBlur={() => {
                // 목록을 탭할 때 먼저 닫히지 않도록 잠깐 기다립니다.
                hideHistoryRef.current = window.setTimeout(() => closeSearchHistory(), 160);
              }}
              placeholder="단어·문장 (인니어/한국어)"
              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={startVoice}
              className={"shrink-0 " + (listening ? "text-red-500" : "text-muted-foreground")}
              title="음성 검색"
            >
              <Mic size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => goSearch()}
            className="shrink-0 w-[46px] h-[46px] rounded-full bg-white/15 border border-white/30 text-white text-[0.75rem] font-gothic font-medium active:bg-white/30"
          >
            검색
          </button>
          </div>

          {/* 최근 검색어 — 검색창을 눌렀을 때만 (최대 10개). 본문 위에 떠있는 플로팅 박스 */}
          {historyBox}
        </div>
      </div>

      <div className="px-4">
        {/* ── 오늘의 인도네시아어 ── */}
        <section className="mt-3.5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => openPhrase()}
            onKeyDown={(e) => { if (e.key === "Enter") openPhrase(); }}
            className="rounded-2xl border border-border bg-card px-4 py-4 active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-1">
              <p className="flex-1 min-w-0 truncate text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Bahasa Hari Ini
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate("/phrase/saved"); }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                title="저장한 문장 모아보기"
                aria-label="저장한 문장 모아보기"
              >
                <Bookmark size={15} fill="none" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); refreshPhrase(kinds); }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                title="다른 문장 보기"
                aria-label="다른 문장 보기"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openKindSheet(); }}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                title="어떤 문장을 볼지 고르기"
                aria-label="어떤 문장을 볼지 고르기"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {phraseLoading && !phrase ? (
              <div className="mt-3.5 space-y-2">
                <div className="h-4 w-4/5 rounded bg-muted" />
                <div className="h-3 w-3/5 rounded bg-muted" />
              </div>
            ) : phrase ? (
              <>
                <p
                  className={
                    "mt-2.5 font-word font-medium text-foreground " +
                    (phrase.kind === "alkitab"
                      ? "text-[1.0625rem] leading-[1.6]"
                      : "text-[1.1875rem] leading-[1.5]")
                  }
                >
                  {phrase.id}
                </p>
                {phrase.ko ? (
                  <p className="mt-1.5 text-[0.8125rem] leading-[1.6] text-muted-foreground">{phrase.ko}</p>
                ) : null}
                {phrase.ref ? (
                  <p className="mt-2 font-word text-[0.78125rem] text-muted-foreground">{phrase.ref}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        {/* ── 단어장 ── */}
        <section className="mt-6">
          <SectionLabel>단어장</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {hasMyWordbook ? (
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => navigate("/category/" + MY_WORDBOOK_ID)}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left"
                >
                  <Star size={20} strokeWidth={1.6} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.9375rem] leading-tight text-foreground truncate">내 단어장</p>
                    <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
                      Kosakataku · {myWordCount}단어
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/study/" + MY_WORDBOOK_ID)}
                    className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
                  >
                    카드
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/quiz/" + MY_WORDBOOK_ID)}
                    className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
                  >
                    퀴즈
                  </button>
                </div>
              </div>
            ) : null}
            <Row
              icon={Library}
              title="단어장 폴더"
              sub="Kosakata"
              meta={folderCount > 0 ? folderCount + "권" : undefined}
              onClick={() => navigate("/wordbooks")}
            />
            <Row
              icon={MessagesSquare}
              title="회화집 폴더"
              sub="Percakapan"
              onClick={() => navigate("/percakapan")}
              last
            />
          </div>
        </section>

        {/* ── 말씀과 기도 ── 공개판에서는 구역째 보이지 않습니다 */}
        {wordOn ? (
        <section className="mt-6">
          <SectionLabel>말씀과 기도</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row icon={SunriseIcon} title="오늘의 묵상" sub="Saat Teduh" onClick={() => navigate("/devotion")} />
            <Row
              icon={BookOpen}
              title="성경 읽기"
              sub="Alkitab"
              meta={biblePos || undefined}
              onClick={() => navigate("/bible")}
            />
            <Row
              icon={Users}
              title="일대일 성경공부"
              sub="Pemuridan"
              meta={oneToOnePos || undefined}
              onClick={() => navigate("/one-to-one")}
            />
            <Row icon={Heart} title="기도문" sub="Doa" onClick={() => navigate("/prayer")} last />
          </div>
        </section>
        ) : null}

        {/* ── 설교 ── 설교문 서버 주소·키가 설정된 기기에서만 구역째 보입니다 */}
        {sermonOn ? (
          <section className="mt-6">
            <SectionLabel>설교</SectionLabel>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Row icon={BookMarked} title="설교문" sub="Khotbah" onClick={() => navigate("/sermon")} last />
            </div>
          </section>
        ) : null}

        {/* ── 인도네시아 ── */}
        <section className="mt-6">
          <SectionLabel>인도네시아</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* 뉴스는 검색 그라운딩 비용이 커서 공개판에 넣지 않습니다 */}
            {newsOn ? (
              <Row icon={Newspaper} title="뉴스" sub="Berita" onClick={() => navigate("/news")} />
            ) : null}
            <Row icon={ScrollText} title="이야기" sub="Cerita" onClick={() => navigate("/story")} />
            <Row icon={Compass} title="인도네시아 이해" sub="Wawasan" onClick={() => navigate("/insight")} last />
          </div>
        </section>

        {/* ── 단어게임 ── */}
        <section className="mt-6">
          <SectionLabel>단어게임</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row icon={Gamepad2} title="게임방" sub="Permainan" onClick={() => navigate("/permainan")} last />
          </div>
        </section>
      </div>

      {kindSheet}

      <MedaliSheet open={medaliOpen} onOpenChange={(o) => { if (!o) closeMedali(); }} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <MedaliIdDialog open={needId} onDone={() => setNeedId(false)} />
    </div>
  );
};

export default Index;
