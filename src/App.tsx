import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import CategoryDetail from "./pages/CategoryDetail";
import StudyMode from "./pages/StudyMode";
import QuizMode from "./pages/QuizMode";
import SavedStudy from "./pages/SavedStudy";
import SavedStudyMode from "./pages/SavedStudyMode";
import SavedQuizMode from "./pages/SavedQuizMode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/category/:id" element={<CategoryDetail />} />
          <Route path="/study/:id" element={<StudyMode />} />
          <Route path="/quiz/:id" element={<QuizMode />} />
          <Route path="/saved" element={<SavedStudy />} />
          <Route path="/saved/study" element={<SavedStudyMode />} />
          <Route path="/saved/quiz" element={<SavedQuizMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
