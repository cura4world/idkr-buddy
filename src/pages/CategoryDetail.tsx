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

  // 드래그 상태
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef(false);

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

  // ── 롱프레스 → 드래그 시작 ──
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      isDragging.current = true;
      setDraggingIndex(index);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) {
      // 롱프레스 전에 움직이면 취소
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      return;
    }
    e.preventDefault();

    // 현재 터치 위치의 엘리먼트 찾기
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const wordCard = el?.closest("[data-word-index]");
    if (wordCard) {
      const overIndex = parseInt(wordCard.getAttribute("data-word-index") || "-1");
      if (overIndex >= 0) setDragOverIndex(overIndex);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging.current && draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      reorderWords(id!, draggingIndex, dragOverIndex);
      refresh();
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
    isDragging.current = false;
  };

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        카테고리를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-white mb-6 hover:text-white/80">
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

          return (
            <div
              key={w.id}
              data-word-index={index}
              className={[
                "relative flex items-start gap-3 bg-card rounded-lg p-4 border select-none text-card-foreground transition-all duration-150",
                isDraggingThis
                  ? "border-primary shadow-lg shadow-primary/30 scale-[1.02] opacity-90 z-10 bg-card/95"
                  : "border-border/50",
                isDropTarget
                  ? "border-primary/60 border-t-2 border-t-primary"
                  : "",
              ].join(" ")}
              onTouchStart={(e) => handleTouchStart(index, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* 단어 정보 */}
              <div className="flex-1 min-w-0">
                <p className="font-word text-base font-medium truncate">{w.word}</p>
                <p className="text-sm text-muted-foreground font-body">{w.meaning}</p>
                {w.example && (
                  <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
                )}
                {/* (1) 예화 한국어 뜻 추가 */}
                {w.exampleMeaning && (
                  <p className="text-xs text-muted-foreground/50 font-body mt-0.5">{w.exampleMeaning}</p>
                )}
              </div>

              {/* (2) 오른쪽 아이콘 영역 */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                {/* 위: 톱니바퀴 → 단어 정보(편집) */}
                <button
                  onClick={() => setEditWord(w)}
                  className="text-card-foreground/40 hover:text-primary p-1"
                  title="단어 정보"
                >
                  <Settings size={16} />
                </button>
                {/* 아래: 스피커 → 발음 듣기 */}
                <button
                  onClick={() => speak(w.word)}
                  className="text-card-foreground/50 hover:text-primary p-1"
                  title="발음 듣기"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* 드래그 중 표시 */}
              {isDraggingThis && (
                <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {words.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-body">
          <p>단어가 없습니다.</p>
        </div>
      )}

      <AddWordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultCategoryId={id}
        onAdded={refresh}
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
