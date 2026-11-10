// src/pages/GameJodoh.tsx
// 빠른 짝짓기 (Jodohkan) — 시안 GM-Jodoh. 짝맞추기(Cocokkan)를 대신합니다.
// 왼쪽 인니어 5개, 오른쪽 한국어 뜻 5개를 펼쳐 두고 60초 동안 같은 뜻끼리 연결합니다.
// 맞히면 두 칸이 잠깐 흐려졌다가 새 단어가 들어옵니다. 새 뜻은 오른쪽 아무 칸에나 들어가고
// 그 칸의 뜻이 빈자리로 옮겨 갑니다 — 빈자리 두 곳에 짝이 같이 들어오면 답이 보이기 때문입니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다. 60초를 채워야 점수·단어 기록이 남습니다.
// 단어 기록: 한 번도 틀리지 않고 맞힌 단어만 정답, 소거법이 가능하므로 증거는 0.5 (DECISIONS §10).

import { useCallback, useEffect, useRef, useState } from "react";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey } from "@/lib/medali";
import {
  G,
  TILE_SHADOW,
  GameScreen,
  GameLoading,
  GameEmpty,
  GameReady,
  GameResult,
  StatusRow,
  Stat,
  TimeBar,
  mmss,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const ROUND_SEC = 60;
const PAIRS = 5;              // 한 화면에 펼쳐 두는 쌍
const MIN_WORDS = 6;
const MATCH_MS = 380;         // 맞힌 두 칸이 흐려져 있는 시간
const WRONG_MS = 450;         // 틀린 칸이 분홍으로 남는 시간
const TICK_MS = 200;
const WEIGHT = 0.5;

type Phase = "loading" | "empty" | "ready" | "playing" | "done";
type Side = "L" | "R";

interface Slot {
  idx: number;                // pool 인덱스 (-1 = 비어 있음)
  state: "idle" | "picked" | "matched" | "wrong";
}

interface RoundResult {
  score: number;
  bestBefore: number;
  rows: ResultRow[];
  starWords: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const GameJodoh = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [left, setLeft] = useState<Slot[]>([]);
  const [right, setRight] = useState<Slot[]>([]);
  const [secLeft, setSecLeft] = useState(ROUND_SEC);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const poolRef = useRef<PoolWord[]>([]);
  const queueRef = useRef<number[]>([]);
  const leftRef = useRef<Slot[]>([]);
  const rightRef = useRef<Slot[]>([]);
  const pickRef = useRef<{ side: Side; pos: number } | null>(null);
  const missedRef = useRef(new Set<number>());   // 한 번이라도 틀린 단어 (pool 인덱스)
  const matchedRef = useRef<number[]>([]);       // 맞힌 순서
  const scoreRef = useRef(0);
  const endAtRef = useRef(0);
  const finishedRef = useRef(false);
  const busyRef = useRef(false);                 // 맞힌 칸이 바뀌는 동안 입력 무시
  const tickRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const aliveRef = useRef(true);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== id);
      if (aliveRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  };

  const commit = (l: Slot[], r: Slot[]) => {
    leftRef.current = l;
    rightRef.current = r;
    setLeft(l);
    setRight(r);
  };

  // 다음 단어 (화면에 없는 것 중에서). 큐가 비면 다시 섞어 이어 갑니다.
  const nextIdx = (onBoard: Set<number>): number => {
    const pool = poolRef.current;
    for (let guard = 0; guard < pool.length * 2 + 2; guard++) {
      if (queueRef.current.length === 0) {
        const all: number[] = [];
        for (let i = 0; i < pool.length; i++) all.push(i);
        queueRef.current = shuffle(all);
      }
      const i = queueRef.current.shift() as number;
      if (!onBoard.has(i)) return i;
    }
    return -1;
  };

  const finishRound = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setSecLeft(0);

    const pool = poolRef.current;
    const seen = new Set<number>();
    const rows: ResultRow[] = [];
    const starWords: string[] = [];
    // 맞힌 단어 + 틀리기만 하고 못 맞힌 단어
    const order = matchedRef.current.concat(Array.from(missedRef.current));
    for (const i of order) {
      if (seen.has(i) || !pool[i]) continue;
      seen.add(i);
      const p = pool[i];
      const correct = matchedRef.current.indexOf(i) >= 0 && !missedRef.current.has(i);
      rows.push({ word: p.word, meaning: p.meaning, source: p.source, correct });
    }

    const got = await medaliEngine.addPoints("game", 3);
    for (const r of rows) {
      const res = await medaliEngine.recordWordResult(r.word, r.correct, r.source, WEIGHT);
      if (res.becameConfirmed) starWords.push(r.word);
    }

    let bestBefore = 0;
    try {
      for (const r of await listRounds("jodoh")) if (r && r.score > bestBefore) bestBefore = r.score;
    } catch {
      bestBefore = 0;
    }
    await medaliEngine.saveRound({
      game: "jodoh",
      date: dateKey(new Date()),
      durationSec: ROUND_SEC,
      score: scoreRef.current,
      words: rows.map((r) => ({ word: r.word, correct: r.correct, source: r.source })),
    });

    if (!aliveRef.current) return;
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      later(() => setFloatOn(false), 1200);
    }
    setResult({ score: scoreRef.current, bestBefore, rows, starWords });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    busyRef.current = false;
    pickRef.current = null;
    missedRef.current = new Set<number>();
    matchedRef.current = [];
    scoreRef.current = 0;
    queueRef.current = [];
    const board = new Set<number>();
    const ids: number[] = [];
    for (let i = 0; i < PAIRS; i++) {
      const n = nextIdx(board);
      if (n < 0) break;
      board.add(n);
      ids.push(n);
    }
    commit(
      ids.map((idx) => ({ idx, state: "idle" })),
      shuffle(ids).map((idx) => ({ idx, state: "idle" }))
    );
    endAtRef.current = Date.now() + ROUND_SEC * 1000;
    setScore(0);
    setSecLeft(ROUND_SEC);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setPhase("playing");
  }, []);

  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawPool(20, 10)
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

  useEffect(() => {
    if (phase !== "playing") return;
    tickRef.current = window.setInterval(() => {
      const ms = endAtRef.current - Date.now();
      if (ms <= 0) {
        finishRound();
        return;
      }
      setSecLeft(Math.ceil(ms / 1000));
    }, TICK_MS);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase, finishRound]);

  // 화면을 벗어날 때 정리만 (setState 없음)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (tickRef.current) window.clearInterval(tickRef.current);
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      stopSpeak();
    };
  }, []);

  const setSlot = (side: Side, pos: number, state: Slot["state"]) => {
    const l = leftRef.current.slice();
    const r = rightRef.current.slice();
    const arr = side === "L" ? l : r;
    if (arr[pos]) arr[pos] = { ...arr[pos], state };
    commit(l, r);
  };

  const tap = (side: Side, pos: number) => {
    if (phase !== "playing" || busyRef.current || finishedRef.current) return;
    const slot = (side === "L" ? leftRef.current : rightRef.current)[pos];
    if (!slot || slot.idx < 0 || slot.state === "matched" || slot.state === "wrong") return;

    const pick = pickRef.current;
    if (!pick) {
      pickRef.current = { side, pos };
      setSlot(side, pos, "picked");
      if (side === "L") speakWord(poolRef.current[slot.idx].word);
      return;
    }
    if (pick.side === side) {
      // 같은 쪽을 다시 누르면 고른 칸을 바꿉니다 (같은 칸이면 해제)
      const l = leftRef.current.slice();
      const r = rightRef.current.slice();
      const arr = side === "L" ? l : r;
      arr[pick.pos] = { ...arr[pick.pos], state: "idle" };
      if (pick.pos === pos) {
        pickRef.current = null;
      } else {
        arr[pos] = { ...arr[pos], state: "picked" };
        pickRef.current = { side, pos };
        if (side === "L") speakWord(poolRef.current[arr[pos].idx].word);
      }
      commit(l, r);
      return;
    }

    const lp = side === "L" ? pos : pick.pos;
    const rp = side === "R" ? pos : pick.pos;
    const li = leftRef.current[lp].idx;
    const ri = rightRef.current[rp].idx;
    pickRef.current = null;

    const pool = poolRef.current;
    const ok =
      li === ri ||
      String(pool[li].meaning).trim().toLowerCase() === String(pool[ri].meaning).trim().toLowerCase();

    if (ok) {
      busyRef.current = true;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      matchedRef.current.push(li);
      const l = leftRef.current.slice();
      const r = rightRef.current.slice();
      l[lp] = { ...l[lp], state: "matched" };
      r[rp] = { ...r[rp], state: "matched" };
      commit(l, r);
      later(() => {
        if (finishedRef.current) return;
        const l2 = leftRef.current.slice();
        const r2 = rightRef.current.slice();
        const onBoard = new Set<number>();
        l2.forEach((s, i) => { if (i !== lp && s.idx >= 0) onBoard.add(s.idx); });
        const n = nextIdx(onBoard);
        l2[lp] = { idx: n, state: "idle" };
        // 새 뜻은 오른쪽 아무 칸에 — 그 칸의 뜻이 빈자리로 옮겨 갑니다
        const target = Math.floor(Math.random() * r2.length);
        if (target === rp) {
          r2[rp] = { idx: n, state: "idle" };
        } else {
          const moved = r2[target];
          r2[rp] = { idx: moved.idx, state: moved.state === "picked" ? "picked" : "idle" };
          r2[target] = { idx: n, state: "idle" };
          // 고른 칸이 옮겨 갔으면 따라갑니다
          const pk = pickRef.current;
          if (pk && pk.side === "R" && pk.pos === target) pickRef.current = { side: "R", pos: rp };
        }
        commit(l2, r2);
        busyRef.current = false;
      }, MATCH_MS);
      return;
    }

    // 틀림 — 두 단어 모두 "틀린 적 있음"으로 남깁니다
    missedRef.current.add(li);
    missedRef.current.add(ri);
    const l = leftRef.current.slice();
    const r = rightRef.current.slice();
    l[lp] = { ...l[lp], state: "wrong" };
    r[rp] = { ...r[rp], state: "wrong" };
    commit(l, r);
    later(() => {
      const l2 = leftRef.current.slice();
      const r2 = rightRef.current.slice();
      if (l2[lp] && l2[lp].state === "wrong") l2[lp] = { ...l2[lp], state: "idle" };
      if (r2[rp] && r2[rp].state === "wrong") r2[rp] = { ...r2[rp], state: "idle" };
      commit(l2, r2);
    }, WRONG_MS);
  };

  const tileStyle = (s: Slot): React.CSSProperties => {
    if (s.state === "picked") {
      return { background: "#FFFFFF", border: "1.5px solid " + G.teal, boxShadow: "0 0 0 3px " + G.tealBg };
    }
    if (s.state === "matched") {
      return { background: G.tealBg, border: "1.5px solid " + G.tealBd, opacity: 0.55 };
    }
    if (s.state === "wrong") {
      return { background: G.badBg, border: "1.5px solid " + G.badBd };
    }
    return { background: "#FFFFFF", border: "1.5px solid " + G.tile, boxShadow: TILE_SHADOW };
  };

  const pool = poolRef.current;
  const grid: { side: Side; pos: number; slot: Slot }[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) grid.push({ side: "L", pos: i, slot: left[i] });
    if (right[i]) grid.push({ side: "R", pos: i, slot: right[i] });
  }

  return (
    <GameScreen id="jodoh">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady
          id="jodoh"
          lines={["왼쪽 단어와 오른쪽 뜻을 하나씩 눌러 연결하세요", "60초 동안 맞힐수록 새 단어가 들어옵니다"]}
          onStart={beginPlay}
        />
      ) : null}

      {phase === "playing" ? (
        <>
          <StatusRow
            left={<Stat icon="clock" label="남은 시간" value={mmss(secLeft)} />}
            right={<Stat icon="check" label="맞힌 쌍" value={score} />}
          />
          <TimeBar pct={(secLeft / ROUND_SEC) * 100} />
          <p className="mt-[18px] text-center font-gothic text-[12px]" style={{ color: G.mute }}>
            같은 뜻끼리 연결하세요 · 맞히면 새 단어가 들어옵니다
          </p>
          <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {grid.map(({ side, pos, slot }) => {
              const p = slot.idx >= 0 ? pool[slot.idx] : null;
              return (
                <button
                  key={side + pos}
                  type="button"
                  onClick={() => tap(side, pos)}
                  className="h-[60px] rounded-2xl box-border px-2 flex items-center justify-center text-center"
                  style={{ ...tileStyle(slot), transition: "opacity 200ms ease, background-color 150ms ease" }}
                >
                  {p ? (
                    side === "L" ? (
                      <span
                        className="font-word text-[18px] font-semibold leading-tight break-words"
                        style={{ color: G.deep }}
                      >
                        {p.word}
                      </span>
                    ) : (
                      <span
                        className="font-gothic text-[15.5px] font-semibold leading-tight break-keep"
                        style={{ color: G.text }}
                      >
                        {p.meaning}
                      </span>
                    )
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label="맞힌 쌍"
          value={result.score}
          best={result.score > 0 && result.score > result.bestBefore}
          bestText={result.bestBefore > 0 ? "최고 " + result.bestBefore + "쌍" : undefined}
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

export default GameJodoh;
