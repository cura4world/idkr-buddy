// src/lib/studyChartLabels.ts
// 내 정보 > 공부 시간 막대 그래프의 "어제 1h 30m"·"오늘 20m" 숫자 자리 계산(2026-11-25).
// 화면(MyInfo.tsx)이 실제 글자 폭·높이와 막대 높이를 재서 넘기면, 그래프 영역 안의 위치를 돌려줍니다.
// 순수 함수라 단위 테스트로 배치 규칙을 확인합니다(src/test/studyChartLabels.test.ts).
//
// 규칙 (지시서 A-2)
//   ① 기본은 막대 바로 위(pad 4px). 어제는 오른쪽 끝을 어제 막대 오른쪽에 맞춰 왼쪽으로, 오늘은 왼쪽 끝을 오늘 막대 왼쪽에 맞춰 오른쪽으로
//   ② 막대가 높아 위에 자리가 없으면 막대 꼭대기 높이에서 옆으로(어제는 왼쪽 옆, 오늘은 오른쪽 옆)
//   ③ 오늘 숫자가 오른쪽에 들어갈 자리가 없으면 두 숫자를 그래프 오른쪽 위에 두 줄로(윗줄 어제, 아랫줄 오늘, 둘 다 오른쪽 끝 맞춤)
//   ④ 두 숫자는 절대 겹치지 않음
//   그 밖(지시서에 없는 경우, 판단): 어제 숫자가 왼쪽에 들어갈 자리가 없으면(월초 2일 등) 그래프 왼쪽 위에 두 줄(왼쪽 끝 맞춤)

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
  today: LabelSize | null;
  /** 막대와 숫자 사이(px), 기본 4 */
  pad?: number;
}

export type LabelHow = "above" | "side" | "stack";

export interface PlacedLabel {
  x: number;
  y: number;
  w: number;
  h: number;
  how: LabelHow;
}

export interface ChartLabelLayout {
  mode: "free" | "stack-right" | "stack-left";
  yesterday: PlacedLabel | null;
  today: PlacedLabel | null;
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

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function fitsX(l: PlacedLabel, chartW: number): boolean {
  return l.x >= 0 && l.x + l.w <= chartW + 0.01;
}

/** 두 상자가 겹치는가(맞닿는 것은 겹침이 아님) */
export function labelsOverlap(a: PlacedLabel | null, b: PlacedLabel | null): boolean {
  if (!a || !b) return false;
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function stack(input: ChartLabelInput, side: "right" | "left"): ChartLabelLayout {
  const { chartW, yesterday, today } = input;
  let y = 0;
  const place = (s: LabelSize | null): PlacedLabel | null => {
    if (!s) return null;
    const p: PlacedLabel = { x: side === "right" ? chartW - s.w : 0, y, w: s.w, h: s.h, how: "stack" };
    y += s.h;
    return p;
  };
  const yl = place(yesterday);
  const tl = place(today);
  return { mode: side === "right" ? "stack-right" : "stack-left", yesterday: yl, today: tl };
}

export function placeChartLabels(input: ChartLabelInput): ChartLabelLayout {
  const { chartW, chartH, days, gap, todayIdx, yesterdayBarH, todayBarH } = input;
  const pad = input.pad === undefined ? 4 : input.pad;
  // 1일에는 어제 막대가 이 달에 없음
  const yesterday = todayIdx >= 1 ? input.yesterday : null;
  const today = input.today;
  if (!yesterday && !today) return { mode: "free", yesterday: null, today: null };

  let yl: PlacedLabel | null = null;
  if (yesterday) {
    const bar = barSpan(chartW, days, gap, todayIdx - 1);
    const aboveY = chartH - yesterdayBarH - pad - yesterday.h;
    yl = aboveY >= 0
      ? { x: bar.right - yesterday.w, y: aboveY, w: yesterday.w, h: yesterday.h, how: "above" }
      : { x: bar.left - pad - yesterday.w, y: clamp(chartH - yesterdayBarH, 0, chartH - yesterday.h), w: yesterday.w, h: yesterday.h, how: "side" };
  }
  let tl: PlacedLabel | null = null;
  if (today) {
    const bar = barSpan(chartW, days, gap, todayIdx);
    const aboveY = chartH - todayBarH - pad - today.h;
    tl = aboveY >= 0
      ? { x: bar.left, y: aboveY, w: today.w, h: today.h, how: "above" }
      : { x: bar.right + pad, y: clamp(chartH - todayBarH, 0, chartH - today.h), w: today.w, h: today.h, how: "side" };
  }

  const sizes = { ...input, yesterday, today };
  // ③ 오늘 숫자가 오른쪽에 들어가지 않음 → 오른쪽 위 두 줄
  if (tl && !fitsX(tl, chartW)) return stack(sizes, "right");
  // (판단) 어제 숫자가 왼쪽에 들어가지 않음 → 왼쪽 위 두 줄
  if (yl && !fitsX(yl, chartW)) return stack(sizes, "left");
  // ④ 겹치면 두 줄로(오늘이 달의 뒤쪽이면 오른쪽, 앞쪽이면 왼쪽)
  if (labelsOverlap(yl, tl)) return stack(sizes, todayIdx >= days / 2 ? "right" : "left");
  return { mode: "free", yesterday: yl, today: tl };
}
