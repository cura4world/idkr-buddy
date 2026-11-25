// src/lib/kataHariIni.ts
// 오늘의 단어 퍼즐 (Kata Hari Ini) — 워들처럼 인도네시아어 단어를 여섯 번 안에 맞힙니다.
// 2026-11-25: 실력에 따라 4·5·6글자 단계(처음 5글자). 단계 규칙은 아래 "단계" 구역, 단계별 목록은 src/data/kataHariIniWords{4,·,6}.ts.
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
import { KATA4_ANSWERS, KATA4_EPOCH_DAY } from "@/data/kataHariIniWords4";
import { KATA4_EXTRA_GUESSES } from "@/data/kataHariIniGuesses4";
import { KATA6_ANSWERS, KATA6_EPOCH_DAY } from "@/data/kataHariIniWords6";
import { KATA6_EXTRA_GUESSES } from "@/data/kataHariIniGuesses6";

/** 처음 단계(5글자) — 예전 화면·시험이 쓰던 이름 그대로 둡니다 */
export const WORD_LEN = 5;
export const MAX_TRIES = 6;

/** 단계 = 글자 수 */
export type KataLen = 4 | 5 | 6;
export const LEVEL_START: KataLen = 5;
export const LEVEL_MIN: KataLen = 4;
export const LEVEL_MAX: KataLen = 6;
/** 내려감: 푼 날 기준 이틀 연속 못 맞힘 */
export const LEVEL_DOWN_FAILS = 2;
/** 올라감: 세 번 연속 세 줄 안에(3번째 시도 이내) 맞힘 */
export const LEVEL_UP_FASTS = 3;
export const LEVEL_FAST_TRIES = 3;

const LISTS: Record<KataLen, { answers: ReadonlyArray<readonly [string, string]>; epoch: number; extra: ReadonlyArray<string> }> = {
  4: { answers: KATA4_ANSWERS, epoch: KATA4_EPOCH_DAY, extra: KATA4_EXTRA_GUESSES },
  5: { answers: KATA_ANSWERS, epoch: KATA_EPOCH_DAY, extra: KATA_EXTRA_GUESSES },
  6: { answers: KATA6_ANSWERS, epoch: KATA6_EPOCH_DAY, extra: KATA6_EXTRA_GUESSES },
};

export function isKataLen(n: unknown): n is KataLen {
  return n === 4 || n === 5 || n === 6;
}

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
  len?: KataLen;       // 그날 문제의 글자 수 — 처음 연 순간의 단계로 고정(없으면 5글자, 단계 도입 전 기록)
  counted?: boolean;   // 단계 판정에 이미 셌는가 (두 번 세지 않도록)
}

/** 단계 기록 — 지금 단계와 연속 기록(2026-11-25) */
export interface LevelState {
  cur: KataLen;        // 다음에 처음 여는 문제의 글자 수
  fails: number;       // 푼 날 기준 연속으로 못 맞힌 날 수
  fasts: number;       // 연속으로 세 줄 안에 맞힌 날 수
  changedOn?: string;  // 단계가 바뀐 날(그날 문제를 끝낸 날)
  changedTo?: KataLen;
}

