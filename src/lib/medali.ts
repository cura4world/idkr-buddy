// src/lib/medali.ts
// Medali(훈장) 시스템 엔진.
// - Medali Api(불꽃)   : 이번 주(월~토) 노력 점수. 주일은 점수도 없고 streak도 끊기지 않는다.
// - Medali Bintang(별) : 누적 실력. "확정 단어"(시차를 두고 2회 맞힌 단어) 절대 개수 기반.
// 저장은 IndexedDB(kata-medali), 첫 페인트용 색만 localStorage에 캐시한다.
// 저장이 실패해도 화면은 정상 동작해야 하므로 모든 공개 함수를 try/catch로 감싼다.

// ── 상수 (나중에 실측으로 보정하는 값들) ───────────────────────────
export type MedaliColor = "tanah" | "perunggu" | "perak" | "emas" | "platina" | "permata";

// 색상값 v2 (라이트/다크 공용, 훈장 금속색이므로 고정 hex)
export const MEDALI_COLORS: Record<MedaliColor, string> = {
  tanah: "#5C4530",
  perunggu: "#B0713B",
  perak: "#838B93",
  emas: "#D9A420",
  platina: "#9BDCF2",
  permata: "#2BB3A3",
};

export type ApiCategory =
  | "reading" | "explore" | "game" | "quiz"
  | "percakapan" | "phrase" | "dict" | "popup" | "save";

// 하루 상한 (점수 테이블 v3)
export const DAILY_CAPS: Record<ApiCategory, number> = {
  reading: 20, explore: 5, game: 15, quiz: 10,
  percakapan: 9, phrase: 4, dict: 10, popup: 5, save: 5,
};

// Api 주간 커트라인 (이 점수 이상이면 해당 색)
export const API_CUTOFFS: { color: MedaliColor; min: number }[] = [
  { color: "permata", min: 400 },
  { color: "platina", min: 280 },
  { color: "emas", min: 180 },
  { color: "perak", min: 100 },
  { color: "perunggu", min: 30 },
  { color: "tanah", min: 0 },
];

// Bintang 커트라인 — 색6 × 세부3 = 18단계. 확정 단어 수 기준.
// tier: 3=III(하) 2=II 1=I(상). 값은 초안이며 상수만 고쳐 보정한다.
export const BINTANG_CUTOFFS: { color: MedaliColor; tier: 1 | 2 | 3; min: number }[] = [
  { color: "permata", tier: 1, min: 2600 }, { color: "permata", tier: 2, min: 2200 }, { color: "permata", tier: 3, min: 1800 },
  { color: "platina", tier: 1, min: 1500 }, { color: "platina", tier: 2, min: 1250 }, { color: "platina", tier: 3, min: 1000 },
  { color: "emas", tier: 1, min: 820 }, { color: "emas", tier: 2, min: 660 }, { color: "emas", tier: 3, min: 500 },
  { color: "perak", tier: 1, min: 380 }, { color: "perak", tier: 2, min: 280 }, { color: "perak", tier: 3, min: 200 },
  { color: "perunggu", tier: 1, min: 140 }, { color: "perunggu", tier: 2, min: 90 }, { color: "perunggu", tier: 3, min: 50 },
  { color: "tanah", tier: 1, min: 30 }, { color: "tanah", tier: 2, min: 12 }, { color: "tanah", tier: 3, min: 0 },
];

const CONFIRM_GAP_MS = 3 * 24 * 60 * 60 * 1000; // 확정 판정: 3일 이상 간격 2회 정답

const MAX_ROUNDS = 500; // rounds 스토어 FIFO 상한

// ── 레코드 타입 ───────────────────────────────────────────────────
export interface DailyLog {
  date: string;                               // "2026-08-04" (KST 로컬 날짜)
  points: Partial<Record<ApiCategory, number>>;
  total: number;
}

export interface WordRecord {
  word: string;                               // 소문자
  status: "pending" | "confirmed" | "recheck";
  corrects: number;
  firstCorrectAt: number;
  lastCorrectAt: number;
  source: string;                             // "bible" | "story" | "map" | "seed" ...
  confirmedAt?: number;
}

export interface GameRound {
  id: string;                                 // String(Date.now()) + 난수 꼬리
  game: "match" | "ox";
  date: string;
  durationSec: number;
  score: number;
  words: { word: string; correct: boolean; source: string }[];
}

