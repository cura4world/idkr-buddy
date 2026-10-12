// src/lib/transfer.ts
// 개인 데이터 옮기기 — "새 폰으로 보내기 / 이전 폰 데이터 받기" 와 백업 파일 저장·되돌리기.
//
// 담는 것은 사용자가 직접 만든 것뿐입니다. 앱에 내장된 기본·개인 폴더 단어(seed),
// 서버에서 다시 받는 성경·교재·회화집, 다시 만들 수 있는 캐시(사전·이야기·음성 등)는 뺍니다.
//
//   단어장   직접 만든 단어장·직접 넣은 단어·단어장 순서·'다시 외울' 표시
//   IndexedDB 성경 형광펜 · 저장한 기도문 · 설교문 필기 · 훈장(확정 단어·게임 기록)
//   설정     글자 크기·음성·성경 보기 조합 같은 화면 설정, 저장한 표현, 최근 검색어
//
// 훈장의 "일별 점수"는 담지 않습니다. 기기마다 서버의 자기 칸에 올라가 있고, 새 기기는
// 그 칸을 "다른 기기 몫"으로 합산합니다. 일별 점수까지 옮기면 같은 날이 두 번 더해집니다.
// 그래서 보내기 직전에 이 기기 몫을 서버에 한 번 밀어 올립니다(pushMyLogs).
//
// 되돌릴 때는 덮어쓰지 않고 합칩니다. 같은 단어장의 같은 단어는 하나만 남기고,
// 이미 있는 기도문·필기·훈장 기록은 그대로 둡니다. 화면 설정만 보낸 쪽 값으로 바꿉니다.
// 적용 뒤에는 기본 단어장 동기화를 다시 돌리도록 표시를 지우므로, 호출한 쪽이 앱을 새로 고쳐야 합니다.

import {
  Category,
  Word,
  getCategories,
  saveCategories,
  getWords,
  saveWords,
  getSavedWordIds,
  setSavedWordIds,
  isBuiltInWord,
  isBuiltInCategory,
} from "@/lib/store";
import { MEMBER_BASE, memberHeaders } from "@/lib/member";
import { pushMyLogs } from "@/lib/medaliSync";

const MY_WORDBOOK_ID = "my-wordbook";
const SEED_SYNC_KEY = "shared_seed_version";

// ---------- 묶음 형식 ----------

export interface PersonalBundle {
  app: "kata-kata";
  kind: "personal-backup";
  v: 1;
  createdAt: number;
  words: { categories: Category[]; words: Word[]; saved: string[] };
  ls: Record<string, string>;
  idb: Record<string, Record<string, unknown[]>>;
}

export interface BundleSummary {
  categories: number;   // 직접 만든 단어장
  words: number;        // 직접 넣은 단어
  saved: number;        // '다시 외울' 표시
  highlights: number;   // 형광펜을 칠한 장
  prayers: number;      // 저장한 기도문
  ink: number;          // 필기가 있는 설교문
  medali: number;       // 훈장 확정 단어·게임 기록
  phrases: number;      // 저장한 표현
}

// 보낸 쪽 값으로 바꾸는 화면 설정
const SETTING_KEYS = [
  "app-font-scale-step",
  "app-wide-mode",
  "tts-voice",
  "story-difficulty",
  "quiz-speak",
  "cocokkan-level",
  "bible-view-set",
  "bible-font-step",
  "bible-last-pos",
  "prayer-id-font-step",
  "sermon-font-step",
  "sermon-ink-tool",
  "onetoone-last-page",
  "onetoone-zoom",
  "phrase-kinds",
  "dict-save-target",
  "my-archived-collapsed",
];
// 받는 쪽이 비어 있을 때만 채우는 값 (회원키가 있으면 회원 정보가 먼저 채웁니다)
const FILL_IF_EMPTY_KEYS = ["private_folder_name", "medali-my-id"];
// 목록을 합치는 값
const PHRASE_SAVED_KEY = "phrase-saved";
const DICT_HISTORY_KEY = "dict-search-history";
const DICT_HISTORY_MAX = 50;

