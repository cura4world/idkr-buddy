import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory } from "@/lib/store";
import AddWordDialog from "@/components/AddWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import { ArrowLeft, Volume2 } from "lucide-react";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

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

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        카테고리를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground">
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
          className="text-sm text-primary hover:underline underline-offset-4 font-body"
        >
          CSV 가져오기
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="text-sm text-primary hover:underline underline-offset-4 font-body"
        >
          + 단어 추가
        </button>
      </div>

      <div className="space-y-2">
        {words.map((w) => (
          <div key={w.id} className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="font-word text-base font-medium truncate">{w.word}</p>
              <p className="text-sm text-muted-foreground font-body">{w.meaning}</p>
              {w.example && (
                <p className="text-xs text-muted-foreground/70 font-word mt-0.5">{w.example}</p>
              )}
            </div>
            <button
              onClick={() => {
                deleteWord(w.id);
                refresh();
              }}
              className="text-muted-foreground/50 hover:text-destructive p-1"
            >
              <Trash2 size={14} />
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
      <CSVImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={refresh}
        categoryId={id}
      />
    </div>
  );
}
