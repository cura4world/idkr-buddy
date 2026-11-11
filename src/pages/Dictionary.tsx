import { Fragment, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Volume1, Plus, Check, Loader2, Mic, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  lookupWord,
  detectInputKind,
  analyzeIdSentence,
  lookupKoWord,
  translateKoSentence,
  DictResult,
  DictRelatedItem,
  IdSentenceResult,
  KoWordResult,
  KoSentenceResult,
  InputKind,
  normalizeHeadword,
} from "@/lib/dictionary";
import { hasGeminiApiKey } from "@/lib/gemini";
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId, saveSaveTargetId } from "@/lib/saveTarget";
import WordbookPickerSheet from "@/components/WordbookPickerSheet";
import AiReportButton from "@/components/AiReportButton";
import { dictCacheKey, getCachedResult, saveCachedResult } from "@/lib/dictStore";
import { lastQuotaNotice } from "@/lib/aiProxy";
import { publicAiErrorText } from "@/lib/aiErrors";
import { dropReturnTicket } from "@/lib/readReturn";
import { medaliEngine } from "@/lib/medali";
import { useBackClose } from "@/hooks/useBackClose";
import { loadVoiceLang, saveVoiceLang, voiceLangLabel } from "@/lib/voiceSearchLang";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// TTS: AndroidTTS 우선, 없으면 speechSynthesis 폴백 (프로젝트 공통 패턴)
const speak = (text: string, lang: "id" | "ko") => {
  if (!text) return;
  if ((window as any).AndroidTTS) {
    try { (window as any).AndroidTTS.speak(text, lang === "ko" ? "ko-KR" : "id-ID"); } catch (e) {}
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
    utterance.rate = 0.9;
    speechSynthesis?.cancel?.();
    setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch (e) {} }, 150);
  } catch (e) {}
};

// ---- 결과 화면 모양 (시안 "사전 안 4": 2번 표제어 + 3번 본문) ----
// 글자 크기는 시안의 px 를 rem 으로 옮겨 씁니다(글자 크기 설정을 따라가도록).
// 시안 크기가 이미 content-bump 한 단계 키운 크기라, 결과 카드에 content-bump 를 그대로 두어도
// 아래의 고정 rem 크기는 더 커지지 않습니다.

// 5칸 막대 (회화 사용빈도·난이도)
const Bars = ({ n, on }: { n: number; on: string }) => {
  const full = Math.max(0, Math.min(5, n));
  return (
    <span className="mt-2 flex gap-[3px]" role="img" aria-label={"5단계 중 " + full}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="h-[5px] flex-1 rounded-[3px]" style={{ background: i < full ? on : "#E3E7EA" }} />
      ))}
    </span>
  );
};

const FREQ_LABEL = ["", "드물게", "가끔", "보통", "자주", "아주 자주"];
const DIFF_LABEL = ["", "쉬움", "쉬운 편", "보통", "어려운 편", "어려움"];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="m-0 font-gothic text-[0.8125rem] font-bold text-[#1F4F4A]">{children}</h3>
);

// 한국어 설명 속 인니어(로마자) 낱말만 Lora 로 보여 줍니다.
function latinSpans(text: string, sizeClass?: string): React.ReactNode[] {
  const parts = (text || "").split(new RegExp("([A-Za-z\\u00C0-\\u024F][A-Za-z\\u00C0-\\u024F'\\-]*(?:\\s+[A-Za-z\\u00C0-\\u024F][A-Za-z\\u00C0-\\u024F'\\-]*)*)"));
  return parts.filter((x) => x !== "").map((part, i) =>
    new RegExp("^[A-Za-z\\u00C0-\\u024F]").test(part) ? (
      <span key={i} className={"font-word " + (sizeClass || "")}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// 시안의 스피커는 소리 물결이 하나인 모양(Volume1)입니다.
const SpeakIcon = ({ size }: { size: number }) => <Volume1 size={size} strokeWidth={2} />;

// 형태와 관련 단어 — 꼬리표 색 (시안의 4색 + 반대 단어)
const RELATED_KINDS: { key: "activeForms" | "passiveForms" | "opposites" | "similar" | "derived"; title: string; bg: string; fg: string }[] = [
  { key: "activeForms", title: "능동형", bg: "#DDF0EA", fg: "#245A51" },
  { key: "passiveForms", title: "수동형", bg: "#DCEAF6", fg: "#24506F" },
  { key: "opposites", title: "반대 단어", bg: "#F6E2E2", fg: "#7A3535" },
  { key: "similar", title: "유사 단어", bg: "#E9E4F5", fg: "#4E3F78" },
  { key: "derived", title: "파생 단어", bg: "#FCE6D9", fg: "#8C3F18" },
];

const RelatedCard = ({ it, title, bg, fg }: { it: DictRelatedItem; title: string; bg: string; fg: string }) => (
  <div className="flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-[#E6EAE8] px-3.5 py-3">
    <span
      className="flex h-5 items-center self-start rounded-[10px] px-2 font-gothic text-[0.6875rem] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {title}
    </span>
    <div className="mt-1 flex min-w-0 items-baseline gap-2">
      <p className="m-0 break-words font-word text-[1.125rem] font-semibold text-[#104B60]">{it.word}</p>
      <p className="m-0 min-w-0 flex-1 break-words font-gothic text-[0.8125rem] text-[#5E5D57]">{it.meaning}</p>
      <button
        onClick={() => speak(it.word, "id")}
        className="-my-2 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center self-center text-[#1F4F4A]"
        title="발음 듣기"
        aria-label="발음 듣기"
      >
        <SpeakIcon size={15} />
      </button>
    </div>
    {it.example ? (
      <p className="m-0 mt-1.5 break-words font-word text-[0.9375rem] leading-[1.45]">{it.example}</p>
    ) : null}
    {it.exampleKo ? (
      <p className="m-0 break-words text-[0.8125rem] leading-[1.5] text-[#5E5D57]">{it.exampleKo}</p>
    ) : null}
  </div>
);

// 흰 본문 카드 (시안: 20px 둥글기, 옅은 그림자, 구역 사이 26px)
const BodyCard = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-[26px] rounded-[20px] bg-card px-5 pb-[22px] pt-5 shadow-[0_1px_3px_rgba(16,40,50,0.06)] content-bump">
    {children}
  </div>
);

// 연민트 표제 카드
const HeroCard = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-[20px] bg-[#E2F1EC] px-5 pb-[18px] pt-5">{children}</section>
);

const HeroSpeaker = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2C6D63]"
    title={title}
    aria-label={title}
  >
    <SpeakIcon size={19} />
  </button>
);

const RowSpeaker = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-[#1F4F4A]"
    title={title}
    aria-label={title}
  >
    <SpeakIcon size={16} />
  </button>
);

