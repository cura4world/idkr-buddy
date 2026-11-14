import seedData from '@/data/seed.json';
import { medaliEngine } from "@/lib/medali";
import { isStoreApp } from "@/lib/platform";
import {
  migrateSharedIdsOnce,
  migrateRenamedHeadwordsOnce,
  makeLegacyWordResolver,
  upgradeLegacyCategoryId,
  upgradeLegacyWordId,
  type LegacyWordResolver,
  type SeedLike,
} from "@/lib/sharedIdMigration";

export interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  categoryId: string;
  createdAt: number;
  isShared?: boolean;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  isShared?: boolean;
  owner?: string;
}

const WORDS_KEY = "kata-words";
const CATEGORIES_KEY = "kata-categories";
const MY_WORDBOOK_ID = "my-wordbook";
const MY_WORDBOOK_FLAG = "my_wordbook_created";
const MY_WORDBOOK_SORT_FLAG = "my_wordbook_newest_first";
const PRIVATE_FOLDER_KEY = "private_folder_name";

// 이 기기에서만 보이는 개인 단어장 폴더 이름 (GitHub data/private/<이름>)
export function getPrivateFolderName(): string {
  try {
    return (localStorage.getItem(PRIVATE_FOLDER_KEY) || "").trim();
  } catch (e) {
    return "";
  }
}

export function setPrivateFolderName(name: string) {
  try {
    const v = (name || "").trim();
    if (v) localStorage.setItem(PRIVATE_FOLDER_KEY, v);
    else localStorage.removeItem(PRIVATE_FOLDER_KEY);
  } catch (e) {}
}

// 손상된 localStorage 데이터로 앱 전체가 죽지 않도록 안전 파싱
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

const defaultCategories: Category[] = [
  { id: "greetings", name: "인사", emoji: "👋" },
  { id: "food", name: "음식", emoji: "🍜" },
  { id: "numbers", name: "숫자", emoji: "🔢" },
  { id: "daily", name: "일상", emoji: "☀️" },
];

const defaultWords: Word[] = [
  // 표제어는 고유명사가 아니면 소문자 (2026-11). 예전 기기에 대문자로 저장된 것은
  // sharedIdMigration.ts 의 LEGACY_DEFAULT_WORD_CASE 가 한 번 소문자로 바꿉니다.
  { id: "1", word: "selamat pagi", meaning: "좋은 아침", example: "Selamat pagi, apa kabar?", exampleMeaning: "좋은 아침, 어떻게 지내세요?", categoryId: "greetings", createdAt: Date.now() },
  { id: "2", word: "terima kasih", meaning: "감사합니다", example: "Terima kasih banyak.", exampleMeaning: "정말 감사합니다.", categoryId: "greetings", createdAt: Date.now() },
  { id: "3", word: "nasi goreng", meaning: "볶음밥", example: "Saya mau nasi goreng.", exampleMeaning: "저는 볶음밥을 원해요.", categoryId: "food", createdAt: Date.now() },
  { id: "4", word: "satu", meaning: "하나 (1)", example: "Satu, dua, tiga.", exampleMeaning: "하나, 둘, 셋.", categoryId: "numbers", createdAt: Date.now() },
  { id: "5", word: "dua", meaning: "둘 (2)", example: "Saya punya dua kucing.", exampleMeaning: "저는 고양이 두 마리가 있어요.", categoryId: "numbers", createdAt: Date.now() },
  { id: "6", word: "apa kabar?", meaning: "어떻게 지내세요?", example: "Halo, apa kabar?", exampleMeaning: "안녕, 어떻게 지내?", categoryId: "greetings", createdAt: Date.now() },
  { id: "7", word: "makan", meaning: "먹다", example: "Sudah makan?", exampleMeaning: "밥 먹었어?", categoryId: "daily", createdAt: Date.now() },
  { id: "8", word: "tidur", meaning: "자다", example: "Saya mau tidur.", exampleMeaning: "저는 자고 싶어요.", categoryId: "daily", createdAt: Date.now() },
];

