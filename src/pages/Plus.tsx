// src/pages/Plus.tsx
// Kata kata Plus (구독) 화면 — 시안 PW1(7일 무료 체험, 연간 기본 선택)·PW2(체험을 이미 쓴 계정) 그대로.
//   · 혜택 5줄(귤색 아이콘 상자) → 요금제 2칸(연간·월간 라디오 카드) → 황금갈색 버튼 하나 → 안내 → 링크
//   · 가격은 Play 에서 받은 값(formattedPrice). 못 받으면(미리보기 APK·조회 실패) 결정 문서의 고정 가격
//   · 체험 여부는 Play 제안의 freeTrialPeriod. Play 가 없으면 미리보기의 "체험 이미 사용" 스위치를 따름
//   · 이미 열린 계정(체험 중·Plus·Special·관리자)은 요금제 대신 "이용 중" 상자
// 문구는 src/lib/plusCopy.ts, 등급은 src/lib/plan.ts.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import { getSession, onSessionChange, PublicSession } from "@/lib/account";
import { isPreviewBuild, usePlan } from "@/lib/plan";
import { previewTrialUsed } from "@/lib/preview";
import {
  billingAvailable,
  manageSubscription,
  periodText,
  PlanOffer,
  purchase,
  queryOffers,
  restorePurchases,
} from "@/lib/billing";
import {
  CTA_CLOSE,
  CTA_MANAGE,
  CTA_MONTHLY,
  CTA_YEARLY,
  ctaTrial,
  discountBadge,
  FALLBACK_MONTHLY_WON,
  FALLBACK_YEARLY_WON,
  LINK_PRIVACY,
  LINK_RESTORE,
  LINK_TERMS,
  NOTE_AI_VOICE,
  NOTE_NO_TRIAL_LINES,
  noteTrialLines,
  PLAN_MONTHLY_LABEL,
  PLAN_MONTHLY_SUB,
  PLAN_YEARLY_LABEL,
  PLUS_LEAD_LINES,
  PLUS_PERKS,
  PLUS_TITLE,
  PLUS_TITLE_BRAND,
  PLUS_TITLE_MARK,
  PlusPerkIcon,
  STATE_ADMIN,
  STATE_PLUS,
  STATE_SPECIAL,
  STATE_STAFF_SUB,
  STATE_TRIAL,
  stateUntilText,
  TOAST_NO_BILLING,
  TOAST_NO_OFFERS,
  TOAST_PENDING,
  TOAST_PREVIEW,
  TOAST_RESTORE_NONE,
  TOAST_RESTORED,
  TOAST_STARTED,
  TOAST_TRIAL_STARTED,
  toastFailed,
  wonText,
} from "@/lib/plusCopy";

// 시안 색 (docs/release/08 공통 규칙: Plus 는 귤색 상자 + 황금갈색 버튼)
const C = {
  ink: "#1D1F1E",
  gray: "#646C72",
  lead: "#4A5257",
  faint: "#9AA1A6",
  gold: "#8A6A12",
  goldInk: "#6E5612",
  goldBg: "#FFF6DC",
  line: "#E1E5E7",
  radioOff: "#B7BDC1",
  closeBg: "#F1F4F5",
};

const DEFAULT_TRIAL_TEXT = "7일";
// 미리보기 APK 의 "체험 이미 사용" 스위치는 src/lib/preview.ts 의 previewTrialUsed() 를 씁니다(병합 후 한 곳으로).

type PlanKey = "yearly" | "monthly";