// IndexedDB — 각 모듈과 같은 이름·같은 판(1)·같은 구조입니다.
// 받는 기기에 아직 DB 가 없으면 여기서 같은 구조로 만들어 둡니다.
interface StoreSpec { name: string; keyPath: string; indexes?: string[] }
interface DbSpec { db: string; stores: StoreSpec[]; take: string[] }

const DB_SPECS: DbSpec[] = [
  { db: "kata-bible-hl", stores: [{ name: "chapters", keyPath: "key" }], take: ["chapters"] },
  { db: "kata-prayers", stores: [{ name: "prayers", keyPath: "id", indexes: ["createdAt"] }], take: ["prayers"] },
  { db: "kata-sermon-ink", stores: [{ name: "ink", keyPath: "id" }], take: ["ink"] },
  {
    db: "kata-medali",
    stores: [
      { name: "daily", keyPath: "date" },
      { name: "words", keyPath: "word" },
      { name: "rounds", keyPath: "id" },
    ],
    take: ["words", "rounds"], // daily 는 서버 칸으로 합산되므로 담지 않습니다
  },
];

// ---------- IndexedDB 도우미 ----------

function openSpec(spec: DbSpec): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    // 판을 지정하지 않고 엽니다 — 이미 있으면 지금 판 그대로, 없으면 1판으로 새로 만듭니다.
    const req = indexedDB.open(spec.db);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of spec.stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          const os = db.createObjectStore(s.name, { keyPath: s.keyPath });
          for (const ix of s.indexes || []) os.createIndex(ix, ix, { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
}

function readAll(db: IDBDatabase, store: string): Promise<unknown[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) { resolve([]); return; }
    try {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/** rows 를 한 트랜잭션으로 합칩니다. pick(옛 값, 새 값) 이 돌려준 값을 씁니다(null 이면 건너뜀). */
function mergeInto(
  db: IDBDatabase,
  store: string,
  keyPath: string,
  rows: unknown[],
  pick: (local: unknown | undefined, incoming: Record<string, unknown>) => unknown | null,
): Promise<number> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store) || rows.length === 0) { resolve(0); return; }
    let written = 0;
    try {
      const tx = db.transaction(store, "readwrite");
      const os = tx.objectStore(store);
      for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const rec = r as Record<string, unknown>;
        const key = rec[keyPath];
        if (typeof key !== "string" && typeof key !== "number") continue;
        const g = os.get(key as IDBValidKey);
        g.onsuccess = () => {
          const out = pick(g.result === undefined ? undefined : g.result, rec);
          if (out) { os.put(out); written++; }
        };
      }
      tx.oncomplete = () => resolve(written);
      tx.onerror = () => resolve(written);
      tx.onabort = () => resolve(written);
    } catch (e) {
      resolve(written);
    }
  });
}

// ---------- 모으기 ----------

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export async function collectBundle(): Promise<{ bundle: PersonalBundle; summary: BundleSummary }> {
  const categories = getCategories();
  const words = getWords().filter((w) => !isBuiltInWord(w));
  const saved = getSavedWordIds();

  const ls: Record<string, string> = {};
  for (const k of SETTING_KEYS.concat(FILL_IF_EMPTY_KEYS, [PHRASE_SAVED_KEY, DICT_HISTORY_KEY])) {
    const v = lsGet(k);
    if (v !== null && v !== "") ls[k] = v;
  }

  const idb: Record<string, Record<string, unknown[]>> = {};
  for (const spec of DB_SPECS) {
    let db: IDBDatabase | null = null;
    try {
      db = await openSpec(spec);
      const part: Record<string, unknown[]> = {};
      for (const s of spec.take) {
        const rows = await readAll(db, s);
        if (rows.length > 0) part[s] = rows;
      }
      if (Object.keys(part).length > 0) idb[spec.db] = part;
    } catch (e) {
      // 못 여는 DB 는 건너뜁니다
    } finally {
      try { if (db) db.close(); } catch (e) {}
    }
  }

  const bundle: PersonalBundle = {
    app: "kata-kata",
    kind: "personal-backup",
    v: 1,
    createdAt: Date.now(),
    words: { categories, words, saved },
    ls,
    idb,
  };
  return { bundle, summary: summarize(bundle) };
}

