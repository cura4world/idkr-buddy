import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { getCategories, getWordsByCategory, getSavedWordIds, toggleSavedWord, Word } from "@/lib/store";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { groupOf } from "@/lib/wordbookGroups";
import { goBackOr, wordbookFallback } from "@/lib/nav";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Volume2, Play, Square, Bookmark, RefreshCw, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { displayMeaning } from "@/lib/wordbookGroups";


// 아래 동그라미 버튼 (시안: 카드로 외우기 — 켜진 버튼만 연한 청록)
const BTN = "w-12 h-12 flex items-center justify-center rounded-full border transition-colors disabled:opacity-30";
const BTN_OFF = "bg-white text-[#1D1F1E] border-[#DDE3E6]";
const BTN_ON = "bg-[#E3EEEC] text-[#2C6D63] border-[#2C6D63]";
const FACE = "absolute inset-0 backface-hidden rounded-[20px] bg-white border border-[#E6EAEC] shadow-[0_1px_4px_rgba(16,40,50,0.05)] flex flex-col items-center justify-center p-8 text-card-foreground";

export default function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const categories = getCategories();
  const category = categories.find((c) => c.id === id);
  const words = id ? getWordsByCategory(id) : [];
  const [isRandom, setIsRandom] = useState(false);
  const [reviewFilter, setReviewFilter] = useState(false);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedWordIds());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isAutoRandom, setIsAutoRandom] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [autoCurrentWord, setAutoCurrentWord] = useState<Word | undefined>(undefined);
  const [frontLang, setFrontLang] = useState<"id" | "ko">("id");
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isLoopingRef = useRef(false);
  const isAutoPlayingRef = useRef(false);
  const autoRandomRef = useRef(false);
  const plan = usePlan();

  const shuffledWords = useMemo(() => {
    if (!isRandom) return words;
    return [...words].sort(() => Math.random() - 0.5);
  }, [isRandom, words.length]);

  const orderedWords = isRandom ? shuffledWords : words;
  // 노란 리본(다시 외울 단어) 필터가 켜져 있으면 표시된 단어만 학습
  const displayWords = reviewFilter ? orderedWords.filter((w) => savedIds.includes(w.id)) : orderedWords;
  const currentWord: Word | undefined = isAutoPlaying ? autoCurrentWord : displayWords[currentIndex];
  const isMarked = currentWord ? savedIds.includes(currentWord.id) : false;

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch (e) {}
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isAutoPlayingRef.current) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 카드 오른쪽 위 리본: 현재 단어를 '다시 외울 단어'로 표시/해제
  const handleToggleMark = () => {
    if (!currentWord) return;
    const nowMarked = toggleSavedWord(currentWord.id);
    setSavedIds(getSavedWordIds());
    toast(nowMarked ? "다시 외울 단어로 표시했습니다" : "표시를 해제했습니다");
  };

  // 아래 동그라미 리본 버튼: 표시된 단어만 보기 <-> 전체 보기
  const handleToggleFilter = () => {
    if (reviewFilter) {
      setReviewFilter(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      toast("전체 단어를 표시합니다");
      return;
    }
    const marked = words.filter((w) => savedIds.includes(w.id));
    if (marked.length === 0) {
      toast("표시된 단어가 없습니다");
      return;
    }
    setReviewFilter(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast("표시된 단어 " + marked.length + "개만 학습합니다");
  };

  const speak = (text: string, lang: "id" | "ko") => {
    return new Promise<void>((resolve) => {
      const cleanText = text.replace(/~/g, "무엇무엇").replace(/\s*\/\s*/g, ", ");
      if ((window as any).AndroidTTS) {
        (window as any).AndroidTTS.speak(cleanText, lang === "ko" ? "ko-KR" : "id-ID");
        setTimeout(() => resolve(), cleanText.length * 80 + 500);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      try { speechSynthesis?.cancel?.(); } catch(e) {}
      const warmup = new SpeechSynthesisUtterance(" ");
      warmup.volume = 0;
      warmup.lang = utterance.lang;
      warmup.onend = () => {
        setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch(e) {} }, 100);
      };
      setTimeout(() => { try { speechSynthesis?.speak?.(warmup); } catch(e) {} }, 150);
    });
  };

  const getSpeakTarget = (word: Word, flipped: boolean): { text: string; lang: "id" | "ko" } => {
    if (frontLang === "id") {
      return flipped ? { text: word.meaning, lang: "ko" } : { text: word.word, lang: "id" };
    } else {
      return flipped ? { text: word.word, lang: "id" } : { text: word.meaning, lang: "ko" };
    }
  };

  useEffect(() => {
    if (isFlipped) { setIsBreathing(false); return; }
    const timer = setTimeout(() => setIsBreathing(true), 2000);
    return () => clearTimeout(timer);
  }, [currentIndex, isFlipped]);

  // 필터로 목록이 줄었을 때 인덱스가 범위를 벗어나면 보정
  useEffect(() => {
    if (isAutoPlaying) return;
    if (displayWords.length > 0 && currentIndex > displayWords.length - 1) {
      setCurrentIndex(displayWords.length - 1);
      setIsFlipped(false);
    }
  }, [displayWords.length, currentIndex, isAutoPlaying]);

  // 필터 중 표시 단어가 모두 해제되면 자동으로 전체 보기로 복귀
  useEffect(() => {
    if (reviewFilter && words.length > 0 && displayWords.length === 0) {
      setReviewFilter(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      toast("표시된 단어가 없어 전체 단어를 표시합니다");
    }
  }, [reviewFilter, displayWords.length, words.length]);

  const goNext = useCallback(() => {
    if (currentIndex < displayWords.length - 1) {
      setSlideDir(1); setIsFlipped(false); setIsBreathing(false); setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, displayWords.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDir(-1); setIsFlipped(false); setIsBreathing(false); setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const cancelOperations = () => {
    isAutoPlayingRef.current = false;
    if (autoPlayRef.current) { clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
    try { speechSynthesis?.cancel?.(); } catch(e) {}
    try { (window as any).AndroidTTS?.stop?.(); } catch(e) {}
    releaseWakeLock();
  };

  // 뒤로가기: 직전 화면으로 한 단계만. 재생/타이머만 정리하고(상태 변경 없음) 이동합니다.
  const handleBack = () => {
    cancelOperations();
    goBackOr(navigate, location.key, wordbookFallback(id));
  };

  const stopAutoPlay = useCallback(() => {
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false); setIsAutoRandom(false); setIsScreenLocked(false);
    if (autoPlayRef.current) { clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
    try { speechSynthesis?.cancel?.(); } catch(e) {}
    try { (window as any).AndroidTTS?.stop?.(); } catch(e) {}
    setIsFlipped(false); setCurrentIndex(0); setAutoCurrentWord(undefined);
    releaseWakeLock();
  }, []);

  const runAutoPlay = useCallback(async (index: number, playWords: Word[], lang: "id" | "ko") => {
    if (!isAutoPlayingRef.current) return;
    if (index >= playWords.length) {
      if (isLoopingRef.current) {
        const nextWords = autoRandomRef.current ? [...playWords].sort(() => Math.random() - 0.5) : playWords;
        runAutoPlay(0, nextWords, lang); return;
      }
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false); setIsAutoRandom(false); setIsScreenLocked(false);
      setIsFlipped(false); setCurrentIndex(0); setAutoCurrentWord(undefined);
      releaseWakeLock();
      toast("자동플레이가 완료되었습니다 🎉");
      return;
    }
    setIsFlipped(false); setIsBreathing(false); setCurrentIndex(index);
    // 카드가 옆면(90도)을 지나는 순간 다음 단어로 교체: 뒤집는 모션은 유지하고 이전 단어 앞면은 보이지 않음
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { setAutoCurrentWord(playWords[index]); resolve(); }, 300); });
    if (!isAutoPlayingRef.current) return;
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { resolve(); }, 350); });
    if (!isAutoPlayingRef.current) return;
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(async () => { const frontText = lang === "id" ? playWords[index].word : playWords[index].meaning; await speak(frontText, lang); resolve(); }, 1000); });
    if (!isAutoPlayingRef.current) return;
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(() => { setIsFlipped(true); resolve(); }, 1500); });
    if (!isAutoPlayingRef.current) return;
    await new Promise<void>((resolve) => { autoPlayRef.current = setTimeout(async () => { const backLang: "id" | "ko" = lang === "id" ? "ko" : "id"; const backText = lang === "id" ? playWords[index].meaning : playWords[index].word; await speak(backText, backLang); resolve(); }, 700); });
    if (!isAutoPlayingRef.current) return;
    autoPlayRef.current = setTimeout(() => { runAutoPlay(index + 1, playWords, lang); }, 1500);
  }, []);

  const startAutoPlay = (random: boolean) => {
    if (isAutoPlaying) { stopAutoPlay(); return; }
    const sourceWords = reviewFilter ? words.filter((w) => savedIds.includes(w.id)) : words;
    if (sourceWords.length === 0) return;
    const playWords = random ? [...sourceWords].sort(() => Math.random() - 0.5) : [...sourceWords];
    autoRandomRef.current = random; isAutoPlayingRef.current = true;
    setSlideDir(1); setIsAutoRandom(random); setIsAutoPlaying(true); setCurrentIndex(0); setIsFlipped(false);
    setAutoCurrentWord(playWords[0]); requestWakeLock(); runAutoPlay(0, playWords, frontLang);
  };

  const toggleLoop = () => {
    const next = !isLooping; isLoopingRef.current = next; setIsLooping(next);
    toast(next ? "반복 재생 켜짐 🔁" : "반복 재생 꺼짐");
  };

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      try { speechSynthesis?.cancel?.(); } catch(e) {}
      releaseWakeLock();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStart(e.touches[0].clientX); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) { if (diff > 0) goNext(); else goPrev(); }
    setTouchStart(null);
  };

  // 기본 단어장 잠금 (무료 → 구독 화면, 성경과 신앙 → 관리자·Special Member 만)
  if (category && category.isShared && !plan.plus) return <Navigate to={PAYWALL_PATH} replace />;
  if (category && category.isShared && !plan.staff && groupOf(category, categories) === "faith") {
    return <Navigate to="/wordbooks" replace />;
  }

  if (!category || words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">학습할 단어가 없습니다.</p>
        <button onClick={handleBack} className="mt-4 text-primary underline underline-offset-4">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {isScreenLocked && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "72px" }}>
            <button onClick={() => setIsScreenLocked(false)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 border border-white/40 text-white font-body text-sm">
              <Unlock size={18} /> 잠금 해제
            </button>
          </div>
        </div>
      )}
      <div className="h-14 shrink-0 flex items-center justify-between px-4">
        <button onClick={handleBack} className="w-10 h-10 -ml-2 flex items-center justify-center text-foreground" aria-label="\uB4A4\uB85C">
          <ArrowLeft size={20} />
        </button>
        <span className="font-word text-[0.90625rem] text-[#1D1F1E]">
          {currentIndex + 1} / {displayWords.length}
          {isAutoPlaying && <span className="ml-2 text-[#2C6D63] animate-pulse">{"\u25B6"}</span>}
        </span>
        {isAutoPlaying ? (
          <button onClick={() => setIsScreenLocked(true)} className="w-8 h-10 flex items-center justify-center text-foreground" aria-label="\uD654\uBA74 \uC7A0\uAE08"><Lock size={20} /></button>
        ) : (
          <span className="w-8" />
        )}
      </div>
      <div className="flex-1 flex items-center justify-center px-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div key={isAutoPlaying ? "autoplay-card" : ((currentWord && currentWord.id) || "empty")} className={`perspective w-full max-w-sm aspect-[3/4] cursor-pointer ${isAutoPlaying ? "" : slideDir === 1 ? "card-enter-next" : "card-enter-prev"}`} onClick={() => !isAutoPlaying && setIsFlipped((f) => !f)}>
          <div className={`relative w-full h-full preserve-3d flip-transition ${isFlipped ? "rotate-y-180" : ""}`}>
            <div className={`${FACE} transition-shadow duration-1000 ${isBreathing ? "animate-breathe" : ""}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMark(); }}
                aria-label="\uB2E4\uC2DC \uC678\uC6B8 \uB2E8\uC5B4"
                className={`absolute top-2.5 right-2.5 w-10 h-10 flex items-center justify-center transition-colors ${isMarked ? "text-[#D4A72C]" : "text-[#C2C7CB]"}`}
              >
                <Bookmark size={20} strokeWidth={1.8} fill={isMarked ? "currentColor" : "none"} />
              </button>
              <p className={`m-0 text-center ${frontLang === "id" ? "font-word text-[1.875rem] font-semibold leading-snug text-[#104B60]" : "font-gothic text-lg font-bold leading-relaxed text-[#1D1F1E]"}`}>
                {frontLang === "id" ? currentWord?.word : (currentWord ? displayMeaning(currentWord.meaning) : "")}
              </p>
              {frontLang === "id" && currentWord?.example && (
                <p className="mt-4 text-center font-word text-base leading-[1.6] text-[#6B6A63]">{currentWord.example}</p>
              )}
              {frontLang === "ko" && currentWord?.exampleMeaning && (
                <p className="mt-4 text-center font-gothic text-sm leading-relaxed text-[#6B6A63]">{currentWord.exampleMeaning}</p>
              )}
            </div>
            <div className={`${FACE} rotate-y-180`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMark(); }}
                aria-label="\uB2E4\uC2DC \uC678\uC6B8 \uB2E8\uC5B4"
                className={`absolute top-2.5 right-2.5 w-10 h-10 flex items-center justify-center transition-colors ${isMarked ? "text-[#D4A72C]" : "text-[#C2C7CB]"}`}
              >
                <Bookmark size={20} strokeWidth={1.8} fill={isMarked ? "currentColor" : "none"} />
              </button>
              <p className={`mb-3 text-center ${frontLang === "id" ? "font-gothic text-lg font-bold text-[#1D1F1E]" : "font-word text-[1.875rem] font-semibold leading-snug text-[#104B60]"}`}>
                {frontLang === "id" ? (currentWord ? displayMeaning(currentWord.meaning) : "") : currentWord?.word}
              </p>
              {frontLang === "id" && currentWord?.exampleMeaning && (
                <p className="text-center font-gothic text-sm leading-relaxed text-[#6B6A63]">{currentWord.exampleMeaning}</p>
              )}
              {frontLang === "ko" && currentWord?.example && (
                <p className="text-center font-word text-base leading-[1.6] text-[#6B6A63]">{currentWord.example}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 pt-3.5 flex justify-center gap-3">
        <button onClick={() => { if (isAutoPlaying) return; setFrontLang((l) => (l === "id" ? "ko" : "id")); setIsFlipped(false); setCurrentIndex(0); }}
          disabled={isAutoPlaying}
          className={`${BTN} ${frontLang === "ko" ? BTN_ON : BTN_OFF}`}>
          <span className="font-word text-sm font-semibold">{frontLang === "id" ? "IN" : "KO"}</span>
        </button>
        <button onClick={() => { setIsRandom((r) => !r); setCurrentIndex(0); setIsFlipped(false); }} disabled={isAutoPlaying}
          className={`${BTN} ${isRandom ? BTN_ON : BTN_OFF}`}>
          <Shuffle size={20} />
        </button>
        <button onClick={() => { if (!currentWord) return; const { text, lang } = getSpeakTarget(currentWord, isFlipped); speak(text, lang); }}
          disabled={!currentWord || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <Volume2 size={20} />
        </button>
        <button onClick={handleToggleFilter} disabled={isAutoPlaying}
          className={`${BTN} ${reviewFilter ? BTN_ON : BTN_OFF}`}>
          <Bookmark size={20} fill={reviewFilter ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="shrink-0 pt-3.5 pb-[30px] flex items-center justify-center gap-3">
        <button onClick={goPrev} disabled={currentIndex === 0 || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => startAutoPlay(false)}
          className={`${BTN} ${isAutoPlaying && !isAutoRandom ? BTN_ON : BTN_OFF}`}>
          {isAutoPlaying && !isAutoRandom ? <Square size={18} /> : <Play size={20} fill="currentColor" strokeWidth={0} />}
        </button>
        <button onClick={toggleLoop}
          className={`${BTN} ${isLooping ? BTN_ON : BTN_OFF}`}>
          <RefreshCw size={20} />
        </button>
        <button onClick={() => startAutoPlay(true)}
          className={`${BTN} ${isAutoPlaying && isAutoRandom ? BTN_ON : BTN_OFF}`}>
          {isAutoPlaying && isAutoRandom ? <Square size={18} /> : <Shuffle size={20} />}
        </button>
        <button onClick={goNext} disabled={currentIndex === displayWords.length - 1 || isAutoPlaying}
          className={`${BTN} ${BTN_OFF}`}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