// ── IndexedDB (wordStore.ts와 동일한 지연 프로미스 패턴) ────────────
const DB_NAME = "kata-medali";
const STORE_DAILY = "daily";
const STORE_WORDS = "words";
const STORE_ROUNDS = "rounds";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DAILY)) {
        db.createObjectStore(STORE_DAILY, { keyPath: "date" });
      }
      if (!db.objectStoreNames.contains(STORE_WORDS)) {
        db.createObjectStore(STORE_WORDS, { keyPath: "word" });
      }
      if (!db.objectStoreNames.contains(STORE_ROUNDS)) {
        db.createObjectStore(STORE_ROUNDS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

function getOne<T>(store: string, key: string): Promise<T | null> {
  return openDB().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => resolve(null);
      })
  );
}

function getAll<T>(store: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise<T[]>((resolve) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      })
  );
}

function putOne(store: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      })
  );
}

// ── 날짜/주간 유틸 (전부 로컬 시간 = KST 기준) ─────────────────────
const pad2 = (n: number): string => (n < 10 ? "0" + n : String(n));

export const dateKey = (d: Date): string =>
  d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());

export const isSunday = (d: Date): boolean => d.getDay() === 0;

// 이번 주 월요일 00:00. 일요일이면 "다음" 월요일이 아니라 지나간 월요일(6일 전)이다.
export const mondayOf = (d: Date): Date => {
  const day = d.getDay(); // 0=일 1=월 ... 6=토
  const back = day === 0 ? 6 : day - 1;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - back);
  m.setHours(0, 0, 0, 0);
  return m;
};

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

// ── 커트라인 판정 ─────────────────────────────────────────────────
export function apiColorFor(points: number): MedaliColor {
  for (const c of API_CUTOFFS) if (points >= c.min) return c.color;
  return "tanah";
}

export function bintangFor(count: number): { color: MedaliColor; tier: 1 | 2 | 3 } {
  for (const c of BINTANG_CUTOFFS) if (count >= c.min) return { color: c.color, tier: c.tier };
  return { color: "tanah", tier: 3 };
}

// ── 캐시 (첫 페인트용. 색 이름 몇 개뿐이라 localStorage에 둔다) ─────
const CACHE_KEY = "medali-cache";

export interface MedaliCache {
  apiColor: MedaliColor;
  bintangColor: MedaliColor;
  bintangTier: 1 | 2 | 3;
  updatedAt: number;
}

const DEFAULT_CACHE: MedaliCache = {
  apiColor: "tanah",
  bintangColor: "tanah",
  bintangTier: 3,
  updatedAt: 0,
};

function isColor(v: unknown): v is MedaliColor {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MEDALI_COLORS, v);
}

export function loadMedaliCache(): MedaliCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { ...DEFAULT_CACHE };
    const p = JSON.parse(raw) as Partial<MedaliCache>;
    const tier = p.bintangTier === 1 || p.bintangTier === 2 || p.bintangTier === 3 ? p.bintangTier : 3;
    return {
      apiColor: isColor(p.apiColor) ? p.apiColor : "tanah",
      bintangColor: isColor(p.bintangColor) ? p.bintangColor : "tanah",
      bintangTier: tier,
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : 0,
    };
  } catch {
    return { ...DEFAULT_CACHE };
  }
}

function saveMedaliCache(c: MedaliCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // 저장 실패해도 화면은 정상 동작 (다음 refresh에서 다시 계산됨)
  }
}

// ── 엔진 스냅샷 ───────────────────────────────────────────────────
export interface MedaliSnapshot {
  apiColor: MedaliColor;
  apiWeekPoints: number;
  streak: number;
  bintangColor: MedaliColor;
  bintangTier: 1 | 2 | 3;
  confirmedCount: number;
}

export interface MedaliSummary {
  apiColor: MedaliColor;
  bintangColor: MedaliColor;
  weekPoints: number;
  confirmedCount: number;
  updatedAt: number;
}

type Listener = (s: MedaliSnapshot) => void;

class MedaliEngine {
  private listeners = new Set<Listener>();
  private snap: MedaliSnapshot;

