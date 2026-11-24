// 훈장 요약·자세히(2026-11-24 "훈장 창 정리" → 같은 날 요약은 명찰 아래 떠 있는 상자로)
//   · 요약 상자(공개판 홈 명찰·게임방 명찰): 명찰 바로 아래(아래쪽 시트가 아님), 화면 안, 탭·설명 없음·단추는 X 하나
//     닫기: 바깥 누르기(뒤 단추는 안 눌림)·뒤로가기·X·명찰 다시 누르기, 360px·125% 에서도 화면 안
//   · 자세히 창(내 정보 훈장 칸): 설명 문단 없음, 알약 탭, 별의 단계 6줄, 누른 칸의 탭으로 열림

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";

// lib/medaliHelp.ts 본문의 첫머리 — 요약·자세히 어디에도 없어야 합니다(설명은 내 정보 ⓘ 에만)
const API_BODY = "얼마나 꾸준히 공부했는지";
const STAR_BODY = "공부해서 실제로 외운 단어의 수";
const FONT_STEP_125 = 8;

const badge = (page: Page) => page.locator('button[title="Medali"]:visible').first();
const popover = (page: Page) => page.getByRole("dialog", { name: "훈장 요약" });

async function openHome(page: Page, w: number, h: number, step: number) {
  await page.setViewportSize({ width: w, height: h });
  await setupPreview(page, { tier: "plus", fontStep: step });
  await openApp(page, "");
  await expect(badge(page)).toBeVisible();
}

test("요약 상자(홈 명찰) — 명찰 바로 아래·화면 안, 아래쪽 시트가 아님, 탭·설명 없음", async ({ page }) => {
  await openHome(page, 412, 840, FONT_STEP_100);
  await badge(page).click();
  const box = popover(page);
  await expect(box).toBeVisible();
  await expect(badge(page)).toHaveAttribute("aria-expanded", "true");
  // 아래쪽 시트(공통 틀)는 열리지 않음
  await expect(page.locator("[data-app-sheet]")).toHaveCount(0);
  const b = await badge(page).boundingBox();
  const p = await box.boundingBox();
  expect(b && p).toBeTruthy();
  if (b && p) {
    expect(p.y).toBeGreaterThan(b.y + b.height);          // 상자 위쪽이 명찰 아래쪽보다 아래
    expect(Math.abs((p.x + p.width) - (b.x + b.width))).toBeLessThanOrEqual(2); // 오른쪽 끝을 명찰에 맞춤
    expect(p.x).toBeGreaterThanOrEqual(16);
    expect(p.y + p.height).toBeLessThanOrEqual(840);
    expect(p.width).toBeLessThanOrEqual(360);
  }
  await expect(box.locator('[data-medali-view="summary"]')).toHaveCount(1);
  await expect(box.getByText("이번 주 불꽃")).toBeVisible();
  await expect(box.getByText("모은 별")).toBeVisible();
  await expect(box.getByText("다음 주부터 지난주와 비교해 드립니다")).toBeVisible();
  await expect(box.getByText("Perunggu까지 30점")).toBeVisible();
  await expect(box.getByText("Tanah II까지 12개")).toBeVisible();
  // 상자 안 단추는 X(닫기) 하나뿐 — 탭·하단 단추 없음
  await expect(box.getByRole("button")).toHaveCount(1);
  await expect(box.getByRole("button", { name: "닫기", exact: true })).toHaveCount(1);
  await expect(box.getByText("자세히 보기")).toHaveCount(0);
  await expect(box.getByText(API_BODY, { exact: false })).toHaveCount(0);
  await expect(box.getByText(STAR_BODY, { exact: false })).toHaveCount(0);
  // 열리면 상자로 초점
  expect(await box.evaluate((el) => el === document.activeElement)).toBe(true);
});

test("요약 상자 닫기 — X·명찰 다시 누르기·뒤로가기, 바깥 누르기는 뒤 단추를 누르지 않음", async ({ page }) => {
  await openHome(page, 412, 840, FONT_STEP_100);
  const box = popover(page);

  await badge(page).click();
  await expect(box).toBeVisible();
  await box.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(box).toHaveCount(0);
  // 닫히면 명찰로 초점
  expect(await badge(page).evaluate((el) => el === document.activeElement)).toBe(true);

  await badge(page).click();
  await expect(box).toBeVisible();
  await badge(page).click();
  await expect(box).toHaveCount(0);

  await badge(page).click();
  await expect(box).toBeVisible();
  await page.goBack();
  await expect(box).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/idkr-buddy/?$"));

  // 바깥 누르기: 하단 탭 "내 단어장" 위를 눌러도 단어장으로 가지 않고 상자만 닫힘
  await badge(page).click();
  await expect(box).toBeVisible();
  const row = page.getByRole("button", { name: "내 단어장", exact: true });
  const rb = await row.boundingBox();
  expect(rb).toBeTruthy();
  if (rb) await page.mouse.click(rb.x + 20, rb.y + rb.height / 2);
  await expect(box).toHaveCount(0);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(new RegExp("/idkr-buddy/?$"));
});

test("요약 상자 — 페이지를 스크롤하면 닫힘(게임방, 공개판 홈은 한 화면이라 스크롤이 없음)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 560 });
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  await badge(page).click();
  const box = popover(page);
  await expect(box).toBeVisible();
  const y = await page.evaluate(() => { window.scrollBy(0, 200); return window.scrollY; });
  expect(y, "게임방이 실제로 스크롤됨").toBeGreaterThan(0);
  await expect(box).toHaveCount(0);
});

test("요약 상자 — 360px·글자 125% 에서도 화면 안", async ({ page }) => {
  await openHome(page, 360, 740, FONT_STEP_125);
  await badge(page).click();
  const box = popover(page);
  await expect(box).toBeVisible();
  const p = await box.boundingBox();
  expect(p).toBeTruthy();
  if (p) {
    expect(p.x).toBeGreaterThanOrEqual(16);
    expect(p.x + p.width).toBeLessThanOrEqual(360 - 16 + 1);
    expect(p.y + p.height).toBeLessThanOrEqual(740);
  }
});

test("요약 상자(게임방 명찰)", async ({ page }) => {
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  await badge(page).click();
  const box = popover(page);
  await expect(box.locator('[data-medali-view="summary"]')).toHaveCount(1);
  await expect(page.locator("[data-app-sheet]")).toHaveCount(0);
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
  await expect(sheet.getByText("Tanah II까지 12개")).toBeVisible();
  await expect(sheet.getByText("다음 단계까지", { exact: false })).toHaveCount(0);
  await expect(sheet.getByText(STAR_BODY, { exact: false })).toHaveCount(0);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/me$"));
});

test("내 정보 별 칸 → 별 탭, 불꽃 칸 → 불꽃 탭", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 840 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  const sheet = page.getByRole("dialog", { name: "훈장", exact: true });
  await page.getByRole("button", { name: new RegExp("외운 단어") }).first().click();
  await expect(sheet.getByRole("button", { name: "별", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.locator("[data-medali-stage-row]")).toHaveCount(6);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp("열정 점수") }).click();
  await expect(sheet.getByRole("button", { name: "불꽃", exact: true })).toHaveAttribute("aria-pressed", "true");
});
