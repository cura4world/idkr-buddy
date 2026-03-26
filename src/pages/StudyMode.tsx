import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, getSavedWordIds, toggleSavedWord, Word } from "@/lib/store";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Volume2, Play, Square, Bookmark, RefreshCw, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function StudyMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categories = getCategories();
  const category = categories.find((c) => c.id === id);
  const words = id ? getWordsByCategory(id) : [];

  const [isRandom, setIsRandom] = useState(false);
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

  const shuffledWords = useMemo(() => {
    if (!isRandom) return words;
    return [...words].sort(() => Math.random() - 0.5);
  }, [isRandom, words.length]);

  const displayWords = isRandom ? shuffledWords : words;
  const currentWord: Word | undefined = isAutoPlaying ? autoCurrentWord : displayWords[currentIndex];
  const isSaved = currentWord ? savedIds.includes(currentWord.id) : false;

  // Wake Lock
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

  const handleToggleSave = () => {
    if (!currentWord) return;
    const nowSaved = toggleSavedWord(currentWord.id);
    setSavedIds(getSavedWordIds());
    toast(nowSaved ? "단어를 보관했습니다 📌" : "보관함에서 제거했습니다");
  };

  const speak = (text: string, lang: "id" | "ko") => {
    return new Promise<void>((resolve) => {
      const cleanText = text
        .replace(/~/g, "무엇무엇")
        .replace(/\s*\/\s*/g, ", ");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === "ko" ? "ko-KR" : "id-ID";
      utterance.rate = 0.9;
      utterance.onend = () => resolve();

      // 차량 오디오 워밍업: 무음 utterance로 오디오 출력을 먼저 깨운 후 실제 단어 재생
      speechSynthesis.cancel();
      const warmup = new SpeechSynthesisUtterance(" ");
      warmup.volume = 0;
      warmup.lang = utterance.lang;
      warmup.onend = () => {
        setTimeout(() => {
          speechSynthesis.speak(utterance);
        }, 100);
      };
      setTimeout(() => {
        speechSynthesis.speak(warmup);
      }, 150);
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

  const goNext = useCallback(() => {
    if (currentIndex < displayWords.length - 1) {
      setIsFlipped(false);
      setIsBreathing(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, displayWords.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setIsBreathing(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const stopAutoPlay = useCallback(() => {
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    setIsAutoRandom(false);
    setIsScreenLocked(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    speechSynthesis.cancel();
    setIsFlipped(false);
    setCurrentIndex(0);
    setAutoCurrentWord(undefined);
    releaseWakeLock();
  }, []);

  const runAutoPlay = useCallback(async (index: number, playWords: Word[], lang: "id" | "ko") => {
    if (!isAutoPlayingRef.current) return;

    if (index >= playWords.length) {
      if (isLoopingRef.current) {
        const nextWords = autoRandomRef.current
          ? [...playWords].sort(() => Math.random() - 0.5)
          : playWords;
        runAutoPlay(0, nextWords, lang);
        return;
      }
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      setIsAutoRandom(false);
      setIsScreenLocked(false);
      setIsFlipped(false);
      setCurrentIndex(0);
      setAutoCurrentWord(undefined);
      releaseWakeLock();
      toast("자동플레이가 완료됐습니다 🎉");
      return;
    }

    setIsFlipped(false);
    setIsBreathing(false);
    setCurrentIndex(index);

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(() => {
        setAutoCurrentWord(playWords[index]);
        resolve();
      }, 650);
    });
    if (!isAutoPlayingRef.current) return;

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(async () => {
        const frontText = lang === "id" ? playWords[index].word : playWords[index].meaning;
        await speak(frontText, lang);
        resolve();
      }, 1000);
    });
    if (!isAutoPlayingRef.current) return;

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(() => {
        setIsFlipped(true);
        resolve();
      }, 1500);
    });
    if (!isAutoPlayingRef.current) return;

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(async () => {
        const backLang: "id" | "ko" = lang === "id" ? "ko" : "id";
        const backText = lang === "id" ? playWords[index].meaning : playWords[index].word;
        await speak(backText, backLang);
        resolve();
      }, 700);
    });
    if (!isAutoPlayingRef.current) return;

    autoPlayRef.current = setTimeout(() => {
      runAutoPlay(index + 1, playWords, lang);
    }, 1500);
  }, []);

  const startAutoPlay = (random: boolean) => {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }
    const playWords = random ? [...words].sort(() => Math.random() - 0.5) : [...words];
    autoRandomRef.current = random;
    isAutoPlayingRef.current = true;
    setIsAutoRandom(random);
    setIsAutoPlaying(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setAutoCurrentWord(playWords[0]);
    requestWakeLock();
    runAutoPlay(0, playWords, frontLang);
  };

  const toggleLoop = () => {
    const next = !isLooping;
    isLoopingRef.current = next;
    setIsLooping(next);
    toast(next ? "반복 재생 켜짐 🔁" : "반복 재생 꺼짐");
  };

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      speechSynthesis.cancel();
      releaseWakeLock();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) {
      if (diff < 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  if (!category || displayWords.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">학습할 단어가 없습니다.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-primary underline underline-offset-4">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">

      {/* 화면 잠금 오버레이 */}
      {isScreenLocked && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center gap-4"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <p className="text-white text-lg font-body">화면 잠금 중</p>
          <p className="text-white/60 text-sm font-body">자동재생이 계속됩니다</p>
          <button
            onClick={() => setIsScreenLocked(false)}
            className="mt-4 flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 border border-white/40 text-white font-body text-sm"
          >
            <Unlock size={16} /> 잠금 해제
          </button>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-4">
        <button
          onClick={() => { stopAutoPlay(); navigate("/"); }}
          className="text-white hover:text-white/80"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-white font-body">
          {currentIndex + 1} / {isAutoPlaying ? words.length : displayWords.length}
          {isAutoPlaying && <span className="ml-2 text-primary animate-pulse">▶</span>}
        </span>
        {/* 화면 잠금 버튼 — 자동플레이 중에만 표시, 아니면 빈 공간 */}
        {isAutoPlaying ? (
          <button
            onClick={() => setIsScreenLocked(true)}
            className="text-white hover:text-white/80"
          >
            <Lock size={20} />
          </button>
        ) : (
          <div className="w-5" />
        )}
      </div>

      {/* 카드 */}
      <div
        className="flex-1 flex items-center justify-center px-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="perspective w-full max-w-sm aspect-[3/4] cursor-pointer"
          onClick={() => !isAutoPlaying && setIsFlipped((f) => !f)}
        >
          <div className={`relative w-full h-full preserve-3d flip-transition ${isFlipped ? "rotate-y-180" : ""}`}>
            {/* 앞면 */}
            <div className={`absolute inset-0 backface-hidden rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm transition-shadow duration-1000 text-card-foreground ${isBreathing ? "animate-breathe" : ""}`}>
              <p className={`text-center leading-relaxed text-gray-900 ${frontLang === "id" ? "font-word text-3xl" : "font-body text-2xl"}`}>
                {frontLang === "id" ? currentWord?.word : currentWord?.meaning}
              </p>
              {frontLang === "id" && currentWord?.example && (
                <p className="text-base text-muted-foreground font-word mt-4 text-center leading-relaxed">
                  {currentWord.example}
                </p>
              )}
              {frontLang === "ko" && currentWord?.exampleMeaning && (
                <p className="text-base text-muted-foreground font-body mt-4 text-center leading-relaxed">
                  {currentWord.exampleMeaning}
                </p>
              )}
            </div>
            {/* 뒷면 */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm text-card-foreground">
              <p className={`font-normal text-center mb-3 text-gray-900 ${frontLang === "id" ? "font-body text-2xl" : "font-word text-3xl"}`}>
                {frontLang === "id" ? currentWord?.meaning : currentWord?.word}
              </p>
              {frontLang === "id" && currentWord?.exampleMeaning && (
                <p className="text-base text-muted-foreground font-body text-center leading-relaxed">
                  {currentWord.exampleMeaning}
                </p>
              )}
              {frontLang === "ko" && currentWord?.example && (
                <p className="text-base text-muted-foreground font-word text-center leading-relaxed">
                  {currentWord.example}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 중간 버튼: 보관, 랜덤, 스피커, KO/IN */}
      <div className="flex justify-center gap-3 py-2">
        {/* 보관 — 아이콘만 */}
        <button
          onClick={handleToggleSave}
          disabled={isAutoPlaying}
          className={`flex items-center justify-center p-2.5 rounded-full transition-colors border ${
            isSaved
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          } disabled:opacity-30`}
        >
          <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
        </button>
        {/* 랜덤 — 아이콘만 */}
        <button
          onClick={() => {
            setIsRandom((r) => !r);
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          disabled={isAutoPlaying}
          className={`flex items-center justify-center p-2.5 rounded-full transition-colors border ${
            isRandom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          } disabled:opacity-30`}
        >
          <Shuffle size={16} />
        </button>
        {/* 스피커 */}
        <button
          onClick={() => {
            if (!currentWord) return;
            const { text, lang } = getSpeakTarget(currentWord, isFlipped);
            speak(text, lang);
          }}
          disabled={!currentWord || isAutoPlaying}
          className="flex items-center justify-center p-2.5 rounded-full transition-colors border bg-card text-gray-900 border-border/50 hover:border-primary/50 disabled:opacity-30"
        >
          <Volume2 size={16} />
        </button>
        {/* KO/IN 토글 */}
        <button
          onClick={() => {
            if (isAutoPlaying) return;
            setFrontLang((l) => (l === "id" ? "ko" : "id"));
            setIsFlipped(false);
            setCurrentIndex(0);
          }}
          disabled={isAutoPlaying}
          className={`flex items-center justify-center p-2.5 rounded-full text-sm font-bold font-body transition-colors border disabled:opacity-30 ${
            frontLang === "ko"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          }`}
        >
          {frontLang === "id" ? "IN" : "KO"}
        </button>
      </div>

      {/* 하단 버튼: < ▶ 🔁 🔀 > */}
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0 || isAutoPlaying}
          className="p-3 rounded-full bg-card border border-border/50 text-gray-900 disabled:opacity-30 transition-opacity"
        >
          <ChevronLeft size={20} />
        </button>
        {/* 순서 재생 */}
        <button
          onClick={() => startAutoPlay(false)}
          className={`p-3 rounded-full transition-colors border ${
            isAutoPlaying && !isAutoRandom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          }`}
        >
          {isAutoPlaying && !isAutoRandom ? <Square size={20} /> : <Play size={20} />}
        </button>
        {/* 반복 재생 */}
        <button
          onClick={toggleLoop}
          className={`p-3 rounded-full transition-colors border ${
            isLooping
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          }`}
        >
          <RefreshCw size={20} />
        </button>
        {/* 랜덤 재생 */}
        <button
          onClick={() => startAutoPlay(true)}
          className={`p-3 rounded-full transition-colors border ${
            isAutoPlaying && isAutoRandom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          }`}
        >
          {isAutoPlaying && isAutoRandom ? <Square size={20} /> : <Shuffle size={20} />}
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === displayWords.length - 1 || isAutoPlaying}
          className="p-3 rounded-full bg-card border border-border/50 text-gray-900 disabled:opacity-30 transition-opacity"
        >
          <ChevronRight size={20} />
        </button>
      </div>

    </div>
  );
}
