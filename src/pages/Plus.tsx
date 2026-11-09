// src/pages/Plus.tsx
// Kata kata Plus (구독) 화면 — 스토어 앱 전용. 디자인은 2026-11 게슈탈트 개선안(구독 화면′)을 따릅니다.
//   · 선택 상태는 라디오 + 채운 배경, 절약 배지는 카드 모서리 위로 따로
//   · 그룹 안은 좁게, 그룹 사이는 넓게
//   · 닫기 버튼은 진하게, 주인공 버튼은 하나
// 가격은 Play 에서 받은 값을 그대로 씁니다. 문구는 src/lib/plusCopy.ts.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import { getSession, onSessionChange, PublicSession } from "@/lib/account";
import {
  billingAvailable,
  manageSubscription,
  periodText,
  PlanOffer,
  purchase,
  queryOffers,
  restorePurchases,
} from "@/lib/billing";
import { PLUS_FOOTNOTE, PLUS_LEAD, PLUS_PERKS, PLUS_TITLE } from "@/lib/plusCopy";

function isYearly(o: PlanOffer): boolean {
  return o.billingPeriod === "P1Y";
}

function shortDate(t: number): string {
  const d = new Date(t);
  return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
}

const Plus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<PublicSession | null>(getSession());
  const [offers, setOffers] = useState<PlanOffer[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

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
      const plans = Object.keys(byPlan).map((k) => byPlan[k]);
      plans.sort((a, b) => (isYearly(a) === isYearly(b) ? 0 : isYearly(a) ? -1 : 1));
      setOffers(plans);
      if (plans.length > 0) setSelected(plans[0].basePlanId);
    });
    return () => { alive = false; };
  }, []);

  const close = () => goBackOr(navigate, location.key, "/");
  const isPlus = !!session && session.plan.tier === "plus" && session.plan.until > Date.now();
  const chosen = offers ? offers.find((o) => o.basePlanId === selected) || null : null;

  const buy = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    const r = await purchase(chosen);
    setBusy(false);
    if (r.status === "plus") toast("Plus 가 시작됐어요. 고맙습니다!");
    else if (r.status === "pending") toast("결제가 확인되면 Plus 가 켜집니다");
    else if (r.status === "error") toast("구독을 마치지 못했어요. 잠시 뒤 다시 시도해 주세요 (" + r.code + ")");
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const plan = await restorePurchases();
    setBusy(false);
    toast(plan ? "구독을 다시 연결했어요" : "이 Google 계정으로 산 구독을 찾지 못했어요");
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col" style={{ backgroundColor: "#F7F5F0" }}>
      <div className="px-2 pt-2 flex justify-end">
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="w-11 h-11 rounded-full flex items-center justify-center text-foreground"
          style={{ backgroundColor: "#EAE6DD" }}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-[30px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-word text-[1.875rem] font-semibold leading-tight text-foreground" aria-label={PLUS_TITLE}>
            Kata kata<span className="text-accent">.</span> Plus
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/75">{PLUS_LEAD}</p>
        </div>

        <ul className="flex flex-col gap-3">
          {PLUS_PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <span className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#DDEBE8" }}>
                <Check size={14} strokeWidth={3} style={{ color: "#1F5A51" }} />
              </span>
              <span className="text-[0.9375rem] text-foreground">{p}</span>
            </li>
          ))}
        </ul>

        {isPlus ? (
          <div className="rounded-2xl border-2 p-4" style={{ borderColor: "#104B60", backgroundColor: "#E6F0F2" }}>
            <p className="font-gothic text-base font-bold text-foreground">Plus 이용 중</p>
            <p className="mt-1 text-[0.8125rem] text-foreground/75">{shortDate(session!.plan.until)}까지 (자동 갱신)</p>
          </div>
        ) : !billingAvailable() ? (
          <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
            구독은 Google Play 에서 받은 앱에서만 할 수 있어요.
          </p>
        ) : offers === null ? (
          <div className="flex items-center gap-2 text-[0.875rem] text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> 요금제를 불러오는 중...
          </div>
        ) : offers.length === 0 ? (
          <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
            지금은 요금제를 불러오지 못했어요. 인터넷을 확인하고 다시 열어 주세요.
          </p>
        ) : (
          <div role="radiogroup" aria-label="요금제" className="flex flex-col gap-2.5">
            {offers.map((o) => {
              const on = o.basePlanId === selected;
              const trial = periodText(o.freeTrialPeriod);
              return (
                <button
                  key={o.basePlanId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelected(o.basePlanId)}
                  className="relative rounded-2xl p-4 flex items-center gap-3 text-left"
                  style={
                    on
                      ? { border: "2px solid #104B60", backgroundColor: "#E6F0F2" }
                      : { border: "1.5px solid #DAD4C8", backgroundColor: "#FFFFFF" }
                  }
                >
                  <span
                    className="shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                    style={{ border: "2px solid " + (on ? "#104B60" : "#9AA2A8") }}
                  >
                    {on ? <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#104B60" }} /> : null}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-gothic text-base font-bold text-foreground">{isYearly(o) ? "연간" : "월간"}</span>
                    <span className="text-[0.8125rem] text-foreground/75">
                      {o.formattedPrice} / {periodText(o.billingPeriod)}
                    </span>
                  </span>
                  {trial ? (
                    <span
                      className="absolute -top-[11px] right-3.5 h-[22px] px-2.5 rounded-full font-gothic text-[0.6875rem] font-bold leading-[22px]"
                      style={{ backgroundColor: "#FBE3D4", color: "#9A3E12" }}
                    >
                      {trial} 무료 체험
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 pt-4 pb-[max(18px,env(safe-area-inset-bottom))] flex flex-col items-center gap-5">
        <div className="w-full flex flex-col items-center gap-2">
          {isPlus ? (
            <button
              type="button"
              onClick={() => manageSubscription()}
              className="w-full h-14 rounded-full text-base text-white"
              style={{ backgroundColor: "#104B60" }}
            >
              구독 관리 (Google Play)
            </button>
          ) : (
            <button
              type="button"
              onClick={buy}
              disabled={!chosen || busy}
              className="w-full h-14 rounded-full text-base text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: "#104B60" }}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {chosen ? (isYearly(chosen) ? "연간으로 시작하기" : "월간으로 시작하기") : "구독 시작하기"}
            </button>
          )}
          <p className="text-[0.75rem] leading-relaxed text-muted-foreground text-center">{PLUS_FOOTNOTE}</p>
        </div>
        <div className="flex gap-[18px] font-gothic text-[0.75rem] text-foreground/75">
          {billingAvailable() ? (
            <button type="button" onClick={restore} disabled={busy} className="underline">
              구매 복원
            </button>
          ) : null}
          <a href={TERMS_URL} className="underline">이용약관</a>
          <a href={PRIVACY_URL} className="underline">개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
};

export default Plus;
