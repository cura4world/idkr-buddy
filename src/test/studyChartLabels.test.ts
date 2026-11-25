// 내 정보 공부 시간 그래프의 어제·오늘 숫자 배치(lib/studyChartLabels.ts)
// 2026-11-25 규칙 "숫자를 자기 막대에 붙이기": 어제는 어제 막대 왼쪽, 오늘은 오늘 막대 오른쪽(한 줄 → 두 줄), 월말에만 어제 막대 왼쪽에 모음
import { describe, expect, it } from "vitest";
import { barOverlapArea, barSpan, labelsOverlap, placeChartLabels, shortHM, type ChartLabelInput, type LabelSize, type PlacedLabel } from "@/lib/studyChartLabels";

// 그래프 높이 59px. 글자 크기는 화면 실측에 가까운 값
//   412px·100%: 그래프 폭 352, 어제(보통 굵기) 58×12.7, 오늘(굵게) 한 줄 62×12.7 · 두 줄 36×25.4
//   360px·125%: 그래프 폭 300, 어제 74×15.8, 오늘 한 줄 80×15.8 · 두 줄 47×31.6
const S412 = { chartW: 352, y: { w: 58, h: 12.7 }, t: { w: 62, h: 12.7 }, t2: { w: 36, h: 25.4 } };
const S360 = { chartW: 300, y: { w: 74, h: 15.8 }, t: { w: 80, h: 15.8 }, t2: { w: 47, h: 31.6 } };
const H = 59;

