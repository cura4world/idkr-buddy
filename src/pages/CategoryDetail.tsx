import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, Word } from "@/lib/store";
import AddWordDialog from "@/components/AddWordDialog";
import EditWordDialog from "@/components/EditWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import { ArrowLeft, Volume2 } from "lucide-react";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editWord, setEditWord] = useState<Word | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleTouchStart = (w: Word) => {
    longPressTimer.current = setTimeout(() => {
      setEditWord(w);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
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
        {words.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border/50 select-none text-card-foreground"
            onTouchStart={() => handleTouchStart(w)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onContextMenu={(e) => { e.preventDefault(); setEditWord(w); }}
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
              title="발음 듣기"
            >
              <Volume2 size={16} />
            </button>
          </div>
        ))}
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
