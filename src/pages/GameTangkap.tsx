// src/pages/GameTangkap.tsx
// 단어 받기 (Tangkap). 위에서 떨어지는 인니어 단어의 뜻을 골라 받아냅니다 — 어휘 반응 속도 게임입니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 목숨 3개를 다 쓰면 판이 끝나고, 그때 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 낙하는 CSS transition 한 줄로 처리합니다 (rAF 물리 계산 없음).

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, Star } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey, MEDALI_COLORS } from "@/lib/medali";

const MIN_WORDS = 6;          // 이보다 적으면 게임을 못 엽니다
const LIVES = 3;
const FALL_START_MS = 6500;   // 처음 낙하 시간 (뜻 세 개를 읽을 여유)
const FALL_STEP_MS = 120;     // 하나 받을 때마다 빨라지는 폭
const FALL_MIN_MS = 3500;     // 아무리 빨라도 여기까지
const CATCH_MS = 400;         // 받았을 때 청록으로 켜 두는 시간
const MISS_MS = 600;          // 놓쳤을 때 정답 뜻을 보여주는 시간
const CHOICES = 3;            // 뜻 버튼 수

type Phase = "loading" | "empty" | "ready" | "playing" | "done";

interface Question {
  index: number;              // pool 인덱스
  word: string;
  truth: string;              // 진짜 뜻
  choices: string[];          // 정답 1 + 오답 2, 섞음
}

interface WordResult {
  word: string;
  meaning: string;
  source: PoolWord["source"];
  correct: boolean;           // 그 단어의 "첫 응답" 기준 (바닥에 닿으면 오답)
  becameConfirmed: boolean;
}

interface RoundResult {
  score: number;
  bestBefore: number;
  words: WordResult[];
}

const SOURCE_LABEL: Record<PoolWord["source"], string> = {
  wordbook: "단어장",
  lookup: "찾아본",
  seed: "기본",
};

const meaningKey = (m: string): string =>
  String(m || "").replace(new RegExp("\\s+", "g"), " ").trim().toLowerCase();

const wordKey = (w: string): string => String(w || "").trim().toLowerCase();

function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// 뜻 버튼 3개. 오답 후보에서 정답과 같은 뜻은 아예 빼고 뽑으므로 "둘 다 맞는" 문제가 나오지 않습니다.
export function makeQuestion(
  pool: PoolWord[],
  index: number,
  rand: () => number = Math.random
): Question {
  const p = pool[index];
  const truth = p.meaning;
  const key = meaningKey(truth);
  const others = pool.filter((q, i) => i !== index && meaningKey(q.meaning) !== key);

  const picked: string[] = [];
  const used = new Set<string>([key]);
  for (const q of shuffle(others, rand)) {
    if (picked.length >= CHOICES - 1) break;
    const k = meaningKey(q.meaning);
    if (used.has(k)) continue;
    used.add(k);
    picked.push(q.meaning);
  }

  return { index, word: p.word, truth, choices: shuffle([truth].concat(picked), rand) };
}

// 뜻 버튼 색. 받았을 때는 누른 버튼이 청록으로 켜지고,
// 놓쳤을 때는 누른 버튼이 붉게·정답 버튼이 청록으로 함께 켜집니다(바닥에 닿았으면 정답만).
export function choiceClass(
  choice: string,
  truth: string,
  picked: string | null,
  caught: boolean,
  revealing: boolean
): string {
  if (caught) {
    return choice === picked
      ? "border-primary bg-primary text-white"
      : "border-border bg-card text-foreground";
  }
  if (revealing) {
    if (picked && choice === picked && choice !== truth) {
      return "border-destructive bg-destructive/15 text-destructive";
    }
    if (choice === truth) return "border-primary bg-primary/15 text-foreground";
    return "border-border bg-card text-foreground";
  }
  return "border-border bg-card text-foreground active:bg-muted/60";
}

