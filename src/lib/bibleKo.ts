// src/lib/bibleKo.ts
// 기기에 직접 불러온 한국어 성경(txt)을 파싱해 IndexedDB 에 담아 둡니다.
//
// 왜 기기 안에만 두는가 — 본문을 서버에 올리면 그건 전송(배포)이 됩니다.
// 파일을 고른 기기에서만 읽히도록, 네트워크를 타지 않는 자리에 둡니다.
// 덤으로 비행기 모드에서도 열리고, 호스팅 비용도 없습니다.
//
// 받는 형식 (한 줄에 한 절):
//   창1:1 <천지 창조> 태초에 하나님이 천지를 창조하시니라
//   신6:18-19 ...            ← 두세 절이 한 절로 인쇄된 곳. 앞 번호에 담습니다
//   창35:야곱의 <...> 아들은 열둘이라  ← 절번호 없는 뒷조각. 앞 절에 이어붙입니다
//
// 소제목(<...>)은 본문에서 떼어 title 로 따로 담습니다. 본문에 섞어 두면
// 형광펜이 쓰는 어절 번호가 밀려서 이미 칠해 둔 자리가 어긋납니다.

export interface KoVerse {
  verse: number;
  text: string;
  title?: string; // 이 절 위에 걸리는 소제목
}

export interface KoStats {
  books: number;
  chapters: number;
  verses: number;
  titles: number;
  merged: number;   // 절번호 없는 뒷조각을 앞 절에 이어붙인 수
  ranges: number;   // 18-19 처럼 합쳐진 절
  notes: number;    // 본문에 섞여 있던 각주 표시(1) 제거 수
  unknown: string[]; // 책 약자를 못 찾은 것
}

export interface KoMeta {
  label: string;   // 역본 이름 (화면 표기용)
  credit: string;  // 본문 아래 출처 한 줄
  savedAt: number;
  books: number;
  chapters: number;
  verses: number;
}

const DB_NAME = "kata-bible-ko";
const STORE = "chapters";
const META = "meta";
const META_MIRROR = "bible-ko-meta"; // 화면이 즉시 읽어야 해서 localStorage 에도 복사해 둡니다

// 정경 순서 그대로. [책 약자, 앱의 책 id]
// bible.ts 를 불러오지 않는 이유는 bible.ts 가 이 파일을 불러오기 때문입니다(순환 방지).
const BOOKS: [string, string][] = [
  ["창", "kejadian"], ["출", "keluaran"], ["레", "imamat"], ["민", "bilangan"],
  ["신", "ulangan"], ["수", "yosua"], ["삿", "hakim_hakim"], ["룻", "rut"],
  ["삼상", "1_samuel"], ["삼하", "2_samuel"], ["왕상", "1_raja_raja"], ["왕하", "2_raja_raja"],
  ["대상", "1_tawarikh"], ["대하", "2_tawarikh"], ["스", "ezra"], ["느", "nehemia"],
  ["에", "ester"], ["욥", "ayub"], ["시", "mazmur"], ["잠", "amsal"],
  ["전", "pengkotbah"], ["아", "kidung_agung"], ["사", "yesaya"], ["렘", "yeremia"],
  ["애", "ratapan"], ["겔", "yehezkiel"], ["단", "daniel"], ["호", "hosea"],
  ["욜", "yoel"], ["암", "amos"], ["옵", "obaja"], ["욘", "yunus"],
  ["미", "mikha"], ["나", "nahum"], ["합", "habakuk"], ["습", "zefanya"],
  ["학", "hagai"], ["슥", "zakaria"], ["말", "maleakhi"], ["마", "matius"],
  ["막", "markus"], ["눅", "lukas"], ["요", "yohanes"], ["행", "kisah_para_rasul"],
  ["롬", "roma"], ["고전", "1_korintus"], ["고후", "2_korintus"], ["갈", "galatia"],
  ["엡", "efesus"], ["빌", "filipi"], ["골", "kolose"], ["살전", "1_tesalonika"],
  ["살후", "2_tesalonika"], ["딤전", "1_timotius"], ["딤후", "2_timotius"], ["딛", "titus"],
  ["몬", "filemon"], ["히", "ibrani"], ["약", "yakobus"], ["벧전", "1_petrus"],
  ["벧후", "2_petrus"], ["요일", "1_yohanes"], ["요이", "2_yohanes"], ["요삼", "3_yohanes"],
  ["유", "yudas"], ["계", "wahyu"],
];

