// 내 정보 > 공부 시간 막대 그래프(2026-11-25 지시서 A)
//   · 칸 높이는 숫자가 있어도 없어도 같음(그래프 32px 그대로), 숫자는 그래프 영역 밖으로 나가지 않고 두 숫자가 겹치지 않음
//   · 막대 색 세 단계(오늘 #2C6D63 · 어제 #467D73 · 그 전 #9CC5BB), 지난달 하루 평균 점선 #9AA1A6 + 설명 줄 값
//   · 월말은 오른쪽 위 두 줄, 1일은 오늘 숫자만, "지난달" 보기는 숫자 없음

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";
import { dayKey, seedUsage } from "../myInfoSeed";

const FONT_STEP_125 = 8;

// 10월: 하루 평균이 정확히 40분이 되게 31일 모두 40분
function usage(today: number, yMin: number, tMin: number, withOct = true): Record<string, number> {
  const r: Record<string, number> = {};
  if (withOct) for (let d = 1; d <= 31; d++) r[dayKey(2026, 10, d)] = 40;
  const base = [20, 35, 0, 50, 15, 40, 60, 25, 30, 0, 45, 70, 20, 35, 55, 10, 25, 40, 30, 15, 50, 20, 35, 45, 10, 30, 25, 60, 40, 20];
  for (let d = 1; d < today - 1; d++) r[dayKey(2026, 11, d)] = base[d - 1];
  if (today > 1) r[dayKey(2026, 11, today - 1)] = yMin;
  r[dayKey(2026, 11, today)] = tMin;
  return r;
}

async function openMe(page: Page, o: { day: number; w?: number; h?: number; step?: number; data: Record<string, number> }) {
  await page.clock.setFixedTime(new Date(2026, 10, o.day, 15, 0, 0));
  await page.setViewportSize({ width: o.w || 412, height: o.h || 915 });
  await setupPreview(page, { tier: "free", fontStep: o.step === undefined ? FONT_STEP_100 : o.step });
  await openApp(page, "");
  await seedUsage(page, o.data);
  await openApp(page, "me");
  await expect(page.locator("[data-study-chart]")).toBeVisible();
}

type Box = { x: number; y: number; width: number; height: number };
const within = (a: Box, b: Box) =>
  a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height + 0.5;
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function cardHeight(page: Page) {
  return page.locator("[data-study-chart]").evaluate((e) => {
    let n: HTMLElement | null = e as HTMLElement;
    while (n && n.parentElement && !(n.style && n.style.padding)) n = n.parentElement;
    return n ? n.getBoundingClientRect().height : 0;
  });
}

test("보통 날 — 어제·오늘 숫자와 색, 그래프 안, 겹침 없음, 칸 높이는 숫자가 없을 때와 같음", async ({ page }) => {
  await openMe(page, { day: 18, data: usage(18, 90, 20) });
  const chart = (await page.locator("[data-study-chart]").boundingBox())!;
  expect(Math.round(chart.height)).toBe(32);
  const y = page.locator('[data-day-label="yesterday"]');
  const t = page.locator('[data-day-label="today"]');
  await expect(y).toHaveText("어제 1h 30m");
  await expect(t).toHaveText("오늘 20m");
  await expect(y).toHaveCSS("color", "rgb(70, 125, 115)");
  await expect(t).toHaveCSS("color", "rgb(44, 109, 99)");
  await expect(page.locator('[data-bar="yesterday"]')).toHaveCSS("background-color", "rgb(70, 125, 115)");
  await expect(page.locator('[data-bar="today"]')).toHaveCSS("background-color", "rgb(44, 109, 99)");
  const yb = (await y.boundingBox())!;
  const tb = (await t.boundingBox())!;
  expect(within(yb, chart), "어제 숫자가 그래프 안").toBe(true);
  expect(within(tb, chart), "오늘 숫자가 그래프 안").toBe(true);
  expect(overlap(yb, tb)).toBe(false);
  await expect(page.locator("[data-ref-legend]")).toHaveText("지난달 하루 평균 40분");
  const withLabels = await cardHeight(page);

  // 기록이 없으면 숫자가 없고, 칸 높이는 같음(같은 페이지라 저장소가 남아 있어 같은 날들을 0분으로 덮어씀)
  const zero: Record<string, number> = {};
  for (const k of Object.keys(usage(18, 90, 20))) zero[k] = 0;
  await openMe(page, { day: 18, data: zero });
  await expect(page.locator("[data-day-label]")).toHaveCount(0);
  await expect(page.locator("[data-ref-legend]")).toHaveText("지난달 하루 평균");
  expect(await cardHeight(page)).toBeCloseTo(withLabels, 0);
});

