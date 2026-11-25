// src/lib/usageIdle.ts
// 공부 시간 판단 — 이번 조각 가운데 얼마를 "공부 시간"으로 셀까 (순수 함수, 2026-11-25 Arga 승인 ⓪).
//
// 예전에는 화면이 보이기만 하면 모두 셌습니다. 폰이 USB 에 꽂혀 화면이 꺼지지 않는 동안 하루 15시간 16분이 잡힌 일이 있어,
// 손을 안 대면 세지 않게 했습니다. 규칙:
//   · 화면이 보이지 않으면(백그라운드·화면 꺼짐) 0
//   · 조각이 MAX_GAP_MS 보다 길면(절전·시간 점프) 0 — 예전 규칙 그대로
//   · 지금 앱 안에서 음성이 나오고 있으면 조각 전체 — 이야기·회화·설교문·성경 낭독은 손을 안 대고 듣기 때문
//   · 그 밖에는 마지막 활동(손 입력·음성) 뒤 IDLE_LIMIT_MS 까지만. 조각 안에서 일부만 활동이 있었으면 그 부분까지만
// usageTimer.ts 가 부릅니다. 저장소를 쓰지 않습니다(마지막 활동 시각은 메모리 변수).

export const IDLE_LIMIT_MS = 3 * 60 * 1000;
export const MAX_GAP_MS = 90 * 1000;

export interface UsageSlice {
  from: number; // 조각 시작(ms)
  to: number; // 조각 끝(ms)
  lastActivity: number; // 마지막 손 입력 또는 음성 재생이 확인된 시각(ms)
  audioNow: boolean; // 지금 앱 안에서 음성이 나오는 중인가
  visible: boolean; // 화면이 보이는가
}

/** 이 조각에서 공부 시간으로 셀 ms (0 이상) */
export function countableUsageMs(s: UsageSlice): number {
  const gap = s.to - s.from;
  if (!s.visible) return 0;
  if (!(gap > 0) || gap > MAX_GAP_MS) return 0;
  if (s.audioNow) return gap;
  const until = Math.min(s.to, s.lastActivity + IDLE_LIMIT_MS);
  return Math.max(0, until - s.from);
}
