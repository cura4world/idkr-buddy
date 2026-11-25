// 내 정보 회원 칸(2026-11-25 지시서 B) — 홈 맨 아래 Plus 카드와 같은 공용 카드(components/PlusCard)
//   · 무료: "월 3,900원 / 연간 구독 시 월 2,900원" — 412px·100% 한 줄, 360px·125% 는 " / " 자리에서만 두 줄
//   · Plus: "Kata kata Plus 이용 중"(이용 중 = Pretendard 15px 굵게), "연간 / 다음 결제 …", 해지면 "정기 결제 취소됨 · …까지 이용",
//     "구독 / 관리" 알약 = 예전 "구독 관리" 줄 동작, 카드 나머지 = 구독 화면
//   · 홈 Plus 카드와 겉모양(바탕·테두리·둥글기·꽃 칸)이 같음
//   · 심사용 계정은 미리보기 빌드에서 만들 수 없어 단위 테스트(src/test/plusCard.test.tsx)가 봅니다

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, FONT_STEP_100 } from "../fixtures";
import { FALLBACK_MONTHLY_WON, FALLBACK_YEARLY_WON, wonText } from "../../src/lib/plusCopy";
import { seedSession } from "../myInfoSeed";

const FONT_STEP_125 = 8;
const MONTHLY = "월 " + wonText(FALLBACK_MONTHLY_WON);
const YEARLY_PER_MONTH = "연간 구독 시 월 " + wonText(Math.round(FALLBACK_YEARLY_WON / 12));
const UNTIL = new Date(2027, 10, 25, 9).getTime();

async function lines(page: Page, sel: string): Promise<number> {
  return page.locator(sel).evaluate((e) => {
    const lh = parseFloat(getComputedStyle(e).fontSize) * 1.5;
    return Math.round(e.getBoundingClientRect().height / lh);
  });
}

test("무료 412px·100% — 한 줄 가격, 단추 하나, 카드 누르기 → 구독 화면", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  const card = page.getByTestId("plus-free-card");
  await expect(card.locator("[data-plus-sub]")).toHaveText(MONTHLY + " / " + YEARLY_PER_MONTH);
  expect(await lines(page, '[data-testid="plus-free-card"] [data-plus-sub]')).toBe(1);
  await expect(card.getByRole("button")).toHaveCount(1);
  await card.getByText("Kata kata Plus").click();
  await expect.poll(() => appPath(page)).toBe("/plus");
});

test("무료 360px·125% — ' / ' 자리에서만 두 줄(덩어리는 각각 한 줄)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_125 });
  await openApp(page, "me");
  const sel = '[data-testid="plus-free-card"] [data-plus-sub]';
  expect(await lines(page, sel)).toBe(2);
  const chunks = await page.locator(sel + " .inline-block").evaluateAll((els) =>
    els.map((e) => ({ t: e.textContent, n: Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).fontSize) * 1.5)) })));
  expect(chunks.map((c) => c.t)).toEqual([MONTHLY + " /", YEARLY_PER_MONTH]);
  for (const c of chunks) expect(c.n, c.t || "").toBe(1);
});

