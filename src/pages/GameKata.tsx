// src/pages/GameKata.tsx
// 오늘의 단어 퍼즐 (Kata Hari Ini) — 시안 GM-Kata. 무료 사용자에게도 열려 있습니다.
// 인도네시아어 단어를 여섯 번 안에 맞힙니다. 하루 한 문제(한국 시간 자정에 바뀜),
// 같은 날 같은 단계(4·5·6글자)끼리는 모두 같은 단어를 받습니다. 출제·채점·기록·단계는 src/lib/kataHariIni.ts.
// 단계(2026-11-25): 처음 5글자, 실력에 따라 4·6글자. 그날 문제는 처음 연 순간의 단계로 고정(fixDayLength),
// 끝나면 결과를 단계에 한 번 세고(applyDayResult) 바뀌었으면 "내일부터 N글자로 풀어요"를 잠깐 띄웁니다.
// 칸 색: 초록 = 자리까지 맞음, 노랑 = 단어 안에 있지만 자리가 다름, 회색 = 없음.
// 입력은 실제 단어만 받습니다(정답 목록 + 추가 단어 목록, kataHariIni.isKnownWord). 목록에 없는 말은
// 시도 횟수를 쓰지 않고 줄을 흔든 뒤 격자 아래에 "단어 목록에 없는 단어입니다" 를 잠깐 띄웁니다.
// API 호출이 없습니다. 끝나면 훈장 기록을 한 번만 남깁니다.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_TRIES,
  answerForDay,
  applyDayResult,
  dayKeyOf,
  dayLabel,
  fixDayLength,
  getDayRecord,
  isKnownWord,
  isValidGuess,
  keyMarks,
  kstDayNumber,
  levelChangeText,
  saveDayRecord,
  scoreGuess,
  currentStreak,
} from "@/lib/kataHariIni";
import type { DayRecord, KataLen, PuzzleWord, TileMark } from "@/lib/kataHariIni";
import { toast } from "sonner";

/** "네"·"다섯"·"여섯" 글자 — 칸을 덜 채웠을 때 알림 */
const LEN_KO: Record<KataLen, string> = { 4: "네", 5: "다섯", 6: "여섯" };
/** 단계 칩(보라 계열 작은 알약) */
const CHIP_BG = "#EEEAF8";
const CHIP_FG = "#5B4B9A";
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
import { CircleHelp } from "lucide-react";
import AppSheet, { SHEET } from "@/components/sheet/AppSheet";
import { KATA_HELP } from "@/lib/kataHariIniHelp";

const MARK_BG: Record<TileMark, string> = {
  hit: "#5E9C6E",
  near: "#D9B44A",
  miss: "#AEB6BB",
};

// ── 칸(2026-11-25) ──
// 칸 하나의 크기는 "6글자 한 줄이 화면 폭에 알맞게 들어가는 크기"로 고정합니다(4·5·6글자가 같은 크기를 쓰게 — 다음 단계 준비).
// 화면 폭(앱 최대 폭 512px) − 좌우 여백 32px − 칸 사이 5개 → ÷ 6, 그러나 52px 를 넘지 않음.
//   412px → 52px(넉넉함), 360px → (360 − 32 − 30) ÷ 6 = 49.67px. 칸·글자는 px 라 앱 글자 크기(125%)와 상관없음
const CELL_GAP = 6;
const MAX_COLS = 6;
const CELL_SIZE = "min(52px, calc((min(100vw, 512px) - 32px - " + CELL_GAP * (MAX_COLS - 1) + "px) / " + MAX_COLS + "))";
// 지금 쓸 줄만 진한 테두리(빈 칸 #9AA1A6 · 글자 든 칸 #646C72), 아직 안 쓴 줄은 옅은 테두리·옅은 바탕
const CELL_BORDER_CURRENT = G.mute;
const CELL_BORDER_TYPED = G.sub;
const CELL_BORDER_LATER = G.tile;
const CELL_BG_LATER = "#F6F8F9";

const ORDINAL = ["첫", "두", "세", "네", "다섯", "여섯"];

