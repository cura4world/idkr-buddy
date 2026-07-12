import seedData from '@/data/seed.json';

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
  { id: "1", word: "Selamat pagi", meaning: "좋은 아침", example: "Selamat pagi, apa kabar?", exampleMeaning: "좋은 아침, 어떻게 지내세요?", categoryId: "greetings", createdAt: Date.now() },
  { id: "2", word: "Terima kasih", meaning: "감사합니다", example: "Terima kasih banyak.", exampleMeaning: "정말 감사합니다.", categoryId: "greetings", createdAt: Date.now() },
  { id: "3", word: "Nasi goreng", meaning: "볶음밥", example: "Saya mau nasi goreng.", exampleMeaning: "저는 볶음밥을 원해요.", categoryId: "food", createdAt: Date.now() },
  { id: "4", word: "Satu", meaning: "하나 (1)", example: "Satu, dua, tiga.", exampleMeaning: "하나, 둘, 셋.", categoryId: "numbers", createdAt: Date.now() },
  { id: "5", word: "Dua", meaning: "둘 (2)", example: "Saya punya dua kucing.", exampleMeaning: "저는 고양이 두 마리가 있어요.", categoryId: "numbers", createdAt: Date.now() },
  { id: "6", word: "Apa kabar?", meaning: "어떻게 지내세요?", example: "Halo, apa kabar?", exampleMeaning: "안녕, 어떻게 지내?", categoryId: "greetings", createdAt: Date.now() },
  { id: "7", word: "Makan", meaning: "먹다", example: "Sudah makan?", exampleMeaning: "밥 먹었어?", categoryId: "daily", createdAt: Date.now() },
  { id: "8", word: "Tidur", meaning: "자다", example: "Saya mau tidur.", exampleMeaning: "저는 자고 싶어요.", categoryId: "daily", createdAt: Date.now() },
];

export function getCategories(): Category[] {
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (stored) {
      const parsed = safeParse<Category[]>(stored, defaultCategories);
      return Array.isArray(parsed) ? parsed : defaultCategories;
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  } catch (e) {}
  return defaultCategories;
}

export function saveCategories(categories: Category[]) {
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)); } catch (e) {}
}

export function getWords(): Word[] {
  try {
    const stored = localStorage.getItem(WORDS_KEY);
    if (stored) {
      const parsed = safeParse<Word[]>(stored, defaultWords);
      return Array.isArray(parsed) ? parsed : defaultWords;
    }
    localStorage.setItem(WORDS_KEY, JSON.stringify(defaultWords));
  } catch (e) {}
  return defaultWords;
}

export function saveWords(words: Word[]) {
  try { localStorage.setItem(WORDS_KEY, JSON.stringify(words)); } catch (e) {}
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

initSharedCategories();
ensureMyWordbook();

// 공용 단어장 복구 (리프레시 버튼용)
export function restoreSharedCategories() {
  const seed = seedData as { version: number; categories: Category[]; words: Word[] };
  const myFolder = getPrivateFolderName();
  const seedCats = seed.categories.filter(c => !c.owner || c.owner === myFolder);
  const seedCatIds = seedCats.map(c => c.id);
  const seedWords = seed.words.filter(w => seedCatIds.includes(w.categoryId));
  if (seedCats.length === 0) return false;
  const existingCats = getCategories();
  const existingWords = getWords();
  const missingCats = seedCats.filter(
    s => !existingCats.find(e => e.id === s.id)
  );
  const missingWords = seedWords.filter(
    s => !existingWords.find(e => e.id === s.id)
  );
  if (missingCats.length === 0 && missingWords.length === 0) return false;
  const existingShared = existingCats.filter(c => c.isShared);
  const personalCats = existingCats.filter(c => !c.isShared);
  saveCategories([...existingShared, ...missingCats, ...personalCats]);
  saveWords([...existingWords, ...missingWords]);
  return true;
}

export function addCategory(name: string, emoji: string): Category {
  const categories = getCategories();
  const cat: Category = { id: crypto.randomUUID(), name, emoji };
  categories.push(cat);
  saveCategories(categories);
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
  const newWord: Word = { ...word, id: crypto.randomUUID(), createdAt: Date.now() };
  words.push(newWord);
  saveWords(words);
  return newWord;
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

export function importWordsFromCSV(csv: string, forceCategoryId?: string): { imported: number; errors: number } {
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') { current += '"'; i += 2; }
          else { inQuotes = false; i++; }
        } else { current += char; i++; }
      } else {
        if (char === '"') { inQuotes = true; i++; }
        else if (char === ',') { result.push(current.trim()); current = ""; i++; }
        else { current += char; i++; }
      }
    }
    result.push(current.trim());
    return result;
  }
  const bom = String.fromCharCode(0xFEFF);
  const cleanCsv = csv.startsWith(bom) ? csv.slice(1) : csv;
  const newline = new RegExp("\\r?\\n");
  const lines = cleanCsv.split(newline).filter((l) => l.trim());
  let imported = 0;
  let errors = 0;
  const words = getWords();
  const categories = getCategories();
  const newSavedIds: string[] = [];
  let categoriesChanged = false;
  for (let i = 0; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 2 && parts[0].trim() !== "") {
      const [word, meaning, example, exampleMeaning, categoryName, categoryEmoji, marked] = parts;
      let catId = forceCategoryId;
      if (!catId) {
        const name = (categoryName || "").trim();
        if (name) {
          let cat = categories.find((c) => c.id === name || c.name === name);
          if (!cat) {
            // 백업 복원 시 없는 카테고리는 자동 생성
            cat = { id: crypto.randomUUID(), name: name, emoji: (categoryEmoji || "").trim() || "📁" };
            categories.push(cat);
            categoriesChanged = true;
          }
          catId = cat.id;
        } else {
          catId = categories[0]?.id || "daily";
        }
      }
      const newWord: Word = { id: crypto.randomUUID(), word, meaning, example: example || "", exampleMeaning: exampleMeaning || "", categoryId: catId, createdAt: Date.now() };
      words.push(newWord);
      if ((marked || "").trim() === "1") newSavedIds.push(newWord.id);
      imported++;
    } else { errors++; }
  }
  if (categoriesChanged) saveCategories(categories);
  saveWords(words);
  if (newSavedIds.length > 0) {
    try {
      const ids = getSavedWordIds();
      localStorage.setItem(SAVED_KEY, JSON.stringify(ids.concat(newSavedIds)));
    } catch (e) {}
  }
  return { imported, errors };
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
