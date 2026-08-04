// src/lib/wordStore.ts
// 이야기에서 찾아본 단어를 폰에 영구 저장(IndexedDB).
// 텍스트만 저장하므로 용량 부담이 거의 없고, 조회는 필요한 1개만 꺼내 쓰므로 빠릅니다.
// localStorage(단어장)와 별개 공간이라 기존 데이터에 영향을 주지 않습니다.

import { medaliEngine } from "@/lib/medali";

const DB_NAME = "kata-lookup-words";
const STORE = "words";

export interface LookupRecord {
  key: string;       // 소문자 단어
  meaning: string;   // 뜻 (여러 뜻이면 모두)
  info: string;      // 단어 설명
  savedAt: number;
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
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 저장된 단어 조회 (없으면 null)
export async function getLookupWord(word: string): Promise<LookupRecord | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(word.toLowerCase());
      req.onsuccess = () => resolve((req.result as LookupRecord) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 단어 저장
// 이 함수는 API로 새 단어를 받아왔을 때만 불리므로(캐시 적중 경로에서는 호출 안 됨)
// 여기서 한 번만 점수를 올리면 화면마다 고칠 필요가 없습니다.
export async function saveLookupWord(word: string, meaning: string, info: string): Promise<void> {
  medaliEngine.addPoints("popup", 1).catch(() => {});  // 새 단어 팝업 +1 (조용히)
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        key: word.toLowerCase(),
        meaning,
        info,
        savedAt: Date.now(),
      } as LookupRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장 실패해도 화면 표시는 정상 동작
  }
}

// 저장된 단어 개수
export async function countLookupWords(): Promise<number> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// 전체 삭제 (설정에서 사용)
export async function clearLookupWords(): Promise<void> {
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

// 최근에 찾아본 단어부터 limit개. 게임 출제 풀용.
export async function listLookupWords(limit: number): Promise<LookupRecord[]> {
  try {
    const db = await openDB();
    const all = await new Promise<LookupRecord[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as LookupRecord[]) || []);
      req.onerror = () => resolve([]);
    });
    all.sort((a, b) => b.savedAt - a.savedAt);
    return all.slice(0, limit);
  } catch {
    return [];
  }
}