/** "게임 방법" 창 — 공용 AppSheet(제목 + X, 뒤로가기·머리 끌어 닫기). 문구는 lib/kataHariIniHelp.ts 한 곳 */
const KataHelpSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const ex = KATA_HELP.example;
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={KATA_HELP.title}
      icon={<CircleHelp size={20} strokeWidth={1.8} />}
      tone="neutral"
      backClose
    >
      <div data-kata-help className="font-gothic" style={{ color: SHEET.txt }}>
        <p className="m-0 text-[0.875rem] leading-[1.65] break-keep">{KATA_HELP.lead}</p>
        <p className="m-0 mt-4 text-[0.8125rem] font-semibold" style={{ color: SHEET.sub }}>{ex.caption}</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {ex.rows.map((w) => {
            // 예시 색은 실제 채점 함수로 칠합니다(게임 칸과 같은 판정·같은 색)
            const m = scoreGuess(w, ex.answer);
            return (
              <div key={w} data-kata-help-row className="flex items-center gap-1.5">
                {w.split("").map((ch, i) => (
                  <span
                    key={i}
                    data-mark={m[i]}
                    className="rounded-[7px] flex items-center justify-center font-word text-[16px] font-semibold uppercase text-white"
                    style={{ width: 34, height: 34, background: MARK_BG[m[i]] }}
                  >
                    {ch}
                  </span>
                ))}
                {w === ex.answer ? (
                  <span className="ml-1.5 text-[0.8125rem] font-bold" style={{ color: "#3E7A4F" }}>{ex.solvedNote}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <ul className="m-0 mt-4 p-0 list-none flex flex-col gap-1.5">
          {KATA_HELP.colors.map((c) => (
            <li key={c.mark} data-kata-help-color className="flex items-center gap-2 text-[0.8125rem] leading-[1.5]">
              <span className="shrink-0 rounded-[4px]" style={{ width: 14, height: 14, background: MARK_BG[c.mark] }} aria-hidden="true" />
              <span className="break-keep"><b className="font-bold">{c.name}</b> {c.text}</span>
            </li>
          ))}
        </ul>
        <div className="my-4 h-px" style={{ background: SHEET.line }} />
        <ul className="m-0 p-0 list-none flex flex-col gap-1">
          {KATA_HELP.tips.map((t) => (
            <li key={t} data-kata-help-tip className="flex gap-1.5 text-[0.8125rem] leading-[1.55] break-keep" style={{ color: SHEET.sub }}>
              <span aria-hidden="true">·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppSheet>
  );
};

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
  const dayKey = dayKeyOf(dayNum);
  // 그날 문제의 글자 수 — 처음 연 순간의 단계로 고정(그 뒤 단계가 바뀌어도 오늘 문제는 그대로)
  const [len] = useState<KataLen>(() => fixDayLength(dayKey));
  const [answer] = useState<PuzzleWord | null>(() => answerForDay(dayNum, len));

  const [rec, setRec] = useState<DayRecord>(() => getDayRecord(dayKey));
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState("");       // 격자 아래 짧은 알림 (잘못 낸 줄)
  const [freshRow, setFreshRow] = useState(-1);   // 방금 낸 줄 (색이 차례로 칠해지는 연출)
  const [streak, setStreak] = useState(() => currentStreak());
  const [gained, setGained] = useState(0);
  const [floatOn, setFloatOn] = useState(false);
  // "게임 방법" 창 — 처음 들어올 때 자동으로 띄우지 않음, 단추를 눌러야 열림(2026-11-25)
  const [helpOpen, setHelpOpen] = useState(false);

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
      // 저장된 기록에 덧붙임 — 단계 판정 표시(counted)를 덮어쓰지 않게
      const marked: DayRecord = { ...getDayRecord(dayKey), ...r, recorded: true, counted: getDayRecord(dayKey).counted || r.counted };
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

  // 끝난 날의 결과를 단계에 한 번 셈 — 바뀌었으면 "내일부터 N글자로 풀어요"를 잠깐(2026-11-25)
  const countLevel = useCallback(() => {
    const changed = applyDayResult(dayKey);
    if (changed) toast(levelChangeText(changed));
    return getDayRecord(dayKey);
  }, [dayKey]);

  // 다 풀었는데 기록을 못 남긴 채 닫혔던 경우(앱 종료 등) 이어서 남깁니다
  useEffect(() => {
    if (rec.done && !rec.counted) {
      const fresh = countLevel();
      setRec(fresh);
      if (!fresh.recorded) recordOnce(fresh);
      return;
    }
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
    if (g.length < len) {
      bump(LEN_KO[len] + " 글자를 모두 채워 주세요");
      return;
    }
    if (!isValidGuess(g, len)) {
      bump();
      return;
    }
    // 목록에 없는 말은 시도 횟수를 쓰지 않습니다 (친 글자는 그대로 두어 고쳐 칠 수 있게)
    if (!isKnownWord(g, len)) {
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
      const fresh = countLevel();
      setRec(fresh);
      recordOnce(fresh);
    }
    // 판단이 바뀌지 않는 값만 의존합니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, dayKey, recordOnce, countLevel, len]);

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
      setTyped((t) => (t.length >= len ? t : t + c));
    },
    [submit, len]
  );

  // 실제 자판도 받습니다 (태블릿 키보드·PC 확인용)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (helpOpen) return; // 게임 방법 창이 떠 있는 동안은 칸에 쓰지 않음
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (e.key.length === 1) press(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, helpOpen]);

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
  for (let i = 0; i < len; i++) cols.push(i);

  return (
    <GameScreen id="kata">
      {/* 날짜 줄 — 날짜·시도 글 + 오른쪽에 "게임 방법"·"뜻 힌트" 알약(2026-11-25). 한 줄이 기본이고,
          좁으면 단추 둘만 통째로 다음 줄로(글은 줄이지 않음 — flex-wrap) */}
      <div data-kata-status-row className="min-h-10 shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-1">
        {/* 날짜·시도 글 + 단계 칩("5글자", 보라 계열 작은 알약, 2026-11-25) — 한 덩어리로 줄이지 않음 */}
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span data-kata-status className="font-gothic text-[11px] whitespace-nowrap" style={{ color: G.sub }}>
            {statusText}
          </span>
          <span
            data-kata-level
            className="shrink-0 h-[20px] px-2 rounded-[10px] inline-flex items-center font-gothic text-[10.5px] font-bold"
            style={{ background: CHIP_BG, color: CHIP_FG }}
          >
            {len}글자
          </span>
        </span>
        <span data-kata-pills className="ml-auto flex items-center gap-2 shrink-0 max-w-full">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="h-[30px] px-3 rounded-[15px] font-gothic text-[11px] font-bold shrink-0 bg-white"
            style={{ border: "1px solid " + G.line, color: G.sub }}
          >
            {KATA_HELP.title}
          </button>
          {!rec.done || rec.hint ? (
            <button
              type="button"
              onClick={showHint}
              className="h-[30px] px-3 rounded-[15px] font-gothic text-[11px] font-bold truncate min-w-0"
              style={{ background: G.goldBg, color: G.goldText, maxWidth: "min(60vw, 240px)" }}
            >
              {rec.hint ? "뜻 · " + answer.meaning : "뜻 힌트"}
            </button>
          ) : null}
        </span>
      </div>

      {/* 6 × 5 칸 — 날짜 줄과 자판 사이 세로 가운데(2026-11-25, 칸 아래 설명은 "게임 방법" 창으로 옮김).
          알림은 격자 바로 아래에 겹쳐 띄워 자판 위치가 움직이지 않게 합니다 */}
      <div className="flex-1 min-h-0 flex flex-col justify-center py-2.5">
      <div data-kata-grid className="relative flex flex-col items-center" style={{ gap: CELL_GAP }}>
        {rows.map((r) => {
          const submitted = r < rec.guesses.length;
          const isCurrent = !rec.done && r === rec.guesses.length;
          const word = submitted ? rec.guesses[r] : isCurrent ? typed : "";
          const m = submitted ? scoreGuess(word, answer.word) : null;
          return (
            <div
              key={r}
              data-kata-row={submitted ? "done" : isCurrent ? "current" : "later"}
              className="flex justify-center"
              style={
                isCurrent && shake
                  ? { gap: CELL_GAP, animation: "kata-shake " + SHAKE_MS + "ms ease" }
                  : { gap: CELL_GAP }
              }
            >
              {cols.map((c) => {
                const ch = word[c] || "";
                const fresh = submitted && r === freshRow;
                // 지금 쓸 줄만 진한 테두리, 아직 안 쓴 줄은 옅은 테두리·옅은 바탕(2026-11-25). 이미 쓴 줄은 색칠
                const style: React.CSSProperties = m
                  ? {
                      background: MARK_BG[m[c]],
                      color: "#FFFFFF",
                      transition: fresh ? "background-color 260ms ease " + c * 130 + "ms" : undefined,
                    }
                  : isCurrent
                    ? { background: "#FFFFFF", border: "2px solid " + (ch ? CELL_BORDER_TYPED : CELL_BORDER_CURRENT), color: G.text }
                    : { background: CELL_BG_LATER, border: "2px solid " + CELL_BORDER_LATER, color: G.text };
                return (
                  <span
                    key={c}
                    data-kata-cell
                    className="rounded-[10px] box-border flex items-center justify-center font-word text-[22px] font-semibold uppercase"
                    style={{ ...style, width: CELL_SIZE, height: CELL_SIZE }}
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
              className="px-3.5 py-1.5 rounded-full font-gothic text-[12px] font-semibold text-white"
              style={{ background: G.text, boxShadow: CARD_SHADOW }}
            >
              {notice}
            </span>
          ) : null}
        </div>
      </div>
      </div>

      {rec.done ? (
        <div
          className="pt-4"
        >
          <div className="rounded-[20px] bg-white px-5 pt-5 pb-4 text-center" style={{ boxShadow: CARD_SHADOW }}>
            <p className="font-gothic text-[11px] font-semibold" style={{ color: G.mute }}>
              {rec.won ? "정답입니다" : "오늘의 단어"}
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-2.5">
              <span className="relative font-word text-[24px] font-semibold" style={{ color: G.deep }}>
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
            <p className="mt-1 font-gothic text-[15px] font-semibold" style={{ color: G.text }}>
              {answer.meaning}
            </p>
            <p className="mt-3 font-gothic text-[12px]" style={{ color: G.sub }}>
              {rec.won
                ? rec.guesses.length + "번 만에 맞혔습니다" + (streak > 0 ? " · 연속 " + streak + "일" : "")
                : "내일 새 퍼즐에 다시 도전해 보세요"}
            </p>
            <p className="mt-0.5 font-gothic text-[11px]" style={{ color: G.mute }}>
              새 퍼즐은 한국 시간 자정에 열립니다
            </p>
            <SecondaryButton
              onClick={() => goBackOr(navigate, location.key, "/permainan")}
              className="mt-4 w-full"
            >
              게임으로
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="pt-4 flex flex-col gap-[7px]">
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
                      (wide ? "text-[11px] font-bold" : "text-[13px]")
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

      <KataHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      <style>{"@keyframes kata-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}"}</style>
    </GameScreen>
  );
};

export default GameKata;
