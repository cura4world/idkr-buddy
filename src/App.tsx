import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import PhraseDetail from "./pages/PhraseDetail";
import SavedPhrases from "./pages/SavedPhrases";
import Dictionary from "./pages/Dictionary";
import Story from "./pages/Story";
import News from "./pages/News";
import Devotion from "./pages/Devotion";
import BibleRead from "./pages/BibleRead";
import OneToOne from "./pages/OneToOne";
import MemberAdmin from "./pages/MemberAdmin";
import { refreshMembershipOnStart } from "@/lib/access";
import { autoSyncBibleOnStart } from "@/lib/bibleAutoSync";
import { autoBackupOnStart } from "@/lib/transfer";
import { toast } from "sonner";
import Prayer from "./pages/Prayer";
import Sermons from "./pages/Sermons";
import SermonRead from "./pages/SermonRead";
import IndoMap from "./pages/IndoMap";
import Insight from "./pages/Insight";
import InsightOverview from "./pages/InsightOverview";
import InsightReligion from "./pages/InsightReligion";
import InsightChristian from "./pages/InsightChristian";
import InsightEthnic from "./pages/InsightEthnic";
import InsightHistory from "./pages/InsightHistory";
import InsightTips from "./pages/InsightTips";
import Percakapan from "./pages/Percakapan";
import PercakapanCategory from "./pages/PercakapanCategory";
import PercakapanRead from "./pages/PercakapanRead";
import Wordbooks from "./pages/Wordbooks";
import CategoryDetail from "./pages/CategoryDetail";
import StudyMode from "./pages/StudyMode";
import QuizMode from "./pages/QuizMode";
import SavedWords from "./pages/SavedWords";
import SavedStudyMode from "./pages/SavedStudyMode";
import SavedQuizMode from "./pages/SavedQuizMode";
import Permainan from "./pages/Permainan";
import GameKata from "./pages/GameKata";
import GameJodoh from "./pages/GameJodoh";
import GameOX from "./pages/GameOX";
import GameDengar from "./pages/GameDengar";
import GameSusun from "./pages/GameSusun";
import GameEja from "./pages/GameEja";
import GameTangkap from "./pages/GameTangkap";
import PlusGame from "@/components/game/PlusGame";
import NotFound from "./pages/NotFound";
import Plus from "./pages/Plus";
import MyInfo from "./pages/MyInfo";
import BottomTabs from "@/components/BottomTabs";
import LoginGate from "@/components/LoginGate";
import HiddenInPublic from "@/components/HiddenInPublic";
import { installStoreTtsShim } from "@/lib/storeTtsShim";
import PreviewPanel from "@/components/PreviewPanel";
import { isPreview } from "@/lib/preview";

const queryClient = new QueryClient();

// 미리보기 APK(VITE_PREVIEW=1)에만 오른쪽 아래 "미리보기 · 등급" 알약을 붙입니다.
const showPreviewPanel = isPreview();

// 스토어 앱(공개판)에는 폰 내장 음성이 없습니다. 발음 듣기를 Gemini 음성으로 대신합니다.
installStoreTtsShim();

// 앱이 켜질 때 한 번: 회원키가 끊겼거나 다른 기기로 넘어갔으면 이 기기의
// 회원 상태를 풀고 받아 둔 보호 내용을 지웁니다(인터넷이 안 되면 그대로 둠).
// 그 확인이 끝난 뒤, 이 기기에 빠진 성경 역본이 있고 와이파이면 배경에서 받습니다
// (회원 확인보다 먼저 받으면, 끊긴 기기에 받았다가 곧바로 지우는 일이 생깁니다).
// 같은 확인이 끝난 뒤, 회원키 기기면 주 1회·와이파이일 때 개인 데이터를 서버에 자동 백업합니다
// (transfer.ts). 서버 백업이 이 폰보다 훨씬 많아 거절되면(새 폰) 되돌리기를 한 번 알립니다.
const memberChecked = refreshMembershipOnStart().catch(() => {});
memberChecked
  .then(() => autoSyncBibleOnStart())
  .then((got) => { if (got.length > 0) toast("성경을 이 기기에 받았습니다 — " + got.join(" · ")); })
  .catch(() => {});
