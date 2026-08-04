// src/pages/GameOX.tsx
// 스피드 O/X (Cepat O/X). 30초 동안 "이 단어의 뜻이 맞나?"를 O/X로 고릅니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 30초를 채워야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 구성·종료 연출은 짝맞추기(GameMatch.tsx)와 같은 모양으로 맞췄습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey, MEDALI_COLORS } from "@/lib/medali";

const ROUND_SEC = 30;         // 한 판 길이
const MIN_WORDS = 6;          // 이보다 적으면 게임을 못 엽니다
const REVEAL_MS = 600;        // 틀렸을 때 진짜 뜻을 보여주는 시간
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
  becameConfirmed: boolean;
}

interface RoundResult {
  score: number;
  bestBefore: number;         // 이번 판 이전의 최고 점수. 없으면 0
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

/* 문제가 바뀔 때마다 단어를 읽어 줍니다.
   폰 네이티브 TTS 우선, 없으면 브라우저 음성 합성으로 폴백 (GameEja와 같은 방식).
   이전 발음은 끊고 새로 재생하며, 실패해도 게임은 그대로 진행됩니다. */
const speak = (text: string) => {
  const w = window as any;
  if (w.AndroidTTS) {
    try {
      try { w.AndroidTTS.stop?.(); } catch (e) {}
      w.AndroidTTS.speak(text, "id-ID");
      return;
    } catch (e) { /* 폴백으로 넘어갑니다 */ }
  }
  try {
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 1;
    window.speechSynthesis?.speak?.(u);
  } catch (e) { /* 지원하지 않는 기기는 조용히 넘어갑니다 */ }
};

// "+3" 같은 점수 표시가 위로 떠오르며 사라집니다. (효과음 없음)
const FloatPoint = ({ text }: { text: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // 마운트 직후 값이 바뀌어야 transition이 걸립니다 (rAF 2번)
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

const GameOX = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // 다음 문제 꺼내기 (큐가 비면 다시 섞어 이어감 — 반복 등장 허용)
  const nextQuestion = useCallback(() => {
    const pool = poolRef.current;
    if (pool.length === 0) return;
    if (queueRef.current.length === 0) queueRef.current = shuffledQueue(pool.length);
    const idx = queueRef.current.shift();
    const q = makeQuestion(pool, typeof idx === "number" ? idx : 0);
    setQuestion(q);
    speak(q.word);   // 발음은 그냥 흘려보냅니다 — 기다리지 않으므로 진행이 막히지 않습니다
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

    const words = Array.from(answeredRef.current.values());
    const finalScore = scoreRef.current;

    // 1) 노력 점수
    const got = await medaliEngine.addPoints("game", 3);
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => setFloatOn(false), 1200);
    }

    // 2) 단어별 기록 (첫 응답 기준) → 이번에 별이 된 단어
    for (const w of words) {
      const r = await medaliEngine.recordWordResult(w.word, w.correct, w.source);
      w.becameConfirmed = r.becameConfirmed;
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

    setResult({ score: finalScore, bestBefore, words });
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
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
      try { (window as any).AndroidTTS?.stop?.(); } catch (e) {}
      try { window.speechSynthesis?.cancel?.(); } catch (e) {}
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
      answeredRef.current.set(key, {
        word: p.word,
        meaning: p.meaning,
        source: p.source,
        correct: ok,
        becameConfirmed: false,
      });
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
      lockedRef.current = false;
      setReveal(null);
      if (finishedRef.current) return; // 노출 중에 30초가 끝났으면 그대로 둡니다
      nextQuestion();
    }, REVEAL_MS);
  };

  const pct = Math.max(0, Math.min(100, (left / ROUND_SEC) * 100));

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
          CEPAT O/X
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
            <p className="text-[0.9375rem] text-foreground">뜻이 맞으면 O, 아니면 X</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              30초 동안 최대한 많이
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
            <div className="relative flex items-center justify-between">
              <span className="font-word text-[0.9375rem] tabular-nums text-foreground">
                {left}초
              </span>
              <span className="relative font-gothic text-[0.75rem] text-muted-foreground">
                {score}개
              </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-1 rounded-full bg-primary"
                style={{ width: pct + "%", transition: "width 200ms linear" }}
              />
            </div>

            <div
              className={
                "mt-4 min-h-[190px] rounded-2xl border px-4 py-8 flex flex-col items-center justify-center text-center transition-colors " +
                (reveal ? "border-destructive bg-destructive/10" : "border-border bg-card")
              }
            >
              <p className="font-word text-[1.5rem] leading-tight text-foreground break-words">
                {question.word}
              </p>
              <p className="mt-3 font-gothic text-[0.9375rem] leading-snug text-foreground/90 break-words">
                {question.shown}
              </p>
              {reveal ? (
                <p className="mt-3 font-gothic text-[0.875rem] leading-snug text-emerald-500 break-words">
                  진짜 뜻: {reveal}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => answer(true)}
                className="flex-1 py-5 rounded-2xl bg-primary text-[0.9375rem] font-medium text-white active:opacity-90"
              >
                O 맞아요
              </button>
              <button
                type="button"
                onClick={() => answer(false)}
                className="flex-1 py-5 rounded-2xl border border-border bg-card text-[0.9375rem] font-medium text-foreground active:bg-muted/60"
              >
                X 아니에요
              </button>
            </div>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-4">
            <div className="relative rounded-2xl border border-border bg-card px-4 py-6 text-center">
              <p className="relative inline-block font-word text-[1.375rem] font-medium leading-snug text-foreground">
                <span className="tabular-nums text-primary">{result.score}</span>개
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

export default GameOX;
