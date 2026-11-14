// 일반 빌드를 "실제 스토어 앱"처럼 엽니다 — 네이티브가 넣어 주는 window.KataStore 를 흉내 냅니다(src/lib/platform.ts).
// 미리보기 빌드의 등급 전환으로는 볼 수 없는 것을 여기서 봅니다.
//   · 로그인 전에는 로그인 화면 (LoginGate)
//   · 서버 등급 review(심사용 계정) — plan.ts 가 "plus" 로 돌려주므로 홈은 Plus 와 같고, 신앙·뉴스는 열리지 않음
//   · 저장된 세션의 등급(무료·Special·기한 지난 Plus)이 plan.ts 규칙대로 화면에 반영되는지
// 서버(kata-public)와 Play 는 끊겨 있습니다. 서버 확인(refreshMe)이 실패해도 저장된 세션으로 화면이 열려야 합니다.

import { Page } from "@playwright/test";
import { test, expect, openApp, appPath, seedStorage, SESSION_KEY } from "../fixtures";
import { HOME_EXPECTED, expectHomeMenu } from "../homeMenu";
import { PLUS_TITLE, STATE_PLUS, STATE_REVIEW_SUB, PRICE_LOADING, PRICE_FAILED } from "../../src/lib/plusCopy";

async function asStoreApp(page: Page, plan: Record<string, unknown> | null): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { KataStore: { version: () => string } }).KataStore = { version: () => "1.0.0" };
  });
  if (plan) {
    const session = {
      token: "e2e-token",
      user: { id: "u-e2e", email: "e2e@example.com", name: "Tes Akun", picture: "" },
      plan,
      accountId: "acc-e2e",
      savedAt: 1,
    };
    const kv: Record<string, string> = {};
    kv[SESSION_KEY] = JSON.stringify(session);
    await seedStorage(page, kv);
  }
}

const DAY = 24 * 60 * 60 * 1000;

test("스토어 앱 · 로그인 전 — 로그인 화면(앱 화면·안내 화면 아님)", async ({ page }) => {
  await asStoreApp(page, null);
  await openApp(page, "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kata kata.");
  await expect(page.getByRole("button", { name: new RegExp("Google") })).toBeVisible();
  await expect(page.getByText("BAHASA HARI INI")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "회원키가 있습니다" })).toHaveCount(0);
});

test("심사용 계정(review) — 홈은 Plus 와 같음(신앙·뉴스 없음, 자물쇠 없음)", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.plus);
  await expect(page.locator("[data-preview-tab]"), "일반 빌드에는 미리보기 손잡이가 없음").toHaveCount(0);
});

test("심사용 계정(review) — 신앙 화면은 주소로도 안 열림, 이해 하위 화면은 열림", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  for (const path of ["bible", "devotion", "prayer", "news", "sermon", "one-to-one", "insight/christian"]) {
    await openApp(page, path);
    await expect.poll(() => appPath(page), "/" + path).toBe("/");
  }
  await openApp(page, "wordbooks");
  await page.waitForTimeout(300);
  expect(appPath(page)).toBe("/wordbooks");
});

test("심사용 계정(review) — 구독 화면에 \"심사용 계정\", 요금제는 없음", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  await openApp(page, "plus");
  await expect(page.getByRole("heading", { name: PLUS_TITLE })).toBeVisible();
  await expect(page.getByText(STATE_PLUS, { exact: true })).toBeVisible();
  await expect(page.getByText(STATE_REVIEW_SUB, { exact: true })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "요금제" })).toHaveCount(0);
});

test("기한이 지난 심사용 계정 — 무료로 봄", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: Date.now() - DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 free — 무료 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "free", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 plus(기한 남음) — Plus 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "plus", until: Date.now() + 30 * DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.plus);
});

test("세션 등급 plus(기한 지남) — 무료 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "plus", until: Date.now() - DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 special — 신앙·뉴스가 보이고 설교문은 없음", async ({ page }) => {
  await asStoreApp(page, { tier: "special", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.special);
});

test("실제 스토어 앱 경로 — Play 가격을 못 받으면 고정 금액을 보이지 않음", async ({ page }) => {
  // CLAUDE.md: 화면의 금액은 Play 값만. 대체값(plusCopy FALLBACK_*)은 미리보기 빌드에서만 보입니다.
  await asStoreApp(page, { tier: "free", until: 0 });
  await openApp(page, "plus");
  const plans = page.getByRole("radiogroup", { name: "요금제" });
  await expect(plans.getByRole("radio")).toHaveCount(2);
  await expect(plans.getByText(new RegExp("[0-9][0-9,]*원"))).toHaveCount(0);
  await expect(page.getByText(new RegExp("^(" + PRICE_LOADING + "|" + PRICE_FAILED + ")$")).first()).toBeVisible();
});
