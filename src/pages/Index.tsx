import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getSavedWordIds } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import CSVImportDialog from "@/components/CSVImportDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";

const Index = () => {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const categories = getCategories();

  const [addWordOpen, setAddWordOpen] = useState(false);
  const [addWordCat, setAddWordCat] = useState<string | undefined>();
  const [csvOpen, setCsvOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);

  const handleAddWord = (categoryId: string) => {
    setAddWordCat(categoryId);
    setAddWordOpen(true);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold font-body tracking-tight">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-body">
          인도네시아어 · 한국어 단어장
        </p>
      </header>

      {/* Utilities row */}
      <div className="flex gap-4 mb-6 text-sm">
        <button
          onClick={() => setCsvOpen(true)}
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline font-body"
        >
          CSV 가져오기
        </button>
        <button
          onClick={() => setAddCatOpen(true)}
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline font-body"
        >
          카테고리 추가
        </button>
      </div>

      {/* Category grid */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} onAddWord={handleAddWord} />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground font-body">
          <p>아직 카테고리가 없습니다.</p>
          <button
            onClick={() => setAddCatOpen(true)}
            className="mt-2 text-primary underline underline-offset-4"
          >
            첫 카테고리를 만들어보세요
          </button>
        </div>
      )}

      <AddWordDialog
        open={addWordOpen}
        onOpenChange={setAddWordOpen}
        defaultCategoryId={addWordCat}
        onAdded={refresh}
      />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={refresh} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
