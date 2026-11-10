import type { PercakapanCategory, PercakapanLevel, PercakapanScene } from "./types";
import { DASAR } from "./01-dasar";
import { PERKENALAN } from "./02-perkenalan";
import { MAKAN } from "./03-makan";
import { BELANJA } from "./04-belanja";
import { TRANSPORTASI } from "./05-transportasi";
import { PENGINAPAN } from "./06-penginapan";
import { SEHARI_HARI } from "./07-sehari-hari";
import { KESEHATAN } from "./08-kesehatan";
import { GEREJA } from "./09-gereja";
import { KERJA } from "./10-kerja";
import { TELEPON } from "./11-telepon";
import { MASALAH } from "./12-masalah";
import { UANG } from "./13-uang";
import { HARI_RAYA } from "./14-hari-raya";
import { KANTOR } from "./15-kantor";

export type {
  PercakapanSpeaker,
  PercakapanGender,
  PercakapanLevel,
  PercakapanLine,
  PercakapanScene,
  PercakapanCategory,
} from "./types";

/** 만들기 시트에 보여 줄 난이도 순서. 기본 선택은 "중" 입니다 (화면 쪽에서 정함). */
export const PERCAKAPAN_LEVELS: PercakapanLevel[] = ["하", "중", "상"];

/**
 * 기본 카테고리 15개 — 공개 14개 + 교회와 신앙(staffOnly).
 * 순서가 곧 화면 순서입니다. 교회와 신앙은 공개판에서 Special Member·관리자에게만 보이므로
 * 맨 뒤에 둡니다 (보이는 사람에게도 공개 14개의 순서가 흐트러지지 않게).
 * 장면이 0개인 기본 카테고리는 화면에서 숨깁니다 (src/lib/percakapan.ts listCategories).
 */
export const BUILTIN_CATEGORIES: PercakapanCategory[] = [
  { id: "dasar", title: "인사와 기본", titleId: "Dasar", emoji: "🙌" },
  { id: "perkenalan", title: "친해지기", titleId: "Perkenalan", emoji: "🤝" },
  { id: "makan", title: "음식과 식당", titleId: "Makan", emoji: "🍜" },
  { id: "belanja", title: "쇼핑과 시장", titleId: "Belanja", emoji: "🛒" },
  { id: "uang", title: "돈과 은행", titleId: "Uang dan Bank", emoji: "💰" },
  { id: "transportasi", title: "이동과 교통", titleId: "Transportasi", emoji: "🛵" },
  { id: "penginapan", title: "숙소와 여행", titleId: "Penginapan", emoji: "🏨" },
  { id: "sehari-hari", title: "일상 생활", titleId: "Sehari-hari", emoji: "🏠" },
  { id: "hari-raya", title: "명절과 경조사", titleId: "Hari Raya dan Acara", emoji: "🎉" },
  { id: "kesehatan", title: "건강과 병원", titleId: "Kesehatan", emoji: "💊" },
  { id: "kerja", title: "일과 업무", titleId: "Kerja", emoji: "💼" },
  { id: "kantor", title: "관공서와 서류", titleId: "Kantor dan Dokumen", emoji: "🏛️" },
  { id: "telepon", title: "전화와 채팅", titleId: "Telepon", emoji: "📱" },
  { id: "masalah", title: "문제 상황", titleId: "Masalah", emoji: "🚨" },
  { id: "gereja", title: "교회와 신앙", titleId: "Gereja", emoji: "⛪", staffOnly: true },
];

/** 기본 제공 회화 장면 전체 */
export const BUILTIN_SCENES: PercakapanScene[] = [
  ...DASAR,
  ...PERKENALAN,
  ...MAKAN,
  ...BELANJA,
  ...UANG,
  ...TRANSPORTASI,
  ...PENGINAPAN,
  ...SEHARI_HARI,
  ...HARI_RAYA,
  ...KESEHATAN,
  ...KERJA,
  ...KANTOR,
  ...TELEPON,
  ...MASALAH,
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
