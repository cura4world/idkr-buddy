// src/lib/fontScale.ts
// 앱 전체 글자 크기 배율. 루트(html) font-size를 조정하면 rem 기반 텍스트가 모두 비례합니다.
// 폰마다 각자 localStorage에 저장됩니다.

const KEY = "app-font-scale-step";

// 단계: 0~6 (기본 3 = 100%). 한 단계 = 5%.
const STEPS = [0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15];
const DEFAULT_STEP = 3;
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