// 예문 한 줄 (번호 · 인니어 · 한국어 · 스피커)
// 예문 앞 번호는 2026-11-11 사용자 요청으로 뺐습니다
const ExampleRow = ({ id, ko }: { id: string; ko: string }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <p className="m-0 break-words font-word text-[1rem] leading-[1.45]">{id}</p>
      {ko ? <p className="m-0 break-words text-[0.8125rem] leading-[1.5] text-[#5E5D57]">{ko}</p> : null}
    </div>
    <RowSpeaker onClick={() => speak(id, "id")} title="예문 듣기" />
  </div>
);

// 검색 히스토리 (localStorage, 최신순, 최대 30개)
const HISTORY_KEY = "dict-search-history";
const HISTORY_MAX = 50;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushHistory(term: string): string[] {
  const t = term.trim();
  if (!t) return loadHistory();
  const prev = loadHistory().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, HISTORY_MAX);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function removeHistory(term: string): string[] {
  const next = loadHistory().filter((x) => x.toLowerCase() !== term.trim().toLowerCase());
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  return next;
}

// 핵심 문형 안의 한글(사람/동사 등)만 한 단계 작게 표시합니다.
function renderPattern(text: string): React.ReactNode[] {
  const parts = text.split(new RegExp("([\\uAC00-\\uD7A3\\u1100-\\u11FF\\u3130-\\u318F]+)"));
  return parts.filter((x) => x !== "").map((part, i) => {
    const isKo = new RegExp("^[\\uAC00-\\uD7A3\\u1100-\\u11FF\\u3130-\\u318F]+$").test(part);
    return isKo ? (
      <span key={i} className="text-xs font-gothic">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

// 끊어읽기 문장: "/"로 연결하고 문장 끝 마침표를 보장합니다.
function chunkedSentence(r: IdSentenceResult): string {
  const base =
    r.chunks.length > 0 ? r.chunks.map((c) => c.id).join(" / ") : r.original;
  const t = base.trim();
  if (!t) return t;
  if (new RegExp("[.!?\\u2026]$").test(t)) return t;
  return t + ".";
}

const Dictionary = () => {
  const navigate = useNavigate();
  // 다른 화면의 "사전에서 보기"로 들어왔을 때 "성경으로" 같은 돌아가기 플로팅 버튼을
  // 띄웠었는데, 폰의 뒤로가기로 그대로 돌아가지므로 없앴습니다.
  // (주소의 from= 값은 어디서 들어왔는지 남겨두기 위해 그대로 둡니다)
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<InputKind | null>(null);
  const [result, setResult] = useState<DictResult | null>(null);
  const [idSentence, setIdSentence] = useState<IdSentenceResult | null>(null);
  const [koWord, setKoWord] = useState<KoWordResult | null>(null);
  const [koSentence, setKoSentence] = useState<KoSentenceResult | null>(null);
  const [error, setError] = useState("");
  // 지금 화면에 떠 있는 결과의 검색어. query는 검색 직후 비워지므로 따로 들고 있어야
  // "다시 검색"이 무엇을 다시 찾을지 알 수 있습니다.
  const [lastTerm, setLastTerm] = useState("");
  // 검색 결과마다 히스토리 칸을 하나씩 둡니다(2026-11-11 사용자 요청 — 예전 "← 사과로" 버튼 대신).
  // 결과 안에서 낱말을 눌러 다시 찾으면 칸을 쌓고, 폰의 뒤로가기는 바로 전에 보던 결과로 돌아갑니다.
  // 칸의 state 에 kataDict(검색어)를 적어 두고, popstate 에서 그 검색어를 캐시로 다시 띄웁니다.
  const lastTermRef = useRef("");
  const sheetBackPendingRef = useRef(false); // 담을 단어장 시트를 버튼으로 닫으며 뺀 칸
  const autoQueryPendingRef = useRef(false); // 주소(?q=)로 들어온 첫 검색
  const pendingPushRef = useRef<string | null>(null); // 최근 검색 플로팅이 닫히는 동안 미뤄 둔 칸

  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---- 담을 단어장(대상) ----
  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const sheetOpenRef = useRef(false);
  const sheetPushedRef = useRef(false);
  const wantSheetRef = useRef(false);
  const openSheetRef = useRef<(() => void) | null>(null);

  const saveTarget = saveTargets.find((c) => c.id === saveTargetId) || null;
  const saveTargetName = saveTarget ? saveTarget.name : "";

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    saveSaveTargetId(id);
  };

  // 검색창을 누르면 최근 검색어를 플로팅으로 보여줍니다.
  const [showHistory, setShowHistory] = useState(false);
  const histAreaRef = useRef<HTMLDivElement>(null);
  const histOpenRef = useRef(false);
  const histPushedRef = useRef(false);
  const histBackPendingRef = useRef(false);
  const histHideTimer = useRef<any>(null);

  const errorMessage = (code: string): string => {
    // 공개판 서버의 숨은 한도(처음 찾는 단어 하루·한 달)를 넘은 경우 — 오류 코드는 QUOTA_DICT_NEW 등 "QUOTA" 로 시작.
    // aiProxy 는 이 경우 토스트를 띄우지 않고 기간(오늘/이번 달)에 맞는 문장만 남깁니다. 이미 찾아본 단어는 캐시로 계속 보입니다.
    if (code.indexOf("QUOTA") === 0) {
      return lastQuotaNotice() || "오늘 새로 찾을 수 있는 단어를 모두 찾았습니다. 이미 찾아본 단어는 그대로 볼 수 있고, 새 단어는 내일 다시 찾을 수 있습니다.";
    }
    // 공개판: 키·세션 오류는 사용자용 문장으로 (aiErrors). 관리자판은 아래 기존 문구.
    const pubText = publicAiErrorText(code);
    if (pubText) return pubText;
    if (code === "NO_API_KEY") return "Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.";
    if (code === "INVALID_API_KEY") return "API 키가 올바르지 않습니다. 설정에서 다시 확인해주세요.";
    if (code === "RATE_LIMIT") return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
    if (code === "EMPTY_WORD") return "단어를 입력해주세요.";
    if (code === "TIMEOUT") return "응답이 늦어 검색을 중단했습니다. 다시 시도해주세요.";
    if (code === "NETWORK") return "네트워크 연결을 확인해주세요.";
    if (code === "SERVER_ERROR") return "Gemini 서버 오류입니다. 잠시 후 다시 시도해주세요.";
    if (code === "BAD_REQUEST") return "요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.";
    return "검색에 실패했습니다. 잠시 후 다시 시도해주세요.";
  };

  // 히스토리 칸 기록 — "push": 새 칸(뒤로가기로 지금 결과로 돌아옴) / "replace": 지금 칸에 적기 / "none": 안 건드림(뒤로가기로 되돌아온 경우)
  const recordEntry = (w: string, mode: "push" | "replace" | "none") => {
    if (mode === "none") return;
    try {
      const cur = (window.history.state || {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...cur, kataDict: w };
      delete next.kataBackClose; // 창 닫기용 칸 표시는 옮겨 적지 않습니다
      delete next.dictHistoryPanel;
      delete next.dictSaveSheet;
      if (mode === "replace") {
        window.history.replaceState(next, "");
        return;
      }
      // 최근 검색 플로팅이 닫히며 뺀 칸이 아직 처리 중이면, 그 뒤에 쌓습니다(순서가 꼬이지 않게).
      if (histBackPendingRef.current) {
        pendingPushRef.current = w;
        return;
      }
      window.history.pushState(next, "");
    } catch (e) {
      // 히스토리를 못 쓰면 뒤로가기가 이전 화면으로 갈 뿐입니다
    }
  };

  // forceRefresh: 캐시를 무시하고 새로 받아 캐시를 덮어씀 ("다시 검색" 버튼)
  // entry: 히스토리 칸 기록 방식. 지정하지 않으면 지금 칸에 결과가 없을 때만 적고(첫 검색은 이 화면 칸),
  //        이미 다른 결과를 보고 있으면 새 칸을 쌓습니다.
  const handleSearch = async (term?: string, entry?: "push" | "replace" | "none", forceRefresh?: boolean) => {
    const w = (term ?? query).trim();
    if (!w) return;
    // 같은 결과를 다시 찾으면 칸을 쌓지 않습니다
    let mode: "push" | "replace" | "none" = entry || "push";
    if (!entry) {
      const curTerm = (() => {
        try {
          const s = window.history.state as Record<string, unknown> | null;
          return s && typeof s.kataDict === "string" ? (s.kataDict as string) : "";
        } catch (e) {
          return "";
        }
      })();
      if (lastTermRef.current && lastTermRef.current === w) mode = "none";
      else if (!lastTermRef.current && !curTerm && autoQueryPendingRef.current) mode = "replace";
    }
    autoQueryPendingRef.current = false;
    if (!hasGeminiApiKey()) {
      setError(errorMessage("NO_API_KEY"));
      setResult(null);
      setQuery(w); // 입력한 내용 유지
      return;
    }
    inputRef.current?.blur();
    setQuery(w); // 찾은 말을 검색창에 남겨 둡니다 (시안 D4, QA Q10)
    const detected = detectInputKind(w);
    const cacheKey = dictCacheKey(detected, w);

    // 결과 종류와 무관한 공통 초기화. 캐시 적중 경로와 API 경로가 함께 씁니다.
    const resetForNewSearch = () => {
      setError("");
      setResult(null);
      setIdSentence(null);
      setKoWord(null);
      setKoSentence(null);
      setSaved(false);
      setKind(detected);
      setLastTerm(w); // "다시 검색" 버튼이 쓸 현재 검색어
      if (lastTermRef.current !== w) recordEntry(w, mode);
      lastTermRef.current = w;
    };

    // 결과를 띄운 뒤 공통 마무리 (히스토리 기록 + 뒤로가기용 상태 쌓기)
    const finishSuccess = () => {
      setHistory(pushHistory(w));
    };

    // 캐시 적중: setLoading(true)를 아예 거치지 않아 로딩 화면이 깜빡이지 않습니다.
    if (!forceRefresh) {
      const cached = await getCachedResult(cacheKey);
      if (cached) {
        resetForNewSearch();
        if (detected === "id_word") {
          const r = cached as DictResult;
          setResult(r);
          // 지금 고른 대상 단어장 기준으로 판정합니다.
          if (saveTargetId && hasWordInCategory(saveTargetId, r.word)) setSaved(true);
        } else if (detected === "id_sentence") {
          setIdSentence(cached as IdSentenceResult);
        } else if (detected === "ko_word") {
          setKoWord(cached as KoWordResult);
        } else {
          setKoSentence(cached as KoSentenceResult);
        }
        finishSuccess();
        return;
      }
    }

    setLoading(true);
    resetForNewSearch();
    try {
      if (detected === "id_word") {
        const r = await lookupWord(w);
        setResult(r);
        // 이미 대상 단어장에 있는 단어면 "저장됨"으로 표시
        if (saveTargetId && hasWordInCategory(saveTargetId, r.word)) setSaved(true);
        await saveCachedResult(cacheKey, detected, w, r);
      } else if (detected === "id_sentence") {
        const r = await analyzeIdSentence(w);
        setIdSentence(r);
        await saveCachedResult(cacheKey, detected, w, r);
      } else if (detected === "ko_word") {
        const r = await lookupKoWord(w);
        setKoWord(r);
        await saveCachedResult(cacheKey, detected, w, r);
      } else {
        const r = await translateKoSentence(w);
        setKoSentence(r);
        await saveCachedResult(cacheKey, detected, w, r);
      }
      // 여기까지 왔다 = API로 새 결과를 받아 캐시까지 넣은 경우만.
      // 캐시 적중 경로는 위에서 이미 return 되므로 점수가 오르지 않습니다.
      medaliEngine.addPoints("dict", 1).catch(() => {});  // 새 검색 +1 (조용히)
      finishSuccess();
    } catch (e: any) {
      setError(errorMessage(e?.message || ""));
      setQuery(w); // 검색 실패 시 입력한 내용을 검색창에 되돌려 둠 (다시 타이핑할 필요 없음)
      // 실패한 결과는 캐시에 저장하지 않습니다.
    } finally {
      setLoading(false);
    }
  };

  // 인니어 문장 결과의 표제 문장: 낱말마다 눌러서 사전 검색 (끊어읽기 "/" 와 문장부호는 누르지 않음)
  const renderTappableSentence = (text: string): React.ReactNode[] => {
    const marks = ".,!?;:\"'()[]{}<>…«»“”‘’";
    const out: React.ReactNode[] = [];
    const parts = text.split(new RegExp("(\\s+)"));
    parts.forEach((tok, i) => {
      if (!tok) return;
      if (!tok.trim() || tok === "/") {
        out.push(<Fragment key={i}>{tok}</Fragment>);
        return;
      }
      let s = 0;
      let e = tok.length;
      while (s < e && marks.indexOf(tok[s]) >= 0) s++;
      while (e > s && marks.indexOf(tok[e - 1]) >= 0) e--;
      const core = tok.slice(s, e);
      if (!core || !new RegExp("[A-Za-z\\u00C0-\\u024F]").test(core)) {
        out.push(<Fragment key={i}>{tok}</Fragment>);
        return;
      }
      out.push(
        <Fragment key={i}>
          {tok.slice(0, s)}
          <button
            type="button"
            onClick={() => handleSearch(normalizeHeadword(core))}
            className="inline p-0 m-0 bg-transparent border-0 text-left underline decoration-dotted decoration-[#104B60]/35 underline-offset-[5px] active:opacity-60"
            style={{ font: "inherit", color: "inherit", letterSpacing: "inherit" }}
            title={'"' + core + '" 사전 검색'}
          >
            {core}
          </button>
          {tok.slice(e)}
        </Fragment>
      );
    });
    return out;
  };

  // 결과 화면 상태만 초기화 (히스토리는 건드리지 않음)
  const resetToHome = () => {
    setResult(null);
    setIdSentence(null);
    setKoWord(null);
    setKoSentence(null);
    setError("");
    setKind(null);
    setQuery("");
    setLastTerm("");
    lastTermRef.current = "";
    setHistory(loadHistory());
  };

  // 초기(홈) 화면 여부: 결과·로딩·에러가 전혀 없는 상태
  const openHistoryPanel = () => {
    if (histOpenRef.current) return;
    if (histHideTimer.current) window.clearTimeout(histHideTimer.current);
    setHistory(loadHistory());
    setShowHistory(true);
    histOpenRef.current = true;
    // 폰의 뒤로가기로도 닫히도록 히스토리를 한 칸 쌓습니다.
    try {
      window.history.pushState({ dictHistoryPanel: true }, "");
      histPushedRef.current = true;
    } catch (e) {
      histPushedRef.current = false;
    }
  };

  const closeHistoryPanel = () => {
    if (!histOpenRef.current) return;
    histOpenRef.current = false;
    setShowHistory(false);
    if (histPushedRef.current) {
      histPushedRef.current = false;
      // 되돌린 히스토리가 아직 처리되지 않았음을 표시해 둡니다 (아래 시트 열기가 참고).
      try { histBackPendingRef.current = true; window.history.back(); }
      catch (e) { histBackPendingRef.current = false; }
    }
  };

  // ---- 담을 단어장 고르는 시트 ----
  // 폰의 뒤로가기로도 닫히도록 히스토리를 한 칸 쌓습니다 (최근 검색 플로팅과 같은 방식).
  const openSaveSheet = () => {
    if (sheetOpenRef.current) return;
    // 최근 검색 플로팅이 방금 닫히며 되돌린 히스토리가 아직 처리 중이면,
    // 지금 열어 봐야 곧 도착할 popstate 가 시트를 도로 닫습니다. 그 뒤로 미룹니다.
    if (histBackPendingRef.current) {
      wantSheetRef.current = true;
      return;
    }
    // 목록·단어 수 읽기와 "대상이 지워졌는지" 확인은 시트 컴포넌트가 열릴 때 합니다.
    // 여기서는 버튼 라벨에 쓸 이름만 새로 읽어 둡니다.
    setSaveTargets(loadSaveTargets());
    setSaveSheetOpen(true);
    sheetOpenRef.current = true;
    try {
      window.history.pushState({ dictSaveSheet: true }, "");
      sheetPushedRef.current = true;
    } catch (e) {
      sheetPushedRef.current = false;
    }
  };
  openSheetRef.current = openSaveSheet;

  const closeSaveSheet = () => {
    if (!sheetOpenRef.current) return;
    sheetOpenRef.current = false;
    setSaveSheetOpen(false);
    if (sheetPushedRef.current) {
      sheetPushedRef.current = false;
      try { sheetBackPendingRef.current = true; window.history.back(); }
      catch (e) { sheetBackPendingRef.current = false; }
    }
  };

  // 검색 영역 바깥을 누르면 닫습니다 (카드 등은 blur 가 안 나는 경우가 있음).
  useEffect(() => {
    if (!showHistory) return;
    const onDown = (e: any) => {
      const area = histAreaRef.current;
      if (area && e.target && area.contains(e.target)) return;
      closeHistoryPanel();
      try { inputRef.current?.blur(); } catch (err) {}
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory]);

  // 폰의 뒤로가기
  // 칸을 되돌아갈 때는 그 칸에 적힌 검색어(kataDict)의 결과를 다시 띄웁니다(캐시라 바로 뜸).
  // 검색어가 없는 칸이면 사전 첫 화면입니다. 시트·플로팅이 닫히는 뒤로가기는 결과를 건드리지 않습니다.
  const searchRef = useRef(handleSearch);
  searchRef.current = handleSearch;
  const resetRef = useRef(resetToHome);
  resetRef.current = resetToHome;
  useEffect(() => {
    const onPop = (ev: PopStateEvent) => {
      const panelBack = histBackPendingRef.current;
      const sheetBack = sheetBackPendingRef.current;
      histBackPendingRef.current = false;
      sheetBackPendingRef.current = false;
      let closedSomething = false;
      if (sheetOpenRef.current) {
        sheetOpenRef.current = false;
        sheetPushedRef.current = false;
        setSaveSheetOpen(false);
        closedSomething = true;
      } else if (histOpenRef.current) {
        histOpenRef.current = false;
        histPushedRef.current = false;
        setShowHistory(false);
        closedSomething = true;
      }
      // 플로팅이 닫히는 동안 미뤄 둔 검색 칸을 이제 쌓습니다.
      if (panelBack && pendingPushRef.current) {
        const w = pendingPushRef.current;
        pendingPushRef.current = null;
        try {
          const cur = (window.history.state || {}) as Record<string, unknown>;
          const next: Record<string, unknown> = { ...cur, kataDict: w };
          delete next.kataBackClose;
          delete next.dictHistoryPanel;
          delete next.dictSaveSheet;
          window.history.pushState(next, "");
        } catch (e) {}
      } else if (!panelBack && !sheetBack && !closedSomething) {
        // 진짜 뒤로가기: 사전 화면 안의 이전 결과로 (다른 화면으로 나가는 중이면 아무것도 하지 않음)
        let onDict = false;
        try { onDict = window.location.pathname.indexOf("/dictionary") >= 0; } catch (e) {}
        if (onDict) {
          const st = (ev && ev.state) as Record<string, unknown> | null;
          const t = st && typeof st.kataDict === "string" ? (st.kataDict as string) : "";
          if (t) {
            if (t !== lastTermRef.current) searchRef.current(t, "none");
          } else if (lastTermRef.current) {
            resetRef.current();
          }
        }
      }
      // 플로팅이 닫히길 기다리던 시트가 있으면 이제 엽니다.
      if (wantSheetRef.current) {
        wantSheetRef.current = false;
        openSheetRef.current?.();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (histHideTimer.current) window.clearTimeout(histHideTimer.current);
    };
  }, []);

  const isHome = !loading && !error && !result && !idSentence && !koWord && !koSentence;

  // ---- 음성 검색 ----
  // 듣기 언어 — 마이크 옆 한/IN 버튼으로 바꾸고 기기에 기억합니다(홈과 같은 값)
  const [voiceLang, setVoiceLangState] = useState<"ko" | "id">(() => loadVoiceLang());
  const setVoiceLang = (v: "ko" | "id") => { setVoiceLangState(v); saveVoiceLang(v); };
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startVoice = () => {
    if (!speechSupported) {
      toast("이 기기에서는 음성 검색을 쓸 수 없습니다");
      return;
    }
    // 이미 듣는 중이면 중지
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
        if (text) {
          setQuery(text);
          setListening(false);
          handleSearch(text);
        }
      };
      rec.onerror = (ev: any) => {
        setListening(false);
        if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
          toast("마이크 권한이 필요합니다. 설정에서 허용해 주세요");
        } else if (ev?.error === "no-speech") {
          toast("음성이 들리지 않았습니다. 다시 말해 보세요");
        }
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch (e) {
      setListening(false);
      toast("음성 검색을 시작할 수 없습니다");
    }
  };

  // 최근 검색 항목 길게 누르기 → 삭제 확인 (600ms, 앱 공통 롱프레스 시간)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // 폰 뒤로가기는 "검색 기록 삭제" 창만 닫습니다(QA Q03)
  useBackClose(!!deleteTarget, () => setDeleteTarget(null));
  const lpTimer = useRef<number | null>(null);
  const lpFiredRef = useRef(false);

  const cancelLongPress = () => {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; }
  };

  const startLongPress = (term: string) => {
    cancelLongPress();
    lpFiredRef.current = false;
    lpTimer.current = window.setTimeout(() => {
      lpFiredRef.current = true;
      setDeleteTarget(term);
      try { (navigator as any).vibrate?.(15); } catch (e) {}
    }, 600);
  };

  const confirmDeleteHistory = () => {
    if (deleteTarget) {
      setHistory(removeHistory(deleteTarget));
      toast("최근 검색에서 삭제되었습니다");
    }
    setDeleteTarget(null);
  };

  // /dictionary?q=단어 로 진입하면 자동 검색 (이야기 카드의 "사전에서 보기" 연결)
  const autoQueryDone = useRef(false);
  useEffect(() => {
    if (autoQueryDone.current) return;
    autoQueryDone.current = true;
    try {
      // 다시 들어온 칸에 검색어가 적혀 있으면(다른 화면에 갔다가 뒤로 돌아옴) 그 결과를 그대로 띄웁니다.
      const st = window.history.state as Record<string, unknown> | null;
      const kept = st && typeof st.kataDict === "string" ? (st.kataDict as string) : "";
      if (kept) {
        handleSearch(kept, "none");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        // 주소로 받은 첫 검색은 이 화면 칸 자체에 적습니다(뒤로가기 = 들어오기 전 화면)
        autoQueryPendingRef.current = true;
        handleSearch(q);
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대상이 바뀌거나 결과가 바뀌면 그 단어장 기준으로 '저장됨'을 다시 판정합니다.
  // (내 단어장에 있는 단어라도 설교 단어장에는 없으면 다시 담을 수 있어야 합니다)
  useEffect(() => {
    if (!result || !saveTargetId) {
      setSaved(false);
      return;
    }
    setSaved(hasWordInCategory(saveTargetId, result.word));
  }, [result, saveTargetId]);

  // 4열 정보만 개인 단어장에 저장 (이미지는 저장하지 않음)
  const handleSaveToWordbook = () => {
    if (!result || saved || !saveTargetId) return;
    const firstExample = result.examples[0];
    const { added } = addWordIfAbsent({
      word: result.word,
      meaning: result.meaning,
      example: firstExample?.id || "",
      exampleMeaning: firstExample?.ko || "",
      categoryId: saveTargetId,
    });
    setSaved(true);
    toast(added ? `${saveTargetName}에 담았습니다` : `이미 ${saveTargetName}에 있는 단어입니다`);
  };

  return (
    <div
      className={`w-full max-w-lg mx-auto overflow-x-clip bg-background flex flex-col ${isHome ? "" : "min-h-screen"}`}
      style={isHome ? { height: "calc(100dvh - var(--kata-tabbar-h, 0px))" } : undefined}
    >
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { dropReturnTicket(); navigate("/"); }}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">KAMUS BAHASA INDONESIA</h1>
      </header>

      {/* 최근 검색 항목 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body text-gray-900">검색 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 break-words">
              "{deleteTarget}" 을(를) 최근 검색에서 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHistory}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 예전의 "← 사과로" 돌아가기 플로팅 버튼은 2026-11-11 사용자 요청으로 뺐습니다.
          이제 결과마다 히스토리 칸이 있어 폰의 뒤로가기로 바로 전 결과로 돌아갑니다. */}

      <div className={isHome ? "px-4 pt-4 pb-0 flex-1 min-h-0 flex flex-col" : "px-4 pt-4 pb-10 flex flex-col gap-3"}>
        {/* 검색창 (시안: 46px 알약 + 청록 동그라미 "검색") */}
        <div ref={histAreaRef} className={`relative ${isHome ? "mb-2" : "mb-1"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 h-[46px] flex items-center gap-2 bg-card border border-[#E3E8EB] rounded-full pl-4 pr-1.5">
            <Search size={18} className="text-[#2C6D63] shrink-0" />
            <input
              ref={inputRef}
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              onFocus={openHistoryPanel}
              // 뒤로가기로 닫은 뒤에도 입력창은 포커스를 유지합니다.
              // 그때는 onFocus 가 안 떠므로 탭 자체로도 다시 열어줍니다.
              onClick={openHistoryPanel}
              onBlur={() => {
                // 목록을 탭할 때 먼저 닫히지 않도록 잠깐 기다립니다.
                histHideTimer.current = window.setTimeout(() => closeHistoryPanel(), 160);
              }}
              placeholder="단어·문장 (인니어/한국어)"
              className="flex-1 min-w-0 w-full bg-transparent outline-none font-body text-[0.9375rem] text-[#1D1F1E] placeholder:text-gray-400"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {/* 음성 검색 언어 (한 / IN) — 누를 때마다 바뀝니다 */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVoiceLang(voiceLang === "ko" ? "id" : "ko")}
              className="shrink-0 h-6 w-7 rounded-full bg-[#EEF3F2] text-[#2C6D63] font-gothic text-[11px] font-bold"
              title="음성 검색 언어 바꾸기"
              aria-label={voiceLang === "ko" ? "음성 검색 언어: 한국어" : "음성 검색 언어: 인도네시아어"}
            >
              {voiceLangLabel(voiceLang)}
            </button>
            {/* 마이크 */}
            <button
              onClick={startVoice}
              className={`shrink-0 w-9 h-9 flex items-center justify-center ${listening ? "text-red-500" : "text-[#646C72] hover:text-primary"}`}
              title="음성 검색"
              aria-label="음성 검색"
            >
              <Mic size={18} strokeWidth={1.8} />
            </button>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="shrink-0 w-[46px] h-[46px] rounded-full bg-[#2C6D63] text-white text-[0.75rem] font-gothic font-semibold flex items-center justify-center disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "검색"}
          </button>
        </div>

        {/* 최근 검색어 — 본문 위에 떠있는 플로팅 박스 (상단 기본 화면에는 같은 목록이 이미 있어 안 띄웁니다)
            검색창에 방금 찾은 말이 남아 있어도(Q10) 고치기 전까지는 목록을 띄웁니다. */}
        {showHistory && !isHome && (query.trim() === "" || query.trim() === lastTerm) && history.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl bg-card shadow-[0_10px_24px_-8px_rgba(8,32,38,0.35)]">
            {history.slice(0, 10).map((term, i, arr) => (
              <button
                key={term + i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { closeHistoryPanel(); handleSearch(term); }}
                className={
                  "w-full flex items-center gap-2.5 px-4 py-2.5 text-left active:bg-muted/60 transition-colors " +
                  (i === arr.length - 1 ? "" : "border-b border-border")
                }
              >
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-foreground/80">{term}</span>
              </button>
            ))}
          </div>
        ) : null}
        </div>

        {/* 음성 듣는 중 오버레이 */}
        {listening && (
          <div
            className="fixed inset-0 z-40 bg-black/50 flex flex-col items-center justify-center gap-5"
            onClick={startVoice}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-ping" />
              <span className="absolute w-20 h-20 rounded-full bg-red-500/40 animate-pulse" />
              <span className="relative w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                <Mic size={26} className="text-white" />
              </span>
            </div>
            <p className="text-white text-sm">
              {voiceLang === "ko" ? "한국어" : "인도네시아어"}로 말해주세요...
            </p>
            <p className="text-white/60 text-xs">탭하면 중지</p>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={28} className="animate-spin mb-3" />
            <p className="text-sm font-gothic">사전을 찾는 중입니다</p>
          </div>
        )}

        {/* 에러 (한도 안내 포함) */}
        {!loading && error && (
          <div className="rounded-[20px] bg-card px-5 py-8 text-center shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
            <p className="font-gothic text-[0.84375rem] leading-[1.7] text-[#34332F] break-keep">{error}</p>
          </div>
        )}

        {/* 초기 화면: 안내 문구 + 최근 검색 (바닥까지 이어지는 시트) */}
        {isHome && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="pt-1 pb-4 text-muted-foreground">
              <p className="text-xs flex items-center justify-center gap-1">
                <Search size={13} className="opacity-60 shrink-0" />
                <span>인니어·한국어 단어나 문장을 검색해 보세요</span>
              </p>
            </div>
            {history.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-1 px-1 font-gothic">최근 검색</p>
                {/* 바깥: 바닥까지 이어지는 흰 시트 / 안쪽: 리스트만 스크롤 + 아래로 갈수록 흐려지는 페이드 */}
                <div className="flex-1 min-h-0 bg-card rounded-t-xl overflow-hidden flex flex-col">
                  <ul
                    className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain pb-16"
                    style={{
                      scrollbarWidth: "none",
                      WebkitOverflowScrolling: "touch",
                      maskImage: "linear-gradient(to bottom, black 68%, rgba(0,0,0,0.35) 88%, transparent 100%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 68%, rgba(0,0,0,0.35) 88%, transparent 100%)",
                    } as React.CSSProperties}
                  >
                    {history.map((h, i) => (
                      <li key={i}>
                        <button
                          onClick={() => {
                            if (lpFiredRef.current) { lpFiredRef.current = false; return; }
                            handleSearch(h);
                          }}
                          onTouchStart={() => startLongPress(h)}
                          onTouchMove={cancelLongPress}
                          onTouchEnd={cancelLongPress}
                          onMouseDown={() => startLongPress(h)}
                          onMouseUp={cancelLongPress}
                          onMouseLeave={cancelLongPress}
                          onContextMenu={(e) => e.preventDefault()}
                          className={`w-full text-left px-4 py-1.5 flex items-center gap-2 hover:bg-black/5 select-none ${i > 0 ? "border-t border-gray-100" : ""}`}
                        >
                          <Search size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-900 break-words min-w-0 font-gothic">{h}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* (2) 인도네시아어 문장 결과 */}
        {!loading && idSentence && (
          <>
            {/* 끊어읽기: 인니어 / 한국어 (단어 결과와 같은 연민트 표제 카드) */}
            <HeroCard>
              <div className="flex min-w-0 items-start justify-between gap-2">
                {/* 문장 글자는 2026-11-11 사용자 요청으로 한 단계 작게(19 → 17.5px).
                    이 표제 문장 안의 낱말만 누르면 그 낱말을 사전에서 찾습니다(아래 단어 분석 등은 그대로). */}
                <p className="m-0 min-w-0 break-words font-word text-[1.09375rem] font-semibold leading-[1.6] text-[#104B60]">
                  {renderTappableSentence(chunkedSentence(idSentence))}
                </p>
                <HeroSpeaker onClick={() => speak(idSentence.original, "id")} title="문장 듣기" />
              </div>
              {idSentence.translation ? (
                <p className="m-0 mt-2 break-words text-[0.9375rem] leading-[1.6] text-[#2E3E3A]">
                  {idSentence.translation}
                </p>
              ) : null}
            </HeroCard>

            {(idSentence.wordAnalysis.length > 0 || idSentence.natural.id || idSentence.patterns.length > 0) && (
              <BodyCard>
                {/* 단어 분석 */}
                {idSentence.wordAnalysis.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <SectionTitle>단어 분석</SectionTitle>
                    {idSentence.wordAnalysis.map((w, i) => (
                      <div key={i} className="min-w-0">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="break-words font-word text-[1.0625rem] font-semibold text-[#104B60]">{w.word}</span>
                          <span className="min-w-0 flex-1 break-words font-gothic text-[0.8125rem] text-[#5E5D57]">{w.meaning}</span>
                          <button
                            onClick={() => speak(w.word, "id")}
                            className="-my-2 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center self-center text-[#1F4F4A]"
                            title="발음 듣기"
                            aria-label="발음 듣기"
                          >
                            <SpeakIcon size={15} />
                          </button>
                        </div>
                        {w.points.length > 0 && (
                          <ul className="m-0 mt-1 flex flex-col gap-1 pl-0">
                            {w.points.map((pt, j) => (
                              <li key={j} className="flex min-w-0 gap-2 font-gothic text-[0.8125rem] leading-[1.6] text-[#34332F]">
                                <span className="shrink-0 text-[#B59B6A]">·</span>
                                <span className="min-w-0 break-words">{latinSpans(pt)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {w.note && (
                          <p className="m-0 mt-1 break-words font-gothic text-[0.75rem] leading-[1.6] text-[#6B6A64]">{latinSpans(w.note)}</p>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* 더 자연스러운 표현 */}
                {idSentence.natural.id && (
                  <section className="flex flex-col gap-2.5">
                    <SectionTitle>더 자연스러운 표현</SectionTitle>
                    <div className="min-w-0 rounded-[14px] bg-[#F6F7F5] px-3.5 py-3">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <p className="m-0 min-w-0 break-words font-word text-[1rem] leading-[1.45]">
                          {idSentence.natural.id}
                        </p>
                        <RowSpeaker onClick={() => speak(idSentence.natural.id, "id")} title="발음 듣기" />
                      </div>
                      {idSentence.natural.ko && (
                        <p className="m-0 mt-1 break-words text-[0.8125rem] leading-[1.5] text-[#5E5D57]">
                          {idSentence.natural.ko}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* 핵심 문형 */}
                {idSentence.patterns.length > 0 && (
                  <section className="flex flex-col gap-2.5">
                    <SectionTitle>핵심 문형</SectionTitle>
                    {idSentence.patterns.map((p, i) => (
                      <div key={i} className="min-w-0 rounded-[14px] bg-[#F6F7F5] px-3.5 py-3">
                        <p className="m-0 break-words font-word text-[0.9375rem] font-semibold leading-[1.5] text-[#104B60]">
                          {renderPattern(p.pattern)}
                        </p>
                        {p.meaning && (
                          <p className="m-0 mt-1 break-words font-gothic text-[0.8125rem] leading-[1.6] text-[#34332F]">
                            = {p.meaning}
                          </p>
                        )}
                      </div>
                    ))}
                  </section>
                )}
              </BodyCard>
            )}
          </>
        )}

        {/* (3) 한국어 단어 결과 → 인니어 단어들 (빈도순) */}
        {/* 검색한 한국어 단어 제목·안내 줄은 2026-11-11 사용자 요청으로 뺐습니다 — 바로 1, 2, 3 후보가 나옵니다 */}
        {!loading && koWord && (
          <>
            <BodyCard>
              <section className="flex flex-col gap-2.5">
                {koWord.candidates.map((c, i) => (
                  <div key={i} className="flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-[#E6EAE8] px-3.5 py-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="w-3.5 shrink-0 font-word text-[0.9375rem] italic text-[#B59B6A]">{i + 1}</span>
                      {/* 표제어를 누르면 그 인니어 단어로 바로 사전 검색 */}
                      <button
                        onClick={() => handleSearch(c.id)}
                        className="min-w-0 break-words text-left font-word text-[1.125rem] font-semibold text-[#104B60] underline decoration-dotted decoration-[#104B60]/40 underline-offset-4 active:opacity-70"
                        title={`"${c.id}" 사전 검색`}
                      >
                        {c.id}
                      </button>
                      <span className="flex-1" />
                      <button
                        onClick={() => speak(c.id, "id")}
                        className="-my-2 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center self-center text-[#1F4F4A]"
                        title="발음 듣기"
                        aria-label="발음 듣기"
                      >
                        <SpeakIcon size={15} />
                      </button>
                    </div>
                    {/* 뜻(예: 과일 사과)은 2026-11-11 사용자 요청으로 한 단계 작게(15 → 13.5px) */}
                    <p className="m-0 break-words pl-6 text-[0.84375rem] font-semibold">{c.meaning}</p>
                    {(c.nuance || c.situation) && (
                      <p className="m-0 break-words pl-6 font-gothic text-[0.8125rem] leading-[1.6] text-[#5E5D57]">{[c.nuance, c.situation].filter(Boolean).join(", ")}</p>
                    )}
                    {c.example && (
                      <div className="mt-1.5 flex min-w-0 items-start gap-2 pl-6">
                        <div className="min-w-0 flex-1">
                          <p className="m-0 break-words font-word text-[0.9375rem] leading-[1.45]">{c.example}</p>
                          {c.exampleKo && <p className="m-0 break-words text-[0.8125rem] leading-[1.5] text-[#5E5D57]">{c.exampleKo}</p>}
                        </div>
                        <RowSpeaker onClick={() => speak(c.example, "id")} title="예문 듣기" />
                      </div>
                    )}
                  </div>
                ))}
              </section>
            </BodyCard>
          </>
        )}

        {/* (4) 한국어 문장 결과 → 인니어 (문어체/구어체) */}
        {!loading && koSentence && (
          <>
            <HeroCard>
              {/* 검색한 한국어 문장 — 2026-11-11 사용자 요청으로 한 단계 작게(17 → 15.5px) */}
              <p className="m-0 break-words text-[0.96875rem] font-semibold leading-[1.55]">{koSentence.query}</p>
            </HeroCard>
            <BodyCard>
              {[{ label: "구어체", bg: "#DDF0EA", fg: "#245A51", v: koSentence.casual }, { label: "문어체", bg: "#DCEAF6", fg: "#24506F", v: koSentence.formal }].map((row, i) => (
                row.v.id ? (
                  <section key={i} className="flex flex-col gap-1.5">
                    <span
                      className="flex h-5 items-center self-start rounded-[10px] px-2 font-gothic text-[0.6875rem] font-semibold"
                      style={{ background: row.bg, color: row.fg }}
                    >
                      {row.label}
                    </span>
                    <div className="flex min-w-0 items-start gap-2">
                      <p className="m-0 min-w-0 flex-1 break-words font-word text-[1.0625rem] font-semibold leading-[1.5] text-[#104B60]">{row.v.id}</p>
                      <RowSpeaker onClick={() => speak(row.v.id, "id")} title="문장 듣기" />
                    </div>
                  </section>
                ) : null
              ))}

              {koSentence.hardWords.length > 0 && (
                <section className="flex flex-col gap-2.5">
                  <SectionTitle>단어</SectionTitle>
                  <div className="grid grid-cols-[minmax(84px,auto)_1fr] gap-x-3 gap-y-2 rounded-[14px] bg-[#F6F7F5] px-3.5 py-3 font-gothic text-[0.8125rem]">
                    {koSentence.hardWords.map((h, i) => (
                      <Fragment key={i}>
                        <span className="break-words font-word text-[0.9375rem]">{h.word}</span>
                        <span className="min-w-0 break-words text-[#34332F]">{h.meaning}</span>
                      </Fragment>
                    ))}
                  </div>
                </section>
              )}
            </BodyCard>
          </>
        )}

        {/* (1) 인도네시아어 단어 결과 */}
        {!loading && result && (() => {
          const analysisRows = [
            { label: "어근", value: result.root },
            { label: "접사", value: result.affix },
            { label: "문어·구어", value: result.register },
          ].filter((r) => r.value);
          const related = RELATED_KINDS.flatMap((k) =>
            (result[k.key] || []).map((it, i) => ({ it, k, key: k.key + i }))
          );
          const freq = Math.max(1, Math.min(5, result.frequency || 1));
          const diff = Math.max(1, Math.min(5, result.difficulty || 1));
          const saveOff = saved || !saveTargetId;
          return (
            <>
              {/* 표제어 + 기본뜻 (연민트 카드) */}
              <HeroCard>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h2 className="m-0 min-w-0 break-words font-word text-[1.5rem] font-semibold leading-[1.25] text-[#104B60]">{result.word}</h2>
                  <HeroSpeaker onClick={() => speak(result.word, "id")} title="발음 듣기" />
                </div>
                <p className="m-0 mt-2 break-words text-[0.90625rem] font-semibold">{result.meaning}</p>
                {result.meaningDetail && (
                  <p className="m-0 mt-1 break-words font-gothic text-[0.78125rem] leading-[1.65] text-[#3F5550]">{latinSpans(result.meaningDetail)}</p>
                )}
              </HeroCard>

              {(result.examples.length > 0 || analysisRows.length > 0 || result.etymology.length > 0 || related.length > 0) && (
                <BodyCard>
                  {/* 예문 */}
                  {result.examples.length > 0 && (
                    <section className="flex flex-col gap-3">
                      <SectionTitle>예문</SectionTitle>
                      {result.examples.map((ex, i) => (
                        <ExampleRow key={i} id={ex.id} ko={ex.ko} />
                      ))}
                    </section>
                  )}

                  {/* 단어 분석 (회색 상자 안 2열 표) */}
                  {analysisRows.length > 0 && (
                    <section className="flex flex-col gap-2.5">
                      <SectionTitle>단어 분석</SectionTitle>
                      <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-y-2 rounded-[14px] bg-[#F6F7F5] px-3.5 py-3 font-gothic text-[0.8125rem] leading-[1.55]">
                        {analysisRows.map((r) => (
                          <Fragment key={r.label}>
                            <span className="text-[#6B6A64]">{r.label}</span>
                            <span className="min-w-0 break-words">{latinSpans(r.value, "text-[0.9375rem]")}</span>
                          </Fragment>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 단어 배경 */}
                  {result.etymology.length > 0 && (
                    <section className="flex flex-col gap-2.5">
                      <SectionTitle>단어 배경</SectionTitle>
                      <div className="flex flex-col gap-2 font-gothic text-[0.8125rem] leading-[1.65] text-[#34332F]">
                        {result.etymology.map((e, i) => (
                          <p key={i} className="m-0 break-words">{latinSpans(e)}</p>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 형태와 관련 단어 — 능동형·수동형·반대·유사·파생을 꼬리표 카드 하나로 */}
                  {related.length > 0 && (
                    <section className="flex flex-col gap-2.5">
                      <SectionTitle>형태와 관련 단어</SectionTitle>
                      {related.map(({ it, k, key }) => (
                        <RelatedCard key={key} it={it} title={k.title} bg={k.bg} fg={k.fg} />
                      ))}
                    </section>
                  )}
                </BodyCard>
              )}

              {/* 회화 사용빈도 / 난이도 (작은 카드 두 칸) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-card px-3.5 py-3">
                  <p className="m-0 font-gothic text-[0.75rem] text-[#5B6469]">회화 사용빈도</p>
                  <p className="m-0 mt-1 font-gothic text-[0.84375rem] font-bold text-[#B4501F]">{FREQ_LABEL[freq]}</p>
                  <Bars n={freq} on="#EC7F51" />
                </div>
                <div className="rounded-2xl bg-card px-3.5 py-3">
                  <p className="m-0 font-gothic text-[0.75rem] text-[#5B6469]">난이도</p>
                  <p className="m-0 mt-1 font-gothic text-[0.84375rem] font-bold text-[#2C6D63]">{DIFF_LABEL[diff]}</p>
                  <Bars n={diff} on="#2C6D63" />
                </div>
              </div>

              {/* 고른 단어장에 보내기 (본체=바로 담기 / ⌄=대상 고르기) */}
              <div
                className={`mt-1.5 flex overflow-hidden rounded-[26px] font-gothic text-[0.875rem] font-semibold ${
                  saveOff ? "" : "shadow-[0_4px_14px_rgba(44,109,99,0.18)]"
                }`}
              >
                <button
                  onClick={handleSaveToWordbook}
                  disabled={saveOff}
                  className={`flex h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 px-3 ${
                    saved
                      ? "bg-[#E3EEEC] text-[#2C6D63]"
                      : !saveTargetId
                        ? "bg-gray-100 text-gray-400"
                        : "bg-[#2C6D63] text-white active:bg-[#24594F]"
                  }`}
                >
                  {saved ? <Check size={16} strokeWidth={2.2} className="shrink-0" /> : <Plus size={16} strokeWidth={2.2} className="shrink-0" />}
                  <span className="truncate">
                    {saved
                      ? "저장됨"
                      : saveTargetId
                        ? saveTargetName + "에 담기"
                        : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                {/* 담긴 뒤에도 다른 단어장에는 담을 수 있으므로 기능은 살려 두고,
                    한 알약이 반쪽씩 다른 색으로 보이지 않게 색만 본체와 맞춥니다 */}
                <button
                  onClick={(e) => { e.stopPropagation(); openSaveSheet(); }}
                  title="담을 단어장 고르기"
                  aria-label="담을 단어장 고르기"
                  className={`flex h-[44px] w-[54px] shrink-0 items-center justify-center border-l ${
                    saved
                      ? "border-[#2C6D63]/15 bg-[#E3EEEC] text-[#2C6D63]"
                      : !saveTargetId
                        ? "border-gray-300 bg-gray-100 text-gray-400"
                        : "border-white/30 bg-[#2C6D63] text-white active:bg-[#24594F]"
                  }`}
                >
                  <ChevronDown size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* AI 풀이 신고 — 스토어 앱(공개판)에서만 보입니다. 담기 버튼 아래 가운데 작은 글자로 둡니다 */}
              <div className="flex justify-center [&>div>button]:text-[#6B7479]">
                <AiReportButton
                  feature="dictionary"
                  input={result.word}
                  output={result.meaning + (result.meaningDetail ? " / " + result.meaningDetail : "")}
                  className="flex flex-col items-center"
                />
              </div>
            </>
          );
        })()}
      </div>

      {/* 담을 단어장 고르는 시트 (사전·단어 팝업 공용) */}
      <WordbookPickerSheet
        open={saveSheetOpen}
        onOpenChange={(o) => { if (!o) closeSaveSheet(); }}
        targetId={saveTargetId}
        onPick={chooseSaveTarget}
        onChanged={() => setSaveTargets(loadSaveTargets())}
      />
    </div>
  );
};

export default Dictionary;
