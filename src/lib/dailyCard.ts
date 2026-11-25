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
  cat: string; // 분야(지난 카드의 분야 단추). 서버가 주고, 인터넷이 없을 때 만든 목록에서는 빈 글자
  title: string;
  img: boolean;
}

// 보관 규칙(2026-11-25 Arga 결정)
//   · 지난 카드는 최근 1년(오늘 포함 365일)만 — 서버가 그보다 오래된 카드를 지웁니다. 이 기기에서도 1년 지난 카드·그림을 지웁니다.
//   · 원본 그림은 최근 FULL_IMAGE_KEEP 장만 둡니다(한 장 0.3~0.5MB). 목록의 작은 그림은 따로 작게 만들어 둡니다(한 장 10KB 안팎).
//   그래서 1년 치를 다 넘겨 봐도 이 기기의 카드 저장소는 약 30MB 안에 머뭅니다(예전에는 2년이면 약 250MB).
export const CARD_KEEP_DAYS = 365;
const FULL_IMAGE_KEEP = 60;
const THUMB_PX = 192; // 목록 그림(52·60px)을 3배 화면에서도 또렷하게

const REQ_TIMEOUT_MS = 15000;
const DB_NAME = "kata-daily-card";
const DB_VER = 2; // 2: 작은 그림 저장소(thumbs) 추가
const CARD_STORE = "cards";
const IMG_STORE = "images";
const THUMB_STORE = "thumbs";
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
    // 글(JSON)은 작으니 기기 HTTP 캐시를 쓰지 않습니다 — 예전 응답(예: 출처 허용 머리글이 없던 것)이
    // 몇 분씩 남아 카드가 안 보이던 일을 막습니다(2026-11-17 미리보기 오류). 다시 볼 때는 IndexedDB 사본을 씁니다.
    res = await fetch(PUBLIC_BASE + path, { method: "GET", signal: controller.signal, cache: "no-store" });
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
      if (!db.objectStoreNames.contains(THUMB_STORE)) db.createObjectStore(THUMB_STORE);
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

