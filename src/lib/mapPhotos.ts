// src/lib/mapPhotos.ts
// 지도 시트의 사진 — 고정 목록 (S55, 2026-11-10 결정).
//
// 예전에는 핀을 누를 때마다 위키피디아에서 사진을 찾아 왔습니다. 그 방식은 지점끼리 무엇을
// 골랐는지 모르기 때문에 같은 사진이 여러 곳에 겹쳐 나왔고, 엉뚱한 사진도 섞였습니다.
// 그래서 사진을 미리 골라 이 파일에 적어 두고, 시트는 이 목록만 씁니다(네트워크 검색 없음).
//
// 규칙
//   · 지점마다 최대 2장. 한 사진은 지도 전체에서 한 지점에만 씁니다(겹침 금지).
//   · 위키미디어 공용(Commons)의 자유 라이선스 사진만 씁니다(CC BY · CC BY-SA · CC0 · 퍼블릭 도메인).
//     en.wikipedia 자체 파일(공정 이용)은 공개 앱에 쓸 수 없습니다.
//   · CC BY 계열은 사진마다 작가·라이선스·원본 주소를 보여야 합니다 → 설정 > 앱 정보 > 사진 출처
//     (/about/photos, src/pages/PhotoCredits.tsx). 시트에는 출처 문구를 두지 않습니다.
//   · 마땅한 사진이 없는 지점은 photos: [] 로 둡니다. 목록에 없는 지점도 사진을 그리지 않습니다.
//
// 만드는 법: node scripts/build-map-photos.mjs  (인터넷이 되는 PC에서 — 위키미디어 API 를 부릅니다)
//   → 이 파일을 통째로 다시 쓰고, 사람이 볼 확인용 HTML 을 함께 만듭니다.
//   사진이 그 지점을 잘 보여 주는지는 사람이 확인합니다. 바꿀 사진은 스크립트의 PICK 표에 적고 다시 돌립니다.

export type MapRegion = "sumatera" | "jawa" | "bali-nusa" | "kalimantan" | "sulawesi" | "maluku" | "papua";

export const MAP_REGION_ORDER: MapRegion[] = ["sumatera", "jawa", "bali-nusa", "kalimantan", "sulawesi", "maluku", "papua"];

export const MAP_REGION_LABEL: Record<MapRegion, { ko: string; id: string }> = {
  sumatera: { ko: "수마트라", id: "Sumatera" },
  jawa: { ko: "자바", id: "Jawa" },
  "bali-nusa": { ko: "발리·누사틍가라", id: "Bali dan Nusa Tenggara" },
  kalimantan: { ko: "칼리만탄", id: "Kalimantan" },
  sulawesi: { ko: "술라웨시", id: "Sulawesi" },
  maluku: { ko: "말루쿠", id: "Maluku" },
  papua: { ko: "파푸아", id: "Papua" },
};

export interface MapPhoto {
  file: string;        // Commons 파일 이름 ("File:" 없이)
  thumb: string;       // 화면에 띄우는 주소 (upload.wikimedia.org, 폭 640px 썸네일)
  author: string;      // 작가 (Commons 의 Artist, 글자만)
  license: string;     // 예: "CC BY-SA 4.0"
  licenseUrl: string;  // 라이선스 본문 주소 (없으면 "")
  page: string;        // 원본 설명 페이지 (commons.wikimedia.org/wiki/File:...)
}

export interface MapPlacePhotos {
  region: MapRegion;
  photos: MapPhoto[];
}

// ── 고정 목록 ────────────────────────────────────────────────
// 아직 비어 있습니다: 2026-11-10 밤 작업 환경에서 위키미디어에 접속할 수 없어(차단)
// 목록을 만들지 못했습니다. 비어 있는 동안 시트에는 사진이 나오지 않습니다.
// scripts/build-map-photos.mjs 를 돌리면 이 아래가 채워집니다.
// @generated-start
export const MAP_PHOTOS: Record<string, MapPlacePhotos> = {};
// @generated-end

/** 그 지점의 사진(최대 2장). 없으면 빈 배열. */
export function getPlacePhotos(id: string): MapPhoto[] {
  const p = MAP_PHOTOS[id];
  return p ? p.photos.slice(0, 2) : [];
}

/** 사진이 한 장 이상 있는 지점 수 (확인용) */
export function photoPlaceCount(): number {
  return Object.keys(MAP_PHOTOS).filter((k) => MAP_PHOTOS[k].photos.length > 0).length;
}
