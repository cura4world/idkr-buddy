// 결제 직후 서버 검증이 실패했을 때의 앱 쪽 동작을 검사합니다 (2026-11-14 출시 전 점검 B-03·B-05·B-11·B-14).
//   · 결제가 끝난 구매의 검증이 잠깐 실패하면 "확인 중"으로 두고 자동으로 다시 검증 → 성공하면 Plus
//   · 다시 해도 같은 답(다른 계정의 구독)은 재시도하지 않고 그 이유를 돌려줌
//   · "이미 보유(BILLING_7)"는 구매 복원 흐름으로 바로 넘김
//   · 가격·체험 표시는 Play 에서 받은 값만 (연간의 월 환산 = 연 가격 ÷ 12)
// 네이티브 통로(KataBilling)와 서버(fetch)는 가짜입니다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSION_KEY = "kata-public-session";
const VERIFYING_KEY = "kata-billing-verifying";
const FUTURE = Date.now() + 30 * 24 * 3600 * 1000;

const OFFER = {
  productId: "plus", basePlanId: "yearly", offerId: "trial-7d", offerToken: "ot-1",
  formattedPrice: "₩34,800", billingPeriod: "P1Y", freeTrialPeriod: "P7D",
};
const BOUGHT = { productId: "plus", purchaseToken: "tok-1", orderId: "o1", acknowledged: false, state: "PURCHASED" };

type Handlers = { query?: () => void; purchase?: () => void; restore?: () => void };

function installBridge(h: Handlers): void {
  (window as unknown as { KataBilling: unknown }).KataBilling = {
    query: () => h.query && h.query(),
    purchase: () => h.purchase && h.purchase(),
    restore: () => h.restore && h.restore(),
  };
}

function emit(e: unknown): void {
  (window as unknown as { __kataBillingEvent: (e: unknown) => void }).__kataBillingEvent(e);
}

function saveSession(tier = "free"): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: "sess-token", user: { id: "g_1", email: "", name: "A", picture: "" },
    plan: { tier, until: tier === "free" ? 0 : FUTURE }, accountId: "acc-1", savedAt: Date.now(),
  }));
}

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const PLUS_BODY = { valid: true, plan: { tier: "plus", until: FUTURE, productId: "plus" } };

async function loadBilling() {
  vi.resetModules();
  return await import("@/lib/billing");
}

