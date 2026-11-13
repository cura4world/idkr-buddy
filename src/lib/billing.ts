// src/lib/billing.ts
// 스토어 앱의 Play 구독 — 네이티브 KataBilling 통로와 kata-public 서버 검증을 잇습니다.
//
//   상품 조회: KataBilling.query(["plus"]) → __kataBillingEvent({type:"products", products})
//   구매:      KataBilling.purchase(productId, offerToken, accountId) → {type:"purchase"|"canceled"|"error"}
//   복원:      KataBilling.restore() → {type:"owned", purchases}
//   검증:      POST /billing/verify {productId, purchaseToken} → 서버가 Play 에 확인 + acknowledge
//
// 구매 확인(acknowledge)은 서버가 합니다. 앱이 하지 않습니다(위조 구매로 Plus 를 얻지 못하게).
//
// 결제는 끝났는데 서버 검증이 실패한 구매(통신 끊김·서버 5xx)는 "확인 중"으로 두고 성공할 때까지
// 자동으로 다시 검증합니다(점점 늘어나는 간격 + 화면이 다시 보일 때). 사흘 안에 서버가 확인하지 못하면
// Google 이 환불하므로, 사용자에게 다시 결제하라고 하지 않습니다(2026-11-14 출시 전 점검 B-03·B-14).

import { expireSession, getSession, publicPost, updateSessionPlan, PublicPlan } from "@/lib/account";

export const PLUS_PRODUCT_ID = "plus";
const QUERY_TIMEOUT_MS = 15000;
const PURCHASE_TIMEOUT_MS = 10 * 60 * 1000;
/** Play 응답 코드 7 (ITEM_ALREADY_OWNED) — 네이티브가 "BILLING_" + 코드로 넘겨 줍니다. */
const CODE_ALREADY_OWNED = "BILLING_7";

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
// errs: 이 요청의 오류 코드 앞머리. 가격 조회와 조용한 구매 재확인이 앱 시작 때 함께 돌 수 있어,
// 오류가 엉뚱한 쪽으로 가지 않게 코드로 주인을 찾습니다(주인이 분명하지 않은 SETUP_·JSON 은 먼저 기다린 쪽).
type Waiter = { types: string[]; errs: string[]; resolve: (e: BillingEvent) => void };
const waiters: Waiter[] = [];
const ERR_QUERY = ["QUERY_", "BAD_IDS"];
const ERR_PURCHASE = ["BILLING_", "LAUNCH_", "NO_PRODUCT"];
const ERR_RESTORE = ["RESTORE_"];

function findWaiter(e: BillingEvent): number {
  if (e.type === "error") {
    const code = String(e.code || "");
    for (let i = 0; i < waiters.length; i++) {
      if (waiters[i].types.indexOf("error") >= 0 && waiters[i].errs.some((p) => code.indexOf(p) === 0)) return i;
    }
  }
  for (let i = 0; i < waiters.length; i++) {
    if (waiters[i].types.indexOf(e.type) >= 0) return i;
  }
  return -1;
}

function installBillingCallback(): void {
  try {
    (window as unknown as { __kataBillingEvent?: (e: BillingEvent) => void }).__kataBillingEvent = (e) => {
      if (!e || !e.type) return;
      const at = findWaiter(e);
      if (at >= 0) {
        const w = waiters.splice(at, 1)[0];
        w.resolve(e);
        return;
      }
      // 기다리는 쪽이 없는 구매 알림(대기 중이던 결제가 나중에 끝남, 구매 화면을 기다리다 시간이
      // 지남 등)도 버리지 않고 서버에 검증을 맡깁니다. 서버가 확인(acknowledge)하지 않으면
      // 사흘 뒤 Google 이 환불하므로, 알림 하나라도 잃으면 안 됩니다(2026-11-10 검토).
      if ((e.type === "purchase" || e.type === "owned") && Array.isArray(e.purchases)) {
        verifyInBackground(e.purchases);
      }
      // 기다리다 시간이 지난 뒤에 도착한 가격 목록도 버리지 않습니다(느린 Play 응답) — playOffers.ts 가 받아 씁니다.
      if (e.type === "products" && Array.isArray(e.products)) {
        const list = e.products;
        lateProductListeners.forEach((l) => {
          try { l(list); } catch (err) {}
        });
      }
    };
  } catch (e) {}
}
installBillingCallback();

