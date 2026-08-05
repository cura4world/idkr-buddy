// src/pages/GameSusun.tsx
// 문장 조립 (Susun Kalimat). 흩어진 단어를 순서대로 탭해 예문을 완성합니다.
// 어휘가 아니라 어순 감각을 보는 게임이라, 한국어 해석을 힌트로 두고 인니어 어순을 맞춥니다.
// 재료는 단어장·시드의 예문(전부 로컬) — API 호출이 없습니다.
// 다섯 문장을 끝내야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 구성·종료 연출은 스피드 O/X(GameOX.tsx)와 같은 모양으로 맞췄습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { drawSentences, tokenizeSentence } from "@/lib/gamePool";
import type { PoolSentence } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey, MEDALI_COLORS } from "@/lib/medali";

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

interface SentenceResult {
  word: string;
  meaning: string;
  sentenceKo: string;
  source: PoolSentence["source"];
  misses: number;
  correct: boolean;
  becameConfirmed: boolean;
}

interface RoundResult {
  durationSec: number;
  bestBefore: number;         // 이번 판 이전의 최고(최단) 기록. 없으면 0
  items: SentenceResult[];
}

const SOURCE_LABEL: Record<PoolSentence["source"], string> = {
  wordbook: "단어장",
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
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);          // 몇 번째 문장인가
  const [answer, setAnswer] = useState<Tile[]>([]);   // 답 영역에 놓인 알약
  const [tray, setTray] = useState<Tile[]>([]);       // 아직 안 쓴 알약
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);        // 이 문장을 방금 완성했는가
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
    const items: SentenceResult[] = poolRef.current.map((p, i) => ({
      word: p.word,
      meaning: p.meaning,
      sentenceKo: p.sentenceKo,
      source: p.source,
      misses: misses[i] || 0,
      correct: (misses[i] || 0) <= GOOD_MISS,
      becameConfirmed: false,
    }));

    // 1) 노력 점수
    const got = await medaliEngine.addPoints("game", 3);
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => setFloatOn(false), 1200);
    }

    // 2) 표제어별 기록 → 이번에 별이 된 단어
    for (const it of items) {
      const r = await medaliEngine.recordWordResult(it.word, it.correct, it.source);
      it.becameConfirmed = r.becameConfirmed;
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

    await medaliEngine.saveRound({
      game: "susun",
      date: dateKey(new Date()),
      durationSec,
      score: items.filter((it) => it.correct).length,
      words: items.map((it) => ({ word: it.word, correct: it.correct, source: it.source })),
    });

    setResult({ durationSec, bestBefore, items });
    setPhase("done");
  }, []);

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = 0;
    missesRef.current = poolRef.current.map(() => 0);
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
    return () => {
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
      shakeTimerRef.current = window.setTimeout(() => setShakeId(null), SHAKE_MS);
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
          SUSUN KALIMAT
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
            <p className="text-[0.9375rem] text-foreground">예문이 있는 단어가 아직 부족해요</p>
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
            <p className="text-[0.9375rem] leading-relaxed text-foreground">
              흩어진 단어를 순서대로 탭해
              <br />
              문장을 완성하세요
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {poolRef.current.length}문장!
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

        {phase === "playing" && current ? (
          <div className="pt-3">
            <p className="font-gothic text-[0.75rem] text-muted-foreground">
              {index + 1} / {poolRef.current.length}
            </p>

            {/* 힌트 = 해석. 이걸 보고 어순을 만드는 게 이 게임입니다. */}
            <p className="mt-3 font-gothic text-[0.8125rem] leading-relaxed text-muted-foreground">
              {current.sentenceKo || current.meaning}
            </p>

            {/* 조립 중인 답 */}
            <div
              className={
                "mt-2 min-h-[92px] rounded-2xl border px-3 py-3 flex flex-wrap content-start gap-1.5 transition-colors " +
                (solved ? "border-primary bg-primary/5" : "border-border bg-card")
              }
            >
              {answer.map((t) => (
                <span
                  key={t.id}
                  className={
                    "rounded-full px-2.5 py-1 font-word text-[1.0625rem] bg-primary/15 " +
                    // 완성된 문장에서 표제어만 색으로 짚어 줍니다
                    (solved && bare(t.text) === bare(current.word) ? "text-primary" : "text-foreground")
                  }
                >
                  {t.text}
                </span>
              ))}
            </div>

            {/* 흩어진 알약 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {tray.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTile(t)}
                  className={
                    "rounded-full border px-3 py-2 font-word text-[1.0625rem] transition-colors " +
                    (shakeId === t.id
                      ? "border-destructive bg-destructive/10 text-foreground"
                      : "border-border bg-card text-foreground active:bg-muted/60")
                  }
                  style={shakeId === t.id ? { transform: "translateX(2px)" } : undefined}
                >
                  {t.text}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center">
              <p className="relative inline-block font-word text-[1.375rem] font-medium leading-snug text-foreground">
                <span className="tabular-nums text-primary">{result.items.length}</span>문장 중{" "}
                <span className="tabular-nums text-primary">
                  {result.items.filter((it) => it.correct).length}
                </span>
                문장
                {floatOn ? <FloatPoint text={"+" + gained} /> : null}
              </p>
              <p className="mt-2 font-gothic text-[0.8125rem] text-muted-foreground">
                {result.durationSec}초
                {result.bestBefore === 0 || result.durationSec < result.bestBefore
                  ? " · 최고 기록!"
                  : " · 최고 " + result.bestBefore + "초"}
              </p>
            </div>

            {result.items.some((it) => it.becameConfirmed) ? (
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
                  {result.items
                    .filter((it) => it.becameConfirmed)
                    .map((it) => it.word)
                    .join(", ")}
                </p>
              </div>
            ) : null}

            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
              {result.items.map((it, i) => (
                <div
                  key={it.word + i}
                  className={
                    "flex items-center gap-3 px-4 py-3 " +
                    (i === result.items.length - 1 ? "" : "border-b border-border") +
                    (it.correct ? "" : " opacity-50")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-word text-[0.9375rem] leading-tight text-foreground truncate">
                      {it.word}
                    </p>
                    <p className="mt-0.5 text-[0.78125rem] text-muted-foreground truncate">
                      {it.sentenceKo || it.meaning}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-gothic text-[0.6875rem] text-muted-foreground">
                    {SOURCE_LABEL[it.source]}
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
                onClick={() => loadPool(true)}
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

export default GameSusun;
