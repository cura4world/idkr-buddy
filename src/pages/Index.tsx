import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getSavedWords, reorderCategories, restoreSharedCategories, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const categories = getCategories();
  const savedCount = getSavedWords().length;
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [addWordCat, setAddWordCat] = useState<string | undefined>();
  const [addCatOpen, setAddCatOpen] = useState(false);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatCat, setFloatCat] = useState<Category | null>(null);
  const [floatWidth, setFloatWidth] = useState(320);

  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const isPendingLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatOffsetY = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAddWord = (categoryId: string) => { setAddWordCat(categoryId); setAddWordOpen(true); };

  const setDraggingIdx = (idx: number | null) => { draggingIndexRef.current = idx; setDraggingIndex(idx); };
  const setDragOverIdx = (idx: number | null) => { dragOverIndexRef.current = idx; setDragOverIndex(idx); };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) { clearInterval(autoScrollTimer.current); autoScrollTimer.current = null; }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    isPendingLongPress.current = false;
  };

  const getOverIndex = (clientX: number, clientY: number) => {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const card = el.closest("[data-cat-index]");
      if (card) return parseInt(card.getAttribute("data-cat-index") || "-1");
    }
    return -1;
  };

  const handleEnd = () => {
    cancelLongPress();
    stopAutoScroll();
    const from = draggingIndexRef.current;
    const to = dragOverIndexRef.current;
    if (isDragging.current && from !== null && to !== null && from !== to) {
      reorderCategories(from, to);
      setTick((t) => t + 1);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
    setFloatPos(null);
    setFloatCat(null);
    isDragging.current = false;
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isPendingLongPress.current && !isDragging.current) return;
      if (isPendingLongPress.current && !isDragging.current) { cancelLongPress(); return; }
      e.preventDefault();
      const touch = e.touches[0];
      const overIdx = getOverIndex(touch.clientX, touch.clientY);
      if (overIdx !== -1) setDragOverIdx(overIdx);
      setFloatPos({ x: touch.clientX, y: touch.clientY - floatOffsetY.current });
      const margin = 100;
      const speed = 8;
      stopAutoScroll();
      if (touch.clientY < margin) {
        autoScrollTimer.current = setInterval(() => window.scrollBy(0, -speed), 16);
      } else if (touch.clientY > window.innerHeight - margin) {
        autoScrollTimer.current = setInterval(() => window.scrollBy(0, speed), 16);
      }
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, []);

  const makeTouchStart = (index: number, cat: Category) => (e: React.TouchEvent) => {
    const t = e.touches[0];
    isDragging.current = false;
    isPendingLongPress.current = true;
    longPressTimer.current = setTimeout(() => {
      isPendingLongPress.current = false;
      isDragging.current = true;
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        floatOffsetY.current = t.clientY - rect.top;
        setFloatWidth(rect.width);
      }
      setDraggingIdx(index);
      setDragOverIdx(index);
      setFloatPos({ x: t.clientX, y: t.clientY - floatOffsetY.current });
      setFloatCat(cat);
    }, 600);
  };

  const makeTouchEnd = () => handleEnd;

  const makeMouseDown = (index: number, cat: Category) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    isPendingLongPress.current = true;
    longPressTimer.current = setTimeout(() => {
      isPendingLongPress.current = false;
      isDragging.current = true;
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        floatOffsetY.current = e.clientY - rect.top;
        setFloatWidth(rect.width);
      }
      setDraggingIdx(index);
      setDragOverIdx(index);
      setFloatPos({ x: e.clientX, y: e.clientY - floatOffsetY.current });
      setFloatCat(cat);
    }, 600);
  };

  const handleRestore = () => {
    const restored = restoreSharedCategories();
    if (restored) {
      refresh();
      toast("공용 단어장이 복구되었습니다.");
    } else {
      toast("복구할 단어장이 없습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6 pr-2">
        <h1 className="text-2xl font-semibold font-body tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestore}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center"
            title="공용 단어장 복구"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setAddCatOpen(true)}
            className="text-white hover:text-white/70 text-3xl font-light leading-none w-10 h-10"
            title="단어장 추가"
          >
            +
          </button>
        </div>
      </header>

      <div className="space-y-2">
        {savedCount > 0 && (
          <div className="rounded-lg bg-card px-6 py-5 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/saved")}>
              <span className="text-lg">📝</span>
              <h2 className="text-base font-medium font-body text-card-foreground">저장한 단어</h2>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-muted-foreground">{savedCount}개의 단어</span>
              <div className="flex gap-3">
                <button onClick={() => navigate("/saved/quiz")} className="text-sm text-primary hover:text-primary/80">퀴즈</button>
                <button onClick={() => navigate("/saved/study")} className="text-sm text-primary hover:text-primary/80">플래시카드</button>
              </div>
            </div>
          </div>
        )}

        {categories.map((cat, idx) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onAddWord={handleAddWord}
            onChanged={refresh}
            index={idx}
            cardRef={(el) => { cardRefs.current[idx] = el; }}
            isDragging={draggingIndex === idx}
            isDropTarget={dragOverIndex === idx && draggingIndex !== idx}
            onTouchStart={makeTouchStart(idx, cat)}
            onTouchEnd={makeTouchEnd()}
            onMouseDown={makeMouseDown(idx, cat)}
            onCancelDrag={cancelLongPress}
            onMoveTop={() => {
              if (idx === 0) return;
              reorderCategories(idx, 0);
              refresh();
            }}
            onMoveBottom={() => {
              if (idx === categories.length - 1) return;
              reorderCategories(idx, categories.length - 1);
              refresh();
            }}
          />
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-4">단어장이 없습니다</p>
            <button
              onClick={() => setAddCatOpen(true)}
              className="text-primary hover:text-primary/80 text-sm"
            >
              첫 카테고리를 만들어보세요
            </button>
          </div>
        )}
      </div>

      {floatCat && floatPos && (
        <div
          className="fixed z-50 pointer-events-none opacity-90"
          style={{ left: floatPos.x - floatWidth / 2, top: floatPos.y, width: floatWidth }}
        >
          <CategoryCard
            category={floatCat}
            onAddWord={() => {}}
            isDragging={false}
          />
        </div>
      )}

      <AddWordDialog
        open={addWordOpen}
        onOpenChange={setAddWordOpen}
        categoryId={addWordCat}
        onAdded={refresh}
      />
      <AddCategoryDialog
        open={addCatOpen}
        onOpenChange={setAddCatOpen}
        onAdded={refresh}
      />
    </div>
  );
};

export default Index;
