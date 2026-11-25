// 오늘의 단어 퍼즐(/permainan/kata) — 2026-11-25 "게임 방법 단추 · 칸 배치"
//   · "게임 방법"은 처음에 자동으로 뜨지 않고 단추를 눌러야 열림(공용 AppSheet, X·뒤로가기로 닫힘), 문구는 lib/kataHariIniHelp.ts
//   · 칸 아래 설명 줄이 없음, 칸 묶음은 날짜 줄과 자판 사이 세로 가운데
//   · 지금 쓸 줄만 진한 테두리, 한 줄을 확인하면 다음 줄로
//   · 칸 크기 = 6글자 한 줄이 화면 폭에 들어가는 크기(최대 52px)
//   · 날짜 줄은 한 줄(넘치면 단추 둘만 다음 줄), 글은 줄이지 않음

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";
import { KATA_HELP } from "../../src/lib/kataHariIniHelp";

const FONT_STEP_125 = 8;

async function openKata(page: Page, w: number, h: number, step: number) {
  // 문제는 날마다 바뀜 — 2026-11-25(한국 시각 정오)로 고정. 이날 정답은 MERAH·RUMAH 가 아님
  await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, 25, 3, 0, 0)));
  await page.setViewportSize({ width: w, height: h });
  await setupPreview(page, { tier: "free", fontStep: step });
  await openApp(page, "permainan/kata");
  await expect(page.locator("[data-kata-grid]")).toBeVisible();
}

const helpSheet = (page: Page) => page.getByRole("dialog", { name: KATA_HELP.title });

