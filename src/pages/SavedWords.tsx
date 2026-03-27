import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSavedWords, removeSavedWord, Word } from "@/lib/store";
import { ArrowLeft, Volume2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function SavedWords() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const words = getSavedWords();

  const [swipingIndex, setSwipingIndex] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchIntent = useRef<"none" | "swipe" | "scroll">("none");
  const SWIPE_THRESHOLD = 80;

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

  const handleRemove = (w: Word) => {
    removeSavedWord(w.id);
    refresh();
    toast("보관함에서 제거했습니다");
  };

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchIntent.current = "none";
    swipeXRef.current = 0;
    setSwipingIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartPos.current.x;
    const dy = t.clientY - touchStartPos.current.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (touchIntent.current === "none") {
      if (adx > 12 || ady > 12) {
        if (dx > 0 && adx > ady * 1.5) {
          touchIntent.current = "swipe";
        } else {
          touchIntent.current = "scroll";
        }
      }
    }
    if (touchIntent.current === "swipe") {
      e.preventDefault();
      const clampedX = Math.max(0, Math.min(dx, SWIPE_THRESHOLD + 30));
      swipeXRef.current = clampedX;
      setSwipeX(clampedX);
    }
  };

  const handleTouchEnd = (w: Word) => {
    if (touchIntent.current === "swipe" && swipeXRef.current >= SWIPE_THRESHOLD) {
      try { navigator.clipboard.writeText(w.word); } catch {}
      toast("단어를 복사했습니다");
    }
    setSwipingIndex(null);
    setSwipeX(0);
    swipeXRef.current = 0;
    touchIntent.current = "none";
    touchStartPos.current = null;
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

      <header className="mb-6">
        <h1 className="text-xl font-semibold font-body flex items-center gap-2">
          <span>📌</span>
          <span>단어보관함</span>
        </h1>
      </header>

      <div className="space-y-2">
        {words.map((w, index) => {
          const isSwiping = swipingIndex === index;
          const currentSwipeX = isSwiping ? swipeX : 0;
          const showCopyConfirm = isSwiping && currentSwipeX >= SWIPE_THRESHOLD;

          return (
            <div key={w.id} className="relative overflow-hidden rounded-lg">
              <div className={`absolute inset-0 flex items-center px-5 rounded-lg transition-colors duration-100 ${showCopyConfirm ? "bg-sky-500" : "bg-sky-400/70"}`}>
                <Copy size={18} className="text-white" />
                <span className="text-white text-sm font-body ml-2">{showCopyConfirm ? "복사!" : "복사"}</span>
              </div>

              <div
                className="relative flex items-start gap-3 bg-card rounded-lg p-4 border border-border/50 select-none text-card-foreground"
                style={{
                  transform: `translateX(${currentSwipeX}px)`,
                  transition: isSwiping ? "none" : "transform 0.25s ease",
                }}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(w)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-word text-base font-medium truncate">{w.word}</p>
                  <p className="text-sm text-muted-foreground font-body">{w.meaning}</p>
                  {w.example && (
                    <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
                  )}
                  {w.exampleMeaning && (
                    <p className="text-xs text-muted-foreground/50 font-body mt-0.5">{w.exampleMeaning}</p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleRemove(w); }}
                    className="text-card-foreground/40 hover:text-destructive p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); speak(w.word, "id"); }}
                    className="text-card-foreground/50 hover:text-primary p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
