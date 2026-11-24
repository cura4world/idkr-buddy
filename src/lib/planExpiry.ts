// src/lib/planExpiry.ts
// 유료 등급(plus·trial)의 만료 시각이 지나는 순간 구독을 다시 확인하는 시계 (2026-11-23 내부 테스트 1장 A).
//
// 왜: 앱은 세션의 plan.until > 지금 으로만 등급을 판단합니다. 구독이 갱신돼도 앱을 켜 둔 채로는 서버에 다시 묻지 않아
// until 이 지나는 순간 무료로 보였습니다(S21 내부 테스트, 월간 5분·연간 30분 갱신 테스트 구독에서 재현).
//
//   · until + 3초에 다시 확인합니다(recheck). 10분 간격 같은 다른 제한은 보지 않습니다.
//   · 다시 확인했는데도 until 이 그대로(지남)면 until + 60초, + 3분에 한 번씩 더 하고 멈춥니다 — 무한 반복 금지.
//     모두 갱신 확인 유예(plan.ts RENEW_GRACE_MS 10분) 안이라, 그동안 화면은 Plus 그대로입니다(2026-11-24).
//   · 같은 until 로는 이 한 차례만. setTimeout 최대치(약 24.8일)를 넘는 until 은 걸지 않습니다(화면이 다시 보일 때의 재조회로 충분).
//   · 세션이나 plan 이 바뀌면 sync() 로 다시 맞춥니다.
// 시계·타이머·확인 함수를 밖에서 받아, 가짜 시계로 시험합니다(src/test/planExpiry.test.ts).

/** until 으로부터 다시 확인하는 때(첫 확인 + 재시도 두 번) */
export const RECHECK_OFFSETS_MS = [3000, 60 * 1000, 3 * 60 * 1000];
export const EXPIRY_DELAY_MS = RECHECK_OFFSETS_MS[0];
/** setTimeout 이 받을 수 있는 가장 긴 시간(2^31 - 1 ms ≈ 24.8일) */
export const MAX_TIMER_MS = 2147483647;

export interface ExpiryPlan {
  tier: string;
  until: number;
}

export interface ExpiryDeps {
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (h: unknown) => void;
  /** 지금 세션의 plan (세션이 없으면 null) */
  getPlan: () => ExpiryPlan | null;
  /** 구독을 다시 확인합니다. reason 은 첫 확인("timer")인지 재시도("timer-retry")인지 — 시험에서 횟수를 셉니다 */
  recheck: (reason: string) => Promise<void>;
}

export interface ExpiryWatcher {
  /** 세션·plan 이 바뀌었을 때(그리고 처음에) 부릅니다. */
  sync: () => void;
  stop: () => void;
}

function isPaidTier(p: ExpiryPlan | null): p is ExpiryPlan {
  return !!p && (p.tier === "plus" || p.tier === "trial") && typeof p.until === "number" && p.until > 0;
}

export function createExpiryWatcher(deps: ExpiryDeps): ExpiryWatcher {
  let timer: unknown = null;
  /** 지금 맡고 있는 until (기다리는 중이거나, 확인·재시도 중) */
  let activeUntil = 0;
  /** 이미 강제로 다시 확인한 until — 같은 until 로는 다시 걸지 않습니다 */
  let doneUntil = 0;
  let stopped = false;

  const clear = () => {
    if (timer !== null) {
      try { deps.clearTimer(timer); } catch (e) {}
      timer = null;
    }
  };

  const fire = (until: number, attempt: number) => {
    timer = null;
    if (stopped) return;
    doneUntil = until;
    deps.recheck(attempt === 0 ? "timer" : "timer-retry")
      .catch(() => {})
      .then(() => {
        if (stopped || activeUntil !== until) return; // 그사이 plan 이 바뀜 → sync 가 새로 맡음
        const p = deps.getPlan();
        const still = isPaidTier(p) && p.until === until && until <= deps.now();
        const next = attempt + 1;
        if (still && next < RECHECK_OFFSETS_MS.length) {
          // 서버가 아직 갱신을 못 받음 — 다음 정해진 때(until + 60초, + 3분)에 한 번 더
          timer = deps.setTimer(() => fire(until, next), Math.max(0, until + RECHECK_OFFSETS_MS[next] - deps.now()));
        } else {
          activeUntil = 0;
        }
      });
  };

  const sync = () => {
    if (stopped) return;
    const p = deps.getPlan();
    if (!isPaidTier(p)) {
      clear();
      activeUntil = 0;
      return;
    }
    const until = p.until;
    if (until === activeUntil) return; // 이미 맡고 있음(기다리는 중·재시도 중) — 같은 세션 저장으로 다시 불려도 그대로
    if (until === doneUntil) return; // 이 until 로는 이미 다시 확인함
    clear();
    const wait = until + EXPIRY_DELAY_MS - deps.now();
    if (wait > MAX_TIMER_MS) {
      activeUntil = 0;
      return;
    }
    activeUntil = until;
    timer = deps.setTimer(() => fire(until, 0), Math.max(0, wait));
  };

  const stop = () => {
    stopped = true;
    clear();
  };

  return { sync, stop };
}