function isYearly(o: PlanOffer): boolean {
  return o.billingPeriod === "P1Y";
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

function shortDate(t: number): string {
  const d = new Date(t);
  return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
}

// 시안의 아이콘 (24 기준 선 그림)
function PerkIcon({ name }: { name: PlusPerkIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
      </svg>
    );
  }
  if (name === "game") {
    return (
      <svg {...common}>
        <rect x="2" y="7" width="20" height="11" rx="5" />
        <path d="M7 11v3M5.5 12.5h3" />
        <circle cx="16" cy="11.5" r="0.9" fill="currentColor" />
        <circle cx="18" cy="13.5" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (name === "speaker") {
    return (
      <svg {...common}>
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg {...common}>
        <path d="M3 5h12v8H8l-5 4z" />
        <path d="M9 16h7l5 4v-9h-3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface PlanCard {
  key: PlanKey;
  label: string;
  sub: string;
  right: string;
  badge: string;
  offer: PlanOffer | null;
  priceForNote: string; // "연 34,800원" · "월 3,900원"
}

const Plus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tier } = usePlan();
  const [session, setSession] = useState<PublicSession | null>(getSession());
  const [offers, setOffers] = useState<PlanOffer[] | null>(null);
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [busy, setBusy] = useState(false);
  const preview = isPreviewBuild();

  useEffect(() => onSessionChange(setSession), []);

  useEffect(() => {
    let alive = true;
    queryOffers().then((list) => {
      if (!alive) return;
      // 같은 기본 요금제에 체험 제안과 일반 제안이 함께 오면 체험 쪽을 씁니다(Play 가 자격을 판단).
      const byPlan: Record<string, PlanOffer> = {};
      list.forEach((o) => {
        const prev = byPlan[o.basePlanId];
        if (!prev || (!prev.freeTrialPeriod && o.freeTrialPeriod)) byPlan[o.basePlanId] = o;
      });
      setOffers(Object.keys(byPlan).map((k) => byPlan[k]));
    });
    return () => { alive = false; };
  }, []);

  const yearlyOffer = offers ? offers.find((o) => isYearly(o)) || null : null;
  const monthlyOffer = offers ? offers.find((o) => o.billingPeriod === "P1M") || null : null;

  const cards: PlanCard[] = useMemo(() => {
    const yFormatted = yearlyOffer ? yearlyOffer.formattedPrice : "";
    const mFormatted = monthlyOffer ? monthlyOffer.formattedPrice : "";
    const yPrice = yFormatted ? priceText(yFormatted) : wonText(FALLBACK_YEARLY_WON);
    const mPrice = mFormatted ? priceText(mFormatted) : wonText(FALLBACK_MONTHLY_WON);
    // 월 환산과 할인율 — 원화일 때만 계산(통화마다 소수점 자리가 달라서). Play 가 없으면 고정 가격으로.
    const yWon = yFormatted ? (isWon(yFormatted) ? digitsOf(yFormatted) : 0) : FALLBACK_YEARLY_WON;
    const mWon = mFormatted ? (isWon(mFormatted) ? digitsOf(mFormatted) : 0) : FALLBACK_MONTHLY_WON;
    const perMonth = yWon > 0 ? "월 " + wonText(Math.round(yWon / 12)) : "";
    const pct = yWon > 0 && mWon > 0 ? Math.round((1 - yWon / (mWon * 12)) * 100) : 0;
    return [
      {
        key: "yearly",
        label: PLAN_YEARLY_LABEL,
        sub: "연 " + yPrice,
        right: perMonth,
        badge: pct > 0 ? discountBadge(pct) : "",
        offer: yearlyOffer,
        priceForNote: "연 " + yPrice,
      },
      {
        key: "monthly",
        label: PLAN_MONTHLY_LABEL,
        sub: PLAN_MONTHLY_SUB,
        right: "월 " + mPrice,
        badge: "",
        offer: monthlyOffer,
        priceForNote: "월 " + mPrice,
      },
    ];
  }, [yearlyOffer, monthlyOffer]);

  const chosen = cards.find((c) => c.key === selected) || cards[0];
  const playLoaded = !!offers && offers.length > 0;
  // 체험 가능 여부: Play 제안이 있으면 그 값, 없으면 미리보기 스위치(미리보기가 아니면 가능한 것으로)
  const trialText = playLoaded
    ? (chosen.offer ? periodText(chosen.offer.freeTrialPeriod) : "")
    : (preview && previewTrialUsed() ? "" : DEFAULT_TRIAL_TEXT);

  const entitled = tier !== "free";
  const staff = tier === "special" || tier === "admin";
  const paidUntil = session && (session.plan.tier === "plus" || session.plan.tier === "trial") ? session.plan.until : 0;

  const close = () => goBackOr(navigate, location.key, "/");

  const buy = async () => {
    if (busy) return;
    if (preview) { toast(TOAST_PREVIEW); return; }
    if (!billingAvailable()) { toast(TOAST_NO_BILLING); return; }
    if (!chosen.offer) { toast(TOAST_NO_OFFERS); return; }
    setBusy(true);
    const r = await purchase(chosen.offer);
    setBusy(false);
    if (r.status === "plus") toast(r.plan.tier === "trial" ? TOAST_TRIAL_STARTED : TOAST_STARTED);
    else if (r.status === "pending") toast(TOAST_PENDING);
    else if (r.status === "error") toast(toastFailed(r.code));
  };

  const restore = async () => {
    if (busy) return;
    if (preview) { toast(TOAST_PREVIEW); return; }
    if (!billingAvailable()) { toast(TOAST_NO_BILLING); return; }
    setBusy(true);
    const plan = await restorePurchases();
    setBusy(false);
    toast(plan ? TOAST_RESTORED : TOAST_RESTORE_NONE);
  };

  const gothic = "font-gothic";

  // 이미 열린 계정의 상자 문구
  const stateTitle = tier === "trial" ? STATE_TRIAL : tier === "plus" ? STATE_PLUS : tier === "special" ? STATE_SPECIAL : STATE_ADMIN;
  const stateSub = !staff && paidUntil > 0 ? stateUntilText(shortDate(paidUntil), tier === "trial") : STATE_STAFF_SUB;

  const noteLines = trialText ? noteTrialLines(trialText, chosen.priceForNote) : NOTE_NO_TRIAL_LINES;
  const ctaLabel = trialText ? ctaTrial(trialText) : chosen.key === "yearly" ? CTA_YEARLY : CTA_MONTHLY;

  return (
    <div className="min-h-[100dvh] max-w-lg mx-auto flex flex-col font-body" style={{ backgroundColor: "#FFFFFF", color: C.ink, lineHeight: "normal" }}>
      <div className="flex justify-end shrink-0" style={{ padding: "8px 8px 0" }}>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.closeBg, color: C.gray }}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col" style={{ padding: "0 24px", gap: 22 }}>
        <div>
          <h1 className="font-word m-0" style={{ fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.2 }} aria-label={PLUS_TITLE}>
            {PLUS_TITLE_BRAND} <span style={{ color: C.gold }}>{PLUS_TITLE_MARK}</span>
          </h1>
          <p className={gothic} style={{ margin: "8px 0 0", fontSize: "0.875rem", lineHeight: 1.6, color: C.lead, wordBreak: "keep-all" }}>
            {PLUS_LEAD_LINES.map((l, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                {l}
              </span>
            ))}
          </p>
        </div>

        <ul className="m-0 p-0 list-none flex flex-col" style={{ gap: 13 }}>
          {PLUS_PERKS.map((p) => (
            <li key={p.title} className="flex items-center" style={{ gap: 12 }}>
              <span
                className="flex items-center justify-center"
                style={{ flex: "none", width: 36, height: 36, borderRadius: 11, backgroundColor: C.goldBg, color: C.gold }}
              >
                <PerkIcon name={p.icon} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                  {p.title}
                  {p.note ? <span style={{ marginLeft: 5, fontWeight: 500, color: C.gray }}>{p.note}</span> : null}
                </span>
                <span className={"block " + gothic} style={{ marginTop: 1, fontSize: "0.78125rem", color: C.gray }}>
                  {p.sub}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {entitled ? (
          <div
            className="flex items-center"
            style={{ borderRadius: 16, border: "2px solid " + C.gold, backgroundColor: C.goldBg, padding: "14px 16px", gap: 12 }}
          >
            <span
              className="flex items-center justify-center"
              style={{ flex: "none", width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, color: "#FFFFFF" }}
            >
              <CheckIcon />
            </span>
            <span className="flex-1 min-w-0">
              <span className={"block " + gothic} style={{ fontSize: "0.96875rem", fontWeight: 700 }}>{stateTitle}</span>
              <span className={"block " + gothic} style={{ marginTop: 2, fontSize: "0.8125rem", color: C.gray }}>{stateSub}</span>
            </span>
          </div>
        ) : (
          <div role="radiogroup" aria-label="요금제" className="flex flex-col" style={{ gap: 10 }}>
            {cards.map((c) => {
              const on = c.key === selected;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelected(c.key)}
                  className="relative flex items-center text-left"
                  style={{
                    borderRadius: 16,
                    border: on ? "2px solid " + C.gold : "1.5px solid " + C.line,
                    backgroundColor: on ? C.goldBg : "#FFFFFF",
                    boxSizing: "border-box",
                    padding: "14px 16px",
                    gap: 12,
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      flex: "none",
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      border: "2px solid " + (on ? C.gold : C.radioOff),
                      boxSizing: "border-box",
                    }}
                  >
                    {on ? <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold }} /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={"block " + gothic} style={{ fontSize: "0.96875rem", fontWeight: 700 }}>{c.label}</span>
                    <span className={"block " + gothic} style={{ marginTop: 2, fontSize: "0.8125rem", color: C.gray }}>{c.sub}</span>
                  </span>
                  {c.right ? (
                    <span className={gothic} style={{ fontSize: "0.9375rem", fontWeight: 700, color: on ? C.goldInk : C.ink }}>
                      {c.right}
                    </span>
                  ) : null}
                  {c.badge ? (
                    <span
                      className={"absolute " + gothic}
                      style={{
                        top: -11,
                        right: 14,
                        height: 22,
                        padding: "0 9px",
                        borderRadius: 11,
                        backgroundColor: C.gold,
                        color: "#FFFFFF",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        lineHeight: "22px",
                      }}
                    >
                      {c.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="flex flex-col items-center shrink-0"
        style={{ padding: "14px 24px 0", paddingBottom: "max(18px, env(safe-area-inset-bottom))", gap: 10 }}
      >
        {entitled ? (
          <button
            type="button"
            onClick={() => (!staff && !preview && billingAvailable() ? manageSubscription() : close())}
            className={"w-full " + gothic}
            style={{ height: 52, borderRadius: 16, backgroundColor: C.gold, color: "#FFFFFF", fontSize: "0.96875rem", fontWeight: 700 }}
          >
            {!staff && !preview && billingAvailable() ? CTA_MANAGE : CTA_CLOSE}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={buy}
              disabled={busy}
              className={"w-full flex items-center justify-center gap-2 disabled:opacity-60 " + gothic}
              style={{ height: 52, borderRadius: 16, backgroundColor: C.gold, color: "#FFFFFF", fontSize: "0.96875rem", fontWeight: 700 }}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {ctaLabel}
            </button>
            <p className={"m-0 text-center " + gothic} style={{ fontSize: "0.75rem", lineHeight: 1.55, color: C.gray }}>
              {noteLines.map((l, i) => (
                <span key={i}>
                  {i > 0 ? <br /> : null}
                  {l}
                </span>
              ))}
            </p>
          </>
        )}
        <p className={"m-0 text-center " + gothic} style={{ fontSize: "0.71875rem", lineHeight: 1.5, color: C.faint }}>
          {NOTE_AI_VOICE}
        </p>
        <div className={"flex " + gothic} style={{ marginTop: 4, gap: 16, fontSize: "0.75rem", color: C.lead }}>
          <button type="button" onClick={restore} disabled={busy} style={{ textDecoration: "underline" }}>
            {LINK_RESTORE}
          </button>
          <a href={TERMS_URL} style={{ textDecoration: "underline" }}>{LINK_TERMS}</a>
          <a href={PRIVACY_URL} style={{ textDecoration: "underline" }}>{LINK_PRIVACY}</a>
        </div>
      </div>
    </div>
  );
};

export default Plus;
