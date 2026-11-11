// src/lib/fontScale.ts
// 앱 전체 글자 크기 배율. 루트(html) font-size를 조정하면 rem 기반 텍스트가 모두 비례합니다.
// 폰마다 각자 localStorage에 저장됩니다.

const KEY = "app-font-scale-step";

import { isStoreApp } from "./platform";

// 단계: 0~8. 한 단계 = 5%.
// 기본값: 관리자판·회원판·브라우저는 3(100%), 공개판(스토어 앱·미리보기)은 2(95%).
// 공개판 첫 실행 글자가 관리자판(같은 폰)보다 한 단계(5%) 크게 보여, 그 크기에 맞춰 한 단계 낮췄습니다(2026-11-11 폰 비교).
// 이미 크기를 고른 기기는 저장된 값을 그대로 씁니다.
const STEPS = [0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15, 1.20, 1.25];
const DEFAULT_STEP = isStoreApp() ? 2 : 3;
const BASE_PX = 16; // 기본 루트 폰트 크기

export function getFontStep(): number {
  try {
    const v = parseInt(localStorage.getItem(KEY) || "", 10);
    if (isNaN(v) || v < 0 || v >= STEPS.length) return DEFAULT_STEP;
    return v;
  } catch {
    return DEFAULT_STEP;
  }
}

export function getStepCount(): number {
  return STEPS.length;
}

// 현재 단계를 실제 화면에 적용
export function applyFontScale(step: number = getFontStep()): void {
  const s = Math.max(0, Math.min(STEPS.length - 1, step));
  try {
    document.documentElement.style.fontSize = (BASE_PX * STEPS[s]) + "px";
  } catch {
    // 무시
  }
}

// 단계를 저장하고 즉시 적용. 반환값: 실제 적용된 단계
export function setFontStep(step: number): number {
  const s = Math.max(0, Math.min(STEPS.length - 1, step));
  try { localStorage.setItem(KEY, String(s)); } catch {}
  applyFontScale(s);
  return s;
}

// 한 단계 올리기/내리기 (범위를 벗어나면 그대로)
export function stepFont(delta: number): number {
  return setFontStep(getFontStep() + delta);
}
