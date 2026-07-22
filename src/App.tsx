import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Dictionary from "./pages/Dictionary";
import Story from "./pages/Story";
import News from "./pages/News";
import Devotion from "./pages/Devotion";
import Prayer from "./pages/Prayer";
import IndoMap from "./pages/IndoMap";
import Insight from "./pages/Insight";
import InsightOverview from "./pages/InsightOverview";
import InsightReligion from "./pages/InsightReligion";
import InsightChristian from "./pages/InsightChristian";
import Wordbooks from "./pages/Wordbooks";
import CategoryDetail from "./pages/CategoryDetail";
import StudyMode from "./pages/StudyMode";
import QuizMode from "./pages/QuizMode";
import SavedWords from "./pages/SavedWords";
import SavedStudyMode from "./pages/SavedStudyMode";
import SavedQuizMode from "./pages/SavedQuizMode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner duration={2000} />
      <BrowserRouter basename="/idkr-buddy">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/story" element={<Story />} />
          <Route path="/news" element={<News />} />
          <Route path="/devotion" element={<Devotion />} />
          <Route path="/prayer" element={<Prayer />} />
          <Route path="/map" element={<IndoMap />} />
          <Route path="/insight" element={<Insight />} />
          <Route path="/insight/overview" element={<InsightOverview />} />
          <Route path="/insight/religion" element={<InsightReligion />} />
          <Route path="/insight/christian" element={<InsightChristian />} />
          <Route path="/wordbooks" element={<Wordbooks />} />
          <Route path="/category/:id" element={<CategoryDetail />} />
          <Route path="/study/:id" element={<StudyMode />} />
          <Route path="/quiz/:id" element={<QuizMode />} />
          <Route path="/saved" element={<SavedWords />} />
          <Route path="/saved/study" element={<SavedStudyMode />} />
          <Route path="/saved/quiz" element={<SavedQuizMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
