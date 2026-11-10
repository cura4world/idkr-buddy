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
  return "free";
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
  const p = s.plan as { tier?: string; until?: number; trial?: boolean };
  if (p.tier === "admin") return "admin";
  if (p.tier === "special") return "special";
  if (p.tier === "plus" && typeof p.until === "number" && p.until > Date.now()) {
    return p.trial ? "trial" : "plus";
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
