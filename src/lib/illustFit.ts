// src/lib/illustFit.ts
// 단어 카드 색연필 그림의 자리 정하기 (QA Q02). 화면을 읽지 않는 순수 계산만 둡니다.
//
// 좌표는 모두 "단어 줄"(그림이 들어 있는 position: relative 상자)의 왼쪽 위가 (0, 0) 인 px 입니다.
// 글자는 왼쪽 정렬이라, 어떤 높이 구간 [y0, y1] 에서 그림이 들어갈 수 있는 왼쪽 끝은
// 그 구간에 걸친 글자 줄들의 오른쪽 끝 중 가장 먼 곳입니다. 오른쪽 끝은 그 구간에 걸친
// 버튼(스피커)의 왼쪽 끝입니다. 그 사이에 그림 폭이 들어가는 가장 큰 높이를 찾습니다.
//
// 우선순위: ① 장면이 정한 높이 h (클수록 좋음) ② 장면이 정한 위치 t 에 가까움
//           ③ 장면이 정한 오른쪽 여백 r 에 가까움. 최소 높이보다 작아야 들어가면 그리지 않습니다.

export interface FitRect {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface FitInput {
  /** 단어 줄 폭 */
  rowW: number;
  /** 글자 줄 하나하나의 상자 (단어·뜻이 여러 줄이면 줄마다) */
  texts: FitRect[];
  /** 버튼 상자 (스피커 등) */
  buttons: FitRect[];
  /** 그림 위쪽 한계 (보통 카드 위 끝, 음수) */
  topLimit: number;
  /** 그림 아래쪽 한계 (보통 예문 상자 위 끝) */
  bottomLimit: number;
  /** 장면이 원하는 높이 */
  h: number;
  /** 장면이 원하는 줄 오른쪽 끝 ~ 그림 오른쪽 끝 */
  r: number;
  /** 장면이 원하는 줄 위 ~ 그림 위 */
  t: number;
  /** 폭 / 높이 (viewBox 비율) */
  aspect: number;
  /** 이보다 작게 줄여야 들어가면 숨김 */
  minH: number;
  /** 글자와 띄울 거리 */
  textPad?: number;
  /** 버튼과 띄울 거리 */
  buttonGap?: number;
}

export interface FitResult {
  x: number;
  y: number;
  h: number;
  w: number;
}

export const ILLUST_MIN_H = 40;

/** viewBox "minX minY w h" → 폭/높이. 읽을 수 없으면 5:3 */
export function vbAspect(vb: string | undefined): number {
  const parts = String(vb || "").trim().split(new RegExp("[\\s,]+")).map(Number);
  if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return parts[2] / parts[3];
  return 120 / 72;
}

export function fitIllust(inp: FitInput): FitResult | null {
  const pad = typeof inp.textPad === "number" ? inp.textPad : 3;
  const gap = typeof inp.buttonGap === "number" ? inp.buttonGap : 4;
  const aspect = inp.aspect > 0 ? inp.aspect : 120 / 72;
  const top = Math.ceil(inp.topLimit);
  const bottom = Math.floor(inp.bottomLimit);
  const prefRight = inp.rowW - inp.r;
  const maxH = Math.min(inp.h, bottom - top);
  const minH = Math.max(1, inp.minH);
  if (!(maxH >= minH) || !(inp.rowW > 0)) return null;

  const leftAt = (y0: number, y1: number): number => {
    let lb = 0;
    for (const tx of inp.texts) {
      if (tx.t - pad < y1 && tx.b + pad > y0 && tx.r + pad > lb) lb = tx.r + pad;
    }
    return lb;
  };
  const rightAt = (y0: number, y1: number): number => {
    let rb = inp.rowW;
    for (const bt of inp.buttons) {
      if (bt.t - gap < y1 && bt.b + gap > y0 && bt.l - gap < rb) rb = bt.l - gap;
    }
    return rb;
  };

  for (let hs = Math.floor(maxH); hs >= minH; hs--) {
    const ws = hs * aspect;
    let best: FitResult | null = null;
    let bestCost = Infinity;
    for (let y = top; y + hs <= bottom; y++) {
      const lb = leftAt(y, y + hs);
      const rb = rightAt(y, y + hs);
      if (rb - lb < ws) continue;
      const right = Math.min(rb, Math.max(lb + ws, prefRight));
      const cost = Math.abs(y - inp.t) + Math.abs(right - prefRight) * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        best = { x: right - ws, y, h: hs, w: ws };
      }
    }
    if (best) return best;
  }
  return null;
}
