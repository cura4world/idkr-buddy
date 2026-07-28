// src/pages/Insight.tsx
// "인도네시아 이해" 허브: 개관 / 지도 / 종족 / 종교 / 기독교 / 역사 / 정보 7개 하위 메뉴.
// 메인화면·기도 화면과 같은 목록 어법 (섹션 라벨 + 흰 카드 안의 행).

import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Landmark,
  Users,
  Cross,
  Hourglass,
  Map as MapIcon,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface RowProps {
  icon: LucideIcon;
  title: string;
  sub: string;
  onClick: () => void;
  last?: boolean;
}

const Row = ({ icon: Icon, title, sub, onClick, last }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
      (last ? "" : "border-b border-border")
    }
  >
    <Icon size={20} strokeWidth={1.6} className="text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[15px] leading-tight text-foreground truncate">{title}</p>
      <p className="mt-0.5 font-word text-[11.5px] text-muted-foreground truncate">{sub}</p>
    </div>
    <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2.5 px-1 text-[11px] font-gothic font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    {children}
  </p>
);

const Insight = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="홈으로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold truncate">인도네시아 이해</h1>
      </header>

      <div className="px-4 pt-4">
        {/* 한눈에 보기 */}
        <section>
          <SectionLabel>한눈에 보기</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row
              icon={Globe}
              title="인도네시아 개관"
              sub="Ikhtisar"
              onClick={() => navigate("/insight/overview")}
            />
            <Row
              icon={MapIcon}
              title="인도네시아 지도"
              sub="Peta"
              onClick={() => navigate("/map")}
              last
            />
          </div>
        </section>

        {/* 사람과 믿음 */}
        <section className="mt-6">
          <SectionLabel>사람과 믿음</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row
              icon={Users}
              title="인도네시아 종족"
              sub="Suku Bangsa"
              onClick={() => navigate("/insight/ethnic")}
            />
            <Row
              icon={Landmark}
              title="인도네시아 종교"
              sub="Agama"
              onClick={() => navigate("/insight/religion")}
            />
            <Row
              icon={Cross}
              title="인도네시아 기독교"
              sub="Kekristenan"
              onClick={() => navigate("/insight/christian")}
              last
            />
          </div>
        </section>

        {/* 역사와 생활 */}
        <section className="mt-6">
          <SectionLabel>역사와 생활</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Row
              icon={Hourglass}
              title="인도네시아 역사"
              sub="Sejarah"
              onClick={() => navigate("/insight/history")}
            />
            <Row
              icon={Lightbulb}
              title="인도네시아 정보"
              sub="Info dan Tips"
              onClick={() => navigate("/insight/tips")}
              last
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Insight;
