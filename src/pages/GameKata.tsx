// src/pages/GameKata.tsx
// 오늘의 단어 퍼즐 (Kata Hari Ini) — 시안 GM-Kata. 무료 사용자에게도 열려 있습니다.
// 다섯 글자 인도네시아어 단어를 여섯 번 안에 맞힙니다. 하루 한 문제(한국 시간 자정에 바뀜),
// 모든 사람이 같은 날 같은 단어를 받습니다. 출제·채점·기록은 src/lib/kataHariIni.ts.
// 칸 색: 초록 = 자리까지 맞음, 노랑 = 단어 안에 있지만 자리가 다름, 회색 = 없음.
// 입력은 실제 단어만 받습니다(정답 목록 + 추가 단어 목록, kataHariIni.isKnownWord). 목록에 없는 말은
// 시도 횟수를 쓰지 않고 줄을 흔든 뒤 격자 아래에 "단어 목록에 없는 단어입니다" 를 잠깐 띄웁니다.
// API 호출이 없습니다. 끝나면 훈장 기록을 한 번만 남깁니다.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_TRIES,
  WORD_LEN,
  answerForDay,
  dayKeyOf,
  dayLabel,
  getDayRecord,
  isKnownWord,
  isValidGuess,
  keyMarks,
  kstDayNumber,
  saveDayRecord,
  scoreGuess,
  currentStreak,
} from "@/lib/kataHariIni";
import type { DayRecord, PuzzleWord, TileMark } from "@/lib/kataHariIni";
import { medaliEngine, dateKey } from "@/lib/medali";
import {
  G,
  CARD_SHADOW,
  GameScreen,
  GameEmpty,
  FloatPoint,
  IconBackspace,
  IconSpeaker,
  SecondaryButton,
  speakWord,
  stopSpeak,
} from "@/components/game/GameKit";
import { useNavigate, useLocation } from "react-router-dom";
import { goBackOr } from "@/lib/nav";

const MARK_BG: Record<TileMark, string> = {
  hit: "#5E9C6E",
  near: "#D9B44A",
  miss: "#AEB6BB",
};

const ORDINAL = ["첫", "두", "세", "네", "다섯", "여섯"];

const KEY_ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["ENTER", "z", "x", "c", "v", "b", "n", "m", "BACK"],
];

const SHAKE_MS = 380;
const NOTICE_MS = 1600;

