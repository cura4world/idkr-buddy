// src/lib/studyChartLabels.ts
// 내 정보 > 공부 시간 막대 그래프의 "어제 1h 30m"·"오늘 20m" 숫자 자리 계산(2026-11-25).
// 화면(MyInfo.tsx)이 실제 글자 폭·높이와 막대 높이를 재서 넘기면, 그래프 영역 안의 위치를 돌려줍니다.
// 순수 함수라 단위 테스트로 배치 규칙을 확인합니다(src/test/studyChartLabels.test.ts).
//
// 규칙 (2026-11-25 "숫자를 자기 막대에 붙이기" — 예전 "막대 위 → 옆 → 두 줄 쌓기"를 바꿈)
//   ① 어제 숫자: 항상 어제 막대 바로 왼쪽(pad 4px), 높이는 어제 막대 꼭대기에 맞춤(그래프 영역 안으로 자름)
//   ② 오늘 숫자: 오늘 막대 바로 오른쪽(pad 4px)에 한 줄 "오늘 2h 30m", 높이는 오늘 막대 꼭대기에 맞춤
//   ③ 한 줄이 오른쪽에 안 들어가면 같은 자리에 두 줄 "오늘" / "2h 30m"("오늘" 글자는 빼지 않음)
//   ④ 두 줄로도 오른쪽에 안 들어가는 월말에만, 두 숫자를 어제 막대 바로 왼쪽에 위아래로 모음(위 어제, 아래 오늘) —
//      자리는 후보(어제 막대 바로 왼쪽 / 그래프 오른쪽 끝 / 왼쪽 끝 / 오늘 막대 바로 오른쪽) 중 어제·오늘 막대와 겹치는 넓이가 가장 작은 곳(같으면 앞 후보)
//   ⑤ 월초 등 어제 숫자가 왼쪽에 안 들어가면 예전 규칙 그대로 — 위쪽 두 줄(왼쪽 후보 먼저, 막대와 덜 겹치는 곳)
//   ⑥ 두 숫자는 서로 겹치지 않고, 어제·오늘 막대를 가리지 않음. 다른 날 막대와 겹치는 것은 괜찮음(흰 테두리)

export interface LabelSize {
  w: number;
  h: number;
}

export interface ChartLabelInput {
  /** 그래프 영역 폭·높이(px) */
  chartW: number;
  chartH: number;
  /** 그 달의 날 수(막대 수) */
  days: number;
  /** 막대 사이 간격(px) */
  gap: number;
  /** 오늘(0부터) */
  todayIdx: number;
  /** 어제·오늘 막대 높이(px) */
  yesterdayBarH: number;
  todayBarH: number;
  /** 숫자 글자 크기(px). 숨길 숫자는 null */
  yesterday: LabelSize | null;
  /** 오늘 숫자 한 줄("오늘 2h 30m") */
  today: LabelSize | null;
  /** 오늘 숫자 두 줄("오늘" / "2h 30m") — 없으면 두 줄을 쓰지 않음 */
  todayTwoLine?: LabelSize | null;
  /** 막대와 숫자 사이(px), 기본 4 */
  pad?: number;
}

export type LabelHow = "side" | "stack";

export interface PlacedLabel {
  x: number;
  y: number;
  w: number;
  h: number;
  how: LabelHow;
}

export interface ChartLabelLayout {
  /** side = ①②, side-2 = ①③(오늘 두 줄), gather = ④ 어제 막대 왼쪽에 모음, stack-left = ⑤ 월초 */
  mode: "side" | "side-2" | "gather" | "stack-left";
  yesterday: PlacedLabel | null;
  today: PlacedLabel | null;
  /** 오늘 숫자를 두 줄로 그리는가 */
  todayLines: 1 | 2;
}

/** "20m" · "1h" · "1h 30m". 1분 미만은 빈 문자열(숫자를 숨김) */
export function shortHM(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return m + "m";
  if (m === 0) return h + "h";
  return h + "h " + m + "m";
}