// 정규식 리터럴은 주입 과정에서 깨진 전례가 있어 전부 new RegExp 로 만듭니다.
const RE_VERSE = new RegExp("^([^0-9\\s]+)(\\d+):(\\d+)(?:-\\d+)?\\s+(.*)$");
const RE_TAIL = new RegExp("^([^0-9\\s]+)(\\d+):([^0-9].*)$"); // 절번호 없는 뒷조각
const RE_TITLE = new RegExp("<([^>]*)>", "g");
const RE_NOTE = new RegExp("([가-힣])\\d\\)", "g");           // 정의로 재판1)하리니
const RE_SPACE = new RegExp("\\s+", "g");
const RE_RANGE = new RegExp("^[^0-9\\s]+\\d+:\\d+-\\d+\\s");

function bookIdOf(abbr: string): string | null {
  for (let i = 0; i < BOOKS.length; i++) if (BOOKS[i][0] === abbr) return BOOKS[i][1];
  return null;
}

/** txt 한 덩어리를 { "rut:1": [절...] } 모양으로 바꿉니다. 저장은 하지 않습니다. */
export function parseKoBible(raw: string): { chapters: Record<string, KoVerse[]>; stats: KoStats } {
  const chapters: Record<string, KoVerse[]> = {};
  const stats: KoStats = {
    books: 0, chapters: 0, verses: 0, titles: 0,
    merged: 0, ranges: 0, notes: 0, unknown: [],
  };
  const seenBooks: Record<string, boolean> = {};
  const seenUnknown: Record<string, boolean> = {};
  const lines = raw.split("\n");
  let lastKey = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const m = RE_VERSE.exec(line);
    const t = m ? null : RE_TAIL.exec(line);
    if (!m && !t) continue;

    const abbr = m ? m[1] : (t as RegExpExecArray)[1];
    const chapter = parseInt(m ? m[2] : (t as RegExpExecArray)[2], 10);
    let body = m ? m[4] : (t as RegExpExecArray)[3];

    const bookId = bookIdOf(abbr);
    if (!bookId) {
      if (!seenUnknown[abbr]) { seenUnknown[abbr] = true; stats.unknown.push(abbr); }
      continue;
    }

    // 소제목을 떼어냅니다. 한 절에 둘 이상이면 이어 붙입니다.
    let title = "";
    body = body.replace(RE_TITLE, (_all, inner) => {
      const s = String(inner).trim();
      if (s) title = title ? title + " · " + s : s;
      return " ";
    });
    // 본문에 섞여 있는 각주 표시 제거 (한글 바로 뒤의 "숫자)" 만)
    const before = body;
    body = body.replace(RE_NOTE, "$1");
    if (body !== before) stats.notes++;
    body = body.replace(RE_SPACE, " ").trim();

    const key = bookId + ":" + chapter;
    if (!chapters[key]) { chapters[key] = []; stats.chapters++; }
    if (!seenBooks[bookId]) { seenBooks[bookId] = true; stats.books++; }
    const list = chapters[key];

    if (m) {
      if (RE_RANGE.test(line)) stats.ranges++;
      const v: KoVerse = { verse: parseInt(m[3], 10), text: body };
      if (title) { v.title = title; stats.titles++; }
      list.push(v);
      stats.verses++;
      lastKey = key;
    } else {
      // 절번호 없는 뒷조각 — 바로 앞 절에 이어붙입니다.
      const prev = key === lastKey && list.length > 0 ? list[list.length - 1] : null;
      if (!prev) continue;
      prev.text = (prev.text + " " + body).trim();
      if (title && !prev.title) { prev.title = title; stats.titles++; }
      stats.merged++;
    }
  }

  // 절 번호 순으로 정렬 (원본이 어긋나 있어도 화면 순서는 지켜집니다)
  Object.keys(chapters).forEach((k) => {
    chapters[k].sort((a, b) => a.verse - b.verse);
  });
  return { chapters, stats };
}

/** 파일 이름에서 역본 이름을 짐작합니다. 못 찾으면 "한국어 성경". */
export function guessLabel(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.indexOf("nkrv") >= 0 || fileName.indexOf("개역개정") >= 0) return "개역개정";
  if (n.indexOf("krv") >= 0 || fileName.indexOf("개역한글") >= 0) return "개역한글";
  if (fileName.indexOf("새번역") >= 0) return "새번역";
  if (fileName.indexOf("우리말") >= 0) return "우리말성경";
  return "한국어 성경";
}

