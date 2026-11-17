// src/lib/dailyCard.ts
// 오늘의 카드 (인도네시아 이해 맨 위, 2026-11-17 결정 문서 ⑥)
//
// 카드는 서버(kata-public)가 하루에 한 장 만들어 모든 사용자가 같이 봅니다. 앱은 받아서 보여 주기만 합니다.
//   GET /card/today          오늘 카드 (오늘 것이 아직 없으면 가장 최근 카드)
//   GET /card/day/<날짜>      그날 카드
//   GET /card/list?before=   지난 카드 목록 (최신 먼저)
//   GET /card/img/<날짜>      그림 (base64 글자 — 여기서 그림 파일로 바꿉니다)
// 로그인 없이 받습니다(카드는 모두에게 같고 AI 비용이 들지 않음). 잠금은 화면(plan.ts)이 합니다.
//
// 받은 카드와 그림은 이 기기의 IndexedDB(kata-daily-card)에 둡니다 — 다시 열 때 바로 보이고, 인터넷이 없어도 본 카드는 보입니다.
// 그림은 localStorage 에 두지 않습니다(용량 한도, CLAUDE.md 금지 사항).
//
// 예전 "문화와 생활 정보"(누를 때마다 생성, IndexedDB kata-tips)는 이 카드로 바뀌었습니다. 그 저장소는 main.tsx 가 한 번 지웁니다.

import { PUBLIC_BASE } from "@/lib/account";

export interface DailyCardWord {
  id: string;
  ko: string;
}

export interface DailyCard {
  d: string; // 날짜 YYYY-MM-DD (한국 날짜)
  chip: string; // 작은 꼬리표 (음식·르바란 …)
  title: string;
  summary: string; // 카드에 보이는 짧은 설명
  body: string[]; // 안쪽 화면의 문단
  phrase: { id: string; ko: string };
  words: DailyCardWord[];
  img: boolean; // 그림이 있는가
  event: boolean; // 명절·기념일 카드인가
}

export interface DailyCardListItem {
  d: string;
  chip: string;
  title: string;
  img: boolean;
}

const REQ_TIMEOUT_MS = 15000;
const DB_NAME = "kata-daily-card";
const DB_VER = 1;
const CARD_STORE = "cards";
const IMG_STORE = "images";
const DATE_RE = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");

export function isCardDate(d: string): boolean {
  return DATE_RE.test(String(d || ""));
}

