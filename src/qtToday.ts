// src/lib/qtToday.ts
// 두란노 생명의삶 "오늘의 QT"를 매일 크롤링해 올려두는 공개 레포에서 가져옵니다.
// 데이터 자체는 저장하지 않고(원문 재배포 최소화), 그날그날 화면에 표시할 때만 불러옵니다.
// 생성된 묵상(devotionStore)에는 본문을 통째로 저장하지 않고 범위/메타데이터만 남깁니다.

const TODAY_URL = "https://raw.githubusercontent.com/cura4world/kata-qt-today/main/today.json";

export interface QtSection {
  label: string;
  range: string;
}

export interface QtVerse {
  n: number;
  t: string;
}

export interface QtToday {
  schema: number;
  date: string; // "2026-07-21"
  title: string; // 두란노 QT 제목 (한국어)
  rangeText: string; // "에스겔 28:1~19"
  book: string; // "에스겔" (한국어 책 이름)
  chapter: number;
  verseStart: number;
  verseEnd: number;
  endChapter: number;
  crossChapter: boolean;
  hymn: string;
  sections: QtSection[];
  verses: QtVerse[]; // 개역개정
  versesWoorimal: QtVerse[]; // 우리말성경 (실패한 날은 빈 배열일 수 있음)
  woorimalOk: boolean;
  sourceUrl: string;
  fetchedAt: string;
}

let cache: { date: string; data: QtToday } | null = null;

// 오늘의 QT를 가져옵니다. 같은 세션 내 같은 날짜면 재요청하지 않습니다.
export async function fetchTodayQt(): Promise<QtToday> {
  let res: Response;
  try {
    res = await fetch(TODAY_URL + "?t=" + Date.now(), { cache: "no-store" });
  } catch {
    throw new Error("QT_FETCH_FAILED");
  }
  if (!res.ok) throw new Error("QT_FETCH_FAILED");

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error("QT_PARSE_FAILED");
  }
  if (!data || typeof data.date !== "string" || !Array.isArray(data.verses)) {
    throw new Error("QT_PARSE_FAILED");
  }

  const qt: QtToday = {
    schema: Number(data.schema) || 1,
    date: data.date,
    title: (data.title || "").toString(),
    rangeText: (data.rangeText || "").toString(),
    book: (data.book || "").toString(),
    chapter: Number(data.chapter) || 1,
    verseStart: Number(data.verseStart) || 1,
    verseEnd: Number(data.verseEnd) || 1,
    endChapter: Number(data.endChapter) || Number(data.chapter) || 1,
    crossChapter: !!data.crossChapter,
    hymn: (data.hymn || "").toString(),
    sections: Array.isArray(data.sections) ? data.sections : [],
    verses: data.verses,
    versesWoorimal: Array.isArray(data.versesWoorimal) ? data.versesWoorimal : [],
    woorimalOk: !!data.woorimalOk,
    sourceUrl: (data.sourceUrl || "").toString(),
    fetchedAt: (data.fetchedAt || "").toString(),
  };

  cache = { date: qt.date, data: qt };
  return qt;
}

// 마지막으로 불러온 오늘의 QT(세션 캐시). 없으면 null.
export function getCachedTodayQt(): QtToday | null {
  return cache ? cache.data : null;
}