function creditOf(label: string): string {
  if (label === "개역개정" || label === "개역한글" || label === "새번역") {
    return "성경전서 " + label + " · 대한성서공회";
  }
  if (label === "우리말성경") return "우리말성경 · 두란노";
  return label;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("NO_INDEXEDDB")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

/** 파싱 결과를 통째로 저장합니다. 이전에 불러온 것은 지웁니다. */
export async function saveKoBible(
  chapters: Record<string, KoVerse[]>,
  label: string,
  stats: KoStats,
): Promise<KoMeta> {
  const db = await openDB();
  const meta: KoMeta = {
    label,
    credit: creditOf(label),
    savedAt: Date.now(),
    books: stats.books,
    chapters: stats.chapters,
    verses: stats.verses,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, META], "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    Object.keys(chapters).forEach((key) => store.put({ key, verses: chapters[key] }));
    tx.objectStore(META).put({ id: "current", ...meta });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("SAVE_FAILED"));
    tx.onabort = () => reject(tx.error || new Error("SAVE_ABORTED"));
  });
  try { localStorage.setItem(META_MIRROR, JSON.stringify(meta)); } catch (e) {}
  return meta;
}

/** 불러온 성경이 있으면 그 장을, 없으면 null 을 돌려줍니다. */
export async function loadKoChapter(bookId: string, chapter: number): Promise<KoVerse[] | null> {
  if (!koMetaSync()) return null; // 불러온 적이 없으면 DB 를 열지도 않습니다
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(bookId + ":" + chapter);
      req.onsuccess = () => {
        const rec = req.result as { verses?: KoVerse[] } | undefined;
        resolve(rec && rec.verses && rec.verses.length > 0 ? rec.verses : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** 화면이 즉시 읽어야 하는 메타(출처 표기 등) */
export function koMetaSync(): KoMeta | null {
  try {
    const s = localStorage.getItem(META_MIRROR);
    if (!s) return null;
    const m = JSON.parse(s);
    return m && typeof m.label === "string" ? (m as KoMeta) : null;
  } catch {
    return null;
  }
}

export async function clearKoBible(): Promise<void> {
  try { localStorage.removeItem(META_MIRROR); } catch (e) {}
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE, META], "readwrite");
      tx.objectStore(STORE).clear();
      tx.objectStore(META).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}

// ── 서버(Cloudflare Worker) 주고받기 ────────────────────────────
//
// 기기가 여럿이라 파일을 하나하나 옮기는 게 번거로워, 설교문이 쓰는 Worker 에
// 성경 경로를 붙였습니다. 다만 **열쇠는 설교문과 따로 둡니다** —
// 성경은 온 가족이 보고 설교문은 본인만 보므로 권한이 원래 다릅니다.
// 같은 열쇠를 쓰면 성경을 받으려고 넣은 키로 아내 폰에 설교문까지 열립니다.
//
//   PC 등 한 대에서: 파일 불러오기 → "서버에 올리기"  (딱 한 번)
//   나머지 기기에서: "서버에서 받기"                    (기기마다 한 번)
//
// 받은 뒤에는 IndexedDB 에 담기므로 읽을 때 네트워크를 타지 않습니다.
// 본문은 저장소에 커밋하지 않고 KV 에만 둡니다. 키도 코드에 넣지 않습니다.

// ---------- 성경 서버 설정 (기기별 localStorage) ----------

const SRV_BASE_KEY = "bible-base";
const SRV_SECRET_KEY = "bible-key";

// 기본 주소 — 기기마다 주소를 옮겨 적는 게 번거로워 미리 채워 둡니다.
// 주소는 비밀이 아닙니다. 실제로 막는 것은 열쇠(BIBLE_KEY) 하나뿐이고,
// 열쇠 없이 이 주소를 열면 unauthorized 만 돌아옵니다.
// 나중에 커스텀 도메인으로 옮기면 설정에서 주소만 바꿔 넣으면 됩니다.
const DEFAULT_BASE = "https://kata-sermon.cura4world.workers.dev";

export function getBibleBase(): string {
  try {
    const v = localStorage.getItem(SRV_BASE_KEY);
    if (v !== null) return v;   // 사용자가 지운 경우(빈 문자열)는 그대로 존중합니다
  } catch (e) {}
  return DEFAULT_BASE;
}

export function setBibleBase(v: string): void {
  // 끝에 붙은 슬래시는 떼어 둡니다 (경로를 붙일 때 "//" 가 되지 않도록)
  const clean = (v || "").trim().replace(new RegExp("/+$"), "");
  try { localStorage.setItem(SRV_BASE_KEY, clean); } catch (e) {}
}

export function getBibleKey(): string {
  try { return localStorage.getItem(SRV_SECRET_KEY) || ""; } catch (e) { return ""; }
}

export function setBibleKey(v: string): void {
  try { localStorage.setItem(SRV_SECRET_KEY, (v || "").trim()); } catch (e) {}
}

interface BookPayload {
  id: string;
  chapters: Record<string, KoVerse[]>;
}

interface IndexPayload {
  label: string;
  books: string[];
  verses: number;
  savedAt: number;
}

async function srv(
  base: string, key: string, path: string, method: string, body?: unknown,
): Promise<Response> {
  if (!base || !key) throw new Error("NO_CONFIG");
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 20000);
  let res: Response;
  try {
    res = await fetch(base + path, {
      method,
      headers: body
        ? { "x-kata-key": key, "content-type": "application/json" }
        : { "x-kata-key": key },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("FETCH_FAILED");
  return res;
}

/** 이 기기에 담긴 성경을 책 단위로 모읍니다 */
async function readAllLocal(): Promise<Record<string, Record<string, KoVerse[]>>> {
  const db = await openDB();
  const rows: { key: string; verses: KoVerse[] }[] = await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as { key: string; verses: KoVerse[] }[]) || []);
    req.onerror = () => resolve([]);
  });
  const byBook: Record<string, Record<string, KoVerse[]>> = {};
  rows.forEach((r) => {
    const cut = r.key.lastIndexOf(":");
    if (cut < 0) return;
    const bookId = r.key.slice(0, cut);
    const chapter = r.key.slice(cut + 1);
    if (!byBook[bookId]) byBook[bookId] = {};
    byBook[bookId][chapter] = r.verses;
  });
  return byBook;
}

