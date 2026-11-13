// src/lib/playOffers.ts
// Play 에서 받은 구독 가격·체험 제안을 한곳에 두고, 구독 화면·잠금 상자·홈·내 정보가 같이 씁니다.
//
// 2026-11-14 출시 전 점검 B-05·B-07:
//   · 정식 스토어 앱은 Play 에서 받은 값만 보여 줍니다. 아직 못 받았으면 가격 자리는 "불러오는 중",
//     체험 문구는 숨김. 고정 원화 가격·"7일"은 미리보기 빌드의 대체값으로만 씁니다.
//   · 연간의 월 환산은 Play 연 가격 ÷ 12 로 계산합니다(고정 글자 없음). 원화일 때만 계산 —
//     Play 가 주는 값이 표기 문자열(formattedPrice)뿐이라 통화마다 다른 소수점 자리를 믿을 수 없습니다.
//   · "7일 무료 체험"은 Play 체험 제안(freeTrialPeriod)이 있을 때만 보입니다. 체험을 이미 쓴
//     Play 계정에는 Play 가 체험 제안을 주지 않습니다.

import { useEffect, useState } from "react";
import { onLateProducts, periodText, PlanOffer, queryOffers } from "@/lib/billing";
import { isPreviewBuild } from "@/lib/plan";
import { onPreviewChange, previewTrialUsed } from "@/lib/preview";
import { FALLBACK_MONTHLY_WON, FALLBACK_TRIAL_TEXT, FALLBACK_YEARLY_WON, wonText } from "@/lib/plusCopy";

export type OffersState = "loading" | "ready" | "failed";

export interface PlusPricing {
  /** loading = Play 에서 받는 중 · ready = 값 있음 · failed = 못 받음(다시 불러오기) */
  state: OffersState;
  /** Play 에서 받은 값인가 (미리보기 대체값이면 false) */
  fromPlay: boolean;
  yearlyOffer: PlanOffer | null;
  monthlyOffer: PlanOffer | null;
  /** "34,800원" · "$24.99" · 없으면 "" */
  yearlyPrice: string;
  monthlyPrice: string;
  /** 연 가격 ÷ 12 — "2,900원". 원화가 아니거나 연 가격이 없으면 "" */
  yearlyPerMonth: string;
  /** 월간 12번 대비 연간 할인율(%). 원화가 아니면 0 */
  discountPercent: number;
  /** 체험 기간 "7일" · 체험 제안이 없으면 "" */
  trialYearly: string;
  trialMonthly: string;
  /** 어느 요금제든 체험 제안이 있으면 그 기간 — 잠금 상자·홈 버튼의 "7일 무료 체험" */
  trialAny: string;
}

const NON_DIGIT = new RegExp("[^0-9]", "g");

function digitsOf(s: string): number {
  const n = Number(String(s || "").replace(NON_DIGIT, ""));
  return isFinite(n) ? n : 0;
}

/** 원화면 Play 의 "₩34,800" 을 시안처럼 "34,800원" 으로. 다른 통화는 Play 값 그대로. */
function isWon(s: string): boolean {
  const t = String(s || "").trim();
  return t.indexOf("₩") === 0 || t.indexOf("KRW") >= 0 || t.slice(-1) === "원";
}

function priceText(formatted: string): string {
  if (isWon(formatted)) return wonText(digitsOf(formatted));
  return String(formatted || "").trim();
}

// ── Play 조회 (앱 전체에 하나) ───────────────────────────────

const RETRY_AFTER_FAIL_MS = 30 * 1000;

let offers: PlanOffer[] | null = null; // null = 아직 받은 적 없음
let state: OffersState = "loading";
let loading = false;
let triedAt = 0;
const subs = new Set<() => void>();

function emit(): void {
  subs.forEach((f) => {
    try { f(); } catch (e) {}
  });
}

/**
 * Play 에서 요금제를 받습니다. 이미 받았으면 다시 받지 않습니다(force 면 새로).
 * 다시 받는 동안에는 앞서 받은 값을 그대로 보여 줍니다. 미리보기 빌드는 Play 를 쓰지 않습니다.
 */
