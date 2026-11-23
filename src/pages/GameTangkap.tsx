// src/pages/GameTangkap.tsx
// 단어 받기 (Tangkap) — 시안 GM-Tangkap. 위에서 떨어지는 인니어 단어의 뜻을 골라 받아냅니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 목숨 3개를 다 쓰면 판이 끝나고, 그때 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 낙하는 CSS transition 한 줄로 처리합니다 (rAF 물리 계산 없음).
// 화면 조각(머리·상태 줄·결과)은 GameKit 하나를 같이 씁니다.
// 받은 수가 20·40·70을 넘으면 예비 단어가 섞이고 보기가 어려워집니다 (규칙은 lib/tangkapStages).

import { useCallback, useEffect, useRef, useState } from "react";
import { drawPoolWithReserve } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import {
  TANGKAP_STAGES,
  RESERVE_WORDS,
  stageFor,
  stageIndexFor,
  initPickState,
  pickNext,
  pickChoices,
  wordsToRecord,
} from "@/lib/tangkapStages";
import type { PickState } from "@/lib/tangkapStages";
import { medaliEngine, listRounds, dateKey } from "@/lib/medali";
import {
  G,
  GameScreen,
  GameLoading,
  GameEmpty,
  GameReady,
  GameResult,
  StatusRow,
  Stat,
  IconHeart,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const MIN_WORDS = 6;          // 이보다 적으면 게임을 못 엽니다
const LIVES = 3;
const FALL_START_MS = 6500;   // 처음 낙하 시간 (뜻 세 개를 읽을 여유)
const FALL_STEP_MS = 120;     // 하나 받을 때마다 빨라지는 폭 (하한은 단계마다 다름 — tangkapStages)
const CATCH_MS = 1000;        // 받았을 때 청록으로 켜 두는 시간 (발음을 듣는 동안)
const MISS_MS = 1100;         // 놓쳤을 때 정답 뜻을 보여주는 시간
const NEW_TAG = "새 단어"; // 결과 목록에서 예비 단어 줄에 붙는 작은 꼬리표(GameKit ResultRow.tag)
const PILL_H = 48;
const TRAIL_H = 46;

type Phase = "loading" | "empty" | "ready" | "playing" | "done";

interface Question {
  index: number;              // pool 인덱스
  word: string;
  truth: string;              // 진짜 뜻
  choices: string[];          // 정답 1 + 오답 2(70개부터 3), 섞음
  fresh: boolean;             // 예비에서 나온 새 단어인가
}

interface WordResult {
  word: string;
  meaning: string;
  source: PoolWord["source"];
  correct: boolean;           // 그 단어의 "첫 응답" 기준 (바닥에 닿으면 오답)
  fresh: boolean;             // 예비에서 나온 새 단어 — 첫 응답이 틀리면 기록하지 않습니다
}

interface RoundResult {
  score: number;
  bestBefore: number;
  rows: ResultRow[];
  starWords: string[];
}

const wordKey = (w: string): string => String(w || "").trim().toLowerCase();

// 뜻 버튼. 오답 후보에서 정답과 같은 뜻은 아예 빼고 뽑으므로 "둘 다 맞는" 문제가 나오지 않습니다.
// candidates = 오답을 고를 뜻 목록, count = 버튼 수, similar = 비슷한 뜻을 먼저 고를지.
export function makeQuestion(
  pool: PoolWord[],
  index: number,
  fresh: boolean,
  candidates: string[],
  count: number,
  similar: boolean,
  rand: () => number = Math.random
): Question {
  const p = pool[index];
  const truth = p.meaning;
  return { index, word: p.word, truth, choices: pickChoices(truth, candidates, count, similar, rand), fresh };
}

// 뜻 버튼 색. 받았을 때는 누른 버튼이 청록으로 켜지고,
// 놓쳤을 때는 누른 버튼이 분홍·정답 버튼이 초록으로 함께 켜집니다(바닥에 닿았으면 정답만).
export function choiceStyle(
  choice: string,
  truth: string,
  picked: string | null,
  caught: boolean,
  revealing: boolean
): React.CSSProperties {
  const base: React.CSSProperties = { background: "#FFFFFF", border: "1px solid " + G.line, color: G.text };
  if (caught) {
    return choice === picked ? { background: G.teal, border: "1px solid " + G.teal, color: "#FFFFFF" } : base;
  }
  if (revealing) {
    if (picked && choice === picked && choice !== truth) {
      return { background: G.badBg, border: "1px solid " + G.badBd, color: G.text };
    }
    if (choice === truth) return { background: G.okBg, border: "1px solid " + G.okBd, color: G.text };
  }
  return base;
}

const Pill = ({ text, tone }: { text: string; tone: "fall" | "caught" }) => (
  <span
    className="h-12 px-5 rounded-3xl flex items-center font-word text-[22px] font-semibold whitespace-nowrap"
    style={
      tone === "caught"
        ? { background: G.teal, color: "#FFFFFF", boxShadow: "0 4px 14px rgba(16,40,50,0.10)" }
        : { background: "#FFFFFF", color: G.deep, boxShadow: "0 4px 14px rgba(16,40,50,0.10)" }
    }
  >
    {text}
  </span>
);

// 위에서 아래로 떨어지는 단어. key를 바꿔 새로 마운트하면 처음부터 다시 떨어집니다.
const Falling = ({ text, ms, onLand }: { text: string; ms: number; onLand: () => void }) => {
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
      className="absolute left-1/2 flex flex-col items-center"
      style={{
        transform: "translateX(-50%)",
        top: down ? "calc(100% - " + (TRAIL_H + PILL_H + 6) + "px)" : -TRAIL_H + 8 + "px",
        transition: "top " + ms + "ms linear",
      }}
    >
      <span
        className="w-0.5 rounded-[1px]"
        style={{ height: TRAIL_H, background: "linear-gradient(rgba(16,75,96,0), rgba(16,75,96,0.18))" }}
      />
      <Pill text={text} tone="fall" />
    </span>
  );
};

