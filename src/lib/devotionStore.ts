// src/lib/devotionStore.ts
// 생성한 QT 묵상을 폰에 영구 저장(IndexedDB "kata-devotions").
// 성경 본문은 저장하지 않고(개역개정/우리말성경/TB 모두 그때그때 불러옴), 묵상 도우미 글만 저장합니다.
// id는 "QT-YYYY-MM-DD" 형식입니다 (하루에 하나).

import { DevotionContent } from "@/lib/devotion";
import { QtToday, QtVerse } from "@/lib/qtToday";

const DB_NAME = "kata-devotions";
const STORE = "devotions";
const ID_PREFIX = "QT-";

export interface DevotionRecord {
  id: string; // "QT-2026-07-21"
  date: string; // "2026-07-21"
  book: string; // 두란노 원문 그대로의 한국어 책 이름 (예: "에스겔")
  bookId: string; // BIBLE_BOOKS id (매칭 안 되면 "")
  bookIdName: string; // 인니어 책 이름 (매칭 안 되면 book 그대로)
  chapter: number;
  endChapter: number;
  verseStart: number;
  verseEnd: number;
  crossChapter: boolean;
  rangeText: string; // "에스겔 28:1~19"
  hymn: string;
  // 개역개정/우리말성경은 그날 하루만 공개되는 today.json에서 오므로,
  // 지난 묵상에서도 다시 볼 수 있도록 생성 시점에 그대로 저장해둡니다.
  // (TB는 날짜와 무관하게 언제든 재조회 가능해 저장하지 않습니다 — bible.ts 참고)
  versesGae: QtVerse[];
  versesWoorimal: QtVerse[];
  createdAt: number;
  content: DevotionContent;
}

export function qtIdFor(date: string): string {
  return ID_PREFIX + date;
}

export function isQtRecordId(id: string): boolean {
  return id.startsWith(ID_PREFIX);
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

// 묵상 저장 (같은 날짜를 다시 생성하면 덮어씀)
export async function saveDevotion(
  qt: QtToday,
  bookId: string,
  bookIdName: string,
  content: DevotionContent
): Promise<DevotionRecord> {
  const rec: DevotionRecord = {
    id: qtIdFor(qt.date),
    date: qt.date,
    book: qt.book,
    bookId,
    bookIdName: bookIdName || qt.book,
    chapter: qt.chapter,
    endChapter: qt.endChapter,
    verseStart: qt.verseStart,
    verseEnd: qt.verseEnd,
    crossChapter: qt.crossChapter,
    rangeText: qt.rangeText,
    hymn: qt.hymn,
    versesGae: qt.verses,
    versesWoorimal: qt.versesWoorimal,
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

// 전체 묵상 목록 (최신순). 예전 스키마(책 순서 진행 방식)로 남아있는 레코드는 걸러냅니다.
export async function listDevotions(): Promise<DevotionRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = ((req.result || []) as DevotionRecord[]).filter((r) => r && isQtRecordId(r.id));
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
