// src/lib/percakapan.ts
// 회화집(Percakapan) 저장·백업·생성.
// - 기본 회화집은 src/data/percakapan 에 코드로 들어 있고, 이 파일은 손대지 않습니다.
// - 사용자가 만든 회화집과 카테고리만 이 기기의 IndexedDB 에 담습니다.
// - 앱을 다시 깔면 IndexedDB 가 비므로, Cloudflare Worker 에 백업해 두고 되돌립니다.
//   서버 주소와 비밀키는 저장소가 공개라 코드에 두지 않고 설정 화면에서 받아
//   이 기기의 localStorage 에만 보관합니다 (설교문 서버와 같은 방식).

import { getGeminiApiKey } from "@/lib/gemini";
import { callGeminiText } from "@/lib/geminiText";
import {
  BUILTIN_CATEGORIES,
  builtinScenesOf,
  findBuiltinScene,
  findBuiltinCategory,
} from "@/data/percakapan";
import type {
  PercakapanCategory,
  PercakapanLevel,
  PercakapanLine,
  PercakapanScene,
  PercakapanSpeaker,
  PercakapanGender,
} from "@/data/percakapan";

const BASE_KEY = "percakapan-base";
const KEY_KEY = "percakapan-key";

const DB_NAME = "kata-percakapan";
const SCENE_STORE = "scenes";
const CAT_STORE = "cats";

// 회화집 생성용 호출 타임아웃
const GEN_TIMEOUT_MS = 30000;

// ---------- 설정 (localStorage, 기기별) ----------

