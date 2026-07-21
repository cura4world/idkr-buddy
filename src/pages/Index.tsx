import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, restoreSharedCategories } from "@/lib/store";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { RotateCcw, Settings, BookOpen, ScrollText, Library, Star, ChevronRight, Heart, Newspaper, Map as MapIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";

// 교회 아이콘: 지붕 위에 십자가가 선명하게 보이는 심플한 형태 (lucide 스타일 스트로크)
const ChurchCross = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* 지붕 위 십자가 */}
    <path d="M12 2v5" />
    <path d="M9.5 4h5" />
    {/* 지붕 */}
    <path d="M4 13 12 7l8 6" />
    {/* 건물 본체 */}
    <path d="M6 12v9h12v-9" />
    {/* 문 */}
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
  </svg>
);

// 5개 박스 공통 골격 (높이 통일: 5.5rem — 글자크기 설정에 따라 함께 커짐)
const CARD_BASE =
  "w-full relative overflow-hidden rounded-2xl bg-card h-[5.5rem] px-4 card-lift border transition-transform duration-150 active:scale-[0.98]";

type MenuCardProps = {
  onClick: () => void;
  icon: LucideIcon | ((p: { size?: number; className?: string }) => JSX.Element);
  grad: string;
  border: string;
  inner: string;
  tile: string;
  mark: string;
  title: string;
  sub: string;
  badge?: string;
};

