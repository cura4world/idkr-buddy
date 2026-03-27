import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getSavedWords, reorderCategories, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";

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
  const startAutoScroll = (clientY: number) => {
    stopAutoScroll();
    autoScrollTimer.current = setInterval(() => {
      const EDGE = 100, MAX = 18, vh = window.innerHeight;
      if (clientY < EDGE) window.scrollBy(0, -Math.round(MAX * (1 - clientY / EDGE)));
      else if (clientY > vh - EDGE) window.scrollBy(0, Math.round(MAX * (1 - (vh - clientY) / EDGE)));
    }, 16);
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
      const t = e.touches[0];
      setFloatPos({ x: t.clientX, y: t.clientY });
      startAutoScroll(t.clientY);
      const over = getOverIndex(t.clientX, t.clientY);
      if (over >= 0) setDragOverIdx(over);
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
        setFloatWidth(rect.width);
        floatOffsetY.current = t.clientY - rect.top;
      }
      setDraggingIdx(index);
      setDragOverIdx(index);
      setFloatCat(cat);
      setFloatPos({ x: t.clientX, y: t.clientY });
      startAutoScroll(t.clientY);
    }, 600);
  };

  const makeTouchEnd = () => (e: React.TouchEvent) => {
    if (!isDragging.current) { cancelLongPress(); return; }
    handleEnd();
  };

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
        setFloatWidth(rect.width);
        floatOffsetY.current = e.clientY - rect.top;
      }
      setDraggingIdx(index);
      setDragOverIdx(index);
      setFloatCat(cat);
      setFloatPos({ x: e.clientX, y: e.clientY });
    }, 600);
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) { cancelLongPress(); return; }
      setFloatPos({ x: ev.clientX, y: ev.clientY });
      startAutoScroll(ev.clientY);
      const over = getOverIndex(ev.clientX, ev.clientY);
      if (over >= 0) setDragOverIdx(over);
    };
    const onMouseUp = () => { handleEnd(); window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      {/* 헤더: Kata kata. 왼쪽 / + 버튼 오른쪽 (mr-2로 톱니바퀴 라인보다 약간 안쪽) */}
      <header className="flex items-center justify-between mb-6 pr-2">
        <h1 className="text-2xl font-semibold font-body tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <button
          onClick={() => setAddCatOpen(true)}
          className="text-white hover:text-white/70 text-3xl font-light leading-none w-10 h-10 flex items-center justify-center"
          title="단어장 추가"
        >
          +
        </button>
      </header>

      <div className="space-y-2">
        {savedCount > 0 && (
          <div className="rounded-lg bg-card px-6 py-5 shadow-sm border border-border/50 text-card-foreground">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/saved")}>
              <span className="text-lg">📌</span>
              <h2 className="text-base font-medium font-body">단어보관함</h2>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">{savedCount}개의 단어</p>
              <div className="flex gap-3">
                <button onClick={() => navigate("/saved/quiz")} className="text-sm text-primary font-medium hover:underline underline-offset-4" disabled={savedCount < 2}>퀴즈</button>
                <button onClick={() => navigate("/saved/study")} className="text-sm text-primary font-medium hover:underline underline-offset-4">플래시카드</button>
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
          />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground font-body">
          <p>아직 카테고리가 없습니다.</p>
          <button onClick={() => setAddCatOpen(true)} className="mt-2 text-primary underline underline-offset-4">
            첫 카테고리를 만들어보세요
          </button>
        </div>
      )}

      {floatCat && floatPos && (
        <div
          className="fixed pointer-events-none z-50 rounded-lg bg-card px-6 py-5 shadow-lg border border-sky-400 shadow-sky-400/20"
          style={{ width: floatWidth, left: floatPos.x - floatWidth / 2, top: floatPos.y - floatOffsetY.current }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{floatCat.emoji}</span>
            <h2 className="text-base font-medium font-body text-muted-foreground">{floatCat.name}</h2>
          </div>
        </div>
      )}

      <AddWordDialog open={addWordOpen} onOpenChange={setAddWordOpen} defaultCategoryId={addWordCat} onAdded={refresh} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
