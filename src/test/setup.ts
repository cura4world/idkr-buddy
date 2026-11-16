// vitest 전용 진입점: 화면 검사 도구(toBeInTheDocument 등)를 vitest 의 expect 에 붙이고 타입도 함께 붙입니다.
// (vitest 5 로 올리며 바꿈 — 예전 진입점은 타입이 vitest 에 붙지 않아 tsc 가 실패. 2026-11-17)
import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
