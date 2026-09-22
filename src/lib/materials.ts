// src/lib/materials.ts
// 일대일 교재처럼 "통짜 PDF 한 장"인 자료를 담는 곳입니다. 성경 본문과 달리
// 절 단위로 쪼개 저장할 이유가 없어서, 서버에는 원본 PDF 그대로(바이너리) 두고
// 기기에는 IndexedDB에 Blob 하나로 캐시합니다.
//
// 서버 주소·열쇠는 성경 것을 그대로 씁니다(bibleKo.ts) — "성경처럼 부부가 함께
// 본다"는 요구사항과 맞고, 따로 설정을 만들 이유가 없습니다.

import { getBibleBase, getBibleKey } from "@/lib/bibleKo";
import { pickServerAuth } from "@/lib/member";

const DB_NAME = "kata-materials";
const STORE = "files"; // key = 자료 id, value = { blob, savedAt }

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("NO_INDEXEDDB")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

async function readCached(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const rec = req.result as { blob?: Blob } | undefined;
        resolve(rec && rec.blob ? rec.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCached(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id, blob, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("SAVE_FAILED"));
    });
  } catch {
    // 캐시 실패는 무시합니다 — 다음에 열 때 다시 받으면 됩니다.
  }
}

export async function clearCachedMaterial(id: string): Promise<void> {
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

// 기존 성경 비밀키가 있으면 그것을, 없으면 회원키를 씁니다.
function serverConfig(): { base: string; headers: Record<string, string> } | null {
  return pickServerAuth(getBibleBase(), getBibleKey());
}

/** 기기에 캐시된 게 있으면 그것을, 없으면 서버에서 받아 캐시해 둔 뒤 돌려줍니다. */
export async function fetchMaterial(id: string): Promise<Blob> {
  const cached = await readCached(id);
  if (cached) return cached;

  const cfg = serverConfig();
  if (!cfg) throw new Error("NO_CONFIG");

  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 30000);
  let res: Response;
  try {
    res = await fetch(cfg.base + "/materials/" + id, {
      headers: cfg.headers,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403 || res.status === 409) throw new Error("UNAUTHORIZED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("FETCH_FAILED");

  const blob = await res.blob();
  await writeCached(id, blob);
  return blob;
}

/** PC 등 원본 파일을 갖고 있는 한 기기에서, 서버로 그대로 올립니다. */
export async function pushMaterial(id: string, file: File): Promise<number> {
  const cfg = serverConfig();
  if (!cfg) throw new Error("NO_CONFIG");

  const buf = await file.arrayBuffer();
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 60000);
  let res: Response;
  try {
    res = await fetch(cfg.base + "/materials/" + id, {
      method: "PUT",
      headers: cfg.headers,
      body: buf,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("FETCH_FAILED");

  // 올린 기기에도 곧바로 캐시해 둡니다(다시 안 받아도 되도록).
  await writeCached(id, new Blob([buf], { type: "application/pdf" }));
  return buf.byteLength;
}
