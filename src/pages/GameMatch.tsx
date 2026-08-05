// src/pages/GameMatch.tsx
// 짝맞추기 (Cocokkan). 카드 12장(인니어 6 + 뜻 6)을 뒤집어 짝을 찾습니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 한 판을 끝내야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, HelpCircle, Star } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey, MEDALI_COLORS } from "@/lib/medali";

// 잘하면 카드가 늘어납니다. 레벨은 내려가지 않습니다.
const PAIRS_BY_LEVEL = [4, 5, 6];     // 레벨 1·2·3 (8장 → 10장 → 12장)
const LEVEL_UP_MISSES = 2;            // 한 판에 틀린 횟수가 이 이하면 다음 레벨로
const LEVEL_KEY = "cocokkan-level";
const MIN_PAIRS = 4;          // 이보다 적으면 게임을 못 엽니다
const CLOSE_MS = 1200;        // 짝이 아닐 때 다시 닫히기까지 (틀린 짝을 읽을 시간)
const LAST_PAIR_MS = 1100;    // 마지막 짝을 맞힌 판을 보여주는 시간
const GOOD_MISS = 1;          // 미스가 이 이하면 "맞힌 것"으로 봅니다

type Phase = "loading" | "empty" | "playing" | "done";

interface Card {
  id: string;
  pair: number;               // pool 인덱스
  kind: "id" | "ko";
  text: string;
}

interface WordResult {
  word: string;
  meaning: string;
  source: PoolWord["source"];
  misses: number;
  correct: boolean;
  becameConfirmed: boolean;
}

interface RoundResult {
  durationSec: number;
  bestBefore: number;         // 이번 판 이전의 최고(최단) 기록. 없으면 0
  words: WordResult[];
  leveledTo: number;          // 이번 판으로 올라간 레벨. 그대로면 0
}

// 레벨은 이 기기에만 남습니다 (읽기 실패·이상한 값은 1로 봅니다)
export function loadLevel(): number {
  try {
    const n = Number(localStorage.getItem(LEVEL_KEY));
    return n === 1 || n === 2 || n === 3 ? n : 1;
  } catch {
    return 1;
  }
}

function saveLevel(level: number): void {
  try {
    localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    // 저장 못 해도 이번 판은 정상 진행됩니다
  }
}

export function pairsForLevel(level: number): number {
  const i = Math.max(1, Math.min(PAIRS_BY_LEVEL.length, level)) - 1;
  return PAIRS_BY_LEVEL[i];
}

const SOURCE_LABEL: Record<PoolWord["source"], string> = {
  wordbook: "단어장",
  lookup: "찾아본",
  seed: "기본",
};

// "+3" 같은 점수 표시가 위로 떠오르며 사라집니다. (소리 없음)
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