test("게임 방법 — 처음엔 안 뜨고, 단추를 눌러야 열림. 문구·예시 색·도움말, X·뒤로가기로 닫힘", async ({ page }) => {
  await openKata(page, 412, 840, FONT_STEP_100);
  await page.waitForTimeout(400);
  await expect(helpSheet(page)).toHaveCount(0);

  await page.getByRole("button", { name: KATA_HELP.title, exact: true }).click();
  const sheet = helpSheet(page);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(KATA_HELP.lead)).toBeVisible();
  await expect(sheet.getByText(KATA_HELP.example.caption)).toBeVisible();
  // 예시: MERAH = 노랑 M · 회색 E · 노랑 R · 초록 A · 초록 H, RUMAH = 모두 초록 + "정답!"
  const rows = sheet.locator("[data-kata-help-row]");
  await expect(rows).toHaveCount(2);
  expect(await rows.nth(0).locator("[data-mark]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.mark))).toEqual(["near", "miss", "near", "hit", "hit"]);
  expect(await rows.nth(1).locator("[data-mark]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.mark))).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  await expect(rows.nth(1).getByText("정답!")).toBeVisible();
  // 게임 칸과 같은 색
  await expect(rows.nth(0).locator("[data-mark]").nth(3)).toHaveCSS("background-color", "rgb(94, 156, 110)");
  await expect(rows.nth(0).locator("[data-mark]").nth(0)).toHaveCSS("background-color", "rgb(217, 180, 74)");
  await expect(rows.nth(0).locator("[data-mark]").nth(1)).toHaveCSS("background-color", "rgb(174, 182, 187)");
  await expect(sheet.locator("[data-kata-help-color]")).toHaveText(["초록 글자도 자리도 맞아요", "노랑 단어에 있지만 자리가 달라요", "회색 단어에 없는 글자예요"]);
  await expect(sheet.locator("[data-kata-help-tip]")).toHaveText(KATA_HELP.tips.map((t) => "·" + t));

  await sheet.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(helpSheet(page)).toHaveCount(0);

  await page.getByRole("button", { name: KATA_HELP.title, exact: true }).click();
  await expect(helpSheet(page)).toBeVisible();
  await page.goBack();
  await expect(helpSheet(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/permainan/kata$"));
});

test("칸 아래 설명 줄 없음, 칸 묶음은 날짜 줄과 자판 사이 세로 가운데", async ({ page }) => {
  await openKata(page, 412, 840, FONT_STEP_100);
  await expect(page.getByText("다섯 글자 인도네시아어 단어를 넣고", { exact: false })).toHaveCount(0);
  await expect(page.getByText("초록: 글자와 자리가 맞음")).toHaveCount(0);
  await expect(page.getByText("번 안에 맞혀 보세요", { exact: false })).toHaveCount(0);
  const g = (await page.locator("[data-kata-grid]").boundingBox())!;
  const s = (await page.locator("[data-kata-status-row]").boundingBox())!;
  const k = (await page.getByRole("button", { name: "q", exact: true }).boundingBox())!;
  const above = g.y - (s.y + s.height);
  const below = k.y - (g.y + g.height);
  // 자판 묶음 위 여백(pt-4 = 16px)만큼 아래쪽이 더 큼 — 그만큼을 빼면 같음
  expect(Math.abs(above - (below - 16))).toBeLessThanOrEqual(2);
});

test("지금 쓸 줄만 진한 테두리, 확인하면 다음 줄로", async ({ page }) => {
  await openKata(page, 412, 840, FONT_STEP_100);
  const rows = page.locator("[data-kata-grid] > [data-kata-row]");
  await expect(rows).toHaveCount(6);
  await expect(page.locator('[data-kata-row="current"]')).toHaveCount(1);
  await expect(rows.nth(0)).toHaveAttribute("data-kata-row", "current");
  // 지금 줄 빈 칸 #9AA1A6, 아직 안 쓴 줄 #E6EAEC + 옅은 바탕
  await expect(rows.nth(0).locator("[data-kata-cell]").first()).toHaveCSS("border-top-color", "rgb(154, 161, 166)");
  await expect(rows.nth(1).locator("[data-kata-cell]").first()).toHaveCSS("border-top-color", "rgb(230, 234, 236)");
  await expect(rows.nth(1).locator("[data-kata-cell]").first()).toHaveCSS("background-color", "rgb(246, 248, 249)");
  for (const ch of "merah") await page.keyboard.press(ch);
  // 글자가 든 칸은 더 진하게
  await expect(rows.nth(0).locator("[data-kata-cell]").first()).toHaveCSS("border-top-color", "rgb(100, 108, 114)");
  await page.keyboard.press("Enter");
  await expect(rows.nth(0)).toHaveAttribute("data-kata-row", "done");
  await expect(rows.nth(1)).toHaveAttribute("data-kata-row", "current");
  await expect(page.locator('[data-kata-row="current"]')).toHaveCount(1);
});

for (const v of [{ n: "412px·100%", w: 412, h: 840, step: FONT_STEP_100, cell: 52 }, { n: "360px·125%", w: 360, h: 760, step: FONT_STEP_125, cell: (360 - 32 - 30) / 6 }]) {
  test("칸 크기·날짜 줄 " + v.n + " — 6글자 한 줄이 들어가는 크기, 날짜 줄은 한 줄·글 안 줄임·옆으로 안 넘침", async ({ page }) => {
    await openKata(page, v.w, v.h, v.step);
    const cell = (await page.locator("[data-kata-cell]").first().boundingBox())!;
    expect(cell.width).toBeCloseTo(v.cell, 0);
    expect(cell.height).toBeCloseTo(v.cell, 0);
    // 6칸 + 사이 5개가 화면 폭(좌우 여백 16px) 안에 들어감
    expect(6 * cell.width + 5 * 6).toBeLessThanOrEqual(v.w - 32 + 0.5);
    const st = (await page.locator("[data-kata-status]").boundingBox())!;
    const pills = (await page.locator("[data-kata-pills]").boundingBox())!;
    expect(Math.abs((st.y + st.height / 2) - (pills.y + pills.height / 2)), "날짜 글과 단추가 한 줄").toBeLessThanOrEqual(2);
    expect(await page.locator("[data-kata-status]").evaluate((e) => e.scrollWidth <= e.clientWidth + 0.5)).toBe(true);
    expect(pills.x + pills.width).toBeLessThanOrEqual(v.w - 16 + 1);
    // 두 알약 높이가 같음
    const help = (await page.getByRole("button", { name: KATA_HELP.title, exact: true }).boundingBox())!;
    const hint = (await page.getByRole("button", { name: "뜻 힌트", exact: true }).boundingBox())!;
    expect(Math.round(help.height)).toBe(Math.round(hint.height));
    // 자판 끝까지 화면 안
    const back = (await page.getByRole("button", { name: "지우기" }).boundingBox())!;
    expect(back.y + back.height).toBeLessThanOrEqual(v.h);
  });
}
