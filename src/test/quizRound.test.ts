import { describe, it, expect } from "vitest";
import { pickRoundWords, QUIZ_ROUND_MAX } from "@/lib/quizRound";

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

describe("퀴즈 한 판 단어 고르기", () => {
  it("한 판은 20문제", () => {
    expect(QUIZ_ROUND_MAX).toBe(20);
  });

  it("71개 단어장 → 20문제, 중복 없음, 모두 단어장 안의 단어", () => {
    const all = range(71);
    for (const random of [false, true]) {
      const got = pickRoundWords(all, random);
      expect(got.length).toBe(20);
      expect(new Set(got).size).toBe(20);
      for (const w of got) expect(all).toContain(w);
    }
  });

  it("랜덤이 꺼져 있으면 뽑힌 단어를 단어장 순서대로", () => {
    const got = pickRoundWords(range(71), false);
    const sorted = got.slice().sort((a, b) => a - b);
    expect(got).toEqual(sorted);
  });

  it("단어장 전체에서 뽑는다 (앞 20개에 고정되지 않음)", () => {
    let maxSeen = 0;
    for (let k = 0; k < 20; k++) maxSeen = Math.max(maxSeen, ...pickRoundWords(range(71), false));
    expect(maxSeen).toBeGreaterThan(19);
  });

  it("20개 이하는 예전과 같다 — 꺼져 있으면 전부 단어장 순서", () => {
    expect(pickRoundWords(range(12), false)).toEqual(range(12));
    expect(pickRoundWords(range(20), false)).toEqual(range(20));
    const r = pickRoundWords(range(12), true);
    expect(r.slice().sort((a, b) => a - b)).toEqual(range(12));
  });

  it("원본 배열은 바뀌지 않는다", () => {
    const all = range(30);
    pickRoundWords(all, true);
    expect(all).toEqual(range(30));
  });

  it("빈 단어장은 빈 판", () => {
    expect(pickRoundWords([], true)).toEqual([]);
  });
});
