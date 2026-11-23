// 구독 만료 순간의 재확인 (2026-11-23 내부 테스트 1장)
//   · 만료 시각 + 3초에 다시 확인(시계) / 같은 만료 시각으로는 한 번만 / 실패하면 60초 뒤 한 번만 더
//   · 만료 시각이 지나는 순간 등급 구독자에게 알림(잠긴 화면이 바로 다시 판단)
//   · 강제 재확인은 "한 번만·10분 간격"을 무시 / 최근 유료 계정 판단 / 구독 관리 화면에서 돌아옴
// 시계·타이머·네이티브 통로·서버는 가짜입니다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExpiryWatcher, EXPIRY_DELAY_MS, EXPIRY_RETRY_MS, ExpiryPlan } from "@/lib/planExpiry";

const SESSION_KEY = "kata-public-session";

describe("만료 시계 (planExpiry)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(initial: ExpiryPlan | null, onRecheck?: (plan: { p: ExpiryPlan | null }) => void) {
    const box = { p: initial };
    const reasons: string[] = [];
    const w = createExpiryWatcher({
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      getPlan: () => box.p,
      recheck: async (reason) => {
        reasons.push(reason);
        if (onRecheck) onRecheck(box);
      },
    });
    return { box, reasons, w };
  }

  it("만료 시각이 미래면 만료 + 3초에 예약된다(그 전에는 부르지 않음)", async () => {
    const until = Date.now() + 5 * 60 * 1000;
    const { reasons, w } = setup({ tier: "plus", until }, (b) => {
      b.p = { tier: "plus", until: until + 5 * 60 * 1000 }; // 갱신됨
    });
    w.sync();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + EXPIRY_DELAY_MS - 1);
    expect(reasons).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(reasons).toEqual(["timer"]);
  });

  it("만료 시각이 이미 지난 plus 세션이면 만료 + 3초가 되는 즉시(남은 만큼만 기다려) 다시 확인한다", async () => {
    const { reasons, w } = setup({ tier: "plus", until: Date.now() - 1000 }, (b) => {
      b.p = { tier: "free", until: 0 };
    });
    w.sync();
    await vi.advanceTimersByTimeAsync(1999);
    expect(reasons).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(reasons).toEqual(["timer"]);
  });

  it("만료 + 3초도 이미 지났으면 바로 다시 확인한다", async () => {
    const { reasons, w } = setup({ tier: "plus", until: Date.now() - 60 * 1000 }, (b) => {
      b.p = { tier: "free", until: 0 };
    });
    w.sync();
    await vi.advanceTimersByTimeAsync(0);
    expect(reasons).toEqual(["timer"]);
  });

  it("같은 만료 시각으로는 한 번만 — sync 를 여러 번 불러도 다시 걸지 않는다", async () => {
    const until = Date.now() + 1000;
    const { reasons, w } = setup({ tier: "plus", until }, (b) => {
      b.p = { tier: "free", until: 0 };
    });
    w.sync();
    w.sync();
    await vi.advanceTimersByTimeAsync(1000 + EXPIRY_DELAY_MS);
    // 다시 확인한 뒤 세션이 무료로 바뀌고, 나중에 예전 plan 이 다시 저장돼도(같은 until) 또 부르지 않음
    w.sync();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(reasons).toEqual(["timer"]);
  });

  it("다시 확인해도 서버가 아직 갱신을 못 받았으면 60초 뒤 한 번만 더 하고 멈춘다(무한 반복 없음)", async () => {
    const until = Date.now() + 1000;
    const { reasons, w } = setup({ tier: "plus", until }); // plan 이 바뀌지 않음
    w.sync();
    await vi.advanceTimersByTimeAsync(1000 + EXPIRY_DELAY_MS);
    expect(reasons).toEqual(["timer"]);
    w.sync(); // refreshMe 가 같은 세션을 다시 저장해도 재시도 타이머를 지우지 않음
    await vi.advanceTimersByTimeAsync(EXPIRY_RETRY_MS);
    expect(reasons).toEqual(["timer", "timer-retry"]);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(reasons).toEqual(["timer", "timer-retry"]);
  });

  it("갱신으로 만료 시각이 바뀌면 새 만료 시각에 다시 건다", async () => {
    const until1 = Date.now() + 1000;
    const until2 = until1 + 5 * 60 * 1000;
    const { box, reasons, w } = setup({ tier: "plus", until: until1 }, (b) => {
      b.p = { tier: "plus", until: until2 };
    });
    w.sync();
    await vi.advanceTimersByTimeAsync(1000 + EXPIRY_DELAY_MS);
    expect(box.p && box.p.until).toBe(until2);
    w.sync(); // 세션이 바뀌었다는 알림
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(reasons).toEqual(["timer", "timer"]);
  });

  it("약 24.8일을 넘는 만료 시각(연간 구독)은 타이머를 걸지 않는다", async () => {
    const { reasons, w } = setup({ tier: "plus", until: Date.now() + 30 * 24 * 3600 * 1000 });
    w.sync();
    await vi.advanceTimersByTimeAsync(2147483647);
    expect(reasons).toEqual([]);
  });

  it("무료·special·관리자는 걸지 않는다", async () => {
    for (const p of [{ tier: "free", until: 0 }, { tier: "special", until: Date.now() + 1000 }, { tier: "admin", until: 0 }]) {
      const { reasons, w } = setup(p);
      w.sync();
      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(reasons).toEqual([]);
    }
  });
});