interface StoreShape {
  days: Record<string, DayRecord>;
  level?: LevelState;
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

const cachedLists: Partial<Record<KataLen, PuzzleWord[]>> = {};

/** 출제 순서 그대로의 정답 목록 — 단계별 동결본(5글자 = src/data/kataHariIniWords.ts) */
export function answerList(len: KataLen = WORD_LEN): PuzzleWord[] {
  const hit = cachedLists[len];
  if (hit) return hit;
  const list = LISTS[len].answers.map((p) => ({ word: p[0], meaning: p[1] }));
  cachedLists[len] = list;
  return list;
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

/** 날짜 번호(한국 시간)의 정답 — 같은 날 같은 단계끼리는 모두 같은 문제 */
export function answerForDay(dayNumber: number, len: KataLen = WORD_LEN): PuzzleWord | null {
  return pickForDay(answerList(len), dayNumber, LISTS[len].epoch);
}

/** 오늘(한국 시간)의 정답 */
export function todayPuzzle(nowMs: number = Date.now(), len: KataLen = WORD_LEN): PuzzleWord | null {
  return answerForDay(kstDayNumber(nowMs), len);
}

// ── 입력 검사 ─────────────────────────────────────────────────────

/** 그 단계 글자 수의 소문자 알파벳인가 (모양 검사) */
export function isValidGuess(guess: string, len: KataLen = WORD_LEN): boolean {
  const g = String(guess || "");
  if (g.length !== len) return false;
  for (const c of g) if (!isLowerAlpha(c)) return false;
  return true;
}

const knownSets: Partial<Record<KataLen, Set<string>>> = {};

/** 입력으로 받는 실제 단어인가 — 그 단계의 정답 목록 또는 추가 단어 목록에 있어야 합니다 */
export function isKnownWord(guess: string, len: KataLen = WORD_LEN): boolean {
  const g = String(guess || "");
  if (!isValidGuess(g, len)) return false;
  let set = knownSets[len];
  if (!set) {
    set = new Set<string>();
    for (const p of LISTS[len].answers) set.add(p[0]);
    for (const w of LISTS[len].extra) set.add(w);
    knownSets[len] = set;
  }
  return set.has(g);
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
    const out: StoreShape = { days: days as Record<string, DayRecord> };
    if (p && p.level && typeof p.level === "object") out.level = p.level as LevelState;
    return out;
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
  const out: DayRecord = {
    guesses: r.guesses.filter((g) => typeof g === "string").slice(0, MAX_TRIES),
    done: !!r.done,
    won: !!r.won,
    hint: !!r.hint,
    recorded: !!r.recorded,
  };
  if (isKataLen(r.len)) out.len = r.len;
  if (r.counted) out.counted = true;
  return out;
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

// ── 단계(4·5·6글자, 2026-11-25) ──────────────────────────────────
// - 처음 5글자, 최소 4·최대 6. 기회는 늘 여섯 번.
// - 내려감: 푼 날 기준 이틀 연속 못 맞히면 한 단계 아래. 올라감: 세 번 연속 세 줄 안에(3번째 시도 이내) 맞히면 한 단계 위.
//   뜻 힌트를 본 날도 똑같이 셉니다. 안 푼 날(끝내지 않은 날)은 세지 않고 연속도 끊지 않습니다.
//   맞혔지만 네 줄 이상이면 두 연속이 모두 0 으로(못 맞힘 연속도, 빨리 맞힘 연속도 끊김).
// - 단계가 바뀌면(바뀌지 못하는 끝 단계여도) 두 연속을 0 으로 되돌립니다.
// - 그날 문제는 처음 연 순간의 단계로 고정합니다(DayRecord.len). 바뀐 단계는 다음 날 문제부터.

export const LEVEL_DEFAULT: LevelState = { cur: LEVEL_START, fails: 0, fasts: 0 };

/** 한 날의 결과를 단계 기록에 더합니다(순수 함수). changed = 새 단계(바뀌지 않았으면 null) */
export function nextLevel(
  state: LevelState,
  result: { won: boolean; tries: number },
  dayKey: string
): { state: LevelState; changed: KataLen | null } {
  const cur: KataLen = isKataLen(state.cur) ? state.cur : LEVEL_START;
  let fails = Math.max(0, state.fails | 0);
  let fasts = Math.max(0, state.fasts | 0);
  if (!result.won) {
    fails += 1;
    fasts = 0;
  } else if (result.tries <= LEVEL_FAST_TRIES) {
    fasts += 1;
    fails = 0;
  } else {
    fails = 0;
    fasts = 0;
  }
  let next: KataLen = cur;
  if (fails >= LEVEL_DOWN_FAILS) {
    next = Math.max(LEVEL_MIN, cur - 1) as KataLen;
    fails = 0;
    fasts = 0;
  } else if (fasts >= LEVEL_UP_FASTS) {
    next = Math.min(LEVEL_MAX, cur + 1) as KataLen;
    fails = 0;
    fasts = 0;
  }
  const changed = next !== cur ? next : null;
  const out: LevelState = { cur: next, fails, fasts };
  if (changed) {
    out.changedOn = dayKey;
    out.changedTo = changed;
  } else if (state.changedOn) {
    out.changedOn = state.changedOn;
    if (state.changedTo) out.changedTo = state.changedTo;
  }
  return { state: out, changed };
}

/** 지금 단계 기록 */
export function getLevelState(): LevelState {
  const l = readStore().level;
  if (!l || !isKataLen(l.cur)) return { ...LEVEL_DEFAULT };
  return { cur: l.cur, fails: l.fails | 0, fasts: l.fasts | 0, changedOn: l.changedOn, changedTo: isKataLen(l.changedTo) ? l.changedTo : undefined };
}

/**
 * 그날 문제의 글자 수 — 처음 연 순간의 단계로 고정해 저장합니다.
 * 단계 도입 전에 이미 풀기 시작한 날(글자 수 기록 없이 입력이 있음)은 5글자.
 */
export function fixDayLength(key: string): KataLen {
  const r = getDayRecord(key);
  if (r.len) return r.len;
  const len: KataLen = r.guesses.length > 0 ? WORD_LEN : getLevelState().cur;
  saveDayRecord(key, { ...r, len });
  return len;
}

/**
 * 끝난 날의 결과를 단계에 한 번만 셉니다(이미 셌거나 아직 안 끝났으면 아무것도 안 함).
 * 반환: 이번에 바뀐 새 단계(바뀌지 않았으면 null)
 */
export function applyDayResult(key: string): KataLen | null {
  const s = readStore();
  const r = s.days[key];
  if (!r || !r.done || r.counted) return null;
  const { state, changed } = nextLevel(getLevelState(), { won: !!r.won, tries: Array.isArray(r.guesses) ? r.guesses.length : MAX_TRIES }, key);
  s.days[key] = { ...r, counted: true };
  s.level = state;
  writeStore(s);
  return changed;
}

/** 단계가 바뀐 날 짧게 띄우는 알림 */
export function levelChangeText(to: KataLen): string {
  return "내일부터 " + to + "글자로 풀어요";
}

/**
 * 미리보기 빌드 시험용(미리보기 설정 창에서만 부름) — 단계를 바로 바꾸고 오늘 기록을 지워,
 * 퍼즐을 다시 열면 그 글자 수로 오늘 문제가 열리게 합니다. 정식 앱 화면에서는 부르는 곳이 없습니다.
 */
export function setLevelForTest(len: KataLen, nowMs: number = Date.now()): void {
  const s = readStore();
  s.level = { cur: len, fails: 0, fasts: 0 };
  delete s.days[todayKey(nowMs)];
  writeStore(s);
}