memberChecked
  .then(() => autoBackupOnStart())
  .then((r) => {
    if (r === "blocked-new") {
      toast("서버 백업이 이 폰보다 많습니다. 설정에서 '서버 백업에서 되돌리기'를 눌러 주세요", { duration: 8000 });
    }
  })
  .catch(() => {});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner duration={2000} />
      <BrowserRouter basename="/idkr-buddy">
        <LoginGate>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/phrase" element={<PhraseDetail />} />
          <Route path="/phrase/saved" element={<SavedPhrases />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/story" element={<Story />} />
          <Route path="/news" element={<HiddenInPublic><News /></HiddenInPublic>} />
          <Route path="/devotion" element={<HiddenInPublic><Devotion /></HiddenInPublic>} />
          <Route path="/bible" element={<HiddenInPublic><BibleRead /></HiddenInPublic>} />
          <Route path="/one-to-one" element={<HiddenInPublic><OneToOne /></HiddenInPublic>} />
          <Route path="/members" element={<HiddenInPublic><MemberAdmin /></HiddenInPublic>} />
          <Route path="/prayer" element={<HiddenInPublic><Prayer /></HiddenInPublic>} />
          <Route path="/sermon" element={<HiddenInPublic><Sermons /></HiddenInPublic>} />
          <Route path="/sermon/:id" element={<HiddenInPublic><SermonRead /></HiddenInPublic>} />
          <Route path="/plus" element={<Plus />} />
          <Route path="/me" element={<MyInfo />} />
          <Route path="/map" element={<IndoMap />} />
          <Route path="/insight" element={<Insight />} />
          <Route path="/insight/overview" element={<InsightOverview />} />
          <Route path="/insight/religion" element={<InsightReligion />} />
          <Route path="/insight/christian" element={<HiddenInPublic><InsightChristian /></HiddenInPublic>} />
          <Route path="/insight/ethnic" element={<InsightEthnic />} />
          <Route path="/insight/history" element={<InsightHistory />} />
          <Route path="/insight/tips" element={<InsightTips />} />
          <Route path="/percakapan" element={<Percakapan />} />
          <Route path="/percakapan/c/:id" element={<PercakapanCategory />} />
          <Route path="/percakapan/:id" element={<PercakapanRead />} />
          <Route path="/wordbooks" element={<Wordbooks />} />
          <Route path="/category/:id" element={<CategoryDetail />} />
          <Route path="/study/:id" element={<StudyMode />} />
          <Route path="/quiz/:id" element={<QuizMode />} />
          <Route path="/saved" element={<SavedWords />} />
          <Route path="/saved/study" element={<SavedStudyMode />} />
          <Route path="/saved/quiz" element={<SavedQuizMode />} />
          <Route path="/permainan" element={<Permainan />} />
          <Route path="/permainan/kata" element={<GameKata />} />
          <Route path="/permainan/jodoh" element={<PlusGame><GameJodoh /></PlusGame>} />
          <Route path="/permainan/ox" element={<PlusGame><GameOX /></PlusGame>} />
          <Route path="/permainan/dengar" element={<PlusGame><GameDengar /></PlusGame>} />
          <Route path="/permainan/susun" element={<PlusGame><GameSusun /></PlusGame>} />
          <Route path="/permainan/eja" element={<PlusGame><GameEja /></PlusGame>} />
          <Route path="/permainan/tangkap" element={<PlusGame><GameTangkap /></PlusGame>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* 공개판 하단 탭 — 홈·내 단어장·게임·내 정보 네 화면에서만 스스로 나타납니다 */}
        <BottomTabs />
        </LoginGate>
        {showPreviewPanel ? <PreviewPanel /> : null}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
