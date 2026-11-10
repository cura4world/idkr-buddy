// src/lib/wordbookGroups.ts
// 기본 단어장의 묶음(기초·동사·형용사·…·성경과 신앙)과 묶음 색.
//
// 공용 단어장 이름은 "23 동물"처럼 두 자리 번호로 시작합니다. 묶음은 그 번호로 정합니다.
// 번호 매김이 두 가지라 둘 다 읽습니다.
//   예전 36권: 01~29 공개, 30~36 성경과 신앙
//   새 41권  : 01~34 공개, 35~41 성경과 신앙 (2026-11 재분류, 새 5권 추가)
// 어느 쪽인지는 공용 단어장 번호 가운데 가장 큰 값으로 판단합니다(37 이상이면 새 번호).
// 번호가 없는 단어장(개인 폴더 등)은 "그 외" 묶음입니다.
//
// 이 파일은 store.ts 를 읽기만 합니다(단어장 ID·이전 로직은 store.ts 쪽 일).

import { Category } from "@/lib/store";

export type GroupKey = "basic" | "verb" | "people" | "social" | "nature" | "faith" | "other";

export interface GroupStyle {
  key: GroupKey;
  label: string;
  /** 폴더 목록 타일·단어장 안 맨 위 상자 바탕 */
  tint: string;
  /** 묶음 소제목 앞 점 */
  dot: string;
  /** 단어장 안 맨 위 상자 글자·아이콘 */
  ink: string;
  /** 단어장 안 예문 상자 바탕 */
  exBg: string;
}

// 색은 시안(단어장 폴더 · 추천안, 동물·전치사 단어장)의 값. 성경과 신앙·그 외는 시안에 없어 같은 결로 정했습니다.
export const GROUP_STYLES: Record<GroupKey, GroupStyle> = {
  basic: { key: "basic", label: "기초", tint: "#E2F1EC", dot: "#4FA58E", ink: "#2C6D63", exBg: "#F1F8F5" },
  verb: { key: "verb", label: "동사·형용사", tint: "#E4EEF6", dot: "#5B8DB8", ink: "#2F5F86", exBg: "#F6F7F5" },
  people: { key: "people", label: "사람과 일상", tint: "#FCEFE3", dot: "#D58A52", ink: "#9A5A26", exBg: "#F6F7F5" },
  social: { key: "social", label: "사회생활", tint: "#ECE8F6", dot: "#7D6CB5", ink: "#4E3F86", exBg: "#F6F7F5" },
  nature: { key: "nature", label: "자연과 세상", tint: "#EAF2DF", dot: "#7FA35A", ink: "#4F7A2E", exBg: "#F6F7F5" },
  faith: { key: "faith", label: "성경과 신앙", tint: "#F6E8EC", dot: "#B7667A", ink: "#8A4458", exBg: "#F6F7F5" },
  other: { key: "other", label: "그 외", tint: "#EEF1F3", dot: "#9AA1A6", ink: "#3B4245", exBg: "#F6F7F5" },
};

export const GROUP_ORDER: GroupKey[] = ["basic", "verb", "people", "social", "nature", "faith", "other"];

type Range = { key: GroupKey; from: number; to: number };

const OLD_RANGES: Range[] = [
  { key: "basic", from: 1, to: 4 },
  { key: "verb", from: 5, to: 11 },
  { key: "people", from: 12, to: 18 },
  { key: "social", from: 19, to: 22 },
  { key: "nature", from: 23, to: 29 },
  { key: "faith", from: 30, to: 36 },
];

const NEW_RANGES: Range[] = [
  { key: "basic", from: 1, to: 6 },
  { key: "verb", from: 7, to: 13 },
  { key: "people", from: 14, to: 21 },
  { key: "social", from: 22, to: 27 },
  { key: "nature", from: 28, to: 34 },
  { key: "faith", from: 35, to: 41 },
];

/** "23 동물" → 23. 번호가 없으면 null. */
export function bookNumber(name: string): number | null {
  const m = (name || "").match(new RegExp("^(\\d{1,2})\\s"));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** "23 동물" → "동물". 번호가 없으면 이름 그대로. */
export function bookTitle(name: string): string {
  const n = bookNumber(name);
  if (n === null) return name || "";
  return (name || "").replace(new RegExp("^\\d{1,2}\\s+"), "");
}

/** "23 동물" → "23", 한 자리는 앞에 0. 번호가 없으면 "". */
export function bookNumberText(name: string): string {
  const n = bookNumber(name);
  if (n === null) return "";
  return n < 10 ? "0" + n : String(n);
}

/** 지금 공용 단어장이 새 번호(41권)인가 — 공용 단어장 번호의 최댓값으로 판단 */
export function usesNewNumbering(shared: Category[]): boolean {
  let max = 0;
  for (const c of shared) {
    if (!c.isShared) continue;
    const n = bookNumber(c.name);
    if (n !== null && n > max) max = n;
  }
  return max > 36;
}

/** 단어장의 묶음. shared 는 번호 판단에 쓸 공용 단어장 전체(보통 getCategories()). */
export function groupOf(cat: Category, shared: Category[]): GroupKey {
  if (!cat.isShared) return "other";
  const n = bookNumber(cat.name);
  if (n === null) return "other";
  const ranges = usesNewNumbering(shared) ? NEW_RANGES : OLD_RANGES;
  for (const r of ranges) {
    if (n >= r.from && n <= r.to) return r.key;
  }
  return "other";
}

/** "성경과 신앙" 묶음은 관리자·Special Member 에게만 보입니다(스토어 앱 밖에서는 늘 보임 — getTier 가 admin). */
export function isFaithBook(cat: Category, shared: Category[]): boolean {
  return groupOf(cat, shared) === "faith";
}

/** 뜻 표시: CSV 의 "옆에/곁에" 를 "옆에, 곁에" 로 */
export function displayMeaning(meaning: string): string {
  const parts = (meaning || "").split("/").map((p) => p.trim()).filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : meaning || "";
}