// 앱에 내장된 단어인가 — 기본·개인 폴더 단어(seed)와 처음 설치 때 깔리는 예시 단어 8개.
// 어느 기기에서나 저절로 생기므로 백업·옮기기에 담지 않습니다.
// 예시 단어는 예전 대문자 표기(예: "Makan")로 남아 있어도 같은 것으로 봅니다.
export function isBuiltInWord(w: Word): boolean {
  if (w.isShared) return true;
  return defaultWords.some((d) => d.id === w.id && d.word === (w.word || "").toLowerCase());
}

// 어느 기기에나 저절로 있는 단어장인가 (기본·개인 폴더, 예시 4개, 내 단어장, 지도 단어장)
export function isBuiltInCategory(c: Category): boolean {
  if (c.isShared) return true;
  if (c.id === MY_WORDBOOK_ID || c.id === "map-words") return true;
  return defaultCategories.some((d) => d.id === c.id);
}

// 처음 설치 때 깔리는 예시 단어장·단어. 공개판(스토어 앱·미리보기)은 예시 없이 빈 상태로 시작합니다
// (QA Q16 — 시안 W1 의 처음 상태. "보관한 단어장 4권 · 모은 단어 0" 이 헷갈림). 관리자판·회원판은 예전 그대로.
// defaultCategories·defaultWords 자체는 그대로 둡니다 — isBuiltIn* 판단과 sharedIdMigration 이 씁니다.
// 사본을 돌려줍니다 — 받은 쪽(addCategory 등)이 배열을 고치면 원본 목록까지 바뀌어, 새로 만든 단어장이
// "기본 단어장"으로 잘못 판정될 수 있었습니다(저장소가 빈 첫 호출에서만. 2026-11-14 테스트로 발견).
function initialCategories(): Category[] {
  return isStoreApp() ? [] : defaultCategories.slice();
}
function initialWords(): Word[] {
  return isStoreApp() ? [] : defaultWords.slice();
}

export function getCategories(): Category[] {
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (stored) {
      const parsed = safeParse<Category[]>(stored, initialCategories());
      return Array.isArray(parsed) ? parsed : initialCategories();
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCategories()));
  } catch (e) {}
  return initialCategories();
}

// 저장이 실패하면(저장 공간 가득 등) 화면은 된 것처럼 보이는데 다음에 켜면 사라집니다(출시 전 점검 D-04·C-21).
// 실패를 삼키지 않고 창에 알립니다 — App.tsx 가 이 신호를 받아 한 번 안내합니다. 저장 함수는 성공 여부를 돌려줍니다.
export const SAVE_FAILED_EVENT = "kata-save-failed";
function reportSaveFailed(): void {
  try { window.dispatchEvent(new Event(SAVE_FAILED_EVENT)); } catch (e) {}
}

/** 새 ID. crypto.randomUUID 가 없는 오래된 웹뷰에서도 단어·단어장을 추가할 수 있게 대체를 둡니다(C-21). */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch (e) {}
  return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export function saveCategories(categories: Category[]): boolean {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return true;
  } catch (e) {
    reportSaveFailed();
    return false;
  }
}

export function getWords(): Word[] {
  try {
    const stored = localStorage.getItem(WORDS_KEY);
    if (stored) {
      const parsed = safeParse<Word[]>(stored, initialWords());
      return Array.isArray(parsed) ? parsed : initialWords();
    }
    localStorage.setItem(WORDS_KEY, JSON.stringify(initialWords()));
  } catch (e) {}
  return initialWords();
}

// 단어장별 단어 수. 저장된 글이 그대로면 다시 풀지 않고 앞서 센 것을 씁니다 — 단어장 폴더 화면은 한 번 그릴 때
// 단어장마다 전체 단어(80만 자)를 JSON 으로 다시 풀어 82번을 반복했습니다(출시 전 점검 C-23).
let countCache: { raw: string; counts: Record<string, number> } | null = null;
export function getWordCount(categoryId: string): number {
  let raw = "";
  try { raw = localStorage.getItem(WORDS_KEY) || ""; } catch (e) {}
  if (!countCache || countCache.raw !== raw) {
    const counts: Record<string, number> = {};
    for (const w of getWords()) counts[w.categoryId] = (counts[w.categoryId] || 0) + 1;
    // getWords 가 처음 호출에서 기본값을 저장했을 수 있어, 저장된 글을 다시 읽어 열쇠로 삼습니다
    try { raw = localStorage.getItem(WORDS_KEY) || ""; } catch (e) {}
    countCache = { raw, counts };
  }
  return countCache.counts[categoryId] || 0;
}

