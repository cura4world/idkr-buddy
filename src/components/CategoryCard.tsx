import { useNavigate } from "react-router-dom";
import { Category, getWordsByCategory } from "@/lib/store";
import { bookNumberText, bookTitle } from "@/lib/wordbookGroups";

/* 단어장 한 줄 (시안: 단어장 폴더 · 추천안 / 내 단어장 · 추천안).

   variant="folder"   — 기본 단어장 폴더의 한 줄. 묶음 색 타일 + 번호 + 이름 + 단어 수,
                         오른쪽에 "카드 | 퀴즈" 알약. 공용 단어장은 읽기 전용이라 편집 메뉴가 없습니다.
   variant="archived" — 내 단어장 안 "보관한 단어장" 한 줄. 색 타일 + 이름 + 단어 수 + ›.
                         이름 변경·삭제는 그 단어장 안의 ⋮ 메뉴에서 합니다.

   한 묶음은 흰 상자 하나에 담기고, 줄 사이에만 옅은 선을 긋습니다(last 이면 선 없음). */
interface CategoryCardProps {
  category: Category;
  variant?: "folder" | "archived";
  /** 타일 바탕색 (묶음 색 / 보관 단어장은 차례로 돌아가는 색) */
  tile?: string;
  last?: boolean;
}

export default function CategoryCard({ category, variant = "folder", tile = "#EEF1F3", last }: CategoryCardProps) {
  const navigate = useNavigate();
  const count = getWordsByCategory(category.id).length;
  const rowBorder = last ? "" : " border-b border-[#EEF1F3]";

  if (variant === "archived") {
    return (
      <button
        type="button"
        onClick={() => navigate("/category/" + category.id)}
        onContextMenu={(e) => e.preventDefault()}
        className={"w-full flex items-center gap-3 py-3 pl-3.5 pr-3 text-left select-none active:bg-[#F6F7F5]" + rowBorder}
      >
        <span
          className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[1.0625rem]"
          style={{ background: tile }}
        >
          {category.emoji}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-px">
          <span className="block truncate font-body text-[0.9375rem] text-[#1D1F1E]">{category.name}</span>
          <span className="block font-gothic text-[0.75rem] text-[#646C72]">
            <span className="font-word">{count}</span>단어
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA1A6" strokeWidth="2" aria-hidden="true" className="shrink-0">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    );
  }

  const num = bookNumberText(category.name);
  const title = bookTitle(category.name);

  return (
    <div
      className={"flex items-center gap-3 py-3 pl-3.5 pr-3 select-none" + rowBorder}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => navigate("/category/" + category.id)}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
      >
        <span
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-[1.1875rem]"
          style={{ background: tile }}
        >
          {category.emoji}
        </span>
        <span className="flex-1 min-w-0">
          {/* 이름은 자르지 않고 두 줄까지 꺾습니다(QA Q06 — 360px·글자 115% 이상에서 잘리던 것).
              낱말 중간이 아니라 띄어쓰기와 "·" 뒤에서만 꺾고, 그래도 안 들어가면 그때만 글자 사이에서. */}
          <span
            className="block font-body text-[0.96875rem] leading-[1.3] text-[#1D1F1E]"
            style={{ wordBreak: "keep-all", overflowWrap: "anywhere" }}
          >
            {num ? <span className="mr-1.5 font-word text-[0.75rem] text-[#9AA1A6]">{num}</span> : null}
            {title.split("·").map((part, i) => (
              <span key={i}>{i > 0 ? "·" : ""}{i > 0 ? <wbr /> : null}{part}</span>
            ))}
          </span>
          <span className="mt-0.5 block font-gothic text-[0.71875rem] text-[#646C72]">
            <span className="font-word">{count}</span>단어
          </span>
        </span>
      </button>

      <span className="shrink-0 h-9 rounded-full bg-[#F1F4F5] flex items-center font-gothic text-[0.78125rem] font-semibold text-[#2C6D63]">
        <button
          type="button"
          onClick={() => navigate("/study/" + category.id)}
          className="h-9 pl-[13px] pr-3 rounded-l-full active:bg-[#E3EEEC]"
        >
          카드
        </button>
        <span className="w-px h-3.5 bg-[#D5DCDF]" />
        <button
          type="button"
          onClick={() => navigate("/quiz/" + category.id)}
          className="h-9 pl-3 pr-[13px] rounded-r-full active:bg-[#E3EEEC]"
        >
          퀴즈
        </button>
      </span>
    </div>
  );
}
