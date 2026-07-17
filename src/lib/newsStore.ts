// src/lib/newsStore.ts
// 하루 1회 생성되는 뉴스 신문(에디션)을 폰에 영구 저장(IndexedDB).
// 날짜(YYYY-MM-DD)가 키이므로 같은 날짜는 한 번만 저장/과금됩니다.

import { NewsEdition } from "@/lib/news";

const DB_NAME = "kata-news";
const STORE = "editions";

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
        db.createObjectStore(STORE, { keyPath: "date" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 에디션 저장 (생성 직후 호출). 같은 날짜면 덮어씀.
export async function saveEdition(edition: NewsEdition): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(edition);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장 실패해도 세션 내 사용은 가능
  }
}

// 특정 날짜 에디션 조회 (없으면 null)
export async function getEdition(date: string): Promise<NewsEdition | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(date);
      req.onsuccess = () => resolve((req.result as NewsEdition) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 전체 에디션 목록 (최신 날짜순)
export async function listEditions(): Promise<NewsEdition[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as NewsEdition[];
        all.sort((a, b) => (a.date < b.date ? 1 : -1));
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// 에디션 삭제 (추후 사용 대비)
export async function deleteEdition(date: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(date);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}

// 전체 삭제 (설정 연동 대비)
export async function clearNews(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}