function input(s: { chartW: number; y: LabelSize; t: LabelSize; t2: LabelSize }, o: Partial<ChartLabelInput>): ChartLabelInput {
  return {
    chartW: s.chartW, chartH: H, days: 30, gap: 3, todayIdx: 14, yesterdayBarH: 20, todayBarH: 10,
    yesterday: s.y, today: s.t, todayTwoLine: s.t2, ...o,
  };
}

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
  it("15일 보통 날 — 어제는 어제 막대 바로 왼쪽, 오늘은 오늘 막대 바로 오른쪽 한 줄, 높이는 각 막대 꼭대기", () => {
    for (const s of [S412, S360]) {
      const i = input(s, { todayIdx: 14, yesterdayBarH: 30, todayBarH: 10 });
      const r = placeChartLabels(i);
      expect(r.mode).toBe("side");
      expect(r.todayLines).toBe(1);
      expect(r.yesterday!.x + r.yesterday!.w).toBeCloseTo(barSpan(s.chartW, 30, 3, 13).left - 4, 5);
      expect(r.today!.x).toBeCloseTo(barSpan(s.chartW, 30, 3, 14).right + 4, 5);
      expect(r.yesterday!.y).toBeCloseTo(H - 30, 5);
      expect(r.today!.y).toBeCloseTo(Math.min(H - 10, H - s.t.h), 5);
      expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
      expect(barOverlapArea(i, r)).toBe(0);
      inside(r.yesterday, i); inside(r.today, i);
    }
  });

  it("25일 어제가 그달 최고(꼭대기까지)·오늘 2h 30m — 오늘은 오른쪽에 두 줄(412px·100%)", () => {
    const i = input(S412, { todayIdx: 24, yesterdayBarH: H, todayBarH: 10 });
    const r = placeChartLabels(i);
    expect(r.mode).toBe("side-2");
    expect(r.todayLines).toBe(2);
    expect(r.today!.x).toBeCloseTo(barSpan(352, 30, 3, 24).right + 4, 5);
    expect(r.today!.h).toBe(S412.t2.h);
    // 어제 숫자는 꼭대기(0)에서, 어제 막대 왼쪽
    expect(r.yesterday!.y).toBe(0);
    expect(r.yesterday!.x + r.yesterday!.w).toBeCloseTo(barSpan(352, 30, 3, 23).left - 4, 5);
    expect(barOverlapArea(i, r)).toBe(0);
    inside(r.yesterday, i); inside(r.today, i);
  });

  it("25일 360px·125% — 오른쪽에 들어가면 두 줄, 아니면 어제 막대 왼쪽에 모음. 어느 쪽이든 어제·오늘 막대를 가리지 않음", () => {
    const i = input(S360, { todayIdx: 24, yesterdayBarH: H, todayBarH: 10 });
    const r = placeChartLabels(i);
    expect(["side-2", "gather"]).toContain(r.mode);
    expect(barOverlapArea(i, r)).toBe(0);
    expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
    inside(r.yesterday, i); inside(r.today, i);
  });

  it("30일(30일 달)·31일(31일 달) — 두 숫자를 어제 막대 바로 왼쪽에 위아래로(위 어제, 아래 오늘, 오른쪽 끝 맞춤)", () => {
    for (const s of [S412, S360]) {
      for (const [days, idx] of [[30, 29], [31, 30]]) {
        const i = input(s, { days, todayIdx: idx, yesterdayBarH: 30, todayBarH: 10 });
        const r = placeChartLabels(i);
        expect(r.mode).toBe("gather");
        expect(r.todayLines).toBe(1);
        expect(r.yesterday!.y).toBeLessThan(r.today!.y);
        const edge = barSpan(s.chartW, days, 3, idx - 1).left - 4;
        expect(r.yesterday!.x + r.yesterday!.w).toBeCloseTo(edge, 5);
        expect(r.today!.x + r.today!.w).toBeCloseTo(edge, 5);
        expect(barOverlapArea(i, r)).toBe(0);
        expect(labelsOverlap(r.yesterday, r.today)).toBe(false);
        inside(r.yesterday, i); inside(r.today, i);
      }
    }
  });

  it("1일 — 오늘 숫자만(오늘 막대 오른쪽 한 줄)", () => {
    const r = placeChartLabels(input(S412, { todayIdx: 0 }));
    expect(r.yesterday).toBeNull();
    expect(r.mode).toBe("side");
    expect(r.today!.x).toBeCloseTo(barSpan(352, 30, 3, 0).right + 4, 5);
  });

  it("어제 0분 — 오늘 숫자만", () => {
    const r = placeChartLabels(input(S412, { yesterday: null }));
    expect(r.yesterday).toBeNull();
    expect(r.today).not.toBeNull();
    expect(r.mode).toBe("side");
  });

  it("월초(어제 숫자가 왼쪽에 안 들어감) — 예전 규칙 그대로 위쪽 두 줄, 어제·오늘 막대와 안 겹침", () => {
    for (const [yh, th] of [[10, 6], [H, 3], [3, H]]) {
      const i = input(S412, { todayIdx: 1, yesterdayBarH: yh, todayBarH: th });
      const r = placeChartLabels(i);
      expect(r.mode).toBe("stack-left");
      expect(barOverlapArea(i, r)).toBe(0);
      inside(r.yesterday, i); inside(r.today, i);
    }
  });

  it("어느 날·어느 막대 높이·두 화면에서도 두 숫자가 겹치지 않고 그래프 밖으로 나가지 않으며, 어제·오늘 막대를 가리지 않음", () => {
    for (const s of [S412, S360]) {
      for (const days of [28, 30, 31]) {
        for (let idx = 0; idx < days; idx++) {
          for (const yh of [1, 10, 25, 40, H]) {
            for (const th of [1, 10, 25, 40, H]) {
              const i = input(s, { days, todayIdx: idx, yesterdayBarH: yh, todayBarH: th });
              const r = placeChartLabels(i);
              const tag = JSON.stringify({ w: s.chartW, days, idx, yh, th, mode: r.mode });
              expect(labelsOverlap(r.yesterday, r.today), tag).toBe(false);
              expect(barOverlapArea(i, r), tag).toBe(0);
              inside(r.yesterday, i); inside(r.today, i);
            }
          }
        }
      }
    }
  });
});
