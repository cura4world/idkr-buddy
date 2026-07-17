import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Volume2, ImageIcon, Plus, Check, Loader2, Home, Mic, ScrollText } from "lucide-react";
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
import { addWordIfAbsent, hasWordInCategory } from "@/lib/store";
import { getStoredImage, saveStoredImage } from "@/lib/imageStore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const MY_WORDBOOK_ID = "my-wordbook";

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

const Dictionary = () => {
  const navigate = useNavigate();
  // 이야기 카드의 "사전에서 보기"로 진입했는지 (돌아가기 플로팅 버튼 표시)
  const [fromStory] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("from") === "story"; } catch (e) { return false; }
  });
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<InputKind | null>(null);
  const [result, setResult] = useState<DictResult | null>(null);
  const [idSentence, setIdSentence] = useState<IdSentenceResult | null>(null);
  const [koWord, setKoWord] = useState<KoWordResult | null>(null);
  const [koSentence, setKoSentence] = useState<KoSentenceResult | null>(null);
  const [error, setError] = useState("");

  const [imgUrl, setImgUrl] = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState("");

  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const errorMessage = (code: string): string => {
    if (code === "NO_API_KEY") return "Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.";
    if (code === "INVALID_API_KEY") return "API 키가 올바르지 않습니다. 설정에서 다시 확인해주세요.";
    if (code === "RATE_LIMIT") return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
    if (code === "EMPTY_WORD") return "단어를 입력해주세요.";
    return "검색에 실패했습니다. 잠시 후 다시 시도해주세요.";
  };

  // 검색 결과를 볼 때 히스토리를 한 칸 쌓아두었는지 여부
  const resultStateRef = useRef(false);

  const handleSearch = async (term?: string) => {
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
    setLoading(true);
    setError("");
    setResult(null);
    setIdSentence(null);
    setKoWord(null);
    setKoSentence(null);
    setImgUrl("");
    setImgError("");
    setSaved(false);
    setKind(detected);
    try {
      if (detected === "id_word") {
        const r = await lookupWord(w);
        setResult(r);
        // 이미 내 단어장에 있는 단어면 "저장됨"으로 표시
        if (hasWordInCategory(MY_WORDBOOK_ID, r.word)) setSaved(true);
        // 이미 본 단어면 저장된 이미지를 자동 표시. 안 본 단어면 버튼이 뜸(비용 절감).
        const key = r.word.toLowerCase();
        const mem = imageCache.get(key);
        if (mem) {
          setImgUrl(mem);
        } else {
          const stored = await getStoredImage(r.word);
          if (stored) {
            imageCache.set(key, stored);
            setImgUrl(stored);
          }
        }
      } else if (detected === "id_sentence") {
        setIdSentence(await analyzeIdSentence(w));
      } else if (detected === "ko_word") {
        setKoWord(await lookupKoWord(w));
      } else {
        setKoSentence(await translateKoSentence(w));
      }
      setHistory(pushHistory(w)); // 검색 성공 시 히스토리 기록
      // 결과 화면 진입 시 히스토리를 한 칸 쌓아, 뒤로가기가 최근 검색 화면으로 오게 함
      if (!resultStateRef.current) {
        resultStateRef.current = true;
        try { window.history.pushState({ dictResult: true }, ""); } catch (e) {}
      }
    } catch (e: any) {
      setError(errorMessage(e?.message || ""));
      setQuery(w); // 검색 실패 시 입력한 내용을 검색창에 되돌려 둠 (다시 타이핑할 필요 없음)
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
    setHistory(loadHistory());
  };

  // 홈 버튼: 결과를 보고 있었다면 쌓아둔 히스토리를 되돌려 뒤로가기와 동작을 일치시킴
  const goHome = () => {
    if (resultStateRef.current) {
      window.history.back(); // popstate 핸들러가 resetToHome 처리
    } else {
      resetToHome();
    }
  };

  // 폰의 뒤로가기: 결과 화면이면 최근 검색 화면으로만 이동 (사전을 벗어나지 않음)
  useEffect(() => {
    const onPop = () => {
      if (resultStateRef.current) {
        resultStateRef.current = false;
        resetToHome();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초기(홈) 화면 여부: 결과·로딩·에러가 전혀 없는 상태
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

  // 4열 정보만 개인 단어장에 저장 (이미지는 저장하지 않음)
  const handleSaveToWordbook = () => {
    if (!result || saved) return;
    const firstExample = result.examples[0];
    const { added } = addWordIfAbsent({
      word: result.word,
      meaning: result.meaning,
      example: firstExample?.id || "",
      exampleMeaning: firstExample?.ko || "",
      categoryId: MY_WORDBOOK_ID,
    });
    setSaved(true);
    toast(added ? "내 단어장에 저장되었습니다" : "이미 내 단어장에 있는 단어입니다");
  };

  return (
    <div className={`w-full max-w-lg mx-auto overflow-x-hidden bg-background flex flex-col ${isHome ? "h-[100dvh]" : "min-h-screen"}`}>
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { if (resultStateRef.current) { window.history.back(); } else { navigate("/"); } }}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold truncate">인도네시아어 사전</h1>
        <button
          onClick={goHome}
          className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center -mr-1 shrink-0"
          title="처음으로"
        >
          <Home size={20} />
        </button>
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

      {/* 이야기로 돌아가기 플로팅 버튼 */}
      {fromStory && (
        <button
          onClick={() => navigate("/story")}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2.5 text-sm font-medium shadow-lg"
        >
          <ScrollText size={16} /> 이야기로
        </button>
      )}

      <div className={isHome ? "px-4 pt-4 pb-0 flex-1 min-h-0 flex flex-col" : "px-4 py-4"}>
        {/* 검색창 */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="단어·문장 (인니어/한국어)"
              className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {/* 음성 언어 토글 */}
            <button
              onClick={() => setVoiceLang((v) => (v === "ko" ? "id" : "ko"))}
              className="shrink-0 text-[11px] font-bold text-primary border border-primary/40 rounded-full px-1.5 py-0.5 leading-none"
              title="음성 인식 언어 전환"
            >
              {voiceLang === "ko" ? "한" : "IN"}
            </button>
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
            className="shrink-0 bg-primary text-white rounded-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "검색"}
          </button>
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
          <div className="flex flex-col items-center justify-center py-16 text-white/70">
            <Loader2 size={28} className="animate-spin mb-3" />
            <p className="text-sm">사전을 찾고 있어요...</p>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="text-center py-12 text-white/80">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 초기 화면: 안내 문구 + 최근 검색 (바닥까지 이어지는 시트) */}
        {isHome && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-center py-8 text-white/60">
              <Search size={32} className="mx-auto mb-3 opacity-60" />
              <p className="text-sm">인니어·한국어 단어나 문장을 검색해보세요</p>
            </div>
            {history.length > 0 && (
              <>
                <p className="text-xs text-white mb-2 px-1 font-gothic">최근 검색</p>
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
                          className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-black/5 select-none ${i > 0 ? "border-t border-gray-100" : ""}`}
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
                <p className="text-base font-semibold text-gray-900 break-words font-word leading-relaxed">
                  {idSentence.chunks.length > 0
                    ? idSentence.chunks.map((c) => c.id).join(" / ")
                    : idSentence.original}
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
          </div>
        )}

        {/* (3) 한국어 단어 결과 → 인니어 단어들 (빈도순) */}
        {!loading && koWord && (
          <div className="bg-card border border-border/60 rounded-xl px-5 py-5 content-bump">
            {koWord.candidates.map((c, i) => (
              <div key={i} className={i === 0 ? "min-w-0" : "min-w-0 mt-4 pt-4 border-t border-gray-200"}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-gray-900 font-bold">{i + 1}</span>
                  <p className="text-base font-bold text-primary break-words min-w-0">{c.id}</p>
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
            <h2 className="text-sm font-medium text-gray-500 break-words">{koSentence.query}</h2>
            {[{ label: "구어체", v: koSentence.casual }, { label: "문어체", v: koSentence.formal }].map((row, i) => (
              row.v.id ? (
                <div key={i} className={i === 0 ? "mt-3" : "mt-3 pt-3 border-t border-gray-200"}>
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">{row.label}</span>
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
                <ul className="space-y-1.5 text-sm text-gray-800 font-gothic">
                  {koSentence.hardWords.map((h, i) => (
                    <li key={i} className="flex gap-2 min-w-0">
                      <span className="text-gray-400">•</span>
                      <span className="min-w-0 break-words"><span className="font-semibold text-gray-900">{h.word}</span> <span className="text-xs">{h.meaning}</span></span>
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
            <p className="text-base font-medium text-gray-900 break-words">{result.meaning}</p>
            {result.meaningDetail && (
              <p className="text-xs text-gray-500 mt-1 break-words font-gothic">{result.meaningDetail}</p>
            )}

            {/* 단어 이미지 (수동 버튼으로 생성, 세션 캐시) */}
            <div className="mt-4">
              {imgLoading && (
                <div className="w-full flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg py-8 text-gray-400">
                  <Loader2 size={22} className="animate-spin mb-2" />
                  <span className="text-xs">이미지를 그리고 있어요...</span>
                </div>
              )}
              {!imgLoading && imgUrl && (
                <img src={imgUrl} alt={result.word} className="w-full rounded-lg border border-gray-200" />
              )}
              {!imgLoading && !imgUrl && !imgError && (
                <button
                  onClick={() => loadImage(result.word, result.meaning)}
                  className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:bg-black/5"
                >
                  <ImageIcon size={15} /> 이미지 보기
                </button>
              )}
              {!imgLoading && !imgUrl && imgError && (
                <button
                  onClick={() => loadImage(result.word, result.meaning)}
                  className="w-full flex flex-col items-center justify-center gap-1 border border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:bg-black/5"
                >
                  <span className="text-xs text-gray-400">{imgError}</span>
                  <span className="flex items-center gap-1.5 text-sm"><ImageIcon size={15} /> 이미지 다시 만들기</span>
                </button>
              )}
            </div>

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
                <ul className="space-y-1.5 text-xs text-gray-800">
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
                <ul className="space-y-1.5 text-xs text-gray-800">
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
            <div className="space-y-1 text-sm text-gray-900">
              <p><span className="font-semibold">실제 회화 사용빈도</span> <Stars n={result.frequency} /></p>
              <p><span className="font-semibold">난이도</span> <Stars n={result.difficulty} /></p>
            </div>

            {/* 내 단어장에 보내기 */}
            <div className="mt-6">
              <button
                onClick={handleSaveToWordbook}
                disabled={saved}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-colors ${
                  saved
                    ? "bg-gray-100 text-gray-400"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {saved ? <><Check size={16} /> 저장됨</> : <><Plus size={16} /> 내 단어장에 보내기</>}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                단어·뜻·예문이 내 단어장에 저장됩니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
