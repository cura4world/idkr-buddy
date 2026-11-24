// src/components/PlusMoreButton.tsx
// "Plus / 자세히 보기" 두 줄 금색 알약 — 홈 맨 아래 Plus 카드와 내 정보 회원 칸이 같은 것을 씁니다(2026-11-25).
// 모양은 홈 Plus 카드 시안(H5) 그대로: 높이 42 · 좌우 13 · 둥글기 21 · #8A6A12 · 흰 글자 10.5px 굵게.
//   as="span"   — 카드 전체가 이미 단추일 때(홈). 단추 안에 단추를 넣지 않으려고 겉모양만 그립니다
//   as="button" — 이 알약이 단추일 때(내 정보). 화면 읽기 이름은 "Plus 자세히 보기"
// 문구는 plusCopy.ts 의 LOCK_BUTTON_SUB 한 곳.

import { LOCK_BUTTON_SUB } from "@/lib/plusCopy";

export const PLUS_MORE_LABEL = "Plus " + LOCK_BUTTON_SUB;

const PILL_CLASS = "shrink-0 flex items-center justify-center text-center text-white font-gothic";
const PILL_STYLE: React.CSSProperties = {
  height: 42,
  padding: "0 13px",
  borderRadius: 21,
  background: "#8A6A12",
  // 글자 크기는 '오늘의 이야기' 맨 위 Plus 상자 버튼(PlusLockBox 10.5px)과 같게(2026-11-23 Arga 5)
  fontSize: "0.65625rem",
  fontWeight: 700,
  lineHeight: 1.25,
};

interface Props {
  as?: "span" | "button";
  onClick?: () => void;
}

const PlusMoreButton = ({ as = "button", onClick }: Props) => {
  const body = (
    <>
      Plus
      <br />
      {LOCK_BUTTON_SUB}
    </>
  );
  if (as === "span") {
    return (
      <span data-plus-more className={PILL_CLASS} style={PILL_STYLE}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-plus-more
      aria-label={PLUS_MORE_LABEL}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      className={PILL_CLASS + " active:opacity-90"}
      style={PILL_STYLE}
    >
      {body}
    </button>
  );
};

export default PlusMoreButton;
