import { Category, getWordsByCategory } from "@/lib/store";
import { useNavigate } from "react-router-dom";

/* 공용 단어장 카드 — 읽기 전용입니다.
   공용 단어장은 배포마다 시드로 다시 맞춰지므로 이름 변경·삭제·순서 이동을 두지 않습니다. */
interface CategoryCardProps {
  category: Category;
  first?: boolean;
  last?: boolean;
}

export default function CategoryCard({ category, first, last }: CategoryCardProps) {
  const navigate = useNavigate();

  const words = getWordsByCategory(category.id);

  // 묶음의 첫/마지막 칸은 감싼 상자의 둥근 모서리에 맞춰 같이 둥글게 합니다.
  const rootCls =
    "relative select-none bg-card px-4 py-3 " +
    (first ? "rounded-t-2xl " : "") +
    (last ? "rounded-b-2xl " : "border-b border-border ");

  return (
    <div className={rootCls} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/category/${category.id}`)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left"
        >
          <span className="w-9 h-9 shrink-0 rounded-full border border-border flex items-center justify-center text-[1.0625rem]">
            {category.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] leading-tight text-foreground truncate">{category.name}</span>
            <span className="mt-0.5 block font-word text-[0.71875rem] text-muted-foreground truncate">
              Kosakata · {words.length}단어
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/study/${category.id}`)}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
          >
            카드
          </button>
          <button
            type="button"
            onClick={() => navigate(`/quiz/${category.id}`)}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
          >
            퀴즈
          </button>
        </div>
      </div>
    </div>
  );
}
