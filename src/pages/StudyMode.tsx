import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, getSavedWordIds, toggleSavedWord, Word } from "@/lib/store";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, Volume2, Play, Square } from "lucide-react";
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
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoWordsRef = useRef<Word[]>([]);

  const shuffledWords = useMemo(() => {
    if (!isRandom) return words;
    return [...words].sort(() => Math.random() - 0.5);
  }, [isRandom, words.length]);

  const displayWords = isRandom ? shuffledWords : words;
  const currentWord: Word | undefined = displayWords[currentIndex];
  const isSaved = currentWord ? savedIds.includes(currentWord.id) : false;

  const handleToggleSave = () => {
    if (!currentWord) return;
    const nowSaved = toggleSavedWord(currentWord.id);
    setSavedIds(getSavedWordIds());
    toast(nowSaved ? "단어를 보관했습니다 📌" : "보관함에서 제거했습니다");
  };

  const speak = (text: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (isFlipped) {
      setIsBreathing(false);
      return;
    }
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
    setIsAutoPlaying(false);
    setIsAutoRandom(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    speechSynthesis.cancel();
    setIsFlipped(false);
  }, []);

  const runAutoPlay = useCallback(async (index: number) => {
    const playWords = autoWordsRef.current;
    if (index >= playWords.length) {
      setIsAutoPlaying(false);
      setIsAutoRandom(false);
      setIsFlipped(false);
      toast("자동플레이가 완료됐습니다 🎉");
      return;
    }

    setCurrentIndex(index);
    setIsFlipped(false);
    setIsBreathing(false);

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(async () => {
        await speak(playWords[index].word);
        resolve();
      }, 1000);
    });

    await new Promise<void>((resolve) => {
      autoPlayRef.current = setTimeout(() => {
        setIsFlipped(true);
        resolve();
      }, 1000);
    });

    autoPlayRef.current = setTimeout(() => {
      runAutoPlay(index + 1);
    }, 2000);
  }, []);

  const startAutoPlay = (random: boolean) => {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }
    const playWords = random
      ? [...words].sort(() => Math.random() - 0.5)
      : [...words];
    autoWordsRef.current = playWords;
    setIsAutoRandom(random);
    setIsAutoPlaying(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    runAutoPlay(0);
  };

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      speechSynthesis.cancel();
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
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => { stopAutoPlay(); navigate("/"); }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-muted-foreground font-body">
          {currentIndex + 1} / {displayWords.length}
          {isAutoPlaying && <span className="ml-2 text-primary animate-pulse">▶</span>}
        </span>
        <div className="w-5" />
      </div>

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
            <div className={`absolute inset-0 backface-hidden rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm transition-shadow duration-1000 text-card-foreground ${isBreathing ? "animate-breathe" : ""}`}>
              <p className="font-word text-3xl font-semibold text-center leading-relaxed text-gray-900">
                {currentWord.word}
              </p>
              {currentWord.example && (
                <p className="text-base text-muted-foreground font-word mt-4 text-center leading-relaxed">
                  {currentWord.example}
                </p>
              )}
            </div>
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm text-card-foreground">
              <p className="font-body text-2xl font-medium text-center mb-3 text-gray-900">
                {currentWord.meaning}
              </p>
              {currentWord.exampleMeaning && (
                <p className="text-base text-muted-foreground font-body text-center leading-relaxed">
                  {currentWord.exampleMeaning}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 상단 버튼: 보관, 랜덤, 스피커 */}
      <div className="flex justify-center gap-3 py-2">
        <button
          onClick={handleToggleSave}
          disabled={isAutoPlaying}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body transition-colors border ${
            isSaved
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          } disabled:opacity-30`}
        >
          {isSaved ? "✅ 보관됨" : "📌 보관"}
        </button>
        <button
          onClick={() => {
            setIsRandom((r) => !r);
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          disabled={isAutoPlaying}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-body transition-colors border ${
            isRandom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          } disabled:opacity-30`}
        >
          <Shuffle size={14} />
          랜덤
        </button>
        <button
          onClick={() => currentWord && speak(currentWord.word)}
          disabled={!currentWord || isAutoPlaying}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-body transition-colors border bg-card text-gray-900 border-border/50 hover:border-primary/50 disabled:opacity-30"
        >
          <Volume2 size={16} />
        </button>
      </div>

      {/* 하단 버튼: < ▶ 🔀 > */}
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0 || isAutoPlaying}
          className="p-3 rounded-full bg-card border border-border/50 text-gray-900 disabled:opacity-30 transition-opacity"
        >
          <ChevronLeft size={20} />
        </button>

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
