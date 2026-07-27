// 화면 이동 공통 헬퍼.
// 뒤로가기 화살표가 "직전 화면"으로 한 단계만 가도록 맞추기 위한 것입니다.

import type { NavigateFunction } from "react-router-dom";

const MY_WORDBOOK_ID = "my-wordbook";

/**
 * 앱 안에서 한 단계만 뒤로 갑니다.
 * 새로고침이나 URL 직접 진입처럼 앱 내 이전 화면이 없으면(react-router v6에서
 * location.key === "default") 앱 밖으로 나가지 않도록 폴백 경로로 대신 이동합니다.
 */
export function goBackOr(
  navigate: NavigateFunction,
  locationKey: string | undefined,
  fallbackPath: string
) {
  if (locationKey && locationKey !== "default") {
    navigate(-1);
    return;
  }
  navigate(fallbackPath, { replace: true });
}

/**
 * 단어장 관련 화면(단어카드 목록 / Card / Quiz)의 폴백 경로.
 * '내 단어장'은 메인에서만 들어가므로 메인, 나머지 폴더는 폴더 목록으로 보냅니다.
 */
export function wordbookFallback(categoryId?: string): string {
  return categoryId === MY_WORDBOOK_ID ? "/" : "/wordbooks";
}
