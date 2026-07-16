// src/lib/devotionStore.ts
// 생성한 묵상을 폰에 영구 저장(IndexedDB "kata-devotions").
// 성경 본문(TB)은 저장하지 않고 묵상 글만 저장합니다. 본문은 볼 때마다 불러옵니다.

import { DevotionContent } from "@/lib/devotion";

const DB_NAME = "kata-devotions";
const STORE = "devotions";

export interface DevotionRecord {
  id: string;        // `${bookId}-${chapter}`
  bookId: string;
  chapter: number;
  createdAt: number;
  content: DevotionContent;
}

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
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 묵상 저장 (같은 장을 다시 생성하면 덮어씀)
export async function saveDevotion(
  bookId: string,
  chapter: number,
  content: DevotionContent
): Promise<DevotionRecord> {
  const rec: DevotionRecord = {
    id: bookId + "-" + chapter,
    bookId,
    chapter,
    createdAt: Date.now(),
    content,
  };
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장 실패해도 세션 내 사용은 가능
  }
  return rec;
}

// 전체 묵상 목록 (최신순)
export async function listDevotions(): Promise<DevotionRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as DevotionRecord[];
        all.sort((a, b) => b.createdAt - a.createdAt);
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// 묵상 1개 조회
export async function getDevotion(id: string): Promise<DevotionRecord | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as DevotionRecord) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 묵상 삭제 (추후 사용 대비)
export async function deleteDevotion(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}