const MenuCard = ({ onClick, icon: Icon, grad, border, inner, tile, mark, title, sub, badge }: MenuCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`${CARD_BASE} text-left bg-gradient-to-br from-transparent ${grad} ${border}`}
  >
    <span aria-hidden className={`pointer-events-none absolute inset-[3px] rounded-[13px] border ${inner}`} />
    <Icon size={110} className={`absolute -right-3.5 top-1/2 -translate-y-1/2 ${mark} -rotate-12 pointer-events-none`} />
    <div className="relative h-full flex items-center gap-3.5">
      <span className={`w-12 h-12 rounded-2xl ${tile} flex items-center justify-center shrink-0 shadow-lg shadow-black/30`}>
        <Icon size={23} className="text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-gray-900 truncate">{title}</p>
          {badge && (
            <span className="shrink-0 text-xs font-gothic font-medium text-rose-600 bg-rose-500/10 border border-rose-300/60 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-gothic tracking-wide text-gray-500 truncate">{sub}</p>
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" />
    </div>
  </button>
);

const Index = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 메인 기능 박스: 사전 / 이야기 / 뉴스 / 묵상 / 기도 / 단어장(폴더) / 내 단어장
  const allCategories = getCategories();
  const hasMyWordbook = allCategories.some((c) => c.id === MY_WORDBOOK_ID);
  const myWordCount = getWordsByCategory(MY_WORDBOOK_ID).length;
  const folderCount = allCategories.filter((c) => c.id !== MY_WORDBOOK_ID).length;

  const handleRestore = () => {
    const restored = restoreSharedCategories();
    if (restored) {
      refresh();
      toast("공용 단어장이 복구되었습니다.");
    } else {
      toast("복구할 단어장이 없습니다.");
    }
  };

  const iconBtn =
    "w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15 transition-colors";

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto relative">
      {/* 확정 배경: 그라데이션 물결 — 빛무리 3개가 임의 궤적으로 표류하며 명암 호흡 (blur 없음, WebView 안전) */}
      <style>{`
        .kk-glow { position: fixed; border-radius: 50%; pointer-events: none; will-change: opacity, transform; }
        .kk-glow-a { width:130vmax; height:130vmax; right:-55vmax; bottom:-55vmax;
          background:radial-gradient(circle, #2f95aa 0%, rgba(47,149,170,0.5) 38%, transparent 66%);
          animation: kkBreatheA 13s ease-in-out infinite, kkWanderA 34s ease-in-out infinite; }
        .kk-glow-b { width:112vmax; height:112vmax; left:50%; top:50%; margin-left:-56vmax; margin-top:-56vmax;
          background:radial-gradient(circle, #26877a 0%, rgba(38,135,122,0.45) 40%, transparent 68%);
          animation: kkBreatheB 16s ease-in-out infinite, kkWanderB 41s ease-in-out infinite; }
        .kk-glow-c { width:120vmax; height:120vmax; left:-50vmax; top:-50vmax;
          background:radial-gradient(circle, #2b7e96 0%, rgba(43,126,150,0.48) 38%, transparent 66%);
          animation: kkBreatheC 14.5s ease-in-out infinite, kkWanderC 47s ease-in-out infinite; }
        .kk-undertow { position: fixed; left:-25%; top:-25%; right:-25%; bottom:-25%; pointer-events:none;
          background:radial-gradient(circle at 50% 50%, transparent 28%, rgba(3,16,20,0.7) 82%);
          animation: kkUndertow 19s ease-in-out infinite; }
        @keyframes kkBreatheA { 0%,100% { opacity:0.04; } 45% { opacity:0.95; } }
        @keyframes kkBreatheB { 0%,100% { opacity:0.85; } 40% { opacity:0.06; } }
        @keyframes kkBreatheC { 0%,100% { opacity:0.1; } 60% { opacity:0.9; } }
        @keyframes kkWanderA { 0%{transform:translate(0,0) scale(1);} 25%{transform:translate(-9vmax,4vmax) scale(1.08);} 50%{transform:translate(3vmax,-7vmax) scale(0.96);} 75%{transform:translate(-6vmax,-3vmax) scale(1.05);} 100%{transform:translate(0,0) scale(1);} }
        @keyframes kkWanderB { 0%{transform:translate(0,0) scale(1);} 30%{transform:translate(7vmax,6vmax) scale(1.07);} 55%{transform:translate(-5vmax,8vmax) scale(0.94);} 80%{transform:translate(6vmax,-4vmax) scale(1.04);} 100%{transform:translate(0,0) scale(1);} }
        @keyframes kkWanderC { 0%{transform:translate(0,0) scale(1);} 20%{transform:translate(8vmax,-5vmax) scale(1.06);} 45%{transform:translate(-4vmax,6vmax) scale(1.09);} 70%{transform:translate(9vmax,3vmax) scale(0.97);} 100%{transform:translate(0,0) scale(1);} }
        @keyframes kkUndertow { 0%,100% { opacity:0.8; transform:translate(0,0); } 50% { opacity:0.15; transform:translate(4vmax,-3vmax); } }
        @media (prefers-reduced-motion: reduce) { .kk-glow, .kk-undertow { animation: none !important; opacity: 0.3; } }
      `}</style>
      <div aria-hidden className="kk-glow kk-glow-a" />
      <div aria-hidden className="kk-glow kk-glow-b" />
      <div aria-hidden className="kk-glow kk-glow-c" />
      <div aria-hidden className="kk-undertow" />

      <header className="relative flex items-start justify-between mb-7 pr-1">
        <div>
          <h1 className="font-word text-3xl font-semibold tracking-tight text-white leading-none">
            Kata kata<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-[10px] font-gothic uppercase tracking-[0.16em] text-white/45 whitespace-nowrap">
            Selangkah demi selangkah
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSettingsOpen(true)} className={iconBtn} title="설정">
            <Settings size={18} />
          </button>
          <button onClick={handleRestore} className={iconBtn} title="공용 단어장 복구">
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setAddCatOpen(true)}
            className={`${iconBtn} text-2xl font-light leading-none`}
            title="단어장 추가"
          >
            +
          </button>
        </div>
      </header>

      <div className="relative space-y-2.5">
        <MenuCard
          onClick={() => navigate("/dictionary")}
          icon={BookOpen}
          grad="to-primary/25"
          border="border-primary/40"
          inner="border-primary/50"
          tile="bg-[hsl(172_45%_32%)]"
          mark="text-primary/10"
          title="인도네시아어 사전"
          sub="Kamus"
        />
        <MenuCard
          onClick={() => navigate("/news")}
          icon={Newspaper}
          grad="to-indigo-300/35"
          border="border-indigo-300/70"
          inner="border-indigo-500/40"
          tile="bg-indigo-500"
          mark="text-indigo-500/10"
          title="인도네시아 뉴스"
          sub="Berita"
        />
        <MenuCard
          onClick={() => navigate("/story")}
          icon={ScrollText}
          grad="to-amber-300/35"
          border="border-amber-300/70"
          inner="border-amber-500/40"
          tile="bg-amber-500"
          mark="text-amber-500/10"
          title="인도네시아 이야기"
          sub="Cerita"
        />
        <MenuCard
          onClick={() => navigate("/devotion")}
          icon={ChurchCross}
          grad="to-rose-300/35"
          border="border-rose-300/70"
          inner="border-rose-500/40"
          tile="bg-rose-500"
          mark="text-rose-500/10"
          title="인도네시아어 묵상"
          sub="Saat Teduh"
        />

        <MenuCard
          onClick={() => navigate("/prayer")}
          icon={Heart}
          grad="to-emerald-300/35"
          border="border-emerald-300/70"
          inner="border-emerald-500/40"
          tile="bg-emerald-400"
          mark="text-emerald-500/10"
          title="인도네시아어 기도"
          sub="Doa"
        />
        <MenuCard
          onClick={() => navigate("/wordbooks")}
          icon={Library}
          grad="to-sky-300/35"
          border="border-sky-300/70"
          inner="border-sky-500/40"
          tile="bg-sky-400"
          mark="text-sky-500/10"
          title="인도네시아어 단어장"
          sub={folderCount > 0 ? `Kosakata · ${folderCount}권` : "Kosakata"}
        />

        {/* 내 단어장 - 같은 높이, 오른쪽에 Quiz/Card */}
        {hasMyWordbook && (
          <div className={`${CARD_BASE} bg-gradient-to-br from-transparent to-violet-300/35 border-violet-300/70`}>
            <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-violet-500/40" />
            <Star size={110} className="absolute -right-3.5 top-1/2 -translate-y-1/2 text-violet-500/10 -rotate-12 pointer-events-none" />
            <div className="relative h-full flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate(`/category/${MY_WORDBOOK_ID}`)}
                className="flex-1 min-w-0 h-full flex items-center gap-3.5 text-left"
              >
                <span className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-black/30">
                  <Star size={23} className="text-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">내 단어장</p>
                  <p className="mt-0.5 text-xs font-gothic tracking-wide text-gray-500 truncate">
                    Kosakataku · {myWordCount}개
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/quiz/${MY_WORDBOOK_ID}`)}
                  className="text-xs font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 active:bg-violet-500/25 px-3 py-1.5 rounded-full transition-colors"
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/study/${MY_WORDBOOK_ID}`)}
                  className="text-xs font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 active:bg-violet-500/25 px-3 py-1.5 rounded-full transition-colors"
                >
                  Card
                </button>
              </div>
            </div>
          </div>
        )}

        <MenuCard
          onClick={() => navigate("/map")}
          icon={MapIcon}
          grad="to-orange-300/35"
          border="border-orange-300/70"
          inner="border-orange-500/40"
          tile="bg-orange-500"
          mark="text-orange-500/10"
          title="인도네시아 지도"
          sub="Peta"
        />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