  constructor() {
    const c = loadMedaliCache();
    this.snap = {
      apiColor: c.apiColor,
      apiWeekPoints: 0,
      streak: 0,
      bintangColor: c.bintangColor,
      bintangTier: c.bintangTier,
      confirmedCount: 0,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snap);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getState(): MedaliSnapshot {
    return this.snap;
  }

  private emit(patch: Partial<MedaliSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l(this.snap));
  }

  // 색이 바뀌었으면 첫 페인트용 캐시를 갱신한다.
  private syncCache() {
    const c = loadMedaliCache();
    if (
      c.apiColor === this.snap.apiColor &&
      c.bintangColor === this.snap.bintangColor &&
      c.bintangTier === this.snap.bintangTier
    ) {
      return;
    }
    saveMedaliCache({
      apiColor: this.snap.apiColor,
      bintangColor: this.snap.bintangColor,
      bintangTier: this.snap.bintangTier,
      updatedAt: Date.now(),
    });
  }

  // ── Api: 이번 주 점수 + streak 재계산 ───────────────────────────
  private async recomputeApi(): Promise<void> {
    const logs = await getAll<DailyLog>(STORE_DAILY);
    const now = new Date();
    const from = dateKey(mondayOf(now));
    const today = dateKey(now);

    let week = 0;
    const scored = new Set<string>();
    for (const l of logs) {
      if (!l || typeof l.date !== "string") continue;
      const total = typeof l.total === "number" ? l.total : 0;
      if (total > 0) scored.add(l.date);
      if (l.date >= from && l.date <= today) week += total;
    }

    this.emit({
      apiWeekPoints: week,
      apiColor: apiColorFor(week),
      streak: computeStreak(scored, now),
    });
    this.syncCache();
  }

  // ── Bintang: 확정 단어 수 재계산 ────────────────────────────────
  private async recomputeBintang(): Promise<void> {
    const words = await getAll<WordRecord>(STORE_WORDS);
    // recheck는 "확정 취소"가 아니라 재검증 대기 상태라 확정 수에서 즉시 빼지 않는다.
    let count = 0;
    for (const w of words) {
      if (w && (w.status === "confirmed" || w.status === "recheck")) count++;
    }
    const b = bintangFor(count);
    this.emit({ confirmedCount: count, bintangColor: b.color, bintangTier: b.tier });
    this.syncCache();
  }

  // 1) 점수 적립. 실제 반영된 점수를 반환한다(0이면 화면은 "+N"을 생략).
  async addPoints(category: ApiCategory, amount: number): Promise<number> {
    try {
      const now = new Date();
      if (isSunday(now)) return 0; // Api는 월~토만
      const cap = DAILY_CAPS[category];
      if (!cap || !(amount > 0)) return 0;

      const key = dateKey(now);
      const log: DailyLog =
        (await getOne<DailyLog>(STORE_DAILY, key)) || { date: key, points: {}, total: 0 };
      if (!log.points) log.points = {};

      const had = log.points[category] || 0;
      const gain = Math.min(amount, cap - had);
      if (gain <= 0) return 0;

      log.points[category] = had + gain;
      let total = 0;
      for (const k of Object.keys(log.points)) {
        total += log.points[k as ApiCategory] || 0;
      }
      log.total = total;

      await putOne(STORE_DAILY, log);
      await this.recomputeApi();
      return gain;
    } catch {
      return 0;
    }
  }

