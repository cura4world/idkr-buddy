// src/pages/Plus.tsx
// Kata kata Plus (구독) 화면 — 시안 PW1(7일 무료 체험, 연간 기본 선택)·PW2(체험을 이미 쓴 계정) 그대로.
//   · 혜택 5줄(귤색 아이콘 상자) → 요금제 2칸(연간·월간 라디오 카드) → 황금갈색 버튼 하나 → 안내 → 링크
//   · 가격·체험은 Play 에서 받은 값만(src/lib/playOffers.ts). 정식 스토어 앱에서 아직 못 받았으면 가격 자리는
//     "가격을 불러오는 중", 구독 버튼은 누를 수 없음. 고정 원화 가격은 미리보기 빌드의 대체값으로만 씀
//   · 연간 카드는 실제 청구액("연 34,800원")을 크게, 월 환산("(월 2,900원)" = 연 가격 ÷ 12)을 작게
//   · 버튼 바로 아래 첫 줄은 자동 결제 고지("해지 전까지 매년/매달 자동으로 결제됩니다.")
//   · 결제는 끝났는데 서버 확인이 아직이면 "결제는 완료되었습니다. 확인 중입니다." — 자동으로 다시 확인(billing.ts)
//   · 이미 열린 계정(체험 중·Plus·Special·관리자)은 요금제 대신 "이용 중" 상자
// 문구는 src/lib/plusCopy.ts, 등급은 src/lib/plan.ts.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import { getSession, onSessionChange, PublicSession } from "@/lib/account";
import { isPreviewBuild, isReviewAccount, usePlan } from "@/lib/plan";
import {
  billingAvailable,
  isVerifyingPurchase,
  manageSubscription,
  onVerifyEvent,
  PlanOffer,
  purchase,
  restoreDetailed,
} from "@/lib/billing";
import { loadOffers, usePlusPricing } from "@/lib/playOffers";
import { getCategories, getWords } from "@/lib/store";
import { isFaithWordbook } from "@/lib/wordbookAccess";
import {
  CTA_CLOSE,
  CTA_MANAGE,
  CTA_MONTHLY,
  CTA_VERIFYING,
  CTA_YEARLY,
  ctaTrial,
  discountBadge,
  isOtherAccountCode,
  LINK_PRICE_RETRY,
  LINK_PRIVACY,
  LINK_RESTORE,
  LINK_TERMS,
  NOTE_AI_VOICE,
  NOTE_PRICE_FAILED,
  NOTE_TRIAL_HALF,
  STATE_REVIEW_SUB,
  NOTE_PRICE_LOADING,
  NOTE_VERIFYING_LINES,
  noteNoTrialLines,
  noteTrialLines,
  perMonthNote,
  PLAN_MONTHLY_LABEL,
  PLAN_MONTHLY_SUB,
  PLAN_YEARLY_LABEL,
  PLAN_YEARLY_SUB,
  PLUS_LEAD_LINES,
  PLUS_PERKS,
  PLUS_TITLE,
  PLUS_TITLE_BRAND,
  PLUS_TITLE_MARK,
  PlusPerkIcon,
  PRICE_FAILED,
  PRICE_LOADING,
  STATE_ADMIN,
  STATE_PLUS,
  STATE_SPECIAL,
  STATE_STAFF_SUB,
  STATE_TRIAL,
  stateUntilText,
  TOAST_NO_BILLING,
  TOAST_NO_OFFERS,
  TOAST_OTHER_ACCOUNT,
  TOAST_PENDING,
  TOAST_PREVIEW,
  TOAST_RESTORE_NONE,
  TOAST_RESTORE_RETRY,
  TOAST_RESTORED,
  TOAST_STARTED,
  TOAST_TRIAL_STARTED,
  TOAST_VERIFYING,
  toastFailed,
  wordCountNote,
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

// 가격·체험 계산(원화 표기, 월 환산, 할인율, 미리보기 대체값)은 src/lib/playOffers.ts 에 있습니다.

type PlanKey = "yearly" | "monthly";

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
  /** 실제 청구액 — 큰 글자. "연 34,800원" · "월 3,900원". 아직 못 받았으면 "" */
  price: string;
  /** 연간의 월 환산 — 작은 덧말 "(월 2,900원)". 없으면 "" */
  priceNote: string;
  badge: string;
  offer: PlanOffer | null;
  /** 체험 기간 "7일" · 체험 제안이 없으면 "" */
  trial: string;
}

