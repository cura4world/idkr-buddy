// src/lib/sermon.ts
// PC에서 워드 설교문을 파싱해 올려둔 Cloudflare Worker에서 설교문을 읽어옵니다.
// 앱은 읽기 전용입니다 (list / get 만 사용).
//
// 서버 주소와 비밀키는 저장소가 공개라 코드에 두지 않고
// 사용자가 설정 화면에서 직접 넣어 이 기기의 localStorage 에만 보관합니다.

const BASE_KEY = "sermon-base";
const SECRET_KEY = "sermon-key";
const LAST_SYNC_KEY = "sermon-last-sync";

const DB_NAME = "kata-sermons";
const STORE = "sermons";

export type SermonKind = "title" | "ref" | "heading" | "verse" | "hymn" | "body";

export interface SermonBlock {
  kind: SermonKind;
  id: string; // 인도네시아어
  ko: string; // 한국어 해석 (빈 문자열일 수 있음)
}

export interface SermonMeta {
  id: string; // YYMMDD
  date: string; // YYMMDD (id 와 같은 값)
  title: string;
  savedAt: number;
}

export interface SermonRecord extends SermonMeta {
  blocks: SermonBlock[];
}

// ---------- 설정 (localStorage, 기기별) ----------

export function getSermonBase(): string {
  try {
    return localStorage.getItem(BASE_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setSermonBase(v: string): void {
  // 끝에 붙은 슬래시는 떼어 둡니다 (경로를 붙일 때 "//" 가 되지 않도록)
  const clean = (v || "").trim().replace(new RegExp("/+$"), "");
  try {
    localStorage.setItem(BASE_KEY, clean);
  } catch (e) {}
}

export function getSermonKey(): string {
  try {
    return localStorage.getItem(SECRET_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setSermonKey(v: string): void {
  try {
    localStorage.setItem(SECRET_KEY, (v || "").trim());
  } catch (e) {}
}

export function hasSermonConfig(): boolean {
  return getSermonBase() !== "" && getSermonKey() !== "";
}

export function getLastSync(): number {
  try {
    const n = Number(localStorage.getItem(LAST_SYNC_KEY) || "0");
    return isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function setLastSync(ms: number): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(ms));
  } catch (e) {}
}

// ---------- 서버 호출 ----------

async function callServer(path: string): Promise<any> {
  const base = getSermonBase();
  const key = getSermonKey();
  if (!base || !key) throw new Error("NO_CONFIG");

  let res: Response;
  try {
    res = await fetch(base + path, { headers: { "x-kata-key": key } });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("FETCH_FAILED");

  try {
    return await res.json();
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }
}

// 목록은 서버가 date 내림차순으로 이미 정렬해 보내줍니다.
export async function fetchSermonList(): Promise<SermonMeta[]> {
  const data = await callServer("/list");
  const items = data && data.items;
  if (!Array.isArray(items)) return [];
  return items as SermonMeta[];
}

export async function fetchSermon(id: string): Promise<SermonRecord> {
  const data = await callServer("/get?id=" + encodeURIComponent(id));
  return {
    id: String((data && data.id) || id),
    date: String((data && data.date) || id),
    title: String((data && data.title) || ""),
    savedAt: Number((data && data.savedAt) || 0),
    blocks: Array.isArray(data && data.blocks) ? (data.blocks as SermonBlock[]) : [],
  };
}

// ---------- 폰 저장 (IndexedDB) ----------

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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 목록용 — blocks 는 빼고 메타만, 최신 날짜가 위로
export async function getCachedSermons(): Promise<SermonMeta[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as SermonRecord[];
        const metas = all.map((r) => ({
          id: r.id,
          date: r.date,
          title: r.title,
          savedAt: r.savedAt,
        }));
        metas.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
        resolve(metas);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function getCachedSermon(id: string): Promise<SermonRecord | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as SermonRecord) || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function saveSermon(rec: SermonRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // 저장 못 해도 화면에서 보는 데는 지장이 없습니다
  }
}

export async function deleteCachedSermon(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // 무시
  }
}

// ---------- 동기화 ----------

// 서버 목록과 폰 저장분을 맞춥니다.
// 본문 하나를 못 받아도 나머지는 계속 진행합니다.
export async function syncSermons(): Promise<{ added: number; updated: number; removed: number }> {
  const items = await fetchSermonList();
  const cached = await getCachedSermons();
  const cachedById = new Map<string, SermonMeta>();
  cached.forEach((m) => cachedById.set(m.id, m));

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const it of items) {
    if (!it || typeof it.id !== "string" || !it.id) continue;
    const mine = cachedById.get(it.id);
    if (mine && mine.savedAt === it.savedAt) continue; // 이미 최신
    try {
      const rec = await fetchSermon(it.id);
      await saveSermon(rec);
      if (mine) updated++;
      else added++;
    } catch (e) {
      // 이 편만 건너뛰고 계속합니다
    }
  }

  const onServer = new Set(items.map((it) => it && it.id));
  for (const m of cached) {
    if (!onServer.has(m.id)) {
      await deleteCachedSermon(m.id);
      removed++;
    }
  }

  setLastSync(Date.now());
  return { added, updated, removed };
}

// ---------- 날짜 표시 ----------

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 문자열 파싱(new Date("2026-08-02"))은 UTC 로 읽혀 하루 밀릴 수 있어
// 숫자 인자 생성자로 만듭니다.
function toDate(yymmdd: string): Date | null {
  if (typeof yymmdd !== "string" || yymmdd.length !== 6) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (!isFinite(yy) || !isFinite(mm) || !isFinite(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return new Date(2000 + yy, mm - 1, dd);
}

// "260802" → "2026. 8. 2. (일)"
export function formatSermonDate(yymmdd: string): string {
  const d = toDate(yymmdd);
  if (!d) return yymmdd;
  return (
    d.getFullYear() +
    ". " +
    (d.getMonth() + 1) +
    ". " +
    d.getDate() +
    ". (" +
    DOW[d.getDay()] +
    ")"
  );
}

// "260802" → "26.08.02"
export function formatSermonDateShort(yymmdd: string): string {
  if (typeof yymmdd !== "string" || yymmdd.length !== 6) return yymmdd;
  return yymmdd.slice(0, 2) + "." + yymmdd.slice(2, 4) + "." + yymmdd.slice(4, 6);
}
