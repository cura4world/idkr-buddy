// src/lib/kataHariIni.ts
// 오늘의 단어 퍼즐 (Kata Hari Ini) — 워들처럼 다섯 글자 인도네시아어 단어를 여섯 번 안에 맞힙니다.
//
// - 하루 한 문제. "하루"는 한국 시간 자정 기준입니다(기기 시간대와 상관없이 모두 같은 날짜).
// - 정답은 동결해 둔 목록(src/data/kataHariIniWords.ts)에서 고릅니다. 단어장 CSV·seed.json 과
//   연결되어 있지 않으므로, 단어장이 바뀐 업데이트가 하루 중간에 와도 그날 정답이 바뀌지 않습니다.
// - 고르는 방법: 목록은 이미 섞인 출제 순서이고, i = (날짜 번호 − KATA_EPOCH_DAY) mod 길이.
//   목록을 늘릴 때는 맨 끝에만 붙입니다(그 파일 머리말 참고). 실행 중에 다시 섞지 않습니다.
// - 입력은 실제 단어만 받습니다: 정답 목록 + src/data/kataHariIniGuesses.ts 에 있는 말.
//   목록에 없는 말은 시도 횟수를 쓰지 않고 되돌려 보냅니다(GameKata 가 줄을 흔들고 알려 줌).
// - 기록은 localStorage 한 칸(작은 JSON)입니다. 최근 120일만 남깁니다.
// - API 호출이 없습니다.

import { KATA_ANSWERS, KATA_EPOCH_DAY } from "@/data/kataHariIniWords";
import { KATA_EXTRA_GUESSES } from "@/data/kataHariIniGuesses";

export const WORD_LEN = 5;
export const MAX_TRIES = 6;

const STORE_KEY = "kata-hari-ini";
const KEEP_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type TileMark = "hit" | "near" | "miss";

export interface PuzzleWord {
  word: string;     // 소문자 다섯 글자
  meaning: string;  // 짧게 다듬은 한국어 뜻
}

export interface DayRecord {
  guesses: string[];   // 소문자, 낸 순서대로
  done: boolean;       // 맞혔거나 여섯 번을 다 썼음
  won: boolean;
  hint: boolean;       // 뜻 힌트를 열어 봤는가
  recorded?: boolean;  // 훈장 기록을 남겼는가 (두 번 남기지 않도록)
}

interface StoreShape {
  days: Record<string, DayRecord>;
}

// ── 날짜 (한국 시간) ───────────────────────────────────────────────

/** 한국 시간 기준 날짜 번호 (1970-01-01 KST = 0). */
export function kstDayNumber(nowMs: number): number {
  return Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS);
}

const pad2 = (n: number): string => (n < 10 ? "0" + n : String(n));

/** 날짜 번호 → "2026-11-10" */
export function dayKeyOf(dayNumber: number): string {
  const d = new Date(dayNumber * DAY_MS); // UTC 자정 = 그 KST 날짜
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
}

/** 한국 시간 기준 오늘 키 */
export function todayKey(nowMs: number = Date.now()): string {
  return dayKeyOf(kstDayNumber(nowMs));
}

/** "11월 10일" */
export function dayLabel(dayNumber: number): string {
  const d = new Date(dayNumber * DAY_MS);
  return d.getUTCMonth() + 1 + "월 " + d.getUTCDate() + "일";
}

// ── 정답 목록 (동결본) ─────────────────────────────────────────────

const isLowerAlpha = (c: string): boolean => c >= "a" && c <= "z";

let cachedList: PuzzleWord[] | null = null;

/** 출제 순서 그대로의 정답 목록 (src/data/kataHariIniWords.ts) */
export function answerList(): PuzzleWord[] {
  if (cachedList) return cachedList;
  cachedList = KATA_ANSWERS.map((p) => ({ word: p[0], meaning: p[1] }));
  return cachedList;
}

/**
 * 날짜 번호의 정답. 목록이 비면 null.
 * i = (dayNumber − epoch) mod 길이 — 목록 끝에 단어를 붙여도 그 전 날짜의 정답은 그대로입니다
 * (목록이 한 바퀴 돌기 전이라면).
 */
export function pickForDay(list: PuzzleWord[], dayNumber: number, epoch: number = KATA_EPOCH_DAY): PuzzleWord | null {
  if (!list || list.length === 0) return null;
  const n = list.length;
  const i = (((dayNumber - epoch) % n) + n) % n;
  return list[i];
}

/** 날짜 번호(한국 시간)의 정답 */
export function answerForDay(dayNumber: number): PuzzleWord | null {
  return pickForDay(answerList(), dayNumber);
}

/** 오늘(한국 시간)의 정답 */
export function todayPuzzle(nowMs: number = Date.now()): PuzzleWord | null {
  return answerForDay(kstDayNumber(nowMs));
}

// ── 입력 검사 ─────────────────────────────────────────────────────

