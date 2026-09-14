// src/lib/bibleHighlight.ts
// 성경 읽기 형광펜 — 한 장(章) 단위로 IndexedDB 에 저장합니다.
//
// 칠하는 단위는 "어절(토큰)" 입니다. 본문은 이미 공백으로 쪼개 토큰마다 span 을 그리고
// 있으므로, 토큰 열쇠 하나에 색 하나를 적어 두면 그리기도 지우기도 한 줄로 끝납니다.
// 글자 단위 오프셋으로 저장하면 절 보정(repairVerses)이나 번역본 갱신에 자리가 어긋납니다.
//
// 토큰 열쇠:  "id:6:3"  = 인니어 본문 6절의 4번째 어절
//            "ko:6:3"  = 한국어 본문 6절의 4번째 어절
//            "idi:5:0" = 시편 표제(intro) 줄
// 레코드 열쇠: "matius:24" (bookId:chapter)
//
// 텍스트만 담으므로 한 장을 다 칠해도 2KB 안팎입니다. 그래도 localStorage 가 아니라
// IndexedDB 를 쓰는 것은 localStorage 가 단어장·API 키와 한 통을 쓰기 때문입니다.

import type { CSSProperties } from "react";

export type HlColor = "y" | "b" | "g";

/** 한 장의 형광펜 = { 토큰열쇠: 색 } */
export type ChapterHl = Record<string, HlColor>;

const DB_NAME = "kata-bible-hl";
const STORE = "chapters";

/** 첨부 스크린샷(우리말성경)에서 뽑은 실제 색입니다 — 형광노랑 / 형광파랑 / 형광녹색 */
export const HL_RGB: Record<HlColor, string> = {
  y: "255,245,188",
  b: "198,220,254",
  g: "193,243,192",
};

/** 도구막대에 놓는 순서 */
export const HL_ORDER: HlColor[] = ["y", "b", "g"];

// 마커 느낌: 끝이 옅게 풀리고, 각도를 살짝 주어 위아래 선이 평행하지 않게 보입니다.
// 임의값 클래스(calc 등)는 주입 과정에서 깨질 수 있어 인라인 style 로 줍니다.
export function hlStyle(c: HlColor): CSSProperties {
  const v = HL_RGB[c];
  const stop = (a: string, p: string) => "rgba(" + v + "," + a + ") " + p;
  return {
    backgroundImage:
      "linear-gradient(101deg, " +
      stop("0", "0%") + ", " +
      stop("0.72", "1.4%") + ", " +
      stop("1", "5%") + ", " +
      stop("0.92", "48%") + ", " +
      stop("1", "82%") + ", " +
      stop("0.78", "98.6%") + ", " +
      stop("0", "100%") +
      ")",
    borderRadius: "0.16em",
    padding: "0.10em 0.02em 0.06em",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
  } as CSSProperties;
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

/** 한 장의 형광펜을 읽습니다 (없으면 빈 객체) */
export async function loadChapterHl(key: string): Promise<ChapterHl> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const rec = req.result as { key: string; marks?: ChapterHl } | undefined;
        resolve(rec && rec.marks ? rec.marks : {});
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

/** 한 장의 형광펜을 통째로 덮어씁니다. 비었으면 레코드를 지웁니다. */
export async function saveChapterHl(key: string, marks: ChapterHl): Promise<void> {
  try {
    const db = await openDB();
    const empty = Object.keys(marks).length === 0;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      if (empty) store.delete(key);
      else store.put({ key, marks, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장에 실패해도 화면 표시는 정상 동작합니다
  }
}

/** 형광펜이 있는 장의 수 (설정 화면에서 쓸 수 있게 열어 둡니다) */
export async function countHlChapters(): Promise<number> {
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

/** 형광펜 전체 지우기 (설정 화면용) */
export async function clearAllHl(): Promise<void> {
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