export function saveWords(words: Word[]): boolean {
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));
    return true;
  } catch (e) {
    reportSaveFailed();
    return false;
  }
}

// ── 단어 뜻 조회 실패 안내문 ───────────────────────────────────────────
// 팝업에서 Gemini 조회가 실패하면 뜻 칸에 이 문구를 넣는다.
// 이 문구가 단어장에 "뜻"으로 저장되면 퀴즈·게임 보기로 튀어나오므로,
// (1) 저장 단계에서 막고 (2) 예전에 저장된 것은 시작할 때 지운다.
export const LOOKUP_FAIL_TEXT = "뜻을 불러오지 못했습니다. 다시 눌러 주세요";
// 예전 문구("…못했어요")로 저장된 것도 알아봐야 하므로 둘 다 둔다 (2026-11 말투 통일).
const LOOKUP_FAIL_HEADS = ["뜻을 불러오지 못했습니다", "뜻을 불러오지 못했어요"];

// 빈 뜻은 실패로 보지 않는다 — CSV로 들어온 정상 단어를 지우면 안 되기 때문.
export function isFailedMeaning(meaning: string): boolean {
  const m = (meaning || "").trim();
  return LOOKUP_FAIL_HEADS.some((h) => m.startsWith(h));
}

// 이번 실행에서 지운 단어들 (메인 화면이 한 번 읽어 가서 알려 준다)
let purgedFailedWords: string[] = [];

function purgeFailedMeaningWords() {
  try {
    const words = getWords();
    const bad = words.filter((w) => isFailedMeaning(w.meaning));
    if (bad.length === 0) return;
    const badIds = new Set(bad.map((w) => w.id));
    saveWords(words.filter((w) => !badIds.has(w.id)));
    purgedFailedWords = bad.map((w) => w.word);
  } catch (e) {}
}

// 메인에서 한 번만 읽어 간다 (읽으면 비워진다)
export function takePurgedFailedWords(): string[] {
  const list = purgedFailedWords;
  purgedFailedWords = [];
  return list;
}

function initSharedCategories() {
  const seed = seedData as { version: number; categories: Category[]; words: Word[] };
  // 공용 단어장 + (설정된 경우) 내 개인 폴더 단어장만 반영
  const myFolder = getPrivateFolderName();
  const seedCats = seed.categories.filter(c => !c.owner || c.owner === myFolder);
  const seedCatIds = seedCats.map(c => c.id);
  const seedWords = seed.words.filter(w => seedCatIds.includes(w.categoryId));
  // 폴더 이름을 바꾸면 같은 시드 버전이라도 다시 동기화되도록 키에 포함
  const syncKey = String(seed.version) + "|" + myFolder;
  const storedVersion = localStorage.getItem('shared_seed_version');
  if (storedVersion === syncKey) return;
  const existingCats = getCategories();
  const existingWords = getWords().filter(w => !w.isShared);
  const existingShared = existingCats.filter(c => c.isShared);
  const personalCats = existingCats.filter(c => !c.isShared);
  // 시드에서 사라진 공용 단어장: 직접 추가한 단어가 있으면 개인 단어장으로 전환, 없으면 제거
  const keptShared: Category[] = [];
  for (const e of existingShared) {
    const inSeed = seedCats.find(s => s.id === e.id);
    if (inSeed) { keptShared.push(inSeed); continue; }
    const hasPersonalWords = existingWords.some(w => w.categoryId === e.id);
    if (hasPersonalWords) keptShared.push({ ...e, isShared: false });
  }
  const newShared = seedCats.filter(s => !existingShared.find(e => e.id === s.id));
  const merged = [...keptShared, ...newShared, ...personalCats];
  // '내 단어장'은 항상 맨 위 유지
  const myIdx = merged.findIndex(c => c.id === MY_WORDBOOK_ID);
  if (myIdx > 0) {
    const [my] = merged.splice(myIdx, 1);
    merged.unshift(my);
  }
  saveCategories(merged);
  saveWords([...seedWords, ...existingWords]);
  localStorage.setItem('shared_seed_version', syncKey);
}

