import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedWords, removeSavedWord, Word } from "@/lib/store";
import { ArrowLeft, Volume2 } from "lucide-react";
import { toast } from "sonner";

export default function SavedStudy() {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>(() => getSavedWords());
  const [, setTick] = useState(0);
  const refresh = useCallback(() => {
    setWords(getSavedWords());
    setTick((t) => t + 1);
  }, []);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const handleTouchStart = (w: Word) => {
    longPressTimer.current = setTimeout(() => {
      if (window.confirm(`"${w.word}"을 보관함에서 제거할까요?`)) {
        removeSavedWord(w.id);
        refresh();
        toast("보관함에서 제거했습니다");
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">보관된 단어가 없습니다.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-primary underline underline-offset-4">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-white mb-6 hover:text-white/80"
      >
        <ArrowLeft size={16} />
        <span className="font-body">돌아가기</span>
      </button>

      <header className="mb-2">
        <h1 className="text-xl font-semibold font-body flex items-center gap-2">
          <span>📌</span>
          <span>단어보관함</span>
        </h1>
      </header>

      <div className="flex justify-end gap-4 mb-6">
        <button
          onClick={() => navigate("/saved/quiz")}
          className="text-sm text-white hover:underline underline-offset-4 font-body"
          disabled={words.length < 2}
        >
          퀴즈
        </button>
        <button
          onClick={() => navigate("/saved/study")}
          className="text-sm text-white hover:underline underline-offset-4 font-body"
        >
          플래시카드
        </button>
      </div>

      <div className="space-y-2">
        {words.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border/50 select-none text-card-foreground"
            onTouchStart={() => handleTouchStart(w)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            <div className="flex-1 min-w-0">
              <p className="font-word text-base font-medium truncate">{w.word}</p>
              <p className="text-sm text-muted-foreground font-body">{w.meaning}</p>
              {w.example && (
                <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
              )}
            </div>
            <button
              onClick={() => speak(w.word)}
              className="text-card-foreground/50 hover:text-primary p-1"
            >
              <Volume2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
