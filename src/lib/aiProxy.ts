// src/lib/aiProxy.ts
// AI(Gemini·Claude)를 어디로 부를지 한 곳에서 정합니다.
//
//   이 기기에 내 키가 있으면      → 구글·앤트로픽을 직접 부릅니다(지금까지와 같음)
//   키가 없고 회원키가 있으면     → Worker 를 거칩니다(키는 서버에만 있음)
//   둘 다 없으면                  → NO_API_KEY
//
// 회원은 Worker 가 하루 사용량을 셉니다. 한도를 넘으면 429 와 함께 QUOTA_* 가 오고,
// 여기서 한 번만 안내를 띄웁니다(여러 문단을 잇달아 만들 때 토스트가 쏟아지지 않도록).

import { toast } from "sonner";
import { MEMBER_BASE, memberHeaders } from "@/lib/member";

export type AiKind = "text" | "tts" | "news";

export interface AiTarget {
  url: string;
  headers: Record<string, string>;
  viaProxy: boolean;
}

/** Gemini 호출 대상. 키가 없고 회원키도 없으면 null. */
export function geminiTarget(model: string, apiKey: string, kind: AiKind): AiTarget | null {
  const key = (apiKey || "").trim();
  if (key) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/models/" + model +
        ":generateContent?key=" + encodeURIComponent(key),
      headers: { "content-type": "application/json" },
      viaProxy: false,
    };
  }
  const mh = memberHeaders();
  if (!mh) return null;
  return {
    url: MEMBER_BASE + "/ai/gemini/" + model + ":generateContent",
    headers: Object.assign({ "content-type": "application/json", "x-kata-kind": kind }, mh),
    viaProxy: true,
  };
}

/** Claude 호출 대상. 키가 없고 회원키도 없으면 null. */
export function claudeTarget(apiKey: string): AiTarget | null {
  const key = (apiKey || "").trim();
  if (key) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      viaProxy: false,
    };
  }
  const mh = memberHeaders();
  if (!mh) return null;
  return {
    url: MEMBER_BASE + "/ai/claude",
    headers: Object.assign({ "content-type": "application/json", "x-kata-kind": "text" }, mh),
    viaProxy: true,
  };
}

let lastQuotaToast = 0;

/**
 * 대리 호출이 429로 돌아왔을 때 한도 안내를 띄웁니다.
 * 돌려주는 값: 한도 초과였으면 true(호출한 쪽은 재시도하지 않습니다).
 */
export async function handleQuotaResponse(res: Response, viaProxy: boolean): Promise<boolean> {
  if (!viaProxy || res.status !== 429) return false;
  let code = "";
  try {
    const d = await res.clone().json();
    code = String((d && d.error) || "");
  } catch (e) {}
  if (code.indexOf("QUOTA_") !== 0) return false;
  const now = Date.now();
  if (now - lastQuotaToast > 5000) {
    lastQuotaToast = now;
    if (code === "QUOTA_TTS") toast("하루 음성듣기 한도가 넘었습니다. 내일 다시 들을 수 있어요");
    else if (code === "QUOTA_NEWS") toast("오늘 뉴스 받기 한도가 넘었습니다");
    else toast("오늘 사용량 한도가 넘었습니다");
  }
  return true;
}