describe("만료 순간의 등급 알림 (plan.ts)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete (window as unknown as { KataStore?: unknown }).KataStore;
  });

  it("만료 시각이 지나는 순간 onTierChange 구독자가 불리고, 그때 등급은 무료다", async () => {
    vi.resetModules();
    (window as unknown as { KataStore: unknown }).KataStore = {};
    const until = Date.now() + 2000;
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: "t", user: { id: "g_1", email: "", name: "A", picture: "" },
      plan: { tier: "plus", until }, accountId: "a", savedAt: Date.now(),
    }));
    const plan = await import("@/lib/plan");
    const platform = await import("@/lib/platform");
    if (!platform.isStoreApp()) return; // 스토어 판정 방식이 바뀌면 이 시험은 건너뜀(아래 기대가 무의미)
    const seen: string[] = [];
    plan.onTierChange(() => seen.push(plan.getTier()));
    expect(plan.getTier()).toBe("plus");
    await vi.advanceTimersByTimeAsync(2100);
    expect(seen).toEqual(["free"]);
  });
});

describe("강제 재확인·최근 유료·구독 관리에서 돌아옴 (billing.ts)", () => {
  const FUTURE = Date.now() + 30 * 24 * 3600 * 1000;
  const BOUGHT = { productId: "plus", purchaseToken: "tok-1", orderId: "o1", acknowledged: true, state: "PURCHASED" };

  function saveSession(plan: { tier: string; until: number }): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: "sess-token", user: { id: "g_1", email: "", name: "A", picture: "" },
      plan, accountId: "acc-1", savedAt: Date.now(),
    }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    delete (window as unknown as { KataBilling?: unknown }).KataBilling;
  });

  it("최근 유료 판단: plus·trial 이고 만료 시각이 지났을 때만", async () => {
    vi.resetModules();
    const b = await import("@/lib/billing");
    const now = Date.now();
    expect(b.isLapsedPaidPlan({ tier: "plus", until: now - 1 }, now)).toBe(true);
    expect(b.isLapsedPaidPlan({ tier: "trial", until: now - 1 }, now)).toBe(true);
    expect(b.isLapsedPaidPlan({ tier: "plus", until: now + 1 }, now)).toBe(false);
    expect(b.isLapsedPaidPlan({ tier: "free", until: 0 }, now)).toBe(false);
    expect(b.isLapsedPaidPlan({ tier: "special", until: now - 1 }, now)).toBe(false);
    expect(b.isLapsedPaidPlan({ tier: "review", until: now - 1 } as never, now)).toBe(false);
    expect(b.isLapsedPaidPlan(null, now)).toBe(false);
  });

  it("조용한 재확인은 한 번 끝나면 다시 하지 않지만, force 면 바로 다시 Play·서버에 묻는다", async () => {
    vi.resetModules();
    saveSession({ tier: "plus", until: Date.now() - 1000 });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ valid: true, plan: { tier: "plus", until: FUTURE } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const b = await import("@/lib/billing");
    let restores = 0;
    (window as unknown as { KataBilling: unknown }).KataBilling = {
      restore: () => {
        restores++;
        setTimeout(() => (window as unknown as { __kataBillingEvent: (e: unknown) => void }).__kataBillingEvent({ type: "owned", purchases: [BOUGHT] }), 0);
      },
    };
    const p1 = b.autoRestoreOnce(false);
    await vi.advanceTimersByTimeAsync(10);
    await p1;
    expect(restores).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 같은 계정 — 일반 호출은 건너뜀(이미 끝냄)
    await b.autoRestoreOnce(true);
    expect(restores).toBe(1);

    // 강제 — 10분이 안 지났어도 바로
    const p2 = b.autoRestoreOnce(true, { force: true, reason: "timer" });
    await vi.advanceTimersByTimeAsync(10);
    await p2;
    expect(restores).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("구독 관리 화면을 열고 30분 안에 돌아오면 한 번만 '돌아옴'으로 본다", async () => {
    vi.resetModules();
    const b = await import("@/lib/billing");
    expect(b.takeManageReturn()).toBe(false);
    b.manageSubscription();
    expect(b.takeManageReturn(Date.now() + 60 * 1000)).toBe(true);
    expect(b.takeManageReturn(Date.now() + 60 * 1000)).toBe(false); // 한 번 읽으면 지움
    b.manageSubscription();
    expect(b.takeManageReturn(Date.now() + 31 * 60 * 1000)).toBe(false);
  });
});
