import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, reorderCategories, restoreSharedCategories, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { RotateCcw, Settings, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const categories = getCategories();
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [addWordCat, setAddWordCat] = useState<string | undefined>();
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    const onMouseMove = (e: MouseEvent) => {
      if (!isPendingLongPress.current && !isDragging.current) return;
      if (isPendingLongPress.current && !isDragging.current) { cancelLongPress(); return; }
      const overIdx = getOverIndex(e.clientX, e.clientY);
      if (overIdx !== -1) setDragOverIdx(overIdx);
      setFloatPos({ x: e.clientX, y: e.clientY - floatOffsetY.current });
      const margin = 100;
      const speed = 8;
      stopAutoScroll();
      if (e.clientY < margin) {
        autoScrollTimer.current = setInterval(() => window.scrollBy(0, -speed), 16);
      } else if (e.clientY > window.innerHeight - margin) {
        autoScrollTimer.current = setInterval(() => window.scrollBy(0, speed), 16);
      }
    };
    // 어떤 경로로든 터치/마우스가 끝나거나 취소되면 반드시 드래그 상태를 정리
    // (touchcancel, 합성 mousedown 타이머 누수 등으로 유령 카드가 남는 버그 방지)
    const onGlobalEnd = () => handleEnd();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") handleEnd();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchend", onGlobalEnd, true);
    document.addEventListener("touchcancel", onGlobalEnd, true);
    document.addEventListener("mouseup", onGlobalEnd, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchend", onGlobalEnd, true);
      document.removeEventListener("touchcancel", onGlobalEnd, true);
      document.removeEventListener("mouseup", onGlobalEnd, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
            onClick={() => setSettingsOpen(true)}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center"
            title="설정"
          >
            <Settings size={18} />
          </button>
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
        {/* 인도네시아어 사전 박스 - 단어장 목록 맨 위 */}
        <button
          onClick={() => navigate("/dictionary")}
          className="w-full text-left relative rounded-xl bg-primary/10 px-5 py-4 card-lift border border-border/60"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen size={19} className="text-primary" />
            </span>
            <p className="flex-1 min-w-0 text-base font-semibold text-gray-900">인도네시아어 사전</p>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </div>
        </button>

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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
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
