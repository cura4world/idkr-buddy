import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedWords, removeSavedWord, Word } from "@/lib/store";
import { ArrowLeft, Volume2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SavedWords() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const words = getSavedWords();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (8) TTS: AndroidTTS 우선, speechSynthesis 폴백
  const speak = (text: string, lang: "id" | "ko" = "id") => {
    const langCode = lang === "ko" ? "ko-KR" : "id-ID";
    if ((window as any).AndroidTTS) {
      try { (window as any).AndroidTTS.speak(text, langCode); } catch (e) {}
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      speechSynthesis?.cancel?.();
      setTimeout(() => {
        try { speechSynthesis?.speak?.(utterance); } catch (e) {}
      }, 150);
    } catch (e) {}
  };

  // (9) 휴지통 버튼으로 삭제
  const handleRemove = (w: Word) => {
    removeSavedWord(w.id);
    refresh();
    toast("보관함에서 제거했습니다");
  };

  const handleTouchStart = (w: Word) => {
    longPressTimer.current = setTimeout(() => {
      if (window.confirm(`"${w.word}"을 보관함에서 제거할까요?`)) {
        removeSavedWord(w.id);
        refresh();
        toast("보관함에서 제거했습니다");
      }
    }, 800);
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
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-primary underline underline-offset-4"
        >
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

      {/* (10) 퀴즈/플래시카드 메뉴 제거 */}
      <div className="flex justify-end mb-4">
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
            className="bg-card rounded-lg p-4 border border-border/50 text-card-foreground"
            onTouchStart={() => handleTouchStart(w)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              if (window.confirm(`"${w.word}"을 보관함에서 제거할까요?`)) {
                removeSavedWord(w.id);
                refresh();
                toast("보관함에서 제거했습니다");
              }
            }}
          >
            {/* 상단: 단어 + 우측 버튼들 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-word text-base font-medium">{w.word}</p>
                <p className="text-sm text-muted-foreground font-body">{w.meaning}</p>
              </div>
              {/* (9) 스피커 아래, 휴지통 위 → 세로 배치 */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {/* (8) 스피커: 인도네시아어 TTS */}
                <button
                  onClick={() => speak(w.word, "id")}
                  className="text-card-foreground/50 hover:text-primary p-1"
                >
                  <Volume2 size={16} />
                </button>
                {/* (9) 휴지통: 삭제 */}
                <button
                  onClick={() => handleRemove(w)}
                  className="text-card-foreground/30 hover:text-destructive p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* (11) 예문 + 예문 한국어 해석 */}
            {w.example && (
              <p className="text-xs text-muted-foreground/70 font-word mt-1.5 leading-relaxed">
                {w.example}
              </p>
            )}
            {w.exampleMeaning && (
              <p className="text-xs text-muted-foreground/50 font-body mt-0.5 leading-relaxed">
                {w.exampleMeaning}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
