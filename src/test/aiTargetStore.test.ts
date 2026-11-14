// 스토어 앱은 로그인 세션 길로만 AI 를 부르는지 (2026-11-14 출시 전 점검 S-13).
// 저장소에 Gemini 키·회원키가 남아 있어도(관리자판 백업을 되돌린 경우) 그 길을 타면 계정별 한도·등급을 건너뜁니다.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { geminiTarget } from "@/lib/aiProxy";
import { PUBLIC_BASE } from "@/lib/account";

const SESSION_KEY = "kata-public-session";
const MODEL = "gemini-3.1-flash-lite";

function saveSession(): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: "sess-token", user: { id: "g_1", email: "", name: "A", picture: "" },
    plan: { tier: "free", until: 0 }, accountId: "acc-1", savedAt: Date.now(),
  }));
}

function setStoreApp(on: boolean): void {
  const w = window as unknown as { KataStore?: unknown };
  if (on) w.KataStore = { version: () => "1.0.1" };
  else delete w.KataStore;
}

describe("AI 호출 길 고르기", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoreApp(false);
  });
  afterEach(() => {
    localStorage.clear();
    setStoreApp(false);
  });

  it("스토어 앱: 키를 넘겨도 구글로 직접 가지 않고 공개판 서버(세션)로 간다", () => {
    setStoreApp(true);
    saveSession();
    const t = geminiTarget(MODEL, "AQ.some-leftover-key", "text");
    expect(t).not.toBeNull();
    expect(t!.url.indexOf(PUBLIC_BASE)).toBe(0);
    expect(t!.url.indexOf("key=")).toBe(-1);
    expect(t!.publicProxy).toBe(true);
    expect(t!.headers.authorization).toBe("Bearer sess-token");
  });

  it("스토어 앱: 세션이 없으면 키가 있어도 부르지 않는다(null)", () => {
    setStoreApp(true);
    expect(geminiTarget(MODEL, "AQ.some-leftover-key", "text")).toBeNull();
  });

  it("관리자판·회원판(스토어 앱이 아님): 내 키가 있으면 예전처럼 직접 부른다", () => {
    const t = geminiTarget(MODEL, "AQ.my-own-key", "text");
    expect(t).not.toBeNull();
    expect(t!.viaProxy).toBe(false);
    expect(t!.url.indexOf("https://generativelanguage.googleapis.com/")).toBe(0);
  });
});
