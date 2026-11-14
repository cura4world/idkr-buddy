// 내 단어장(/category/my-wordbook) — 머리의 + 버튼 메뉴와 거기서 여는 세 시트.
// CategoryDetail.tsx 의 plusItems: 단어 추가 / 단어장 만들기 / CSV 가져오기 (내 단어장은 세 줄).
// 시트는 FormSheet(role="dialog", aria-label = 제목)이고, 메뉴는 + 버튼 바로 아래에 뜨는 role="menu" 입니다.

import { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, expectNoHorizontalOverflow } from "../fixtures";

const ITEMS = ["단어 추가", "단어장 만들기", "CSV 가져오기"];

function plusButton(page: Page) {
  return page.getByRole("button", { name: "추가하기", exact: true });
}

async function openMenu(page: Page) {
  await plusButton(page).click();
  const menu = page.getByRole("menu", { name: "추가하기" });
  await expect(menu).toBeVisible();
  return menu;
}

test.beforeEach(async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "category/my-wordbook");
  await expect(plusButton(page)).toBeVisible();
});

test("+ 메뉴 — 세 줄이 + 버튼 아래, 화면 안에 뜸", async ({ page }) => {
  const menu = await openMenu(page);
  await expect(plusButton(page)).toHaveAttribute("aria-expanded", "true");
  const items = menu.getByRole("menuitem");
  await expect(items).toHaveCount(ITEMS.length);
  for (let i = 0; i < ITEMS.length; i++) await expect(items.nth(i)).toContainText(ITEMS[i]);

  const mb = await menu.boundingBox();
  const bb = await plusButton(page).boundingBox();
  expect(mb).not.toBeNull();
  expect(bb).not.toBeNull();
  if (mb && bb) {
    expect(mb.y, "메뉴가 + 버튼 아래").toBeGreaterThanOrEqual(bb.y + bb.height);
    expect(Math.abs(mb.x + mb.width - (bb.x + bb.width)), "메뉴 오른쪽 끝 = + 버튼 오른쪽 끝").toBeLessThanOrEqual(1);
    expect(mb.x, "메뉴 왼쪽이 화면 안").toBeGreaterThanOrEqual(0);
  }
  await expectNoHorizontalOverflow(page, "내 단어장 + 메뉴");

  // 메뉴 바깥을 누르면 닫힙니다
  await page.mouse.click(20, 400);
  await expect(menu).toHaveCount(0);
  await expect(plusButton(page)).toHaveAttribute("aria-expanded", "false");
});

for (const title of ITEMS) {
  test("+ 메뉴 → " + title + " 시트가 열리고 닫힘", async ({ page }) => {
    const menu = await openMenu(page);
    await menu.getByRole("menuitem").filter({ hasText: title }).click();
    await expect(menu).toHaveCount(0);

    const sheet = page.getByRole("dialog", { name: title, exact: true });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(title, { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, title + " 시트");

    // 시트는 화면 아래에 붙고 창 안에 있습니다
    const sb = await sheet.boundingBox();
    const vp = page.viewportSize();
    expect(sb).not.toBeNull();
    if (sb && vp) {
      expect(sb.y).toBeGreaterThanOrEqual(0);
      expect(Math.round(sb.y + sb.height)).toBe(vp.height);
    }

    await sheet.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    // 시트만 닫히고 화면은 그대로
    expect(appPath(page)).toBe("/category/my-wordbook");
    await expect(plusButton(page)).toBeVisible();
  });
}

test("단어 추가 시트 — 폰 뒤로가기는 시트만 닫음", async ({ page }) => {
  const menu = await openMenu(page);
  await menu.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "단어 추가", exact: true });
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  expect(appPath(page)).toBe("/category/my-wordbook");
});
