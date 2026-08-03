import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, reorderCategoryById, moveCategoryToEdgeWithin, restoreSharedCategories, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";

/* 단어장을 주제별로 묶어 메인 화면처럼 구역을 나눠 보여줍니다. */
// 공용 단어장은 "01 인칭·지시·의문"처럼 두 자리 번호로 시작한다.
// 그 번호 범위로 묶어 소제목을 붙인다. 번호가 없는 단어장(개인 단어장 등)은 "그 외".
const GROUPS: { label: string; from: number; to: number }[] = [
  { label: "기초", from: 1, to: 4 },
  { label: "동사·형용사", from: 5, to: 11 },
  { label: "사람과 일상", from: 12, to: 18 },
  { label: "사회생활", from: 19, to: 22 },
  { label: "자연과 세상", from: 23, to: 29 },
  { label: "성경과 신앙", from: 30, to: 36 },
];
const OTHER_LABEL = "그 외";

// 이름 앞의 번호로 묶음을 정한다 — 번호가 없거나 범위 밖이면 "그 외"
function groupLabelOf(name: string): string {
  const m = (name || "").match(new RegExp("^(\\d{1,2})"));
  if (!m) return OTHER_LABEL;
  const n = Number(m[1]);
  for (const g of GROUPS) {
    if (n >= g.from && n <= g.to) return g.label;
  }
  return OTHER_LABEL;
}

const Wordbooks = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  // 폴더 안에는 "내 단어장"을 제외한 모든 단어장이 들어갑니다.
  // 폴더 안에는 "내 단어장"을 제외한 모든 단어장이 들어갑니다.
  const categories = getCategories().filter((c) => c.id !== MY_WORDBOOK_ID);
  // useEffect 안 핸들러가 항상 최신 목록을 보도록 ref에도 보관 (stale closure 방지)
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // 화면에 보일 묶음들. 순서를 뒤섞지 않으므로 각 칸의 전체 목록 기준 번호를
  // 그대로 들고 다닙니다. 끌어서 옮기기가 이 번호로 동작합니다.
  const grouped = (() => {
    const bucket = new Map<string, { cat: Category; index: number }[]>();
    categories.forEach((cat, index) => {
      const label = groupLabelOf(cat.name);
      if (!bucket.has(label)) bucket.set(label, []);
      bucket.get(label)!.push({ cat, index });
    });
    const ordered = GROUPS.map((g) => g.label).concat([OTHER_LABEL]);
    return ordered
      .filter((label) => bucket.has(label))
      .map((label) => ({ label, items: bucket.get(label)! }));
  })();
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
      // 필터된 목록이라 인덱스가 전체 배열과 다르므로 ID 기준으로 이동
      const movedCat = categoriesRef.current[from];
      const targetCat = categoriesRef.current[to];
      // 묶음은 이름으로 정해지므로 다른 묶음에 떨어뜨려도 옮겨가지 않습니다.
      // 그대로 두면 눈에 안 보이는 순서만 바뀌어 혼란스러워서 무시합니다.
      const sameGroup =
        movedCat && targetCat && groupLabelOf(movedCat.name) === groupLabelOf(targetCat.name);
      if (sameGroup) {
        reorderCategoryById(movedCat.id, targetCat.id);
        setTick((t) => t + 1);
      }
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
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          KOSAKATA
        </h1>
      </header>

      <div className="px-4">
        <div className="flex justify-end gap-4 pt-3">
          <button
            onClick={handleRestore}
            className="group inline-flex items-center gap-1 text-xs text-foreground font-gothic"
          >
            <RotateCcw size={13} className="shrink-0" />
            <span className="group-hover:underline underline-offset-4">공용 단어장 복구</span>
          </button>
          <button
            onClick={() => setAddCatOpen(true)}
            className="text-xs text-foreground hover:underline underline-offset-4 font-gothic"
          >
            + 단어장 추가
          </button>
        </div>

        {categories.length === 0 ? (
          <section className="mt-3.5">
            <p className="mb-2.5 px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              단어장 0권
            </p>
            <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
              <p className="text-[0.9375rem] text-foreground">단어장이 없습니다</p>
              <p className="mt-1 font-word text-[0.75rem] text-muted-foreground">Belum ada kosakata</p>
              <button
                type="button"
                onClick={() => setAddCatOpen(true)}
                className="mt-4 h-10 px-4 rounded-full bg-primary text-[0.8125rem] font-gothic font-medium text-white active:opacity-90"
              >
                첫 단어장 만들기
              </button>
            </div>
          </section>
        ) : (
          grouped.map((group, gi) => (
            <section key={group.label} className={gi === 0 ? "mt-3.5" : "mt-6"}>
              <p className="mb-2.5 px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {group.label} {group.items.length}권
              </p>
              {/* 톱니 드롭다운이 잘리지 않도록 overflow-hidden 은 두지 않습니다. */}
              <div className="rounded-2xl border border-border bg-card">
                {group.items.map(({ cat, index: idx }, i) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onAddWord={handleAddWord}
                    onChanged={refresh}
                    index={idx}
                    first={i === 0}
                    last={i === group.items.length - 1}
                    cardRef={(el) => { cardRefs.current[idx] = el; }}
                    isDragging={draggingIndex === idx}
                    isDropTarget={dragOverIndex === idx && draggingIndex !== idx}
                    onTouchStart={makeTouchStart(idx, cat)}
                    onTouchEnd={makeTouchEnd()}
                    onMouseDown={makeMouseDown(idx, cat)}
                    onCancelDrag={cancelLongPress}
                    onMoveTop={() => {
                      if (i === 0) return;
                      moveCategoryToEdgeWithin(cat.id, group.items.map((x) => x.cat.id), true);
                      refresh();
                    }}
                    onMoveBottom={() => {
                      if (i === group.items.length - 1) return;
                      moveCategoryToEdgeWithin(cat.id, group.items.map((x) => x.cat.id), false);
                      refresh();
                    }}
                  />
                ))}
              </div>
            </section>
          ))
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
            floating
            last
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

export default Wordbooks;
