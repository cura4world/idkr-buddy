import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { getSavedWords, Word } from "@/lib/store";
import { ArrowLeft, RotateCcw, Shuffle } from "lucide-react";
import { medaliEngine } from "@/lib/medali";
import PointFloat from "@/components/PointFloat";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SavedQuizMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const allWords = getSavedWords();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewList, setReviewList] = useState<Word[]>([]);
  const [isRandom, setIsRandom] = useState(false);

  const makeQuestions = (random: boolean) => {
    const source = random ? shuffle(allWords) : allWords;
    return source.map((word) => {
      const others = allWords.filter((w) => w.id !== word.id);
      const wrongChoices = shuffle(others).slice(0, 3).map((w) => w.meaning);
      const choices = shuffle([word.meaning, ...wrongChoices]);
      return { word, choices, correctAnswer: word.meaning };
    });
  };

  const [questions, setQuestions] = useState(() => makeQuestions(false));
  const currentQ = questions[questionIndex];
  const isFinished = questionIndex >= questions.length;

  // ---------- 퀴즈 점수 + Bintang 판정 ----------
  // 문항별 정답 여부를 ref 배열로만 모으므로 기존 채점(correctCount) 로직과 섞이지 않습니다.
  const answersRef = useRef<{ word: string; correct: boolean }[]>([]);
  const finishedRef = useRef(false);
  const recordedRef = useRef(false);
  const [floatVal, setFloatVal] = useState(0);
  const [floatSeq, setFloatSeq] = useState(0);

  useEffect(() => {
    if (!isFinished || questions.length === 0 || allWords.length < 2) {
      finishedRef.current = false;
      return;
    }
    if (finishedRef.current) return;
    finishedRef.current = true;

    // 다시 하기로 또 끝내도 점수는 오릅니다 (하루 상한 10점 = 2회를 엔진이 자릅니다)
    medaliEngine
      .addPoints("quiz", 5)
      .then((got) => {
        if (got > 0) {
          setFloatVal(got);
          setFloatSeq((n) => n + 1);
        }
      })
      .catch(() => {});

    // 반면 단어 판정은 첫 완주에만 — 방금 본 답을 다시 고르는 건 실력의 근거가 아닙니다.
    if (recordedRef.current) return;
    recordedRef.current = true;
    const seen = new Set<string>();
    for (const a of answersRef.current) {
      const key = a.word.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      medaliEngine.recordWordResult(a.word, a.correct, "wordbook").catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected) return;
      setSelected(choice);
      answersRef.current.push({ word: currentQ.word.word, correct: choice === currentQ.correctAnswer });
      if (choice === currentQ.correctAnswer) {
        setCorrectCount((c) => c + 1);
      } else {
        setReviewList((r) => [...r, currentQ.word]);
      }
      setTimeout(() => {
        setSelected(null);
        setQuestionIndex((i) => i + 1);
      }, 1200);
    },
    [selected, currentQ]
  );

  const restart = () => {
    answersRef.current = [];
    setQuestionIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setReviewList([]);
    setQuestions(makeQuestions(isRandom));
  };

  const handleToggleRandom = () => {
    const next = !isRandom;
    answersRef.current = [];
    setIsRandom(next);
    setQuestionIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setReviewList([]);
    setQuestions(makeQuestions(next));
  };

  if (allWords.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background font-body px-4">
        <p className="text-muted-foreground">퀴즈를 위해 최소 2개의 단어가 필요합니다.</p>
        <button onClick={() => navigate("/saved")} className="mt-4 text-primary underline underline-offset-4">돌아가기</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
        <PointFloat value={floatVal} seq={floatSeq} />
        <div className="text-center">
          <p className="text-4xl mb-4">🍃</p>
          <p className="text-lg font-body font-medium">{questions.length}개 중 {correctCount}개</p>
          <p className="text-sm text-foreground font-body mt-1">수고하셨습니다</p>
        </div>
        {reviewList.length > 0 && (
          <div className="mt-8 w-full">
            <p className="text-sm text-foreground font-body mb-3">다시 볼 단어</p>
            <div className="space-y-2">
              {reviewList.map((w) => (
                <div key={w.id} className="bg-card rounded-lg p-3 border border-border/50">
                  <p className="font-word text-sm font-medium text-card-foreground">{w.word}</p>
                  <p className="text-sm text-card-foreground font-body">{w.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-8">
          <button onClick={restart} className="flex items-center gap-2 text-sm text-foreground font-body hover:underline underline-offset-4">
            <RotateCcw size={14} />
            다시 하기
          </button>
          <button onClick={() => navigate("/saved")} className="text-sm text-foreground font-body hover:underline underline-offset-4">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => goBackOr(navigate, location.key, "/saved")} className="text-foreground hover:text-foreground/80">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-foreground font-body">
          {questionIndex + 1} / {questions.length}
        </span>
        <div className="w-5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="mb-10 text-center">
          <p className="font-word text-3xl font-semibold">{currentQ.word.word}</p>
          {currentQ.word.example && (
            <p className="text-base text-foreground font-word mt-2">{currentQ.word.example}</p>
          )}
        </div>
        <div className="w-full max-w-sm space-y-3">
          {currentQ.choices.map((choice) => {
            let className = "w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 font-body text-sm ";
            if (selected) {
              if (choice === currentQ.correctAnswer) {
                // 정답은 항상 초록. accent(탠저린)는 붉게 보여 오답으로 오해됩니다.
                className += "bg-emerald-500/15 border-emerald-500 text-foreground";
              } else if (choice === selected) {
                // 내가 잘못 고른 것만 빨강
                className += "bg-rose-500/15 border-rose-500 text-foreground";
              } else {
                className += "bg-card border-border/30 text-muted-foreground/50";
              }
            } else {
              className += "bg-card border-border/50 hover:border-primary/30 active:scale-[0.98] text-gray-900";
            }
            return (
              <button key={choice} onClick={() => handleSelect(choice)} className={className}>
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center py-4">
        <button
          onClick={handleToggleRandom}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-body transition-colors border ${
            isRandom
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-gray-900 border-border/50 hover:border-primary/50"
          }`}
        >
          <Shuffle size={14} />
          랜덤
        </button>
      </div>
    </div>
  );
}
