// 훈장 창 두 가지(2026-11-24 "훈장 창 정리")
//   · 요약 창(공개판 홈 명찰·게임방 명찰): 360px·글자 100% 에서 창 안 스크롤 없이 다 보임, 탭·단추·설명 문단 없음, "자세히 보기" 없음
//   · 자세히 창(내 정보 훈장 칸): 설명 문단 없음, 알약 탭 불꽃/별, 별의 단계 6줄
//   · 둘 다 공통 틀 — 뒤로가기로 닫힘

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";

// lib/medaliHelp.ts 본문의 첫머리 — 자세히·요약 창 어디에도 없어야 합니다(설명은 내 정보 ⓘ 에만)
const API_BODY = "얼마나 꾸준히 공부했는지";
const STAR_BODY = "공부해서 실제로 외운 단어의 수";

async function noInnerScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return false;
    const els = [d as HTMLElement].concat(Array.from(d.querySelectorAll("*")) as HTMLElement[]);
    return !els.some((x) => {
      const oy = getComputedStyle(x).overflowY;
      return (oy === "auto" || oy === "scroll") && x.scrollHeight > x.clientHeight + 1;
    });
  });
}

test("요약 창(홈 명찰) — 360px·100% 에서 스크롤 없이, 탭·단추·설명 없음, 뒤로가기로 닫힘", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await page.locator('button[title="Medali"]:visible').first().click();
  const sheet = page.getByRole("dialog", { name: "훈장", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-medali-view="summary"]')).toHaveCount(1);
  await expect(sheet.getByText("이번 주 불꽃")).toBeVisible();
  await expect(sheet.getByText("모은 별")).toBeVisible();
  await expect(sheet.getByText("다음 주부터 지난주와 비교해 드립니다")).toBeVisible();
  // 창 안 단추는 X(닫기) 하나뿐 — 탭·하단 단추 없음
  await expect(sheet.getByRole("button")).toHaveCount(1);
  await expect(sheet.getByRole("button", { name: "닫기", exact: true })).toHaveCount(1);
  await expect(sheet.getByText("자세히 보기")).toHaveCount(0);
  await expect(sheet.getByText(API_BODY, { exact: false })).toHaveCount(0);
  await expect(sheet.getByText(STAR_BODY, { exact: false })).toHaveCount(0);
  expect(await noInnerScroll(page)).toBe(true);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
});

test("요약 창(게임방 명찰)", async ({ page }) => {
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  await page.locator('button[title="Medali"]:visible').first().click();
  const sheet = page.getByRole("dialog", { name: "훈장", exact: true });
  await expect(sheet.locator('[data-medali-view="summary"]')).toHaveCount(1);
});

test("자세히 창(내 정보 훈장 칸) — 설명 문단 없음, 알약 탭, 별의 단계 6줄", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 840 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  await page.getByRole("button", { name: new RegExp("열정 점수") }).click();
  const sheet = page.getByRole("dialog", { name: "훈장", exact: true });
  await expect(sheet.locator('[data-medali-view="detail"]')).toHaveCount(1);
  const fire = sheet.getByRole("button", { name: "불꽃", exact: true });
  const star = sheet.getByRole("button", { name: "별", exact: true });
  await expect(fire).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.getByText("오늘 쌓인 점수")).toBeVisible();
  await expect(sheet.getByText(API_BODY, { exact: false })).toHaveCount(0);
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.locator("[data-medali-stage-row]")).toHaveCount(6);
  await expect(sheet.getByText(STAR_BODY, { exact: false })).toHaveCount(0);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/me$"));
});
