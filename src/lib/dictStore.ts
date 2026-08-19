// src/lib/dictStore.ts
// 사전 검색 결과를 폰에 영구 저장(IndexedDB).
// - 같은 검색어를 다시 찾으면 Gemini를 부르지 않고 저장된 결과를 그대로 씁니다.
//   생성형 모델이라 매번 결과가 조금씩 달라지는데, 캐시가 있으면 항상 같은 화면이 나옵니다.
// - 단어 풀이 저장소(kata-lookup-words)와는 별개 DB라 서로 영향이 없습니다.
// - 상한 5,000건. 초과하면 가장 오래된 것부터 자동 삭제(FIFO).
// - 유효기간은 두지 않습니다. 사전 뜻풀이는 시간이 지나도 상하지 않습니다.

import { InputKind } from "@/lib/dictionary";

const DB_NAME = "kata-dict-results";
const STORE = "results";
const MAX_ITEMS = 5000;

interface DictCacheRecord {
  key: string;      // "{kind}:{정규화된 검색어}"
  kind: InputKind;
  term: string;     // 사용자가 실제로 입력한 원문 (표시·디버깅용)
  data: any;        // 결과 객체 그대로 (DictResult / IdSentenceResult / KoWordResult / KoSentenceResult)
  savedAt: number;  // 저장 시각 (오래된 것 판별용)
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

// 캐시 키. 앞뒤 공백을 지우고 연속 공백은 1칸으로 줄입니다.
// 인니어는 대소문자를 구분하지 않으므로 소문자로 통일하고("Buruk" = "buruk"),
// 한국어는 대소문자 개념이 없어 원문을 그대로 씁니다.
export function dictCacheKey(kind: InputKind, term: string): string {
  const collapsed = term.trim().replace(new RegExp("\\s+", "g"), " ");
  const norm = kind === "id_word" || kind === "id_sentence" ? collapsed.toLowerCase() : collapsed;
  return kind + ":" + norm;
}

// 저장된 결과 가져오기 (없거나 실패하면 null)
export async function getCachedResult(key: string): Promise<any | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const rec = req.result as DictCacheRecord | undefined;
        resolve(rec && rec.data !== undefined && rec.data !== null ? rec.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 현재 저장 개수
export async function countCachedResults(): Promise<number> {
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

// 결과 저장. 같은 키가 있으면 덮어씁니다("다시 검색" 경로).
export async function saveCachedResult(
  key: string,
  kind: InputKind,
  term: string,
  data: any
): Promise<void> {
  if (!key || data === undefined || data === null) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, kind, term, data, savedAt: Date.now() } as DictCacheRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });

    const count = await countCachedResults();
    if (count <= MAX_ITEMS) return;

    // 상한 초과: 오래된 것부터 (count - MAX_ITEMS)개 삭제
    await evictOldest(count - MAX_ITEMS);
  } catch {
    // 저장 실패는 무시합니다. 캐시가 없어도 검색 자체는 동작해야 합니다.
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
      tx.onabort = () => resolve();
    });
  } catch {
    // 무시
  }
}

// 저장된 결과 전부 삭제 (설정의 "비우기" 버튼)
export async function clearCachedResults(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // 무시
  }
}
