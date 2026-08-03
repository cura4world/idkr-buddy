import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Volume2, ImageIcon, Plus, Check, Loader2, Mic, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  lookupWord,
  generateWordImage,
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
} from "@/lib/dictionary";
import { hasGeminiApiKey } from "@/lib/gemini";
import { addWordIfAbsent, hasWordInCategory, getCategories, getWordsByCategory } from "@/lib/store";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import { getStoredImage, saveStoredImage } from "@/lib/imageStore";
import { dictCacheKey, getCachedResult, saveCachedResult } from "@/lib/dictStore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const MY_WORDBOOK_ID = "my-wordbook";

// 사전에서 마지막으로 고른 '담을 단어장'을 기억해 둡니다 (다음 검색에도 이어집니다).
const DICT_SAVE_TARGET_KEY = "dict-save-target";

// 담을 수 있는 곳은 내 단어장과 사용자가 만든 단어장뿐입니다.
// 공용 단어장은 배포 때마다 시드로 덮어써지므로 대상에서 뺍니다.
// getCategories 가 '내 단어장'을 항상 맨 앞에 두므로 순서는 그대로 씁니다.
const loadSaveTargets = () => getCategories().filter((c) => !c.isShared);

// 기억해 둔 대상이 그사이 삭제됐을 수 있으므로, 지금 목록에 있는지 반드시 확인합니다.
const loadSaveTargetId = (targets: { id: string }[]): string => {
  let stored = "";
  try { stored = localStorage.getItem(DICT_SAVE_TARGET_KEY) || ""; } catch (e) {}
  if (stored && targets.some((c) => c.id === stored)) return stored;
  if (targets.some((c) => c.id === MY_WORDBOOK_ID)) return MY_WORDBOOK_ID;
  return targets.length > 0 ? targets[0].id : "";
};

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

// 별점 (채움: 포인트색, 빈칸: 연회색)
const Stars = ({ n }: { n: number }) => {
  const full = Math.max(0, Math.min(5, n));
  return (
    <span>
      <span className="text-accent">{"★".repeat(full)}</span>
      <span className="text-gray-300">{"☆".repeat(5 - full)}</span>
    </span>
  );
};

const Divider = () => <div className="border-t border-gray-200 my-5" />;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-gray-900 mb-2.5">{children}</h3>
);

