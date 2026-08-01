// src/lib/sermonInk.ts
// 설교문 위에 S펜으로 쓴 필기를 폰에 영구 저장(IndexedDB).
// 좌표 배열이라 양이 커질 수 있어 localStorage 는 쓰지 않습니다.
// 저장 패턴은 storyStore.ts 와 같습니다 (openDB 싱글톤 Promise).

const DB_NAME = "kata-sermon-ink";
const STORE = "ink";

// 한 획을 이루는 조각. 굵기·진하기가 바뀌는 지점마다 조각이 나뉩니다.
export interface InkChunk {
  w: number;
  a: number;
  pts: number[]; // [x0,y0,x1,y1,...]
}

export interface InkStroke {
  tool: "pen" | "hl";
  color: string;
  chunks: InkChunk[];
}

export interface InkRecord {
  id: string; // 설교문 id (YYMMDD)
  fontStep: number; // 필기 당시 글자 크기 단계
  width: number; // 필기 당시 본문 래퍼 폭(px)
  strokes: InkStroke[];
  updatedAt: number;
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
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

// 저장된 필기 불러오기. 없거나 IndexedDB 를 못 쓰면 null.
export async function getInk(id: string): Promise<InkRecord | null> {
  if (!id) return null;
  try {
    const db = await openDB();
    return await new Promise<InkRecord | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const r = req.result as InkRecord | undefined;
        resolve(r && r.strokes ? r : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// 필기 저장 (덮어쓰기). 실패해도 조용히 넘어갑니다.
export async function saveInk(rec: InkRecord): Promise<void> {
  if (!rec || !rec.id) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장 실패해도 화면의 필기는 그대로 유지됩니다
  }
}

// 전체 지우기에서 사용
export async function deleteInk(id: string): Promise<void> {
  if (!id) return;
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
