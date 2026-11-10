// src/pages/GameEja.tsx
// 철자 채우기 (Eja) — 시안 GM-Eja. 뜻을 보고 빈칸에 글자를 채웁니다 — 철자와 발음을 잡는 게임입니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 여섯 단어를 끝내야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 조각(머리·상태 줄·결과)은 GameKit 하나를 같이 씁니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey } from "@/lib/medali";
import {
  G,
  CARD_SHADOW,
  TILE_SHADOW,
  GameScreen,
  GameLoading,
  GameEmpty,
  GameReady,
  GameResult,
  StatusRow,
  Stat,
  Dots,
  IconSpeaker,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const ROUND_WORDS = 6;        // 한 판에 채울 단어 수
const MIN_WORDS = 4;          // 이보다 적으면 게임을 못 엽니다
const MIN_LETTERS = 4;        // 너무 짧으면 채울 게 없고
const MAX_LETTERS = 14;       // 너무 길면 폰 화면에 안 맞습니다
const BLANK_RATIO = 0.35;
const MIN_BLANKS = 1;
const MAX_BLANKS = 4;
const WRONG_TILES = 3;        // 정답에 없는 훼방 글자
const DONE_MS = 1600;         // 완성한 단어를 보여주는 시간 (발음을 듣는 동안)
const SHAKE_MS = 300;
const GOOD_MISS = 1;          // 미스가 이 이하면 "맞힌 것"으로 봅니다
const ROW_WIDTH = 322;        // 카드 안쪽 폭 (390 화면 − 바깥 16×2 − 안쪽 18×2)

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

type Phase = "loading" | "empty" | "ready" | "playing" | "done";

export interface Slot {
  ch: string;                 // 원래 글자 (공백·하이픈도 그대로)
  letter: boolean;            // 알파벳 칸인가
  blank: boolean;             // 비워 둔 칸인가
}

interface Tile {
  id: number;
  ch: string;                 // 소문자 글자
}

interface RoundResult {
  score: number;
  durationSec: number;
  bestBefore: number;         // 이번 판 이전의 최고 점수. 없으면 0
  rows: ResultRow[];
  starWords: string[];
}

// 정규식 없이 알파벳만 가려냅니다 (백슬래시가 들어갈 일이 없게).
const isAlpha = (c: string): boolean => {
  const x = c.toLowerCase();
  return x >= "a" && x <= "z";
};

export function letterCount(word: string): number {
  let n = 0;
  for (const c of String(word || "")) if (isAlpha(c)) n++;
  return n;
}

// 이 게임에 쓸 만한 단어인가 (알파벳 4~14자)
export function fitsEja(word: string): boolean {
  const n = letterCount(word);
  return n >= MIN_LETTERS && n <= MAX_LETTERS;
}

// 글자 칸 만들기. 공백·하이픈 같은 글자는 항상 보이는 고정 칸으로 둡니다.
export function makeSlots(word: string, rand: () => number = Math.random): Slot[] {
  const chars = Array.from(String(word || ""));
  const alphaIdx: number[] = [];
  chars.forEach((c, i) => {
    if (isAlpha(c)) alphaIdx.push(i);
  });

  const want = Math.max(MIN_BLANKS, Math.min(MAX_BLANKS, Math.round(alphaIdx.length * BLANK_RATIO)));

  // 첫 글자는 실마리로 남겨 둡니다 (그것 말고 비울 데가 없을 때만 씁니다)
  const pool = alphaIdx.slice(1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  const picked = new Set<number>(pool.slice(0, want));
  if (picked.size === 0 && alphaIdx.length > 0) picked.add(alphaIdx[0]);

  return chars.map((c, i) => ({ ch: c, letter: isAlpha(c), blank: picked.has(i) }));
}

// 알약 만들기 = 빈칸 글자들 + 정답에 없는 글자 3개, 전부 소문자로 섞어서.
export function makeTiles(slots: Slot[], rand: () => number = Math.random): Tile[] {
  const answer: string[] = [];
  for (const s of slots) if (s.blank) answer.push(s.ch.toLowerCase());

  // 헷갈리지 않게 단어에 쓰인 글자는 전부 훼방 후보에서 뺍니다
  const used = new Set<string>();
  for (const s of slots) if (s.letter) used.add(s.ch.toLowerCase());
  const spare: string[] = [];
  for (const c of ALPHABET) if (!used.has(c)) spare.push(c);
  for (let i = spare.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = spare[i];
    spare[i] = spare[j];
    spare[j] = t;
  }

  const all = answer.concat(spare.slice(0, WRONG_TILES));
  const tiles: Tile[] = all.map((ch, id) => ({ id, ch }));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = tiles[i];
    tiles[i] = tiles[j];
    tiles[j] = t;
  }
  return tiles;
}

const GameEja = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [tray, setTray] = useState<Tile[]>([]);
  const [filled, setFilled] = useState<string[]>([]);   // 왼쪽 빈칸부터 채운 글자
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [good, setGood] = useState(0);                  // 지금까지 맞힌 단어 수
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const poolRef = useRef<PoolWord[]>([]);
  const blanksRef = useRef<string[]>([]);      // 지금 단어의 빈칸 정답 글자 (소문자)
  const missesRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);
  const nextTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const setupWord = useCallback((i: number) => {
    const item = poolRef.current[i];
    if (!item) return;
    const s = makeSlots(item.word);
    blanksRef.current = s.filter((x) => x.blank).map((x) => x.ch.toLowerCase());
    setIndex(i);
    setSlots(s);
    setTray(makeTiles(s));
    setFilled([]);
    setShakeId(null);
    setSolved(false);
    lockedRef.current = false;
  }, []);

  const finishRound = useCallback(async (durationSec: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const misses = missesRef.current;
    const rows: ResultRow[] = poolRef.current.map((p, i) => ({
      word: p.word,
      meaning: p.meaning,
      source: p.source,
      correct: (misses[i] || 0) <= GOOD_MISS,
    }));

    const got = await medaliEngine.addPoints("game", 3);

    const starWords: string[] = [];
    for (const it of rows) {
      const r = await medaliEngine.recordWordResult(it.word, it.correct, it.source);
      if (r.becameConfirmed) starWords.push(it.word);
    }

    const score = rows.filter((it) => it.correct).length;

    let bestBefore = 0;
    try {
      const rounds = await listRounds("eja");
      for (const r of rounds) {
        if (r && r.score > bestBefore) bestBefore = r.score;
      }
    } catch {
      bestBefore = 0;
    }

    await medaliEngine.saveRound({
      game: "eja",
      date: dateKey(new Date()),
      durationSec,
      score,
      words: rows.map((it) => ({ word: it.word, correct: it.correct, source: it.source })),
    });

    if (!aliveRef.current) return;
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => {
        if (aliveRef.current) setFloatOn(false);
      }, 1200);
    }
    setResult({ score, durationSec, bestBefore, rows, starWords });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = 0;
    missesRef.current = poolRef.current.map(() => 0);
    setGood(0);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setupWord(0);
    setPhase("playing");
  }, [setupWord]);

  // 재료 준비. 알파벳 4~14자만 쓰므로 모자라면 한 번 더 크게 뽑습니다.
  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawPool(4, 2)
        .then(async (first) => {
          const use = first.filter((p) => fitsEja(p.word));
          if (use.length < ROUND_WORDS) {
            const seen = new Set(use.map((p) => p.word.trim().toLowerCase()));
            const more = await drawPool(8, 4);
            for (const p of more) {
              if (use.length >= ROUND_WORDS) break;
              if (!fitsEja(p.word)) continue;
              const k = p.word.trim().toLowerCase();
              if (seen.has(k)) continue;
              seen.add(k);
              use.push(p);
            }
          }
          if (!aliveRef.current) return;
          if (use.length < MIN_WORDS) {
            poolRef.current = [];
            setPhase("empty");
            return;
          }
          poolRef.current = use.slice(0, ROUND_WORDS);
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

  // 화면을 벗어날 때 남은 타이머 정리 (setState 없이 정리만)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (nextTimerRef.current) window.clearTimeout(nextTimerRef.current);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
      stopSpeak();
    };
  }, []);

  const handleTile = (t: Tile) => {
    if (phase !== "playing" || lockedRef.current) return;
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();

    const want = blanksRef.current[filled.length];
    if (!want || t.ch !== want) {
      missesRef.current[index] = (missesRef.current[index] || 0) + 1;
      setShakeId(t.id);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = window.setTimeout(() => {
        if (aliveRef.current) setShakeId(null);
      }, SHAKE_MS);
      return;
    }

    const next = filled.concat([t.ch]);
    setFilled(next);
    setTray(tray.filter((x) => x.id !== t.id));

    if (next.length < blanksRef.current.length) return;

    // 단어 완성 — 발음을 한 번 들려주고 다음으로
    lockedRef.current = true;
    setSolved(true);
    if ((missesRef.current[index] || 0) <= GOOD_MISS) setGood((n) => n + 1);
    const item = poolRef.current[index];
    if (item) speakWord(item.word, 0.95);
    nextTimerRef.current = window.setTimeout(() => {
      if (!aliveRef.current) return;
      const n = index + 1;
      if (n >= poolRef.current.length) {
        const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        finishRound(sec);
        return;
      }
      setupWord(n);
    }, DONE_MS);
  };

  const current = poolRef.current[index];

  // 빈칸 칸에 지금까지 채운 글자를 배분합니다
  let blankSeen = 0;
  const view = slots.map((s) => {
    if (!s.blank) return { ch: s.ch, blank: false, done: true, letter: s.letter, now: false };
    const got = filled[blankSeen];
    const now = blankSeen === filled.length;   // 지금 채울 칸
    blankSeen++;
    return { ch: got || "", blank: true, done: !!got, letter: true, now };
  });

  // 긴 단어는 칸을 줄여 한 줄에 넣습니다 (시안 34×46, 글자 22px)
  const cells = Math.max(1, slots.length);
  const cellW = Math.max(18, Math.min(34, Math.floor((ROW_WIDTH - 4 * (cells - 1)) / cells)));
  const cellH = Math.round(cellW * (46 / 34));
  const cellFont = Math.max(15, Math.round(cellW * (22 / 34)));

  return (
    <GameScreen id="eja">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady
          id="eja"
          lines={["뜻을 보고 빈칸에 글자를 채우세요", "소리 버튼으로 발음을 들어도 됩니다"]}
          onStart={beginPlay}
        />
      ) : null}

      {phase === "playing" && current ? (
        <>
          <StatusRow
            left={<Dots n={poolRef.current.length} cur={index} />}
            right={<Stat icon="check" label="맞힌 수" value={good} />}
          />

          <div
            className="mt-2 rounded-[20px] bg-white px-[18px] pt-[22px] pb-6 flex flex-col items-center"
            style={{
              boxShadow: solved ? "0 0 0 1.5px " + G.tealBd + ", " + CARD_SHADOW : CARD_SHADOW,
              transition: "box-shadow 150ms ease",
            }}
          >
            <p className="font-gothic text-[12px] font-semibold" style={{ color: G.mute }}>
              뜻
            </p>
            <div className="mt-1.5 flex items-center gap-2.5 max-w-full">
              <span className="min-w-0 font-gothic text-[22px] font-semibold text-center break-keep" style={{ color: G.text }}>
                {current.meaning}
              </span>
              <button
                type="button"
                aria-label="발음 듣기"
                onClick={() => speakWord(current.word, 0.95)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:opacity-70"
                style={{ background: "#E2F1EC", color: G.teal }}
              >
                <IconSpeaker size={16} small />
              </button>
            </div>

            <div className="mt-[22px] flex items-center justify-center gap-1">
              {view.map((v, i) => {
                if (!v.letter) {
                  // 하이픈은 보이게, 공백은 틈으로
                  return v.ch === " " ? (
                    <span key={i} style={{ width: Math.round(cellW / 3) }} aria-hidden="true" />
                  ) : (
                    <span
                      key={i}
                      className="font-word px-0.5"
                      style={{ fontSize: cellFont, color: G.mute }}
                    >
                      {v.ch}
                    </span>
                  );
                }
                let style: React.CSSProperties = { color: G.text };
                if (v.blank) {
                  if (v.done) style = { background: G.tealBg, color: G.teal };
                  else if (v.now && !solved) style = { background: "#FFFFFF", border: "2px solid " + G.teal };
                  else style = { background: G.soft, border: "1.5px dashed #C9CFD3" };
                }
                return (
                  <span
                    key={i}
                    className="rounded-[10px] box-border flex items-center justify-center font-word font-semibold"
                    style={{ width: cellW, height: cellH, fontSize: cellFont, ...style }}
                  >
                    {v.ch}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 글자 알약 */}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {tray.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTile(t)}
                className="w-[52px] h-[52px] rounded-[14px] box-border flex items-center justify-center font-word text-[20px] font-semibold"
                style={
                  shakeId === t.id
                    ? { background: G.badBg, border: "1px solid " + G.badBd, color: G.text, transform: "translateX(2px)" }
                    : { background: "#FFFFFF", border: "1px solid " + G.line, boxShadow: TILE_SHADOW, color: G.text }
                }
              >
                {t.ch}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label={"맞힌 단어 · " + result.rows.length + "단어 중 · " + result.durationSec + "초"}
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

export default GameEja;