test("Plus — '이용 중' 15px 굵게 Pretendard, '연간 / 다음 결제 …', 구독 관리 알약 동작", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedSession(page, { tier: "plus", until: UNTIL, autoRenew: true, basePlanId: "yearly" });
  await openApp(page, "me");
  const card = page.getByTestId("plus-member-card");
  const suffix = card.locator("[data-plus-suffix]");
  await expect(suffix).toHaveText("이용 중");
  // 제목과 같은 15px 설계값(0.9375rem — 앱 글자 크기 100% 의 실제 뿌리 크기를 따라 화면에서는 제목과 같은 값)
  const titleSize = await card.getByText("Kata kata Plus").evaluate((e) => getComputedStyle(e).fontSize);
  await expect(suffix).toHaveCSS("font-size", titleSize);
  expect(await suffix.evaluate((e) => parseFloat(getComputedStyle(e).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(0.9375, 4);
  await expect(suffix).toHaveCSS("font-weight", "700");
  await expect(suffix).toHaveCSS("color", "rgb(29, 31, 30)");
  expect(await suffix.evaluate((e) => getComputedStyle(e).fontFamily)).toContain("Pretendard");
  // 제목과 밑선 맞춤(같은 줄이면 아래 끝이 거의 같음)
  const tb = (await card.getByText("Kata kata Plus").boundingBox())!;
  const sb = (await suffix.boundingBox())!;
  expect(Math.abs(tb.y + tb.height - (sb.y + sb.height))).toBeLessThanOrEqual(3);
  await expect(card.locator("[data-plus-sub]")).toHaveText("연간 / 다음 결제 2027년 11월 25일");
  // 예전 두 줄 목록은 없음
  await expect(page.getByText("회원 등급", { exact: true })).toHaveCount(0);
  // 구독 관리 알약 — 미리보기는 Play 가 없어 예전 "구독 관리" 줄과 같은 안내
  await card.getByRole("button", { name: "구독 관리" }).click();
  await expect(page.getByText("구독 관리는 Google Play에서 받은 앱에서 열립니다")).toBeVisible();
  expect(appPath(page)).toBe("/me");
  // 카드 나머지 → 구독 화면
  await card.getByText("Kata kata Plus").click();
  await expect.poll(() => appPath(page)).toBe("/plus");
});

test("Plus 해지됨 — '연간 / 정기 결제 취소됨 · …까지 이용', 360px·125% 에서 '이용 중'이 넘치지 않음", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_125 });
  await openApp(page, "");
  await seedSession(page, { tier: "plus", until: UNTIL, autoRenew: false, basePlanId: "yearly" });
  await openApp(page, "me");
  const card = page.getByTestId("plus-member-card");
  await expect(card.locator("[data-plus-sub]")).toHaveText("연간 / 정기 결제 취소됨 · 2027년 11월 25일까지 이용");
  const cb = (await card.boundingBox())!;
  const sb = (await card.locator("[data-plus-suffix]").boundingBox())!;
  expect(sb.x + sb.width).toBeLessThanOrEqual(cb.x + cb.width);
  // "이용 중"은 한 덩어리(두 줄로 쪼개지지 않음)
  expect(await card.locator("[data-plus-suffix]").evaluate((e) => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).fontSize) * 1.5)))).toBe(1);
});

// 2026-11-25: 오른쪽 여백 12 → 20px(알약이 카드 끝에서 조금 더 안쪽). 세 카드가 PlusCard 한 곳의 값을 씀
test("세 카드(홈·내 정보 무료·Plus) 안쪽 여백 왼쪽 14px · 오른쪽 20px, 알약 오른쪽 끝이 카드 끝에서 21px(테두리 1 + 여백 20)", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  const check = async (sel: string, pill: string) => {
    const card = page.locator(sel);
    await expect(card).toHaveCSS("padding-left", "14px");
    await expect(card).toHaveCSS("padding-right", "20px");
    const cb = (await card.boundingBox())!;
    const pb = (await card.locator(pill).boundingBox())!;
    expect(Math.round(cb.x + cb.width - (pb.x + pb.width))).toBe(21);
  };
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await check('[data-fit-anchor="plus"]', "[data-plus-more]");
  await openApp(page, "me");
  await check('[data-testid="plus-free-card"]', "[data-plus-more]");
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedSession(page, { tier: "plus", until: UNTIL, autoRenew: true, basePlanId: "yearly" });
  await openApp(page, "me");
  await check('[data-testid="plus-member-card"]', "[data-plus-manage]");
});

test("홈 Plus 카드와 내 정보 무료 칸의 겉모양이 같음", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  const look = (sel: string) => page.locator(sel).evaluate((e) => {
    const s = getComputedStyle(e);
    const flower = e.firstElementChild as HTMLElement;
    const f = flower.getBoundingClientRect();
    const title = e.querySelector(".font-body") as HTMLElement;
    const ts = getComputedStyle(title);
    return [s.backgroundColor, s.borderTopColor, s.borderTopWidth, s.borderTopLeftRadius, s.paddingLeft, s.paddingRight, Math.round(f.width), Math.round(f.height), ts.fontFamily, ts.fontSize].join(" | ");
  });
  await openApp(page, "");
  const home = await look('[data-fit-anchor="plus"]');
  await openApp(page, "me");
  expect(await look('[data-testid="plus-free-card"]')).toBe(home);
});
