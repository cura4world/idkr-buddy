// src/lib/map.ts
// 인도네시아 지도: 지점(도시/관광지) 설명을 Gemini로 생성하고 IndexedDB에 영구 캐싱합니다.
// 한 번 본 지점은 재과금 없이 즉시 표시됩니다 (이야기/단어 캐시와 같은 패턴).

import { getGeminiApiKey } from "@/lib/gemini";

const TEXT_MODEL = "gemini-flash-lite-latest";
const DB_NAME = "kata-map-places";
const DB_VERSION = 1;
const STORE = "places";

export interface MapPlaceWord {
  word: string;      // 인니어 단어
  meaning: string;   // 한국어 뜻
  example: string;   // 인니어 예문
  exampleKo: string; // 예문 번역
}

export interface MapPlaceInfo {
  id: string;        // 지점 id (인니어 이름, 캐시 키)
  desc: string;      // 한국어 설명 (3~5문장)
  descId: string;    // 인니어 한 문장 소개
  words: MapPlaceWord[];
  createdAt: number;
}

// ---------- IndexedDB ----------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedPlace(id: string): Promise<MapPlaceInfo | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as MapPlaceInfo) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function savePlace(info: MapPlaceInfo): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(info);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 캐시 저장 실패는 무시 (다음에 다시 생성됨)
  }
}

export async function clearMapPlaces(): Promise<void> {
  try {
    const db = await openDb();
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

// ---------- Gemini ----------
async function callGeminiJSON(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TEXT_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("EMPTY_RESPONSE");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("PARSE_FAILED");
  }
}

// ---------- 지점 정보 (캐시 우선) ----------
export async function fetchPlaceInfo(
  id: string,
  ko: string,
  type: "city" | "spot"
): Promise<MapPlaceInfo> {
  const cached = await getCachedPlace(id);
  if (cached) return cached;

  const typeLabel = type === "spot" ? "관광지" : "도시";
  const prompt =
    "인도네시아어를 배우는 한국인을 위한 학습 지도 앱입니다. 아래 지점의 정보를 JSON으로 작성해주세요.\n\n" +
    "[지점] " + ko + " (" + id + ") — " + typeLabel + "\n\n" +
    "[작성 지침]\n" +
    "1. desc: 한국어 설명 3~5문장. 지리적 위치, 특징, 왜 중요한지, 그리고 인도네시아어 학습자가 알아두면 좋은 문화·언어 포인트를 담습니다. 사실에 근거하고 과장하지 않습니다.\n" +
    "2. descId: 이 지점을 소개하는 아주 쉬운 인도네시아어 한 문장 (초급 학습자용).\n" +
    "3. words: 이 지점과 관련된 인도네시아어 단어 4개. 각 단어는 word(인니어), meaning(한국어 뜻), example(이 지역 맥락의 쉬운 인니어 예문), exampleKo(예문 번역).\n\n" +
    "[출력 — 유효한 JSON 하나만]\n" +
    '{"desc":"...","descId":"...","words":[{"word":"...","meaning":"...","example":"...","exampleKo":"..."}]}';

  const parsed = await callGeminiJSON(prompt);

  const rawWords = Array.isArray(parsed.words) ? (parsed.words as Record<string, unknown>[]) : [];
  const words: MapPlaceWord[] = rawWords
    .map((w) => ({
      word: (w.word || "").toString().trim(),
      meaning: (w.meaning || "").toString().trim(),
      example: (w.example || "").toString().trim(),
      exampleKo: (w.exampleKo || "").toString().trim(),
    }))
    .filter((w) => w.word && w.meaning)
    .slice(0, 6);

  const info: MapPlaceInfo = {
    id,
    desc: (parsed.desc || "").toString().trim(),
    descId: (parsed.descId || "").toString().trim(),
    words,
    createdAt: Date.now(),
  };

  if (!info.desc) throw new Error("PARSE_FAILED");

  await savePlace(info);
  return info;
}
