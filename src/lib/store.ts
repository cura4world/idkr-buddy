export interface Word {
  id: string;
  word: string; // Indonesian
  meaning: string; // Korean
  example: string;
  exampleMeaning: string;
  categoryId: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

const WORDS_KEY = "kata-words";
const CATEGORIES_KEY = "kata-categories";

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
  const stored = localStorage.getItem(CATEGORIES_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  return defaultCategories;
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addCategory(name: string, emoji: string): Category {
  const categories = getCategories();
  const cat: Category = { id: crypto.randomUUID(), name, emoji };
  categories.push(cat);
  saveCategories(categories);
  return cat;
}

export function updateCategory(id: string, name: string, emoji: string) {
  const categories = getCategories().map((c) =>
    c.id === id ? { ...c, name, emoji } : c
  );
  saveCategories(categories);
}

export function deleteCategory(id: string) {
  const categories = getCategories().filter((c) => c.id !== id);
  saveCategories(categories);
  // Also delete words in this category
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

export function getWords(): Word[] {
  const stored = localStorage.getItem(WORDS_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(WORDS_KEY, JSON.stringify(defaultWords));
  return defaultWords;
}

export function saveWords(words: Word[]) {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
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
  const stored = localStorage.getItem(SAVED_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function toggleSavedWord(wordId: string): boolean {
  const ids = getSavedWordIds();
  const idx = ids.indexOf(wordId);
  if (idx >= 0) {
    ids.splice(idx, 1);
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    return false;
  } else {
    ids.push(wordId);
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    return true;
  }
}

export function getSavedWords(): Word[] {
  const ids = getSavedWordIds();
  const allWords = getWords();
  return allWords.filter((w) => ids.includes(w.id));
}

export function removeSavedWord(wordId: string) {
  const ids = getSavedWordIds().filter((id) => id !== wordId);
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export function importWordsFromCSV(csv: string, forceCategoryId?: string): { imported: number; errors: number } {
  const lines = csv.split("\n").filter((l) => l.trim());
  let imported = 0;
  let errors = 0;
  const words = getWords();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const [word, meaning, example, exampleMeaning, categoryId] = parts;
      let catId = forceCategoryId;
      if (!catId) {
        const categories = getCategories();
        catId = categoryId && categories.find((c) => c.id === categoryId || c.name === categoryId)
          ? (categories.find((c) => c.id === categoryId || c.name === categoryId)!.id)
          : (categories[0]?.id || "daily");
      }

      words.push({
        id: crypto.randomUUID(),
        word,
        meaning,
        example: example || "",
        exampleMeaning: exampleMeaning || "",
        categoryId: catId,
        createdAt: Date.now(),
      });
      imported++;
    } else {
      errors++;
    }
  }

  saveWords(words);
  return { imported, errors };
}
