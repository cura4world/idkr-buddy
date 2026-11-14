// src/pages/GameDengar.tsx
// 듣고 고르기 (Dengar) — 시안 GM-Dengar. 단어장 퀴즈 대신 들어온 게임입니다.
// 발음만 듣고, 철자·소리가 비슷한 네 단어 중 들은 단어를 고릅니다(lapar · lebar · lamar · lapang).
// 고르면 정답 단어 옆에 뜻이 나옵니다. 한 판 10문제.
// 소리는 공용 음성 캐시(tts.ts getSayAudioUrl — 단어 발음 버튼과 같은 저장소)를 씁니다.
//   - 오프라인이면 이미 들어 본(기기에 저장된) 단어 위주로 냅니다.
//   - 소리를 못 불러오면 뜻을 글자로 보여 주고, 뜻을 보고 고르게 합니다(게임이 멈추지 않게).
// 재료는 전부 로컬(gamePool) — 텍스트 API 호출이 없습니다. 10문제를 끝내야 점수·단어 기록이 남습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { collectCandidates, drawPool, fitsListening, similarWords } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";
import { getSayAudioUrl } from "@/lib/tts";
import { isStoreApp } from "@/lib/platform";
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
  Dots,
  IconCheck,
  IconSpeaker,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import type { ResultRow } from "@/components/game/GameKit";

const ROUND_Q = 10;
const MIN_Q = 4;
const CHOICES = 4;
const NEXT_MS = 1300;           // 고른 뒤 다음 문제로 넘어가기까지
const AUDIO_WAIT_MS = 12000;    // 소리를 이만큼 기다려도 안 오면 글자로 대신합니다
const SLOW_RATE = 0.7;

type Phase = "loading" | "empty" | "ready" | "playing" | "done";
type Sound = "loading" | "ready" | "failed";

