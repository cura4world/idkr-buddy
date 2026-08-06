// src/lib/mapContent/index.ts
// 지도 지점 내용의 진입점입니다.
//
// IndoMap 은 이 모듈을 정적으로 import 하지 않고 지도를 열 때 한 번만 불러옵니다.
//   const { getMapContent } = await import("@/lib/mapContent");
// 그래야 Vite 가 별도 청크로 잘라내어, 지도를 안 여는 사람의 첫 로드에 영향을 주지 않습니다.
//
// 배치를 추가할 때: 지역 파일을 만들고 아래 두 곳(import 와 TABLES)에만 한 줄씩 더합니다.

import { MapContentEntry, MapContentTable } from "./types";
import { JAWA_TENGAH_TIMUR } from "./jawaTengahTimur";
import { JAWA_BARAT } from "./jawaBarat";
import { BALI_NUSA } from "./baliNusa";
import { SUMATERA_UTARA } from "./sumateraUtara";
import { SUMATERA_SELATAN } from "./sumateraSelatan";
import { KALIMANTAN } from "./kalimantan";

const TABLES: MapContentTable[] = [
  JAWA_TENGAH_TIMUR,
  JAWA_BARAT,
  BALI_NUSA,
  SUMATERA_UTARA,
  SUMATERA_SELATAN,
  KALIMANTAN,
];

const ALL: MapContentTable = Object.assign({}, ...TABLES);

// 아직 내용을 쓰지 않은 지점은 null 입니다. 시트는 그 경우 사진과 이름만 보여줍니다.
export function getMapContent(id: string): MapContentEntry | null {
  return ALL[id] || null;
}

// 내용이 준비된 지점 수 (검증용)
export function mapContentCount(): number {
  return Object.keys(ALL).length;
}

export type { MapContentEntry, MapWord, MapContentTable } from "./types";
