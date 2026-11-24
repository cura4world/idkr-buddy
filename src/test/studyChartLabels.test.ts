// 내 정보 공부 시간 그래프의 어제·오늘 숫자 배치(2026-11-25, lib/studyChartLabels.ts)
import { describe, expect, it } from "vitest";
import { barSpan, labelsOverlap, placeChartLabels, shortHM, type ChartLabelInput, type PlacedLabel } from "@/lib/studyChartLabels";

// 412px·100% 실측에 가까운 값: 그래프 폭 352 · 높이 32 · 막대 사이 3, "어제 1h 30m" 62×14, "오늘 20m" 46×14
const Y = { w: 62, h: 14 };
const T = { w: 46, h: 14 };
const base = (o: Partial<ChartLabelInput>): ChartLabelInput => ({
  chartW: 352, chartH: 32, days: 30, gap: 3, todayIdx: 17, yesterdayBarH: 10, todayBarH: 6, yesterday: Y, today: T, ...o,
});

function inside(l: PlacedLabel | null, i: ChartLabelInput) {
  if (!l) return;
  expect(l.x).toBeGreaterThanOrEqual(-0.01);
  expect(l.x + l.w).toBeLessThanOrEqual(i.chartW + 0.01);
  expect(l.y).toBeGreaterThanOrEqual(-0.01);
  expect(l.y + l.h).toBeLessThanOrEqual(i.chartH + 0.01);
}

describe("shortHM", () => {
  it("1시간 미만 20m · 정각 1h · 그 밖 1h 30m · 0분은 빈 문자열", () => {
    expect(shortHM(20 * 60000)).toBe("20m");
    expect(shortHM(60 * 60000)).toBe("1h");
    expect(shortHM(90 * 60000)).toBe("1h 30m");
    expect(shortHM(125 * 60000 + 59000)).toBe("2h 5m");
    expect(shortHM(59000)).toBe("");
    expect(shortHM(0)).toBe("");
  });
});

describe("어제·오늘 숫자 배치", () => {
  it("보통 날 — 둘 다 막대 바로 위, 어제는 막대 오른쪽 끝에 맞춰 왼쪽으로, 오늘은 막대 왼쪽 끝에서 오른쪽으로", () => {
    const i = base({});
    const r = placeChartLabels(i);
    expect(r.mode).toBe("free");
    expect(r.yesterday!.how).toBe("above");
    expect(r.today!.how).toBe("above");
    expect(r.yesterday!.x + r.yesterday!.w).toBeCloseTo(barSpan(352, 30, 3, 16).right, 5);
    expect(r.today!.x).toBeCloseTo(barSpan(352, 30, 3, 17).left, 5);
    expect(r.yesterday!.y + r.yesterday!.h).toBeCloseTo(32 - 10 - 4, 5);
    expect(r.today!.y + r.today!.h).toBeCloseTo(32 - 6 - 4, 5);
    expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
    inside(r.yesterday, i); inside(r.today, i);
  });

  it("오늘 막대가 가장 높은 날 — 오늘 숫자는 막대 꼭대기 높이에서 오른쪽 옆으로", () => {
    const i = base({ todayBarH: 30 });
    const r = placeChartLabels(i);
    expect(r.mode).toBe("free");
    expect(r.today!.how).toBe("side");
    expect(r.today!.x).toBeCloseTo(barSpan(352, 30, 3, 17).right + 4, 5);
    expect(r.today!.y).toBeCloseTo(2, 5); // 꼭대기(32-30)
    expect(r.yesterday!.how).toBe("above");
    expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
    inside(r.yesterday, i); inside(r.today, i);
  });

  it("어제 막대가 높으면 어제 숫자는 왼쪽 옆으로", () => {
    const i = base({ yesterdayBarH: 32 });
    const r = placeChartLabels(i);
    expect(r.yesterday!.how).toBe("side");
    expect(r.yesterday!.x + r.yesterday!.w).toBeCloseTo(barSpan(352, 30, 3, 16).left - 4, 5);
    expect(r.yesterday!.y).toBe(0);
    inside(r.yesterday, i);
  });

  it("30일(30일 달)·31일(31일 달) — 오른쪽 위에 두 줄, 윗줄 어제·아랫줄 오늘, 오른쪽 끝 맞춤", () => {
    for (const [days, idx] of [[30, 29], [31, 30]]) {
      const i = base({ days, todayIdx: idx });
      const r = placeChartLabels(i);
      expect(r.mode).toBe("stack-right");
      expect(r.yesterday!.y).toBe(0);
      expect(r.today!.y).toBe(Y.h);
      expect(r.yesterday!.x + r.yesterday!.w).toBe(352);
      expect(r.today!.x + r.today!.w).toBe(352);
      expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
      inside(r.yesterday, i); inside(r.today, i);
    }
  });

  it("1일 — 오늘 숫자만(어제 막대가 이 달에 없음)", () => {
    const r = placeChartLabels(base({ todayIdx: 0 }));
    expect(r.yesterday).toBeNull();
    expect(r.today!.how).toBe("above");
    expect(r.today!.x).toBe(0);
  });

  it("어제 0분 — 오늘 숫자만", () => {
    const r = placeChartLabels(base({ yesterday: null }));
    expect(r.yesterday).toBeNull();
    expect(r.today).not.toBeNull();
  });

  it("월초(어제 숫자가 왼쪽에 안 들어감) — 왼쪽 위에 두 줄", () => {
    const i = base({ todayIdx: 1 });
    const r = placeChartLabels(i);
    expect(r.mode).toBe("stack-left");
    expect(r.yesterday!.x).toBe(0);
    expect(r.today!.x).toBe(0);
    inside(r.yesterday, i); inside(r.today, i);
  });

  it("어느 날·어느 막대 높이·125% 글자에서도 두 숫자가 겹치지 않고 그래프 밖으로 나가지 않음", () => {
    const sizes = [
      { chartW: 352, y: Y, t: T },
      { chartW: 300, y: { w: 78, h: 15.8 }, t: { w: 58, h: 15.8 } }, // 360px·125%
    ];
    for (const s of sizes) {
      for (const days of [28, 30, 31]) {
        for (let idx = 0; idx < days; idx++) {
          for (const yh of [1, 8, 14, 20, 32]) {
            for (const th of [1, 8, 14, 20, 32]) {
              const i = base({ chartW: s.chartW, days, todayIdx: idx, yesterdayBarH: yh, todayBarH: th, yesterday: s.y, today: s.t });
              const r = placeChartLabels(i);
              expect(labelsOverlap(r.yesterday, r.today), JSON.stringify({ days, idx, yh, th })).toBe(false);
              inside(r.yesterday, i); inside(r.today, i);
            }
          }
        }
      }
    }
  });
});