function countOf(b: PersonalBundle, db: string, store: string): number {
  const part = b.idb[db];
  const rows = part && part[store];
  return Array.isArray(rows) ? rows.length : 0;
}

export function summarize(b: PersonalBundle): BundleSummary {
  // 어느 기기에나 있는 단어장(기본·예시·내 단어장 등)은 세지 않습니다
  const personalCats = b.words.categories.filter((c) => !isBuiltInCategory(c));
  return {
    categories: personalCats.length,
    words: b.words.words.length,
    saved: b.words.saved.length,
    highlights: countOf(b, "kata-bible-hl", "chapters"),
    prayers: countOf(b, "kata-prayers", "prayers"),
    ink: countOf(b, "kata-sermon-ink", "ink"),
    medali: countOf(b, "kata-medali", "words") + countOf(b, "kata-medali", "rounds"),
    phrases: parseArray(b.ls[PHRASE_SAVED_KEY] || null).length,
  };
}

/** 사람이 읽는 한 줄 요약 ("단어 214개 · 단어장 6개 · 형광펜 12장") */
export function describeSummary(s: BundleSummary): string {
  const parts: string[] = [];
  parts.push("단어 " + s.words + "개");
  if (s.categories > 0) parts.push("단어장 " + s.categories + "개");
  if (s.saved > 0) parts.push("다시 외울 표시 " + s.saved + "개");
  if (s.highlights > 0) parts.push("형광펜 " + s.highlights + "장");
  if (s.prayers > 0) parts.push("기도문 " + s.prayers + "개");
  if (s.phrases > 0) parts.push("저장한 표현 " + s.phrases + "개");
  if (s.ink > 0) parts.push("설교문 필기 " + s.ink + "편");
  if (s.medali > 0) parts.push("훈장 기록 " + s.medali + "건");
  return parts.join(" · ");
}

// ---------- 묶음 읽기 (JSON · gzip · CSV) ----------

function isBundle(o: unknown): o is PersonalBundle {
  const b = o as PersonalBundle;
  return !!b && b.app === "kata-kata" && b.kind === "personal-backup" &&
    !!b.words && Array.isArray(b.words.categories) && Array.isArray(b.words.words);
}

function normalizeBundle(b: PersonalBundle): PersonalBundle {
  return {
    app: "kata-kata",
    kind: "personal-backup",
    v: 1,
    createdAt: Number(b.createdAt) || 0,
    words: {
      categories: b.words.categories.filter((c) => c && typeof c.id === "string" && typeof c.name === "string"),
      words: b.words.words.filter((w) => w && typeof w.word === "string" && w.word.trim() !== "" && typeof w.categoryId === "string"),
      saved: Array.isArray(b.words.saved) ? b.words.saved.filter((x) => typeof x === "string") : [],
    },
    ls: b.ls && typeof b.ls === "object" ? b.ls : {},
    idb: b.idb && typeof b.idb === "object" ? b.idb : {},
  };
}

// 따옴표 안의 쉼표·줄바꿈까지 처리하는 CSV 읽기 (exportWordsToCSV 형식)
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur.trim()); cur = ""; }
    else if (ch === NL || ch === CR) {
      if (ch === CR && text[i + 1] === NL) i++;
      row.push(cur.trim());
      cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur.trim());
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

