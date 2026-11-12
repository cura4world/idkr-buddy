// src/pages/Insight.tsx
// "인도네시아 이해" 허브 (시안 IN1-Plus · IN2-Free, 2026-11-10).
//   · 맨 위에 지도를 큰 카드로 (실제 지도 모양 + 대도시 점)
//   · 개관 / 종족 / 종교 / (관리자판: 기독교) / 역사 / 생활 정보 — 차분한 색 타일 목록
//   · 공개판 무료 사용자: 메뉴는 보이되 잠기고, 위에 귤색 안내 상자. 누르면 구독 화면(PAYWALL_PATH)
//   · 하위 화면과 /map 은 App.tsx 에서 InsightGate 로 한 번 더 막습니다(주소로 바로 들어오는 경우)

import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { isStoreApp } from "@/lib/platform";
import { PAYWALL_PATH, usePlan } from "@/lib/plan";
import PlusLockBox from "@/components/PlusLockBox";
import { INDONESIA_PATH, MAP_CITIES, NEIGHBOR_SHAPES } from "@/lib/mapData";
import { ArrowLeft, Globe, Landmark, Users, Cross, Hourglass, Lightbulb, ChevronRight, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RowItem {
  icon: LucideIcon;
  bg: string;
  fg: string;
  title: string;
  sub: string;
  to: string;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mx-1 mb-2 font-gothic text-[0.8125rem] font-bold tracking-[0.02em] text-[#3B4245]">{children}</p>
);

const CARD_SHADOW = { boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

const Rows = ({ items, locked, go }: { items: RowItem[]; locked: boolean; go: (to: string) => void }) => (
  <div className="bg-card rounded-[18px] overflow-hidden" style={{ ...CARD_SHADOW, opacity: locked ? 0.72 : 1 }}>
    {items.map((it, i) => {
      const Icon = it.icon;
      return (
        <button
          key={it.to}
          type="button"
          onClick={() => go(it.to)}
          className={
            "w-full flex items-center gap-3 py-3 pl-3.5 pr-3 text-left active:bg-muted/60 transition-colors " +
            (i < items.length - 1 ? "border-b border-[#EEF1F3]" : "")
          }
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: it.bg, color: it.fg }}
          >
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-gothic text-[0.90625rem] leading-tight text-foreground truncate">{it.title}</span>
            <span className="block mt-px font-word text-[0.6875rem] text-[#646C72] truncate">{it.sub}</span>
          </span>
          {locked ? (
            <Lock size={16} strokeWidth={2} className="shrink-0 text-[#A9B0B4]" />
          ) : (
            <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#B7BDC1]" />
          )}
        </button>
      );
    })}
  </div>
);

// 지도 카드의 작은 지도 — 지도 화면과 같은 해안선 데이터, 대도시(tier 1)만 점으로.
const MiniMap = () => (
  <svg
    viewBox="0 60 1000 380"
    width="100%"
    height={118}
    preserveAspectRatio="xMidYMid slice"
    className="block"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="1000" height="460" fill="#0b2f37" />
    {NEIGHBOR_SHAPES.map((c) => (
      <path key={c.id} d={c.d} fill="#123c42" stroke="#2c5860" strokeWidth={1.2} />
    ))}
    <path d={INDONESIA_PATH} fill="#17555c" stroke="#3e8d95" strokeWidth={1.4} />
    {MAP_CITIES.filter((c) => c.tier === 1).map((c) => (
      <circle key={c.id} cx={c.x} cy={c.y} r={7} fill="#f97316" stroke="#fff" strokeWidth={2.4} />
    ))}
  </svg>
);

const MapCard = ({ locked, onClick }: { locked: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="block w-full text-left rounded-[18px] overflow-hidden bg-[#0b2f37] active:opacity-90"
    style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.10)", opacity: locked ? 0.8 : 1 }}
  >
    <MiniMap />
    <span className="flex items-center gap-3 pt-3 pb-3.5 pl-4 pr-3.5">
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-[7px]">
          <span className="font-gothic text-[0.9375rem] font-semibold text-white">인도네시아 지도</span>
          <span className="font-word text-[0.6875rem] text-[#9CC3C8]">Peta</span>
        </span>
        <span className="block mt-[3px] font-gothic text-[0.71875rem] text-[#B9D4D7]">
          섬과 도시를 눌러 그 지역 이야기를 읽어 보세요
        </span>
      </span>
      <span
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
        style={{ background: "rgba(255,255,255,0.14)" }}
      >
        {locked ? (
          <Lock size={15} strokeWidth={2} className="text-[#E6EEF0]" />
        ) : (
          <ChevronRight size={16} strokeWidth={2.2} className="text-white" />
        )}
      </span>
    </span>
  </button>
);

// Plus 안내 상자 (무료 사용자) — 공용 PlusLockBox (게임방·이야기·내 정보와 같은 모양).
const PlusBox = ({ onClick }: { onClick: () => void }) => (
  <PlusLockBox
    title="인도네시아 이해는 Plus 회원 기능입니다"
    lines={["Plus로 지도와 읽을거리를 열고,", "지역마다 단어를 담을 수 있습니다"]}
    onClick={onClick}
  />
);

const Insight = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const publicEdition = isStoreApp();
  const { plus, staff } = usePlan();
  const locked = !plus;

  const go = (to: string) => navigate(locked ? PAYWALL_PATH : to);

  const overview: RowItem[] = [
    { icon: Globe, bg: "#E4EEF6", fg: "#2B5F86", title: "인도네시아 개관", sub: "Ikhtisar", to: "/insight/overview" },
  ];
  const people: RowItem[] = [
    { icon: Users, bg: "#FCEFE3", fg: "#9A5B1E", title: "인도네시아 종족", sub: "Suku Bangsa", to: "/insight/ethnic" },
    { icon: Landmark, bg: "#ECE8F6", fg: "#5B4A8C", title: "인도네시아 종교", sub: "Agama", to: "/insight/religion" },
  ];
  // 공개판(스토어 앱)에서는 기독교 항목을 관리자·Special Member 에게만 둡니다(2026-11-12 사용자 요청)
  if (!publicEdition || staff) {
    people.push({ icon: Cross, bg: "#F4E8EC", fg: "#8A3E52", title: "인도네시아 기독교", sub: "Kekristenan", to: "/insight/christian" });
  }
  const life: RowItem[] = [
    { icon: Hourglass, bg: "#EAF2DF", fg: "#4E6A2A", title: "인도네시아 역사", sub: "Sejarah", to: "/insight/history" },
    { icon: Lightbulb, bg: "#FFF3D6", fg: "#8A6A12", title: "문화와 생활정보", sub: "Info dan Tips", to: "/insight/tips" },
  ];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="홈으로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">WAWASAN INDONESIA</h1>
      </header>

      <div className="px-4 pt-4 flex flex-col gap-2.5">
        {locked ? <PlusBox onClick={() => navigate(PAYWALL_PATH)} /> : null}

        {/* 한눈에 보기 */}
        <section>
          <SectionTitle>한눈에 보기</SectionTitle>
          <div className="flex flex-col gap-2.5">
            <MapCard locked={locked} onClick={() => go("/map")} />
            <Rows items={overview} locked={locked} go={go} />
          </div>
        </section>

        {/* 사람과 믿음 */}
        <section className="mt-2">
          <SectionTitle>사람과 믿음</SectionTitle>
          <Rows items={people} locked={locked} go={go} />
        </section>

        {/* 역사와 생활 */}
        <section className="mt-2">
          <SectionTitle>역사와 생활</SectionTitle>
          <Rows items={life} locked={locked} go={go} />
        </section>
      </div>
    </div>
  );
};

export default Insight;
