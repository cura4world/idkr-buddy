import { describe, it, expect } from "vitest";
import { fitIllust, vbAspect, FitRect, FitInput } from "@/lib/illustFit";

function overlaps(a: FitRect, b: FitRect): boolean {
  return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0;
}

// 390px 폭 카드의 단어 줄과 비슷한 모양: 폭 316, 높이 48, 스피커 38px 가운데
const speaker: FitRect = { l: 278, t: 5, r: 316, b: 43 };
const base = (over: Partial<FitInput>): FitInput => ({
  rowW: 316,
  texts: [],
  buttons: [speaker],
  topLimit: -12,
  bottomLimit: 55,
  h: 66,
  r: 52,
  t: -12,
  aspect: 120 / 72,
  minH: 40,
  ...over,
});

describe("vbAspect", () => {
  it("viewBox 비율을 읽는다", () => {
    expect(vbAspect("0 0 120 72")).toBeCloseTo(120 / 72);
    expect(vbAspect("0 0 64 72")).toBeCloseTo(64 / 72);
    expect(vbAspect("")).toBeCloseTo(120 / 72);
  });
});

describe("fitIllust", () => {
  it("짧은 단어·뜻이면 장면이 정한 자리·크기 그대로", () => {
    const texts = [{ l: 0, t: 1, r: 70, b: 25 }, { l: 0, t: 27, r: 40, b: 44 }];
    const f = fitIllust(base({ texts }))!;
    expect(f).not.toBeNull();
    expect(f.h).toBe(66);
    expect(f.y).toBe(-12);
    expect(f.x + f.w).toBeCloseTo(316 - 52);
  });

  it("긴 뜻이면 줄이거나 옮겨서 글자·스피커와 겹치지 않는다", () => {
    const texts = [{ l: 0, t: 1, r: 40, b: 25 }, { l: 0, t: 27, r: 240, b: 44 }];
    const f = fitIllust(base({ texts }));
    if (f) {
      const box = { l: f.x, t: f.y, r: f.x + f.w, b: f.y + f.h };
      for (const tx of texts) expect(overlaps(box, tx)).toBe(false);
      expect(overlaps(box, speaker)).toBe(false);
      expect(f.h).toBeGreaterThanOrEqual(40);
      expect(box.t).toBeGreaterThanOrEqual(-12);
      expect(box.b).toBeLessThanOrEqual(55);
    }
  });

  it("빈칸이 최소 높이보다 작으면 숨긴다", () => {
    const texts = [{ l: 0, t: 1, r: 270, b: 25 }, { l: 0, t: 27, r: 270, b: 44 }];
    expect(fitIllust(base({ texts }))).toBeNull();
  });

  it("뜻 두 줄 + 짧은 단어: 단어 옆 위쪽 빈칸에 들어간다", () => {
    const texts = [{ l: 0, t: 1, r: 36, b: 27 }, { l: 0, t: 30, r: 250, b: 48 }, { l: 0, t: 50, r: 40, b: 68 }];
    const f = fitIllust(base({ texts, topLimit: -14, bottomLimit: 76 }))!;
    expect(f).not.toBeNull();
    const box = { l: f.x, t: f.y, r: f.x + f.w, b: f.y + f.h };
    for (const tx of texts) expect(overlaps(box, tx)).toBe(false);
    expect(overlaps(box, speaker)).toBe(false);
  });
});