// 위에서 아래로 떨어지는 단어. key를 바꿔 새로 마운트하면 처음부터 다시 떨어집니다.
const Falling = ({
  text,
  ms,
  onLand,
}: {
  text: string;
  ms: number;
  onLand: () => void;
}) => {
  const [down, setDown] = useState(false);
  useEffect(() => {
    // 마운트 직후 값이 바뀌어야 transition이 걸립니다 (rAF 2번)
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <span
      onTransitionEnd={(e) => {
        if (e.propertyName !== "top") return;
        onLand();
      }}
      className="absolute font-word text-[1.375rem] leading-none text-foreground whitespace-nowrap"
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        top: down ? "calc(100% - 2.25rem)" : "0.25rem",
        transition: "top " + ms + "ms linear",
      }}
    >
      {text}
    </span>
  );
};

// "+3" 같은 점수 표시가 위로 떠오르며 사라집니다. (소리 없음)
const FloatPoint = ({ text }: { text: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <span
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1 font-gothic text-sm font-semibold"
      style={{
        color: MEDALI_COLORS.emas,
        opacity: on ? 0 : 1,
        transform: on ? "translate(-50%, -12px)" : "translate(-50%, 0)",
        transition: "opacity 1s linear, transform 1s ease-out",
      }}
    >
      {text}
    </span>
  );
};

