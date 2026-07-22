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

// ---------- 지점 실제 사진 (위키피디아, 무과금) ----------
// 위키피디아 페이지 제목 매핑 (영문 위키). 없으면 id를 그대로 시도합니다.
const WIKI_TITLE: Record<string, string> = {
  "Yogyakarta": "Yogyakarta",
  "Danau Toba": "Lake Toba",
  "Raja Ampat": "Raja Ampat Islands",
  "Gunung Bromo": "Mount Bromo",
  "Kawah Ijen": "Ijen",
  "Pulau Komodo": "Komodo (island)",
  "Gunung Rinjani": "Mount Rinjani",
  "Tana Toraja": "Tana Toraja Regency",
  "Pulau Belitung": "Belitung",
  "Nusa Penida": "Nusa Penida",
  "Gili Trawangan": "Gili Islands",
  "Dataran Tinggi Dieng": "Dieng Plateau",
  "Tangkuban Perahu": "Tangkuban Perahu",
  "Ujung Kulon": "Ujung Kulon National Park",
  "Kepulauan Mentawai": "Mentawai Islands",
  "Pulau Nias": "Nias",
  "Pulau Weh": "Weh Island",
  "Bukit Lawang": "Bukit Lawang",
  "Gunung Kerinci": "Mount Kerinci",
  "Krakatau": "Krakatoa",
  "Kepulauan Derawan": "Derawan Islands",
  "Tanjung Puting": "Tanjung Puting",
  "Kepulauan Togean": "Togian Islands",
  "Kepulauan Banda": "Banda Islands",
  "Lembah Baliem": "Baliem Valley",
  "Pulau Sumba": "Sumba",
  "Danau Kelimutu": "Kelimutu",
  "Kuta": "Kuta",
  "Ubud": "Ubud",
  "Bunaken": "Bunaken",
  "Wakatobi": "Wakatobi Regency",
  "Nusantara": "Nusantara (planned city)",
  "Surakarta": "Surakarta",
};

// 위키피디아 페이지의 대표 이미지 + 본문 내 이미지들에서 최대 3장을 뽑습니다.
export async function fetchPlacePhotos(id: string): Promise<string[]> {
  const title = WIKI_TITLE[id] || id;
  const urls: string[] = [];

  try {
    // 1) 페이지 대표 이미지 (원본 + 썸네일)
    const sumRes = await fetch(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)
    );
    if (sumRes.ok) {
      const s = await sumRes.json();
      if (s?.originalimage?.source) urls.push(s.originalimage.source);
      else if (s?.thumbnail?.source) urls.push(s.thumbnail.source);
    }
  } catch (e) {}

  try {
    // 2) 본문 내 이미지들 (600px 폭 썸네일)
    const imgRes = await fetch(
      "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=20&titles=" +
        encodeURIComponent(title)
    );
    if (imgRes.ok) {
      const data = await imgRes.json();
      const pages = data?.query?.pages || {};
      const first = Object.values(pages)[0] as any;
      const files: string[] = (first?.images || [])
        .map((x: any) => x.title as string)
        .filter((t: string) => /\.(jpg|jpeg|png)$/i.test(t) && !/logo|icon|map|flag|seal|coat|svg/i.test(t))
        .slice(0, 6);

      for (const f of files) {
        if (urls.length >= 3) break;
        try {
          const ii = await fetch(
            "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=600&titles=" +
              encodeURIComponent(f)
          );
          if (!ii.ok) continue;
          const d = await ii.json();
          const p = Object.values(d?.query?.pages || {})[0] as any;
          const u = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
          if (u && !urls.includes(u)) urls.push(u);
        } catch (e) {}
      }
    }
  } catch (e) {}

  return urls.slice(0, 3);
}
