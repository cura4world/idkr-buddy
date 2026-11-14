// src/lib/aiErrors.ts
// AI 호출 오류 코드를 공개판 사용자에게 보여 줄 문장으로 바꿉니다.
//
// 공개판(스토어 앱·미리보기)에는 API 키 설정이 없으므로 "Gemini API 키…", "설정에서…" 같은
// 개발자용 문구가 나가면 안 됩니다. 화면은 기존 문구를 adminText 로 넘기고, 공개판이면 아래 문장이 대신 나갑니다.
// 관리자판·회원판은 adminText 그대로입니다.
//
//   세션 만료(401 → SESSION_EXPIRED) · 세션 없음(NO_API_KEY)  → "로그인이 풀렸습니다. 다시 로그인하세요."
//   그 밖의 거절(403 → NOT_AVAILABLE) · 키 오류(INVALID_API_KEY) → "지금은 사용할 수 없습니다. 잠시 뒤 다시 시도하세요."
//   Plus 필요(403 PLUS_REQUIRED)·한도(429 QUOTA_*)는 aiProxy 가 따로 안내합니다(여기서 다루지 않음).

import { toast } from "sonner";
import { isStoreApp } from "@/lib/platform";
import { SESSION_EXPIRED_TEXT, hasPublicSession } from "@/lib/account";
import { isPreviewBuild } from "@/lib/plan";

export { SESSION_EXPIRED_TEXT };
export const AI_UNAVAILABLE_TEXT = "지금은 사용할 수 없습니다. 잠시 뒤 다시 시도하세요.";

const SESSION_CODES = ["SESSION_EXPIRED", "NO_API_KEY", "NO_SESSION", "REQUEST_FAILED_401"];
const UNAVAILABLE_CODES = ["NOT_AVAILABLE", "INVALID_API_KEY", "API_KEY", "REQUEST_FAILED_403"];

/** 공개판에서 이 오류 코드를 대신할 문장. 공개판이 아니거나 해당 코드가 아니면 null. */
export function publicAiErrorText(code: string): string | null {
  if (!isStoreApp()) return null;
  // 미리보기 앱은 로그인 없이 패널의 키로 직접 부르므로, 실제 원인을 알 수 있게 오류 코드를 붙입니다(2026-11-11 진단용).
  const tail = isPreviewBuild() ? " (" + code + ")" : "";
  if (SESSION_CODES.indexOf(code) >= 0) {
    if (isPreviewBuild() && code === "NO_API_KEY") return "Gemini 키가 없습니다. 왼쪽 '미리보기' 탭에서 키를 넣으세요." + tail;
    return SESSION_EXPIRED_TEXT + tail;
  }
  if (UNAVAILABLE_CODES.indexOf(code) >= 0) return AI_UNAVAILABLE_TEXT + tail;
  return null;
}

/** 공개판이면 사용자용 문장, 아니면 화면이 넘긴 기존 문구(adminText). */
export function aiErrorText(code: string, adminText: string): string {
  return publicAiErrorText(code) || adminText;
}

/**
 * 오류 토스트. 공개판 문장은 같은 문장이 겹쳐 뜨지 않게 문장 자체를 id 로 씁니다
 * (세션 만료 때는 로그인 화면도 같은 안내를 보여 주므로 한 번만).
 */
export function aiErrorToast(code: string, adminText: string, asError = false): void {
  const pub = publicAiErrorText(code);
  if (pub) {
    // 세션이 끝나 로그인 화면으로 넘어간 뒤라면 그 화면이 이미 같은 안내를 보여 줍니다.
    if (pub === SESSION_EXPIRED_TEXT && !isPreviewBuild() && !hasPublicSession()) return;
    toast(pub, { id: pub });
    return;
  }
  if (asError) toast.error(adminText);
  else toast(adminText);
}