const GameKata = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 화면을 연 날을 기준으로 합니다 (자정을 넘겨 풀고 있어도 문제가 바뀌지 않게)
  const [dayNum] = useState(() => kstDayNumber(Date.now()));
  const [answer] = useState<PuzzleWord | null>(() => answerForDay(dayNum));
  const dayKey = dayKeyOf(dayNum);

  const [rec, setRec] = useState<DayRecord>(() => getDayRecord(dayKey));
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState("");       // 격자 아래 짧은 알림 (잘못 낸 줄)
  const [freshRow, setFreshRow] = useState(-1);   // 방금 낸 줄 (색이 차례로 칠해지는 연출)
  const [streak, setStreak] = useState(() => currentStreak());
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);

  const recRef = useRef(rec);
  recRef.current = rec;
  const typedRef = useRef(typed);
  typedRef.current = typed;
  const aliveRef = useRef(true);
  const shakeTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const floatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (floatTimerRef.current) window.clearTimeout(floatTimerRef.current);
      stopSpeak();
    };
  }, []);

  // 끝난 판의 훈장 기록 (하루 한 번)
  const recordOnce = useCallback(
    async (r: DayRecord) => {
      if (!answer || r.recorded) return;
      const marked: DayRecord = { ...r, recorded: true };
      saveDayRecord(dayKey, marked);
      if (aliveRef.current) setRec(marked);
      const got = await medaliEngine.addPoints("game", 3);
      await medaliEngine.recordWordResult(answer.word, r.won, "seed", 1);
      await medaliEngine.saveRound({
        game: "kata",
        date: dateKey(new Date()),
        durationSec: 0,
        score: r.won ? r.guesses.length : 0,
        words: [{ word: answer.word, correct: r.won, source: "seed" }],
      });
      if (!aliveRef.current) return;
      if (got > 0) {
        setGained(got);
        setFloatOn(true);
        floatTimerRef.current = window.setTimeout(() => {
          if (aliveRef.current) setFloatOn(false);
        }, 1400);
      }
    },
    [answer, dayKey]
  );

  // 다 풀었는데 기록을 못 남긴 채 닫혔던 경우(앱 종료 등) 이어서 남깁니다
  useEffect(() => {
    if (rec.done && !rec.recorded) recordOnce(rec);
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = (msg?: string) => {
    setShake(true);
    if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = window.setTimeout(() => {
      if (aliveRef.current) setShake(false);
    }, SHAKE_MS);
    if (!msg) return;
    setNotice(msg);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      if (aliveRef.current) setNotice("");
    }, NOTICE_MS);
  };

  const submit = useCallback(() => {
    const r = recRef.current;
    if (!answer || r.done) return;
    const g = typedRef.current;
    if (g.length < WORD_LEN) {
      bump("다섯 글자를 모두 채워 주세요");
      return;
    }
    if (!isValidGuess(g)) {
      bump();
      return;
    }
    // 목록에 없는 말은 시도 횟수를 쓰지 않습니다 (친 글자는 그대로 두어 고쳐 칠 수 있게)
    if (!isKnownWord(g)) {
      bump("단어 목록에 없는 단어입니다");
      return;
    }
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice("");
    const guesses = r.guesses.concat([g]);
    const won = g === answer.word;
    const done = won || guesses.length >= MAX_TRIES;
    const next: DayRecord = { ...r, guesses, won, done };
    saveDayRecord(dayKey, next);
    setRec(next);
    setTyped("");
    setFreshRow(guesses.length - 1);
    if (done) {
      setStreak(currentStreak());
      speakWord(answer.word);
      recordOnce(next);
    }
    // 판단이 바뀌지 않는 값만 의존합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, dayKey, recordOnce]);

  const press = useCallback(
    (k: string) => {
      if (recRef.current.done) return;
      if (k === "ENTER") {
        submit();
        return;
      }
      if (k === "BACK") {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      const c = k.toLowerCase();
      if (c.length !== 1 || c < "a" || c > "z") return;
      setTyped((t) => (t.length >= WORD_LEN ? t : t + c));
    },
    [submit]
  );

  // 실제 자판도 받습니다 (태블릿 키보드·PC 확인용)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (e.key.length === 1) press(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const showHint = () => {
    if (rec.hint) return;
    const next: DayRecord = { ...rec, hint: true };
    saveDayRecord(dayKey, next);
    setRec(next);
  };

  if (!answer) {
    return (
      <GameScreen id="kata">
        <GameEmpty text="오늘의 퍼즐을 준비하지 못했습니다" sub="앱을 다시 열어 보세요" />
      </GameScreen>
    );
  }

  const marks = keyMarks(rec.guesses, answer.word);
  const statusText = rec.done
    ? rec.won
      ? dayLabel(dayNum) + " · " + rec.guesses.length + "번 만에 맞힘"
      : dayLabel(dayNum) + " · 오늘의 퍼즐 끝"
    : dayLabel(dayNum) + " · " + ORDINAL[Math.min(rec.guesses.length, MAX_TRIES - 1)] + " 번째 시도";

  const rows: number[] = [];
  for (let i = 0; i < MAX_TRIES; i++) rows.push(i);
  const cols: number[] = [];
  for (let i = 0; i < WORD_LEN; i++) cols.push(i);

  return (
    <GameScreen id="kata">
      <div className="h-10 shrink-0 flex items-center justify-between gap-3">
        <span className="font-gothic text-[12px] truncate" style={{ color: G.sub }}>
          {statusText}
        </span>
        {!rec.done || rec.hint ? (
          <button
            type="button"
            onClick={showHint}
            className="h-[30px] max-w-[60%] px-3 rounded-[15px] font-gothic text-[12px] font-bold truncate shrink-0"
            style={{ background: G.goldBg, color: G.goldText }}
          >
            {rec.hint ? "뜻 · " + answer.meaning : "뜻 힌트"}
          </button>
        ) : null}
      </div>

      {/* 6 × 5 칸 — 알림은 격자 바로 아래에 겹쳐 띄워 자판 위치가 움직이지 않게 합니다 */}
      <div className="relative mt-2.5 flex flex-col gap-1.5 items-center">
        {rows.map((r) => {
          const submitted = r < rec.guesses.length;
          const isCurrent = !rec.done && r === rec.guesses.length;
          const word = submitted ? rec.guesses[r] : isCurrent ? typed : "";
          const m = submitted ? scoreGuess(word, answer.word) : null;
          return (
            <div
              key={r}
              className="flex gap-1.5 justify-center"
              style={
                isCurrent && shake
                  ? { animation: "kata-shake " + SHAKE_MS + "ms ease" }
                  : undefined
              }
            >
              {cols.map((c) => {
                const ch = word[c] || "";
                const fresh = submitted && r === freshRow;
                const style: React.CSSProperties = m
                  ? {
                      background: MARK_BG[m[c]],
                      color: "#FFFFFF",
                      transition: fresh ? "background-color 260ms ease " + c * 130 + "ms" : undefined,
                    }
                  : {
                      background: "#FFFFFF",
                      border: "2px solid " + (ch ? G.mute : G.line),
                      color: G.text,
                    };
                return (
                  <span
                    key={c}
                    className="w-[52px] h-[52px] rounded-[10px] box-border flex items-center justify-center font-word text-[24px] font-semibold uppercase"
                    style={style}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
        <div
          className="absolute left-0 right-0 top-full mt-3 flex justify-center pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {notice ? (
            <span
              className="px-3.5 py-1.5 rounded-full font-gothic text-[13px] font-semibold text-white"
              style={{ background: G.text, boxShadow: CARD_SHADOW }}
            >
              {notice}
            </span>
          ) : null}
        </div>
      </div>

      {rec.done ? (
        <div
          className="mt-auto pt-4"
        >
          <div className="rounded-[20px] bg-white px-5 pt-5 pb-4 text-center" style={{ boxShadow: CARD_SHADOW }}>
            <p className="font-gothic text-[12px] font-semibold" style={{ color: G.mute }}>
              {rec.won ? "정답입니다" : "오늘의 단어"}
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-2.5">
              <span className="relative font-word text-[26px] font-semibold" style={{ color: G.deep }}>
                {answer.word}
                {floatOn && gained > 0 ? <FloatPoint text={"+" + gained} /> : null}
              </span>
              <button
                type="button"
                onClick={() => speakWord(answer.word)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
                style={{ background: "#E2F1EC", color: G.teal }}
                aria-label="발음 듣기"
              >
                <IconSpeaker size={16} small />
              </button>
            </div>
            <p className="mt-1 font-gothic text-[16px] font-semibold" style={{ color: G.text }}>
              {answer.meaning}
            </p>
            <p className="mt-3 font-gothic text-[13px]" style={{ color: G.sub }}>
              {rec.won
                ? rec.guesses.length + "번 만에 맞혔습니다" + (streak > 0 ? " · 연속 " + streak + "일" : "")
                : "내일 새 퍼즐에 다시 도전해 보세요"}
            </p>
            <p className="mt-0.5 font-gothic text-[12px]" style={{ color: G.mute }}>
              새 퍼즐은 한국 시간 자정에 열립니다
            </p>
            <SecondaryButton
              onClick={() => goBackOr(navigate, location.key, "/permainan")}
              className="mt-4 w-full"
            >
              게임방으로
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-4 flex flex-col gap-[7px]">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-[5px] justify-center">
              {row.map((k) => {
                const wide = k === "ENTER" || k === "BACK";
                const mk = wide ? undefined : marks[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    className={
                      "h-11 rounded-[7px] flex items-center justify-center font-gothic font-semibold uppercase active:opacity-70 " +
                      (wide ? "text-[12px] font-bold" : "text-[14px]")
                    }
                    style={{
                      width: wide ? 48 : 30,
                      background: mk ? MARK_BG[mk] : G.hair,
                      color: mk ? "#FFFFFF" : G.text,
                    }}
                    aria-label={k === "ENTER" ? "확인" : k === "BACK" ? "지우기" : k}
                  >
                    {k === "ENTER" ? "확인" : k === "BACK" ? <IconBackspace size={18} /> : k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <style>{"@keyframes kata-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}"}</style>
    </GameScreen>
  );
};

export default GameKata;