async function getJson(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, REQ_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(PUBLIC_BASE + path, { method: "GET", signal: controller.signal });
  } catch (e) {
    throw new Error("NETWORK_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("SERVER_" + res.status);
  return res.json();
}

async function getText(path: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, REQ_TIMEOUT_MS);
  try {
    const res = await fetch(PUBLIC_BASE + path, { method: "GET", signal: controller.signal });
    if (!res.ok) throw new Error("SERVER_" + res.status);
    return await res.text();
  } catch (e) {
    throw new Error("NETWORK_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

// ---------- IndexedDB ----------
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CARD_STORE)) db.createObjectStore(CARD_STORE, { keyPath: "d" });
      if (!db.objectStoreNames.contains(IMG_STORE)) db.createObjectStore(IMG_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve) => {
      const r = db.transaction(store, "readonly").objectStore(store).get(key);
      r.onsuccess = () => resolve((r.result as T) || null);
      r.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function idbPut(store: string, value: unknown, key?: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(store, "readwrite");
      if (key === undefined) tx.objectStore(store).put(value);
      else tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (e) {}
}

async function idbAllCards(): Promise<DailyCard[]> {
  try {
    const db = await openDB();
    return await new Promise<DailyCard[]>((resolve) => {
      const r = db.transaction(CARD_STORE, "readonly").objectStore(CARD_STORE).getAll();
      r.onsuccess = () => resolve((r.result as DailyCard[]) || []);
      r.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

function cleanCard(c: any): DailyCard | null {
  if (!c || !isCardDate(c.d) || !c.title) return null;
  return {
    d: String(c.d),
    chip: String(c.chip || ""),
    title: String(c.title || ""),
    summary: String(c.summary || ""),
    body: Array.isArray(c.body) ? c.body.map((p: unknown) => String(p || "")).filter((p: string) => p) : [],
    phrase: { id: String((c.phrase && c.phrase.id) || ""), ko: String((c.phrase && c.phrase.ko) || "") },
    words: Array.isArray(c.words)
      ? c.words.map((w: any) => ({ id: String((w && w.id) || ""), ko: String((w && w.ko) || "") })).filter((w: DailyCardWord) => w.id)
      : [],
    img: !!c.img,
    event: !!c.event,
  };
}

/** 이 기기의 오늘 날짜(한국 시각) — 서버와 같은 기준 */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 저장해 둔 카드 가운데 가장 최근 것 (인터넷이 없을 때) */
async function latestCached(): Promise<DailyCard | null> {
  const all = await idbAllCards();
  const today = kstToday();
  const ok = all.filter((c) => c && c.d <= today).sort((a, b) => (a.d < b.d ? 1 : -1));
  return ok[0] || null;
}

/** 오늘의 카드. 서버에 못 닿으면 이 기기에 둔 가장 최근 카드. 둘 다 없으면 null. */
export async function loadTodayCard(): Promise<DailyCard | null> {
  const today = kstToday();
  const have = await idbGet<DailyCard>(CARD_STORE, today);
  if (have) return have;
  try {
    const data = await getJson("/card/today");
    const c = cleanCard(data && data.card);
    if (c) {
      await idbPut(CARD_STORE, c);
      return c;
    }
  } catch (e) {}
  return latestCached();
}

/** 그날 카드 (안쪽 화면) */
export async function loadCard(d: string): Promise<DailyCard | null> {
  if (!isCardDate(d)) return null;
  const have = await idbGet<DailyCard>(CARD_STORE, d);
  if (have) return have;
  try {
    const data = await getJson("/card/day/" + d);
    const c = cleanCard(data && data.card);
    if (c) await idbPut(CARD_STORE, c);
    return c;
  } catch (e) {
    return null;
  }
}

/** 지난 카드 목록. 서버에 못 닿으면 이 기기에 둔 카드로 만든 목록(more 는 false). */
export async function loadCardList(before?: string): Promise<{ items: DailyCardListItem[]; more: boolean; offline: boolean }> {
  try {
    const q = before && isCardDate(before) ? "?limit=30&before=" + before : "?limit=30";
    const data = await getJson("/card/list" + q);
    const items: DailyCardListItem[] = (Array.isArray(data && data.items) ? data.items : [])
      .filter((e: any) => e && isCardDate(e.d))
      .map((e: any) => ({ d: String(e.d), chip: String(e.chip || ""), title: String(e.title || ""), img: !!e.img }));
    return { items, more: !!(data && data.more), offline: false };
  } catch (e) {
    const all = await idbAllCards();
    const today = kstToday();
    const items = all
      .filter((c) => c.d <= today && (!before || c.d < before))
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .map((c) => ({ d: c.d, chip: c.chip, title: c.title, img: c.img }));
    return { items, more: false, offline: true };
  }
}

/** base64 앞머리로 그림 형식을 알아봅니다 — Gemini 이미지는 JPEG 로 올 때가 많습니다(2026-11-17 첫 카드 실측). */
function imageMimeOf(b64: string): string {
  if (b64.indexOf("/9j/") === 0) return "image/jpeg";
  if (b64.indexOf("iVBOR") === 0) return "image/png";
  if (b64.indexOf("UklGR") === 0) return "image/webp";
  return "image/png";
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * 카드 그림의 주소(blob:). 처음 한 번만 서버에서 받고, 그 뒤로는 이 기기에 둔 것을 씁니다.
 * 다 쓴 주소는 부르는 쪽이 URL.revokeObjectURL 로 놓아 줍니다. 그림이 없거나 받지 못하면 null.
 */
export async function loadCardImageUrl(d: string): Promise<string | null> {
  if (!isCardDate(d)) return null;
  let blob = await idbGet<Blob>(IMG_STORE, d);
  if (!blob) {
    try {
      const b64 = await getText("/card/img/" + d);
      if (!b64 || b64.length < 100) return null;
      const clean = b64.trim();
      blob = base64ToBlob(clean, imageMimeOf(clean));
      await idbPut(IMG_STORE, blob, d);
    } catch (e) {
      return null;
    }
  }
  try {
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

/** "11월 17일" 처럼 */
export function cardDateLabel(d: string): string {
  if (!isCardDate(d)) return "";
  const m = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  return m + "월 " + day + "일";
}
