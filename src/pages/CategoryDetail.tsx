import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, Word, reorderWords } from "@/lib/store";
import AddWordDialog from "@/components/AddWordDialog";
import EditWordDialog from "@/components/EditWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import { ArrowLeft, Volume2, Settings } from "lucide-react";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatWidth, setFloatWidth] = useState<number>(300);
  const floatOffsetY = useRef<number>(0);

  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const touchStartTime = useRef<number>(0);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const categories = getCategories();
  const category = categories.find((c) => c.id === id);
  const words = id ? getWordsByCategory(id) : [];

  const setDragging = (index: number | null) => {
    draggingIndexRef.current = index;
    setDraggingIndex(index);
  };

  const setDragOver = (index: number | null) => {
    dragOverIndexRef.current = index;
    setDragOverIndex(index);
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const startAutoScroll = (clientY: number) => {
    stopAutoScroll();
    const EDGE = 100;
    const MAX_SPEED = 18;
    autoScrollTimer.current = setInterval(() => {
      const vh = window.innerHeight;
      if (clientY < EDGE) {
        const speed = Math.round(MAX_SPEED * (1 - clientY / EDGE));
        window.scrollBy(0, -speed);
      } else if (clientY > vh - EDGE) {
        const speed = Math.round(MAX_SPEED * (1 - (vh - clientY) / EDGE));
        window.scrollBy(0, speed);
      }
    }, 16);
  };

  const startLongPress = (index: number, startX: number, startY: number) => {
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      isDragging.current = true;
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setFloatWidth(rect.width);
        floatOffsetY.current = startY - rect.top;
      }
      setDragging(index);
      setDragOver(index);
      setFloatPos({ x: startX, y: startY });
      startAutoScroll(startY);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getOverIndex = (clientX: number, clientY: number): number => {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      const wordCard = el.closest("[data-word-index]");
      if (wordCard) {
        return parseInt(wordCard.getAttribute("data-word-index") || "-1");
      }
    }
    return -1;
  };

  const handleEnd = () => {
    cancelLongPress();
    stopAutoScroll();
    const from = draggingIndexRef.current;
    const to = dragOverIndexRef.current;
    if (isDragging.current && from !== null && to !== null && from !== to) {
      reorderWords(id!, from, to);
      refresh();
    }
    setDragging(null);
    setDragOver(null);
    setFloatPos(null);
    isDragging.current = false;
  };

  // ── 터치 이벤트 ──
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchMoved.current = false;
    touchStartTime.current = Date.now();
    startLongPress(index, t.clientX, t.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (touchStartPos.current) {
      const dx = Math.abs(t.clientX - touchStartPos.current.x);
      const dy = Math.abs(t.clientY - touchStartPos.current.y);
      if (dx > 5 || dy > 5) {
        touchMoved.current = true;
        // 드래그 전 움직임 → 롱프레스 취소
        if (!isDragging.current) {
          cancelLongPress();
          return;
        }
      }
    }
    if (!isDragging.current) return;
    e.preventDefault();
    setFloatPos({ x: t.clientX, y: t.clientY });
    startAutoScroll(t.clientY);
    const over = getOverIndex(t.clientX, t.clientY);
    if (over >= 0) setDragOver(over);
  };

  const handleTouchEnd = (index: number) => {
    const wasDragging = isDragging.current;
    const elapsed = Date.now() - touchStartTime.current;
    cancelLongPress();
    handleEnd();

    // 탭 판정: 드래그 아님 + 움직임 없음 + 400ms 이내
    if (!wasDragging && !touchMoved.current && elapsed < 400) {
      setSelectedIndex((prev) => (prev === index ? null : index));
    }
  };

  // ── 마우스 이벤트 ──
  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startLongPress(index, e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      setFloatPos({ x: ev.clientX, y: ev.clientY });
      startAutoScroll(ev.clientY);
      const over = getOverIndex(ev.clientX, ev.clientY);
      if (over >= 0) setDragOver(over);
    };

    const onMouseUp = () => {
      handleEnd();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseClick = (index: number) => {
    if (isDragging.current) return;
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        카테고리를 찾을 수 없습니다.
      </div>
    );
  }

  const draggingWord = draggingIndex !== null ? words[draggingIndex] : null;

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
          <span>{category.emoji}</span>
          <span>{category.name}</span>
        </h1>
      </header>

      <div className="flex justify-end gap-4 mb-6">
        <button
          onClick={() => setCsvOpen(true)}
          className="text-sm text-white hover:underline underline-offset-4 font-body"
        >
          CSV 가져오기
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="text-sm text-white hover:underline underline-offset-4 font-body"
        >
          + 단어 추가
        </button>
      </div>

      <div className="space-y-2">
        {words.map((w, index) => {
          const isDraggingThis = draggingIndex === index;
          const isDropTarget = dragOverIndex === index && draggingIndex !== index;
          const isSelected = selectedIndex === index;

          return (
            <div key={w.id}>
              {/* 드롭 위치 표시선 */}
              {isDropTarget && (
                <div className="h-0.5 bg-sky-400 rounded-full mx-1 mb-1 shadow-sm shadow-sky-400/50" />
              )}
              <div
                ref={(el) => { cardRefs.current[index] = el; }}
                data-word-index={index}
                className={[
                  "relative flex items-start gap-3 rounded-lg p-4 border border-border/50 select-none text-card-foreground transition-all duration-150",
                  isDraggingThis
                    ? "opacity-20 cursor-grabbing bg-card"
                    : "bg-card cursor-grab",
                ].join(" ")}
                style={isSelected ? { backgroundColor: "hsl(30, 20%, 88%)" } : undefined}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(index)}
                onMouseDown={(e) => handleMouseDown(index, e)}
                onClick={() => handleMouseClick(index)}
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
                    onClick={(e) => { e.stopPropagation(); setEditWord(w); }}
                    className="text-card-foreground/40 hover:text-primary p-1"
                    title="단어 정보"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); speak(w.word); }}
                    className="text-card-foreground/50 hover:text-primary p-1"
                    title="발음 듣기"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {words.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-body">
          <p>단어가 없습니다.</p>
        </div>
      )}

      {/* 떠다니는 단어박스 */}
      {draggingWord && floatPos && (
        <div
          className="fixed pointer-events-none z-50 flex items-start gap-3 bg-card rounded-lg p-4 border border-sky-400 shadow-lg shadow-sky-400/20"
          style={{
            width: floatWidth,
            left: floatPos.x - floatWidth / 2,
            top: floatPos.y - floatOffsetY.current,
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-word text-base font-medium truncate text-muted-foreground">{draggingWord.word}</p>
            <p className="text-sm text-muted-foreground font-body">{draggingWord.meaning}</p>
            {draggingWord.example && (
              <p className="text-xs text-muted-foreground font-word mt-0.5">{draggingWord.example}</p>
            )}
            {draggingWord.exampleMeaning && (
              <p className="text-xs text-muted-foreground font-body mt-0.5">{draggingWord.exampleMeaning}</p>
            )}
          </div>
          <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
            <Settings size={16} className="text-muted-foreground" />
            <Volume2 size={16} className="text-muted-foreground" />
          </div>
        </div>
      )}

      <AddWordDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setSelectedIndex(null);
        }}
        defaultCategoryId={id}
        onAdded={(newWordId) => {
          refresh();
          if (selectedIndex !== null && newWordId) {
            const currentWords = getWordsByCategory(id!);
            const newIdx = currentWords.findIndex((w) => w.id === newWordId);
            if (newIdx !== -1 && newIdx !== selectedIndex + 1) {
              reorderWords(id!, newIdx, selectedIndex + 1);
              refresh();
            }
          }
          setSelectedIndex(null);
        }}
      />
      <EditWordDialog
        open={!!editWord}
        onOpenChange={(o) => { if (!o) setEditWord(null); }}
        word={editWord}
        onUpdated={refresh}
      />
      <CSVImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={refresh}
        categoryId={id}
      />
    </div>
  );
}
