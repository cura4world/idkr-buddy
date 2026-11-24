// 구독 만료 순간의 재확인 (2026-11-23 내부 테스트 1장, 2026-11-24 갱신 확인 유예)
//   · 만료 시각 + 3초에 다시 확인(시계) / 같은 만료 시각으로는 한 차례만 / 서버가 아직이면 만료 + 60초·+ 3분에 한 번씩 더
//   · 만료 시각이 막 지나도 유예 10분 동안은 Plus, 서버가 무료로 답하면 바로 무료, 유예가 끝나면 무료(그때 구독자에게 알림)
//   · 강제 재확인은 "한 번만·10분 간격"을 무시 / 최근 유료 계정 판단 / 구독 관리 화면에서 돌아옴
// 시계·타이머·네이티브 통로·서버는 가짜입니다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExpiryWatcher, EXPIRY_DELAY_MS, RECHECK_OFFSETS_MS, ExpiryPlan } from "@/lib/planExpiry";

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

  it("다시 확인해도 서버가 아직 갱신을 못 받았으면 만료 + 60초·+ 3분에 한 번씩 더 하고 멈춘다(무한 반복 없음)", async () => {
    expect(RECHECK_OFFSETS_MS).toEqual([3000, 60 * 1000, 3 * 60 * 1000]);
    const until = Date.now() + 1000;
    const { reasons, w } = setup({ tier: "plus", until }); // plan 이 바뀌지 않음
    w.sync();
    await vi.advanceTimersByTimeAsync(1000 + EXPIRY_DELAY_MS);
    expect(reasons).toEqual(["timer"]);
    w.sync(); // refreshMe 가 같은 세션을 다시 저장해도 재시도 타이머를 지우지 않음
    await vi.advanceTimersByTimeAsync(60 * 1000 - EXPIRY_DELAY_MS - 1); // 만료 + 60초 직전
    expect(reasons).toEqual(["timer"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(reasons).toEqual(["timer", "timer-retry"]);
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000); // 만료 + 3분
    expect(reasons).toEqual(["timer", "timer-retry", "timer-retry"]);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(reasons).toEqual(["timer", "timer-retry", "timer-retry"]);
  });

  it("첫 재시도에서 갱신이 확인되면 그 뒤 재시도는 하지 않는다", async () => {
    const until = Date.now() + 1000;
    let n = 0;
    const { reasons, w } = setup({ tier: "plus", until }, (b) => {
      n++;
      if (n === 2) b.p = { tier: "plus", until: until + 30 * 24 * 3600 * 1000 }; // 두 번째 확인 때 갱신됨
    });
    w.sync();
    await vi.advanceTimersByTimeAsync(1000 + 60 * 1000);
    expect(reasons).toEqual(["timer", "timer-retry"]);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
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

  function saveStoreSession(plan: { tier: string; until: number }): void {
    (window as unknown as { KataStore: unknown }).KataStore = {};
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: "t", user: { id: "g_1", email: "", name: "A", picture: "" },
      plan, accountId: "a", savedAt: Date.now(),
    }));
  }

  it("만료 시각이 막 지나도 갱신 확인 유예(10분) 동안은 Plus, 유예가 끝나는 순간 구독자가 불리고 무료다", async () => {
    vi.resetModules();
    const until = Date.now() + 2000;
    saveStoreSession({ tier: "plus", until });
    const plan = await import("@/lib/plan");
    const platform = await import("@/lib/platform");
    if (!platform.isStoreApp()) return; // 스토어 판정 방식이 바뀌면 이 시험은 건너뜀(아래 기대가 무의미)
    expect(plan.RENEW_GRACE_MS).toBe(10 * 60 * 1000);
    const seen: string[] = [];
    plan.onTierChange(() => seen.push(plan.getTier()));
    expect(plan.getTier()).toBe("plus");
    await vi.advanceTimersByTimeAsync(2100); // 만료 직후
    expect(plan.getTier()).toBe("plus");
    expect(seen).toEqual([]); // 만료 순간에 잠그지 않음
    await vi.advanceTimersByTimeAsync(plan.RENEW_GRACE_MS); // 유예 끝
    expect(seen).toEqual(["free"]);
    expect(plan.getTier()).toBe("free");
  });

  it("유예 중에 서버가 무료로 답하면(세션 plan 이 free) 유예 없이 바로 무료", async () => {
    vi.resetModules();
    saveStoreSession({ tier: "plus", until: Date.now() - 5000 });
    const plan = await import("@/lib/plan");
    const account = await import("@/lib/account");
    const platform = await import("@/lib/platform");
    if (!platform.isStoreApp()) return;
    expect(plan.getTier()).toBe("plus"); // 유예 중
    const seen: string[] = [];
    plan.onTierChange(() => seen.push(plan.getTier()));
    account.updateSessionPlan({ tier: "free", until: 0 } as never);
    expect(plan.getTier()).toBe("free");
    expect(seen[seen.length - 1]).toBe("free");
  });

  it("유예 중에 서버가 갱신된 만료 시각을 주면 Plus 그대로", async () => {
    vi.resetModules();
    saveStoreSession({ tier: "plus", until: Date.now() - 5000 });
    const plan = await import("@/lib/plan");
    const account = await import("@/lib/account");
    const platform = await import("@/lib/platform");
    if (!platform.isStoreApp()) return;
    account.updateSessionPlan({ tier: "plus", until: Date.now() + 5 * 60 * 1000 } as never);
    expect(plan.getTier()).toBe("plus");
  });

  it("유예는 막 만료된 유료 플랜에만 — special·심사용·관리자는 만료 시각이 지나면 그대로 무료", async () => {
    vi.resetModules();
    const plan = await import("@/lib/plan");
    const now = Date.now();
    expect(plan.inRenewGrace({ tier: "plus", until: now - 1 }, now)).toBe(true);
    expect(plan.inRenewGrace({ tier: "trial", until: now - 1 }, now)).toBe(true);
    expect(plan.inRenewGrace({ tier: "plus", until: now - plan.RENEW_GRACE_MS }, now)).toBe(false);
    expect(plan.inRenewGrace({ tier: "plus", until: now + 1000 }, now)).toBe(false); // 아직 이용 중(유예 아님)
    expect(plan.inRenewGrace({ tier: "special", until: now - 1 }, now)).toBe(false);
    expect(plan.inRenewGrace({ tier: "review", until: now - 1 }, now)).toBe(false);
    expect(plan.inRenewGrace({ tier: "admin", until: now - 1 }, now)).toBe(false);
    expect(plan.inRenewGrace({ tier: "free", until: 0 }, now)).toBe(false);
    expect(plan.inRenewGrace(null, now)).toBe(false);

    vi.resetModules();
    saveStoreSession({ tier: "special", until: Date.now() - 5000 });
    const plan2 = await import("@/lib/plan");
    const platform = await import("@/lib/platform");
    if (!platform.isStoreApp()) return;
    expect(plan2.getTier()).toBe("free");
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
    // 구독 중으로 보여 줄 플랜 — 이용 중 + 갱신 확인 유예(10분)
    expect(b.isPaidOrRenewingPlan({ tier: "plus", until: now + 1 }, now)).toBe(true);
    expect(b.isPaidOrRenewingPlan({ tier: "plus", until: now - 1 }, now)).toBe(true);
    expect(b.isPaidOrRenewingPlan({ tier: "plus", until: now - 10 * 60 * 1000 }, now)).toBe(false);
    expect(b.isPaidOrRenewingPlan({ tier: "free", until: 0 }, now)).toBe(false);
    expect(b.isPaidOrRenewingPlan(null, now)).toBe(false);
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
    const p2 = b.autoRestoreOnce(true, { force: true });
    await vi.advanceTimersByTimeAsync(10);
    await p2;
    expect(restores).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("공용 강제 재확인: 내 정보(throttle)는 30초에 한 번까지, 시계·복귀(throttle 없음)는 매번", async () => {
    vi.resetModules();
    saveSession({ tier: "plus", until: FUTURE });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ user: { id: "g_1" }, plan: { tier: "plus", until: FUTURE } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const b = await import("@/lib/billing");
    expect(b.RECHECK_GAP_MS).toBe(30 * 1000);
    expect(await b.recheckSubscription({ throttle: true })).toBe(true);
    expect(await b.recheckSubscription({ throttle: true })).toBe(false); // 30초 안 — 건너뜀
    expect(await b.recheckSubscription()).toBe(true); // 시계·화면 복귀 길은 간격을 보지 않음
    vi.setSystemTime(Date.now() + 31 * 1000);
    expect(await b.recheckSubscription({ throttle: true })).toBe(true);
    // 세션이 없으면 하지 않음
    localStorage.clear();
    vi.resetModules();
    const b2 = await import("@/lib/billing");
    expect(await b2.recheckSubscription({ throttle: true })).toBe(false);
  });

  it("결제 전 인터넷 확인: 꺼져 있으면 서버에 묻지 않고 false, 서버가 답하면 true, 실패·시간 초과면 false", async () => {
    vi.resetModules();
    const b = await import("@/lib/billing");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const nav = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(await b.onlineForPurchase()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    nav.mockReturnValue(true);
    expect(await b.onlineForPurchase()).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await b.onlineForPurchase()).toBe(false);
    // 응답이 오지 않으면 3초에 끊음
    vi.stubGlobal("fetch", vi.fn((_u: unknown, init?: { signal?: AbortSignal }) => new Promise((_res, rej) => {
      init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    })));
    const p = b.onlineForPurchase();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toBe(false);
    nav.mockRestore();
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
