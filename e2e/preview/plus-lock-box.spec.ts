// Plus 안내 상자(PlusLockBox) — 2026-11-25 게임방만 "제목 위 작은 줄 + 설명 한 줄", 다른 화면은 그대로
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";

test("게임방(무료) — 제목 위 '오늘의 단어 퍼즐 외', 설명 한 줄(412px·100%)", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  const eyebrow = page.locator("[data-lock-eyebrow]");
  await expect(eyebrow).toHaveText("오늘의 단어 퍼즐 외");
  await expect(eyebrow).toHaveCSS("font-weight", "500");
  await expect(eyebrow).toHaveCSS("color", "rgb(29, 31, 30)");
  await expect(eyebrow).toHaveCSS("margin-bottom", "1px");
  expect(await eyebrow.evaluate((e) => getComputedStyle(e).fontFamily)).toContain("Pretendard");
  // 제목보다 작게
  const title = page.getByText("게임은 Plus 회원 기능입니다", { exact: true });
  const fs = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
  expect(await eyebrow.evaluate(fs)).toBeLessThan(await title.evaluate(fs));
  const lines = page.locator("[data-lock-lines]");
  await expect(lines).toHaveText("게임에서 맞힌 단어는 별이 됩니다");
  // 412px·100% 에서 한 줄
  expect(await lines.evaluate((e) => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).fontSize) * 1.55)))).toBe(1);
  await expect(page.getByText("Plus로 모든 게임을 열고,")).toHaveCount(0);
});

test("이야기(무료) 상자는 그대로 — 작은 줄 없음, 설명 두 줄", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "story");
  await expect(page.locator("[data-lock-lines]").first()).toBeVisible();
  await expect(page.locator("[data-lock-eyebrow]")).toHaveCount(0);
  expect(await page.locator("[data-lock-lines]").first().evaluate((e) => e.querySelectorAll("br").length)).toBe(1);
});