// 능동형/수동형/반대/비슷한/파생 단어 공통 카드 섹션
const RelatedSection = ({ title, items }: { title: string; items: DictRelatedItem[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg bg-black/5 px-3 py-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-base font-semibold text-gray-900 break-words min-w-0">{it.word}</p>
              <button
                onClick={() => speak(it.word, "id")}
                className="shrink-0 text-primary/70 hover:text-primary"
                title="발음 듣기"
              >
                <Volume2 size={14} />
              </button>
            </div>
            {it.meaning && (
              <p className="text-xs text-gray-500 break-words mt-0.5 font-gothic">{it.meaning}</p>
            )}
            {it.example && (
              <div className="mt-1">
                <p className="text-sm text-gray-800 break-words">{it.example}</p>
                {it.exampleKo && <p className="text-xs text-gray-500 break-words">{it.exampleKo}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};

// 세션 메모리 캐시(빠른 재조회용). 영구 저장은 IndexedDB(imageStore).
const imageCache = new Map<string, string>();

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

// "복숭아" → "복숭아로", "사람" → "사람으로" (받침에 따라 조사 선택)
function withRo(word: string): string {
  const t = (word || "").trim();
  if (!t) return t;
  const code = t.charCodeAt(t.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return t + (jong === 0 || jong === 8 ? "로" : "으로"); // 받침 없음 / ㄹ 받침 → "로"
  }
  return t + "로";
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
  // 한국어 단어 결과에서 인니어 표제어를 눌러 들어왔을 때, 돌아갈 한국어 단어
  const [koBackTerm, setKoBackTerm] = useState<string | null>(null);
  // 지금 화면에 떠 있는 결과의 검색어. query는 검색 직후 비워지므로 따로 들고 있어야
  // "다시 검색"이 무엇을 다시 찾을지 알 수 있습니다.
  const [lastTerm, setLastTerm] = useState("");

  const [imgUrl, setImgUrl] = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");

  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---- 담을 단어장(대상) ----
  const [saveTargets, setSaveTargets] = useState(loadSaveTargets);
  const [saveTargetId, setSaveTargetId] = useState(() => loadSaveTargetId(loadSaveTargets()));
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const sheetOpenRef = useRef(false);
  const sheetPushedRef = useRef(false);
  const wantSheetRef = useRef(false);
  const openSheetRef = useRef<(() => void) | null>(null);

  const saveTarget = saveTargets.find((c) => c.id === saveTargetId) || null;
  const saveTargetName = saveTarget ? saveTarget.name : "";

  const chooseSaveTarget = (id: string) => {
    setSaveTargetId(id);
    try { localStorage.setItem(DICT_SAVE_TARGET_KEY, id); } catch (e) {}
  };

  // 검색창을 누르면 최근 검색어를 플로팅으로 보여줍니다.
  const [showHistory, setShowHistory] = useState(false);
  const histAreaRef = useRef<HTMLDivElement>(null);
  const histOpenRef = useRef(false);
  const histPushedRef = useRef(false);
  const histBackPendingRef = useRef(false);
  const histHideTimer = useRef<any>(null);

  const errorMessage = (code: string): string => {
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

  // 이미 본 단어면 저장된 이미지를 자동 표시. 안 본 단어면 버튼이 뜸(비용 절감).
  const showStoredImageFor = async (word: string) => {
    const key = word.toLowerCase();
    const mem = imageCache.get(key);
    if (mem) {
      setImgUrl(mem);
      return;
    }
    const stored = await getStoredImage(word);
    if (stored) {
      imageCache.set(key, stored);
      setImgUrl(stored);
    }
  };

  // backTerm: 한국어 단어 결과의 인니어 표제어를 눌러 들어온 경우, 돌아갈 한국어 단어
  // forceRefresh: 캐시를 무시하고 새로 받아 캐시를 덮어씀 ("다시 검색" 버튼)
  const handleSearch = async (term?: string, backTerm?: string, forceRefresh?: boolean) => {
    const w = (term ?? query).trim();
    if (!w) return;
    if (!hasGeminiApiKey()) {
      setError("Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.");
      setResult(null);
      setQuery(w); // 입력한 내용 유지
      return;
    }
    inputRef.current?.blur();
    setQuery("");
    const detected = detectInputKind(w);
    const cacheKey = dictCacheKey(detected, w);

    // 결과 종류와 무관한 공통 초기화. 캐시 적중 경로와 API 경로가 함께 씁니다.
    const resetForNewSearch = () => {
      setError("");
      setResult(null);
      setIdSentence(null);
      setKoWord(null);
      setKoSentence(null);
      setImgUrl("");
      setImgError("");
      setSaved(false);
      setKind(detected);
      setKoBackTerm(backTerm ? backTerm.trim() : null);
      setLastTerm(w); // "다시 검색" 버튼이 쓸 현재 검색어
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
          await showStoredImageFor(r.word);
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
        await showStoredImageFor(r.word);
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
      finishSuccess();
    } catch (e: any) {
      setError(errorMessage(e?.message || ""));
      setQuery(w); // 검색 실패 시 입력한 내용을 검색창에 되돌려 둠 (다시 타이핑할 필요 없음)
      // 실패한 결과는 캐시에 저장하지 않습니다.
    } finally {
      setLoading(false);
    }
  };

  // 결과 화면 상태만 초기화 (히스토리는 건드리지 않음)
  const resetToHome = () => {
    setResult(null);
    setIdSentence(null);
    setKoWord(null);
    setKoSentence(null);
    setError("");
    setImgUrl("");
    setImgError("");
    setKind(null);
    setQuery("");
    setKoBackTerm(null);
    setLastTerm("");
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
    const next = loadSaveTargets();
    const counts: Record<string, number> = {};
    for (const c of next) counts[c.id] = getWordsByCategory(c.id).length;
    setSaveTargets(next);
    setSaveCounts(counts);
    setSaveSheetOpen(true);
    // 다른 화면에서 대상 단어장을 지웠을 수 있으므로 다시 확인합니다.
    if (!next.some((c) => c.id === saveTargetId)) chooseSaveTarget(loadSaveTargetId(next));
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
      try { window.history.back(); } catch (e) {}
    }
  };

  // 새 단어장 만들기: 시트를 먼저 닫고 다이얼로그를 엽니다 (히스토리가 겹치지 않도록).
  const openAddCategory = () => {
    closeSaveSheet();
    setAddCategoryOpen(true);
  };

  // 만들어진 단어장을 바로 대상으로 삼습니다.
  // addCategory 가 '내 단어장' 바로 뒤에 넣으므로, 내 단어장을 뺀 첫 번째가 방금 만든 것입니다.
  const handleCategoryAdded = () => {
    const next = loadSaveTargets();
    setSaveTargets(next);
    const fresh = next.filter((c) => c.id !== MY_WORDBOOK_ID)[0];
    if (fresh) chooseSaveTarget(fresh.id);
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
  useEffect(() => {
    const onPop = () => {
      histBackPendingRef.current = false;
      if (sheetOpenRef.current) {
        sheetOpenRef.current = false;
        sheetPushedRef.current = false;
        setSaveSheetOpen(false);
      } else if (histOpenRef.current) {
        histOpenRef.current = false;
        histPushedRef.current = false;
        setShowHistory(false);
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
  const [voiceLang, setVoiceLang] = useState<"ko" | "id">("ko"); // 듣기 언어
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startVoice = () => {
    if (!speechSupported) {
      toast("이 기기에서는 음성 검색을 지원하지 않아요");
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
          toast("마이크 권한이 필요해요. 설정에서 허용해주세요");
        } else if (ev?.error === "no-speech") {
          toast("음성이 들리지 않았어요. 다시 시도해주세요");
        }
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch (e) {
      setListening(false);
      toast("음성 검색을 시작할 수 없어요");
    }
  };

  // 최근 검색 항목 길게 누르기 → 삭제 확인 (600ms, 앱 공통 롱프레스 시간)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) handleSearch(q);
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const imgReqId = useRef(0);

  const imgErrorMessage = (code: string): string => {
    if (code === "RATE_LIMIT") return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
    if (code === "NO_IMAGE") return "모델이 이미지를 만들지 못했어요.";
    if (code === "IMAGE_FAILED_-1") return "네트워크 오류로 이미지를 불러오지 못했어요.";
    if (code.indexOf("IMAGE_FAILED_") === 0) return "이미지 생성에 실패했습니다 (오류 " + code.replace("IMAGE_FAILED_", "") + ")";
    return "이미지 생성에 실패했습니다.";
  };

  // "이미지 보기" 버튼/재시도에서 호출. 저장소에 있으면 재사용, 없을 때만 생성 후 영구 저장.
  const loadImage = async (word: string, meaning: string) => {
    const key = word.toLowerCase();

    // 1) 세션 메모리
    const mem = imageCache.get(key);
    if (mem) { setImgUrl(mem); setImgError(""); return; }

    // 2) 영구 저장(IndexedDB)
    const stored = await getStoredImage(word);
    if (stored) {
      imageCache.set(key, stored);
      setImgUrl(stored);
      setImgError("");
      return;
    }

    // 3) 새로 생성
    const reqId = ++imgReqId.current;
    setImgLoading(true);
    setImgUrl("");
    setImgError("");
    try {
      const url = await generateWordImage(word, meaning);
      imageCache.set(key, url);
      const { overflowed } = await saveStoredImage(word, url);
      if (imgReqId.current === reqId) setImgUrl(url);
      if (overflowed) {
        toast("저장된 사전 이미지가 5,000장을 넘어, 오래된 이미지부터 자동 정리됩니다.");
      }
    } catch (e: any) {
      if (imgReqId.current === reqId) setImgError(imgErrorMessage(e?.message || ""));
    } finally {
      if (imgReqId.current === reqId) setImgLoading(false);
    }
  };

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
    <div className={`w-full max-w-lg mx-auto overflow-x-clip bg-background flex flex-col ${isHome ? "h-[100dvh]" : "min-h-screen"}`}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
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
              "{deleteTarget}" 을(를) 최근 검색에서 삭제할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHistory}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 검색했던 한국어 단어로 돌아가기 플로팅 버튼 (인니어 표제어를 눌러 들어온 경우)
          이건 같은 화면 안에서 이전 검색 결과를 다시 띄우는 것이라
          폰의 뒤로가기로는 돌아갈 수 없어 남겨 둡니다. */}
      {koBackTerm && !isHome && (
        <button
          onClick={() => handleSearch(koBackTerm)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2.5 text-sm font-medium shadow-lg"
          title={`"${koBackTerm}" 검색 결과로 돌아가기`}
        >
          <ArrowLeft size={16} /> {withRo(koBackTerm)}
        </button>
      )}

      <div className={isHome ? "px-4 pt-4 pb-0 flex-1 min-h-0 flex flex-col" : "px-4 py-4"}>
        {/* 검색창 */}
        <div ref={histAreaRef} className={`relative ${isHome ? "mb-2" : "mb-4"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5">
            <Search size={18} className="text-gray-400 shrink-0" />
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
              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {/* 마이크 */}
            <button
              onClick={startVoice}
              className={`shrink-0 ${listening ? "text-red-500" : "text-gray-400 hover:text-primary"}`}
              title="음성 검색"
            >
              <Mic size={18} />
            </button>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="shrink-0 w-11 h-11 rounded-full bg-primary/10 text-primary text-[0.75rem] font-gothic font-medium flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "검색"}
          </button>
        </div>

        {/* 최근 검색어 — 본문 위에 떠있는 플로팅 박스 (상단 기본 화면에는 같은 목록이 이미 있어 안 띄웁니다) */}
        {showHistory && !isHome && query.trim() === "" && history.length > 0 ? (
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
            <p className="text-sm">사전을 찾고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="text-center py-12 text-foreground/80">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 초기 화면: 안내 문구 + 최근 검색 (바닥까지 이어지는 시트) */}
        {isHome && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="pt-1 pb-4 text-muted-foreground">
              <p className="text-xs flex items-center justify-center gap-1">
                <Search size={13} className="opacity-60 shrink-0" />
                <span>인니어·한국어 단어나 문장을 검색해보세요</span>
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
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5 content-bump">
            {/* 끊어읽기: 인니어 / 한국어 */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-words font-word leading-relaxed">
                  {chunkedSentence(idSentence)}
                </p>
                <p className="text-xs text-gray-600 mt-1.5 break-words leading-relaxed font-gothic">
                  {idSentence.translation}
                </p>
              </div>
              <button
                onClick={() => speak(idSentence.original, "id")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="문장 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>

            {/* 단어 분석 */}
            {idSentence.wordAnalysis.length > 0 && (
              <>
                <Divider />
                <SectionTitle>단어 분석</SectionTitle>
                <div className="space-y-3.5">
                  {idSentence.wordAnalysis.map((w, i) => (
                    <div key={i} className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-semibold text-primary break-words font-word">{w.word}</span>
                        <button
                          onClick={() => speak(w.word, "id")}
                          className="shrink-0 text-primary/70 hover:text-primary"
                          title="발음 듣기"
                        >
                          <Volume2 size={14} />
                        </button>
                        {w.meaning && (
                          <span className="text-xs text-gray-800 break-words font-gothic">{w.meaning}</span>
                        )}
                      </div>
                      {w.points.length > 0 && (
                        <ul className="mt-1 space-y-1 pl-1">
                          {w.points.map((pt, j) => (
                            <li key={j} className="flex gap-2 min-w-0 text-xs text-gray-600 font-gothic">
                              <span className="text-gray-400 shrink-0">•</span>
                              <span className="min-w-0 break-words">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {w.note && (
                        <p className="mt-1 text-xs text-gray-500 break-words font-gothic leading-relaxed">{w.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 더 자연스러운 표현 */}
            {idSentence.natural.id && (
              <>
                <Divider />
                <SectionTitle>더 자연스러운 표현</SectionTitle>
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-3.5 py-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words font-word leading-relaxed min-w-0">
                      {idSentence.natural.id}
                    </p>
                    <button
                      onClick={() => speak(idSentence.natural.id, "id")}
                      className="shrink-0 text-primary/70 hover:text-primary"
                      title="발음 듣기"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                  {idSentence.natural.ko && (
                    <p className="text-xs text-gray-600 mt-1.5 break-words font-gothic leading-relaxed">
                      {idSentence.natural.ko}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 핵심 문형 */}
            {idSentence.patterns.length > 0 && (
              <>
                <Divider />
                <SectionTitle>핵심 문형</SectionTitle>
                <div className="space-y-2.5">
                  {idSentence.patterns.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-gray-50 border border-gray-200 px-3.5 py-3 min-w-0"
                    >
                      <p className="text-sm font-semibold text-gray-900 break-words font-word leading-relaxed">
                        {renderPattern(p.pattern)}
                      </p>
                      {p.meaning && (
                        <p className="text-xs text-gray-600 mt-1.5 break-words font-gothic leading-relaxed">
                          = {p.meaning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* (3) 한국어 단어 결과 → 인니어 단어들 (빈도순) */}
        {!loading && koWord && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5 content-bump">
            {koWord.candidates.map((c, i) => (
              <div key={i} className={i === 0 ? "min-w-0" : "min-w-0 mt-4 pt-4 border-t border-gray-200"}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-gray-900 font-bold">{i + 1}</span>
                  {/* 표제어를 누르면 그 인니어 단어로 바로 사전 검색 */}
                  <button
                    onClick={() => handleSearch(c.id, koWord.query)}
                    className="text-base font-bold text-primary break-words min-w-0 text-left underline decoration-primary/30 underline-offset-4 hover:decoration-primary active:opacity-70"
                    title={`"${c.id}" 사전 검색`}
                  >
                    {c.id}
                  </button>
                  <button
                    onClick={() => speak(c.id, "id")}
                    className="shrink-0 text-primary/70 hover:text-primary"
                    title="발음 듣기"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-1 break-words pl-5">{c.meaning}</p>
                {(c.nuance || c.situation) && (
                  <p className="text-xs text-gray-500 mt-0.5 break-words pl-5 font-gothic">{[c.nuance, c.situation].filter(Boolean).join(", ")}</p>
                )}
                {c.example && (
                  <div className="mt-1.5 pl-5">
                    <div className="flex items-start gap-2 min-w-0">
                      <p className="text-sm text-gray-800 flex-1 min-w-0 break-words">{c.example}</p>
                      <button
                        onClick={() => speak(c.example, "id")}
                        className="shrink-0 text-primary/70 hover:text-primary"
                        title="예문 듣기"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    {c.exampleKo && <p className="text-xs text-gray-500 break-words">{c.exampleKo}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* (4) 한국어 문장 결과 → 인니어 (문어체/구어체) */}
        {!loading && koSentence && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5 content-bump">
            <h2 className="text-xs font-medium text-gray-500 break-words">{koSentence.query}</h2>
            {[{ label: "구어체", v: koSentence.casual }, { label: "문어체", v: koSentence.formal }].map((row, i) => (
              row.v.id ? (
                <div key={i} className={i === 0 ? "mt-3" : "mt-3 pt-3 border-t border-gray-200"}>
                  <span className="inline-block text-[0.6875rem] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">{row.label}</span>
                  <div className="flex items-start gap-2 min-w-0">
                    <p className="text-base font-semibold text-gray-900 break-words min-w-0 flex-1">{row.v.id}</p>
                    <button
                      onClick={() => speak(row.v.id, "id")}
                      className="shrink-0 text-primary/70 hover:text-primary mt-0.5"
                      title="문장 듣기"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              ) : null
            ))}

            {koSentence.hardWords.length > 0 && (
              <>
                <Divider />
                <ul className="space-y-1.5 text-xs text-gray-800 font-gothic">
                  {koSentence.hardWords.map((h, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400">•</span>
                      <span className="min-w-0 break-words"><span className="font-semibold text-gray-900">{h.word}</span> <span className="text-[0.6875rem]">{h.meaning}</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* (1) 인도네시아어 단어 결과 */}
        {!loading && result && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5 content-bump">
            {/* 표제어 + 기본뜻 */}
            <div className="flex items-start justify-between gap-2 mb-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 break-words min-w-0">{result.word}</h2>
              <button
                onClick={() => speak(result.word, "id")}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                title="발음 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p className="text-sm font-medium text-gray-900 break-words">{result.meaning}</p>
            {result.meaningDetail && (
              <p className="text-[0.6875rem] text-gray-500 mt-1 break-words font-gothic leading-relaxed">{result.meaningDetail}</p>
            )}

            {/* 예문 */}
            {result.examples.length > 0 && (
              <>
                <Divider />
                <SectionTitle>예문</SectionTitle>
                <ol className="space-y-3">
                  {result.examples.map((ex, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400 text-sm shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <p className="text-sm text-gray-900 flex-1 min-w-0 break-words">{ex.id}</p>
                          <button
                            onClick={() => speak(ex.id, "id")}
                            className="shrink-0 text-primary/70 hover:text-primary"
                            title="예문 듣기"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 break-words">{ex.ko}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* 단어 분석 */}
            {(result.root || result.affix || result.register) && (
              <>
                <Divider />
                <SectionTitle>단어 분석</SectionTitle>
                <ul className="space-y-1.5 text-xs text-foreground/80 font-gothic">
                  {result.root && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">어근:</span> {result.root}</span></li>}
                  {result.affix && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">접사:</span> {result.affix}</span></li>}
                  {result.register && <li className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words"><span className="font-medium text-gray-900">문어체/구어체:</span> {result.register}</span></li>}
                </ul>
              </>
            )}

            {/* 단어 배경 */}
            {result.etymology.length > 0 && (
              <>
                <Divider />
                <SectionTitle>단어 배경</SectionTitle>
                <ul className="space-y-1.5 text-xs text-foreground/80 font-gothic">
                  {result.etymology.map((e, i) => (
                    <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span className="min-w-0 break-words">{e}</span></li>
                  ))}
                </ul>
              </>
            )}

            {/* 능동형·수동형·반대·비슷한·파생 단어 (통일 카드) */}
            <RelatedSection title="능동형" items={result.activeForms} />
            <RelatedSection title="수동형" items={result.passiveForms} />
            <RelatedSection title="반대 단어" items={result.opposites} />
            <RelatedSection title="비슷한 단어" items={result.similar} />
            <RelatedSection title="파생 단어" items={result.derived} />

            {/* 사용빈도 / 난이도 */}
            <Divider />
            <div className="space-y-1 text-xs text-gray-900">
              <p><span className="font-semibold">실제 회화 사용빈도</span> <Stars n={result.frequency} /></p>
              <p><span className="font-semibold">난이도</span> <Stars n={result.difficulty} /></p>
            </div>

            {/* 고른 단어장에 보내기 (본체=바로 담기 / ⌄=대상 고르기) */}
            <div className="mt-6">
              <div className="w-full flex items-stretch overflow-hidden rounded-full text-xs font-medium">
                <button
                  onClick={handleSaveToWordbook}
                  disabled={saved || !saveTargetId}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 transition-colors ${
                    saved || !saveTargetId
                      ? "bg-gray-100 text-gray-400"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {saved ? <Check size={14} className="shrink-0" /> : <Plus size={14} className="shrink-0" />}
                  <span className="truncate">
                    {saved
                      ? "저장됨"
                      : saveTargetId
                        ? `${saveTargetName}에 보내기`
                        : "단어장을 먼저 만들어 주세요"}
                  </span>
                </button>
                {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로
                    ⌄ 는 잠그지 않고 색도 살려 둡니다 (본체만 잠깁니다) */}
                <button
                  onClick={(e) => { e.stopPropagation(); openSaveSheet(); }}
                  title="담을 단어장 고르기"
                  className="shrink-0 flex items-center px-4 border-l border-white/30 bg-primary text-white transition-colors hover:bg-primary/90"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 담을 단어장 고르는 시트 */}
      {saveSheetOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeSaveSheet} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <h2 className="px-4 pb-3 text-sm font-semibold text-foreground">어디에 담을까요?</h2>
            <div className="max-h-[45vh] overflow-y-auto border-t border-border">
              {saveTargets.length === 0 ? (
                <p className="px-4 py-4 text-[0.75rem] leading-relaxed text-muted-foreground">
                  담을 단어장이 없습니다. 아래에서 새 단어장을 만들어 주세요.
                </p>
              ) : (
                saveTargets.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { chooseSaveTarget(c.id); closeSaveSheet(); }}
                    className="flex w-full items-center gap-2.5 border-b border-border px-4 py-2.5 text-left active:bg-muted/60"
                  >
                    <span className="shrink-0 text-[0.9375rem]">{c.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground">{saveCounts[c.id] ?? 0}</span>
                    <span className="w-4 shrink-0 text-primary">
                      {c.id === saveTargetId ? <Check size={14} /> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={openAddCategory}
              className="flex w-full items-center gap-2 px-4 py-3 text-[0.8125rem] text-primary active:bg-muted/60"
            >
              <Plus size={14} /> 새 단어장 만들기
            </button>
          </div>
        </>
      ) : null}

      <AddCategoryDialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen} onAdded={handleCategoryAdded} />
    </div>
  );
};

export default Dictionary;
