// src/pages/GameOX.tsx
// 스피드 O/X (Cepat O/X) — 시안 GM-OX. 30초 동안 "이 단어의 뜻이 맞나?"를 O/X로 고릅니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 30초를 채워야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 조각(머리·상태 줄·결과)은 GameKit 하나를 같이 씁니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey } from "@/lib/medali";
import {
  G,
  CARD_SHADOW,
  GameScreen,
  GameLoading,
  GameEmpty,
  GameReady,
  GameResult,
  StatusRow,
  Stat,
  TimeBar,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const ROUND_SEC = 30;         // 한 판 길이
const MIN_WORDS = 6;          // 이보다 적으면 게임을 못 엽니다
const REVEAL_MS = 1900;       // 틀렸을 때 진짜 뜻을 보여주는 시간
const TICK_MS = 200;          // 남은 시간 갱신 주기

type Phase = "loading" | "empty" | "ready" | "playing" | "done";

export interface Question {
  index: number;              // pool 인덱스
  word: string;
  shown: string;              // 화면에 보여줄 뜻
  truth: string;              // 진짜 뜻
  isTrue: boolean;            // shown이 진짜 뜻인가
}

interface WordResult {
  word: string;
  meaning: string;
  source: PoolWord["source"];
  correct: boolean;           // 그 단어의 "첫 응답" 기준
}

interface RoundResult {
  score: number;
  bestBefore: number;         // 이번 판 이전의 최고 점수. 없으면 0
  rows: ResultRow[];
  starWords: string[];
}

const meaningKey = (m: string): string =>
  String(m || "").replace(new RegExp("\\s+", "g"), " ").trim().toLowerCase();

const wordKey = (w: string): string => String(w || "").trim().toLowerCase();

// 문제 하나 만들기. 절반은 진짜 뜻, 절반은 다른 단어의 뜻(= 오답).
// 오답 후보에서 정답과 뜻이 같은 것은 아예 빼고 뽑으므로 "맞는데 X가 정답"인 문제는 나오지 않습니다.
export function makeQuestion(
  pool: PoolWord[],
  index: number,
  rand: () => number = Math.random
): Question {
  const p = pool[index];
  const truth = p.meaning;
  const asTrue: Question = { index, word: p.word, shown: truth, truth, isTrue: true };
  if (pool.length < 2 || rand() < 0.5) return asTrue;

  const key = meaningKey(truth);
  const others = pool.filter((q, i) => i !== index && meaningKey(q.meaning) !== key);
  if (others.length === 0) return asTrue;

  const pick = others[Math.floor(rand() * others.length)];
  return { index, word: p.word, shown: pick.meaning, truth, isTrue: false };
}

// 0..n-1 을 섞은 큐
function shuffledQueue(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const GameOX = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [left, setLeft] = useState(ROUND_SEC);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<string | null>(null); // 틀렸을 때 보여줄 진짜 뜻
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const poolRef = useRef<PoolWord[]>([]);
  const queueRef = useRef<number[]>([]);
  const answeredRef = useRef(new Map<string, WordResult>()); // 단어별 "첫 응답"
  const scoreRef = useRef(0);
  const endAtRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);          // 오답 노출 중 입력 무시
  const tickRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  // 다음 문제 꺼내기 (큐가 비면 다시 섞어 이어감 — 반복 등장 허용)
  const nextQuestion = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    if (queueRef.current.length === 0) queueRef.current = shuffledQueue(pool.length);
    const idx = queueRef.current.shift();
    const q = makeQuestion(pool, typeof idx === "number" ? idx : 0);
    setQuestion(q);
    speakWord(q.word);   // 발음은 그냥 흘려보냅니다 — 기다리지 않으므로 진행이 막히지 않습니다
  }, []);

  // 판 종료 — finishedRef 가드로 정확히 1회만 실행됩니다
  const finishRound = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setLeft(0);
    stopSpeak();

    const words = Array.from(answeredRef.current.values());
    const finalScore = scoreRef.current;

    // 1) 노력 점수
    const got = await medaliEngine.addPoints("game", 3);

    // 2) 단어별 기록 (첫 응답 기준) → 이번에 별이 된 단어
    const starWords: string[] = [];
    for (const w of words) {
      // OX는 찍어도 절반은 맞으므로 증거를 0.5만 인정합니다
      const r = await medaliEngine.recordWordResult(w.word, w.correct, w.source, 0.5);
      if (r.becameConfirmed) starWords.push(w.word);
    }

    // 3) 이전 최고 점수(이번 판 제외) → 저장
    let bestBefore = 0;
    try {
      const rounds = await listRounds("ox");
      for (const r of rounds) {
        if (r && r.score > bestBefore) bestBefore = r.score;
      }
    } catch {
      bestBefore = 0;
    }

    await medaliEngine.saveRound({
      game: "ox",
      date: dateKey(new Date()),
      durationSec: ROUND_SEC,
      score: finalScore,
      words: words.map((w) => ({ word: w.word, correct: w.correct, source: w.source })),
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
      rows: words.map((w) => ({ word: w.word, meaning: w.meaning, source: w.source, correct: w.correct })),
      starWords,
    });
    setPhase("done");
  }, []);

  // 30초 시작 (남은 시간은 Date.now() 기준이라 setInterval 드리프트가 쌓이지 않습니다)
  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    lockedRef.current = false;
    answeredRef.current = new Map<string, WordResult>();
    scoreRef.current = 0;
    queueRef.current = shuffledQueue(poolRef.current.length);
    endAtRef.current = Date.now() + ROUND_SEC * 1000;
    setScore(0);
    setReveal(null);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setLeft(ROUND_SEC);
    nextQuestion();
    setPhase("playing");
  }, [nextQuestion]);

  // 재료 준비. auto=true면 (한 판 더) 준비되는 대로 바로 시작합니다.
  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawPool(14, 6)
        .then((list) => {
          if (!aliveRef.current) return;
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
          if (!aliveRef.current) return;
          poolRef.current = [];
          setPhase("empty");
        });
    },
    [beginPlay]
  );

  useEffect(() => {
    loadPool(false);
  }, [loadPool]);

  // 남은 시간 — 오답 노출 중에도 계속 흐릅니다 (시간 손실이 곧 페널티)
  useEffect(() => {
    if (phase !== "playing") return;
    tickRef.current = window.setInterval(() => {
      const ms = endAtRef.current - Date.now();
      if (ms <= 0) {
        setLeft(0);
        finishRound();
        return;
      }
      setLeft(Math.ceil(ms / 1000));
    }, TICK_MS);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase, finishRound]);

  // 화면을 벗어날 때 남은 타이머 정리 (setState 없이 정리만)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
      stopSpeak();
    };
  }, []);

  const answer = (said: boolean) => {
    if (phase !== "playing" || lockedRef.current || !question) return;
    const q = question;
    const ok = said === q.isTrue;
    const p = poolRef.current[q.index];

    // 그 단어의 첫 응답만 기록에 남깁니다 (반복 등장해도 판정은 처음 것)
    const key = wordKey(q.word);
    if (p && !answeredRef.current.has(key)) {
      answeredRef.current.set(key, { word: p.word, meaning: p.meaning, source: p.source, correct: ok });
    }

    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      nextQuestion();
      return;
    }

    // 틀림 — 진짜 뜻을 잠깐 보여주고 다음 문제로
    lockedRef.current = true;
    setReveal(q.truth);
    revealTimerRef.current = window.setTimeout(() => {
      if (!aliveRef.current) return;
      lockedRef.current = false;
      setReveal(null);
      if (finishedRef.current) return; // 노출 중에 30초가 끝났으면 그대로 둡니다
      nextQuestion();
    }, REVEAL_MS);
  };

  return (
    <GameScreen id="ox">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady id="ox" lines={["뜻이 맞으면 O, 아니면 X", "30초 동안 최대한 많이"]} onStart={beginPlay} />
      ) : null}

      {phase === "playing" && question ? (
        <>
          <StatusRow
            left={<Stat icon="clock" label="남은 시간" value={left + "초"} />}
            right={<Stat icon="check" label="맞힌 수" value={score} />}
          />
          <TimeBar pct={(left / ROUND_SEC) * 100} />

          <div
            className="mt-5 h-[260px] rounded-[20px] px-6 flex flex-col items-center justify-center text-center"
            style={{
              background: reveal ? G.badBg : "#FFFFFF",
              boxShadow: reveal ? "inset 0 0 0 1.5px " + G.badBd : CARD_SHADOW,
              transition: "background-color 150ms ease",
            }}
          >
            <p className="font-word text-[26px] font-semibold leading-tight break-words" style={{ color: G.deep }}>
              {question.word}
            </p>
            <span className="w-8 h-0.5 rounded-[1px] my-[18px]" style={{ background: G.track }} />
            <p
              className="font-gothic text-[18px] font-semibold leading-snug break-keep"
              style={{ color: G.text, textDecoration: reveal ? "line-through" : "none", opacity: reveal ? 0.55 : 1 }}
            >
              {question.shown}
            </p>
            {reveal ? (
              <p className="mt-2.5 font-gothic text-[16px] font-semibold leading-snug break-keep" style={{ color: G.ok }}>
                {reveal}
              </p>
            ) : null}
          </div>

          <div className="mt-3.5 flex gap-3">
            <button
              type="button"
              aria-label="맞음"
              onClick={() => answer(true)}
              className="flex-1 h-[60px] rounded-[18px] font-word text-[18px] font-semibold text-white active:opacity-90"
              style={{ background: G.teal }}
            >
              O
            </button>
            <button
              type="button"
              aria-label="아님"
              onClick={() => answer(false)}
              className="flex-1 h-[60px] rounded-[18px] box-border bg-white font-word text-[18px] font-semibold active:bg-[#F1F4F5]"
              style={{ border: "1px solid " + G.line, color: G.text }}
            >
              X
            </button>
          </div>
          <p className="mt-3.5 text-center font-gothic text-[12px]" style={{ color: G.mute }}>
            뜻이 맞으면 O, 아니면 X
          </p>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label="맞힌 수"
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

export default GameOX;