// 기본 '내 단어장'을 최초 1회 맨 위에 생성 (사용자가 삭제하면 다시 만들지 않음)
function ensureMyWordbook() {
  try {
    if (localStorage.getItem(MY_WORDBOOK_FLAG) === "1") return;
    const cats = getCategories();
    if (!cats.find(c => c.id === MY_WORDBOOK_ID)) {
      saveCategories([{ id: MY_WORDBOOK_ID, name: "내 단어장", emoji: "⭐" }, ...cats]);
    }
    localStorage.setItem(MY_WORDBOOK_FLAG, "1");
  } catch (e) {}
}

// 이미 담아둔 '내 단어장' 단어들을 최신순으로 한 번만 뒤집습니다.
// (이후의 직접 정렬을 덮어쓰지 않도록 최초 1회만 실행)
function sortMyWordbookNewestFirstOnce() {
  try {
    if (localStorage.getItem(MY_WORDBOOK_SORT_FLAG) === "1") return;
    const words = getWords();
    const mine = words.filter((w) => w.categoryId === MY_WORDBOOK_ID);
    if (mine.length > 1) {
      const others = words.filter((w) => w.categoryId !== MY_WORDBOOK_ID);
      // 담은 시각 내림차순. 같은 시각(CSV 일괄 가져오기 등)이면 나중에 담긴 것이 위로.
      const sorted = mine.slice().reverse().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveWords([...others, ...sorted]);
    }
    localStorage.setItem(MY_WORDBOOK_SORT_FLAG, "1");
  } catch (e) {}
}

// 공용 단어장 번호 재배치(2026-11) 뒤 처음 켤 때 한 번, 옛 ID 로 저장된 것을 새 ID 로 옮깁니다.
// 시드 동기화보다 먼저 돌아야 옛 단어장이 "시드에서 사라진 단어장"으로 지워지지 않습니다.
try {
  migrateSharedIdsOnce(localStorage, seedData as SeedLike);
} catch (e) {}
// 2026-11-14 검수에서 표기를 고친 표제어 19개의 "다시 외울 표시"를 새 ID 로 (한 번만)
try {
  migrateRenamedHeadwordsOnce(localStorage);
} catch (e) {}

// 공개판에 이미 깔린 예시 단어장(미리보기 APK 로 먼저 써 본 기기)을 한 번만 걷어냅니다.
// 예시 단어만 들어 있는 예시 단어장만 지웁니다 — 사용자가 단어를 넣은 단어장은 그대로 둡니다.
const SAMPLE_CLEARED_FLAG = "kata-public-samples-cleared";
function removeUntouchedSamplesOnce() {
  if (!isStoreApp()) return;
  try {
    if (localStorage.getItem(SAMPLE_CLEARED_FLAG) === "1") return;
    const cats = getCategories();
    const words = getWords();
    const remove = new Set<string>();
    for (const c of cats) {
      if (c.isShared || !defaultCategories.some((d) => d.id === c.id)) continue;
      if (words.every((w) => w.categoryId !== c.id || isBuiltInWord(w))) remove.add(c.id);
    }
    if (remove.size > 0) {
      saveCategories(cats.filter((c) => !remove.has(c.id)));
      saveWords(words.filter((w) => !(remove.has(w.categoryId) && isBuiltInWord(w))));
    }
    localStorage.setItem(SAMPLE_CLEARED_FLAG, "1");
  } catch (e) {}
}

// 이 줄은 앱이 켜질 때(모듈을 불러올 때) 돕니다. 여기서 예외가 나가면 매 실행 흰 화면이 되므로 받아 둡니다
// (저장 공간 가득·저장값 깨짐 등 — 출시 전 점검 C-03). 실패하면 이번 실행은 시드 동기화 없이 열리고 다음 실행 때 다시 시도합니다.
try {
  initSharedCategories();
} catch (e) {}
removeUntouchedSamplesOnce();
ensureMyWordbook();
sortMyWordbookNewestFirstOnce();
purgeFailedMeaningWords();

