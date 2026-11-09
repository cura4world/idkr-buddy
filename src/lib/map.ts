// src/lib/map.ts
// 인도네시아 지도: 지점(도시/관광지) 설명을 Gemini로 생성하고 IndexedDB에 영구 캐싱합니다.
// 한 번 본 지점은 재과금 없이 즉시 표시됩니다 (이야기/단어 캐시와 같은 패턴).

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

// 여러 지역에서 똑같이 나오는 공용 이미지(국기·주 문장·위치 지도 등)를 걸러냅니다.
// 이게 느슨하면 어느 지역을 눌러도 인도네시아 국기가 나옵니다.
const BAD = new RegExp(
  "logo|icon|map|peta|flag|bendera|seal|emblem|lambang|coat|arms|locator|location|banner|commons|wikimedia|symbol|blank|crystal|indonesia_|_indonesia|question|disambig",
  "i"
);

// 위키 호출은 응답이 안 오면 사진 영역이 "불러오는 중"에 멈추므로 마감을 겁니다(저장소 규칙).
const WIKI_TIMEOUT_MS = 10000;

async function wikiFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, WIKI_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 위키미디어 공용(Commons) 사진만 씁니다. en.wikipedia 자체 파일(/wikipedia/en/)에는
// 자유 라이선스가 아닌 "공정 이용" 이미지가 섞여 있어 공개 앱에 쓸 수 없습니다.
function isCommonsUrl(u: string): boolean {
  return u.indexOf("https://upload.wikimedia.org/wikipedia/commons/") === 0;
}

// 위키피디아 페이지의 대표 이미지 + 본문 내 이미지들에서 최대 2장을 뽑습니다.
export async function fetchPlacePhotos(id: string, titleOverride?: string): Promise<string[]> {
  const title = titleOverride || WIKI_TITLE[id] || id;
  const urls: string[] = [];

  try {
    // 1) 페이지 대표 이미지 (원본 + 썸네일)
    const sumRes = await wikiFetch(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)
    );
    if (sumRes.ok) {
      const s = await sumRes.json();
      const lead = s?.originalimage?.source || s?.thumbnail?.source || "";
      if (lead && isCommonsUrl(lead)) urls.push(lead);
    }
  } catch (e) {}

  try {
    // 2) 본문 내 이미지들 (600px 폭 썸네일)
    const imgRes = await wikiFetch(
      "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=20&titles=" +
        encodeURIComponent(title)
    );
    if (imgRes.ok) {
      const data = await imgRes.json();
      const pages = data?.query?.pages || {};
      const first = Object.values(pages)[0] as any;
      const files: string[] = (first?.images || [])
        .map((x: any) => x.title as string)
        .filter((t: string) => new RegExp("\\.(jpg|jpeg|png)$", "i").test(t) && !BAD.test(t))
        .slice(0, 6);

      for (const f of files) {
        if (urls.length >= 2) break;
        try {
          const ii = await wikiFetch(
            "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=600&titles=" +
              encodeURIComponent(f)
          );
          if (!ii.ok) continue;
          const d = await ii.json();
          const p = Object.values(d?.query?.pages || {})[0] as any;
          const u = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
          if (u && isCommonsUrl(u) && !urls.includes(u)) urls.push(u);
        } catch (e) {}
      }
    }
  } catch (e) {}

  return urls.slice(0, 2);
}

// ── 사진 출처 ────────────────────────────────────────────────
// 위키미디어 공용 사진은 대부분 CC BY / CC BY-SA 라 저작자·라이선스·원본 주소를 함께 보여야 합니다.

export interface PhotoCredit {
  url: string;     // 화면에 띄운 사진 주소
  artist: string;  // 저작자 (없으면 "")
  license: string; // 예: "CC BY-SA 4.0" (없으면 "")
  page: string;    // 원본 설명 페이지 (Commons)
}

// 썸네일·원본 주소에서 파일 이름을 꺼냅니다.
//   .../commons/thumb/a/ab/Name.jpg/600px-Name.jpg → Name.jpg
//   .../commons/a/ab/Name.jpg                       → Name.jpg
function fileNameFromUrl(u: string): string {
  const parts = u.split("?")[0].split("/");
  const t = parts.indexOf("thumb");
  const raw = t >= 0 ? parts[t + 3] : parts[parts.length - 1];
  try {
    return decodeURIComponent(raw || "");
  } catch (e) {
    return raw || "";
  }
}

const TAG_RE = new RegExp("<[^>]*>", "g");
const SPACES_RE = new RegExp("\\s+", "g");

function plainText(html: unknown): string {
  return String(html || "").replace(TAG_RE, " ").replace(SPACES_RE, " ").trim();
}

export async function fetchPhotoCredits(urls: string[]): Promise<PhotoCredit[]> {
  const out: PhotoCredit[] = [];
  for (const url of urls) {
    const name = fileNameFromUrl(url);
    if (!name) continue;
    try {
      const res = await wikiFetch(
        "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" +
          encodeURIComponent("File:" + name)
      );
      if (!res.ok) continue;
      const d = await res.json();
      const p = Object.values(d?.query?.pages || {})[0] as any;
      const info = p?.imageinfo?.[0];
      const meta = info?.extmetadata || {};
      out.push({
        url,
        artist: plainText(meta?.Artist?.value).slice(0, 80),
        license: plainText(meta?.LicenseShortName?.value).slice(0, 40),
        page: String(info?.descriptionurl || "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(name)),
      });
    } catch (e) {}
  }
  return out;
}