const lateProductListeners = new Set<(list: PlanOffer[]) => void>();
/** 조회를 기다리던 쪽이 이미 포기한 뒤 도착한 가격 목록을 받습니다. */
export function onLateProducts(fn: (list: PlanOffer[]) => void): () => void {
  lateProductListeners.add(fn);
  return () => { lateProductListeners.delete(fn); };
}

function isMine(p: PurchaseInfo | null | undefined): p is PurchaseInfo {
  return !!p && p.state === "PURCHASED" && p.productId === PLUS_PRODUCT_ID && !!p.purchaseToken;
}

function verifyInBackground(list: PurchaseInfo[]): void {
  const mine = list.filter(isMine);
  if (mine.length === 0) return;
  verifyAll(mine)
    .then((r) => {
      // 조용히 하는 확인이라 성공은 화면이 등급 변화로 알아챕니다. 일시 실패만 "확인 중"으로 넘깁니다.
      if (r.status === "verifying") startVerifyRetry(r.pending);
    })
    .catch(() => {});
}

function waitFor(types: string[], ms: number, errs: string[]): Promise<BillingEvent> {
  return new Promise((resolve) => {
    const w: Waiter = { types, errs, resolve: () => {} };
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
  const wait = waitFor(["products", "error"], QUERY_TIMEOUT_MS, ERR_QUERY);
  try {
    b.query(JSON.stringify(productIds));
  } catch (e) {
    return [];
  }
  const ev = await wait;
  return ev.type === "products" && Array.isArray(ev.products) ? ev.products : [];
}

/** 구독이 붙은 플랜인지 — 7일 무료 체험(trial)도 구독이 시작된 것입니다. Special·관리자는 계정에 준 등급이라 아님. */
export function isPaidPlan(plan: PublicPlan): boolean {
  return (plan.tier === "plus" || plan.tier === "trial") && plan.until > Date.now();
}

// ── 서버 검증 ────────────────────────────────────────────────

// (이 프로젝트의 tsconfig 는 strict 가 아니라 true/false 로는 갈래를 못 좁힙니다 — 글자 값으로 구분합니다.)
type VerifyResult =
  | { kind: "answered"; valid: boolean; plan: PublicPlan }
  /** retry: 잠깐 안 된 것(통신·서버 5xx)이라 다시 해 볼 만한가. false 면 다시 해도 같은 답(다른 계정의 구매 등). */
  | { kind: "failed"; code: string; retry: boolean };

async function verify(p: PurchaseInfo): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await publicPost("/billing/verify", { productId: p.productId, purchaseToken: p.purchaseToken });
  } catch (e) {
    const code = e instanceof Error && e.message ? e.message : "NETWORK_FAILED";
    return { kind: "failed", code, retry: code !== "NO_SESSION" };
  }
  if (res.status === 401) {
    // 세션이 끝남 — 로그인 화면으로 돌아가고, 다시 로그인하면 조용한 재확인이 이어받습니다.
    expireSession();
    return { kind: "failed", code: "SESSION_EXPIRED", retry: false };
  }
  let d: { error?: string; plan?: PublicPlan; valid?: boolean } | null = null;
  try {
    d = await res.json();
  } catch (e) {
    d = null;
  }
  if (!res.ok) {
    const code = String((d && d.error) || "HTTP_" + res.status);
    return { kind: "failed", code, retry: res.status >= 500 || res.status === 429 };
  }
  if (d && d.plan) {
    updateSessionPlan(d.plan);
    // valid: 서버가 이 구매를 유효하다고 봤는가. Special·관리자 계정은 구독이 유효해도 plan 이 special 로 오므로 plan 으로 판단하지 않습니다.
    return { kind: "answered", valid: d.valid === true, plan: d.plan };
  }
  return { kind: "failed", code: "BAD_RESPONSE", retry: true };
}

type VerifyAllResult =
  | { status: "plus"; plan: PublicPlan }
  | { status: "verifying"; pending: PurchaseInfo[] }
  | { status: "error"; code: string };

