// src/lib/billing.ts
// 스토어 앱의 Play 구독 — 네이티브 KataBilling 통로와 kata-public 서버 검증을 잇습니다.
//
//   상품 조회: KataBilling.query(["plus"]) → __kataBillingEvent({type:"products", products})
//   구매:      KataBilling.purchase(productId, offerToken, accountId) → {type:"purchase"|"canceled"|"error"}
//   복원:      KataBilling.restore() → {type:"owned", purchases}
//   검증:      POST /billing/verify {productId, purchaseToken} → 서버가 Play 에 확인 + acknowledge
//
// 구매 확인(acknowledge)은 서버가 합니다. 앱이 하지 않습니다(위조 구매로 Plus 를 얻지 못하게).

import { getSession, publicPost, updateSessionPlan, PublicPlan } from "@/lib/account";

export const PLUS_PRODUCT_ID = "plus";
const QUERY_TIMEOUT_MS = 15000;
const PURCHASE_TIMEOUT_MS = 10 * 60 * 1000;

export interface PlanOffer {
  productId: string;
  basePlanId: string;
  offerId: string;
  offerToken: string;
  formattedPrice: string;
  billingPeriod: string;   // ISO 8601: P1M, P1Y
  freeTrialPeriod: string; // ISO 8601: P7D, 없으면 ""
}

export interface PurchaseInfo {
  productId: string;
  purchaseToken: string;
  orderId: string;
  acknowledged: boolean;
  state: string; // "PURCHASED" | "PENDING" | "UNSPECIFIED"
}

interface BillingEvent {
  type: "products" | "purchase" | "owned" | "canceled" | "error";
  products?: PlanOffer[];
  purchases?: PurchaseInfo[];
  code?: string;
}

interface BillingBridge {
  query?: (productIdsJson: string) => void;
  purchase?: (productId: string, offerToken: string, accountId: string) => void;
  restore?: () => void;
  manage?: (productId: string) => void;
}

function bridge(): BillingBridge | null {
  try {
    const w = window as unknown as { KataBilling?: BillingBridge };
    return w.KataBilling || null;
  } catch (e) {
    return null;
  }
}

export function billingAvailable(): boolean {
  return bridge() !== null;
}

// 네이티브 → 웹 이벤트. 기다리는 쪽이 하나씩 받아 갑니다.
type Waiter = { types: string[]; resolve: (e: BillingEvent) => void };
const waiters: Waiter[] = [];

function installBillingCallback(): void {
  try {
    (window as unknown as { __kataBillingEvent?: (e: BillingEvent) => void }).__kataBillingEvent = (e) => {
      if (!e || !e.type) return;
      for (let i = 0; i < waiters.length; i++) {
        if (waiters[i].types.indexOf(e.type) >= 0) {
          const w = waiters.splice(i, 1)[0];
          w.resolve(e);
          return;
        }
      }
      // 기다리는 쪽이 없는 구매 알림(대기 중이던 결제가 나중에 끝남, 구매 화면을 기다리다 시간이
      // 지남 등)도 버리지 않고 서버에 검증을 맡깁니다. 서버가 확인(acknowledge)하지 않으면
      // 사흘 뒤 Google 이 환불하므로, 알림 하나라도 잃으면 안 됩니다(2026-11-10 검토).
      if ((e.type === "purchase" || e.type === "owned") && Array.isArray(e.purchases)) {
        verifyInBackground(e.purchases);
      }
    };
  } catch (e) {}
}
installBillingCallback();

function verifyInBackground(list: PurchaseInfo[]): void {
  for (const p of list) {
    if (!p || p.state !== "PURCHASED" || p.productId !== PLUS_PRODUCT_ID) continue;
    verify(p).catch(() => {});
  }
}

let autoRestoreDone = false;
/**
 * 스토어 앱이 켜질 때 한 번, 조용히 구매를 다시 확인합니다. 결제 직후 앱이 꺼졌거나 서버 확인이
 * 실패한 구매도 여기서 다시 서버에 맡겨져 확인(acknowledge)됩니다. 화면에는 아무것도 띄우지 않습니다.
 */
export function autoRestoreOnce(): void {
  if (autoRestoreDone) return;
  if (!billingAvailable() || !getSession()) return;
  autoRestoreDone = true;
  restorePurchases().catch(() => {});
}

