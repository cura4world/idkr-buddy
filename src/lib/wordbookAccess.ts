// src/lib/wordbookAccess.ts
// 공용 단어장 중 "성경과 신앙"(35~41번)은 공개판에서 Special Member·관리자에게만 보입니다.
// 관리자판·회원판은 isStaffTier() 가 늘 참이라 지금처럼 모두 보입니다(plan.ts).
//
// 판단은 단어장 이름 앞 두 자리 번호로 합니다 — 파일 이름이 곧 단어장 이름이고
// 번호 범위는 data/WORDLIST-PLAN.md 의 묶음 표와 같습니다.
// 사용자가 만든 단어장·개인 폴더 단어장(owner)은 이름이 숫자로 시작해도 해당하지 않습니다.

import { isStaffTier } from "@/lib/plan";

export const FAITH_WORDBOOK_FROM = 35;
export const FAITH_WORDBOOK_TO = 41;

interface WordbookLike {
  name: string;
  isShared?: boolean;
  owner?: string;
}

/** 공용 단어장 이름 앞 번호 ("01 인사·기본 표현" → 1). 번호가 없으면 null. */
export function sharedWordbookNumber(name: string): number | null {
  const m = (name || "").match(new RegExp("^(\\d{1,2})\\s"));
  return m ? Number(m[1]) : null;
}

/** 성경과 신앙 묶음(35~41)에 드는 공용 단어장인가 */
export function isFaithWordbook(c: WordbookLike | null | undefined): boolean {
  if (!c || !c.isShared || c.owner) return false;
  const n = sharedWordbookNumber(c.name);
  return n !== null && n >= FAITH_WORDBOOK_FROM && n <= FAITH_WORDBOOK_TO;
}

/** 지금 등급에서 이 단어장을 보여도 되는가 */
export function isWordbookVisible(c: WordbookLike | null | undefined): boolean {
  if (!c) return false;
  return !isFaithWordbook(c) || isStaffTier();
}
