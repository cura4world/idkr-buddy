// 훈장 불꽃(Api) 주간 집계 — 2026-11-24 부터 월~일, 주일도 보통 날
//   · 일요일에도 점수가 쌓인다
//   · 일요일에 공부하지 않으면 연속 기록이 끊긴다
//   · 월요일에 주간 점수가 0 부터 다시 시작한다
import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { computeStreak, countMonthStars, dateKey, lastWeekPoints, medaliEngine } from "@/lib/medali";
import type { WordRecord } from "@/lib/medali";

// 2026-11-16(월) ~ 2026-11-22(일) 이 한 주, 2026-11-23 이 다음 월요일
const SUN = new Date(2026, 10, 22, 15, 0, 0);
const MON = new Date(2026, 10, 23, 9, 0, 0);
const TUE = new Date(2026, 10, 24, 9, 0, 0);

const day = (y: number, m: number, d: number) => dateKey(new Date(y, m, d));

describe("불꽃 주간 집계 (월~일)", () => {
  beforeAll(() => {
    // IndexedDB 흉내(fake-indexeddb)가 타이머를 쓰므로 날짜만 고정합니다
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("일요일에도 점수가 쌓이고 그 주 점수에 들어간다", async () => {
    vi.setSystemTime(SUN);
    const gain = await medaliEngine.addPoints("game", 3);
    expect(gain).toBe(3);
    expect(medaliEngine.getState().apiWeekPoints).toBe(3);
  });

  it("일요일에도 하루 상한은 그대로다 (게임 15점)", async () => {
    vi.setSystemTime(SUN);
    await medaliEngine.addPoints("game", 10);
    const over = await medaliEngine.addPoints("game", 10);
    expect(over).toBe(2); // 3 + 10 + 2 = 15
    expect(medaliEngine.getState().apiWeekPoints).toBe(15);
  });

  it("월요일이 되면 주간 점수가 0 부터 다시 시작한다", async () => {
    vi.setSystemTime(MON);
    await medaliEngine.refresh();
    expect(medaliEngine.getState().apiWeekPoints).toBe(0);
    await medaliEngine.addPoints("quiz", 5);
    expect(medaliEngine.getState().apiWeekPoints).toBe(5);
    // 일요일 + 월요일 연속 2일
    expect(medaliEngine.getState().streak).toBe(2);
  });

  // 쌓인 기록: 11-22(일) 게임 15점, 11-23(월) 퀴즈 5점
  it("지난주는 같은 기간만 — 화요일이면 지난주 월·화까지(일요일 점수는 아직 안 들어감)", async () => {
    vi.setSystemTime(TUE);
    const lw = await lastWeekPoints(TUE); // 11-24(화) → 지난주 11-16(월) ~ 11-17(화)
    expect(lw).toEqual({ hasHistory: true, points: 0 });
  });

  it("일요일이면 지난주 월~일 전체(일요일 포함)", async () => {
    const lw = await lastWeekPoints(new Date(2026, 10, 29, 20, 0, 0)); // 11-29(일) → 지난주 11-16 ~ 11-22
    expect(lw).toEqual({ hasHistory: true, points: 15 });
  });

  it("월요일엔 월요일끼리", async () => {
    const lw = await lastWeekPoints(new Date(2026, 10, 30, 9, 0, 0)); // 11-30(월) → 지난주 11-23(월) 하루
    expect(lw).toEqual({ hasHistory: true, points: 5 });
  });

  it("이번 주 월요일보다 앞선 기록이 없으면 첫 주로 본다", async () => {
    const lw = await lastWeekPoints(new Date(2026, 10, 18, 9, 0, 0)); // 11-18(수) 기준 — 그 전 기록 없음
    expect(lw.hasHistory).toBe(false);
  });
});

describe("이번 달 별 — 처음 외운 단어만", () => {
  const now = new Date(2026, 10, 24, 9, 0, 0);
  const t = (m: number, d: number) => new Date(2026, m, d, 12, 0, 0).getTime();
  const base = { corrects: 2, firstCorrectAt: 0, lastCorrectAt: 0, source: "seed" };

  it("이번 달에 처음 외운 단어를 세고, 다시 확인을 통과한 복귀는 빼며, 예전 기록은 확정 시각으로 센다", () => {
    const words: WordRecord[] = [
      { ...base, word: "a", status: "confirmed", confirmedAt: t(10, 5), firstConfirmedAt: t(10, 5) },   // 이번 달 처음 → 셈
      { ...base, word: "b", status: "confirmed", confirmedAt: t(10, 20), firstConfirmedAt: t(8, 1) },   // 복귀 → 뺌
      { ...base, word: "c", status: "recheck", confirmedAt: t(10, 2) },                                 // 예전 기록 → 확정 시각으로 셈
      { ...base, word: "d", status: "pending", firstConfirmedAt: t(10, 3) },                            // 별이 아님 → 뺌
      { ...base, word: "e", status: "confirmed", confirmedAt: t(9, 30), firstConfirmedAt: t(9, 30) },   // 지난달 → 뺌
    ];
    expect(countMonthStars(words, now)).toBe(2);
  });
});

describe("연속 기록 — 일요일도 보통 날", () => {
  it("일요일에 공부하지 않으면 연속 기록이 끊긴다", () => {
    // 금·토 공부, 일요일 쉼, 월·화 공부 → 화요일 기준 2일
    const scored = new Set([day(2026, 10, 20), day(2026, 10, 21), day(2026, 10, 23), day(2026, 10, 24)]);
    expect(computeStreak(scored, TUE)).toBe(2);
  });

  it("일요일까지 공부하면 이어진다", () => {
    const scored = new Set([
      day(2026, 10, 20), day(2026, 10, 21), day(2026, 10, 22), day(2026, 10, 23), day(2026, 10, 24),
    ]);
    expect(computeStreak(scored, TUE)).toBe(5);
  });

  it("오늘 아직 점수가 없으면 어제까지로 센다", () => {
    const scored = new Set([day(2026, 10, 22), day(2026, 10, 23)]);
    expect(computeStreak(scored, TUE)).toBe(2);
  });
});
