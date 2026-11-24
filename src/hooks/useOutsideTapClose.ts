// src/hooks/useOutsideTapClose.ts
// 떠 있는 작은 상자(내 정보 ⓘ 말풍선, 명찰 요약 상자)를 "바깥 누르기"로 닫습니다(2026-11-24, 말풍선에서 옮겨 와 같이 씀).
//
//   useOutsideTapClose(active, boxRef, onClose, isIgnored?)
//
// - 바깥을 누르면(pointerdown) 닫고, 그 누르기에서 이어지는 click 하나는 먹습니다 — 닫히면서 뒤에 있던 단추가 함께 눌려
//   다른 창이 열리거나 화면이 바뀌지 않게.
// - 상자는 닫히면 click 보다 먼저 사라지므로, 먹는 일은 상자와 따로 사는 한 번짜리 리스너(swallowNextClick)가 합니다.
// - isIgnored(대상) 가 true 인 곳(여는 단추 등)은 바깥으로 치지 않습니다 — 그 단추가 스스로 열고 닫습니다.

import { useEffect } from "react";
import type { RefObject } from "react";

/** 다음 click 하나를 먹습니다(600ms 안에 오지 않으면 그냥 풀림). */
export function swallowNextClick(): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const done = () => {
    try { document.removeEventListener("click", onClick, true); } catch (e) {}
    if (timer) clearTimeout(timer);
  };
  try { document.addEventListener("click", onClick, true); } catch (e) {}
  timer = setTimeout(done, 600);
}

export function useOutsideTapClose(
  active: boolean,
  boxRef: RefObject<HTMLElement>,
  onClose: () => void,
  isIgnored?: (target: Element) => boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node | null;
      if (!n) return;
      if (boxRef.current && boxRef.current.contains(n)) return;
      const el = (n as Element).closest ? (n as Element) : n.parentElement;
      if (el && isIgnored && isIgnored(el)) return;
      swallowNextClick();
      onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [active, boxRef, onClose, isIgnored]);
}