describe("결제 뒤 서버 검증", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    saveSession();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete (window as unknown as { KataBilling?: unknown }).KataBilling;
  });

  it("검증이 잠깐 실패(서버 502)하면 '확인 중' → 자동으로 다시 검증해 Plus 가 된다", async () => {
    const replies = [jsonRes(502, { error: "PLAY_API_FAILED" }), jsonRes(503, { error: "x" }), jsonRes(200, PLUS_BODY)];
    const fetchMock = vi.fn(async () => replies.shift() as Response);
    vi.stubGlobal("fetch", fetchMock);
    const billing = await loadBilling();
    installBridge({ purchase: () => emit({ type: "purchase", purchases: [BOUGHT] }) });
    const events: string[] = [];
    billing.onVerifyEvent((e) => events.push(e.type));

    const r = await billing.purchase(OFFER);
    expect(r.status).toBe("verifying");
    expect(billing.isVerifyingPurchase()).toBe(true);
    expect(localStorage.getItem(VERIFYING_KEY)).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 5초 뒤 첫 재시도(또 실패) → 10초 뒤 두 번째 재시도(성공)
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(billing.isVerifyingPurchase()).toBe(true);
    await vi.advanceTimersByTimeAsync(9000);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 간격이 늘어남 — 아직 10초가 안 됨
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(billing.isVerifyingPurchase()).toBe(false);
    expect(localStorage.getItem(VERIFYING_KEY)).toBeNull();
    expect(events).toEqual(["verifying", "done"]);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY) as string).plan.tier).toBe("plus");

    // 끝난 뒤에는 더 부르지 않음
    await vi.advanceTimersByTimeAsync(600000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("통신이 끊겨도 '확인 중'이고, 화면이 다시 보이면(retryVerifyNow) 기다리지 않고 바로 다시 검증한다", async () => {
    let online = false;
    const fetchMock = vi.fn(async () => {
      if (!online) throw new Error("offline");
      return jsonRes(200, PLUS_BODY);
    });
    vi.stubGlobal("fetch", fetchMock);
    const billing = await loadBilling();
    installBridge({ purchase: () => emit({ type: "purchase", purchases: [BOUGHT] }) });

    const r = await billing.purchase(OFFER);
    expect(r.status).toBe("verifying");
    await vi.advanceTimersByTimeAsync(5000 + 10000 + 20000); // 세 번 재시도 모두 실패
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(billing.isVerifyingPurchase()).toBe(true);

    online = true;
    await vi.advanceTimersByTimeAsync(4100); // 다음 재시도(40초 뒤)를 기다리지 않고
    billing.retryVerifyNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(billing.isVerifyingPurchase()).toBe(false);
  });

  it("다른 계정의 구독(403 ACCOUNT_MISMATCH)은 재시도하지 않고 이유를 돌려준다", async () => {
    const fetchMock = vi.fn(async () => jsonRes(403, { error: "ACCOUNT_MISMATCH" }));
    vi.stubGlobal("fetch", fetchMock);
    const billing = await loadBilling();
    installBridge({ purchase: () => emit({ type: "purchase", purchases: [BOUGHT] }) });
    const r = await billing.purchase(OFFER);
    expect(r).toEqual({ status: "error", code: "ACCOUNT_MISMATCH" });
    expect(billing.isVerifyingPurchase()).toBe(false);
    await vi.advanceTimersByTimeAsync(600000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("'이미 보유(BILLING_7)'는 구매 복원으로 바로 넘어간다", async () => {
    const fetchMock = vi.fn(async () => jsonRes(200, PLUS_BODY));
    vi.stubGlobal("fetch", fetchMock);
    const billing = await loadBilling();
    let restored = 0;
    installBridge({
      purchase: () => emit({ type: "error", code: "BILLING_7" }),
      restore: () => { restored += 1; emit({ type: "owned", purchases: [BOUGHT] }); },
    });
    const r = await billing.purchase(OFFER);
    expect(restored).toBe(1);
    expect(r.status).toBe("plus");
    expect((r as { restored?: boolean }).restored).toBe(true);
  });

  it("'이미 보유'인데 그 구독이 다른 계정 것이면 그 이유를 돌려준다(다시 결제 안내 아님)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes(409, { error: "PURCHASE_OWNED_BY_OTHER" })));
    const billing = await loadBilling();
    installBridge({
      purchase: () => emit({ type: "error", code: "BILLING_7" }),
      restore: () => emit({ type: "owned", purchases: [BOUGHT] }),
    });
    expect(await billing.purchase(OFFER)).toEqual({ status: "error", code: "PURCHASE_OWNED_BY_OTHER" });
  });

  it("구매 복원: 구독 없음 / Play 가 답하지 않음 / 서버가 잠깐 안 됨을 구분한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes(500, { error: "SERVER_ERROR" })));
    const billing = await loadBilling();

    installBridge({ restore: () => emit({ type: "owned", purchases: [] }) });
    expect(await billing.restoreDetailed()).toEqual({ status: "none" });

    installBridge({ restore: () => emit({ type: "error", code: "RESTORE_3" }) });
    expect(await billing.restoreDetailed()).toEqual({ status: "error", code: "RESTORE_FAILED" });

    installBridge({ restore: () => emit({ type: "owned", purchases: [BOUGHT] }) });
    expect((await billing.restoreDetailed()).status).toBe("verifying");
    expect(billing.isVerifyingPurchase()).toBe(true);
  });

  it("페이지가 다시 열려도 '확인 중'을 이어 간다(구매 목록은 Play 에서 다시 받음)", async () => {
    localStorage.setItem(VERIFYING_KEY, String(Date.now() - 60000));
    const fetchMock = vi.fn(async () => jsonRes(200, PLUS_BODY));
    vi.stubGlobal("fetch", fetchMock);
    const billing = await loadBilling();
    installBridge({ restore: () => emit({ type: "owned", purchases: [BOUGHT] }) });
    const events: string[] = [];
    billing.onVerifyEvent((e) => events.push(e.type));
    expect(billing.isVerifyingPurchase()).toBe(true);
    billing.resumeVerifyIfNeeded();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["verifying", "done"]);
    expect(localStorage.getItem(VERIFYING_KEY)).toBeNull();
  });

  it("사흘이 지난 '확인 중' 표시는 버린다", async () => {
    localStorage.setItem(VERIFYING_KEY, String(Date.now() - 4 * 24 * 3600 * 1000));
    const billing = await loadBilling();
    expect(billing.isVerifyingPurchase()).toBe(false);
    expect(localStorage.getItem(VERIFYING_KEY)).toBeNull();
  });

  it("조용한 재확인: Play 가 답하지 않으면 끝낸 것으로 치지 않고, 답한 뒤에는 같은 계정에서 다시 하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonRes(200, PLUS_BODY)));
    const billing = await loadBilling();
    let asked = 0;
    let answer = false;
    installBridge({ restore: () => { asked += 1; if (answer) emit({ type: "owned", purchases: [] }); } });

    billing.autoRestoreOnce();
    await vi.advanceTimersByTimeAsync(15000); // Play 가 답하지 않음(시간 초과)
    expect(asked).toBe(1);

    answer = true;
    billing.autoRestoreOnce();
    await vi.advanceTimersByTimeAsync(0);
    expect(asked).toBe(2);

    billing.autoRestoreOnce();
    await vi.advanceTimersByTimeAsync(0);
    expect(asked).toBe(2);

    // 화면이 다시 보였고 지금 무료로 보이는 계정이면 10분 뒤에는 다시 확인
    billing.autoRestoreOnce(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(asked).toBe(2);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    billing.autoRestoreOnce(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(asked).toBe(3);
  });

  it("가격 조회와 구매 재확인이 함께 돌 때 오류가 엉뚱한 쪽으로 가지 않는다", async () => {
    const billing = await loadBilling();
    installBridge({ query: () => {}, restore: () => {} });
    const offers = billing.queryOffers();
    const restore = billing.restoreDetailed();
    emit({ type: "error", code: "RESTORE_6" });           // 복원 쪽 오류
    emit({ type: "products", products: [OFFER] });        // 가격은 정상 도착
    expect(await restore).toEqual({ status: "error", code: "RESTORE_FAILED" });
    expect(await offers).toEqual([OFFER]);
  });
});