/** 결제가 끝난(PURCHASED) 구매들을 차례로 검증합니다. 하나라도 유효하면 끝. */
async function verifyAll(mine: PurchaseInfo[]): Promise<VerifyAllResult> {
  const pending: PurchaseInfo[] = [];
  let code = "NOT_VALID";
  for (const p of mine) {
    const r = await verify(p);
    if (r.kind === "answered") {
      if (r.valid) return { status: "plus", plan: r.plan };
      continue; // 서버가 답했지만 끝난 구매(환불·만료)
    }
    if (r.retry) pending.push(p);
    else code = r.code;
  }
  if (pending.length > 0) return { status: "verifying", pending };
  return { status: "error", code };
}

// ── 결제 확인 중(자동 재검증) ────────────────────────────────

export type VerifyEvent =
  | { type: "verifying" }
  | { type: "done"; plan: PublicPlan }
  | { type: "stopped"; code: string };

// 5초·10초·20초·40초·80초·160초, 그 뒤로는 5분마다
const RETRY_STEPS_MS = [5000, 10000, 20000, 40000, 80000, 160000, 300000];
const RETRY_MIN_GAP_MS = 4000;
// 페이지가 다시 열려도 "확인 중"을 이어 가려고 시각만 적어 둡니다(구매 토큰은 적지 않음 — Play 에서 다시 받습니다).
const VERIFYING_KEY = "kata-billing-verifying";
const VERIFYING_MAX_MS = 3 * 24 * 60 * 60 * 1000; // 사흘이 지나면 Google 이 환불하므로 더 확인할 것이 없음

let pendingList: PurchaseInfo[] = [];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryStep = 0;
let retryBusy = false;
let lastRetryAt = 0;
const verifyListeners = new Set<(e: VerifyEvent) => void>();

function readVerifyingFlag(): number {
  try {
    const n = Number(localStorage.getItem(VERIFYING_KEY) || 0);
    if (!isFinite(n) || n <= 0) return 0;
    if (Date.now() - n > VERIFYING_MAX_MS) {
      localStorage.removeItem(VERIFYING_KEY);
      return 0;
    }
    return n;
  } catch (e) {
    return 0;
  }
}

function writeVerifyingFlag(on: boolean): void {
  try {
    if (!on) localStorage.removeItem(VERIFYING_KEY);
    else if (!readVerifyingFlag()) localStorage.setItem(VERIFYING_KEY, String(Date.now()));
  } catch (e) {}
}

function emitVerify(e: VerifyEvent): void {
  verifyListeners.forEach((l) => {
    try { l(e); } catch (err) {}
  });
}

/** 결제는 끝났는데 서버 확인이 아직인 구매가 있는가 */
export function isVerifyingPurchase(): boolean {
  return pendingList.length > 0 || readVerifyingFlag() > 0;
}

/** "확인 중" 시작·성공·중단을 알려 줍니다(화면의 안내와 알림에 씀). */
export function onVerifyEvent(fn: (e: VerifyEvent) => void): () => void {
  verifyListeners.add(fn);
  return () => { verifyListeners.delete(fn); };
}

function clearRetryTimer(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry(): void {
  clearRetryTimer();
  const ms = RETRY_STEPS_MS[Math.min(retryStep, RETRY_STEPS_MS.length - 1)];
  retryStep += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    runRetry().catch(() => {});
  }, ms);
}

function startVerifyRetry(list: PurchaseInfo[]): void {
  const known = pendingList.map((p) => p.purchaseToken);
  list.forEach((p) => {
    if (known.indexOf(p.purchaseToken) < 0) pendingList.push(p);
  });
  const fresh = !readVerifyingFlag();
  writeVerifyingFlag(true);
  if (fresh) retryStep = 0;
  emitVerify({ type: "verifying" });
  if (retryTimer === null && !retryBusy) scheduleRetry();
}

function finishVerify(e: VerifyEvent): void {
  pendingList = [];
  retryStep = 0;
  clearRetryTimer();
  writeVerifyingFlag(false);
  emitVerify(e);
}

async function ownedFromPlay(): Promise<PurchaseInfo[] | null> {
  const b = bridge();
  if (!b || typeof b.restore !== "function") return null;
  const wait = waitFor(["owned", "error"], QUERY_TIMEOUT_MS, ERR_RESTORE);
  try {
    b.restore();
  } catch (e) {
    return null;
  }
  const ev = await wait;
  return ev.type === "owned" && Array.isArray(ev.purchases) ? ev.purchases : null;
}