interface Question {
  answer: PoolWord;
  choices: PoolWord[];
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

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise<T>((resolve) => {
    const t = window.setTimeout(() => resolve(fallback), ms);
    p.then((v) => {
      window.clearTimeout(t);
      resolve(v);
    }).catch(() => {
      window.clearTimeout(t);
      resolve(fallback);
    });
  });

const isOffline = (): boolean => {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch (e) {
    return false;
  }
};

// 관리자판·회원판은 Gemini 음성이 없어도 폰 음성으로 들려줄 수 있습니다(스토어 앱에는 폰 음성이 없음).
const nativeVoice = (): boolean => {
  if (isStoreApp()) return false;
  try {
    const w = window as unknown as { AndroidTTS?: unknown };
    return !!w.AndroidTTS || typeof window.speechSynthesis !== "undefined";
  } catch (e) {
    return false;
  }
};

const GameDengar = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [sound, setSound] = useState<Sound>("loading");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const questionsRef = useRef<Question[]>([]);
  const answersRef = useRef<{ p: PoolWord; correct: boolean }[]>([]);
  const urlsRef = useRef(new Map<string, string | null>());   // 단어 → 소리 주소 (null = 실패)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const lockedRef = useRef(false);
  const aliveRef = useRef(true);
  const timersRef = useRef<number[]>([]);
  const qIndexRef = useRef(0);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== id);
      if (aliveRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  };

  const stopAudio = () => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch (e) { /* 무시 */ }
    }
    audioRef.current = null;
  };

  const ensureUrl = useCallback(async (word: string): Promise<string | null> => {
    const m = urlsRef.current;
    if (m.has(word)) return m.get(word) || null;
    const url = await withTimeout(getSayAudioUrl(word, { cacheOnly: isOffline() }), AUDIO_WAIT_MS, null);
    m.set(word, url);
    return url;
  }, []);

  // 소리 내기. 저장된(또는 새로 만든) 음성이 있으면 그것을, 없으면 폰 음성(관리자판)을 씁니다.
  const play = useCallback(
    async (word: string, slow: boolean) => {
      stopAudio();
      const url = await ensureUrl(word);
      if (!aliveRef.current) return;
      if (url) {
        try {
          const a = new Audio(url);
          a.playbackRate = slow ? SLOW_RATE : 1;
          audioRef.current = a;
          await a.play();
          return;
        } catch (e) {
          // 재생 실패 → 아래 폴백
        }
      }
      // 스토어 앱의 AndroidTTS 는 같은 Gemini 음성이라 다시 시도해도 같은 결과입니다 → 글자로 대신
      if (!isStoreApp()) speakWord(word, slow ? 0.6 : 0.95);
    },
    [ensureUrl]
  );

  const prepare = useCallback(
    async (i: number, autoPlay: boolean) => {
      const q = questionsRef.current[i];
      if (!q) return;
      setSound("loading");
      const url = await ensureUrl(q.answer.word);
      if (!aliveRef.current || qIndexRef.current !== i) return;
      const ok = !!url || nativeVoice();
      setSound(ok ? "ready" : "failed");
      if (autoPlay && ok) play(q.answer.word, false);
      // 다음 문제 소리를 미리 받아 둡니다
      const n = questionsRef.current[i + 1];
      if (n) ensureUrl(n.answer.word).catch(() => {});
    },
    [ensureUrl, play]
  );

  const finishRound = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopAudio();

    const rows: ResultRow[] = answersRef.current.map((a) => ({
      word: a.p.word,
      meaning: a.p.meaning,
      source: a.p.source,
      correct: a.correct,
    }));
    const starWords: string[] = [];
    const got = await medaliEngine.addPoints("game", 3);
    for (const r of rows) {
      const res = await medaliEngine.recordWordResult(r.word, r.correct, r.source, 1);
      if (res.becameConfirmed) starWords.push(r.word);
    }
    let bestBefore = 0;
    try {
      for (const r of await listRounds("dengar")) if (r && r.score > bestBefore) bestBefore = r.score;
    } catch {
      bestBefore = 0;
    }
    await medaliEngine.saveRound({
      game: "dengar",
      date: dateKey(new Date()),
      durationSec: 0,
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

  const goTo = useCallback(
    (i: number) => {
      qIndexRef.current = i;
      lockedRef.current = false;
      setQIndex(i);
      setPicked(null);
      prepare(i, true);
    },
    [prepare]
  );

  const beginPlay = useCallback(() => {
    finishedRef.current = false;
    answersRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setResult(null);
    setGained(0);
    setFloatOn(false);
    setPhase("playing");
    goTo(0);
  }, [goTo]);

  const loadPool = useCallback(
    (auto: boolean) => {
      setPhase("loading");
      (async () => {
        const all = await collectCandidates();
        let answers = (await drawPool(14, 6)).filter((p) => fitsListening(p.word.trim().toLowerCase()));
        // 오프라인이면 기기에 소리가 저장된 단어를 앞으로
        if (isOffline()) {
          const have: PoolWord[] = [];
          const rest: PoolWord[] = [];
          for (const p of answers) {
            const u = await getSayAudioUrl(p.word, { cacheOnly: true });
            urlsRef.current.set(p.word, u);
            if (u) have.push(p);
            else rest.push(p);
          }
          answers = have.concat(rest);
        }
        const qs: Question[] = [];
        for (const a of answers) {
          if (qs.length >= ROUND_Q) break;
          const others = similarWords(a, all, CHOICES - 1);
          if (others.length < CHOICES - 1) continue;
          qs.push({ answer: a, choices: shuffle([a].concat(others)) });
        }
        return qs;
      })()
        .then((qs) => {
          if (!aliveRef.current) return;
          if (qs.length < MIN_Q) {
            questionsRef.current = [];
            setPhase("empty");
            return;
          }
          questionsRef.current = qs;
          if (auto) beginPlay();
          else setPhase("ready");
        })
        .catch(() => {
          if (!aliveRef.current) return;
          questionsRef.current = [];
          setPhase("empty");
        });
    },
    [beginPlay]
  );

  useEffect(() => {
    loadPool(false);
  }, [loadPool]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      stopAudio();
      stopSpeak();
    };
  }, []);

  const choose = (c: PoolWord) => {
    if (phase !== "playing" || lockedRef.current) return;
    const q = questionsRef.current[qIndex];
    if (!q) return;
    lockedRef.current = true;
    const ok = c.word === q.answer.word;
    setPicked(c.word);
    answersRef.current.push({ p: q.answer, correct: ok });
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    later(() => {
      const n = qIndexRef.current + 1;
      if (n >= questionsRef.current.length) {
        finishRound();
        return;
      }
      goTo(n);
    }, ok ? NEXT_MS : NEXT_MS + 500);
  };

  const q = questionsRef.current[qIndex];

  const choiceStyle = (c: PoolWord): React.CSSProperties => {
    if (!picked || !q) {
      return { background: "#FFFFFF", border: "1.5px solid " + G.tile };
    }
    if (c.word === q.answer.word) return { background: G.okBg, border: "1.5px solid " + G.okBd };
    if (c.word === picked) return { background: G.badBg, border: "1.5px solid " + G.badBd };
    return { background: "#FFFFFF", border: "1.5px solid " + G.tile, opacity: 0.5 };
  };

  return (
    <GameScreen id="dengar">
      {phase === "loading" ? <GameLoading /> : null}
      {phase === "empty" ? <GameEmpty text="단어가 아직 부족합니다" /> : null}
      {phase === "ready" ? (
        <GameReady
          id="dengar"
          lines={["발음을 듣고 들은 단어를 고르세요", "비슷한 단어 네 개 중 하나 · 10문제"]}
          onStart={beginPlay}
        />
      ) : null}

      {phase === "playing" && q ? (
        <>
          <StatusRow
            left={<Dots n={questionsRef.current.length} cur={qIndex} />}
            right={<Stat icon="check" label="맞힌 수" value={score} />}
          />
          <div
            className="mt-2 rounded-[20px] bg-white px-[18px] pt-[26px] pb-5 flex flex-col items-center"
            style={{ boxShadow: CARD_SHADOW }}
          >
            {sound === "failed" ? (
              <>
                <p className="font-gothic text-[11px] font-semibold" style={{ color: G.mute }}>
                  소리를 불러오지 못했습니다 · 뜻을 보고 고르세요
                </p>
                <p className="mt-2.5 font-gothic text-[20px] font-semibold text-center break-keep" style={{ color: G.text }}>
                  {q.answer.meaning}
                </p>
                <button
                  type="button"
                  onClick={() => prepare(qIndex, true)}
                  className="mt-3 h-[30px] px-3 rounded-[15px] font-gothic text-[11px] font-semibold"
                  style={{ background: G.soft, color: G.sub }}
                >
                  소리 다시 불러오기
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="다시 듣기"
                  onClick={() => play(q.answer.word, false)}
                  className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white active:opacity-90"
                  style={{ background: G.teal, boxShadow: "0 0 0 8px " + G.tealBg, opacity: sound === "loading" ? 0.6 : 1 }}
                >
                  <IconSpeaker size={30} />
                </button>
                <p className="mt-[22px] font-gothic text-[12px]" style={{ color: G.sub }}>
                  {sound === "loading" ? "소리를 불러오는 중..." : "눌러서 다시 듣기"}
                </p>
                <button
                  type="button"
                  onClick={() => play(q.answer.word, true)}
                  className="mt-2.5 h-[30px] px-3 rounded-[15px] font-gothic text-[11px] font-semibold active:opacity-70"
                  style={{ background: G.soft, color: G.sub }}
                >
                  천천히 듣기
                </button>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {q.choices.map((c) => {
              const isAnswer = !!picked && c.word === q.answer.word;
              return (
                <button
                  key={c.word}
                  type="button"
                  onClick={() => choose(c)}
                  className="h-[60px] rounded-2xl box-border pl-[18px] pr-4 flex items-center gap-2.5 text-left"
                  style={{ ...choiceStyle(c), transition: "opacity 150ms ease, background-color 150ms ease" }}
                >
                  <span className="font-word text-[17.5px] font-semibold shrink-0" style={{ color: G.deep }}>
                    {c.word}
                  </span>
                  {isAnswer ? (
                    <>
                      <span className="flex-1 min-w-0 truncate font-gothic text-[12.5px]" style={{ color: G.sub }}>
                        {c.meaning}
                      </span>
                      <span style={{ color: G.ok }}>
                        <IconCheck size={20} sw={2.4} />
                      </span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {phase === "done" && result ? (
        <GameResult
          label={"맞힌 수 · " + result.rows.length + "문제 중"}
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

export default GameDengar;