// 재배치 전에 만든 백업·옮기기 묶음을 되돌릴 때 쓰는 ID 변환 (transfer.ts)
let legacyResolver: LegacyWordResolver | null = null;
export function upgradeLegacySharedCategoryId(id: string): string {
  return upgradeLegacyCategoryId(id);
}
export function upgradeLegacySharedWordId(id: string): string {
  if (!legacyResolver) legacyResolver = makeLegacyWordResolver(seedData as SeedLike);
  return upgradeLegacyWordId(id, legacyResolver);
}

// 지도에서 담은 단어가 모이는 단어장.
// 앱 시작 때 만들지 않고, 지도에서 처음 담을 때 만들어집니다.
export const MAP_WORDBOOK_ID = "map-words";

export function ensureMapWordbook(): string {
  const categories = getCategories();
  if (!categories.some((c) => c.id === MAP_WORDBOOK_ID)) {
    const cat: Category = { id: MAP_WORDBOOK_ID, name: "지도에서 배운 단어", emoji: "🗺️" };
    const myIdx = categories.findIndex((c) => c.id === MY_WORDBOOK_ID);
    categories.splice(myIdx < 0 ? 0 : myIdx + 1, 0, cat);
    saveCategories(categories);
  }
  return MAP_WORDBOOK_ID;
}

export function addCategory(name: string, emoji: string): Category {
  const categories = getCategories();
  const cat: Category = { id: newId(), name, emoji };
  // 새 단어장은 '내 단어장' 바로 다음에 넣습니다 — 내 단어장 화면에서 최신이 위로 오도록.
  // (addWord 가 내 단어장 단어를 다루는 방식과 같습니다. 표시 순서 = 저장 순서)
  const myIdx = categories.findIndex((c) => c.id === MY_WORDBOOK_ID);
  categories.splice(myIdx < 0 ? 0 : myIdx + 1, 0, cat);
  saveCategories(categories);
  return cat;
}

// 보관 단어장의 다음 기본 이름 — '내 단어장 01', '내 단어장 02' …
export function nextArchiveName(): string {
  const re = new RegExp("^내 단어장 (\\d+)$");
  let max = 0;
  for (const c of getCategories()) {
    const m = (c.name || "").match(re);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return "내 단어장 " + String(max + 1).padStart(2, "0");
}

// 내 단어장에 쌓인 단어를 새 단어장 한 권으로 묶어 보관하고 내 단어장을 비웁니다.
// 단어의 배열 순서를 그대로 옮기므로 보관된 단어장 안에서도 최신이 위입니다.
export function archiveMyWordbook(name: string): Category | null {
  const words = getWords();
  const hasMine = words.some((w) => w.categoryId === MY_WORDBOOK_ID);
  if (!hasMine) return null;
  const cat = addCategory(name, "📒");
  const next = words.map((w) =>
    w.categoryId === MY_WORDBOOK_ID ? { ...w, categoryId: cat.id } : w
  );
  saveWords(next);
  return cat;
}

export function updateCategory(id: string, name: string, emoji: string) {
  const categories = getCategories().map((c) => c.id === id ? { ...c, name, emoji } : c);
  saveCategories(categories);
}

export function updateWord(id: string, updates: { word?: string; meaning?: string; example?: string; exampleMeaning?: string; categoryId?: string }) {
  const words = getWords().map((w) => w.id === id ? { ...w, ...updates } : w);
  saveWords(words);
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter((c) => c.id !== id);
  saveCategories(categories);
  const words = getWords().filter((w) => w.categoryId !== id);
  saveWords(words);
}

export function moveCategoryUp(id: string) {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx <= 0) return;
  [categories[idx - 1], categories[idx]] = [categories[idx], categories[idx - 1]];
  saveCategories(categories);
}

export function moveCategoryDown(id: string) {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0 || idx >= categories.length - 1) return;
  [categories[idx], categories[idx + 1]] = [categories[idx + 1], categories[idx]];
  saveCategories(categories);
}

export function moveCategoryToTop(id: string) {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx <= 0) return;
  const [item] = categories.splice(idx, 1);
  categories.unshift(item);
  saveCategories(categories);
}

export function moveCategoryToBottom(id: string) {
  const categories = getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0 || idx >= categories.length - 1) return;
  const [item] = categories.splice(idx, 1);
  categories.push(item);
  saveCategories(categories);
}

