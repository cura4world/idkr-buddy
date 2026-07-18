import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, Word, reorderWords, deleteWord } from "@/lib/store";
import AddWordDialog from "@/components/AddWordDialog";
import EditWordDialog from "@/components/EditWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import { ArrowLeft, Volume2, Settings, Copy, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedId = useRef<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const swipeDir = useRef<1 | -1>(1);
  const [swipeDirState, setSwipeDirState] = useState<1 | -1>(1);
  const [swipingIndex, setSwipingIndex] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatWidth, setFloatWidth] = useState<number>(300);
  const floatOffsetY = useRef<number>(0);
  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const isSwipe = useRef(false);
  const touchIntent = useRef<"none" | "swipe" | "drag" | "scroll">("none");
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const swipeIndexRef = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const lastTapIndex = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80;

  // Android WebView / 브라우저 공통 TTS
  const speak = (text: string) => {
    if ((window as any).AndroidTTS) {
      try { (window as any).AndroidTTS.speak(text, "id-ID"); } catch(e) {}
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      speechSynthesis?.cancel?.();
      setTimeout(() => { try { speechSynthesis?.speak?.(utterance); } catch(e) {} }, 150);
    } catch(e) {}
  };

  const copyToClipboard = async (word: Word) => {
    try {
      await navigator.clipboard.writeText(word.word);
    } catch {
      // 복사 실패 시 무시
    }
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
      setTick((t) => t + 1);
    }
    setDragging(null);
    setDragOver(null);
    setFloatPos(null);
    isDragging.current = false;
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!touchStartPos.current) return;
      const dx = t.clientX - touchStartPos.current.x;
      const dy = t.clientY - touchStartPos.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (touchIntent.current === "none") {
        if (adx > 12 || ady > 12) {
          if (adx > ady * 1.5) {
            touchIntent.current = "swipe";
            isSwipe.current = true;
            swipeDir.current = dx >= 0 ? 1 : -1;
            setSwipeDirState(dx >= 0 ? 1 : -1);
            cancelLongPress();
            setSwipingIndex(swipeIndexRef.current);
          } else if (ady > adx) {
            touchIntent.current = "scroll";
            cancelLongPress();
          } else {
            touchIntent.current = "drag";
          }
        }
        touchMoved.current = adx > 10 || ady > 10;
      }

      if (touchIntent.current === "swipe") {
        e.preventDefault();
        const clampedX = swipeDir.current === 1
          ? Math.max(0, Math.min(dx, SWIPE_THRESHOLD + 30))
          : Math.min(0, Math.max(dx, -(SWIPE_THRESHOLD + 30)));
        swipeXRef.current = clampedX;
        setSwipeX(clampedX);
        return;
      }

      if (isDragging.current) {
        e.preventDefault();
        setFloatPos({ x: t.clientX, y: t.clientY });
        startAutoScroll(t.clientY);
        const over = getOverIndex(t.clientX, t.clientY);
        if (over >= 0) setDragOver(over);
      }
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, []);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchMoved.current = false;
    isDragging.current = false;
    isSwipe.current = false;
    touchIntent.current = "none";
    swipeIndexRef.current = index;
    swipeXRef.current = 0;
    longPressTimer.current = setTimeout(() => {
      if (isSwipe.current || touchIntent.current === "swipe" || touchIntent.current === "scroll") return;
      isDragging.current = true;
      touchIntent.current = "drag";
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setFloatWidth(rect.width);
        floatOffsetY.current = t.clientY - rect.top;
      }
      setDragging(index);
      setDragOver(index);
      setFloatPos({ x: t.clientX, y: t.clientY });
      startAutoScroll(t.clientY);
    }, 500);
  };

  const handleTouchEnd = (index: number, word: Word) => {
    const wasDragging = isDragging.current;
    const wasSwipe = touchIntent.current === "swipe";
    if (wasSwipe) {
      if (swipeDir.current === 1 && swipeXRef.current >= SWIPE_THRESHOLD) {
        copyToClipboard(word);
      } else if (swipeDir.current === -1 && swipeXRef.current <= -SWIPE_THRESHOLD) {
        // 밀린 단어가 선택 집합에 있으면 선택 전체, 아니면 이 단어 하나만 삭제 대상
        const targetIds = selectedIds.includes(word.id) ? selectedIds : [word.id];
        setPendingDeleteIds(targetIds);
      }
      setSwipingIndex(null);
      setSwipeX(0);
      swipeXRef.current = 0;
      isSwipe.current = false;
      touchIntent.current = "none";
      cancelLongPress();
      return;
    }
    handleEnd();
    touchIntent.current = "none";
    if (!wasDragging && !touchMoved.current) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;
      if (timeSinceLastTap < 300 && lastTapIndex.current === index) {
        toggleSelect(word.id);
        lastTapTime.current = 0;
        lastTapIndex.current = null;
      } else {
        lastTapTime.current = now;
        lastTapIndex.current = index;
      }
    }
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      isDragging.current = true;
      const cardEl = cardRefs.current[index];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        setFloatWidth(rect.width);
        floatOffsetY.current = e.clientY - rect.top;
      }
      setDragging(index);
      setDragOver(index);
      setFloatPos({ x: e.clientX, y: e.clientY });
    }, 500);
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
    const w = words[index];
    if (w) toggleSelect(w.id);
  };

  // 단어 선택 토글 (복수 선택). 새로 선택하면 마지막 선택으로 기억 -> 단어 추가 위치
  const toggleSelect = (wordId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(wordId)) {
        const next = prev.filter((x) => x !== wordId);
        if (lastSelectedId.current === wordId) {
          lastSelectedId.current = next.length > 0 ? next[next.length - 1] : null;
        }
        return next;
      }
      lastSelectedId.current = wordId;
      toast("새 단어가 이 단어 바로 아래에 추가됩니다");
      return [...prev, wordId];
    });
  };

  // 삭제 확정 실행
  const confirmDelete = () => {
    const ids = pendingDeleteIds;
    ids.forEach((wid) => deleteWord(wid));
    setSelectedIds((prev) => prev.filter((x) => !ids.includes(x)));
    if (lastSelectedId.current && ids.includes(lastSelectedId.current)) {
      lastSelectedId.current = null;
    }
    setPendingDeleteIds([]);
    toast(ids.length > 1 ? ids.length + "개의 단어를 삭제했습니다" : "단어를 삭제했습니다");
    refresh();
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
      <div className="sticky top-0 z-30 bg-background -mx-4 px-4 pt-2 pb-3 mb-3">
        <header className="flex items-center gap-2 mb-2 pr-2">
          <button
            onClick={() => navigate("/")}
            className="text-white hover:text-white/70 w-8 h-8 flex items-center justify-center -ml-2 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="flex-1 min-w-0 text-lg font-semibold font-body tracking-tight truncate">
            {category.name}
          </h1>
        </header>
        <div className="flex justify-end gap-4">
          <button onClick={() => setCsvOpen(true)} className="text-sm text-white hover:underline underline-offset-4 font-gothic">
            CSV 가져오기
          </button>
          <button onClick={() => setAddOpen(true)} className="text-sm text-white hover:underline underline-offset-4 font-gothic">
            + 단어 추가
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {words.map((w, index) => {
          const isDraggingThis = draggingIndex === index;
          const isDropTarget = dragOverIndex === index && draggingIndex !== index;
          const isSelected = selectedIds.includes(w.id);
          const isSwiping = swipingIndex === index;
          const currentSwipeX = isSwiping ? swipeX : 0;
          const swipingRight = isSwiping && swipeDirState === 1;
          const swipingLeft = isSwiping && swipeDirState === -1;
          const showCopyConfirm = swipingRight && currentSwipeX >= SWIPE_THRESHOLD;
          const showDeleteConfirm = swipingLeft && currentSwipeX <= -SWIPE_THRESHOLD;
          // 왼쪽 스와이프 시 몇 개가 지워질지 미리 표시
          const deleteCount = selectedIds.includes(w.id) ? selectedIds.length : 1;
          return (
            <div key={w.id} className="relative overflow-hidden rounded-lg">
              {swipingLeft ? (
                <div className={`absolute inset-0 flex items-center justify-end px-5 rounded-lg transition-colors duration-100 ${showDeleteConfirm ? "bg-red-600" : "bg-red-500/70"}`}>
                  <span className="text-white text-sm font-body mr-2">{showDeleteConfirm ? (deleteCount > 1 ? deleteCount + "개 삭제!" : "삭제!") : "삭제"}</span>
                  <Trash2 size={18} className="text-white" />
                </div>
              ) : (
                <div className={`absolute inset-0 flex items-center px-5 rounded-lg transition-colors duration-100 ${showCopyConfirm ? "bg-sky-500" : "bg-sky-400/70"}`}>
                  <Copy size={18} className="text-white" />
                  <span className="text-white text-sm font-body ml-2">{showCopyConfirm ? "복사!" : "복사"}</span>
                </div>
              )}
              {isDropTarget && (
                <div className="h-0.5 bg-sky-400 rounded-full mx-1 mb-1 shadow-sm shadow-sky-400/50" />
              )}
              <div
                ref={(el) => { cardRefs.current[index] = el; }}
                data-word-index={index}
                className={[
                  "relative flex items-start gap-3 rounded-lg p-4 border border-border/50 select-none text-card-foreground",
                  isDraggingThis ? "opacity-20 cursor-grabbing bg-card" : "bg-card cursor-grab",
                ].join(" ")}
                style={{
                  ...(isSelected ? { backgroundColor: "hsl(30, 20%, 88%)" } : {}),
                  transform: `translateX(${currentSwipeX}px)`,
                  transition: isSwiping ? "none" : "transform 0.25s ease",
                }}
                onTouchStart={(e) => handleTouchStart(index, e)}
                onTouchEnd={() => handleTouchEnd(index, w)}
                onMouseDown={(e) => handleMouseDown(index, e)}
                onClick={() => handleMouseClick(index)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="flex-1 min-w-0 content-bump">
                  <p className="font-word text-base font-medium truncate">{w.word}</p>
                  <p className="text-xs font-bold text-muted-foreground font-gothic">{w.meaning}</p>
                  {w.example && (
                    <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
                  )}
                  {w.exampleMeaning && (
                    <p className="text-[0.6875rem] leading-snug text-muted-foreground/50 font-body mt-0.5">{w.exampleMeaning}</p>
                  )}
                </div>
                <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); speak(w.word); }}
                    className="text-card-foreground hover:text-card-foreground/70 p-1"
                  >
                    <Volume2 size={16} />
                  </button>
                  {w.example && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); speak(w.example); }}
                      className="text-muted-foreground/70 hover:text-muted-foreground p-1"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setEditWord(w); }}
                    className="text-card-foreground/40 hover:text-primary p-1"
                  >
                    <Settings size={16} />
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
      {draggingWord && floatPos && (
        <div
          className="fixed pointer-events-none z-50 flex items-start gap-3 bg-card rounded-lg p-4 border border-sky-400 shadow-lg shadow-sky-400/20"
          style={{ width: floatWidth, left: floatPos.x - floatWidth / 2, top: floatPos.y - floatOffsetY.current }}
        >
          <div className="flex-1 min-w-0 content-bump">
            <p className="font-word text-base font-medium truncate text-muted-foreground">{draggingWord.word}</p>
            <p className="text-xs font-bold text-muted-foreground font-gothic">{draggingWord.meaning}</p>
            {draggingWord.example && (
              <p className="text-xs text-muted-foreground font-word mt-0.5">{draggingWord.example}</p>
            )}
            {draggingWord.exampleMeaning && (
              <p className="text-[0.6875rem] leading-snug text-muted-foreground font-body mt-0.5">{draggingWord.exampleMeaning}</p>
            )}
          </div>
          <div className="flex flex-col items-center justify-between self-stretch gap-3 shrink-0 pt-0.5 pb-0.5">
            <Volume2 size={16} className="text-muted-foreground" />
            {draggingWord.example && <Volume2 size={16} className="text-sky-400/70" />}
            <Settings size={16} className="text-muted-foreground" />
          </div>
        </div>
      )}
      <AddWordDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) { setSelectedIds([]); lastSelectedId.current = null; } }}
        defaultCategoryId={id}
        onAdded={(newWordId) => {
          refresh();
          const anchorId = lastSelectedId.current;
          if (anchorId && newWordId) {
            const currentWords = getWordsByCategory(id!);
            const anchorIdx = currentWords.findIndex((w) => w.id === anchorId);
            const newIdx = currentWords.findIndex((w) => w.id === newWordId);
            if (anchorIdx !== -1 && newIdx !== -1 && newIdx !== anchorIdx + 1) {
              reorderWords(id!, newIdx, anchorIdx + 1);
              refresh();
            }
          }
          setSelectedIds([]);
          lastSelectedId.current = null;
        }}
      />
      <EditWordDialog
        open={!!editWord}
        onOpenChange={(o) => { if (!o) setEditWord(null); }}
        word={editWord}
        onUpdated={refresh}
      />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={refresh} categoryId={id} />
      <AlertDialog open={pendingDeleteIds.length > 0} onOpenChange={(o) => { if (!o) setPendingDeleteIds([]); }}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body text-gray-900">
              {pendingDeleteIds.length > 1 ? pendingDeleteIds.length + "개의 단어를 삭제할까요?" : "이 단어를 삭제할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              삭제한 단어는 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="font-body bg-red-600 hover:bg-red-700 text-white">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
        }
