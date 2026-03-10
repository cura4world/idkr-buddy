import { Category, getWordsByCategory } from "@/lib/store";
import { useNavigate } from "react-router-dom";

interface CategoryCardProps {
  category: Category;
  onAddWord: (categoryId: string) => void;
}

export default function CategoryCard({ category, onAddWord }: CategoryCardProps) {
  const navigate = useNavigate();
  const words = getWordsByCategory(category.id);

  return (
    <div className="rounded-lg bg-card p-5 shadow-sm border border-border/50 transition-all active:scale-[0.98]">
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/category/${category.id}`)}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{category.emoji}</span>
          <h2 className="text-lg font-medium font-body">{category.name}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{words.length}개의 단어</p>
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => navigate(`/study/${category.id}`)}
          className="text-sm text-primary font-medium hover:underline underline-offset-4"
          disabled={words.length === 0}
        >
          학습하기
        </button>
        <button
          onClick={() => navigate(`/quiz/${category.id}`)}
          className="text-sm text-primary font-medium hover:underline underline-offset-4"
          disabled={words.length < 2}
        >
          퀴즈
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddWord(category.id);
          }}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 ml-auto"
        >
          + 단어 추가
        </button>
      </div>
    </div>
  );
}
