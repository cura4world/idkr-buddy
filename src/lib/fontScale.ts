// src/lib/fontScale.ts
// 앱 전체 글자 크기 배율. 루트(html) font-size를 조정하면 rem 기반 텍스트가 모두 비례합니다.
// 폰마다 각자 localStorage에 저장됩니다.

const KEY = "app-font-scale-step";

// 단계: 0~8 (기본 3 = 100%). 한 단계 = 5%.
const STEPS = [0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15, 1.20, 1.25];
const DEFAULT_STEP = 3;

// 기본 루트 폰트 크기. 2026-11-11 에 16px → 15.2px(예전 95% 크기)로 바꿨습니다.
// 예전 95% 크기가 이제 "100%"이고, 모든 판(관리자판·회원판·공개판·브라우저)의 처음 크기입니다.
const BASE_PX = 15.2;

// 기준을 바꾸기 전에 저장된 단계는 한 단계 위로 옮겨, 그 기기에서 보던 크기를 그대로 둡니다.
// (예전 95% = 2단계 → 새 100% = 3단계. 예전 125% 는 새 125% 로 옮겨 조금 작아집니다.)
// 이 표시가 있으면 이미 옮긴 기기입니다. 백업 묶음에도 함께 담깁니다(transfer.ts).
export const FONT_BASE_KEY = "app-font-scale-base";
const FONT_BASE_VER = "15.2";

function migrateOnce(): void {
  try {
    if (localStorage.getItem(FONT_BASE_KEY) === FONT_BASE_VER) return;
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const v = parseInt(raw, 10);
      if (!isNaN(v) && v >= 0 && v < STEPS.length) {
        localStorage.setItem(KEY, String(Math.min(STEPS.length - 1, v + 1)));
      }
    }
    localStorage.setItem(FONT_BASE_KEY, FONT_BASE_VER);
  } catch {
    // 무시
  }
}

export function getFontStep(): number {
  migrateOnce();
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
    document.documentElement.style.fontSize = (Math.round(BASE_PX * STEPS[s] * 100) / 100) + "px";
  } catch {
    // 무시
  }
}

// 단계를 저장하고 즉시 적용. 반환값: 실제 적용된 단계
export function setFontStep(step: number): number {
  migrateOnce();
  const s = Math.max(0, Math.min(STEPS.length - 1, step));
  try { localStorage.setItem(KEY, String(s)); } catch {}
  applyFontScale(s);
  return s;
}

// 한 단계 올리기/내리기 (범위를 벗어나면 그대로)
export function stepFont(delta: number): number {
  return setFontStep(getFontStep() + delta);
}

// 기준을 바꾸기 전에 만든 백업 묶음의 단계를 막 넣었을 때 부릅니다(transfer.ts).
// 표시를 지우고 다시 옮겨, 넣은 단계를 새 기준으로 한 단계 올립니다.
export function adoptLegacyFontStep(): void {
  try { localStorage.removeItem(FONT_BASE_KEY); } catch {}
  migrateOnce();
  applyFontScale();
}