/** i 번째 막대의 왼쪽·오른쪽(px) */
export function barSpan(chartW: number, days: number, gap: number, i: number): { left: number; right: number } {
  const w = (chartW - gap * (days - 1)) / days;
  const left = i * (w + gap);
  return { left, right: left + w };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

function fitsX(l: PlacedLabel, chartW: number): boolean {
  return l.x >= -0.01 && l.x + l.w <= chartW + 0.01;
}

/** 두 상자가 겹치는가(맞닿는 것은 겹침이 아님) */
export function labelsOverlap(a: PlacedLabel | null, b: PlacedLabel | null): boolean {
  if (!a || !b) return false;
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** 두 상자가 겹치는 넓이(px²) */
function overlapArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function barBoxes(input: ChartLabelInput) {
  const { chartW, chartH, days, gap, todayIdx, yesterdayBarH, todayBarH } = input;
  const t = barSpan(chartW, days, gap, todayIdx);
  const boxes = [{ x: t.left, y: chartH - todayBarH, w: t.right - t.left, h: todayBarH }];
  if (todayIdx >= 1) {
    const y = barSpan(chartW, days, gap, todayIdx - 1);
    boxes.push({ x: y.left, y: chartH - yesterdayBarH, w: y.right - y.left, h: yesterdayBarH });
  }
  return boxes;
}

/** 어제·오늘 막대와 숫자가 겹치는 넓이(px²) — 시험·점검용 */
export function barOverlapArea(input: ChartLabelInput, layout: ChartLabelLayout): number {
  const bars = barBoxes(input);
  let a = 0;
  for (const l of [layout.yesterday, layout.today]) if (l) for (const b of bars) a += overlapArea(l, b);
  return a;
}

/**
 * 두 숫자를 위아래로 모음(위 어제, 아래 오늘 한 줄). 후보 중 어제·오늘 막대와 겹치는 넓이가 가장 작은 자리(같으면 앞 후보).
 *   gather(④): 어제 막대 바로 왼쪽(오른쪽 끝 맞춤) → 그래프 오른쪽 끝 → 왼쪽 끝 → 오늘 막대 바로 오른쪽. 묶음 위끝은 어제 막대 꼭대기 높이(영역 안으로)
 *   stack-left(⑤): 왼쪽 끝 → 오늘 막대 바로 오른쪽 → 어제(없으면 오늘) 막대 바로 왼쪽 → 오른쪽 끝. 묶음 위끝은 0(예전 그대로)
 */
function gather(input: ChartLabelInput, kind: "gather" | "stack-left", pad: number): ChartLabelLayout {
  const { chartW, chartH, days, gap, todayIdx, yesterdayBarH, todayBarH, today } = input;
  const yesterday = todayIdx >= 1 ? input.yesterday : null;
  const blockW = Math.max(yesterday ? yesterday.w : 0, today ? today.w : 0);
  const blockH = (yesterday ? yesterday.h : 0) + (today ? today.h : 0);
  const tBar = barSpan(chartW, days, gap, todayIdx);
  const yBar = todayIdx >= 1 ? barSpan(chartW, days, gap, todayIdx - 1) : null;
  const bars = barBoxes(input);

  type Cand = { align: "right" | "left"; edge: number };
  const leftOfYesterday: Cand = { align: "right", edge: (yesterday && yBar ? yBar.left : tBar.left) - pad };
  const rightEnd: Cand = { align: "right", edge: chartW };
  const leftEnd: Cand = { align: "left", edge: 0 };
  const rightOfToday: Cand = { align: "left", edge: tBar.right + pad };
  const cands = kind === "gather"
    ? [leftOfYesterday, rightEnd, leftEnd, rightOfToday]
    : [leftEnd, rightOfToday, leftOfYesterday, rightEnd];
  const top = kind === "gather"
    ? clamp(chartH - (yesterday ? yesterdayBarH : todayBarH), 0, chartH - blockH)
    : 0;

  const build = (c: Cand) => {
    let y = top;
    const place = (s: LabelSize | null): PlacedLabel | null => {
      if (!s) return null;
      const p: PlacedLabel = { x: c.align === "right" ? c.edge - s.w : c.edge, y, w: s.w, h: s.h, how: "stack" };
      y += s.h;
      return p;
    };
    return { yl: place(yesterday), tl: place(today) };
  };

  let best: { yl: PlacedLabel | null; tl: PlacedLabel | null; cost: number } | null = null;
  for (const c of cands) {
    const left = c.align === "right" ? c.edge - blockW : c.edge;
    if (left < -0.01 || left + blockW > chartW + 0.01) continue; // 그래프 영역 밖이면 후보에서 뺌
    const { yl, tl } = build(c);
    let cost = 0;
    for (const l of [yl, tl]) if (l) for (const b of bars) cost += overlapArea(l, b);
    if (!best || cost < best.cost - 0.01) best = { yl, tl, cost };
  }
  if (!best) {
    // 어느 후보도 들어가지 않는 좁은 그래프 — 첫 후보에 맞춤
    const { yl, tl } = build(cands[0]);
    return { mode: kind, yesterday: yl, today: tl, todayLines: 1 };
  }
  return { mode: kind, yesterday: best.yl, today: best.tl, todayLines: 1 };
}

export function placeChartLabels(input: ChartLabelInput): ChartLabelLayout {
  const { chartW, chartH, days, gap, todayIdx, yesterdayBarH, todayBarH } = input;
  const pad = input.pad === undefined ? 4 : input.pad;
  // 1일에는 어제 막대가 이 달에 없음
  const yesterday = todayIdx >= 1 ? input.yesterday : null;
  const today = input.today;
  if (!yesterday && !today) return { mode: "side", yesterday: null, today: null, todayLines: 1 };

  // ① 어제: 어제 막대 바로 왼쪽, 꼭대기 높이
  let yl: PlacedLabel | null = null;
  if (yesterday) {
    const bar = barSpan(chartW, days, gap, todayIdx - 1);
    yl = { x: bar.left - pad - yesterday.w, y: clamp(chartH - yesterdayBarH, 0, chartH - yesterday.h), w: yesterday.w, h: yesterday.h, how: "side" };
    // ⑤ 월초 등 왼쪽에 안 들어감 → 예전 규칙(위쪽 두 줄, 왼쪽 후보 먼저)
    if (!fitsX(yl, chartW)) return gather({ ...input, yesterday }, "stack-left", pad);
  }

  if (!today) return { mode: "side", yesterday: yl, today: null, todayLines: 1 };

  // ② 오늘 한 줄: 오늘 막대 바로 오른쪽, 꼭대기 높이
  const tBar = barSpan(chartW, days, gap, todayIdx);
  const one: PlacedLabel = { x: tBar.right + pad, y: clamp(chartH - todayBarH, 0, chartH - today.h), w: today.w, h: today.h, how: "side" };
  if (fitsX(one, chartW)) return { mode: "side", yesterday: yl, today: one, todayLines: 1 };

  // ③ 오늘 두 줄: 같은 자리
  const two2 = input.todayTwoLine;
  if (two2) {
    const two: PlacedLabel = { x: tBar.right + pad, y: clamp(chartH - todayBarH, 0, chartH - two2.h), w: two2.w, h: two2.h, how: "side" };
    if (fitsX(two, chartW)) return { mode: "side-2", yesterday: yl, today: two, todayLines: 2 };
  }

  // ④ 월말: 어제 막대 바로 왼쪽에 위아래로 모음
  return gather({ ...input, yesterday }, "gather", pad);
}
