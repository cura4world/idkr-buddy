// src/lib/useCompactPill.ts
// 화면 헤더의 "제목 + 오른쪽 알약 버튼(+ 단어 추가 / + 회화집 만들기)" 에서, 자리가 모자라면
// 제목을 자르지 않고 알약을 아이콘만 남은 동그라미로 줄입니다 (QA Q09 — 360px·글자 125%).
//
//   const titleRef = useRef<HTMLHeadingElement>(null);
//   const pillRef = useRef<HTMLButtonElement>(null);
//   const labelRef = useRef<HTMLSpanElement>(null);
//   const compact = useCompactPill(titleRef, pillRef, labelRef);
//
// 글자가 보일 때 알약은 min-w-9 + overflow-hidden 으로 줄어들 수 있게 두고, 제목(h1)은
// min-width: fit-content 로 줄지 않게 둡니다. 제목은 flex-1 이라 남는 자리를 모두 가집니다. 알약이 쓸 수 있는 폭 =
// 지금 알약 폭 + (제목 상자 폭 - 제목 글자 폭). 알약을 줄이거나 늘려도 이 합은 그대로라 깜빡이지 않습니다.
// 글자 붙은 알약의 폭은 처음(글자가 보일 때) 재어 둡니다.

import { RefObject, useLayoutEffect, useRef, useState } from "react";

export function useCompactPill(
  titleRef: RefObject<HTMLElement>,
  pillRef: RefObject<HTMLElement>,
  labelRef: RefObject<HTMLElement>,
  /** 제목·알약이 화면에 있을 때 true (데이터를 늦게 읽어 나중에 나타나는 화면용) */
  active: boolean = true
): boolean {
  const [compact, setCompact] = useState(false);
  const fullW = useRef(0);
  const compactRef = useRef(false);

  useLayoutEffect(() => {
    if (!active) return;
    const title = titleRef.current;
    const pill = pillRef.current;
    if (!title || !pill) return;
    let range: Range | null = null;
    const check = () => {
      try {
        const pw = pill.getBoundingClientRect().width;
        // 글자가 보이는 동안: 알약은 줄어들 수 있고(overflow hidden) 넘친 글자 폭은 scrollWidth 에 남습니다.
        if (!compactRef.current && labelRef.current) fullW.current = Math.max(pw, pill.scrollWidth);
        if (!fullW.current) return;
        if (!range) range = document.createRange();
        range.selectNodeContents(title);
        const textW = range.getBoundingClientRect().width;
        const slack = Math.max(0, title.clientWidth - textW);
        const next = pw + slack < fullW.current - 0.5;
        if (next !== compactRef.current) {
          compactRef.current = next;
          setCompact(next);
        }
      } catch (e) {
        // 재지 못하면 그대로 둡니다
      }
    };
    check();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => check());
      if (title.parentElement) ro.observe(title.parentElement);
      ro.observe(title);
    } catch (e) {
      ro = null;
    }
    return () => { try { ro?.disconnect(); } catch (e) {} };
  }, [titleRef, pillRef, labelRef, active]);

  return compact;
}
