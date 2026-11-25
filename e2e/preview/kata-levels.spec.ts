// 오늘의 단어 퍼즐 4·5·6글자 단계(2026-11-25)
//   · 날짜 줄 단계 칩("4글자"/"5글자"/"6글자"), 줄마다 그 글자 수만큼 칸, 칸 크기는 단계와 상관없이 같음, 칸 묶음 가운데
//   · 단계가 바뀐 날 "내일부터 N글자로 풀어요" 알림
//   · 그 단계 목록에 없는 말은 거절(시도 횟수를 쓰지 않음)

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";
import { KATA_EXTRA_GUESSES } from "../../src/data/kataHariIniGuesses";
import { KATA_ANSWERS, KATA_EPOCH_DAY } from "../../src/data/kataHariIniWords";

const FONT_STEP_125 = 8;
// 2026-11-26(한국 시각 정오) — 4·6글자 목록의 0번 날
const NOW = Date.UTC(2026, 10, 26, 3, 0, 0);
const DAY = Math.floor((NOW + 9 * 3600 * 1000) / 86400000);

async function openKata(page: Page, o: { len?: 4 | 5 | 6; w?: number; h?: number; step?: number; level?: Record<string, unknown> }) {
  await page.clock.setFixedTime(new Date(NOW));
  await page.setViewportSize({ width: o.w || 412, height: o.h || 840 });
  await setupPreview(page, { tier: "free", fontStep: o.step === undefined ? FONT_STEP_100 : o.step });
  const level = o.level || { cur: o.len || 5, fails: 0, fasts: 0 };
  await page.addInitScript((lv) => {
    if (!sessionStorage.getItem("e2e-kata-seeded")) {
      localStorage.setItem("kata-hari-ini", JSON.stringify({ days: {}, level: lv }));
      sessionStorage.setItem("e2e-kata-seeded", "1");
    }
  }, level);
  await openApp(page, "permainan/kata");
  await expect(page.locator("[data-kata-grid]")).toBeVisible();
}

for (const v of [{ n: "412px·100%", w: 412, h: 840, step: FONT_STEP_100 }, { n: "360px·125%", w: 360, h: 760, step: FONT_STEP_125 }]) {
  test("단계 칩·칸 수·칸 크기 " + v.n + " — 4·5·6글자 모두 같은 칸 크기, 가운데 정렬", async ({ browser }) => {
    const sizes: number[] = [];
    // 그날 문제는 처음 연 순간의 단계로 고정되므로 단계마다 새 문맥(저장소)으로 엶
    for (const len of [4, 5, 6] as const) {
      const ctx = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
      const page = await ctx.newPage();
      await openKata(page, { len, w: v.w, h: v.h, step: v.step });
      await expect(page.locator("[data-kata-level]")).toHaveText(len + "글자");
      const firstRow = page.locator("[data-kata-grid] > [data-kata-row]").first();
      await expect(firstRow.locator("[data-kata-cell]")).toHaveCount(len);
      const cell = (await firstRow.locator("[data-kata-cell]").first().boundingBox())!;
      sizes.push(Math.round(cell.width * 10) / 10);
      // 가운데 정렬 — 줄의 가운데가 화면 가운데
      const row = (await firstRow.boundingBox())!;
      expect(Math.abs(row.x + row.width / 2 - v.w / 2)).toBeLessThanOrEqual(1.5);
      // 날짜 줄은 한 줄(칩까지)
      const st = (await page.locator("[data-kata-status]").boundingBox())!;
      const chip = (await page.locator("[data-kata-level]").boundingBox())!;
      expect(Math.abs((st.y + st.height / 2) - (chip.y + chip.height / 2))).toBeLessThanOrEqual(2);
      await ctx.close();
    }
    expect(sizes[0]).toBe(sizes[1]);
    expect(sizes[1]).toBe(sizes[2]);
  });
}

test("4글자 — 목록에 없는 말은 거절(시도 횟수 그대로), 덜 채우면 '네 글자를 모두 채워 주세요'", async ({ page }) => {
  await openKata(page, { len: 4 });
  for (const ch of "zzz") await page.keyboard.press(ch);
  await page.keyboard.press("Enter");
  await expect(page.getByText("네 글자를 모두 채워 주세요")).toBeVisible();
  await page.keyboard.press("z");
  await page.keyboard.press("Enter");
  await expect(page.getByText("단어 목록에 없는 단어입니다")).toBeVisible();
  await expect(page.locator('[data-kata-row="done"]')).toHaveCount(0);
  // 5글자 말은 4칸이라 다섯째 글자가 들어가지 않음
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  for (const ch of "rumah") await page.keyboard.press(ch);
  await expect(page.locator('[data-kata-row="current"] [data-kata-cell]').nth(3)).toHaveText("a");
});

test("단계가 바뀐 날 알림 — 어제 못 맞힌 뒤 오늘도 못 맞히면 '내일부터 4글자로 풀어요', 오늘 칩은 그대로 5글자", async ({ page }) => {
  await openKata(page, { level: { cur: 5, fails: 1, fasts: 0 } });
  await expect(page.locator("[data-kata-level]")).toHaveText("5글자");
  // 오늘(5글자) 정답이 아닌 실제 단어 여섯 개로 다 틀림
  const answer = KATA_ANSWERS[(((DAY - KATA_EPOCH_DAY) % KATA_ANSWERS.length) + KATA_ANSWERS.length) % KATA_ANSWERS.length][0];
  const words = KATA_EXTRA_GUESSES.filter((w) => w !== answer).slice(0, 6);
  for (const w of words) {
    for (const ch of w) await page.keyboard.press(ch);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
  }
  await expect(page.getByText("내일부터 4글자로 풀어요")).toBeVisible();
  await expect(page.locator("[data-kata-level]")).toHaveText("5글자");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("kata-hari-ini") || "{}"));
  expect(stored.level.cur).toBe(4);
});
