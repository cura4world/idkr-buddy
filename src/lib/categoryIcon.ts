// src/lib/categoryIcon.ts
// 단어장 아이콘의 저장 형태와 고르기 목록 (2026-11-13 사용자 요청: 이모지 대신 선 아이콘 + 색 타일).
//
// 데이터 구조는 바꾸지 않습니다. Category.emoji 칸에 문자열을 그대로 쓰되, 새로 고른 아이콘은
//   "icon:<lucide 이름>:<색 키>"   예) "icon:BookOpen:teal"
// 로 저장합니다. 이미 이모지로 저장된 단어장("📚" 등)은 지금처럼 이모지로 보입니다(되돌림 없음).
// 이 칸은 CSV 백업·복원, 서버 백업(transfer)이 문자열로 그대로 옮기므로 형식이 바뀌어도 호환됩니다.
//
// 이 파일은 React 를 불러오지 않는 순수 TS 입니다(저장 형태 테스트용). 아이콘 그림은 components/CategoryIcon.tsx 가 그립니다.

export const CATEGORY_ICON_PREFIX = "icon:";

export type TileColorKey = "teal" | "sky" | "yellow" | "violet" | "pink" | "gray";

export interface TileColor {
  key: TileColorKey;
  label: string;
  /** 타일 바탕 */
  bg: string;
  /** 아이콘(선) 색 */
  ink: string;
}

/** 옅은 타일 6가지 — 홈 타일 색 계열과 맞춤 */
export const TILE_COLORS: TileColor[] = [
  { key: "teal", label: "청록", bg: "#DDF0EA", ink: "#2C6D63" },
  { key: "sky", label: "하늘", bg: "#E4EEF6", ink: "#2B5F86" },
  { key: "yellow", label: "노랑", bg: "#FFF3D6", ink: "#8A6A12" },
  { key: "violet", label: "보라", bg: "#ECE8F6", ink: "#5B4A8C" },
  { key: "pink", label: "분홍", bg: "#F9E6EA", ink: "#9A3F55" },
  { key: "gray", label: "회색", bg: "#EEF1F3", ink: "#4D565B" },
];

export const DEFAULT_TILE_COLOR: TileColorKey = "teal";

/** 고르기 목록(공부 주제 중심). 기독교 아이콘은 faith 목록에 따로 둡니다. */
export const CATEGORY_ICON_NAMES: string[] = [
  // 책·공부
  "BookOpen", "GraduationCap", "PenLine",
  // 말·대화
  "MessageCircle", "Languages", "Mic",
  // 생활
  "Home", "Utensils", "Coffee", "ShoppingBag", "Shirt",
  // 이동·여행
  "Plane", "Bus", "MapPin", "Luggage",
  // 일·학교
  "Briefcase", "School", "Laptop",
  // 건강
  "HeartPulse", "Pill",
  // 숫자·시간
  "Hash", "Clock", "Calendar",
  // 자연·날씨
  "Sun", "Leaf", "CloudRain",
  // 사람·가족
  "Users", "Baby",
  // 마음·취미
  "Heart", "Music", "Camera", "Gamepad2",
  // 그 밖
  "Star", "Lightbulb", "Flag",
];

/** 기독교 아이콘 — 관리자·Special Member 에게만 목록에 보입니다(공개판에서 기독교 콘텐츠 제외 원칙). */
export const CATEGORY_FAITH_ICON_NAMES: string[] = ["Church", "Cross"];

export const DEFAULT_ICON_NAME = "BookOpen";

export type ParsedCategoryIcon =
  | { kind: "icon"; name: string; color: TileColorKey }
  | { kind: "emoji"; text: string };

export function isTileColorKey(v: string): v is TileColorKey {
  return TILE_COLORS.some((c) => c.key === v);
}

export function tileColorOf(key: string): TileColor {
  for (const c of TILE_COLORS) {
    if (c.key === key) return c;
  }
  return TILE_COLORS[0];
}

/** "icon:BookOpen:teal" 로 저장할 문자열을 만듭니다. */
export function makeCategoryIcon(name: string, color: TileColorKey): string {
  return CATEGORY_ICON_PREFIX + name + ":" + color;
}

/**
 * Category.emoji 칸의 값을 읽습니다.
 *   "icon:<이름>:<색키>" → 아이콘(색 키가 모르는 값이면 청록)
 *   그 밖(이모지·빈 값·옛 데이터) → 이모지 그대로. 빈 값이면 "📁".
 */
export function parseCategoryIcon(value: string | undefined | null): ParsedCategoryIcon {
  const v = (value || "").trim();
  if (v.indexOf(CATEGORY_ICON_PREFIX) === 0) {
    const parts = v.slice(CATEGORY_ICON_PREFIX.length).split(":");
    const name = (parts[0] || "").trim();
    const colorRaw = (parts[1] || "").trim();
    if (name !== "") {
      return { kind: "icon", name, color: isTileColorKey(colorRaw) ? colorRaw : DEFAULT_TILE_COLOR };
    }
  }
  return { kind: "emoji", text: v === "" ? "📁" : v };
}

/** 사람이 읽는 글(스크린 리더·옵션 목록 등)에 쓸 짧은 표시. 아이콘이면 빈 문자열(이름만 보이게). */
export function categoryIconText(value: string | undefined | null): string {
  const p = parseCategoryIcon(value);
  return p.kind === "emoji" ? p.text : "";
}