function buildCards(pool: PoolWord[]): Card[] {
  const cards: Card[] = [];
  pool.forEach((p, i) => {
    cards.push({ id: i + "-id", pair: i, kind: "id", text: p.word });
    cards.push({ id: i + "-ko", pair: i, kind: "ko", text: p.meaning });
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = cards[i];
    cards[i] = cards[j];
    cards[j] = t;
  }
  return cards;
}

const GameMatch = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [pool, setPool] = useState<PoolWord[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<string[]>([]);      // 지금 열린 카드 id (최대 2)
  const [matched, setMatched] = useState<number[]>([]); // 맞춘 pair 인덱스
  const [locked, setLocked] = useState(false);          // 판정 대기 중 추가 탭 무시
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);              // 이번 판에 실제로 오른 점수
  const [floatOn, setFloatOn] = useState(false);

  const [level, setLevel] = useState(loadLevel);

  const startedAtRef = useRef(0);
  const missesRef = useRef<number[]>([]);
  const levelRef = useRef(level);   // startRound가 항상 최신 레벨을 보게 합니다
  const finishedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);

  // 한 판 시작 (처음 진입 / "한 판 더")
  const startRound = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = 0;
    missesRef.current = [];
    setOpen([]);
    setMatched([]);
    setLocked(false);
    setElapsed(0);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setPhase("loading");

    // 확정 2개는 고정, 나머지는 미확정으로 채웁니다 (레벨이 오르면 그만큼 더 뽑습니다)
    const pairs = pairsForLevel(levelRef.current);
    drawPool(Math.max(1, pairs - 2), 2)
      .then((list) => {
        if (list.length < MIN_PAIRS) {
          setPool([]);
          setPhase("empty");
          return;
        }
        const use = list.slice(0, pairs);
        missesRef.current = use.map(() => 0);
        setPool(use);
        setCards(buildCards(use));
        setPhase("playing");
      })
      .catch(() => {
        setPool([]);
        setPhase("empty");
      });
  }, []);

  useEffect(() => {
    startRound();
  }, [startRound]);

  // 타이머 — 첫 카드를 연 순간부터 6쌍이 끝날 때까지
  useEffect(() => {
    if (phase !== "playing") return;
    const t = window.setInterval(() => {
      if (startedAtRef.current > 0) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [phase]);

  // 화면을 벗어날 때 남은 타이머 정리 (setState 없이 정리만)
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
    };
  }, []);

  // 판 종료 처리 — ref 가드로 정확히 1회만 실행됩니다
  const finishRound = async (usePool: PoolWord[], durationSec: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const misses = missesRef.current;
    const words = usePool.map((p, i) => ({
      word: p.word,
      meaning: p.meaning,
      source: p.source,
      misses: misses[i] || 0,
      correct: (misses[i] || 0) <= GOOD_MISS,
      becameConfirmed: false,
    })) as WordResult[];

    // 1) 노력 점수
    const got = await medaliEngine.addPoints("game", 3);
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => setFloatOn(false), 1200);
    }

    // 2) 단어별 기록 → 이번에 별이 된 단어 표시
    for (const w of words) {
      // 짝맞추기는 남은 카드가 줄면 저절로 맞으므로 증거를 0.5만 인정합니다
      const r = await medaliEngine.recordWordResult(w.word, w.correct, w.source, 0.5);
      w.becameConfirmed = r.becameConfirmed;
    }

    // 3) 이전 최고 기록(이번 판 제외) → 저장
    let bestBefore = 0;
    try {
      const rounds = await listRounds("match");
      for (const r of rounds) {
        if (r && r.durationSec > 0 && (bestBefore === 0 || r.durationSec < bestBefore)) {
          bestBefore = r.durationSec;
        }
      }
    } catch {
      bestBefore = 0;
    }

    await medaliEngine.saveRound({
      game: "match",
      date: dateKey(new Date()),
      durationSec,
      score: usePool.length,
      words: words.map((w) => ({ word: w.word, correct: w.correct, source: w.source })),
    });

    // 레벨업 — 짝이 아닌 카드를 연 횟수(missesRef는 실패 한 번에 두 쌍이 오르므로 2로 나눕니다)가
    // 적으면 다음 판부터 카드가 늘어납니다. 이번 판에는 적용하지 않습니다.
    const wrongTries = Math.round(misses.reduce((a, b) => a + (b || 0), 0) / 2);
    let leveledTo = 0;
    if (wrongTries <= LEVEL_UP_MISSES && levelRef.current < PAIRS_BY_LEVEL.length) {
      const next = levelRef.current + 1;
      levelRef.current = next;
      saveLevel(next);
      setLevel(next);
      leveledTo = next;
    }

    setResult({ durationSec, bestBefore, words, leveledTo });
    setPhase("done");
  };

  const handleCard = (c: Card) => {
    if (phase !== "playing" || locked) return;
    if (matched.indexOf(c.pair) >= 0) return;
    if (open.indexOf(c.id) >= 0) return;

    if (startedAtRef.current === 0) startedAtRef.current = Date.now();

    if (open.length === 0) {
      setOpen([c.id]);
      return;
    }

    const first = cards.find((x) => x.id === open[0]);
    const next = [open[0], c.id];
    setOpen(next);

    if (first && first.pair === c.pair) {
      // 짝 성립 — 열린 채로 고정
      const nextMatched = matched.concat([c.pair]);
      setMatched(nextMatched);
      setOpen([]);
      if (nextMatched.length >= pool.length) {
        const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        setElapsed(sec);
        // 마지막 짝이 뒤집힌 판을 눈으로 확인할 시간을 줍니다
        closeTimerRef.current = window.setTimeout(() => {
          finishRound(pool, sec);
        }, LAST_PAIR_MS);
      }
      return;
    }

    // 실패 — 두 쌍 모두 미스로 세고 잠시 뒤 닫습니다
    if (first) missesRef.current[first.pair] = (missesRef.current[first.pair] || 0) + 1;
    missesRef.current[c.pair] = (missesRef.current[c.pair] || 0) + 1;
    setLocked(true);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen([]);
      setLocked(false);
    }, CLOSE_MS);
  };

  const isFaceUp = (c: Card) => matched.indexOf(c.pair) >= 0 || open.indexOf(c.id) >= 0;

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
          COCOKKAN
        </h1>
      </header>

      <div className="px-4">
        {/* 경과 시간 + 점수 플로팅 자리 */}
        {phase === "playing" || phase === "done" ? (
          <div className="relative flex items-center justify-between pt-3">
            <span className="font-gothic text-[0.75rem] text-muted-foreground">
              {phase === "done"
                ? "끝"
                : matched.length + " / " + pool.length + " 쌍 · " + pool.length * 2 + "장"}
            </span>
            <span className="relative font-word text-[0.9375rem] tabular-nums text-foreground">
              {elapsed}초
              {floatOn ? <FloatPoint text={"+" + gained} /> : null}
            </span>
          </div>
        ) : null}

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

        {/* 카드는 2열 × 6행 — 3열보다 칸이 넓어 글자를 키울 수 있고, 낮게 잡아 한 화면에 들어갑니다 */}
        {phase === "playing" ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {cards.map((c) => {
              const face = isFaceUp(c);
              const done = matched.indexOf(c.pair) >= 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCard(c)}
                  className={
                    "h-[4.75rem] rounded-xl border px-2.5 py-2 flex items-center justify-center text-center transition-colors " +
                    (face
                      ? done
                        ? "bg-primary/15 border-primary"
                        : "bg-card border-border"
                      : "bg-card border-border active:bg-muted/60")
                  }
                >
                  {face ? (
                    <span
                      className={
                        "break-words leading-snug line-clamp-2 " +
                        (c.kind === "id"
                          ? "font-word text-[0.9375rem] text-foreground"
                          : "font-gothic text-[0.875rem] text-foreground")
                      }
                    >
                      {c.text}
                    </span>
                  ) : (
                    <HelpCircle size={18} className="text-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center">
              <p className="font-word text-[1.375rem] font-medium leading-snug text-foreground">
                <span className="tabular-nums text-primary">{result.durationSec}</span>초
              </p>
              <p className="mt-2 font-gothic text-[0.8125rem] text-muted-foreground">
                {result.bestBefore === 0 || result.durationSec < result.bestBefore
                  ? "최고 기록!"
                  : "최고 " + result.bestBefore + "초"}
              </p>
              {result.leveledTo > 0 ? (
                <p className="mt-1.5 font-gothic text-[0.8125rem] text-primary">
                  다음 판부터 {pairsForLevel(result.leveledTo) * 2}장이에요
                </p>
              ) : null}
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
                onClick={startRound}
                className="flex-1 h-11 rounded-[13px] bg-primary text-[0.875rem] font-gothic font-medium text-white active:opacity-90"
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

export default GameMatch;
