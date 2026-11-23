// src/lib/tasteAccess.ts
// 무료 맛보기 범위 — 7일 무료 체험을 없애고 메뉴마다 하나씩 직접 써 보게 합니다(2026-11-23 Arga 결정).
// "하나라도 직접 체험하고 더 하고 싶게" 하려는 것. 무엇이 무료인지는 이 파일 한 곳에서만 정합니다.
//
//   단어장      01 인사·기본 표현만 (목록·카드·퀴즈). 02 부터는 자물쇠 — 목록·제목은 보임
//   회화집      '인사와 기본'(dasar) 주제의 01 처음 만나 인사(dasar-kenalan)만 (본문·전체 듣기·문장 듣기)
//               — 이 장면의 음성은 앱에 담긴 파일로 듣습니다(public/audio/taste/, 서버는 무료 회화 음성을 잠가 둠)
//   오늘의 이야기  맛보기 3편 (src/data/storySamples.ts — 여기서 다루지 않음)
//   인도네시아 이해  허브와 맨 위 '오늘의 인도네시아' 카드(그림·제목)는 보임. 카드 안·다른 메뉴·지도는 자물쇠
//   게임        오늘의 단어 퍼즐만 (나머지 6종 자물쇠)
//
// 잠긴 항목을 누르면 같은 안내 창이 뜹니다(openPlusLock → components/PlusLockSheet.tsx).

import { sharedWordbookNumber } from "@/lib/wordbookAccess";

/** 무료로 여는 기본 단어장 번호 */
export const TASTE_WORDBOOK_NUMBER = 1;

/** 무료로 여는 회화 장면 */
export const TASTE_SCENE_ID = "dasar-kenalan";
export const TASTE_SCENE_CATEGORY_ID = "dasar";

interface WordbookLike {
  name: string;
  isShared?: boolean;
  owner?: string;
}

/** 무료 맛보기 단어장인가(01 인사·기본 표현). 공용 기본 단어장이 아니면(개인 폴더 포함) false. */
export function isTasteWordbook(cat: WordbookLike | null | undefined): boolean {
  if (!cat || !cat.isShared || cat.owner) return false;
  return sharedWordbookNumber(cat.name) === TASTE_WORDBOOK_NUMBER;
}

/**
 * 이 단어장을 열 수 있는가. 내가 만든 단어장(공용 아님)은 언제나 열림.
 * plus: 지금 등급이 무료가 아닌가(usePlan().plus)
 */
export function canOpenWordbook(cat: WordbookLike | null | undefined, plus: boolean): boolean {
  if (!cat) return false;
  if (!cat.isShared) return true;
  return plus || isTasteWordbook(cat);
}

/** 무료 맛보기 회화 장면인가 */
export function isTasteScene(sceneId: string | null | undefined): boolean {
  return sceneId === TASTE_SCENE_ID;
}

/** 이 회화 장면을 열 수 있는가. 내가 만든 장면은 언제나 열림. */
export function canOpenScene(scene: { id: string; custom?: boolean } | null | undefined, plus: boolean): boolean {
  if (!scene) return false;
  if (scene.custom) return true;
  return plus || isTasteScene(scene.id);
}

// ── 잠금 안내 문구 ───────────────────────────────────────────
export const LOCK_TITLE_WORDBOOK = "02 단어장부터는 Plus 회원 기능입니다";
export const LOCK_TITLE_SCENE = "이 대화는 Plus 회원 기능입니다";
export const LOCK_TITLE_PERCAKAPAN_MAKE = "대화 만들기는 Plus 회원 기능입니다";
export const LOCK_TITLE_INSIGHT = "인도네시아 이해는 Plus 회원 기능입니다";
export const LOCK_TITLE_CARD = "오늘의 카드 자세히 보기는 Plus 회원 기능입니다";
export const LOCK_TITLE_MAP = "인도네시아 지도는 Plus 회원 기능입니다";
export const LOCK_TITLE_GAME = "이 게임은 Plus 회원 기능입니다";
export const LOCK_TITLE_STORY_NEW = "새 이야기 불러오기는 Plus 회원 기능입니다";
export const LOCK_TITLE_STORY_LISTEN = "듣기는 Plus 회원 기능입니다";
