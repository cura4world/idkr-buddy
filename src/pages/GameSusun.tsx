// src/pages/GameSusun.tsx
// 문장 조립 (Susun Kalimat) — 시안 GM-Susun. 흩어진 단어를 순서대로 탭해 예문을 완성합니다.
// 어휘가 아니라 어순 감각을 보는 게임이라, 한국어 해석을 힌트로 두고 인니어 어순을 맞춥니다.
// 재료는 단어장·시드의 예문(전부 로컬) — API 호출이 없습니다.
// 다섯 문장을 끝내야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 조각(머리·상태 줄·결과)은 GameKit 하나를 같이 씁니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { drawSentences, tokenizeSentence } from "@/lib/gamePool";
import type { PoolSentence } from "@/lib/gamePool";
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
  mmss,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const ROUND_SENTENCES = 5;    // 한 판에 조립할 문장 수
const MIN_SENTENCES = 3;      // 이보다 적으면 게임을 못 엽니다
const DONE_MS = 1700;         // 완성한 문장을 보여주는 시간
const SHAKE_MS = 300;         // 틀린 알약이 붉게 흔들리는 시간
const GOOD_MISS = 1;          // 미스가 이 이하면 "맞힌 것"으로 봅니다

type Phase = "loading" | "empty" | "ready" | "playing" | "done";

interface Tile {
  id: number;                 // 셔플 후 자리 (같은 단어가 둘이어도 구분됨)
  text: string;
}

interface RoundResult {
  durationSec: number;
  bestBefore: number;         // 이번 판 이전의 최고(최단) 기록. 없으면 0
  score: number;
  total: number;
  rows: ResultRow[];
  starWords: string[];
}

// 문장부호를 뗀 소문자 (표제어와 알약을 견주는 용도)
const bare = (x: string): string =>
  String(x || "").toLowerCase().replace(new RegExp("[^a-z\\-']", "g"), "");

function shuffleTiles(words: string[]): Tile[] {
  const tiles = words.map((text, id) => ({ id, text }));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = tiles[i];
    tiles[i] = tiles[j];
    tiles[j] = t;
  }
  return tiles;
}

