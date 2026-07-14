// src/lib/imageStore.ts
// 사전 단어 이미지를 폰에 영구 저장(IndexedDB).
// - localStorage와 별개 공간이라 단어장 데이터에 영향을 주지 않습니다.
// - 화면에는 필요한 1장만 꺼내 쓰므로 저장 개수가 많아도 메모리 부담이 없습니다.
// - 상한 5,000장. 초과하면 가장 오래된 것부터 자동 삭제(FIFO).

const DB_NAME = "kata-dict-images";
const STORE = "images";
const MAX_ITEMS = 5000;

interface ImageRecord {
  key: string;     // 소문자 단어
  dataUrl: string; // base64 data URL
  savedAt: number; // 저장 시각 (오래된 것 판별용)
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    // IndexedDB 미지원 환경 방어
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 저장된 이미지 가져오기 (없으면 null)
export async function getStoredImage(word: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(word.toLowerCase());
      req.onsuccess = () => resolve(req.result ? (req.result as ImageRecord).dataUrl : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 현재 저장 개수
export async function countStoredImages(): Promise<number> {
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

// 이미지 저장. 반환값: 이번 저장으로 상한(5,000)을 처음 넘겼으면 true.
export async function saveStoredImage(word: string, dataUrl: string): Promise<{ overflowed: boolean }> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key: word.toLowerCase(), dataUrl, savedAt: Date.now() } as ImageRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });

    const count = await countStoredImages();
    if (count <= MAX_ITEMS) return { overflowed: false };

    // 상한 초과: 오래된 것부터 (count - MAX_ITEMS)개 삭제
    await evictOldest(count - MAX_ITEMS);
    return { overflowed: true };
  } catch {
    return { overflowed: false };
  }
}

// 가장 오래된 n개 삭제 (savedAt 오름차순)
async function evictOldest(n: number): Promise<void> {
  if (n <= 0) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const index = tx.objectStore(STORE).index("savedAt");
      const cursorReq = index.openCursor(); // 오름차순 = 오래된 것부터
      let removed = 0;
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && removed < n) {
          cursor.delete();
          removed++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}

// 저장된 이미지 전부 삭제 (설정의 "비우기" 버튼)
export async function clearStoredImages(): Promise<void> {
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