for (const v of [{ n: "412px·100%", w: 412, h: 915, step: FONT_STEP_100 }, { n: "360px·125%", w: 360, h: 740, step: FONT_STEP_125 }]) {
  test("월말(30일) " + v.n + " — 오른쪽 위 두 줄(윗줄 어제·아랫줄 오늘, 오른쪽 끝 맞춤), 그래프 안", async ({ page }) => {
    await openMe(page, { day: 30, w: v.w, h: v.h, step: v.step, data: usage(30, 90, 20) });
    const chart = (await page.locator("[data-study-chart]").boundingBox())!;
    const yb = (await page.locator('[data-day-label="yesterday"]').boundingBox())!;
    const tb = (await page.locator('[data-day-label="today"]').boundingBox())!;
    expect(within(yb, chart)).toBe(true);
    expect(within(tb, chart)).toBe(true);
    expect(overlap(yb, tb)).toBe(false);
    expect(yb.y).toBeLessThan(tb.y);
    expect(Math.abs(yb.x + yb.width - (chart.x + chart.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(tb.x + tb.width - (chart.x + chart.width))).toBeLessThanOrEqual(1);
  });
}

test("오늘 막대가 가장 높은 날 360px·125% — 숫자는 그래프 안, 겹침 없음", async ({ page }) => {
  await openMe(page, { day: 18, w: 360, h: 740, step: FONT_STEP_125, data: usage(18, 30, 95) });
  const chart = (await page.locator("[data-study-chart]").boundingBox())!;
  const yb = (await page.locator('[data-day-label="yesterday"]').boundingBox())!;
  const tb = (await page.locator('[data-day-label="today"]').boundingBox())!;
  expect(within(yb, chart)).toBe(true);
  expect(within(tb, chart)).toBe(true);
  expect(overlap(yb, tb)).toBe(false);
});

test("1일 — 오늘 숫자만, 어제 0분 — 오늘 숫자만", async ({ page }) => {
  await openMe(page, { day: 1, data: usage(1, 0, 25) });
  await expect(page.locator('[data-day-label="yesterday"]')).toHaveCount(0);
  await expect(page.locator('[data-day-label="today"]')).toHaveText("오늘 25m");
  await openMe(page, { day: 18, data: usage(18, 0, 60) });
  await expect(page.locator('[data-day-label="yesterday"]')).toHaveCount(0);
  await expect(page.locator('[data-day-label="today"]')).toHaveText("오늘 1h");
});

test("'지난달' 보기 — 어제·오늘 숫자 없음, 점선 색과 설명 줄 값(그 전 달 기록이 있을 때)", async ({ page }) => {
  // 9월 기록(하루 30분)을 넣어 두면 지난달(10월) 보기의 설명 줄에 "전달 하루 평균 30분"
  const data = usage(18, 90, 20);
  for (let d = 1; d <= 30; d++) data[dayKey(2026, 9, d)] = 30;
  await openMe(page, { day: 18, data });
  await page.getByRole("button", { name: "지난달", exact: true }).click();
  await expect(page.locator("[data-day-label]")).toHaveCount(0);
  await expect(page.locator("[data-ref-legend]")).toHaveText("전달 하루 평균 30분");
  const dash = await page.locator("[data-ref-legend] > span").first().evaluate((e) => getComputedStyle(e).borderTopColor);
  expect(dash).toBe("rgb(154, 161, 166)");
});
