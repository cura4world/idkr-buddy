// src/lib/kataHariIni.ts
// 오늘의 단어 퍼즐 (Kata Hari Ini) — 워들처럼 다섯 글자 인도네시아어 단어를 여섯 번 안에 맞힙니다.
//
// - 하루 한 문제. "하루"는 한국 시간 자정 기준입니다(기기 시간대와 상관없이 모두 같은 날짜).
// - 정답은 공용 기본 단어장(seed.json)의 다섯 글자 표제어에서 고릅니다. 기기에 저장된 단어장이 아니라
//   빌드에 들어 있는 seed 를 쓰므로, 같은 앱 버전이면 모든 사람이 같은 날 같은 단어를 받습니다.
// - 고르는 방법: 표제어를 알파벳순으로 정렬 → 고정 씨앗으로 한 번 섞은 순열 → 날짜 번호로 자리 선택.
//   순열을 한 바퀴 도는 동안(목록 길이만큼의 날) 같은 단어가 다시 나오지 않습니다.
// - 기록은 localStorage 한 칸(작은 JSON)입니다. 최근 120일만 남깁니다.
// - API 호출이 없습니다.

import seedData from "@/data/seed.json";

export const WORD_LEN = 5;
export const MAX_TRIES = 6;

const STORE_KEY = "kata-hari-ini";
const KEEP_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const PERM_SEED = 20261110; // 순열 씨앗 — 바꾸면 모든 사람의 날짜별 단어가 한꺼번에 바뀝니다

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

// ── 정답 목록 ─────────────────────────────────────────────────────

// 성경과 신앙 단어장은 공개판 모든 사람에게 같은 문제를 내기 어려워 뺍니다(Special 전용 단어장 포함).
const FAITH_HINTS = ["성경", "예배", "교리", "신학", "기도", "찬양", "교회", "설교", "신앙"];

const isLowerAlpha = (c: string): boolean => c >= "a" && c <= "z";

function isPuzzleWord(raw: string): boolean {
  const w = String(raw || "").trim();
  if (w.length !== WORD_LEN) return false;
  // 대문자로 시작하는 말(사람·지명)은 뺍니다. 소문자 a~z 다섯 글자만.
  for (const c of w) if (!isLowerAlpha(c)) return false;
  return true;
}

function shortMeaning(raw: string): string {
  const flat = String(raw || "").split("\n").join(" ").trim();
  const cut = flat.split(new RegExp("[;,/·]"))[0].trim();
  return (cut || flat).slice(0, 24).trim();
}

interface SeedWordLike {
  word: string;
  meaning: string;
  categoryId: string;
}
interface SeedCategoryLike {
  id: string;
  name: string;
}

/**
 * 정답 후보 목록. 알파벳순으로 정렬되어 있으므로 CSV 안의 줄 순서와 상관없이 같은 결과가 나옵니다.
 * 같은 단어가 여러 단어장에 있으면 단어장 id 가 앞선 쪽의 뜻을 씁니다.
 */
export function buildAnswerList(words: SeedWordLike[], categories: SeedCategoryLike[]): PuzzleWord[] {
  const faith = new Set<string>();
  for (const c of categories || []) {
    const name = String((c && c.name) || "");
    if (FAITH_HINTS.some((h) => name.indexOf(h) >= 0)) faith.add(c.id);
  }
  const best = new Map<string, { meaning: string; cat: string }>();
  for (const w of words || []) {
    if (!w || !isPuzzleWord(w.word)) continue;
    if (faith.has(w.categoryId)) continue;
    const m = shortMeaning(w.meaning);
    if (!m) continue;
    const key = w.word.trim();
    const had = best.get(key);
    if (!had || String(w.categoryId) < had.cat) best.set(key, { meaning: m, cat: String(w.categoryId) });
  }
  return Array.from(best.keys())
    .sort()
    .map((k) => ({ word: k, meaning: (best.get(k) as { meaning: string }).meaning }));
}

// 고정 씨앗 난수 (mulberry32)
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 고정 씨앗으로 섞은 순열 (같은 목록이면 언제나 같은 순서) */
export function puzzleOrder<T>(list: T[], seed: number = PERM_SEED): T[] {
  const a = list.slice();
  const rand = seeded(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** 날짜 번호의 정답. 목록이 비면 null. */
export function pickForDay(list: PuzzleWord[], dayNumber: number): PuzzleWord | null {
  if (!list || list.length === 0) return null;
  const order = puzzleOrder(list);
  const n = order.length;
  const i = ((dayNumber % n) + n) % n;
  return order[i];
}

let cachedList: PuzzleWord[] | null = null;

/** 앱에 들어 있는 기본 단어장 기준 정답 목록 */
export function answerList(): PuzzleWord[] {
  if (cachedList) return cachedList;
  try {
    const d = seedData as unknown as { words?: SeedWordLike[]; categories?: SeedCategoryLike[] };
    cachedList = buildAnswerList(d.words || [], d.categories || []);
  } catch (e) {
    cachedList = [];
  }
  return cachedList;
}

/** 오늘(한국 시간)의 정답 */
export function todayPuzzle(nowMs: number = Date.now()): PuzzleWord | null {
  return pickForDay(answerList(), kstDayNumber(nowMs));
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

/** 다섯 글자 소문자 알파벳인가 (입력 검사) */
export function isValidGuess(guess: string): boolean {
  const g = String(guess || "");
  if (g.length !== WORD_LEN) return false;
  for (const c of g) if (!isLowerAlpha(c)) return false;
  return true;
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
