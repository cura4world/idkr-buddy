// 회화집 주제 목록의 자물쇠(2026-11-24)
//   무료: 안에 열 수 있는 장면이 하나도 없는 주제 = '인사와 기본'을 뺀 전부 → 자물쇠 줄 수 = 전체 주제 수 - 1
//   잠긴 주제도 누르면 장면 목록으로 들어감(누르는 동작은 그대로). Plus: 자물쇠 0개

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, FONT_STEP_100 } from "../fixtures";

const rows = (page: Page) => page.locator("[data-percakapan-topics] > button");
const locksIn = (scope: ReturnType<Page["locator"]>) => scope.getByRole("img", { name: "잠김", exact: true });

test("무료 — '인사와 기본'만 자물쇠 없음, 잠긴 주제를 누르면 장면 목록", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "percakapan");
  const dasar = rows(page).filter({ hasText: "인사와 기본" });
  await expect(dasar).toHaveCount(1);
  const total = await rows(page).count();
  expect(total).toBeGreaterThan(1);
  await expect(locksIn(page.locator("[data-percakapan-topics]"))).toHaveCount(total - 1);
  await expect(locksIn(dasar)).toHaveCount(0);

  const kenal = rows(page).filter({ hasText: "친해지기" });
  await expect(locksIn(kenal)).toHaveCount(1);
  await kenal.click();
  await expect.poll(() => appPath(page)).toBe("/percakapan/c/perkenalan");
  // 장면 목록이 열리고 각 장면에 자물쇠
  await expect(page.getByRole("img", { name: "잠김", exact: true }).first()).toBeVisible();
});

test("Plus — 주제 목록에 자물쇠 0개", async ({ page }) => {
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "percakapan");
  await expect(rows(page).filter({ hasText: "인사와 기본" })).toHaveCount(1);
  expect(await rows(page).count()).toBeGreaterThan(1);
  await expect(locksIn(page.locator("[data-percakapan-topics]"))).toHaveCount(0);
});