async function runRetry(): Promise<void> {
  if (retryBusy) return;
  if (!isVerifyingPurchase()) return;
  if (!getSession()) {
    // 로그아웃된 동안에는 멈춥니다. 표시는 남겨 두어 다시 로그인하면 이어 갑니다.
    clearRetryTimer();
    return;
  }
  retryBusy = true;
  lastRetryAt = Date.now();
  try {
    let list = pendingList.slice();
    if (list.length === 0) {
      // 페이지가 다시 열린 뒤 — 구매 목록을 Play 에서 다시 받습니다.
      const owned = await ownedFromPlay();
      if (owned === null) {
        scheduleRetry(); // Play 가 지금 답하지 않음
        return;
      }
      list = owned.filter(isMine);
      if (list.length === 0) {
        finishVerify({ type: "stopped", code: "NO_PURCHASE" }); // 구매가 없어짐(환불·취소)
        return;
      }
    }
    const r = await verifyAll(list);
    if (r.status === "plus") finishVerify({ type: "done", plan: r.plan });
    else if (r.status === "verifying") {
      pendingList = r.pending;
      scheduleRetry();
    } else if (r.code === "SESSION_EXPIRED" || r.code === "NO_SESSION") {
      clearRetryTimer(); // 다시 로그인하면 이어 감
    } else finishVerify({ type: "stopped", code: r.code });
  } finally {
    retryBusy = false;
  }
}

/** 화면이 다시 보일 때 부릅니다 — 확인 중인 결제가 있으면 기다리지 않고 바로 다시 검증합니다. */
export function retryVerifyNow(): void {
  if (!isVerifyingPurchase() || retryBusy) return;
  if (Date.now() - lastRetryAt < RETRY_MIN_GAP_MS) return;
  clearRetryTimer();
  runRetry().catch(() => {});
}

// ── 조용한 재확인 ────────────────────────────────────────────

let quietDoneFor = ""; // 이 계정으로는 조용한 재확인을 끝냄 (Play 가 실제로 답했을 때만 적음)
let quietBusy = false;
let quietAt = 0;
const QUIET_GAP_MS = 60 * 1000;
const QUIET_AGAIN_GAP_MS = 10 * 60 * 1000;

/**
 * 조용히 구매를 다시 확인합니다(화면에는 아무것도 띄우지 않음). 결제 직후 앱이 꺼졌거나 서버 확인이
 * 실패한 구매도 여기서 다시 서버에 맡겨져 확인(acknowledge)됩니다.
 *   · 계정마다 한 번 — 로그아웃 뒤 다른 계정으로 로그인하면 다시 돕니다.
 *   · Play 가 답하지 않았으면(인터넷 없음) 끝낸 것으로 치지 않아, 다음에 부를 때 다시 합니다.
 *   · again: 화면이 다시 보일 때 — 지금 무료로 보이는 계정이면 끝낸 뒤라도 10분에 한 번까지 다시 합니다
 *     (구독 중인데 무료로 보이는 사용자가 앱을 끄지 않고도 돌아오게).
 */
export function autoRestoreOnce(again = false): void {
  const s = getSession();
  if (!billingAvailable() || !s || quietBusy) return;
  if (isVerifyingPurchase()) {
    retryVerifyNow();
    return;
  }
  const uid = s.user.id;
  const now = Date.now();
  if (quietDoneFor === uid) {
    // 이미 끝냄 — 화면이 다시 보였고 지금 무료로 보이는 계정일 때만, 10분에 한 번까지 다시
    const open = isPaidPlan(s.plan) || s.plan.tier === "special" || s.plan.tier === "admin";
    if (!again || open || now - quietAt < QUIET_AGAIN_GAP_MS) return;
  } else if (again && quietAt > 0 && now - quietAt < QUIET_GAP_MS) {
    return; // 방금 해 봤는데 Play 가 답하지 않음 — 1분 안에는 다시 하지 않음
  }
  quietBusy = true;
  quietAt = now;
  ownedFromPlay()
    .then(async (owned) => {
      if (owned === null) return; // Play 가 답하지 않음 → 다음에 다시
      quietDoneFor = uid;
      const mine = owned.filter(isMine);
      if (mine.length === 0) return;
      const r = await verifyAll(mine);
      if (r.status === "verifying") startVerifyRetry(r.pending);
    })
    .catch(() => {})
    .finally(() => { quietBusy = false; });
}