const Plus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tier } = usePlan();
  const [session, setSession] = useState<PublicSession | null>(getSession());
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState<boolean>(() => isVerifyingPurchase());
  const preview = isPreviewBuild();
  const pricing = usePlusPricing();

  useEffect(() => onSessionChange(setSession), []);

  // 결제는 끝났는데 서버 확인이 아직인 동안 "확인 중" 안내를 보여 줍니다. 성공·중단 알림은 LoginGate 가 띄웁니다.
  useEffect(() => onVerifyEvent((e) => setVerifying(e.type === "verifying")), []);

  // 이 화면을 열 때마다 Play 가격·체험 제안을 새로 받습니다(받는 동안에는 앞서 받은 값을 보여 줌).
  // 못 받은 채로 화면에 돌아오면 다시 받습니다.
  useEffect(() => {
    loadOffers(true);
    const onVisible = () => {
      try {
        if (document.visibilityState === "visible") loadOffers();
      } catch (e) {}
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const priceReady = pricing.state === "ready";

  // 혜택 첫 줄의 단어 수 — 홈 "단어장" 줄과 같은 방식으로 기본 단어장 34권(성경과 신앙 묶음 제외)의 단어를 셉니다.
  // 두 화면의 숫자가 다르게 보이지 않게 하려는 것입니다(출시 전 점검 C-12). 세지 못하면 plusCopy 의 고정 덧말을 씁니다.
  const basicWordCount = useMemo(() => {
    try {
      const ids = new Set(
        getCategories()
          .filter((c) => c.isShared && !c.owner && !isFaithWordbook(c))
          .map((c) => c.id),
      );
      let n = 0;
      const words = getWords();
      for (let i = 0; i < words.length; i++) {
        if (ids.has(words[i].categoryId)) n++;
      }
      return n;
    } catch (e) {
      return 0;
    }
  }, []);

  const cards: PlanCard[] = useMemo(() => [
    {
      key: "yearly",
      label: PLAN_YEARLY_LABEL,
      sub: PLAN_YEARLY_SUB,
      price: pricing.yearlyPrice ? "연 " + pricing.yearlyPrice : "",
      priceNote: pricing.yearlyPerMonth ? perMonthNote(pricing.yearlyPerMonth) : "",
      badge: pricing.discountPercent > 0 ? discountBadge(pricing.discountPercent) : "",
      offer: pricing.yearlyOffer,
      trial: pricing.trialYearly,
    },
    {
      key: "monthly",
      label: PLAN_MONTHLY_LABEL,
      sub: PLAN_MONTHLY_SUB,
      price: pricing.monthlyPrice ? "월 " + pricing.monthlyPrice : "",
      priceNote: "",
      badge: "",
      offer: pricing.monthlyOffer,
      trial: pricing.trialMonthly,
    },
  ], [
    pricing.yearlyPrice, pricing.yearlyPerMonth, pricing.discountPercent, pricing.yearlyOffer, pricing.trialYearly,
    pricing.monthlyPrice, pricing.monthlyOffer, pricing.trialMonthly,
  ]);

  const chosen = cards.find((c) => c.key === selected) || cards[0];
  // 체험 문구는 Play 체험 제안이 있을 때만(미리보기는 "체험 이미 사용" 스위치). 가격을 못 받았으면 보이지 않습니다.
  const trialText = priceReady && chosen.price ? chosen.trial : "";
  // 정식 스토어 앱에서는 Play 가격을 받은 요금제만 살 수 있습니다. 미리보기는 눌러도 결제하지 않습니다.
  const canBuy = priceReady && !!chosen.price && (preview || !!chosen.offer);

  const entitled = tier !== "free";
  const staff = tier === "special" || tier === "admin";
  const paidUntil = session && (session.plan.tier === "plus" || session.plan.tier === "trial") ? session.plan.until : 0;

  const close = () => goBackOr(navigate, location.key, "/");

  const buy = async () => {
    if (busy || verifying) return;
    if (preview) { toast(TOAST_PREVIEW); return; }
    if (!billingAvailable()) { toast(TOAST_NO_BILLING); return; }
    if (!chosen.offer) { toast(TOAST_NO_OFFERS); return; }
    setBusy(true);
    const r = await purchase(chosen.offer);
    setBusy(false);
    if (r.status === "plus") toast(r.restored ? TOAST_RESTORED : r.plan.tier === "trial" ? TOAST_TRIAL_STARTED : TOAST_STARTED);
    // 결제는 끝났고 서버 확인만 남음 — 다시 결제하라고 하지 않습니다. 자동으로 다시 확인합니다(billing.ts).
    else if (r.status === "verifying") toast(TOAST_VERIFYING);
    else if (r.status === "pending") toast(TOAST_PENDING);
    else if (r.status === "error") toast(toastFailed(r.code));
  };

  const restore = async () => {
    if (busy) return;
    if (preview) { toast(TOAST_PREVIEW); return; }
    if (!billingAvailable()) { toast(TOAST_NO_BILLING); return; }
    setBusy(true);
    const r = await restoreDetailed();
    setBusy(false);
    if (r.status === "plus") toast(TOAST_RESTORED);
    else if (r.status === "verifying") toast(TOAST_VERIFYING);
    else if (r.status === "none") toast(TOAST_RESTORE_NONE);
    else toast(isOtherAccountCode(r.code) ? TOAST_OTHER_ACCOUNT : TOAST_RESTORE_RETRY);
  };

  const gothic = "font-gothic";

  // 이미 열린 계정의 상자 문구
  const stateTitle = tier === "trial" ? STATE_TRIAL : tier === "plus" ? STATE_PLUS : tier === "special" ? STATE_SPECIAL : STATE_ADMIN;
  // 심사용 계정은 Plus 와 같은 화면에 "심사용 계정" 한 줄(구독이 아니라 결제·해지할 것이 없음).
  // 해지한 구독(autoRenew false)은 "자동 갱신" 대신 "…까지 이용 · 자동 갱신 꺼짐".
  const review = isReviewAccount();
  const autoRenew = !(session && session.plan.autoRenew === false);
  const stateSub = review
    ? STATE_REVIEW_SUB
    : !staff && paidUntil > 0 ? stateUntilText(shortDate(paidUntil), tier === "trial", autoRenew) : STATE_STAFF_SUB;
  // 구독 관리(Google Play)로 보낼 수 있는 계정인가 — 실제 구독이 있는 계정만
  const canManage = !staff && !review && !preview && billingAvailable();

  const yearlyChosen = chosen.key === "yearly";
  // 버튼 아래 안내 — 첫 줄은 자동 결제 고지. 결제 확인 중·가격을 못 받았을 때는 그 안내로 바꿉니다.
  const noteLines = verifying
    ? NOTE_VERIFYING_LINES
    : !canBuy
      ? [pricing.state === "failed" ? NOTE_PRICE_FAILED : NOTE_PRICE_LOADING]
      : trialText
        ? noteTrialLines(trialText, chosen.price, yearlyChosen)
        : noteNoTrialLines(yearlyChosen);
  const ctaLabel = verifying ? CTA_VERIFYING : trialText ? ctaTrial(trialText) : yearlyChosen ? CTA_YEARLY : CTA_MONTHLY;
  const priceMissing = pricing.state === "failed" ? PRICE_FAILED : PRICE_LOADING;

  return (
    // 2026-11-14 U-01: 이 화면에는 하단 탭 막대가 뜨므로 최소 높이에서 막대 높이를 뺍니다(빼지 않으면 버튼·약관 링크가 막대 뒤로 밀림).
    <div
      className="max-w-lg mx-auto flex flex-col font-body"
      style={{ minHeight: "calc(100dvh - var(--kata-tabbar-h, 0px))", backgroundColor: "#FFFFFF", color: C.ink, lineHeight: "normal" }}
    >
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

      {/* 2026-11-13 사용자 요청: 위쪽 글자 한 단계 작게, 구독 버튼 높이 52→48(안내 문구부터 끝까지는 그대로).
          위쪽 어떤 글자도 아래 안내 문구(0.75rem)보다 작지 않습니다. 영역 gap 22→18, 요금·상태 상자 안쪽 위아래 14→12. */}
      <div className="flex-1 min-h-0 flex flex-col" style={{ padding: "0 24px", gap: 18 }}>
        <div>
          <h1 className="font-word m-0" style={{ fontSize: "1.625rem", fontWeight: 600, lineHeight: 1.2 }} aria-label={PLUS_TITLE}>
            {PLUS_TITLE_BRAND} <span style={{ color: C.gold }}>{PLUS_TITLE_MARK}</span>
          </h1>
          <p className={gothic} style={{ margin: "8px 0 0", fontSize: "0.8125rem", lineHeight: 1.6, color: C.lead, wordBreak: "keep-all" }}>
            {PLUS_LEAD_LINES.map((l, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                {l}
              </span>
            ))}
          </p>
        </div>

        <ul className="m-0 p-0 list-none flex flex-col" style={{ gap: 13 }}>
          {PLUS_PERKS.map((p) => {
            const note = p.icon === "book" && basicWordCount > 0 ? wordCountNote(basicWordCount) : p.note;
            return (
            <li key={p.title} className="flex items-center" style={{ gap: 12 }}>
              <span
                className="flex items-center justify-center"
                style={{ flex: "none", width: 36, height: 36, borderRadius: 11, backgroundColor: C.goldBg, color: C.gold }}
              >
                <PerkIcon name={p.icon} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  {p.title}
                  {note ? <span style={{ marginLeft: 5, fontWeight: 500, color: C.gray }}>{note}</span> : null}
                </span>
                <span className={"block " + gothic} style={{ marginTop: 1, fontSize: "0.75rem", color: C.gray }}>
                  {p.sub}
                </span>
              </span>
            </li>
            );
          })}
        </ul>

        {entitled ? (
          <div
            className="flex items-center"
            style={{ borderRadius: 16, border: "2px solid " + C.gold, backgroundColor: C.goldBg, padding: "12px 16px", gap: 12 }}
          >
            <span
              className="flex items-center justify-center"
              style={{ flex: "none", width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, color: "#FFFFFF" }}
            >
              <CheckIcon />
            </span>
            <span className="flex-1 min-w-0">
              <span className={"block " + gothic} style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{stateTitle}</span>
              <span className={"block " + gothic} style={{ marginTop: 2, fontSize: "0.75rem", color: C.gray }}>{stateSub}</span>
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
                    padding: "12px 16px",
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
                    <span className={"block " + gothic} style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{c.label}</span>
                    <span className={"block " + gothic} style={{ marginTop: 2, fontSize: "0.75rem", color: C.gray }}>{c.sub}</span>
                  </span>
                  {/* 실제 청구액을 크게, 연간의 월 환산은 그 아래 작게(Play 구독 정책: 연간을 월 단가 위주로 보이지 않음) */}
                  {c.price ? (
                    <span className={"flex flex-col items-end " + gothic} style={{ flex: "none" }}>
                      <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: on ? C.goldInk : C.ink }}>{c.price}</span>
                      {c.priceNote ? (
                        <span style={{ marginTop: 2, fontSize: "0.6875rem", color: C.gray }}>{c.priceNote}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className={gothic} style={{ flex: "none", fontSize: "0.75rem", color: C.faint }}>{priceMissing}</span>
                  )}
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
            onClick={() => (canManage ? manageSubscription() : close())}
            className={"w-full " + gothic}
            style={{ height: 52, borderRadius: 16, backgroundColor: C.gold, color: "#FFFFFF", fontSize: "0.96875rem", fontWeight: 700 }}
          >
            {canManage ? CTA_MANAGE : CTA_CLOSE}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={buy}
              disabled={busy || verifying || !canBuy}
              className={"w-full flex items-center justify-center gap-2 disabled:opacity-60 " + gothic}
              style={{ height: 48, borderRadius: 16, backgroundColor: C.gold, color: "#FFFFFF", fontSize: "0.90625rem", fontWeight: 700 }}
            >
              {busy || verifying ? <Loader2 size={18} className="animate-spin" /> : null}
              {ctaLabel}
            </button>
            <p
              className={"m-0 text-center " + gothic}
              role={verifying ? "status" : undefined}
              style={{ fontSize: "0.75rem", lineHeight: 1.55, color: C.gray, wordBreak: "keep-all" }}
            >
              {noteLines.map((l, i) => (
                <span key={i}>
                  {i > 0 ? <br /> : null}
                  {l}
                </span>
              ))}
              {!verifying && pricing.state === "failed" ? (
                <>
                  {" "}
                  <button type="button" onClick={() => loadOffers(true)} style={{ textDecoration: "underline", color: C.lead }}>
                    {LINK_PRICE_RETRY}
                  </button>
                </>
              ) : null}
            </p>
          </>
        )}
        <p className={"m-0 text-center " + gothic} style={{ fontSize: "0.71875rem", lineHeight: 1.5, color: C.faint, wordBreak: "keep-all" }}>
          {/* 체험으로 시작할 수 있을 때는 체험 한도가 절반이라는 것도 함께 알립니다(B-10) */}
          {!entitled && !verifying && trialText ? (
            <>
              {NOTE_TRIAL_HALF}
              <br />
            </>
          ) : null}
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