/** 이 기기의 성경을 서버로 올립니다. 한 대에서 한 번만 하면 됩니다. */
export async function pushKoToServer(
  base: string, key: string, onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const meta = koMetaSync();
  if (!meta) throw new Error("NO_LOCAL");
  const byBook = await readAllLocal();
  const ids = Object.keys(byBook);
  if (ids.length === 0) throw new Error("NO_LOCAL");
  for (let i = 0; i < ids.length; i++) {
    const payload: BookPayload = { id: ids[i], chapters: byBook[ids[i]] };
    await srv(base, key, "/bible/book?id=" + encodeURIComponent(ids[i]), "PUT", payload);
    if (onProgress) onProgress(i + 1, ids.length + 1);
  }
  const index: IndexPayload = {
    label: meta.label, books: ids, verses: meta.verses, savedAt: Date.now(),
  };
  await srv(base, key, "/bible/index", "PUT", index);
  if (onProgress) onProgress(ids.length + 1, ids.length + 1);
  return ids.length;
}

/** 서버에 올려둔 성경을 이 기기로 받습니다. */
export async function pullKoFromServer(
  base: string, key: string, onProgress?: (done: number, total: number) => void,
): Promise<KoMeta> {
  const idxRes = await srv(base, key, "/bible/index", "GET");
  let index: IndexPayload;
  try {
    index = await idxRes.json();
  } catch (e) {
    throw new Error("FETCH_FAILED");
  }
  if (!index || !Array.isArray(index.books) || index.books.length === 0) {
    throw new Error("EMPTY");
  }
  const chapters: Record<string, KoVerse[]> = {};
  const stats: KoStats = {
    books: 0, chapters: 0, verses: 0, titles: 0,
    merged: 0, ranges: 0, notes: 0, unknown: [],
  };
  for (let i = 0; i < index.books.length; i++) {
    const id = index.books[i];
    const res = await srv(base, key, "/bible/book?id=" + encodeURIComponent(id), "GET");
    let payload: BookPayload;
    try {
      payload = await res.json();
    } catch (e) {
      throw new Error("FETCH_FAILED");
    }
    if (!payload || !payload.chapters) continue;
    stats.books++;
    Object.keys(payload.chapters).forEach((ch) => {
      const verses = payload.chapters[ch];
      if (!Array.isArray(verses) || verses.length === 0) return;
      chapters[id + ":" + ch] = verses;
      stats.chapters++;
      stats.verses += verses.length;
      verses.forEach((v) => { if (v.title) stats.titles++; });
    });
    if (onProgress) onProgress(i + 1, index.books.length);
  }
  if (stats.verses === 0) throw new Error("EMPTY");
  return await saveKoBible(chapters, index.label || "한국어 성경", stats);
}
