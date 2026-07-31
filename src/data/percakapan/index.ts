import type { PercakapanCategory, PercakapanScene } from "./types";
import { DASAR } from "./01-dasar";
import { PERKENALAN } from "./02-perkenalan";
import { MAKAN } from "./03-makan";
import { TRANSPORTASI } from "./05-transportasi";
import { KESEHATAN } from "./08-kesehatan";
import { GEREJA } from "./09-gereja";

export type {
  PercakapanSpeaker,
  PercakapanGender,
  PercakapanLevel,
  PercakapanLine,
  PercakapanScene,
  PercakapanCategory,
} from "./types";

/**
 * 기본 카테고리 12개.
 * 아직 회화 데이터가 없는 카테고리도 미리 정의해 둔다.
 * (화면에서는 장면이 0개이고 custom이 아닌 카테고리를 숨긴다.
 *  나중에 데이터 파일만 추가하면 이 목록은 손대지 않아도 된다.)
 */
export const BUILTIN_CATEGORIES: PercakapanCategory[] = [
  { id: "dasar", title: "인사와 기본", titleId: "Dasar", emoji: "🙌" },
  { id: "perkenalan", title: "친해지기", titleId: "Perkenalan", emoji: "🤝" },
  { id: "makan", title: "음식과 식당", titleId: "Makan", emoji: "🍜" },
  { id: "belanja", title: "쇼핑과 시장", titleId: "Belanja", emoji: "🛒" },
  { id: "transportasi", title: "이동과 교통", titleId: "Transportasi", emoji: "🛵" },
  { id: "penginapan", title: "숙소와 여행", titleId: "Penginapan", emoji: "🏨" },
  { id: "sehari-hari", title: "일상 생활", titleId: "Sehari-hari", emoji: "🏠" },
  { id: "kesehatan", title: "건강과 병원", titleId: "Kesehatan", emoji: "💊" },
  { id: "gereja", title: "교회와 신앙", titleId: "Gereja", emoji: "⛪" },
  { id: "kerja", title: "일과 업무", titleId: "Kerja", emoji: "💼" },
  { id: "telepon", title: "전화와 채팅", titleId: "Telepon", emoji: "📱" },
  { id: "masalah", title: "문제 상황", titleId: "Masalah", emoji: "🚨" },
];

/** 기본 제공 회화 장면 전체 */
export const BUILTIN_SCENES: PercakapanScene[] = [
  ...DASAR,
  ...PERKENALAN,
  ...MAKAN,
  ...TRANSPORTASI,
  ...KESEHATAN,
  ...GEREJA,
];

/** 카테고리 id로 기본 장면 걸러내기 */
export function builtinScenesOf(catId: string): PercakapanScene[] {
  return BUILTIN_SCENES.filter(function (s) {
    return s.cat === catId;
  });
}

/** 장면 id로 기본 장면 찾기 */
export function findBuiltinScene(id: string): PercakapanScene | null {
  for (let i = 0; i < BUILTIN_SCENES.length; i++) {
    if (BUILTIN_SCENES[i].id === id) return BUILTIN_SCENES[i];
  }
  return null;
}

/** 기본 카테고리 id로 카테고리 찾기 */
export function findBuiltinCategory(id: string): PercakapanCategory | null {
  for (let i = 0; i < BUILTIN_CATEGORIES.length; i++) {
    if (BUILTIN_CATEGORIES[i].id === id) return BUILTIN_CATEGORIES[i];
  }
  return null;
}

export default BUILTIN_SCENES;