async function idbKeys(store: string): Promise<string[]> {
  try {
    const db = await openDB();
    return await new Promise<string[]>((resolve) => {
      const r = db.transaction(store, "readonly").objectStore(store).getAllKeys();
      r.onsuccess = () => resolve(((r.result as IDBValidKey[]) || []).map((k) => String(k)));
      r.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

async function idbDeleteKeys(store: string, keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(store, "readwrite");
      const st = tx.objectStore(store);
      keys.forEach((k) => st.delete(k));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (e) {}
}

/** 원본 그림은 최근 FULL_IMAGE_KEEP 장(날짜가 늦은 것)만 남깁니다. 지운 그림도 다시 열면 서버에서 다시 받습니다. */
async function trimFullImages(): Promise<void> {
  const keys = (await idbKeys(IMG_STORE)).filter(isCardDate).sort();
  if (keys.length > FULL_IMAGE_KEEP) await idbDeleteKeys(IMG_STORE, keys.slice(0, keys.length - FULL_IMAGE_KEEP));
}

/** 1년(oldest)보다 오래된 카드 글·원본 그림·작은 그림을 이 기기에서 지웁니다. 서버에서도 지워져 다시 볼 수 없는 것들입니다. */
async function dropOlderThan(oldest: string): Promise<void> {
  if (!isCardDate(oldest)) return;
  for (const store of [CARD_STORE, IMG_STORE, THUMB_STORE]) {
    const old = (await idbKeys(store)).filter((k) => k < oldest);
    await idbDeleteKeys(store, old);
  }
}

/** 오늘을 넣어 1년(365일) 전의 날짜 — 서버의 보이는 기간과 같음 */
export function cardOldestDay(today: string): string {
  return new Date(Date.parse(today + "T00:00:00Z") - (CARD_KEEP_DAYS - 1) * 86400000).toISOString().slice(0, 10);
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
export async function loadCardList(before?: string, limit = 30): Promise<{ items: DailyCardListItem[]; more: boolean; offline: boolean }> {
  const today = kstToday();
  const oldest = cardOldestDay(today);
  try {
    const n = Math.max(1, Math.min(400, limit));
    const q = before && isCardDate(before) ? "?limit=" + n + "&before=" + before : "?limit=" + n;
    const data = await getJson("/card/list" + q);
    const items: DailyCardListItem[] = (Array.isArray(data && data.items) ? data.items : [])
      .filter((e: any) => e && isCardDate(e.d) && e.d >= oldest)
      .map((e: any) => ({ d: String(e.d), chip: String(e.chip || ""), cat: String(e.cat || ""), title: String(e.title || ""), img: !!e.img }));
    return { items, more: !!(data && data.more), offline: false };
  } catch (e) {
    const all = await idbAllCards();
    const items = all
      .filter((c) => c.d <= today && c.d >= oldest && (!before || c.d < before))
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .map((c) => ({ d: c.d, chip: c.chip, cat: "", title: c.title, img: c.img }));
    return { items, more: false, offline: true };
  }
}

/**
 * 지난 카드 화면 — 1년 치 목록을 한 번에(줄마다 100바이트 안팎이라 365줄도 작음). 월 구분·분야 단추는 화면이 이 목록으로 그립니다.
 * 받은 뒤 1년 지난 카드는 이 기기에서도 지웁니다(인터넷이 없을 때는 지우지 않음).
 */
export async function loadCardYear(): Promise<{ items: DailyCardListItem[]; offline: boolean }> {
  const r = await loadCardList(undefined, 400);
  if (!r.offline) {
    try { await dropOlderThan(cardOldestDay(kstToday())); } catch (e) {}
  }
  return { items: r.items, offline: r.offline };
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
    blob = await fetchFullImage(d);
    if (!blob) return null;
    await idbPut(IMG_STORE, blob, d);
    await trimFullImages();
  }
  try {
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

/** 서버에서 원본 그림을 받아 그림 파일(Blob)로. 저장은 부르는 쪽이 정합니다. */
async function fetchFullImage(d: string): Promise<Blob | null> {
  try {
    const b64 = await getText("/card/img/" + d);
    if (!b64 || b64.length < 100) return null;
    const clean = b64.trim();
    return base64ToBlob(clean, imageMimeOf(clean));
  } catch (e) {
    return null;
  }
}

/** 원본 그림의 가운데 정사각형을 THUMB_PX 로 줄인 JPEG. 줄이지 못하면(그림을 못 읽음) null. */
async function makeThumb(blob: Blob): Promise<Blob | null> {
  let url = "";
  try {
    url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("IMG_DECODE"));
      img.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const side = Math.min(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_PX;
    canvas.height = THUMB_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, THUMB_PX, THUMB_PX);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
  } catch (e) {
    return null;
  } finally {
    if (url) {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }
  }
}

/**
 * 목록용 작은 그림의 주소(blob:). 이 기기에 작은 그림이 있으면 그것, 없으면 원본(이 기기에 있으면 그것, 없으면 서버)을 줄여 만들어 둡니다.
 * 목록을 넘겨 보는 것만으로 원본 그림을 쌓지 않습니다 — 원본은 카드를 열 때(loadCardImageUrl)만 둡니다.
 * 줄이지 못하면 원본을 저장하지 않고 그대로 보입니다. 다 쓴 주소는 부르는 쪽이 놓아 줍니다.
 */
export async function loadCardThumbUrl(d: string): Promise<string | null> {
  if (!isCardDate(d)) return null;
  let thumb = await idbGet<Blob>(THUMB_STORE, d);
  if (!thumb) {
    const full = (await idbGet<Blob>(IMG_STORE, d)) || (await fetchFullImage(d));
    if (!full) return null;
    thumb = await makeThumb(full);
    if (thumb) await idbPut(THUMB_STORE, thumb, d);
    else thumb = full;
  }
  try {
    return URL.createObjectURL(thumb);
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
