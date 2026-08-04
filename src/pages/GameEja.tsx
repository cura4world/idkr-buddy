// src/pages/GameEja.tsx
// 철자 채우기 (Eja). 뜻을 보고 빈칸에 글자를 채웁니다 — 철자와 발음을 잡는 게임입니다.
// 재료는 전부 로컬(gamePool) — API 호출이 없습니다.
// 여섯 단어를 끝내야 점수·단어 기록이 남습니다. 중간에 나가면 아무것도 남지 않습니다.
// 화면 구성·종료 연출은 문장 조립(GameSusun.tsx)과 같은 모양으로 맞췄습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, Volume2 } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { drawPool } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { medaliEngine, listRounds, dateKey, MEDALI_COLORS } from "@/lib/medali";

const ROUND_WORDS = 6;        // 한 판에 채울 단어 수
const MIN_WORDS = 4;          // 이보다 적으면 게임을 못 엽니다
const MIN_LETTERS = 4;        // 너무 짧으면 채울 게 없고
const MAX_LETTERS = 14;       // 너무 길면 폰 화면에 안 맞습니다
const BLANK_RATIO = 0.35;
const MIN_BLANKS = 1;
const MAX_BLANKS = 4;
const WRONG_TILES = 3;        // 정답에 없는 훼방 글자
const DONE_MS = 600;          // 완성한 단어를 보여주는 시간
const SHAKE_MS = 300;
const GOOD_MISS = 1;          // 미스가 이 이하면 "맞힌 것"으로 봅니다

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
  bestBefore: number;         // 이번 판 이전의 최고 점수. 없으면 0
  items: WordResult[];
}

const SOURCE_LABEL: Record<PoolWord["source"], string> = {
  wordbook: "단어장",
  lookup: "찾아본",
  seed: "기본",
};

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

/* 폰 네이티브 TTS 우선, 없으면 브라우저 음성 합성으로 폴백 (PhraseDetail과 같은 방식) */
const speak = (text: string) => {
  const w = window as any;
  if (w.AndroidTTS) {
    try {
      w.AndroidTTS.speak(text, "id-ID");
      return;
    } catch (e) { /* 폴백으로 넘어갑니다 */ }
  }
  try {
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 0.95;
    window.speechSynthesis?.speak?.(u);
  } catch (e) { /* 지원하지 않는 기기는 조용히 넘어갑니다 */ }
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

const GameEja = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [tray, setTray] = useState<Tile[]>([]);
  const [filled, setFilled] = useState<string[]>([]);   // 왼쪽 빈칸부터 채운 글자
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
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
    const items: WordResult[] = poolRef.current.map((p, i) => ({
      word: p.word,
      meaning: p.meaning,
      source: p.source,
      misses: misses[i] || 0,
      correct: (misses[i] || 0) <= GOOD_MISS,
      becameConfirmed: false,
    }));

    const got = await medaliEngine.addPoints("game", 3);
    if (got > 0) {
      setGained(got);
      setFloatOn(true);
      floatTimerRef.current = window.setTimeout(() => setFloatOn(false), 1200);
    }

    for (const it of items) {
      const r = await medaliEngine.recordWordResult(it.word, it.correct, it.source);
      it.becameConfirmed = r.becameConfirmed;
    }

    const score = items.filter((it) => it.correct).length;

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
      try { window.speechSynthesis?.cancel?.(); } catch (e) {}
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
      shakeTimerRef.current = window.setTimeout(() => setShakeId(null), SHAKE_MS);
      return;
    }

    const next = filled.concat([t.ch]);
    setFilled(next);
    setTray(tray.filter((x) => x.id !== t.id));

    if (next.length < blanksRef.current.length) return;

    // 단어 완성 — 발음을 한 번 들려주고 다음으로
    lockedRef.current = true;
    setSolved(true);
    const item = poolRef.current[index];
    if (item) speak(item.word);
    nextTimerRef.current = window.setTimeout(() => {
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
    if (!s.blank) return { ch: s.ch, blank: false, done: true, letter: s.letter };
    const got = filled[blankSeen];
    blankSeen++;
    return { ch: got || "", blank: true, done: !!got, letter: true };
  });

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
          EJA
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
            <p className="text-[0.9375rem] text-foreground">뜻을 보고 빈칸에 글자를 채워요</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
              소리 버튼으로 발음을 들어도 괜찮아요
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

            {/* 문제 = 뜻 */}
            <div className="mt-3 flex items-start gap-2">
              <p className="flex-1 min-w-0 font-gothic text-[1.0625rem] leading-snug text-foreground break-words">
                {current.meaning}
              </p>
              <button
                type="button"
                onClick={() => speak(current.word)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground active:bg-muted/60"
                title="발음 듣기"
              >
                <Volume2 size={17} />
              </button>
            </div>

            {/* 글자 칸 */}
            <div
              className={
                "mt-5 min-h-[76px] rounded-2xl border px-3 py-4 flex flex-wrap items-center justify-center gap-1 transition-colors " +
                (solved ? "border-primary bg-primary/5" : "border-border bg-card")
              }
            >
              {view.map((v, i) =>
                v.letter ? (
                  <span
                    key={i}
                    className={
                      "w-7 h-9 flex items-center justify-center rounded-md font-word text-[1.125rem] " +
                      (v.blank
                        ? v.done
                          ? "bg-primary/15 text-primary"
                          : "border-b-2 border-primary/60 text-transparent"
                        : "text-foreground")
                    }
                  >
                    {v.ch || "·"}
                  </span>
                ) : (
                  <span key={i} className="w-2" aria-hidden="true" />
                )
              )}
            </div>

            {/* 글자 알약 */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {tray.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTile(t)}
                  className={
                    "w-11 h-11 rounded-xl border font-word text-[1.0625rem] transition-colors " +
                    (shakeId === t.id
                      ? "border-destructive bg-destructive/10 text-foreground"
                      : "border-border bg-card text-foreground active:bg-muted/60")
                  }
                  style={shakeId === t.id ? { transform: "translateX(2px)" } : undefined}
                >
                  {t.ch}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center">
              <p className="relative inline-block font-word text-[2rem] leading-none tabular-nums text-foreground">
                {result.items.length}단어 중 {result.items.filter((it) => it.correct).length}단어
                {floatOn ? <FloatPoint text={"+" + gained} /> : null}
              </p>
              <p className="mt-2 font-gothic text-[0.78125rem] text-muted-foreground">
                {result.durationSec}초
                {result.bestBefore === 0 ||
                result.items.filter((it) => it.correct).length > result.bestBefore
                  ? " · 최고 기록!"
                  : " · 최고 " + result.bestBefore + "단어"}
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
                      {it.meaning}
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

export default GameEja;