/** 단어 CSV(복사 백업)를 묶음으로 바꿉니다. 단어장은 이름으로 맞춥니다. */
function csvToBundle(csv: string): PersonalBundle | null {
  const rows = parseCsvRows(csv);
  const cats: Category[] = [];
  const catByName: Record<string, Category> = {};
  const words: Word[] = [];
  const saved: string[] = [];
  const now = Date.now();
  for (let i = 0; i < rows.length; i++) {
    const [word, meaning, example, exampleMeaning, catName, catEmoji, marked] = rows[i];
    if (!word || meaning === undefined) continue;
    const name = (catName || "").trim() || "내 단어장";
    let cat = catByName[name];
    if (!cat) {
      cat = { id: "csv:" + name, name, emoji: (catEmoji || "").trim() || "📁" };
      catByName[name] = cat;
      cats.push(cat);
    }
    const id = "csv:" + i;
    words.push({
      id,
      word,
      meaning: meaning || "",
      example: example || "",
      exampleMeaning: exampleMeaning || "",
      categoryId: cat.id,
      createdAt: now,
    });
    if ((marked || "").trim() === "1") saved.push(id);
  }
  if (words.length === 0) return null;
  return {
    app: "kata-kata", kind: "personal-backup", v: 1, createdAt: now,
    words: { categories: cats, words, saved }, ls: {}, idb: {},
  };
}

/** 붙여넣은 글이나 파일 내용(글)을 묶음으로 읽습니다. JSON 백업이든 단어 CSV 든 받습니다. */
export function parseBackupText(text: string): PersonalBundle | null {
  const BOM = String.fromCharCode(0xfeff);
  const t = (text || "").trim();
  const body = t.indexOf(BOM) === 0 ? t.slice(1).trim() : t;
  if (!body) return null;
  if (body.charAt(0) === "{") {
    try {
      const o = JSON.parse(body);
      return isBundle(o) ? normalizeBundle(o) : null;
    } catch (e) {
      return null;
    }
  }
  return csvToBundle(body);
}

/** 파일·서버에서 받은 바이트를 묶음으로 읽습니다. gzip 이면 풉니다. */
export async function parseBackupBytes(bytes: Uint8Array): Promise<PersonalBundle | null> {
  let text: string;
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const DS = (globalThis as unknown as { DecompressionStream?: new (f: string) => TransformStream }).DecompressionStream;
    if (!DS) throw new Error("NO_GZIP");
    const stream = new Blob([bytes]).stream().pipeThrough(new DS("gzip"));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder("utf-8").decode(bytes);
  }
  return parseBackupText(text);
}