export function getPercakapanBase(): string {
  try {
    return localStorage.getItem(BASE_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setPercakapanBase(v: string): void {
  // 끝에 붙은 슬래시는 떼어 둡니다 (경로를 붙일 때 "//" 가 되지 않도록)
  const clean = (v || "").trim().replace(new RegExp("/+$"), "");
  try {
    localStorage.setItem(BASE_KEY, clean);
  } catch (e) {}
}

export function getPercakapanKey(): string {
  try {
    return localStorage.getItem(KEY_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setPercakapanKey(v: string): void {
  try {
    localStorage.setItem(KEY_KEY, (v || "").trim());
  } catch (e) {}
}

export function hasPercakapanConfig(): boolean {
  return getPercakapanBase() !== "" && getPercakapanKey() !== "";
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
      if (!db.objectStoreNames.contains(SCENE_STORE)) {
        const store = db.createObjectStore(SCENE_STORE, { keyPath: "id" });
        store.createIndex("cat", "cat", { unique: false });
      }
      if (!db.objectStoreNames.contains(CAT_STORE)) {
        db.createObjectStore(CAT_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

export async function getCustomScenes(): Promise<PercakapanScene[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(SCENE_STORE, "readonly");
      const req = tx.objectStore(SCENE_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as PercakapanScene[];
        all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function saveCustomScene(s: PercakapanScene): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SCENE_STORE, "readwrite");
      tx.objectStore(SCENE_STORE).put(s);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // 저장 못 해도 이번 화면에서 보는 데는 지장이 없습니다
  }
}

export async function deleteCustomScene(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SCENE_STORE, "readwrite");
      tx.objectStore(SCENE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // 무시
  }
}

export async function getCustomCats(): Promise<PercakapanCategory[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(CAT_STORE, "readonly");
      const req = tx.objectStore(CAT_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []) as PercakapanCategory[]);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function saveCustomCat(c: PercakapanCategory): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CAT_STORE, "readwrite");
      tx.objectStore(CAT_STORE).put(c);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}
}

export async function deleteCustomCat(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CAT_STORE, "readwrite");
      tx.objectStore(CAT_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}
}

// ---------- 합쳐 보기 ----------

/**
 * 기본 카테고리 + 사용자 카테고리.
 * 기본 카테고리 중 장면이 하나도 없는 것(아직 데이터가 없는 6개)은 숨깁니다.
 * 사용자 카테고리는 장면이 0개여도 남깁니다 — 방금 만들어 놓고 채우는 중일 수 있어서입니다.
 */
export async function listCategories(): Promise<Array<PercakapanCategory & { count: number }>> {
  const customScenes = await getCustomScenes();
  const customCats = await getCustomCats();

  const countOf = (catId: string) => {
    let n = builtinScenesOf(catId).length;
    for (let i = 0; i < customScenes.length; i++) {
      if (customScenes[i].cat === catId) n++;
    }
    return n;
  };

  const out: Array<PercakapanCategory & { count: number }> = [];

  for (let i = 0; i < BUILTIN_CATEGORIES.length; i++) {
    const c = BUILTIN_CATEGORIES[i];
    const count = countOf(c.id);
    if (count === 0) continue;
    out.push({ ...c, count });
  }

  for (let i = 0; i < customCats.length; i++) {
    const c = customCats[i];
    if (findBuiltinCategory(c.id)) continue; // 기본과 id 가 겹치면 위에서 이미 셌습니다
    out.push({ ...c, custom: true, count: countOf(c.id) });
  }

  return out;
}

/** 카테고리 하나 찾기 (사용자 것이 우선) */
export async function findCategory(catId: string): Promise<PercakapanCategory | null> {
  const builtin = findBuiltinCategory(catId);
  if (builtin) return builtin;
  const customCats = await getCustomCats();
  for (let i = 0; i < customCats.length; i++) {
    if (customCats[i].id === catId) return customCats[i];
  }
  return null;
}

/** 기본 장면이 먼저, 사용자 장면은 만든 순서대로 뒤에 붙습니다. */
export async function listScenes(catId: string): Promise<PercakapanScene[]> {
  const builtin = builtinScenesOf(catId);
  const customScenes = await getCustomScenes();
  const mine = customScenes
    .filter((s) => s.cat === catId)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return builtin.concat(mine);
}

/** 사용자 장면을 먼저 보고, 없으면 기본에서 찾습니다. */
export async function findScene(id: string): Promise<PercakapanScene | null> {
  const customScenes = await getCustomScenes();
  for (let i = 0; i < customScenes.length; i++) {
    if (customScenes[i].id === id) return customScenes[i];
  }
  return findBuiltinScene(id);
}

// ---------- 백업 / 복원 ----------

export interface BackupPayload {
  v: number;
  savedAt: number;
  cats: PercakapanCategory[];
  scenes: PercakapanScene[];
}

/** 서버에 저장해 둔 백업을 읽어옵니다. 없으면 savedAt 이 0 으로 옵니다. */
export async function fetchBackup(): Promise<BackupPayload> {
  const base = getPercakapanBase();
  const key = getPercakapanKey();
  if (!base || !key) throw new Error("NO_CONFIG");

  let res: Response;
  try {
    res = await fetch(base + "/percakapan", { headers: { "x-kata-key": key } });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("FETCH_FAILED");

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }

  return {
    v: Number((data && data.v) || 1),
    savedAt: Number((data && data.savedAt) || 0),
    cats: Array.isArray(data && data.cats) ? (data.cats as PercakapanCategory[]) : [],
    scenes: Array.isArray(data && data.scenes) ? (data.scenes as PercakapanScene[]) : [],
  };
}

/**
 * 이 기기의 사용자 회화집·카테고리 전부를 서버에 올립니다.
 * 로컬이 비었는데 서버에 백업이 있으면 서버가 409 로 막습니다.
 * 그때는 Error("WOULD_ERASE") 에 existing 개수를 실어 던지고,
 * 호출한 쪽에서 사용자에게 한 번 더 물어본 뒤 force=true 로 다시 부릅니다.
 */
export async function pushBackup(
  force?: boolean
): Promise<{ cats: number; scenes: number; savedAt: number }> {
  const base = getPercakapanBase();
  const key = getPercakapanKey();
  if (!base || !key) throw new Error("NO_CONFIG");

  const scenes = await getCustomScenes();
  const cats = await getCustomCats();

  let res: Response;
  try {
    res = await fetch(base + "/percakapan" + (force ? "?force=1" : ""), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-kata-key": key },
      body: JSON.stringify({ cats, scenes }),
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }

  if (res.status === 401) throw new Error("UNAUTHORIZED");

  if (res.status === 409) {
    let existing = 0;
    try {
      const d = await res.json();
      existing = Number((d && d.existingScenes) || 0);
    } catch (e) {}
    const err: any = new Error("WOULD_ERASE");
    err.erased = true;
    err.existing = existing;
    throw err;
  }

  if (!res.ok) throw new Error("FETCH_FAILED");

  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {}

  return {
    cats: cats.length,
    scenes: scenes.length,
    savedAt: Number((data && data.savedAt) || Date.now()),
  };
}

/**
 * 서버 백업을 이 기기에 더합니다.
 * 같은 id 가 이미 있으면 건너뜁니다 — 기기에 있는 것을 덮어쓰지 않습니다.
 */
export async function restoreBackup(): Promise<{
  addedScenes: number;
  addedCats: number;
  skipped: number;
}> {
  const backup = await fetchBackup();

  const haveScenes = new Set<string>();
  (await getCustomScenes()).forEach((s) => haveScenes.add(s.id));
  const haveCats = new Set<string>();
  (await getCustomCats()).forEach((c) => haveCats.add(c.id));

  let addedScenes = 0;
  let addedCats = 0;
  let skipped = 0;

  for (const c of backup.cats) {
    if (!c || typeof c.id !== "string" || !c.id) continue;
    if (haveCats.has(c.id) || findBuiltinCategory(c.id)) {
      skipped++;
      continue;
    }
    await saveCustomCat({ ...c, custom: true });
    haveCats.add(c.id);
    addedCats++;
  }

  for (const s of backup.scenes) {
    if (!s || typeof s.id !== "string" || !s.id) continue;
    if (haveScenes.has(s.id) || findBuiltinScene(s.id)) {
      skipped++;
      continue;
    }
    await saveCustomScene({ ...s, custom: true });
    haveScenes.add(s.id);
    addedScenes++;
  }

  return { addedScenes, addedCats, skipped };
}

// ---------- 회화집 생성 (Gemini) ----------

function buildScenePrompt(opts: {
  name: string;
  situation?: string;
  level: PercakapanLevel;
}): string {
  const levelRule =
    opts.level === "상"
      ? "난이도 상: 문장이 길고 화제 전환이 있으며, 되묻기·끼어들기를 포함하세요. 축약형·관용 표현·수동태(di-)를 섞어 쓰세요."
      : "난이도 중: 짧고 명확한 문장으로, 한 문장에 한 가지 뜻만 담으세요.";

  const situationLine = (opts.situation || "").trim()
    ? '상황: "' + (opts.situation || "").trim() + '"\n'
    : "";

  return (
    "당신은 인도네시아에 사는 한국인을 위한 회화 교재 작가입니다.\n" +
    "아래 주제로 두 사람(A, B)이 주고받는 인도네시아어 대화를 만들고, JSON 으로만 출력하세요.\n" +
    "다른 설명이나 마크다운 없이 순수 JSON 객체 하나만 출력합니다.\n\n" +
    '주제: "' +
    opts.name.trim() +
    '"\n' +
    situationLine +
    "\n" +
    "작성 규칙:\n" +
    "- 인도네시아 현지에서 실제로 쓰는 구어체로 쓰세요.\n" +
    "- 교재체(tidak / saja / terima kasih / apakah)는 쓰지 말고, " +
    "실제 회화체(nggak / aja / makasih / gimana / udah / banget / kok / sih / dong / deh / yuk)를 쓰세요.\n" +
    "- 호칭은 상황에 맞게 Mas / Mbak / Bang / Pak / Bu 를 쓰세요.\n" +
    "- " +
    levelRule +
    "\n" +
    "- 한국어 해석은 자연스러운 구어체로 쓰고, 직역투를 피하세요.\n" +
    "- 화자는 A 와 B 두 명뿐입니다. C 는 쓰지 마세요.\n" +
    "- A 와 B 는 반드시 서로 다른 성별로 정하세요 (m = 남자, f = 여자).\n" +
    "- 대화는 A 로 시작해 A 와 B 가 번갈아 주고받고, 전체 문장 수는 10~14 문장입니다.\n" +
    "- roles 는 각 화자가 누구인지 한국어로 짧게 적으세요 (예: 손님, 점원).\n" +
    "- titleId 는 이 대화의 인도네시아어 제목입니다.\n\n" +
    "출력 형식:\n" +
    "{\n" +
    '  "titleId": "인도네시아어 제목",\n' +
    '  "roles": { "A": "역할 한국어", "B": "역할 한국어" },\n' +
    '  "voices": { "A": "m", "B": "f" },\n' +
    '  "lines": [ { "s": "A", "id": "인도네시아어 문장", "ko": "한국어 해석" } ]\n' +
    "}"
  );
}

async function callGenerate(prompt: string): Promise<string> {
  try {
    return await callGeminiText(prompt, {
      timeoutMs: GEN_TIMEOUT_MS,
      maxOutputTokens: 8192,
    });
  } catch (e: any) {
    const code = (e && e.message) || "";
    // Percakapan.tsx 가 쓰는 기존 코드 이름으로 되돌려 줍니다.
    if (code === "NETWORK") throw new Error("NETWORK_FAILED");
    if (code === "BAD_REQUEST") throw new Error("INVALID_API_KEY");
    throw e;
  }
}

function parseJsonLoose(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const m = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!m) throw new Error("PARSE_FAILED");
    return JSON.parse(m[0]);
  }
}

function toGender(v: any, fallback: PercakapanGender): PercakapanGender {
  return v === "m" || v === "f" ? v : fallback;
}

export async function generateScene(opts: {
  name: string;
  catId: string;
  situation?: string;
  level: PercakapanLevel;
}): Promise<PercakapanScene> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const name = (opts.name || "").trim();
  if (!name) throw new Error("EMPTY_NAME");

  const text = await callGenerate(
    buildScenePrompt({ name, situation: opts.situation, level: opts.level })
  );
  const parsed = parseJsonLoose(text);

  const rawLines = Array.isArray(parsed && parsed.lines) ? parsed.lines : [];
  const lines: PercakapanLine[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (!l) continue;
    const idText = (l.id || "").toString().trim();
    const koText = (l.ko || "").toString().trim();
    if (!idText) continue;
    // 화자는 두 명만 씁니다. C 가 오면 A 로 접습니다.
    const s: PercakapanSpeaker = l.s === "B" ? "B" : "A";
    lines.push({ s, id: idText, ko: koText });
  }
  if (lines.length === 0) throw new Error("EMPTY_LINES");

  // A 와 B 의 목소리는 반드시 서로 달라야 합니다 (같으면 누가 말하는지 들리지 않습니다)
  const rawVoices = (parsed && parsed.voices) || {};
  const va = toGender(rawVoices.A, "m");
  let vb = toGender(rawVoices.B, "f");
  if (vb === va) vb = va === "m" ? "f" : "m";

  const rawRoles = (parsed && parsed.roles) || {};
  const roleA = (rawRoles.A || "").toString().trim() || "A";
  const roleB = (rawRoles.B || "").toString().trim() || "B";

  const titleId = ((parsed && parsed.titleId) || "").toString().trim() || name;

  return {
    id: "custom-" + Date.now().toString(36),
    cat: opts.catId,
    title: name,
    titleId,
    roles: { A: roleA, B: roleB },
    voices: { A: va, B: vb },
    level: opts.level,
    lines,
    custom: true,
    createdAt: Date.now(),
  };
}

export type {
  PercakapanCategory,
  PercakapanScene,
  PercakapanLine,
  PercakapanLevel,
  PercakapanSpeaker,
  PercakapanGender,
};