  // 2) 단어 정답/오답 기록 → 확정 판정
  // 반환: 이번 호출로 확정(confirmed)으로 새로 전환됐으면 becameConfirmed = true
  async recordWordResult(
    word: string,
    correct: boolean,
    source: string
  ): Promise<{ becameConfirmed: boolean }> {
    try {
      const key = String(word || "").trim().toLowerCase();
      if (!key) return { becameConfirmed: false };
      const now = Date.now();

      const rec: WordRecord =
        (await getOne<WordRecord>(STORE_WORDS, key)) || {
          word: key,
          status: "pending",
          corrects: 0,
          firstCorrectAt: 0,
          lastCorrectAt: 0,
          source,
        };
      if (source) rec.source = rec.source || source;

      const before = rec.status;

      if (correct) {
        const prevCorrects = rec.corrects || 0;
        const prevFirst = rec.firstCorrectAt || 0;
        if (!prevFirst) rec.firstCorrectAt = now; // 최초 정답 시각은 그대로 유지
        rec.corrects = prevCorrects + 1;
        rec.lastCorrectAt = now;

        if (rec.status === "recheck") {
          // 재검증 통과 → 확정 복귀
          rec.status = "confirmed";
          if (!rec.confirmedAt) rec.confirmedAt = now;
        } else if (rec.status !== "confirmed" && prevCorrects >= 1 && now - prevFirst >= CONFIRM_GAP_MS) {
          rec.status = "confirmed";
          rec.confirmedAt = now;
        }
      } else if (rec.status === "confirmed") {
        rec.status = "recheck"; // 확정 수에서 즉시 빼지 않고 재검증 대기
      }

      await putOne(STORE_WORDS, rec);
      // 확정 개수가 달라질 수 있는 전이에서만 다시 센다.
      const countChanged =
        (before !== "confirmed" && before !== "recheck") &&
        (rec.status === "confirmed" || rec.status === "recheck");
      if (countChanged) await this.recomputeBintang();
      // pending→confirmed, recheck→confirmed 처럼 "이번에" 확정이 된 경우만 true
      return { becameConfirmed: before !== "confirmed" && rec.status === "confirmed" };
    } catch {
      // 기록 실패해도 게임 진행에는 영향 없음
      return { becameConfirmed: false };
    }
  }

  // 3) 게임 한 판 저장 (최근 500판 FIFO)
  async saveRound(round: Omit<GameRound, "id">): Promise<void> {
    try {
      const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
      await putOne(STORE_ROUNDS, { ...round, id } as GameRound);
      await evictRounds();
    } catch {
      // 저장 실패해도 게임 결과 화면은 정상 동작
    }
  }

  // 4) 2단계(부부 비교)용 요약
  getSummary(): MedaliSummary {
    return {
      apiColor: this.snap.apiColor,
      bintangColor: this.snap.bintangColor,
      weekPoints: this.snap.apiWeekPoints,
      confirmedCount: this.snap.confirmedCount,
      updatedAt: loadMedaliCache().updatedAt,
    };
  }

  // 5) 전체 재계산 (앱 시작 시 캡슐이 호출)
  async refresh(): Promise<void> {
    try {
      await this.recomputeApi();
      await this.recomputeBintang();
    } catch {
      // IndexedDB를 못 쓰는 환경이면 캐시 색 그대로 둔다
    }
  }
}

// 게임 출제 풀이 미확정/확정을 가르는 데 씁니다. (kata-medali는 이 파일 밖에서 열지 않습니다)
export async function listWordRecords(): Promise<WordRecord[]> {
  try {
    return await getAll<WordRecord>(STORE_WORDS);
  } catch {
    return [];
  }
}

// 저장된 게임 판 기록. game을 주면 그 게임만. 최고 기록 표시에 씁니다.
export async function listRounds(game?: GameRound["game"]): Promise<GameRound[]> {
  try {
    const all = await getAll<GameRound>(STORE_ROUNDS);
    return game ? all.filter((r) => r && r.game === game) : all;
  } catch {
    return [];
  }
}

// streak: 최근부터 역산. 일요일은 결번(있어도 없어도 건너뜀),
// 월~토 중 점수 없는 날을 만나면 중단. 오늘 아직 점수가 없으면 어제까지로 센다.
function computeStreak(scored: Set<string>, now: Date): number {
  let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (isSunday(cur) || !scored.has(dateKey(cur))) cur = addDays(cur, -1);

  let streak = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (isSunday(cur)) {
      cur = addDays(cur, -1);
      continue;
    }
    if (!scored.has(dateKey(cur))) break;
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

// rounds 500판 초과분을 오래된 것부터 삭제 (id가 Date.now() 접두라 키 순서 = 시간 순서)
async function evictRounds(): Promise<void> {
  try {
    const db = await openDB();
    const count: number = await new Promise((resolve) => {
      const tx = db.transaction(STORE_ROUNDS, "readonly");
      const req = tx.objectStore(STORE_ROUNDS).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
    if (count <= MAX_ROUNDS) return;
    const toRemove = count - MAX_ROUNDS;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_ROUNDS, "readwrite");
      let removed = 0;
      tx.objectStore(STORE_ROUNDS).openCursor().onsuccess = (e: Event) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor && removed < toRemove) {
          cursor.delete();
          removed++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 정리 실패는 무해
  }
}

export const medaliEngine = new MedaliEngine();
