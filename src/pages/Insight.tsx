// src/pages/Insight.tsx
// "인도네시아 이해" 허브: 개관 / 종교 / 기독교 / 역사 / 지도 / 정보 6개 하위 메뉴.
// 하위 페이지는 단계적으로 추가된다 (미구현 항목은 "준비 중" 토스트).

import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Landmark,
  Cross,
  Hourglass,
  Map as MapIcon,
  Lightbulb,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

interface SubCardProps {
  onClick: () => void;
  icon: LucideIcon;
  border: string;
  tile: string;
  title: string;
  sub: string;
}

const SubCard = ({ onClick, icon: Icon, border, tile, title, sub }: SubCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full relative overflow-hidden rounded-2xl bg-white h-[5rem] px-4 text-left border ${border} transition-transform duration-150 active:scale-[0.98]`}
  >
    <div className="relative h-full flex items-center gap-3.5">
      <span className={`w-12 h-12 rounded-2xl ${tile} flex items-center justify-center shrink-0 shadow-lg shadow-black/30`}>
        <Icon size={23} className="text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-gray-900 truncate">{title}</p>
        <p className="mt-0.5 text-xs font-gothic tracking-wide text-gray-500 truncate">{sub}</p>
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" />
    </div>
  </button>
);

const Insight = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-6 max-w-lg mx-auto relative">
      <header className="relative flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15 -ml-1"
          title="홈으로"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 이해</h1>
          <p className="mt-1 text-xs font-word italic text-white/45">Wawasan Indonesia</p>
        </div>
      </header>

      <div className="relative space-y-2">
        <SubCard
          onClick={() => navigate("/insight/overview")}
          icon={Globe}
          border="border-sky-300/70"
          tile="bg-sky-400"
          title="인도네시아 개관"
          sub="인구 · 경제 · 사회 한눈에"
        />
        <SubCard
          onClick={() => navigate("/insight/religion")}
          icon={Landmark}
          border="border-violet-300/70"
          tile="bg-violet-500"
          title="인도네시아 종교"
          sub="6개 공인 종교와 분포"
        />
        <SubCard
          onClick={() => navigate("/insight/christian")}
          icon={Cross}
          border="border-rose-300/70"
          tile="bg-rose-500"
          title="인도네시아 기독교"
          sub="지역 · 종족 · 교단 현황"
        />
        <SubCard
          onClick={() => navigate("/insight/history")}
          icon={Hourglass}
          border="border-amber-300/70"
          tile="bg-amber-500"
          title="인도네시아 역사"
          sub="타임라인으로 보는 역사"
        />
        <SubCard
          onClick={() => navigate("/map")}
          icon={MapIcon}
          border="border-orange-300/70"
          tile="bg-orange-500"
          title="인도네시아 지도"
          sub="도시와 관광지 탐험"
        />
        <SubCard
          onClick={() => navigate("/insight/tips")}
          icon={Lightbulb}
          border="border-emerald-300/70"
          tile="bg-emerald-400"
          title="인도네시아 정보"
          sub="소소한 정보와 팁"
        />
      </div>
    </div>
  );
};

export default Insight;
