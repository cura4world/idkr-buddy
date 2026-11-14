// Plus 안내 페이지(/plus) — 미리보기 빌드의 대체 가격, 구독 버튼, 약관·개인정보 링크가 하단 탭 막대 위에 있는지.
// 금액·문구는 화면이 쓰는 소스 상수(src/lib/plusCopy.ts · platform.ts)에서 그대로 가져와 대조합니다.
// 월 환산·할인율은 Plus 화면과 같은 식(연 가격 ÷ 12, 1 - 연/(월×12))으로 여기서 계산합니다.

import { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, FONT_STEP_100, FONT_STEP_115 } from "../fixtures";
import {
  CTA_CLOSE, CTA_MONTHLY, CTA_YEARLY, FALLBACK_MONTHLY_WON, FALLBACK_TRIAL_TEXT, FALLBACK_YEARLY_WON,
  LINK_PRIVACY, LINK_RESTORE, LINK_TERMS, NOTE_AI_VOICE, NOTE_TRIAL_HALF, PLAN_MONTHLY_LABEL, PLAN_YEARLY_LABEL,
  PLUS_PERKS, PLUS_TITLE, STATE_ADMIN, STATE_PLUS, STATE_SPECIAL, STATE_TRIAL, TOAST_PREVIEW,
  ctaTrial, discountBadge, noteNoTrialLines, noteTrialLines, perMonthNote, wonText,
} from "../../src/lib/plusCopy";
import { PRIVACY_URL, TERMS_URL } from "../../src/lib/platform";

const YEARLY = "연 " + wonText(FALLBACK_YEARLY_WON);
const MONTHLY = "월 " + wonText(FALLBACK_MONTHLY_WON);
const PER_MONTH = perMonthNote(wonText(Math.round(FALLBACK_YEARLY_WON / 12)));
const DISCOUNT = discountBadge(Math.round((1 - FALLBACK_YEARLY_WON / (FALLBACK_MONTHLY_WON * 12)) * 100));

function plans(page: Page) {
  return page.getByRole("radiogroup", { name: "요금제" });
}

test("무료 · 체험 가능 — 대체 가격과 체험 버튼", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "plus");

  await expect(page.getByRole("heading", { name: PLUS_TITLE })).toBeVisible();
  // 혜택 제목(첫 줄은 제목 옆에 단어 수 덧말이 같은 줄에 붙습니다)
  for (const perk of PLUS_PERKS) await expect(page.getByText(perk.title).first()).toBeVisible();

  const radios = plans(page).getByRole("radio");
  await expect(radios).toHaveCount(2);
  const yearly = radios.nth(0);
  const monthly = radios.nth(1);
  await expect(yearly).toContainText(PLAN_YEARLY_LABEL);
  await expect(yearly.getByText(YEARLY, { exact: true })).toBeVisible();
  await expect(yearly.getByText(PER_MONTH, { exact: true })).toBeVisible();
  await expect(yearly.getByText(DISCOUNT, { exact: true })).toBeVisible();
  await expect(monthly).toContainText(PLAN_MONTHLY_LABEL);
  await expect(monthly.getByText(MONTHLY, { exact: true })).toBeVisible();
  await expect(yearly).toHaveAttribute("aria-checked", "true");
  await expect(monthly).toHaveAttribute("aria-checked", "false");

  const cta = page.getByRole("button", { name: ctaTrial(FALLBACK_TRIAL_TEXT), exact: true });
  await expect(cta).toBeVisible();
  await expect(cta).toBeEnabled();
  // 버튼 아래: 자동 결제 고지 + 체험 뒤 결제 금액
  for (const line of noteTrialLines(FALLBACK_TRIAL_TEXT, YEARLY, true)) await expect(page.getByText(line)).toBeVisible();
  await expect(page.getByText(NOTE_TRIAL_HALF)).toBeVisible();
  await expect(page.getByText(NOTE_AI_VOICE)).toBeVisible();

  // 월간을 고르면 안내의 금액이 월 가격으로 바뀝니다
  await monthly.click();
  await expect(monthly).toHaveAttribute("aria-checked", "true");
  for (const line of noteTrialLines(FALLBACK_TRIAL_TEXT, MONTHLY, false)) await expect(page.getByText(line)).toBeVisible();

  // 미리보기에서는 결제하지 않습니다
  await cta.click();
  await expect(page.getByText(TOAST_PREVIEW)).toBeVisible();
  expect(appPath(page)).toBe("/plus");
});

