import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, restoreSharedCategories } from "@/lib/store";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { RotateCcw, Settings, BookOpen, ScrollText, Library, Star, ChevronRight, HandHeart, Newspaper } from "lucide-react";
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
  tile: string;
  mark: string;
  title: string;
  sub: string;
  badge?: string;
};

const MenuCard = ({ onClick, icon: Icon, grad, border, tile, mark, title, sub, badge }: MenuCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`${CARD_BASE} text-left bg-gradient-to-br from-transparent ${grad} ${border}`}
  >
    <Icon size={92} className={`absolute -right-4 -bottom-8 ${mark} rotate-12 pointer-events-none`} />
    <div className="relative h-full flex items-center gap-3.5">
      <span className={`w-12 h-12 rounded-xl ${tile} flex items-center justify-center shrink-0 shadow-sm`}>
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
      {/* 배경 분위기: 은은한 빛 두 점 (블러 없이 radial-gradient만 사용 — WebView 성능 안전) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: "radial-gradient(26rem 16rem at 88% -4rem, hsl(172 60% 45% / 0.20), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-36 h-80"
        style={{ background: "radial-gradient(22rem 15rem at -3rem 2rem, hsl(18 80% 62% / 0.10), transparent 70%)" }}
      />

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
          border="border-primary/25"
          tile="bg-primary"
          mark="text-primary/5"
          title="인도네시아어 사전"
          sub="Kamus"
        />
        <MenuCard
          onClick={() => navigate("/story")}
          icon={ScrollText}
          grad="to-amber-300/35"
          border="border-amber-300/50"
          tile="bg-amber-500"
          mark="text-amber-500/10"
          title="인도네시아 이야기"
          sub="Cerita"
        />
        <MenuCard
          onClick={() => navigate("/news")}
          icon={Newspaper}
          grad="to-indigo-300/35"
          border="border-indigo-300/50"
          tile="bg-indigo-500"
          mark="text-indigo-500/10"
          title="인도네시아 뉴스"
          sub="Berita"
        />
        <MenuCard
          onClick={() => navigate("/devotion")}
          icon={ChurchCross}
          grad="to-rose-300/35"
          border="border-rose-300/50"
          tile="bg-rose-500"
          mark="text-rose-500/10"
          title="인도네시아어 묵상"
          sub="Saat Teduh"
        />

        <MenuCard
          onClick={() => navigate("/prayer")}
          icon={HandHeart}
          grad="to-emerald-300/35"
          border="border-emerald-300/50"
          tile="bg-emerald-500"
          mark="text-emerald-500/10"
          title="인도네시아어 기도"
          sub="Doa"
        />
        <MenuCard
          onClick={() => navigate("/wordbooks")}
          icon={Library}
          grad="to-sky-300/35"
          border="border-sky-300/50"
          tile="bg-sky-500"
          mark="text-sky-500/10"
          title="인도네시아어 단어장"
          sub={folderCount > 0 ? `Kosakata · ${folderCount}권` : "Kosakata"}
        />

        {/* 내 단어장 - 같은 높이, 오른쪽에 Quiz/Card */}
        {hasMyWordbook && (
          <div className={`${CARD_BASE} bg-gradient-to-br from-transparent to-violet-300/35 border-violet-300/50`}>
            <Star size={92} className="absolute -right-4 -bottom-8 text-violet-500/10 rotate-12 pointer-events-none" />
            <div className="relative h-full flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate(`/category/${MY_WORDBOOK_ID}`)}
                className="flex-1 min-w-0 h-full flex items-center gap-3.5 text-left"
              >
                <span className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 shadow-sm">
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
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AddCategoryDialog open={addCatOpen} onOpenChange={setAddCatOpen} onAdded={refresh} />
    </div>
  );
};

export default Index;
