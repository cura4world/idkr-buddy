// 내 Gemini 키로 직접 부를 때 키 오류를 INVALID_API_KEY 로 분류하는지 검사합니다.
// (2026-11-13: 회원키를 Gemini 칸에 넣어 400 API_KEY_INVALID 가 났는데 화면은 일반 실패 문구였음)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGeminiText } from "@/lib/geminiText";

function googleError(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const API_KEY_INVALID_BODY = {
  error: {
    code: 400,
    message: "API key not valid. Please pass a valid API key.",
    status: "INVALID_ARGUMENT",
    details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID", domain: "googleapis.com" }],
  },
};

describe("callGeminiText 키 오류 분류(직접 호출)", () => {
  beforeEach(() => {
    localStorage.setItem("geminiApiKey", "test-key-for-unit-test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("400 + API_KEY_INVALID → INVALID_API_KEY", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => googleError(400, API_KEY_INVALID_BODY)));
    await expect(callGeminiText("x")).rejects.toThrow("INVALID_API_KEY");
  });

  it("400 이지만 다른 이유(요청 형식) → BAD_REQUEST 그대로", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      googleError(400, { error: { code: 400, message: "bad", status: "INVALID_ARGUMENT", details: [{ reason: "SOMETHING_ELSE" }] } })));
    await expect(callGeminiText("x")).rejects.toThrow("BAD_REQUEST");
  });

  it("400 본문을 읽을 수 없으면 BAD_REQUEST 그대로", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 400 })));
    await expect(callGeminiText("x")).rejects.toThrow("BAD_REQUEST");
  });

  it("401(ACCESS_TOKEN_TYPE_UNSUPPORTED) → INVALID_API_KEY", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      googleError(401, { error: { code: 401, status: "UNAUTHENTICATED", details: [{ reason: "ACCESS_TOKEN_TYPE_UNSUPPORTED" }] } })));
    await expect(callGeminiText("x")).rejects.toThrow("INVALID_API_KEY");
  });

  it("키 오류는 재시도하지 않고 한 번만 부른다", async () => {
    const f = vi.fn(async () => googleError(400, API_KEY_INVALID_BODY));
    vi.stubGlobal("fetch", f);
    await expect(callGeminiText("x")).rejects.toThrow("INVALID_API_KEY");
    expect(f).toHaveBeenCalledTimes(1);
  });
});
