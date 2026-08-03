// src/lib/saveTarget.ts
// 사전과 각 화면의 단어 팝업이 함께 쓰는 "담을 단어장" 설정입니다.
// 대상은 앱 전체에 하나뿐이라, 사전에서 고른 곳이 설교문·이야기 팝업에도 그대로 적용됩니다.
// (설교를 준비하는 동안 사전과 설교문을 오가며 같은 폴더에 담게 되므로)

import { Category, getCategories } from "@/lib/store";

const MY_WORDBOOK_ID = "my-wordbook";

// 사전에서 쓰던 키를 그대로 씁니다 — 이미 골라 둔 대상이 초기화되지 않도록.
export const SAVE_TARGET_KEY = "dict-save-target";

// 담을 수 있는 곳은 내 단어장과 사용자가 만든 단어장뿐입니다.
// 공용 단어장은 배포 때마다 시드로 덮어써지므로 대상에서 뺍니다.
// getCategories 가 '내 단어장'을 항상 맨 앞에 두므로 순서는 그대로 씁니다.
export function loadSaveTargets(): Category[] {
  return getCategories().filter((c) => !c.isShared);
}

// 기억해 둔 대상이 그사이 삭제됐을 수 있으므로, 지금 목록에 있는지 반드시 확인합니다.
export function loadSaveTargetId(targets: { id: string }[]): string {
  let stored = "";
  try {
    stored = localStorage.getItem(SAVE_TARGET_KEY) || "";
  } catch (e) {}
  if (stored && targets.some((c) => c.id === stored)) return stored;
  if (targets.some((c) => c.id === MY_WORDBOOK_ID)) return MY_WORDBOOK_ID;
  return targets.length > 0 ? targets[0].id : "";
}

export function saveSaveTargetId(id: string): void {
  try {
    localStorage.setItem(SAVE_TARGET_KEY, id);
  } catch (e) {}
}
