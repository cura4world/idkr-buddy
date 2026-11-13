// src/lib/plan.ts
// 공개판 등급 — 모든 화면은 잠금 판단을 이 파일로만 합니다.
//
//   free    무료
//   trial   7일 무료 체험 중 (Plus 기능은 모두 열림, 한도는 절반)
//   plus    Plus 구독
//   special Special Member (회원키)
//   admin   관리자
//
// 스토어 앱이 아니면(관리자판·회원판) 지금처럼 모두 열려 있어야 하므로 "admin" 을 돌려줍니다.
// 회원키도 예전 설정도 없는 브라우저 방문자는 이 판단까지 오지 않습니다 — 앱 대신 안내 화면을 봅니다
// (2026-11-14, src/components/WebGate.tsx).
// 미리보기 APK 에서는 미리보기 패널의 전환값을 따릅니다(src/lib/preview.ts).

import { useEffect, useState } from "react";
import { isStoreApp } from "@/lib/platform";
import { getSession, onSessionChange } from "@/lib/account";

export type Tier = "free" | "trial" | "plus" | "special" | "admin";

export const PAYWALL_PATH = "/plus";

export const TIER_LABEL: Record<Tier, string> = {
  free: "무료",
  trial: "Plus 체험 중",
  plus: "Plus",
  special: "Special Member",
  admin: "관리자",
};

const PREVIEW_TIER_KEY = "kata-preview-tier";
const tierListeners = new Set<() => void>();

/** 미리보기 빌드인지 (빌드 변수 VITE_PREVIEW=1). */
export function isPreviewBuild(): boolean {
  try {
    return import.meta.env.VITE_PREVIEW === "1";
  } catch (e) {
    return false;
  }
}

/** 미리보기 패널에서 고른 등급. 미리보기 빌드가 아니면 null. */
export function getPreviewTier(): Tier | null {
  if (!isPreviewBuild()) return null;
  try {
    const v = localStorage.getItem(PREVIEW_TIER_KEY);
    if (v === "free" || v === "trial" || v === "plus" || v === "special" || v === "admin") return v;
  } catch (e) {}
  // 아직 고르지 않았으면 관리자 — 출시 전 검사에서 잠김 없이 모든 화면을 보도록(2026-11-11 사용자 요청).
  // 무료·Plus 화면은 미리보기 패널에서 골라 확인합니다.
  return "admin";
}

export function setPreviewTier(t: Tier): void {
  try {
    localStorage.setItem(PREVIEW_TIER_KEY, t);
  } catch (e) {}
  tierListeners.forEach((l) => {
    try { l(); } catch (e) {}
  });
}

export function getTier(): Tier {
  const pv = getPreviewTier();
  if (pv) return pv;
  if (!isStoreApp()) return "admin";
  const s = getSession();
  if (!s) return "free";
  // 저장된 세션에 plan 이 없거나 깨져 있어도 화면이 죽지 않게 빈 값으로 받습니다(무료로 봄 — 출시 전 점검 C-03).
  const p = (s.plan && typeof s.plan === "object" ? s.plan : {}) as { tier?: string; until?: number; trial?: boolean };
  // special·admin 은 until 0 이 무기한. 기한이 있으면 지난 뒤에는 무료로 봅니다(서버도 같은 판단).
  const live = typeof p.until === "number" && p.until > Date.now();
  if (p.tier === "admin" && (!p.until || live)) return "admin";
  if (p.tier === "special" && (!p.until || live)) return "special";
  // 서버는 체험을 {tier:"trial", trial:true} 로 줍니다. 예전 모양 {tier:"plus", trial:true} 도 받습니다.
  if ((p.tier === "plus" || p.tier === "trial") && live) {
    return p.trial || p.tier === "trial" ? "trial" : "plus";
  }
  return "free";
}

export function hasPlus(): boolean {
  return getTier() !== "free";
}

export function isStaffTier(): boolean {
  const t = getTier();
  return t === "special" || t === "admin";
}

export function onTierChange(fn: () => void): () => void {
  tierListeners.add(fn);
  const off = onSessionChange(() => fn());
  return () => {
    tierListeners.delete(fn);
    off();
  };
}

export function usePlan(): { tier: Tier; plus: boolean; staff: boolean } {
  const [tier, setTier] = useState<Tier>(getTier());
  useEffect(() => onTierChange(() => setTier(getTier())), []);
  return { tier, plus: tier !== "free", staff: tier === "special" || tier === "admin" };
}