test("무료 · 체험을 이미 쓴 계정 — 바로 구독 버튼", async ({ page }) => {
  await setupPreview(page, { tier: "free", trialUsed: true });
  await openApp(page, "plus");

  await expect(page.getByRole("button", { name: CTA_YEARLY, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: ctaTrial(FALLBACK_TRIAL_TEXT), exact: true })).toHaveCount(0);
  for (const line of noteNoTrialLines(true)) await expect(page.getByText(line)).toBeVisible();
  await expect(page.getByText(NOTE_TRIAL_HALF)).toHaveCount(0);

  await plans(page).getByRole("radio").nth(1).click();
  await expect(page.getByRole("button", { name: CTA_MONTHLY, exact: true })).toBeVisible();
  for (const line of noteNoTrialLines(false)) await expect(page.getByText(line)).toBeVisible();
  // 가격은 체험 여부와 무관하게 같습니다
  await expect(page.getByText(YEARLY, { exact: true })).toBeVisible();
  await expect(page.getByText(MONTHLY, { exact: true })).toBeVisible();
});

const ENTITLED: { tier: "trial" | "plus" | "special" | "admin"; title: string }[] = [
  { tier: "trial", title: STATE_TRIAL },
  { tier: "plus", title: STATE_PLUS },
  { tier: "special", title: STATE_SPECIAL },
  { tier: "admin", title: STATE_ADMIN },
];

for (const e of ENTITLED) {
  test("이미 열려 있는 등급 — " + e.tier + ": 요금제 대신 상태 상자", async ({ page }) => {
    await setupPreview(page, { tier: e.tier });
    await openApp(page, "plus");
    await expect(page.getByRole("heading", { name: PLUS_TITLE })).toBeVisible();
    await expect(page.getByText(e.title, { exact: true })).toBeVisible();
    await expect(plans(page)).toHaveCount(0);
    await expect(page.getByText(YEARLY, { exact: true })).toHaveCount(0);
    // 미리보기에는 Play 결제가 없어 "구독 관리" 대신 "닫기"
    await expect(page.getByRole("button", { name: CTA_CLOSE, exact: true }).last()).toBeVisible();
  });
}

// 약관·개인정보 링크와 구독 버튼이 하단 탭 막대에 가리지 않는지 (2026-11-14 점검 U-01 의 회귀 방지)
const SIZES: { w: number; h: number; step: number; label: string }[] = [
  { w: 360, h: 640, step: FONT_STEP_100, label: "360×640 · 100%" },
  { w: 360, h: 640, step: FONT_STEP_115, label: "360×640 · 115%" },
  { w: 360, h: 732, step: FONT_STEP_100, label: "360×732 · 100%" },
  { w: 368, h: 821, step: FONT_STEP_100, label: "368×821 · 100%" },
  { w: 412, h: 915, step: FONT_STEP_100, label: "412×915 · 100%" },
];

for (const s of SIZES) {
  test("약관·개인정보 링크가 탭 막대 위 — " + s.label, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    await setupPreview(page, { tier: "free", fontStep: s.step });
    await openApp(page, "plus");

    const terms = page.getByRole("link", { name: LINK_TERMS, exact: true });
    const privacy = page.getByRole("link", { name: LINK_PRIVACY, exact: true });
    const restore = page.getByRole("button", { name: LINK_RESTORE, exact: true });
    await expect(terms).toHaveAttribute("href", TERMS_URL);
    await expect(privacy).toHaveAttribute("href", PRIVACY_URL);

    // 끝까지 내렸을 때
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const nav = page.getByRole("navigation", { name: "하단 메뉴" });
    await expect(nav).toBeVisible();
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    const navTop = navBox ? navBox.y : 0;
    for (const [name, loc] of [["이용약관", terms], ["개인정보처리방침", privacy], ["구독 복원", restore]] as const) {
      await expect(loc).toBeVisible();
      const b = await loc.boundingBox();
      expect(b, name + " 위치").not.toBeNull();
      const bottom = b ? b.y + b.height : 0;
      expect(bottom, name + " 아래 끝(" + bottom + ")이 탭 막대 윗끝(" + navTop + ")보다 위").toBeLessThanOrEqual(navTop);
      expect(b ? b.y : -1, name + " 이 화면 안").toBeGreaterThanOrEqual(0);
    }

    // 세 링크는 한 줄에 나란히(서로 겹치지 않음)
    const tb = await terms.boundingBox();
    const pb = await privacy.boundingBox();
    const rb = await restore.boundingBox();
    if (tb && pb && rb) {
      expect(rb.x + rb.width).toBeLessThanOrEqual(tb.x);
      expect(tb.x + tb.width).toBeLessThanOrEqual(pb.x);
      expect(pb.x + pb.width).toBeLessThanOrEqual(s.w);
    }

    // 구독 버튼도 끝까지 내린 화면에서 탭 막대 위에 온전히 보입니다
    const cta = page.getByRole("button", { name: ctaTrial(FALLBACK_TRIAL_TEXT), exact: true });
    const cb = await cta.boundingBox();
    expect(cb).not.toBeNull();
    if (cb) expect(cb.y + cb.height).toBeLessThanOrEqual(navTop);
  });
}