const GameTangkap = () => {
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
  const [stageNote, setStageNote] = useState(0);  // 방금 올라선 단계 (0 = 알림 없음)

  const poolRef = useRef<PoolWord[]>([]);         // core 다음에 예비 단어를 이어 붙인 배열
  const coreCountRef = useRef(0);                 // 이 인덱스부터는 예비(새 단어)입니다
  const pickRef = useRef<PickState>(initPickState(0, 0));
  const answeredRef = useRef(new Map<string, WordResult>()); // 단어별 "첫 응답"
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const fallMsRef = useRef(FALL_START_MS);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);
  const stepTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const clearStep = () => {
    if (stepTimerRef.current) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  // 다음 단어 (큐가 비면 다시 섞어 이어감 — 반복 등장 허용).
  // 받은 수가 20을 넘으면 단계 확률로 예비에서 새 단어를 꺼내고, 꺼낸 단어는 반복 목록에 들어갑니다.
  const nextWord = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    const st = pickRef.current;
    const caught = scoreRef.current;
    const { index } = pickNext(st, caught);
    const stage = stageFor(caught, st.hasReserve);
    // 오답 재료: 평소엔 지금까지 나온 단어, 비슷한 뜻 단계부터는 예비까지 전부
    const from = stage.similar ? pool : st.active.map((i) => pool[i]).filter(Boolean);
    setQuestion(
      makeQuestion(
        pool,
        index,
        index >= coreCountRef.current,
        from.map((p) => p.meaning),
        stage.choices,
        stage.similar
      )
    );
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
    // 점수 화면으로 넘어간 뒤 발음이 남아 울리지 않게 끊습니다
    stopSpeak();

    const words = Array.from(answeredRef.current.values());
    // 새 단어는 첫 응답이 맞았을 때만 기록합니다 (결과 목록에는 모두 보입니다)
    const toRecord = wordsToRecord(words);
    const finalScore = scoreRef.current;
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000)
    );

    const got = await medaliEngine.addPoints("game", 3);

    const starWords: string[] = [];
    for (const w of toRecord) {
      const r = await medaliEngine.recordWordResult(w.word, w.correct, w.source);
      if (r.becameConfirmed) starWords.push(w.word);
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
      words: toRecord.map((w) => ({ word: w.word, correct: w.correct, source: w.source })),
    });

    if (!aliveRef.current) return;
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => {
        if (aliveRef.current) setFloatOn(false);
      }, 1200);
    }
    setResult({
      score: finalScore,
      bestBefore,
      rows: words.map((w) => ({
        word: w.word,
        meaning: w.meaning,
        source: w.source,
        correct: w.correct,
        tag: w.fresh ? NEW_TAG : undefined,
      })),
      starWords,
    });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    lockedRef.current = false;
    answeredRef.current = new Map<string, WordResult>();
    scoreRef.current = 0;
    livesRef.current = LIVES;
    fallMsRef.current = FALL_START_MS;
    pickRef.current = initPickState(coreCountRef.current, poolRef.current.length - coreCountRef.current);
    startedAtRef.current = Date.now();
    setScore(0);
    setLives(LIVES);
    setFallMs(FALL_START_MS);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setStageNote(0);
    nextWord();
    setPhase("playing");
  }, [nextWord]);

  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawPoolWithReserve(14, 6, RESERVE_WORDS)
        .then(({ core, reserve }) => {
          if (!aliveRef.current) return;
          if (core.length < MIN_WORDS) {
            poolRef.current = [];
            coreCountRef.current = 0;
            setPhase("empty");
            return;
          }
          poolRef.current = core.concat(reserve);
          coreCountRef.current = core.length;
          if (auto) beginPlay();
          else setPhase("ready");
        })
        .catch(() => {
          if (!aliveRef.current) return;
          poolRef.current = [];
          coreCountRef.current = 0;
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
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
      stopSpeak();
    };
  }, []);

  // 그 단어의 첫 응답만 기록에 남깁니다 (반복 등장해도 판정은 처음 것)
  const remember = (q: Question, ok: boolean) => {
    const p = poolRef.current[q.index];
    if (!p) return;
    const key = wordKey(q.word);
    if (answeredRef.current.has(key)) return;
    answeredRef.current.set(key, { word: p.word, meaning: p.meaning, source: p.source, correct: ok, fresh: q.fresh });
  };

  const loseLife = (q: Question) => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    setReveal(q.truth);
    stepTimerRef.current = window.setTimeout(() => {
      if (!aliveRef.current || finishedRef.current) return;
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
      const hasReserve = pickRef.current.hasReserve;
      const before = stageIndexFor(scoreRef.current, hasReserve);
      scoreRef.current += 1;
      setScore(scoreRef.current);
      const now = stageIndexFor(scoreRef.current, hasReserve);
      fallMsRef.current = Math.max(TANGKAP_STAGES[now].fallMinMs, fallMsRef.current - FALL_STEP_MS);
      setFallMs(fallMsRef.current);
      if (now > before) setStageNote(now);   // 단계가 오르면 위쪽에 잠깐 알립니다
      setCaught(true);
      speakWord(q.word, 0.95);   // 맞힌 단어의 발음을 들려줍니다 (점수와 무관)
      stepTimerRef.current = window.setTimeout(() => {
        if (!aliveRef.current || finishedRef.current) return;
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

  const hearts: number[] = [];
  for (let i = 0; i < LIVES; i++) hearts.push(i);

  return (
    <GameScreen id="tangkap">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady
          id="tangkap"
          lines={["떨어지는 단어의 뜻을 골라 받으세요", "놓치면 하트가 하나 줄어듭니다 · 하트 세 개"]}
          onStart={beginPlay}
        />
      ) : null}

      {phase === "playing" && question ? (
        <>
          <StatusRow
            left={
              <span className="flex gap-1">
                {hearts.map((i) => (
                  <IconHeart key={i} on={i < lives} size={18} />
                ))}
              </span>
            }
            right={<Stat icon="check" label="받은 수" value={score} />}
          />

          {/* 낙하 영역 — 화면 남는 높이를 다 씁니다 */}
          <div
            className="relative mt-2 flex-1 min-h-[260px] rounded-[20px] overflow-hidden"
            style={{ background: "linear-gradient(#FFFFFF, #F6F8F9)", border: "1px solid " + G.tile }}
          >
            {caught ? (
              <span className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%)" }}>
                <Pill text={question.word} tone="caught" />
              </span>
            ) : reveal ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
                <Pill text={question.word} tone="fall" />
                <span className="font-gothic text-[15px] font-semibold leading-snug break-keep" style={{ color: G.ok }}>
                  {reveal}
                </span>
              </span>
            ) : (
              <Falling key={seq} text={question.word} ms={fallMs} onLand={handleLand} />
            )}
            <span className="absolute left-0 right-0 bottom-0 h-1" style={{ background: G.track }} />
            {/* 단계 알림 — 약 1초 뒤 사라집니다. 손가락 입력은 그대로 아래로 지나갑니다 */}
            {stageNote > 0 ? (
              <span className="pointer-events-none absolute left-0 right-0 top-3 z-10 flex justify-center">
                <span
                  key={stageNote}
                  className="h-7 px-3 rounded-[14px] flex items-center font-gothic text-[12px] font-bold whitespace-nowrap animate-out fade-out"
                  style={{
                    background: G.teal,
                    color: "#FFFFFF",
                    animationDelay: "700ms",
                    animationDuration: "400ms",
                    animationFillMode: "forwards",
                  }}
                >
                  {TANGKAP_STAGES[stageNote].note}
                </span>
              </span>
            ) : null}
          </div>

          {/* 뜻 버튼 — 탭한 순간 무엇이 맞고 틀렸는지 색으로 알려 줍니다.
              보기가 4개일 때는 한 줄 높이를 줄여 낙하 영역을 지킵니다 (뜻이 길어 2×2는 잘림) */}
          <div className={"mt-3 flex flex-col " + (question.choices.length > 3 ? "gap-1.5" : "gap-2")}>
            {question.choices.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleChoice(c)}
                className={
                  (question.choices.length > 3 ? "h-[48px]" : "h-[54px]") +
                  " rounded-2xl box-border px-[18px] flex items-center text-left font-gothic text-[15px] font-medium"
                }
                style={{ ...choiceStyle(c, question.truth, picked, caught, !!reveal), transition: "background-color 120ms ease" }}
              >
                <span className="truncate">{c}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label="받은 단어"
          value={result.score}
          best={result.score > 0 && result.score > result.bestBefore}
          bestText={result.bestBefore > 0 ? "최고 " + result.bestBefore + "개" : undefined}
          gained={gained}
          floatOn={floatOn}
          starWords={result.starWords}
          rows={result.rows}
          onAgain={() => loadPool(true)}
        />
      ) : null}
    </GameScreen>
  );
};

export default GameTangkap;