const GameTangkap = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [seq, setSeq] = useState(0);              // 낙하 애니메이션을 새로 시작시키는 열쇠
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [fallMs, setFallMs] = useState(FALL_START_MS);
  const [caught, setCaught] = useState(false);    // 방금 받아냈는가
  const [picked, setPicked] = useState<string | null>(null); // 방금 누른 뜻 버튼 (바닥이면 null)
  const [reveal, setReveal] = useState<string | null>(null); // 놓쳤을 때 보여줄 진짜 뜻
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const poolRef = useRef<PoolWord[]>([]);
  const queueRef = useRef<number[]>([]);
  const answeredRef = useRef(new Map<string, WordResult>()); // 단어별 "첫 응답"
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const fallMsRef = useRef(FALL_START_MS);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);
  const stepTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);

  const clearStep = () => {
    if (stepTimerRef.current) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  // 다음 단어 (큐가 비면 다시 섞어 이어감 — 반복 등장 허용)
  const nextWord = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    if (queueRef.current.length === 0) {
      const all: number[] = [];
      for (let i = 0; i < pool.length; i++) all.push(i);
      queueRef.current = shuffle(all);
    }
    const idx = queueRef.current.shift();
    setQuestion(makeQuestion(pool, typeof idx === "number" ? idx : 0));
    setCaught(false);
    setPicked(null);
    setReveal(null);
    setSeq((n) => n + 1);
    lockedRef.current = false;
  }, []);

  const finishRound = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearStep();

    const words = Array.from(answeredRef.current.values());
    const finalScore = scoreRef.current;
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000)
    );

    const got = await medaliEngine.addPoints("game", 3);
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => setFloatOn(false), 1200);
    }

    for (const w of words) {
      const r = await medaliEngine.recordWordResult(w.word, w.correct, w.source);
      w.becameConfirmed = r.becameConfirmed;
    }

    let bestBefore = 0;
    try {
      const rounds = await listRounds("tangkap");
      for (const r of rounds) {
        if (r && r.score > bestBefore) bestBefore = r.score;
      }
    } catch {
      bestBefore = 0;
    }

    await medaliEngine.saveRound({
      game: "tangkap",
      date: dateKey(new Date()),
      durationSec,
      score: finalScore,
      words: words.map((w) => ({ word: w.word, correct: w.correct, source: w.source })),
    });

    setResult({ score: finalScore, bestBefore, words });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    lockedRef.current = false;
    answeredRef.current = new Map<string, WordResult>();
    scoreRef.current = 0;
    livesRef.current = LIVES;
    fallMsRef.current = FALL_START_MS;
    queueRef.current = [];
    startedAtRef.current = Date.now();
    setScore(0);
    setLives(LIVES);
    setFallMs(FALL_START_MS);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    nextWord();
    setPhase("playing");
  }, [nextWord]);

  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawPool(14, 6)
        .then((list) => {
          if (list.length < MIN_WORDS) {
            poolRef.current = [];
            setPhase("empty");
            return;
          }
          poolRef.current = list;
          if (auto) beginPlay();
          else setPhase("ready");
        })
        .catch(() => {
          poolRef.current = [];
          setPhase("empty");
        });
    },
    [beginPlay]
  );

  useEffect(() => {
    loadPool(false);
  }, [loadPool]);

  // 백그라운드로 나가면 판을 조용히 접습니다.
  // (안 그러면 밀렸던 transitionend가 한꺼번에 몰려와 목숨이 순식간에 사라집니다)
  useEffect(() => {
    if (phase !== "playing") return;
    const onHide = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") return;
      finishedRef.current = true;   // 이 판은 기록하지 않습니다
      lockedRef.current = true;
      clearStep();
      setPhase("ready");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

  // 화면을 벗어날 때 남은 타이머 정리 (setState 없이 정리만)
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
    };
  }, []);

  // 그 단어의 첫 응답만 기록에 남깁니다 (반복 등장해도 판정은 처음 것)
  const remember = (q: Question, ok: boolean) => {
    const p = poolRef.current[q.index];
    if (!p) return;
    const key = wordKey(q.word);
    if (answeredRef.current.has(key)) return;
    answeredRef.current.set(key, {
      word: p.word,
      meaning: p.meaning,
      source: p.source,
      correct: ok,
      becameConfirmed: false,
    });
  };

  const loseLife = (q: Question) => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    setReveal(q.truth);
    stepTimerRef.current = window.setTimeout(() => {
      if (finishedRef.current) return;
      if (livesRef.current <= 0) {
        finishRound();
        return;
      }
      nextWord();
    }, MISS_MS);
  };

  const handleChoice = (choice: string) => {
    if (phase !== "playing" || lockedRef.current || !question) return;
    const q = question;
    lockedRef.current = true;
    const ok = choice === q.truth;
    setPicked(choice);
    remember(q, ok);

    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      fallMsRef.current = Math.max(FALL_MIN_MS, fallMsRef.current - FALL_STEP_MS);
      setFallMs(fallMsRef.current);
      setCaught(true);
      stepTimerRef.current = window.setTimeout(() => {
        if (finishedRef.current) return;
        nextWord();
      }, CATCH_MS);
      return;
    }
    loseLife(q);
  };

  const handleLand = () => {
    if (phase !== "playing" || lockedRef.current || !question) return;
    lockedRef.current = true;
    remember(question, false);   // 바닥에 닿으면 오답으로 봅니다
    loseLife(question);
  };

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goBackOr(navigate, location.key, "/permainan")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          TANGKAP
        </h1>
      </header>

      <div className="px-4">
        {phase === "loading" ? (
          <p className="pt-16 text-center font-gothic text-[0.875rem] text-muted-foreground">
            준비 중...
          </p>
        ) : null}

        {phase === "empty" ? (
          <div className="mt-6 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-[0.9375rem] text-foreground">단어가 아직 부족해요</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              사전에서 단어를 만나고 오세요
            </p>
            <button
              type="button"
              onClick={() => navigate("/dictionary")}
              className="mt-5 h-10 px-4 rounded-full bg-primary text-[0.8125rem] font-gothic font-medium text-white active:opacity-90"
            >
              사전으로 가기
            </button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="mt-6 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-[0.9375rem] text-foreground">떨어지는 단어의 뜻을 골라 받아요</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              놓치면 하트가 하나 줄어요 · 하트 세 개
            </p>
            <button
              type="button"
              onClick={beginPlay}
              className="mt-6 h-12 w-full max-w-[16rem] rounded-[13px] bg-primary text-[0.9375rem] font-medium text-white active:opacity-90"
            >
              시작
            </button>
          </div>
        ) : null}

        {phase === "playing" && question ? (
          <div className="pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <Heart
                    key={i}
                    size={15}
                    color={i < lives ? MEDALI_COLORS.perunggu : "currentColor"}
                    fill={i < lives ? MEDALI_COLORS.perunggu : "none"}
                    className={i < lives ? "" : "text-muted-foreground/30"}
                  />
                ))}
              </span>
              <span className="font-gothic text-[0.75rem] text-muted-foreground">{score}개</span>
            </div>

            {/* 낙하 영역 — 길수록 떨어지는 속도가 느리게 느껴집니다 */}
            <div className="relative mt-2 h-[52dvh] overflow-hidden rounded-2xl border border-border bg-card">
              {caught ? (
                <span
                  className="absolute left-1/2 top-1/2 font-word text-[1.5rem] leading-none text-primary"
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  {question.word}
                </span>
              ) : reveal ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
                  <span className="font-word text-[1.25rem] leading-none text-foreground">
                    {question.word}
                  </span>
                  <span className="font-gothic text-[0.875rem] leading-snug text-emerald-500 break-words">
                    {reveal}
                  </span>
                </span>
              ) : (
                <Falling key={seq} text={question.word} ms={fallMs} onLand={handleLand} />
              )}
            </div>

            {/* 뜻 버튼 — 탭한 순간 무엇이 맞고 틀렸는지 색으로 알려 줍니다 */}
            <div className="mt-3 space-y-2">
              {question.choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleChoice(c)}
                  className={
                    "w-full rounded-2xl border px-4 py-3 text-left font-gothic text-[0.9375rem] transition-colors " +
                    choiceClass(c, question.truth, picked, caught, !!reveal)
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center">
              <p className="relative inline-block font-word text-[1.375rem] font-medium leading-snug text-foreground">
                <span className="tabular-nums text-primary">{result.score}</span>개 받았어요
                {floatOn ? <FloatPoint text={"+" + gained} /> : null}
              </p>
              <p className="mt-2 font-gothic text-[0.8125rem] text-muted-foreground">
                {result.bestBefore === 0 || result.score > result.bestBefore
                  ? "최고 기록!"
                  : "최고 " + result.bestBefore + "개"}
              </p>
            </div>

            {result.words.some((w) => w.becameConfirmed) ? (
              <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                <p className="flex items-center gap-1.5 font-gothic text-[0.75rem] font-semibold text-muted-foreground">
                  <Star
                    size={13}
                    color={MEDALI_COLORS.emas}
                    fill={MEDALI_COLORS.emas}
                    className="shrink-0"
                  />
                  별이 된 단어
                </p>
                <p className="mt-1.5 font-word text-[0.9375rem] text-foreground break-words">
                  {result.words
                    .filter((w) => w.becameConfirmed)
                    .map((w) => w.word)
                    .join(", ")}
                </p>
              </div>
            ) : null}

            {result.words.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                {result.words.map((w, i) => (
                  <div
                    key={w.word + i}
                    className={
                      "flex items-center gap-3 px-4 py-3 " +
                      (i === result.words.length - 1 ? "" : "border-b border-border") +
                      (w.correct ? "" : " opacity-50")
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-word text-[0.9375rem] leading-tight text-foreground truncate">
                        {w.word}
                      </p>
                      <p className="mt-0.5 text-[0.78125rem] text-muted-foreground truncate">
                        {w.meaning}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-gothic text-[0.6875rem] text-muted-foreground">
                      {SOURCE_LABEL[w.source]}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => goBackOr(navigate, location.key, "/permainan")}
                className="flex-1 h-11 rounded-[13px] border border-border text-[0.875rem] font-gothic text-foreground/80 active:bg-muted"
              >
                게임방으로
              </button>
              <button
                type="button"
                onClick={() => loadPool(true)}
                className="flex-1 h-11 rounded-[13px] bg-primary text-[0.875rem] font-medium text-white active:opacity-90"
              >
                한 판 더
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GameTangkap;
