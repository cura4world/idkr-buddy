import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getSavedWordIds } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import AddWordDialog from "@/components/AddWordDialog";
import AddCategoryDialog from "@/components/AddCategoryDialog";

const Index = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const categories = getCategories();
  const savedCount = getSavedWordIds().length;

  const [addWordOpen, setAddWordOpen] = useState(false);
  const [addWordCat, setAddWordCat] = useState<string | undefined>();
  const [addCatOpen, setAddCatOpen] = useState(false);

  const handleAddWord = (categoryId: string) => {
    setAddWordCat(categoryId);
    setAddWordOpen(true);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold font-body tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <p className="text-sm text-foreground mt-1 font-body">
          인도네시아어 단어장
        </p>
      </header>

      {/* Utilities row */}
      <div className="flex justify-end mb-6 text-sm">
        <button
          onClick={() => setAddCatOpen(true)}
          className="text-foreground hover:text-foreground/80 underline-offset-4 hover:underline font-body"
        >
          단어장 추가
        </button>
      </div>

      {/* Category grid */}
      <div className="space-y-3">
        {/* Saved words as category-style card */}
        {savedCount > 0 && (
          <div className="rounded-lg bg-card p-5 shadow-sm border border-border/50 transition-all active:scale-[0.98] text-card-foreground">
            <div
              className="cursor-pointer"
              onClick={() => navigate("/saved")}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📌</span>
                <h2 className="text-lg font-medium font-body">단어보관함</h2>
              </div>
              <p className="text-sm text-muted-foreground">{savedCount}개의 단어</p>
            </div>
            <div className="mt-3 flex justify-end gap-3">
              <button
                onClick={() => navigate("/saved/quiz")}
                className="text-sm text-primary font-medium hover:underline underline-offset-4"
                disabled={savedCount < 2}
              >
                퀴즈
              </button>
              <button
                onClick={() => navigate("/saved/study")}
                className="text-sm text-primary font-medium hover:underline underline-offset-4"
              >
                플래시카드
              </button>
            </div>
          </div>
        )}

        {categories.map((cat, idx) => (
          <CategoryCard key={cat.id} category={cat} onAddWord={handleAddWord} onChanged={refresh} isFirst={idx === 0} isLast={idx === categories.length - 1} />
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
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
