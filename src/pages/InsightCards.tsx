// src/pages/InsightCards.tsx
// 지난 카드 모아 보기 (/insight/cards) — 예전 "문화와 생활 정보" 메뉴 자리 (2026-11-17 결정 문서 ⑥)
// 서버의 카드 목록을 최신 순으로 30장씩 보여 줍니다. 인터넷이 없으면 이 기기에 둔 카드만.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import DailyCardImage from "@/components/DailyCardImage";
import { DailyCardListItem, cardDateLabel, kstToday, loadCardList } from "@/lib/dailyCard";

const InsightCards = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<DailyCardListItem[]>([]);
  const [more, setMore] = useState(false);
  const [state, setState] = useState<"loading" | "ok" | "more">("loading");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCardList().then((r) => {
      if (!alive) return;
      setItems(r.items);
      setMore(r.more);
      setOffline(r.offline);
      setState("ok");
    });
    return () => {
      alive = false;
    };
  }, []);

  const loadMore = () => {
    if (state !== "ok" || !items.length) return;
    setState("more");
    loadCardList(items[items.length - 1].d).then((r) => {
      setItems((prev) => prev.concat(r.items.filter((e) => !prev.some((p) => p.d === e.d))));
      setMore(r.more);
      setState("ok");
    });
  };

  const today = kstToday();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-12">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/insight")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">ARSIP KARTU</h1>
      </header>

      <div className="px-4 pt-4">
        {state === "loading" ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : null}

        {state !== "loading" && items.length === 0 ? (
          <p className="text-center py-20 font-gothic text-sm text-muted-foreground leading-relaxed">
            {offline ? "인터넷에 연결되면 지난 카드를 볼 수 있습니다." : "아직 지난 카드가 없습니다."}
          </p>
        ) : null}

        {items.length ? (
          <div className="bg-card rounded-[18px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.06)" }}>
            {items.map((e, i) => (
              <button
                key={e.d}
                type="button"
                onClick={() => navigate("/insight/card/" + e.d)}
                className={
                  "w-full flex items-center gap-3 py-2.5 pl-3 pr-3 text-left active:bg-muted/60 " +
                  (i < items.length - 1 ? "border-b border-[#EEF1F3]" : "")
                }
              >
                <span className="rounded-xl overflow-hidden bg-[#F9F2E1] shrink-0">
                  <DailyCardImage d={e.d} has={e.img} size={52} rounded={12} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-gothic text-[0.6875rem] text-[#8A9398]">{e.d === today ? "오늘" : cardDateLabel(e.d)}</span>
                    {e.chip ? <span className="font-gothic text-[0.6875rem] text-[#1E8A99]">· {e.chip}</span> : null}
                  </span>
                  <span className="block mt-0.5 font-gothic text-[0.84375rem] leading-tight text-foreground truncate">{e.title}</span>
                </span>
                <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#B7BDC1]" />
              </button>
            ))}
          </div>
        ) : null}

        {more ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={state === "more"}
            className="mt-4 w-full h-11 rounded-2xl bg-card font-gothic text-sm text-[#1E8A99] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.06)" }}
          >
            {state === "more" ? <Loader2 size={16} className="animate-spin" /> : null} 더 보기
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default InsightCards;