export function addWord(word: Omit<Word, "id" | "createdAt">): Word {
  const words = getWords();
  const newWord: Word = { ...word, id: newId(), createdAt: Date.now() };
  if (word.categoryId === MY_WORDBOOK_ID) {
    // '내 단어장'은 최신 단어가 맨 위 (표시 순서 = 저장 순서라 드래그 정렬과도 어긋나지 않음)
    const firstIdx = words.findIndex((w) => w.categoryId === MY_WORDBOOK_ID);
    words.splice(firstIdx < 0 ? words.length : firstIdx, 0, newWord);
  } else {
    words.push(newWord);
  }
  saveWords(words);
  return newWord;
}

// 해당 단어장에 같은 단어가 이미 있는지 (대소문자 무시)
export function hasWordInCategory(categoryId: string, word: string): boolean {
  const target = word.trim().toLowerCase();
  if (!target) return false;
  return getWords().some(
    (w) => w.categoryId === categoryId && w.word.trim().toLowerCase() === target
  );
}

// 중복이면 추가하지 않고 알려줍니다 (사전/이야기의 "단어장에 담기"용)
export function addWordIfAbsent(word: Omit<Word, "id" | "createdAt">): { added: boolean; rejected?: boolean } {
  // 조회 실패 안내문은 뜻이 아니다. 절대 저장하지 않는다.
  if (isFailedMeaning(word.meaning)) return { added: false, rejected: true };
  if (hasWordInCategory(word.categoryId, word.word)) return { added: false };
  addWord(word);
  medaliEngine.addPoints("save", 1).catch(() => {});  // 단어 담기 +1 (조용히)
  return { added: true };
}

// 고른 단어들을 다른 단어장으로 옮깁니다.
// 대상 단어장의 맨 앞에 넣어 최신이 위로 오게 하고, 고른 단어들끼리의 순서는 유지합니다.
// 대상에 같은 단어가 이미 있으면 옮기지 않고 건너뜁니다(중복 방지).
export function moveWordsToCategory(
  ids: string[],
  targetCategoryId: string
): { moved: number; skipped: number } {
  const words = getWords();
  const idSet = new Set(ids);
  // 이번에 옮기는 것끼리도 겹치지 않도록 표제어를 채워 가며 확인합니다.
  const taken = new Set<string>();
  const moving: Word[] = [];
  let skipped = 0;
  for (const w of words) {
    if (!idSet.has(w.id)) continue;
    if (w.categoryId === targetCategoryId) { skipped++; continue; }
    const key = w.word.trim().toLowerCase();
    if (hasWordInCategory(targetCategoryId, w.word) || taken.has(key)) { skipped++; continue; }
    taken.add(key);
    moving.push(w);
  }
  if (moving.length === 0) return { moved: 0, skipped };
  const movingIds = new Set(moving.map((w) => w.id));
  const rest = words.filter((w) => !movingIds.has(w.id));
  const moved = moving.map((w) => ({ ...w, categoryId: targetCategoryId }));
  // 대상 단어장 구간의 맨 앞에 끼워 넣습니다 (대상이 비어 있으면 배열 끝).
  const firstIdx = rest.findIndex((w) => w.categoryId === targetCategoryId);
  rest.splice(firstIdx < 0 ? rest.length : firstIdx, 0, ...moved);
  saveWords(rest);
  return { moved: moved.length, skipped };
}

export function deleteWord(id: string) {
  const words = getWords().filter((w) => w.id !== id);
  saveWords(words);
}

export function getWordsByCategory(categoryId: string): Word[] {
  return getWords().filter((w) => w.categoryId === categoryId);
}

const SAVED_KEY = "kata-saved";

