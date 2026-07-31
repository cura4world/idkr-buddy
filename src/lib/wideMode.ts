// src/lib/wideMode.ts
// "넓게 보기" — 글이 많은 화면의 좌우 폭을 넓힙니다.
// 폴더블을 펼쳤을 때 양옆이 크게 비는 것을 사용자가 직접 눌러 채우도록 한 것이라
// 자동으로 넓히지 않습니다. 화면이 좁으면 아예 켤 수 없습니다.
// 설정은 폰마다 각자 localStorage에 저장됩니다.

import { useCallback, useEffect, useState } from "react";

const KEY = "app-wide-mode";
const MIN_PX = 768; // 이 폭 이상일 때만 "넓게 보기"가 의미가 있습니다

function mediaQuery(): string {
  return "(min-width: " + MIN_PX + "px)";
}

export function getWideMode(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setWideMode(v: boolean): void {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // 무시
  }
}

/** 지금 화면이 넓힐 수 있는 크기인가 */
export function canGoWide(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.matchMedia) return window.matchMedia(mediaQuery()).matches;
    return window.innerWidth >= MIN_PX;
  } catch {
    return false;
  }
}

/**
 * 페이지 컨테이너에 넣을 max-width 클래스.
 * 넓게 보기가 켜져 있고 화면도 충분히 넓을 때만 확장합니다.
 *
 * 두 클래스 이름은 Tailwind가 훑어갈 수 있도록 반드시 이 파일 안에
 * 글자 그대로 있어야 합니다 (조립해서 만들면 CSS에서 빠집니다).
 */
export function pageWidthClass(wide: boolean, canWide: boolean): string {
  return wide && canWide ? "max-w-4xl" : "max-w-lg";
}

/** 페이지에서 쓰는 훅 */
export function useWideMode(): {
  wide: boolean;
  canWide: boolean;
  widthClass: string;
  toggle: () => void;
} {
  const [wide, setWide] = useState<boolean>(() => getWideMode());
  const [canWide, setCanWide] = useState<boolean>(() => canGoWide());

  // 폴더블을 접었다 폈다 할 때 바로 반영되도록 화면 폭 변화를 구독합니다.
  useEffect(() => {
    const onChange = () => setCanWide(canGoWide());

    let mql: MediaQueryList | null = null;
    try {
      if (typeof window !== "undefined" && window.matchMedia) {
        mql = window.matchMedia(mediaQuery());
      }
    } catch {
      mql = null;
    }

    let bound = false;
    if (mql) {
      try {
        if (mql.addEventListener) {
          mql.addEventListener("change", onChange);
          bound = true;
        }
      } catch {
        bound = false;
      }
    }

    // matchMedia가 없거나 addEventListener를 못 쓰는 구형 WebView 폴백
    if (!bound) {
      try {
        window.addEventListener("resize", onChange);
      } catch {
        // 무시
      }
    }

    // 첫 렌더 이후의 실제 폭으로 한 번 맞춥니다
    onChange();

    return () => {
      if (bound && mql) {
        try {
          mql.removeEventListener("change", onChange);
        } catch {
          // 무시
        }
        return;
      }
      try {
        window.removeEventListener("resize", onChange);
      } catch {
        // 무시
      }
    };
  }, []);

  const toggle = useCallback(() => {
    setWide((prev) => {
      const next = !prev;
      setWideMode(next);
      return next;
    });
  }, []);

  return { wide, canWide, widthClass: pageWidthClass(wide, canWide), toggle };
}
