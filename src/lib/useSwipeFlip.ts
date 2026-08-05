// src/lib/useSwipeFlip.ts
// 장문 화면(묵상·성경·기도·뉴스·이야기)에서 좌우 스와이프로 앞/뒤를 뒤집습니다.
//
// 단어를 탭하면 뜻 팝업이 뜨는 화면들이라, 스와이프 직후에 딸려 오는 클릭을
// 걸러내야 합니다. shouldIgnoreTap()을 단어 팝업 함수 첫 줄에서 확인하세요.

import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { hasLiveSelection } from "@/lib/phraseSelect";

/** 가로 이동이 이만큼 넘어야 스와이프로 봅니다 (px) */
const MIN_X = 60;
/** 세로 이동보다 가로 이동이 이 배수 이상이어야 합니다 (스크롤과 구분) */
const RATIO = 1.4;
/** 스와이프 뒤 이 시간 동안은 탭을 무시합니다 (ms) */
const SUPPRESS_MS = 450;

export interface SwipeFlip {
  swipeHandlers: {
    onTouchStart: (e: ReactTouchEvent) => void;
    onTouchEnd: (e: ReactTouchEvent) => void;
    onTouchCancel: () => void;
  };
  /** true면 이번 탭은 스와이프에 딸려 온 것이므로 무시해야 합니다 */
  shouldIgnoreTap: () => boolean;
}

export function useSwipeFlip(onFlip: () => void, enabled: boolean = true): SwipeFlip {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressRef = useRef(0);

  const onTouchStart = (e: ReactTouchEvent) => {
    if (!enabled) return;
    if (e.touches.length !== 1) { startRef.current = null; return; }
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!enabled || !start) return;
    if (e.changedTouches.length === 0) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) < MIN_X) return;
    if (Math.abs(dx) < Math.abs(dy) * RATIO) return; // 세로 스크롤로 봅니다
    // 본문 글자를 고르는 중이면 뒤집지 않습니다.
    // 꾹 누른 채 옆으로 끌어 두 단어를 고르는 동작이 스와이프로 잡히던 문제입니다.
    if (hasLiveSelection()) return;

    suppressRef.current = Date.now() + SUPPRESS_MS;
    onFlip();
  };

  const onTouchCancel = () => {
    startRef.current = null;
  };

  const shouldIgnoreTap = () => Date.now() < suppressRef.current;

  return {
    swipeHandlers: { onTouchStart, onTouchEnd, onTouchCancel },
    shouldIgnoreTap,
  };
}