export function getSavedWordIds(): string[] {
  try {
    const parsed = safeParse<string[]>(localStorage.getItem(SAVED_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function toggleSavedWord(wordId: string): boolean {
  const ids = getSavedWordIds();
  const idx = ids.indexOf(wordId);
  try {
    if (idx >= 0) {
      ids.splice(idx, 1);
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      return false;
    } else {
      ids.push(wordId);
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      return true;
    }
  } catch (e) {
    return idx < 0;
  }
}

// '다시 외울' 표시 목록을 통째로 씁니다 (새 폰으로 옮기기·백업 되돌리기에서 씁니다)
export function setSavedWordIds(ids: string[]) {
  try {
    const uniq = Array.from(new Set((ids || []).filter((x) => typeof x === "string" && x)));
    localStorage.setItem(SAVED_KEY, JSON.stringify(uniq));
  } catch (e) {}
}

export function getSavedWords(): Word[] {
  const ids = getSavedWordIds();
  return getWords().filter((w) => ids.includes(w.id));
}

export function removeSavedWord(wordId: string) {
  try {
    const ids = getSavedWordIds().filter((id) => id !== wordId);
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch (e) {}
}

// CSV 필드 이스케이프 (쉼표/따옴표/줄바꿈 포함 시 따옴표로 감싸고 따옴표는 두 번)
function csvField(value: string): string {
  const s = (value ?? "").toString();
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  if (s.indexOf('"') !== -1 || s.indexOf(",") !== -1 || s.indexOf(NL) !== -1 || s.indexOf(CR) !== -1) {
    return '"' + s.split('"').join('""') + '"';
  }
  return s;
}

// 전체 단어를 CSV로 내보내기 (백업용)
// 형식: 단어,뜻,예문,예문뜻,카테고리이름,카테고리이모지,다시외울표시(1)
export function exportWordsToCSV(): { csv: string; count: number } {
  const categories = getCategories();
  const words = getWords();
  const savedIds = getSavedWordIds();
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  const lines: string[] = [];
  for (const cat of categories) {
    const catWords = words.filter((w) => w.categoryId === cat.id);
    for (const w of catWords) {
      lines.push([
        csvField(w.word),
        csvField(w.meaning),
        csvField(w.example),
        csvField(w.exampleMeaning),
        csvField(cat.name),
        csvField(cat.emoji),
        savedIds.includes(w.id) ? "1" : "",
      ].join(","));
    }
  }
  const bom = String.fromCharCode(0xFEFF);
  return { csv: bom + lines.join(CR + NL) + (lines.length > 0 ? CR + NL : ""), count: lines.length };
}

// 직접 넣은 단어만 CSV로 (백업 '복사'용)
// 앱에 내장된 단어(isBuiltInWord)는 새 기기에서 저절로 생기므로 빼서,
// 클립보드에 담기는 양을 사용자가 만든 몫만큼으로 줄입니다. 형식은 exportWordsToCSV 와 같습니다.
export function exportPersonalWordsToCSV(): { csv: string; count: number } {
  const categories = getCategories();
  const words = getWords();
  const savedIds = getSavedWordIds();
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  const lines: string[] = [];
  for (const cat of categories) {
    const catWords = words.filter((w) => w.categoryId === cat.id && !isBuiltInWord(w));
    for (const w of catWords) {
      lines.push([
        csvField(w.word),
        csvField(w.meaning),
        csvField(w.example),
        csvField(w.exampleMeaning),
        csvField(cat.name),
        csvField(cat.emoji),
        savedIds.includes(w.id) ? "1" : "",
      ].join(","));
    }
  }
  const bom = String.fromCharCode(0xFEFF);
  return { csv: bom + lines.join(CR + NL) + (lines.length > 0 ? CR + NL : ""), count: lines.length };
}

/**
 * CSV 글을 줄(칸 배열)로 나눕니다. 따옴표 안의 쉼표·줄바꿈을 한 칸으로 읽습니다.
 * 내보내기(exportWordsToCSV)는 줄바꿈이 든 칸을 따옴표로 감싸므로, 줄바꿈으로 먼저 자르면 자기 출력을
 * 못 읽습니다(출시 전 점검 D-06).
 */
export function parseCsvRows(text: string): string[][] {
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

/**
 * skipped: 그 단어장에 같은 단어·같은 뜻이 이미 있어 넣지 않은 줄 수 — 같은 파일을 두 번 넣어도 두 배가 되지 않습니다(D-06).
 * saved: 저장에 성공했는가(저장 공간이 가득 차면 false).
 */
export function importWordsFromCSV(csv: string, forceCategoryId?: string): { imported: number; errors: number; skipped: number; saved: boolean } {
  const bom = String.fromCharCode(0xFEFF);
  const cleanCsv = csv.startsWith(bom) ? csv.slice(1) : csv;
  const lines = parseCsvRows(cleanCsv);
  let imported = 0;
  let errors = 0;
  let skipped = 0;
  const words = getWords();
  const categories = getCategories();
  const newSavedIds: string[] = [];
  let categoriesChanged = false;
  // 이미 있는 것: 단어장 + 단어(소문자) + 뜻
  const sameKey = (catId: string, w: string, m: string) => catId + "\u0001" + w.trim().toLowerCase() + "\u0001" + m.trim();
  const have = new Set<string>();
  for (const w of words) have.add(sameKey(w.categoryId, w.word || "", w.meaning || ""));
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i];
    if (parts.length >= 2 && parts[0].trim() !== "") {
      const [word, meaning, example, exampleMeaning, categoryName, categoryEmoji, marked] = parts;
      let catId = forceCategoryId;
      if (!catId) {
        const name = (categoryName || "").trim();
        if (name) {
          let cat = categories.find((c) => c.id === name || c.name === name);
          if (!cat) {
            // 백업 복원 시 없는 카테고리는 자동 생성
            cat = { id: newId(), name: name, emoji: (categoryEmoji || "").trim() || "📁" };
            categories.push(cat);
            categoriesChanged = true;
          }
          catId = cat.id;
        } else {
          catId = categories[0]?.id || "daily";
        }
      }
      const key = sameKey(catId, word, meaning || "");
      if (have.has(key)) { skipped++; continue; }
      have.add(key);
      const newWord: Word = { id: newId(), word, meaning, example: example || "", exampleMeaning: exampleMeaning || "", categoryId: catId, createdAt: Date.now() };
      words.push(newWord);
      if ((marked || "").trim() === "1") newSavedIds.push(newWord.id);
      imported++;
    } else { errors++; }
  }
  let saved = true;
  if (categoriesChanged) saved = saveCategories(categories) && saved;
  saved = saveWords(words) && saved;
  if (!saved) return { imported: 0, errors, skipped, saved: false };
  if (newSavedIds.length > 0) {
    try {
      const ids = getSavedWordIds();
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids.concat(newSavedIds)));
    } catch (e) {}
  }
  return { imported, errors, skipped, saved: true };
}

export function reorderWords(categoryId: string, fromIndex: number, toIndex: number) {
  const words = getWords();
  const catWords = words.filter((w) => w.categoryId === categoryId);
  const otherWords = words.filter((w) => w.categoryId !== categoryId);
  const [moved] = catWords.splice(fromIndex, 1);
  catWords.splice(toIndex, 0, moved);
  saveWords([...otherWords, ...catWords]);
}

export function reorderCategories(fromIndex: number, toIndex: number) {
  const categories = getCategories();
  const [moved] = categories.splice(fromIndex, 1);
  categories.splice(toIndex, 0, moved);
  saveCategories(categories);
}

// 필터된 목록(예: 폴더 안)에서 안전하게 순서를 바꾸기 위한 ID 기반 함수.
// 전체 배열에서 두 단어장의 실제 위치를 찾아 이동하므로 인덱스가 어긋나지 않습니다.
export function reorderCategoryById(movedId: string, targetId: string) {
  if (movedId === targetId) return;
  const categories = getCategories();
  const from = categories.findIndex((c) => c.id === movedId);
  const to = categories.findIndex((c) => c.id === targetId);
  if (from < 0 || to < 0) return;
  const [moved] = categories.splice(from, 1);
  const insertAt = categories.findIndex((c) => c.id === targetId);
  categories.splice(from < to ? insertAt + 1 : insertAt, 0, moved);
  saveCategories(categories);
}

// 폴더 안에서 맨 위/맨 아래로 (주어진 목록 범위 안에서만 이동)
export function moveCategoryToEdgeWithin(id: string, ids: string[], toTop: boolean) {
  const categories = getCategories();
  const from = categories.findIndex((c) => c.id === id);
  if (from < 0) return;
  const edgeId = toTop ? ids[0] : ids[ids.length - 1];
  if (!edgeId || edgeId === id) return;
  const [moved] = categories.splice(from, 1);
  const edgeIdx = categories.findIndex((c) => c.id === edgeId);
  if (edgeIdx < 0) { categories.splice(from, 0, moved); return; }
  categories.splice(toTop ? edgeIdx : edgeIdx + 1, 0, moved);
  saveCategories(categories);
}