async function gzipText(text: string): Promise<Uint8Array> {
  const CS = (globalThis as unknown as { CompressionStream?: new (f: string) => TransformStream }).CompressionStream;
  if (!CS) return new TextEncoder().encode(text); // 받는 쪽은 첫 두 바이트로 압축 여부를 알아봅니다
  const stream = new Blob([text]).stream().pipeThrough(new CS("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---------- 합치기 ----------

function wordKey(categoryId: string, word: string): string {
  return categoryId + "|" + (word || "").trim().toLowerCase();
}

function newId(): string {
  try { return crypto.randomUUID(); } catch (e) { return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

/** 단어장·단어·'다시 외울' 표시를 합칩니다. 돌려주는 값: 새로 들어간 단어장 수, 단어 수 */
function mergeWords(b: PersonalBundle): { categories: number; words: number } {
  const localCats = getCategories();
  const localWords = getWords();
  const localIds = new Set(localWords.map((w) => w.id));
  const catIdMap: Record<string, string> = {};
  let addedCats = 0;

  const usedCatIds = new Set(b.words.words.map((w) => w.categoryId));
  for (const bc of b.words.categories) {
    const byId = localCats.find((c) => c.id === bc.id);
    if (byId) { catIdMap[bc.id] = byId.id; continue; }
    if (bc.isShared) {
      // 받는 기기에 아직 없는 기본·개인 폴더 단어장 — 그대로 넣어 두면 앱이 새로 켜질 때
      // 기본 단어장 동기화가 내용을 채우고, 기본에서 빠진 것이면 개인 단어장으로 바꿔 줍니다.
      // 단, 직접 넣은 단어가 없는 기본 단어장은 동기화에 맡기고 넣지 않습니다.
      if (!usedCatIds.has(bc.id)) continue;
      localCats.push({ ...bc });
      catIdMap[bc.id] = bc.id;
      continue;
    }
    const byName = localCats.find((c) => !c.isShared && c.name === bc.name);
    if (byName) { catIdMap[bc.id] = byName.id; continue; }
    const id = bc.id.indexOf("csv:") === 0 ? newId() : bc.id;
    localCats.push({ id, name: bc.name, emoji: bc.emoji || "📁" });
    catIdMap[bc.id] = id;
    addedCats++;
  }

  // 단어장 순서: 보낸 쪽 순서를 앞에, 받는 쪽에만 있는 것은 그 뒤에. '내 단어장'은 맨 위.
  const order: string[] = [];
  for (const bc of b.words.categories) {
    const id = catIdMap[bc.id];
    if (id && order.indexOf(id) === -1) order.push(id);
  }
  const ordered: Category[] = [];
  for (const id of order) {
    const c = localCats.find((x) => x.id === id);
    if (c) ordered.push(c);
  }
  for (const c of localCats) if (order.indexOf(c.id) === -1) ordered.push(c);
  const myIdx = ordered.findIndex((c) => c.id === MY_WORDBOOK_ID);
  if (myIdx > 0) ordered.unshift(ordered.splice(myIdx, 1)[0]);

  const have = new Set(localWords.map((w) => wordKey(w.categoryId, w.word)));
  const wordIdMap: Record<string, string> = {};
  const added: Word[] = [];
  for (const bw of b.words.words) {
    const catId = catIdMap[bw.categoryId];
    if (!catId) continue;
    const k = wordKey(catId, bw.word);
    if (have.has(k)) {
      const existing = localWords.find((w) => wordKey(w.categoryId, w.word) === k);
      if (existing) wordIdMap[bw.id] = existing.id;
      continue;
    }
    have.add(k);
    const id = bw.id && bw.id.indexOf("csv:") !== 0 && !localIds.has(bw.id) ? bw.id : newId();
    localIds.add(id);
    wordIdMap[bw.id] = id;
    added.push({
      id,
      word: bw.word,
      meaning: bw.meaning || "",
      example: bw.example || "",
      exampleMeaning: bw.exampleMeaning || "",
      categoryId: catId,
      createdAt: Number(bw.createdAt) || Date.now(),
    });
  }

  saveCategories(ordered);
  saveWords(localWords.concat(added));

  // '다시 외울' 표시: 직접 넣은 단어는 바뀐 id 로, 기본 단어는 id 그대로(기기마다 같은 id)
  const savedNow = getSavedWordIds();
  for (const sid of b.words.saved) savedNow.push(wordIdMap[sid] || sid);
  setSavedWordIds(savedNow);

  return { categories: addedCats, words: added.length };
}

function mergeLocalStorage(b: PersonalBundle): void {
  for (const k of SETTING_KEYS) {
    const v = b.ls[k];
    if (typeof v === "string" && v !== "") lsSet(k, v);
  }
  for (const k of FILL_IF_EMPTY_KEYS) {
    const v = b.ls[k];
    const cur = lsGet(k);
    if (typeof v === "string" && v !== "" && (!cur || cur === "-")) lsSet(k, v);
  }
  // 저장한 표현: id 기준 합치기 (받는 쪽 것을 앞에)
  const mine = parseArray(lsGet(PHRASE_SAVED_KEY)) as { id?: string }[];
  const theirs = parseArray(b.ls[PHRASE_SAVED_KEY] || null) as { id?: string }[];
  if (theirs.length > 0) {
    const seen = new Set(mine.map((p) => p && p.id));
    const merged = mine.slice();
    for (const p of theirs) {
      if (p && typeof p.id === "string" && !seen.has(p.id)) { merged.push(p); seen.add(p.id); }
    }
    lsSet(PHRASE_SAVED_KEY, JSON.stringify(merged));
  }
  // 최근 검색어: 받는 쪽 것을 앞에, 겹치면 하나, 최대 50개
  const hMine = parseArray(lsGet(DICT_HISTORY_KEY)).filter((x) => typeof x === "string") as string[];
  const hTheirs = parseArray(b.ls[DICT_HISTORY_KEY] || null).filter((x) => typeof x === "string") as string[];
  if (hTheirs.length > 0) {
    const out: string[] = [];
    for (const h of hMine.concat(hTheirs)) if (out.indexOf(h) === -1) out.push(h);
    lsSet(DICT_HISTORY_KEY, JSON.stringify(out.slice(0, DICT_HISTORY_MAX)));
  }
}

async function mergeIndexedDb(b: PersonalBundle): Promise<void> {
  for (const spec of DB_SPECS) {
    const part = b.idb[spec.db];
    if (!part) continue;
    let db: IDBDatabase | null = null;
    try {
      db = await openSpec(spec);
      for (const s of spec.take) {
        const rows = part[s];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const keyPath = (spec.stores.find((x) => x.name === s) || { keyPath: "id" }).keyPath;
        if (spec.db === "kata-bible-hl") {
          // 같은 장이면 두 쪽 형광펜을 합칩니다 (겹치는 어절은 받는 쪽 색)
          await mergeInto(db, s, keyPath, rows, (local, inc) => {
            const lm = local && typeof local === "object" ? ((local as { marks?: Record<string, string> }).marks || {}) : {};
            const im = (inc as { marks?: Record<string, string> }).marks || {};
            return { ...inc, marks: { ...im, ...lm }, savedAt: Date.now() };
          });
        } else if (spec.db === "kata-medali" && s === "words") {
          // 확정 단어: 없으면 넣고, 있으면 정답을 더 많이 쌓은 쪽을 남깁니다
          await mergeInto(db, s, keyPath, rows, (local, inc) => {
            if (!local) return inc;
            const lc = Number((local as { corrects?: number }).corrects) || 0;
            const ic = Number((inc as { corrects?: number }).corrects) || 0;
            return ic > lc ? inc : null;
          });
        } else {
          // 기도문·필기·게임 기록: 없는 것만 넣습니다
          await mergeInto(db, s, keyPath, rows, (local, inc) => (local ? null : inc));
        }
      }
    } catch (e) {
      // 한 DB 가 실패해도 나머지는 계속합니다
    } finally {
      try { if (db) db.close(); } catch (e) {}
    }
  }
}

/**
 * 묶음을 이 기기에 합칩니다. 끝나면 기본 단어장 동기화 표시를 지우므로,
 * 호출한 쪽에서 앱을 새로 고쳐야(window.location.reload) 화면에 반영됩니다.
 */
export async function applyBundle(b: PersonalBundle): Promise<BundleSummary> {
  const s = summarize(b);
  const w = mergeWords(b);
  mergeLocalStorage(b);
  await mergeIndexedDb(b);
  try { localStorage.removeItem(SEED_SYNC_KEY); } catch (e) {}
  return { ...s, categories: w.categories, words: w.words };
}

// ---------- 서버 (회원키) ----------

export interface TransferInfo {
  exists: boolean;
  savedAt: number;
  bytes: number;
  until: number;
  fromSelf: boolean;
}

async function memberRequest(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const h = memberHeaders();
  if (!h) throw new Error("NOT_MEMBER");
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  try {
    return await fetch(MEMBER_BASE + path, {
      ...init,
      headers: Object.assign({}, h, (init.headers as Record<string, string>) || {}),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

function checkStatus(res: Response): void {
  if (res.status === 401 || res.status === 403 || res.status === 409) throw new Error("REVOKED");
  if (res.status === 413) throw new Error("TOO_BIG");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("FETCH_FAILED");
}

/** 보관함 상태. 회원이 아니거나 연결이 안 되면 null. */
export async function getTransferInfo(): Promise<TransferInfo | null> {
  try {
    const res = await memberRequest("/transfer/info", { method: "GET" }, 10000);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || !d.exists) return { exists: false, savedAt: 0, bytes: 0, until: 0, fromSelf: false };
    return {
      exists: true,
      savedAt: Number(d.savedAt) || 0,
      bytes: Number(d.bytes) || 0,
      until: Number(d.until) || 0,
      fromSelf: !!d.fromSelf,
    };
  } catch (e) {
    return null;
  }
}

/** 이 기기의 개인 데이터를 보관함에 올립니다. 에러: NOT_MEMBER · TOO_BIG · REVOKED · FETCH_FAILED */
export async function sendToNewPhone(): Promise<{ summary: BundleSummary; bytes: number; until: number }> {
  try { await pushMyLogs(true); } catch (e) {} // 훈장 일별 점수는 서버 칸으로 넘어갑니다
  const { bundle, summary } = await collectBundle();
  const bytes = await gzipText(JSON.stringify(bundle));
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("TOO_BIG");
  const res = await memberRequest("/transfer", {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: bytes,
  }, 120000);
  checkStatus(res);
  let until = 0;
  try { until = Number((await res.json()).until) || 0; } catch (e) {}
  return { summary, bytes: bytes.byteLength, until };
}

/**
 * 보관함을 받아 이 기기에 합치고, 다 끝나면 보관함을 지웁니다.
 * 적용 도중 실패하면 지우지 않습니다(다시 받을 수 있게).
 * 에러: NOT_MEMBER · NOT_FOUND · REVOKED · BAD_DATA · NO_GZIP · FETCH_FAILED
 */
export async function receiveFromOldPhone(): Promise<BundleSummary> {
  const res = await memberRequest("/transfer", { method: "GET" }, 120000);
  checkStatus(res);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const bundle = await parseBackupBytes(bytes);
  if (!bundle) throw new Error("BAD_DATA");
  const summary = await applyBundle(bundle);
  try { await memberRequest("/transfer", { method: "DELETE" }, 15000); } catch (e) {}
  return summary;
}

/** 보낸 쪽이 마음을 바꿨을 때 보관함을 비웁니다(자동 넘기기 허락도 함께 거둡니다). */
export async function cancelTransfer(): Promise<void> {
  const res = await memberRequest("/transfer", { method: "DELETE" }, 15000);
  checkStatus(res);
}

// ---------- 백업 파일 ----------

function pad2(n: number): string { return n < 10 ? "0" + n : String(n); }

/**
 * 백업 파일을 data: 주소로 만듭니다. 앱(APK)은 blob: 주소를 저장하지 못하고
 * data: 주소만 다운로드 폴더에 씁니다 — 그래서 base64 로 직접 만듭니다.
 */
export async function buildBackupFile(): Promise<{ href: string; fileName: string; summary: BundleSummary; bytes: number }> {
  const { bundle, summary } = await collectBundle();
  const utf8 = new TextEncoder().encode(JSON.stringify(bundle));
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < utf8.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(utf8.subarray(i, i + CHUNK)));
  }
  const d = new Date();
  const fileName = "kata-kata-backup-" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + ".json";
  return { href: "data:application/json;base64," + btoa(bin), fileName, summary, bytes: utf8.length };
}

/** 크기를 사람이 읽는 말로 */
export function formatBytes(n: number): string {
  if (n < 1024) return n + "B";
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + "KB";
  return (Math.round((n / (1024 * 1024)) * 10) / 10) + "MB";
}