const GameSusun = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);          // 몇 번째 문장인가
  const [answer, setAnswer] = useState<Tile[]>([]);   // 답 영역에 놓인 알약
  const [tray, setTray] = useState<Tile[]>([]);       // 아직 안 쓴 알약
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);        // 이 문장을 방금 완성했는가
  const [elapsed, setElapsed] = useState(0);          // 첫 탭부터 흐른 초
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const poolRef = useRef<PoolSentence[]>([]);
  const targetRef = useRef<string[]>([]);        // 지금 문장의 정답 토큰 순서
  const missesRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);              // 완성 문장을 보여주는 동안 입력 무시
  const nextTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  // 한 문장 차리기
  const setupSentence = useCallback((i: number) => {
    const item = poolRef.current[i];
    if (!item) return;
    const tokens = tokenizeSentence(item.sentence);
    targetRef.current = tokens;
    setIndex(i);
    setAnswer([]);
    setTray(shuffleTiles(tokens));
    setShakeId(null);
    setSolved(false);
    lockedRef.current = false;
  }, []);

  // 판 종료 — finishedRef 가드로 정확히 1회만 실행됩니다
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

    // 1) 노력 점수
    const got = await medaliEngine.addPoints("game", 3);

    // 2) 표제어별 기록 → 이번에 별이 된 단어
    const starWords: string[] = [];
    for (const it of rows) {
      const r = await medaliEngine.recordWordResult(it.word, it.correct, it.source);
      if (r.becameConfirmed) starWords.push(it.word);
    }

    // 3) 이전 최고 기록(이번 판 제외) → 저장
    let bestBefore = 0;
    try {
      const rounds = await listRounds("susun");
      for (const r of rounds) {
        if (r && r.durationSec > 0 && (bestBefore === 0 || r.durationSec < bestBefore)) {
          bestBefore = r.durationSec;
        }
      }
    } catch {
      bestBefore = 0;
    }

    const score = rows.filter((it) => it.correct).length;
    await medaliEngine.saveRound({
      game: "susun",
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
    setResult({ durationSec, bestBefore, score, total: rows.length, rows, starWords });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = 0;
    missesRef.current = poolRef.current.map(() => 0);
    setElapsed(0);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setupSentence(0);
    setPhase("playing");
  }, [setupSentence]);

  // 재료 준비. auto=true면 (한 판 더) 준비되는 대로 바로 시작합니다.
  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      drawSentences(ROUND_SENTENCES)
        .then((list) => {
          if (!aliveRef.current) return;
          if (list.length < MIN_SENTENCES) {
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

  // 흐른 시간 표시 (첫 탭부터)
  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      if (startedAtRef.current > 0 && !finishedRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [phase]);

  // 화면을 벗어날 때 남은 타이머 정리 (setState 없이 정리만)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (nextTimerRef.current) window.clearTimeout(nextTimerRef.current);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
    };
  }, []);

  const handleTile = (t: Tile) => {
    if (phase !== "playing" || lockedRef.current) return;
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();

    const want = targetRef.current[answer.length];
    // 같은 단어가 두 번 나오는 문장에서는 어느 쪽을 탭해도 인정합니다 (문자열로 비교)
    if (t.text !== want) {
      missesRef.current[index] = (missesRef.current[index] || 0) + 1;
      setShakeId(t.id);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = window.setTimeout(() => {
        if (aliveRef.current) setShakeId(null);
      }, SHAKE_MS);
      return;
    }

    const nextAnswer = answer.concat([t]);
    setAnswer(nextAnswer);
    setTray(tray.filter((x) => x.id !== t.id));

    if (nextAnswer.length < targetRef.current.length) return;

    // 문장 완성 — 잠깐 보여주고 다음 문장으로
    lockedRef.current = true;
    setSolved(true);
    nextTimerRef.current = window.setTimeout(() => {
      if (!aliveRef.current) return;
      const next = index + 1;
      if (next >= poolRef.current.length) {
        const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        finishRound(sec);
        return;
      }
      setupSentence(next);
    }, DONE_MS);
  };

  const current = poolRef.current[index];

  return (
    <GameScreen id="susun">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="예문이 있는 단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady
          id="susun"
          lines={["흩어진 단어를 순서대로 눌러 문장을 완성하세요", poolRef.current.length + "문장 · 빠를수록 좋은 기록"]}
          onStart={beginPlay}
        />
      ) : null}

      {phase === "playing" && current ? (
        <>
          <StatusRow
            left={<Dots n={poolRef.current.length} cur={index} />}
            right={<Stat icon="clock" label="시간" value={mmss(elapsed)} />}
          />

          <div
            className="mt-2 rounded-[20px] bg-white px-[18px] pt-[18px] pb-4"
            style={{
              boxShadow: solved ? "0 0 0 1.5px " + G.tealBd + ", " + CARD_SHADOW : CARD_SHADOW,
              transition: "box-shadow 150ms ease",
            }}
          >
            <p className="font-gothic text-[11px] font-semibold" style={{ color: G.mute }}>
              이 뜻이 되도록 단어 놓기
            </p>
            {/* 힌트 = 해석. 이걸 보고 어순을 만드는 게 이 게임입니다. */}
            <p className="mt-2 text-[15px] leading-[1.6] break-keep" style={{ color: G.text }}>
              {current.sentenceKo || current.meaning}
            </p>

            {/* 조립 중인 답 */}
            <div
              className="mt-4 min-h-[100px] pt-3.5 flex flex-wrap content-start gap-2"
              style={{ borderTop: "1px solid " + G.rowLine }}
            >
              {answer.map((t) => (
                <span
                  key={t.id}
                  className="h-10 px-3.5 rounded-xl flex items-center font-word text-[16.5px]"
                  style={{
                    background: G.tealBg,
                    // 완성된 문장에서 표제어만 색으로 짚어 줍니다
                    color: solved && bare(t.text) === bare(current.word) ? G.teal : G.text,
                    fontWeight: solved && bare(t.text) === bare(current.word) ? 600 : 400,
                  }}
                >
                  {t.text}
                </span>
              ))}
              {!solved ? (
                <span className="w-0.5 h-[26px] mt-[7px] ml-0.5 rounded-[1px] kata-caret" style={{ background: G.teal }} />
              ) : null}
            </div>
          </div>

          {/* 흩어진 알약 */}
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {tray.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTile(t)}
                className="h-11 px-4 rounded-xl box-border flex items-center font-word text-[16.5px]"
                style={
                  shakeId === t.id
                    ? { background: G.badBg, border: "1px solid " + G.badBd, color: G.text, transform: "translateX(2px)" }
                    : { background: "#FFFFFF", border: "1px solid " + G.line, boxShadow: TILE_SHADOW, color: G.text }
                }
              >
                {t.text}
              </button>
            ))}
          </div>
          <style>{"@keyframes kata-blink{0%,49%{opacity:1}50%,100%{opacity:0}}.kata-caret{animation:kata-blink 1s step-end infinite}"}</style>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label={"걸린 시간 · " + result.total + "문장 중 " + result.score + "문장"}
          value={result.durationSec + "초"}
          best={result.bestBefore === 0 || result.durationSec < result.bestBefore}
          bestText={result.bestBefore > 0 ? "가장 빠른 기록 " + result.bestBefore + "초" : undefined}
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

export default GameSusun;
