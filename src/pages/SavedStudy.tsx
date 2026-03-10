import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedWords, removeSavedWord, Word } from "@/lib/store";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SavedStudy() {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>(() => getSavedWords());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const currentWord: Word | undefined = words[currentIndex];

  useEffect(() => {
    if (isFlipped) { setIsBreathing(false); return; }
    const timer = setTimeout(() => setIsBreathing(true), 2000);
    return () => clearTimeout(timer);
  }, [currentIndex, isFlipped]);

  const goNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setIsFlipped(false); setIsBreathing(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, words.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false); setIsBreathing(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleRemove = () => {
    if (!currentWord) return;
    removeSavedWord(currentWord.id);
    const updated = words.filter((w) => w.id !== currentWord.id);
    setWords(updated);
    toast("보관함에서 제거했습니다");
    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    }
    setIsFlipped(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) { diff < 0 ? goNext() : goPrev(); }
    setTouchStart(null);
  };

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">보관된 단어가 없습니다.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-primary underline underline-offset-4">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-muted-foreground font-body">
          📌 보관함 · {currentIndex + 1} / {words.length}
        </span>
        <div className="w-5" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="perspective w-full max-w-sm aspect-[3/4] cursor-pointer" onClick={() => setIsFlipped((f) => !f)}>
          <div className={`relative w-full h-full preserve-3d flip-transition ${isFlipped ? "rotate-y-180" : ""}`}>
            <div className={`absolute inset-0 backface-hidden rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm transition-shadow duration-1000 ${isBreathing ? "animate-breathe" : ""}`}>
              <p className="font-word text-3xl font-semibold text-center leading-relaxed">{currentWord.word}</p>
              {currentWord.example && <p className="text-base text-muted-foreground font-word mt-4 text-center leading-relaxed">{currentWord.example}</p>}
              <p className="text-sm text-muted-foreground/60 mt-6 font-body">탭하여 뒤집기</p>
            </div>
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center p-8 shadow-sm">
              <p className="font-body text-2xl font-medium text-center mb-3">{currentWord.meaning}</p>
              {currentWord.exampleMeaning && <p className="text-base text-muted-foreground font-body text-center leading-relaxed">{currentWord.exampleMeaning}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Remove from saved */}
      <div className="flex justify-center py-2">
        <button
          onClick={handleRemove}
          className="flex items-center gap-2 px-4 py-2 text-sm font-body text-destructive hover:text-destructive/80 transition-colors"
        >
          <Trash2 size={16} />
          보관함에서 제거
        </button>
      </div>

      <div className="flex items-center justify-center gap-8 py-4">
        <button onClick={goPrev} disabled={currentIndex === 0} className="p-3 rounded-full bg-card border border-border/50 text-foreground disabled:opacity-30 transition-opacity">
          <ChevronLeft size={20} />
        </button>
        <button onClick={goNext} disabled={currentIndex === words.length - 1} className="p-3 rounded-full bg-card border border-border/50 text-foreground disabled:opacity-30 transition-opacity">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
