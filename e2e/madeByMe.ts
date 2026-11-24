// Plus 때 만든 것(직접 만든 단어장·대화·이야기)을 시험용으로 미리 넣어 두는 도우미(2026-11-24 "읽기 전용 원칙").
// 앱을 한 번 열어 저장소를 만든 뒤 넣고, 부르는 쪽이 원하는 화면을 다시 엽니다.

import type { Page } from "@playwright/test";

export const MY_BOOK = { id: "e2e-mybook", name: "여행 표현" };
export const MY_SCENE = { id: "custom-e2e-1", cat: "sehari-hari", title: "시험용 직접 만든 대화" };
export const MY_STORY = { id: "e2e-story-1", title: "Pasar Pagi di Kampung", titleKo: "마을의 아침 시장" };

/** 직접 만든 단어장 한 권(단어 1개)을 넣습니다 */
export async function seedMyWordbook(page: Page): Promise<void> {
  await page.evaluate((b) => {
    const cats = JSON.parse(localStorage.getItem("kata-categories") || "[]");
    if (!cats.some((c: { id: string }) => c.id === b.id)) {
      const at = cats.findIndex((c: { id: string }) => c.id === "my-wordbook");
      cats.splice(at + 1, 0, { id: b.id, name: b.name, emoji: "icon:Plane:pink" });
      localStorage.setItem("kata-categories", JSON.stringify(cats));
    }
    const words = JSON.parse(localStorage.getItem("kata-words") || "[]");
    if (!words.some((w: { id: string }) => w.id === "e2e-w1")) {
      words.push({ id: "e2e-w1", word: "pantai", meaning: "해변", example: "", exampleMeaning: "", categoryId: b.id, createdAt: 1 });
      localStorage.setItem("kata-words", JSON.stringify(words));
    }
  }, MY_BOOK);
}

/** 기본 "내 단어장"에 단어 n개(묶기 권유는 30개부터) */
export async function seedMyWordbookWords(page: Page, n: number): Promise<void> {
  await page.evaluate((n) => {
    const words = JSON.parse(localStorage.getItem("kata-words") || "[]");
    for (let i = 0; i < n; i++) {
      words.push({ id: "e2e-mw" + i, word: "kata" + i, meaning: "뜻" + i, example: "", exampleMeaning: "", categoryId: "my-wordbook", createdAt: 1 + i });
    }
    localStorage.setItem("kata-words", JSON.stringify(words));
  }, n);
}

function putIdb(page: Page, db: string, store: string, rec: unknown, index: [string, string] | null): Promise<void> {
  return page.evaluate(({ db, store, rec, index }) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(db, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(store)) {
        const s = d.createObjectStore(store, { keyPath: "id" });
        if (index) s.createIndex(index[0], index[1], { unique: false });
      }
      // 회화 저장소는 cats 도 함께 만듭니다(앱 openDB 와 같은 모양)
      if (db === "kata-percakapan" && !d.objectStoreNames.contains("cats")) d.createObjectStore("cats", { keyPath: "id" });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const d = req.result;
      const tx = d.transaction(store, "readwrite");
      tx.objectStore(store).put(rec);
      tx.oncomplete = () => { d.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), { db, store, rec, index });
}

/** 직접 만든 대화 한 편('일상생활' 주제) */
export async function seedMyScene(page: Page): Promise<void> {
  await putIdb(page, "kata-percakapan", "scenes", {
    id: MY_SCENE.id,
    cat: MY_SCENE.cat,
    title: MY_SCENE.title,
    titleId: "Percakapan uji",
    roles: { A: "손님", B: "점원" },
    voices: { A: "m", B: "f" },
    level: "중",
    custom: true,
    createdAt: 1,
    lines: [
      { s: "A", id: "Selamat pagi, Bu.", ko: "안녕하세요." },
      { s: "B", id: "Pagi! Mau beli apa?", ko: "안녕하세요! 무엇을 사시겠어요?" },
    ],
  }, ["cat", "cat"]);
}

/** 불러온(지난) 이야기 한 편 */
export async function seedMyStory(page: Page): Promise<void> {
  await putIdb(page, "kata-stories", "stories", {
    id: MY_STORY.id,
    createdAt: Date.now() - 86400000,
    title: MY_STORY.title,
    titleKo: MY_STORY.titleKo,
    category: "일상생활",
    difficulty: "하",
    indonesian: "Setiap pagi ada pasar di kampung. Ibu membeli sayur dan ikan.",
    korean: "아침마다 마을에 시장이 섭니다. 어머니는 채소와 생선을 삽니다.",
    background: [],
  }, ["createdAt", "createdAt"]);
}
