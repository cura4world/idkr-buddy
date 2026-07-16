// src/lib/prayerStore.ts
// 생성한 기도문을 폰에 영구 저장(IndexedDB). 핀 고정 지원.

import { PrayerData, PrayerLength, MeetingPhase } from "@/lib/prayer";

const DB_NAME = "kata-prayers";
const STORE = "prayers";

export interface PrayerRecord extends PrayerData {
  id: string;
  createdAt: number;
  categoryId: string;
  situationId: string;
  situationLabel: string; // "셀모임 시작 기도" 등 표시용
  phase?: MeetingPhase | null;
  name?: string;
  note?: string;
  customText?: string; // 상황 "기타" 선택 시 직접 적은 내용
  length: PrayerLength;
  pinned?: boolean;
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

// 기도문 저장 (생성 직후) 또는 갱신 (핀 토글 등 — 같은 id면 덮어씀)
export async function savePrayer(rec: PrayerRecord): Promise<void> {
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
}

export function newPrayerRecord(
  data: PrayerData,
  meta: Omit<PrayerRecord, "id" | "createdAt" | "title" | "indonesian" | "korean">
): PrayerRecord {
  return {
    ...data,
    ...meta,
    id: (crypto as any)?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
  };
}

// 전체 목록 (핀 먼저, 그다음 최신순)
export async function listPrayers(): Promise<PrayerRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as PrayerRecord[];
        all.sort((a, b) => {
          if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
          return b.createdAt - a.createdAt;
        });
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deletePrayer(id: string): Promise<void> {
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
