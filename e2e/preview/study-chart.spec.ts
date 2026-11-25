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
  // 한국 시각 정오로 고정 — 브라우저는 Asia/Seoul(playwright.config), 시험을 돌리는 컴퓨터는 UTC(Actions)일 수 있어
  // new Date(2026, 10, day, 15) 처럼 돌리는 쪽 시간대로 만들면 Actions 에서 하루가 밀림(2026-11-25 E2E #67)
  await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, o.day, 3, 0, 0)));
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
  expect(Math.round(chart.height)).toBe(59); // 2026-11-25 32 → 43px(4/3) → 59px(+16)
  const y = page.locator('[data-day-label="yesterday"]');
  const t = page.locator('[data-day-label="today"]');
  // 어제 숫자는 보통(400), 오늘 숫자만 굵게(700)(2026-11-25)
  await expect(y).toHaveCSS("font-weight", "400");
  await expect(t).toHaveCSS("font-weight", "700");
  await expect(y).toHaveText("어제 1h 30m");
  await expect(t).toHaveText("오늘 20m");
  await expect(y).toHaveCSS("color", "rgb(70, 125, 115)");
  await expect(t).toHaveCSS("color", "rgb(44, 109, 99)");
  // 어제 막대는 오늘·지난 날들의 중간색 #64998F(2026-11-25), 어제 숫자 색은 #467D73 그대로
  await expect(page.locator('[data-bar="yesterday"]')).toHaveCSS("background-color", "rgb(100, 153, 143)");
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
  // 2026-11-25: 두 줄 묶음 자리는 후보 중 어제·오늘 막대와 덜 겹치는 곳(그래프 오른쪽 끝 / 어제 막대 바로 왼쪽)
  test("월말(30일) " + v.n + " — 위쪽 두 줄(윗줄 어제·아랫줄 오늘, 끝 맞춤), 그래프 안, 어제·오늘 막대와 안 겹침", async ({ page }) => {
    await openMe(page, { day: 30, w: v.w, h: v.h, step: v.step, data: usage(30, 90, 20) });
    const chart = (await page.locator("[data-study-chart]").boundingBox())!;
    const yb = (await page.locator('[data-day-label="yesterday"]').boundingBox())!;
    const tb = (await page.locator('[data-day-label="today"]').boundingBox())!;
    expect(within(yb, chart)).toBe(true);
    expect(within(tb, chart)).toBe(true);
    expect(overlap(yb, tb)).toBe(false);
    expect(yb.y).toBeLessThan(tb.y);
    expect(Math.abs(yb.x + yb.width - (tb.x + tb.width))).toBeLessThanOrEqual(1);
    for (const bar of ["yesterday", "today"]) {
      const bb = (await page.locator('[data-bar="' + bar + '"]').boundingBox())!;
      expect(overlap(yb, bb), "어제 숫자 × " + bar + " 막대").toBe(false);
      expect(overlap(tb, bb), "오늘 숫자 × " + bar + " 막대").toBe(false);
    }
  });
}

// 2026-11-25 칸 높이 고정 — 같은 폭·같은 글자 크기면 기록 상태와 상관없이 공부 시간 칸 높이가 같음.
// 상태마다 새 브라우저 문맥을 열어(저장소가 남지 않게) 칸 높이를 재고 숫자로 비교합니다.
for (const v of [{ n: "412px·100%", w: 412, h: 915, step: FONT_STEP_100 }, { n: "360px·125%", w: 360, h: 800, step: FONT_STEP_125 }]) {
  test("칸 높이 고정 " + v.n + " — 기록 없음·작은 막대·어제 최고·두 줄(25·30일)·1일·지난달 보기·평균 있음/없음", async ({ browser }) => {
    test.setTimeout(120000);
    const s21 = (today: number) => {
      const r = usage(today, 15 * 60 + 16, 92);
      return r;
    };
    const small: Record<string, number> = { [dayKey(2026, 11, 3)]: 5, [dayKey(2026, 11, 8)]: 3 };
    const prevOnly = (() => { const r = usage(18, 90, 20); for (let d = 1; d <= 30; d++) r[dayKey(2026, 9, d)] = 30; return r; })();
    const states: Array<{ name: string; day: number; data: Record<string, number>; prev?: boolean }> = [
      { name: "기록 없음", day: 18, data: {} },
      { name: "작은 막대만", day: 9, data: small },
      { name: "어제가 그달 최고(25일, 두 줄)", day: 25, data: s21(25) },
      { name: "두 줄(30일)", day: 30, data: s21(30) },
      { name: "1일", day: 1, data: usage(1, 0, 25) },
      { name: "지난달 평균 값 없음", day: 18, data: usage(18, 90, 20, false) },
      { name: "지난달 보기(전달 평균 있음)", day: 18, data: prevOnly, prev: true },
      { name: "지난달 보기(전달 평균 없음)", day: 18, data: usage(18, 90, 20), prev: true },
    ];
    const heights: Record<string, number> = {};
    for (const st of states) {
      const ctx = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
      const page = await ctx.newPage();
      await openMe(page, { day: st.day, w: v.w, h: v.h, step: v.step, data: st.data });
      if (st.prev) {
        await page.getByRole("button", { name: "지난달", exact: true }).click();
        await expect(page.getByRole("button", { name: "지난달", exact: true })).toHaveAttribute("aria-pressed", "true");
      }
      await page.waitForTimeout(200);
      heights[st.name] = Math.round((await cardHeight(page)) * 100) / 100;
      await ctx.close();
    }
    console.log("공부 시간 칸 높이 " + v.n + " " + JSON.stringify(heights));
    const vals = Object.values(heights);
    for (const [k, h] of Object.entries(heights)) expect(h, k).toBeCloseTo(vals[0], 1);
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