/** 다섯 글자 소문자 알파벳인가 (모양 검사) */
export function isValidGuess(guess: string): boolean {
  const g = String(guess || "");
  if (g.length !== WORD_LEN) return false;
  for (const c of g) if (!isLowerAlpha(c)) return false;
  return true;
}

let knownSet: Set<string> | null = null;

/** 입력으로 받는 실제 단어인가 — 정답 목록 또는 추가 단어 목록에 있어야 합니다 */
export function isKnownWord(guess: string): boolean {
  const g = String(guess || "");
  if (!isValidGuess(g)) return false;
  if (!knownSet) {
    knownSet = new Set<string>();
    for (const p of KATA_ANSWERS) knownSet.add(p[0]);
    for (const w of KATA_EXTRA_GUESSES) knownSet.add(w);
  }
  return knownSet.has(g);
}

// ── 채점 ──────────────────────────────────────────────────────────

/**
 * 워들 채점. 같은 글자가 여러 번 나오는 경우:
 * 1) 자리까지 맞는 글자를 먼저 "hit" 으로 표시하고 정답에서 그만큼 지웁니다.
 * 2) 남은 글자를 왼쪽부터 보며, 정답에 아직 남아 있으면 "near", 없으면 "miss".
 * 예: 정답 "kotak", 입력 "kakak" → k hit · a miss · k miss · a hit · k hit
 */
export function scoreGuess(guess: string, answer: string): TileMark[] {
  const g = String(guess || "").toLowerCase().split("");
  const a = String(answer || "").toLowerCase().split("");
  const out: TileMark[] = [];
  const left: Record<string, number> = {};
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      out[i] = "hit";
    } else {
      out[i] = "miss";
      const c = a[i];
      if (c !== undefined) left[c] = (left[c] || 0) + 1;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (out[i] === "hit") continue;
    const c = g[i];
    if ((left[c] || 0) > 0) {
      out[i] = "near";
      left[c] -= 1;
    }
  }
  return out;
}

const RANK: Record<TileMark, number> = { miss: 1, near: 2, hit: 3 };

/** 자판 색 — 글자마다 지금까지 가장 좋았던 판정 */
export function keyMarks(guesses: string[], answer: string): Record<string, TileMark> {
  const out: Record<string, TileMark> = {};
  for (const g of guesses || []) {
    const marks = scoreGuess(g, answer);
    const chars = String(g || "").toLowerCase().split("");
    chars.forEach((c, i) => {
      const m = marks[i];
      if (!out[c] || RANK[m] > RANK[out[c]]) out[c] = m;
    });
  }
  return out;
}

// ── 기록 ──────────────────────────────────────────────────────────

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { days: {} };
    const p = JSON.parse(raw) as Partial<StoreShape>;
    const days = p && p.days && typeof p.days === "object" ? p.days : {};
    return { days: days as Record<string, DayRecord> };
  } catch (e) {
    return { days: {} };
  }
}

function writeStore(s: StoreShape): void {
  try {
    // 오래된 날은 지웁니다 (키가 "YYYY-MM-DD" 라 문자열 정렬 = 날짜 정렬)
    const keys = Object.keys(s.days).sort();
    while (keys.length > KEEP_DAYS) {
      const k = keys.shift();
      if (k) delete s.days[k];
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {
    // 저장이 안 돼도 이번 화면에서는 계속 풀 수 있습니다
  }
}

const EMPTY_DAY: DayRecord = { guesses: [], done: false, won: false, hint: false };

export function getDayRecord(key: string): DayRecord {
  const r = readStore().days[key];
  if (!r || !Array.isArray(r.guesses)) return { ...EMPTY_DAY, guesses: [] };
  return {
    guesses: r.guesses.filter((g) => typeof g === "string").slice(0, MAX_TRIES),
    done: !!r.done,
    won: !!r.won,
    hint: !!r.hint,
    recorded: !!r.recorded,
  };
}

export function saveDayRecord(key: string, rec: DayRecord): void {
  const s = readStore();
  s.days[key] = rec;
  writeStore(s);
}

/**
 * 연속 일수 — 맞힌 날이 끊기지 않고 이어진 날 수.
 * 오늘을 아직 안 풀었으면 어제까지로 셉니다(오늘 못 풀었다고 아침부터 0이 되지 않게).
 */
export function streakFrom(days: Record<string, DayRecord>, todayNumber: number): number {
  const won = (n: number): boolean => {
    const r = days[dayKeyOf(n)];
    return !!(r && r.won);
  };
  let cur = todayNumber;
  if (!won(cur)) {
    const t = days[dayKeyOf(cur)];
    if (t && t.done) return 0; // 오늘 풀다 실패했으면 끊깁니다
    cur -= 1;
  }
  let n = 0;
  for (let guard = 0; guard < KEEP_DAYS + 1; guard++) {
    if (!won(cur)) break;
    n++;
    cur -= 1;
  }
  return n;
}

export function currentStreak(nowMs: number = Date.now()): number {
  return streakFrom(readStore().days, kstDayNumber(nowMs));
}