function waitFor(types: string[], ms: number): Promise<BillingEvent> {
  return new Promise((resolve) => {
    const w: Waiter = { types, resolve: () => {} };
    const timer = setTimeout(() => {
      const i = waiters.indexOf(w);
      if (i >= 0) waiters.splice(i, 1);
      resolve({ type: "error", code: "TIMEOUT" });
    }, ms);
    w.resolve = (e) => {
      clearTimeout(timer);
      resolve(e);
    };
    waiters.push(w);
  });
}

/** Play 에서 구독 상품(기본 요금제·체험 제안)과 현지 가격을 받아 옵니다. */
export async function queryOffers(productIds: string[] = [PLUS_PRODUCT_ID]): Promise<PlanOffer[]> {
  const b = bridge();
  if (!b || typeof b.query !== "function") return [];
  const wait = waitFor(["products", "error"], QUERY_TIMEOUT_MS);
  try {
    b.query(JSON.stringify(productIds));
  } catch (e) {
    return [];
  }
  const ev = await wait;
  return ev.type === "products" && Array.isArray(ev.products) ? ev.products : [];
}

async function verify(p: PurchaseInfo): Promise<PublicPlan | null> {
  const res = await publicPost("/billing/verify", { productId: p.productId, purchaseToken: p.purchaseToken });
  if (!res.ok) return null;
  const d = await res.json();
  if (d && d.plan) {
    updateSessionPlan(d.plan);
    return d.plan as PublicPlan;
  }
  return null;
}

export type PurchaseOutcome =
  | { status: "plus"; plan: PublicPlan }
  | { status: "pending" }
  | { status: "canceled" }
  | { status: "error"; code: string };

/** 구독 구매. 끝나면 서버 검증까지 마치고 결과를 돌려줍니다. */
export async function purchase(offer: PlanOffer): Promise<PurchaseOutcome> {
  const b = bridge();
  const s = getSession();
  if (!b || typeof b.purchase !== "function") return { status: "error", code: "NO_BRIDGE" };
  if (!s || !s.accountId) return { status: "error", code: "NO_SESSION" };
  const wait = waitFor(["purchase", "canceled", "error"], PURCHASE_TIMEOUT_MS);
  try {
    b.purchase(offer.productId, offer.offerToken, s.accountId);
  } catch (e) {
    return { status: "error", code: "FAILED" };
  }
  const ev = await wait;
  if (ev.type === "canceled") return { status: "canceled" };
  if (ev.type === "error") return { status: "error", code: ev.code || "FAILED" };
  const list = Array.isArray(ev.purchases) ? ev.purchases : [];
  const mine = list.filter((p) => p.productId === offer.productId);
  if (mine.length === 0) return { status: "error", code: "NO_PURCHASE" };
  if (mine.every((p) => p.state === "PENDING")) return { status: "pending" };
  for (const p of mine) {
    if (p.state !== "PURCHASED") continue;
    try {
      const plan = await verify(p);
      if (plan && plan.tier === "plus") return { status: "plus", plan };
    } catch (e) {}
  }
  return { status: "error", code: "VERIFY_FAILED" };
}

/** 이미 산 구독을 이 계정에 다시 연결합니다. Plus 가 붙으면 그 플랜을, 아니면 null. */
export async function restorePurchases(): Promise<PublicPlan | null> {
  const b = bridge();
  if (!b || typeof b.restore !== "function") return null;
  const wait = waitFor(["owned", "error"], QUERY_TIMEOUT_MS);
  try {
    b.restore();
  } catch (e) {
    return null;
  }
  const ev = await wait;
  const list = ev.type === "owned" && Array.isArray(ev.purchases) ? ev.purchases : [];
  for (const p of list) {
    if (p.state !== "PURCHASED") continue;
    try {
      const plan = await verify(p);
      if (plan && plan.tier === "plus") return plan;
    } catch (e) {}
  }
  return null;
}

/** Play 의 구독 관리 화면(해지·결제 수단 변경)을 엽니다. */
export function manageSubscription(productId: string = PLUS_PRODUCT_ID): void {
  try {
    bridge()?.manage?.(productId);
  } catch (e) {}
}

/** "P7D" → "7일", "P1M" → "1개월", "P1Y" → "1년" */
export function periodText(iso: string): string {
  const m = new RegExp("^P(\\d+)([DWMY])$").exec(String(iso || ""));
  if (!m) return "";
  const n = m[1];
  const unit = m[2] === "D" ? "일" : m[2] === "W" ? "주" : m[2] === "M" ? "개월" : "년";
  return n + unit;
}
