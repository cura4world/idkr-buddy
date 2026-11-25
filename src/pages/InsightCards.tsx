// src/pages/InsightCards.tsx
// 지난 카드 모아 보기 (/insight/cards) — 예전 "문화와 생활 정보" 메뉴 자리 (2026-11-17 결정 문서 ⑥)
//
// 2026-11-25 (Arga 결정): 최근 1년의 카드만 보입니다(서버도 1년 지난 카드를 지움).
//   · 1년 치 목록을 한 번에 받아 월마다 나눠 보이고(2026년 11월 …), 위의 분야 단추(전체·음식·지역 …)로 골라 봅니다.
//   · 목록 그림은 작게 줄인 것을, 화면 가까이 온 줄만 받습니다(components/DailyCardImage).
//   · 고른 분야는 카드를 열었다 돌아와도 그대로(이 탭 동안만, sessionStorage).
// 인터넷이 없으면 이 기기에 둔 카드만(분야 정보가 없어 분야 단추는 숨김).

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import DailyCardImage from "@/components/DailyCardImage";
import { DailyCardListItem, cardDateLabel, kstToday, loadCardYear } from "@/lib/dailyCard";

// 분야 단추 순서 — 서버 CARD_TOPICS 의 이름 + "기념일·시기"(workers/kata-public/worker.js). 목록에 있는 분야만 보입니다.
const CAT_ORDER = ["음식", "생활 예절", "말과 표현", "지역", "자연", "전통", "시장", "커피와 차", "놀이", "속담", "교통", "집과 가족", "기념일·시기"];
const ALL = "";
const CAT_SAVE_KEY = "arsip-kartu-cat";

function savedCat(): string {
  try {
    return sessionStorage.getItem(CAT_SAVE_KEY) || ALL;
  } catch (e) {
    return ALL;
  }
}

function monthLabel(d: string): string {
  return d.slice(0, 4) + "년 " + Number(d.slice(5, 7)) + "월";
}

const InsightCards = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<DailyCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [cat, setCat] = useState<string>(savedCat);

  useEffect(() => {
    let alive = true;
    loadCardYear().then((r) => {
      if (!alive) return;
      setItems(r.items);
      setOffline(r.offline);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 목록에 있는 분야만, 정해 둔 순서로(모르는 분야는 뒤에)
  const cats = useMemo(() => {
    const have = new Set(items.map((e) => e.cat).filter((c) => c));
    const known = CAT_ORDER.filter((c) => have.has(c));
    const extra = Array.from(have).filter((c) => CAT_ORDER.indexOf(c) < 0);
    return known.concat(extra);
  }, [items]);

  // 고른 분야가 목록에 없으면(1년이 지나 빠졌거나 인터넷이 없음) 전체로
  const activeCat = cat && cats.indexOf(cat) >= 0 ? cat : ALL;
  const shown = activeCat ? items.filter((e) => e.cat === activeCat) : items;

  const months = useMemo(() => {
    const out: { key: string; label: string; rows: DailyCardListItem[] }[] = [];
    shown.forEach((e) => {
      const key = e.d.slice(0, 7);
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(e);
      else out.push({ key, label: monthLabel(e.d), rows: [e] });
    });
    return out;
  }, [shown]);

  const pick = (c: string) => {
    setCat(c);
    try {
      if (c) sessionStorage.setItem(CAT_SAVE_KEY, c);
      else sessionStorage.removeItem(CAT_SAVE_KEY);
    } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
  };

  const today = kstToday();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-12">
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <header className="text-foreground px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => goBackOr(navigate, location.key, "/insight")}
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">ARSIP KARTU</h1>
        </header>
        {cats.length ? (
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 -mt-0.5" style={{ scrollbarWidth: "none" }} role="group" aria-label="분야">
            {[ALL].concat(cats).map((c) => {
              const on = c === activeCat;
              return (
                <button
                  key={c || "all"}
                  type="button"
                  onClick={() => pick(c)}
                  aria-pressed={on}
                  data-arsip-cat={c || "전체"}
                  className="h-[30px] px-3 rounded-full shrink-0 inline-flex items-center font-gothic text-[0.75rem] font-semibold whitespace-nowrap active:opacity-85"
                  style={
                    on
                      ? { background: "#1E8A99", color: "#FFFFFF" }
                      : { background: "#FFFFFF", color: "#5B6770", boxShadow: "inset 0 0 0 1px #E3E8EB" }
                  }
                >
                  {c || "전체"}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="text-center py-20 font-gothic text-sm text-muted-foreground leading-relaxed">
            {offline ? "인터넷에 연결되면 지난 카드를 볼 수 있습니다." : "아직 지난 카드가 없습니다."}
          </p>
        ) : null}

        {months.map((m) => (
          <section key={m.key} className="mb-4" data-arsip-month={m.key}>
            <h2 className="px-1 pb-1.5 font-gothic text-[0.75rem] font-semibold text-[#8A9398]">{m.label}</h2>
            <div className="bg-card rounded-[18px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.06)" }}>
              {m.rows.map((e, i) => (
                <button
                  key={e.d}
                  type="button"
                  onClick={() => navigate("/insight/card/" + e.d)}
                  className={
                    "w-full flex items-center gap-3 py-2.5 pl-3 pr-3 text-left active:bg-muted/60 " +
                    (i < m.rows.length - 1 ? "border-b border-[#EEF1F3]" : "")
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
          </section>
        ))}

        {!loading && items.length ? (
          <p className="pt-2 text-center font-gothic text-[0.75rem] text-[#8A9398]">최근 1년의 카드를 볼 수 있습니다.</p>
        ) : null}
      </div>
    </div>
  );
};

export default InsightCards;
