import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { getCategories, getWordCount, Category } from "@/lib/store";
import CategoryCard from "@/components/CategoryCard";
import { ArrowLeft } from "lucide-react";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { GROUP_ORDER, GROUP_STYLES, GroupKey, groupOf, bookNumber } from "@/lib/wordbookGroups";

/* 기본 단어장 폴더 (시안: 단어장 폴더 · 추천안).
   이 화면은 완성된 "책"이라 읽기 전용입니다. 단어장 추가·이름 변경·삭제·순서 이동은
   내 단어장(/category/my-wordbook) 쪽에서만 합니다.

   - 맨 위 묶음 단추(3칸 바둑판)는 그 묶음 위치로 내려가는 바로가기입니다(다른 묶음을 숨기지 않음).
     스크롤하면 지금 보고 있는 묶음의 단추가 진해집니다.
   - 묶음은 단어장 이름 앞 번호로 정합니다(src/lib/wordbookGroups.ts — 예전 36권·새 41권 번호 모두).
   - "성경과 신앙" 묶음은 관리자·Special Member 에게만 보입니다. 관리자판·회원판(스토어 앱 밖)은 등급이
     늘 관리자라 지금처럼 모두 보입니다.
   - 무료 사용자는 기본 단어장 폴더가 잠겨 있어 구독 화면으로 보냅니다. */

const Wordbooks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const plan = usePlan();

  const all = getCategories();
  const shared = all.filter((c) => c.isShared);

  // 화면에 보일 묶음들. 저장 순서는 새로 생긴 단어장이 끝에 붙으므로(2026-11 재분류 뒤 01·06·21·26·27)
  // 이름 앞 번호로 다시 줄 세웁니다. 번호가 같거나 없으면 저장 순서 그대로.
  const grouped = useMemo(() => {
    const bucket = new Map<GroupKey, Category[]>();
    const ordered = shared
      .map((c, i) => ({ c, i, n: bookNumber(c.name) ?? 999 }))
      .sort((a, b) => a.n - b.n || a.i - b.i)
      .map((x) => x.c);
    ordered.forEach((cat) => {
      const key = groupOf(cat, shared);
      if (key === "faith" && !plan.staff) return;
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)!.push(cat);
    });
    return GROUP_ORDER.filter((k) => bucket.has(k)).map((k) => ({ key: k, items: bucket.get(k)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared.length, plan.staff]);

  const bookCount = grouped.reduce((n, g) => n + g.items.length, 0);
  const wordCount = grouped.reduce(
    (n, g) => n + g.items.reduce((m, c) => m + getWordCount(c.id), 0),
    0
  );

  const topRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<GroupKey, HTMLElement | null>>>({});
  const [active, setActive] = useState<GroupKey | null>(null);
  const activeRef = useRef<GroupKey | null>(null);

  // 스크롤 위치로 지금 보는 묶음을 정합니다.
  useEffect(() => {
    if (grouped.length === 0) return;
    const pick = () => {
      const stickyH = topRef.current ? topRef.current.getBoundingClientRect().height : 0;
      let cur: GroupKey = grouped[0].key;
      for (const g of grouped) {
        const el = sectionRefs.current[g.key];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= stickyH + 24) cur = g.key;
      }
      // 맨 아래까지 내리면 마지막 묶음
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) cur = grouped[grouped.length - 1].key;
      if (activeRef.current !== cur) {
        activeRef.current = cur;
        setActive(cur);
      }
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [grouped]);

  const jumpTo = (key: GroupKey) => {
    const el = sectionRefs.current[key];
    if (!el) return;
    const stickyH = topRef.current ? topRef.current.getBoundingClientRect().height : 0;
    const y = el.getBoundingClientRect().top + window.scrollY - stickyH - 6;
    try {
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, Math.max(0, y));
    }
  };

  if (!plan.plus) return <Navigate to={PAYWALL_PATH} replace />;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <div ref={topRef} className="sticky top-0 z-30 bg-background">
        <header className="h-14 px-4 flex items-center gap-3 border-b border-[#E3E8EB] text-foreground">
          <button
            onClick={() => goBackOr(navigate, location.key, "/")}
            className="w-10 h-10 -ml-2 flex items-center justify-center shrink-0 text-foreground"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
            KOSAKATA
          </h1>
          {bookCount > 0 ? (
            <span className="shrink-0 font-gothic text-[0.75rem] text-[#646C72]">
              {bookCount}권 · <span className="font-word">{wordCount.toLocaleString("en-US")}</span>단어
            </span>
          ) : null}
        </header>

        {grouped.length > 1 ? (
          <div className="px-4 py-3 grid grid-cols-3 gap-1.5 border-b border-[#E3E8EB]">
            {grouped.map((g) => {
              const on = active === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => jumpTo(g.key)}
                  className={
                    "h-[34px] px-1.5 rounded-full whitespace-nowrap flex items-center justify-center font-gothic text-[0.78125rem] font-semibold transition-colors " +
                    (on ? "bg-[#104B60] text-white border-0" : "bg-white text-[#3B4245] border border-[#DDE3E6]")
                  }
                >
                  {GROUP_STYLES[g.key].label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="px-4 pt-1">
        {grouped.length === 0 ? (
          <section className="mt-[18px]">
            <div className="rounded-[18px] bg-card px-4 py-10 text-center shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
              <p className="text-[0.9375rem] text-foreground">단어장이 없습니다</p>
              <p className="mt-1 font-word text-[0.75rem] text-muted-foreground">Belum ada kosakata</p>
            </div>
          </section>
        ) : (
          grouped.map((group) => {
            const st = GROUP_STYLES[group.key];
            return (
              <section
                key={group.key}
                ref={(el) => { sectionRefs.current[group.key] = el; }}
                className="mt-[18px]"
              >
                <p className="mx-1 mb-[9px] flex items-center gap-[7px] font-gothic text-[0.875rem] font-bold tracking-[0.02em] text-[#3B4245]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} />
                  {st.label} <span className="tracking-normal font-medium">{group.items.length}권</span>
                </p>
                <div className="rounded-[18px] bg-card overflow-hidden shadow-[0_1px_3px_rgba(16,40,50,0.06)]">
                  {group.items.map((cat, i) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      variant="folder"
                      tile={st.tint}
                      last={i === group.items.length - 1}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Wordbooks;
