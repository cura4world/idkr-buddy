// 옵션 창 공통 틀(AppSheet) — 끌어 닫기·입력 중 보호·바닥 단추 고정 (2026-11-24 옵션 창 통일 묶음 0)
//   · 머리(손잡이·제목 줄)를 아래로 끌면 닫힘, 본문을 밀면 닫히지 않음
//   · 입력 창에 글을 넣었으면 끌기·바깥 누르기로 닫히지 않고 X 로만 닫힘
//   · 내용이 길어도 주 단추는 창 바닥에 붙어 있음

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp } from "../fixtures";

async function openAddWord(page: Page) {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "category/my-wordbook");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await page.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "단어 추가", exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** 창이 다 그려져(글꼴·내용이 늘어나) 머리 자리가 멈출 때까지 기다린 뒤의 위치 */
async function settledBox(page: Page, selector: string) {
  const h = page.locator(selector).first();
  let prev = "";
  for (let i = 0; i < 40; i++) {
    const b = await h.boundingBox();
    const key = b ? Math.round(b.y) + "," + Math.round(b.height) : "";
    if (b && key === prev) return b;
    prev = key;
    await page.waitForTimeout(100);
  }
  throw new Error("머리 자리가 멈추지 않음");
}

async function dragHeader(page: Page, dy: number) {
  const b = await settledBox(page, "[data-sheet-drag]");
  const x = b.x + b.width / 2 - 40;
  const y = b.y + 30;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x, y + (dy * i) / 8);
  await page.mouse.up();
}

test("빈 입력 창은 머리를 끌어 내리면 닫힌다", async ({ page }) => {
  const sheet = await openAddWord(page);
  await dragHeader(page, 220);
  await expect(sheet).toHaveCount(0);
});

test("본문을 밀어도 창은 닫히지 않는다(스크롤만)", async ({ page }) => {
  const sheet = await openAddWord(page);
  await settledBox(page, "[data-sheet-drag]");
  const b = await sheet.getByText("인도네시아어", { exact: true }).first().boundingBox();
  if (!b) throw new Error("본문 없음");
  // 누른 곳이 정말 본문(머리 밖)인지 확인
  const inHeader = await page.evaluate(({ x, y }) => !!(document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-sheet-drag]"), { x: b.x + 10, y: b.y + 5 });
  expect(inHeader).toBe(false);
  await page.mouse.move(b.x + 10, b.y + 5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + 10, b.y + 5 + 25 * i);
  await page.mouse.up();
  await expect(sheet).toBeVisible();
});

test("글을 넣은 입력 창은 끌기·바깥 누르기로 닫히지 않고 X 로만 닫힌다", async ({ page }) => {
  const sheet = await openAddWord(page);
  await sheet.locator("input").first().fill("makan");
  await dragHeader(page, 260);
  await expect(sheet).toBeVisible();
  await page.mouse.click(20, 40); // 바깥(어두운 배경)
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(sheet).toHaveCount(0);
});

test("주 단추는 창 바닥에 붙어 있다(글자 125%, 360px)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setupPreview(page, { tier: "plus", fontStep: 8 });
  await openApp(page, "category/my-wordbook");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await page.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "단어 추가", exact: true });
  await expect(sheet).toBeVisible();
  const btn = sheet.getByRole("button", { name: "추가하기" });
  const bb = await btn.boundingBox();
  const sb = await sheet.boundingBox();
  expect(bb && sb).toBeTruthy();
  if (bb && sb) {
    // 바닥 여백(16px + 안전 여백 0) 안에 단추 아래 끝이 있음
    expect(sb.y + sb.height - (bb.y + bb.height)).toBeLessThanOrEqual(20);
    expect(bb.y).toBeGreaterThanOrEqual(sb.y);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
