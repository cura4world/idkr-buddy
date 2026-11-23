// 등급별 공개판 홈 메뉴 — 보이는 줄·자물쇠·숨김, 그리고 주소로 바로 들어오는 길.
// 기대값 표는 e2e/homeMenu.ts (Index.tsx 의 `if (storeApp)` 쪽과 plan.ts 에서 옮긴 것).
// 주소 직접 입력은 App.tsx 의 HiddenInPublic(신앙·뉴스 = Special·관리자, 설교·회원 관리 = 관리자)·InsightGate(Plus — 무료는 허브로)가 막습니다.

import { test, expect, setupPreview, openApp, appPath, PreviewTier } from "../fixtures";
import { HOME_EXPECTED, expectHomeMenu, homeRow } from "../homeMenu";

const TIERS: PreviewTier[] = ["free", "plus", "special", "admin"];

for (const tier of TIERS) {
  test("홈 메뉴 — " + tier, async ({ page }) => {
    await setupPreview(page, { tier });
    await openApp(page, "");
    await expectHomeMenu(page, HOME_EXPECTED[tier]);
  });
}

test("미리보기 빌드 — 등급을 고르지 않았으면 관리자, 손잡이가 보임", async ({ page }) => {
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.admin);
  await expect(page.getByRole("button", { name: "미리보기 설정 열기 (지금 관리자)" })).toBeVisible();
});

test("미리보기 패널에서 등급을 바꾸면 홈이 바로 바뀜", async ({ page }) => {
  await openApp(page, "");
  await page.getByRole("button", { name: new RegExp("^미리보기 설정 열기") }).click();
  await expect(page.getByRole("heading", { name: "미리보기 설정" })).toBeVisible();
  await page.getByRole("button", { name: "무료", exact: true }).click();
  await expect(page.getByText("지금 무료", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "미리보기 설정" })).toHaveCount(0);
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

// 2026-11-23 맛보기: 무료도 단어장 목록에 들어갑니다. 01 은 열리고, 02 부터는 자물쇠 → 공용 안내 창 → 자세히 보기 → 구독 화면.
test("무료 — 단어장 목록이 보이고, 01 은 열리며 잠긴 단어장은 안내 창을 거쳐 구독 화면으로", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "");
  await homeRow(page, "단어장").click();
  await expect.poll(() => appPath(page)).toBe("/wordbooks");
  await expect(page.getByText("인사·기본 표현", { exact: false }).first()).toBeVisible();
  // 잠긴 02 단어장 → 안내 창(곧바로 구독 화면으로 가지 않음)
  await page.getByRole("button", { name: new RegExp("\\(잠김\\)$") }).first().click();
  const sheet = page.getByRole("dialog", { name: "02 단어장부터는 Plus 회원 기능입니다" });
  await expect(sheet).toBeVisible();
  expect(appPath(page)).toBe("/wordbooks");
  // 폰 뒤로가기는 창만 닫음
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  expect(appPath(page)).toBe("/wordbooks");
  // 다시 열고 "Plus 자세히 보기" → 구독 화면
  await page.getByRole("button", { name: new RegExp("\\(잠김\\)$") }).first().click();
  await sheet.getByRole("button", { name: "Plus 자세히 보기" }).click();
  await expect.poll(() => appPath(page)).toBe("/plus");
});

test("무료 — 맛보기 단어장 01 은 카드·퀴즈까지 열린다", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "wordbooks");
  const row = page.locator("div").filter({ has: page.getByText("인사·기본 표현", { exact: false }) }).filter({ has: page.getByRole("button", { name: "카드", exact: true }) }).last();
  await row.getByRole("button", { name: "카드", exact: true }).click();
  await expect.poll(() => appPath(page)).toMatch(new RegExp("^/study/"));
});

test("무료 — Plus 줄을 누르면 구독 화면으로", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "");
  await page.locator('[data-fit-anchor="plus"]').click();
  await expect.poll(() => appPath(page)).toBe("/plus");
});

// 주소를 직접 쳐서 들어오는 길
const GUARDS: { tier: PreviewTier; path: string; lands: string }[] = [
  { tier: "free", path: "devotion", lands: "/" },
  { tier: "free", path: "news", lands: "/" },
  { tier: "free", path: "insight/overview", lands: "/insight" },
  { tier: "free", path: "map", lands: "/insight" },
  { tier: "free", path: "wordbooks", lands: "/wordbooks" },
  { tier: "plus", path: "wordbooks", lands: "/wordbooks" },
  { tier: "plus", path: "insight/overview", lands: "/insight/overview" },
  { tier: "plus", path: "bible", lands: "/" },
  { tier: "plus", path: "prayer", lands: "/" },
  { tier: "plus", path: "sermon", lands: "/" },
  { tier: "special", path: "sermon", lands: "/" },
  { tier: "special", path: "members", lands: "/" },
  { tier: "special", path: "prayer", lands: "/prayer" },
  { tier: "admin", path: "prayer", lands: "/prayer" },
];

for (const g of GUARDS) {
  test("주소 직접 입력 — " + g.tier + " /" + g.path + " → " + g.lands, async ({ page }) => {
    await setupPreview(page, { tier: g.tier });
    await openApp(page, g.path);
    await expect.poll(() => appPath(page)).toBe(g.lands);
    // 돌려보내기는 곧바로 일어납니다 — 잠깐 뒤에도 같은 자리여야 합니다
    await page.waitForTimeout(300);
    expect(appPath(page)).toBe(g.lands);
  });
}