export function loadOffers(force = false): void {
  if (isPreviewBuild() || loading) return;
  if (!force) {
    if (state === "ready") return;
    if (state === "failed" && Date.now() - triedAt < RETRY_AFTER_FAIL_MS) return;
  }
  loading = true;
  if (!offers) {
    state = "loading";
    emit();
  }
  queryOffers()
    .then((list) => {
      if (!accept(list) && !offers) state = "failed";
    })
    .catch(() => {
      if (!offers) state = "failed";
    })
    .finally(() => {
      loading = false;
      triedAt = Date.now();
      emit();
    });
}

/** Play 가 준 목록을 받아 둡니다. 쓸 요금제가 하나도 없으면 false. */
function accept(list: PlanOffer[]): boolean {
  // 같은 기본 요금제에 체험 제안과 일반 제안이 함께 오면 체험 쪽을 씁니다(Play 가 자격을 판단).
  const byPlan: Record<string, PlanOffer> = {};
  list.forEach((o) => {
    if (!o || !o.basePlanId) return;
    const prev = byPlan[o.basePlanId];
    if (!prev || (!prev.freeTrialPeriod && o.freeTrialPeriod)) byPlan[o.basePlanId] = o;
  });
  const next = Object.keys(byPlan).map((k) => byPlan[k]);
  if (next.length === 0) return false;
  offers = next;
  state = "ready";
  return true;
}

// 15초를 기다리다 "못 받음"으로 넘어간 뒤에 Play 응답이 도착해도 그 값을 씁니다.
onLateProducts((list) => {
  if (isPreviewBuild()) return;
  if (accept(list)) emit();
});

function build(
  st: OffersState, fromPlay: boolean, yearlyOffer: PlanOffer | null, monthlyOffer: PlanOffer | null,
  yFormatted: string, mFormatted: string, trialYearly: string, trialMonthly: string,
): PlusPricing {
  const yWon = yFormatted && isWon(yFormatted) ? digitsOf(yFormatted) : 0;
  const mWon = mFormatted && isWon(mFormatted) ? digitsOf(mFormatted) : 0;
  return {
    state: st,
    fromPlay,
    yearlyOffer,
    monthlyOffer,
    yearlyPrice: yFormatted ? priceText(yFormatted) : "",
    monthlyPrice: mFormatted ? priceText(mFormatted) : "",
    yearlyPerMonth: yWon > 0 ? wonText(Math.round(yWon / 12)) : "",
    discountPercent: yWon > 0 && mWon > 0 ? Math.max(0, Math.round((1 - yWon / (mWon * 12)) * 100)) : 0,
    trialYearly,
    trialMonthly,
    trialAny: trialYearly || trialMonthly,
  };
}

/** 지금 보여 줄 가격·체험 정보 */
export function getPlusPricing(): PlusPricing {
  if (isPreviewBuild()) {
    // 미리보기: 결정 문서의 대체 가격 + "체험 이미 사용" 스위치
    const trial = previewTrialUsed() ? "" : FALLBACK_TRIAL_TEXT;
    return build("ready", false, null, null, wonText(FALLBACK_YEARLY_WON), wonText(FALLBACK_MONTHLY_WON), trial, trial);
  }
  if (!offers) return build(state === "failed" ? "failed" : "loading", true, null, null, "", "", "", "");
  const y = offers.find((o) => o.billingPeriod === "P1Y") || null;
  const m = offers.find((o) => o.billingPeriod === "P1M") || null;
  return build(
    "ready", true, y, m,
    y ? y.formattedPrice : "", m ? m.formattedPrice : "",
    y ? periodText(y.freeTrialPeriod) : "", m ? periodText(m.freeTrialPeriod) : "",
  );
}

/**
 * 화면에서 쓰는 훅 — 처음 쓰일 때 Play 조회를 시작하고, 값이 오면 다시 그립니다.
 * enabled 가 false 면 조회를 시작하지 않습니다(Plus 안내를 보이지 않는 등급·관리자판 홈).
 */
export function usePlusPricing(enabled = true): PlusPricing {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    subs.add(f);
    const off = onPreviewChange(f);
    return () => {
      subs.delete(f);
      off();
    };
  }, []);
  useEffect(() => {
    if (enabled) loadOffers();
  }, [enabled]);
  return getPlusPricing();
}