describe("가격·체험 표시는 Play 값만", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { KataBilling?: unknown }).KataBilling;
  });

  async function loadPricing() {
    vi.resetModules();
    return await import("@/lib/playOffers");
  }

  it("받기 전에는 가격·체험이 비어 있고(불러오는 중), 받으면 Play 값으로 — 월 환산은 연 가격 ÷ 12", async () => {
    let send: (() => void) | null = null;
    installBridge({
      query: () => {
        send = () => emit({
          type: "products",
          products: [
            OFFER,
            { productId: "plus", basePlanId: "monthly", offerId: "", offerToken: "ot-2", formattedPrice: "₩3,900", billingPeriod: "P1M", freeTrialPeriod: "" },
          ],
        });
      },
    });
    const po = await loadPricing();
    po.loadOffers();
    let p = po.getPlusPricing();
    expect(p.state).toBe("loading");
    expect(p.yearlyPrice).toBe("");
    expect(p.trialAny).toBe("");

    (send as unknown as () => void)();
    await vi.advanceTimersByTimeAsync(0);
    p = po.getPlusPricing();
    expect(p.state).toBe("ready");
    expect(p.fromPlay).toBe(true);
    expect(p.yearlyPrice).toBe("34,800원");
    expect(p.yearlyPerMonth).toBe("2,900원");
    expect(p.monthlyPrice).toBe("3,900원");
    expect(p.discountPercent).toBe(26);
    expect(p.trialYearly).toBe("7일");
    expect(p.trialMonthly).toBe("");
    expect(p.trialAny).toBe("7일");
  });

  it("Play 연 가격이 다르면 월 환산도 그 값으로 계산된다 / 체험 제안이 없으면 체험 문구 없음", async () => {
    installBridge({
      query: () => emit({
        type: "products",
        products: [{ productId: "plus", basePlanId: "yearly", offerId: "", offerToken: "ot", formattedPrice: "₩30,000", billingPeriod: "P1Y", freeTrialPeriod: "" }],
      }),
    });
    const po = await loadPricing();
    po.loadOffers();
    await vi.advanceTimersByTimeAsync(0);
    const p = po.getPlusPricing();
    expect(p.yearlyPerMonth).toBe("2,500원");
    expect(p.trialAny).toBe("");
    expect(p.monthlyPrice).toBe("");
  });

  it("원화가 아니면 Play 표기를 그대로 쓰고 월 환산·할인율은 만들지 않는다", async () => {
    installBridge({
      query: () => emit({
        type: "products",
        products: [{ productId: "plus", basePlanId: "yearly", offerId: "t", offerToken: "ot", formattedPrice: "$24.99", billingPeriod: "P1Y", freeTrialPeriod: "P3D" }],
      }),
    });
    const po = await loadPricing();
    po.loadOffers();
    await vi.advanceTimersByTimeAsync(0);
    const p = po.getPlusPricing();
    expect(p.yearlyPrice).toBe("$24.99");
    expect(p.yearlyPerMonth).toBe("");
    expect(p.discountPercent).toBe(0);
    expect(p.trialYearly).toBe("3일");
  });

  it("Play 가 답하지 않으면 '못 받음' — 고정 가격을 대신 보여 주지 않는다. 늦게라도 답이 오면 그 값을 쓴다", async () => {
    installBridge({ query: () => {} });
    const po = await loadPricing();
    po.loadOffers();
    await vi.advanceTimersByTimeAsync(15000);
    let p = po.getPlusPricing();
    expect(p.state).toBe("failed");
    expect(p.yearlyPrice).toBe("");
    expect(p.monthlyPrice).toBe("");
    expect(p.trialAny).toBe("");

    emit({ type: "products", products: [OFFER] }); // 15초를 넘겨 도착한 응답
    p = po.getPlusPricing();
    expect(p.state).toBe("ready");
    expect(p.yearlyPrice).toBe("34,800원");
  });
});
