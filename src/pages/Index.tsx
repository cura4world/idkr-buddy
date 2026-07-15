import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getWordsByCategory, restoreSharedCategories } from "@/lib/store";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { RotateCcw, Settings, BookOpen, ScrollText, Library, Star } from "lucide-react";
import { toast } from "sonner";

const MY_WORDBOOK_ID = "my-wordbook";

const Index = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 메인에는 기능 박스 4개만: 사전 / 이야기 / 인도네시아어 단어장(폴더) / 내 단어장
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

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6 pr-2">
        <h1 className="text-2xl font-semibold font-body tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center"
            title="설정"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleRestore}
            className="text-white hover:text-white/70 w-9 h-9 flex items-center justify-center"
            title="공용 단어장 복구"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setAddCatOpen(true)}
            className="text-white hover:text-white/70 text-3xl font-light leading-none w-10 h-10"
            title="단어장 추가"
          >
            +
          </button>
        </div>
      </header>

      <div className="space-y-2">
        {/* 인도네시아어 사전 */}
        <button
          onClick={() => navigate("/dictionary")}
          className="w-full text-left relative overflow-hidden rounded-xl bg-card bg-gradient-to-br from-transparent to-primary/25 px-5 py-4 card-lift border border-primary/25"
        >
          <BookOpen size={88} className="absolute -right-3 -bottom-7 text-primary/5 rotate-12 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <BookOpen size={19} className="text-white" />
            </span>
            <p className="flex-1 min-w-0 text-base font-semibold text-gray-900">인도네시아어 사전</p>
          </div>
        </button>

        {/* 인도네시아 이야기 */}
        <button
          onClick={() => navigate("/story")}
          className="w-full text-left relative overflow-hidden rounded-xl bg-card bg-gradient-to-br from-transparent to-amber-300/35 px-5 py-4 card-lift border border-amber-300/50"
        >
          <ScrollText size={88} className="absolute -right-3 -bottom-7 text-amber-500/10 rotate-12 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <ScrollText size={19} className="text-white" />
            </span>
            <p className="flex-1 min-w-0 text-base font-semibold text-gray-900">인도네시아 이야기</p>
          </div>
        </button>

        {/* 인도네시아어 단어장 (폴더) */}
        <button
          onClick={() => navigate("/wordbooks")}
          className="w-full text-left relative overflow-hidden rounded-xl bg-card bg-gradient-to-br from-transparent to-sky-300/35 px-5 py-4 card-lift border border-sky-300/50"
        >
          <Library size={88} className="absolute -right-3 -bottom-7 text-sky-500/10 rotate-12 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
              <Library size={19} className="text-white" />
            </span>
            <p className="flex-1 min-w-0 text-base font-semibold text-gray-900">인도네시아어 단어장</p>
            {folderCount > 0 && (
              <span className="shrink-0 text-xs text-gray-500 font-gothic">{folderCount}권</span>
            )}
          </div>
        </button>

        {/* 내 단어장 - 톱니바퀴 없음, 통일 디자인 */}
        {hasMyWordbook && (
          <div className="w-full relative overflow-hidden rounded-xl bg-card bg-gradient-to-br from-transparent to-violet-300/35 px-5 py-4 card-lift border border-violet-300/50">
            <Star size={88} className="absolute -right-3 -bottom-7 text-violet-500/10 rotate-12 pointer-events-none" />
            <button
              onClick={() => navigate(`/category/${MY_WORDBOOK_ID}`)}
              className="relative w-full text-left flex items-center gap-3"
            >
              <span className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
                <Star size={19} className="text-white" />
              </span>
              <p className="flex-1 min-w-0 text-base font-semibold text-gray-900">내 단어장</p>
            </button>
            <div className="relative flex items-center justify-between mt-3.5">
              <span className="text-xs text-muted-foreground">{myWordCount}개의 단어</span>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/quiz/${MY_WORDBOOK_ID}`)}
                  className="text-xs font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 px-3.5 py-1.5 rounded-full transition-colors"
                >
                  Quiz
                </button>
                <button
                  onClick={() => navigate(`/study/${MY_WORDBOOK_ID}`)}
                  className="text-xs font-medium text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 px-3.5 py-1.5 rounded-full transition-colors"
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
