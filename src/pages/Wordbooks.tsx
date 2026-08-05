import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { getCategories, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import { ArrowLeft } from "lucide-react";

/* 단어장을 주제별로 묶어 메인 화면처럼 구역을 나눠 보여줍니다.
   이 화면은 완성된 "책"이라 읽기 전용입니다. 단어장 추가·이름 변경·삭제·순서 이동은
   내 단어장(/category/my-wordbook) 쪽에서만 합니다. */
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
  const location = useLocation();
  // 폴더 화면은 시드에서 온 공용 단어장(읽기 전용 "책")만 보여줍니다.
  // 사용자가 만들거나 보관한 단어장은 내 단어장 안에서 관리합니다.
  const categories = getCategories().filter((c) => c.isShared);

  // 화면에 보일 묶음들. 시드 순서를 그대로 쓰므로 별도 정렬은 하지 않습니다.
  const grouped = (() => {
    const bucket = new Map<string, Category[]>();
    categories.forEach((cat) => {
      const label = groupLabelOf(cat.name);
      if (!bucket.has(label)) bucket.set(label, []);
      bucket.get(label)!.push(cat);
    });
    const ordered = GROUPS.map((g) => g.label).concat([OTHER_LABEL]);
    return ordered
      .filter((label) => bucket.has(label))
      .map((label) => ({ label, items: bucket.get(label)! }));
  })();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          KOSAKATA
        </h1>
      </header>

      <div className="px-4 pt-3">
        {categories.length === 0 ? (
          <section className="mt-3.5">
            <p className="mb-2.5 px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              단어장 0권
            </p>
            <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
              <p className="text-[0.9375rem] text-foreground">단어장이 없습니다</p>
              <p className="mt-1 font-word text-[0.75rem] text-muted-foreground">Belum ada kosakata</p>
            </div>
          </section>
        ) : (
          grouped.map((group, gi) => (
            <section key={group.label} className={gi === 0 ? "mt-3.5" : "mt-6"}>
              <p className="mb-2.5 px-1 text-[0.6875rem] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {group.label} {group.items.length}권
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {group.items.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    first={i === 0}
                    last={i === group.items.length - 1}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default Wordbooks;
