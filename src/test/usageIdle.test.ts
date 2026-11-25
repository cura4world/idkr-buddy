// 공부 시간 판단(usageIdle.countableUsageMs) — 손을 안 대면 세지 않기(2026-11-25 ⓪)
import { describe, it, expect } from "vitest";
import { countableUsageMs, IDLE_LIMIT_MS, MAX_GAP_MS } from "@/lib/usageIdle";

const MIN = 60 * 1000;
const T = 1_000_000_000;

describe("countableUsageMs", () => {
  it("방금 손을 댔으면 1분 조각 전체", () => {
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: T + 30_000, audioNow: false, visible: true })).toBe(MIN);
  });

  it("입력 없음 3분 초과 → 0", () => {
    const last = T - IDLE_LIMIT_MS - 1;
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: last, audioNow: false, visible: true })).toBe(0);
  });

  it("조각 안에서 3분이 끝나면 그때까지만", () => {
    // 마지막 입력이 2분 30초 전 → 조각 시작부터 30초만
    const last = T - 150_000;
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: last, audioNow: false, visible: true })).toBe(30_000);
  });

  it("음성 재생 중이면 손을 안 대도 조각 전체", () => {
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: T - 60 * MIN, audioNow: true, visible: true })).toBe(MIN);
  });

  it("백그라운드(화면 안 보임) → 0, 음성이 나와도 0", () => {
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: T + MIN, audioNow: false, visible: false })).toBe(0);
    expect(countableUsageMs({ from: T, to: T + MIN, lastActivity: T + MIN, audioNow: true, visible: false })).toBe(0);
  });

  it("조각이 90초를 넘으면(절전·시간 점프) 0 — 예전 규칙 그대로", () => {
    expect(countableUsageMs({ from: T, to: T + MAX_GAP_MS + 1, lastActivity: T + MAX_GAP_MS, audioNow: true, visible: true })).toBe(0);
    expect(countableUsageMs({ from: T, to: T + MAX_GAP_MS, lastActivity: T, audioNow: false, visible: true })).toBe(MAX_GAP_MS);
  });

  it("시간이 거꾸로 가거나 0이면 0", () => {
    expect(countableUsageMs({ from: T, to: T, lastActivity: T, audioNow: true, visible: true })).toBe(0);
    expect(countableUsageMs({ from: T, to: T - 1000, lastActivity: T, audioNow: false, visible: true })).toBe(0);
  });

  it("화면만 켜 두고 손을 안 대면 하루를 켜 둬도 처음 3분만 쌓임", () => {
    let total = 0;
    const last = T; // 켠 순간 한 번 입력
    for (let i = 0; i < 15 * 60; i++) {
      total += countableUsageMs({ from: T + i * MIN, to: T + (i + 1) * MIN, lastActivity: last, audioNow: false, visible: true });
    }
    expect(total).toBe(IDLE_LIMIT_MS);
  });
});
