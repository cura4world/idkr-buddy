// src/lib/map.ts
// 인도네시아 지도: 지점(도시/관광지) 설명을 Gemini로 생성하고 IndexedDB에 영구 캐싱합니다.
// 한 번 본 지점은 재과금 없이 즉시 표시됩니다 (이야기/단어 캐시와 같은 패턴).
//
// 지금은 모든 핀에 미리 써 둔 원고(src/lib/mapContent)가 있어 이 생성은 원고가 없는 핀에만 쓰입니다.
// 사진은 더 이상 여기서 찾지 않습니다 — 고정 목록 src/lib/mapPhotos.ts 를 씁니다(2026-11-10, S55).
// 예전의 위키피디아 실시간 검색은 같은 사진이 여러 지점에 겹쳐 나와서 걷어냈습니다.

import { callGeminiJSON } from "@/lib/geminiText";

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

// ---------- 지점 정보 (캐시 우선) ----------
export async function fetchPlaceInfo(
  id: string,
  ko: string,
  type: "city" | "spot" | "faith" | "culture"
): Promise<MapPlaceInfo> {
  const cached = await getCachedPlace(id);
  if (cached) return cached;

  const typeLabel =
    type === "spot"
      ? "관광지"
      : type === "faith"
        ? "종교·역사 유적지"
        : type === "culture"
          ? "민족·전통문화 지역"
          : "도시";
  const prompt =
    "한국인을 위한 인도네시아 학습 지도 앱입니다. 아래 지역에 대한 충실한 한국어 설명을 JSON으로 작성해주세요.\n\n" +
    "[지역] " + ko + " (" + id + ") — " + typeLabel + "\n\n" +
    "[작성 지침]\n" +
    "desc: 한국어 설명 5~7문장. 다음을 풍부하게 담습니다 — 지리적 위치와 속한 섬/주, 역사적 배경, 대표적인 명소·자연·볼거리, 그 지역만의 문화·민족·음식·특산물, 방문자가 알면 좋은 흥미로운 사실. 사실에 근거하고 구체적으로 씁니다. 인도네시아어 학습 조언은 넣지 않습니다.\n\n" +
    "[출력 — 유효한 JSON 하나만]\n" +
    '{"desc":"..."}';

  const parsed = await callGeminiJSON(prompt);

  const info: MapPlaceInfo = {
    id,
    desc: (parsed.desc || "").toString().trim(),
    descId: "",
    words: [],
    createdAt: Date.now(),
  };

  if (!info.desc) throw new Error("PARSE_FAILED");

  await savePlace(info);
  return info;
}