/** 앱(페이지)이 다시 열렸을 때 — 지난번에 끝내지 못한 "확인 중"이 있으면 이어 갑니다. */
export function resumeVerifyIfNeeded(): void {
  if (!billingAvailable() || !getSession()) return;
  if (readVerifyingFlag() > 0 && retryTimer === null && !retryBusy) {
    emitVerify({ type: "verifying" });
    runRetry().catch(() => {});
  }
}

// ── 구매·복원 ────────────────────────────────────────────────

export type PurchaseOutcome =
  | { status: "plus"; plan: PublicPlan; restored?: boolean }
  /** 결제는 끝났고 서버 확인을 자동으로 다시 하는 중 */
  | { status: "verifying" }
  | { status: "pending" }
  | { status: "canceled" }
  | { status: "error"; code: string };

/** 구독 구매. 끝나면 서버 검증까지 마치고 결과를 돌려줍니다. */
export async function purchase(offer: PlanOffer): Promise<PurchaseOutcome> {
  const b = bridge();
  const s = getSession();
  if (!b || typeof b.purchase !== "function") return { status: "error", code: "NO_BRIDGE" };
  if (!s || !s.accountId) return { status: "error", code: "NO_SESSION" };
  const wait = waitFor(["purchase", "canceled", "error"], PURCHASE_TIMEOUT_MS, ERR_PURCHASE);
  try {
    b.purchase(offer.productId, offer.offerToken, s.accountId);
  } catch (e) {
    return { status: "error", code: "FAILED" };
  }
  const ev = await wait;
  if (ev.type === "canceled") return { status: "canceled" };
  if (ev.type === "error") {
    const code = ev.code || "FAILED";
    // 이미 보유: 새로 살 수 없으므로 구매 복원 흐름으로 바로 넘깁니다(B-11).
    if (code === CODE_ALREADY_OWNED) {
      const r = await restoreDetailed();
      if (r.status === "plus") return { status: "plus", plan: r.plan, restored: true };
      if (r.status === "verifying") return { status: "verifying" };
      return { status: "error", code: r.status === "error" ? r.code : code };
    }
    return { status: "error", code };
  }
  const list = Array.isArray(ev.purchases) ? ev.purchases : [];
  const mine = list.filter((p) => p.productId === offer.productId);
  if (mine.length === 0) return { status: "error", code: "NO_PURCHASE" };
  if (mine.every((p) => p.state === "PENDING")) return { status: "pending" };
  const paid = mine.filter(isMine);
  if (paid.length === 0) return { status: "error", code: "NO_PURCHASE" };
  const r = await verifyAll(paid);
  if (r.status === "plus") return { status: "plus", plan: r.plan };
  if (r.status === "verifying") {
    startVerifyRetry(r.pending);
    return { status: "verifying" };
  }
  return { status: "error", code: r.code };
}

export type RestoreOutcome =
  | { status: "plus"; plan: PublicPlan }
  | { status: "verifying" }
  /** 이 기기의 Play 계정에 구독이 없음 */
  | { status: "none" }
  /** RESTORE_FAILED = Play 가 답하지 않음 · ACCOUNT_MISMATCH·PURCHASE_OWNED_BY_OTHER = 다른 앱 계정의 구독 */
  | { status: "error"; code: string };

/** 이미 산 구독을 이 계정에 다시 연결합니다. 왜 안 됐는지까지 돌려줍니다. */
export async function restoreDetailed(): Promise<RestoreOutcome> {
  const owned = await ownedFromPlay();
  if (owned === null) return { status: "error", code: "RESTORE_FAILED" };
  const mine = owned.filter(isMine);
  if (mine.length === 0) return { status: "none" };
  const r = await verifyAll(mine);
  if (r.status === "plus") return { status: "plus", plan: r.plan };
  if (r.status === "verifying") {
    startVerifyRetry(r.pending);
    return { status: "verifying" };
  }
  if (r.code === "NOT_VALID") return { status: "none" };
  return { status: "error", code: r.code };
}

/** 이미 산 구독을 이 계정에 다시 연결합니다. Plus 가 붙으면 그 플랜을, 아니면 null. */
export async function restorePurchases(): Promise<PublicPlan | null> {
  const r = await restoreDetailed();
  return r.status === "plus" ? r.plan : null;
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
