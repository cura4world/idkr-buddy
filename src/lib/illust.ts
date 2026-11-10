// src/lib/illust.ts
// 기본 단어장 단어 카드의 색연필 그림(예문 한 장면) 불러오기.
//
// 그림은 단어장마다 한 파일: src/data/illust/illust-<key>.json (형식은 같은 폴더 README.md).
// 빌드하면 각 파일이 따로 떨어진 자원(assets/illust-<key>-<해시>.json)이 되고, 메인 번들에는
// 그 주소만 들어갑니다. 단어장을 열 때 그 권의 파일만 받아 오고, 서비스워커가 받아 둔 파일을
// 폰에 남깁니다(vite.config.ts 의 runtimeCaching "kata-illust"). 내용이 바뀌면 해시가 바뀌어 새로 받습니다.
//
// 그림이 없는 단어는 아무것도 그리지 않습니다(자리 표시 없음).
// 단어 키는 인도네시아어 표제어 그대로입니다 — 단어장 번호가 바뀌어도 그대로 맞습니다.

import { bookTitle } from "@/lib/wordbookGroups";

export interface IllustScene {
  /** SVG viewBox, 보통 "0 0 120 72" */
  vb: string;
  /** 화면 높이(px). 폭은 viewBox 비율로 정해집니다 */
  h: number;
  /** 단어 줄 오른쪽 끝(스피커 포함)에서 그림 오른쪽 끝까지(px). 기본 56 */
  r?: number;
  /** 단어 줄 위쪽에서 그림 위쪽까지(px, 음수면 위로 올라감). 기본 -12 */
  t?: number;
  /** 색연필 윤곽선 겹치기 (기본 true) */
  line?: boolean;
  /** <svg> 안쪽 도형들 (한 번만 적음 — 칠과 윤곽선 두 겹은 화면에서 만듭니다) */
  art: string;
}

interface IllustBook {
  book: string;
  scenes: Record<string, IllustScene>;
}

/**
 * 단어장 이름(번호 뺀 것) → 파일 키. 새 단어장 그림 파일을 만들면 여기에 한 줄 더합니다.
 * 키는 영문 소문자·숫자·하이픈만 (파일 이름 illust-<key>.json 과 같게).
 */
export const ILLUST_BOOK_KEYS: Record<string, string> = {
  // 공개 단어장 01~34. 파일(illust-<key>.json)이 아직 없는 권은 그림 없이 보입니다.
  "인사·기본 표현": "salam",
  "인칭·지시·의문": "kata-ganti",
  "전치사·접속사": "preposisi",
  "수량·숫자·단위": "angka",
  "시간·날짜·순서": "waktu",
  "입말·구어": "gaul",
  "이동·존재": "gerak",
  "행위·조작": "tindakan",
  "인지·소통": "komunikasi",
  "접사 가족": "imbuhan",
  "상태·성질": "sifat",
  "평가·정도": "penilaian",
  "빈도·양태": "frekuensi",
  "가족·호칭": "keluarga",
  "신체·건강": "tubuh",
  "감정·성격": "perasaan",
  "음식·요리": "makanan",
  "집·생활용품": "rumah",
  "옷·외모": "pakaian",
  "쇼핑·돈": "belanja",
  "취미·운동·여가": "hobi",
  "직업·직장": "pekerjaan",
  "교육·학교": "sekolah",
  "의료·병원": "rumah-sakit",
  "행정·법률": "hukum",
  "긴급·안전": "darurat",
  "사회·경제·뉴스": "ekonomi",
  "동물": "hewan",
  "식물·농업": "tanaman",
  "날씨·지형": "cuaca",
  "교통": "transportasi",
  "장소·여행": "wisata",
  "기술·인터넷": "teknologi",
  "인도네시아 문화": "budaya",
};

// 파일 주소만 미리 모아 둡니다(내용은 열 때 받음).
const URLS = import.meta.glob("../data/illust/illust-*.json", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

function urlForKey(key: string): string | null {
  const want = "/illust-" + key + ".json";
  for (const p of Object.keys(URLS)) {
    if (p.endsWith(want)) return URLS[p];
  }
  return null;
}

const FETCH_TIMEOUT_MS = 12000;
const memory = new Map<string, Record<string, IllustScene>>();
const pending = new Map<string, Promise<Record<string, IllustScene>>>();

/** 이 단어장에 그림 파일이 있는가 (받아 오지 않고 판단) */
export function hasIllustBook(categoryName: string): boolean {
  const key = ILLUST_BOOK_KEYS[bookTitle(categoryName)];
  return !!key && urlForKey(key) !== null;
}

/** 이 단어장의 그림 묶음. 없거나 못 받으면 빈 객체(그림 없이 보임). */
export function loadIllustBook(categoryName: string): Promise<Record<string, IllustScene>> {
  const key = ILLUST_BOOK_KEYS[bookTitle(categoryName)];
  if (!key) return Promise.resolve({});
  const hit = memory.get(key);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(key);
  if (wait) return wait;
  const url = urlForKey(key);
  if (!url) return Promise.resolve({});

  const job = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return {};
      const data = (await res.json()) as IllustBook;
      const scenes = data && data.scenes && typeof data.scenes === "object" ? data.scenes : {};
      memory.set(key, scenes);
      return scenes;
    } catch (e) {
      return {};
    } finally {
      clearTimeout(timer);
      pending.delete(key);
    }
  })();
  pending.set(key, job);
  return job;
}
