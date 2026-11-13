// 심사용 계정(서버 등급 review)은 화면에서 Plus 와 똑같이 보이고, staff(Special·관리자) 전용 화면은 열리지 않습니다.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTier, hasPlus, isReviewAccount, isStaffTier } from "@/lib/plan";

function saveSession(plan: Record<string, unknown>): void {
  localStorage.setItem("kata-public-session", JSON.stringify({
    token: "t", user: { id: "g_1", email: "", name: "R", picture: "" }, plan, accountId: "a", savedAt: Date.now(),
  }));
}

describe("심사용 등급(review)", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as unknown as { KataStore: unknown }).KataStore = { version: () => "1.0.0" };
  });
  afterEach(() => {
    localStorage.clear();
    delete (window as unknown as { KataStore?: unknown }).KataStore;
  });

  it("review 는 Plus 로 보이고 staff 가 아니다", () => {
    saveSession({ tier: "review", until: 0 });
    expect(getTier()).toBe("plus");
    expect(hasPlus()).toBe(true);
    expect(isStaffTier()).toBe(false);
    expect(isReviewAccount()).toBe(true);
  });

  it("기한이 지난 review 는 무료", () => {
    saveSession({ tier: "review", until: Date.now() - 1000 });
    expect(getTier()).toBe("free");
    expect(isReviewAccount()).toBe(false);
  });

  it("진짜 Plus 구독은 심사용 계정이 아니다 / Special 은 그대로 staff", () => {
    saveSession({ tier: "plus", until: Date.now() + 100000 });
    expect(getTier()).toBe("plus");
    expect(isReviewAccount()).toBe(false);
    saveSession({ tier: "special", until: 0 });
    expect(getTier()).toBe("special");
    expect(isStaffTier()).toBe(true);
  });

  it("세션의 plan 이 깨져 있어도 죽지 않고 무료로 본다", () => {
    localStorage.setItem("kata-public-session", JSON.stringify({ token: "t", user: { id: "g_1" } }));
    expect(getTier()).toBe("free");
    expect(isReviewAccount()).toBe(false);
  });
});
