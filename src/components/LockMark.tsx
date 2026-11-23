// src/components/LockMark.tsx
// 잠긴 항목 옆의 작은 자물쇠 — 앱 전체에서 이 하나만 씁니다(2026-11-23 Arga: "잠금 표시는 앱 전체에서 같은 모양").
// 모양은 공개판 홈 잠금 표시(H5 시안의 LockMark)와 같습니다. 누르면 같은 안내 창(openPlusLock)이 뜨게 하는 것은 부르는 쪽 몫.

interface Props {
  /** 한 변 길이(px). 목록 줄 14, 큰 줄 16 */
  size?: number;
  /** 어두운 바탕 위(지도 카드 등)에서는 흰색 계열로 */
  color?: string;
  className?: string;
}

export const LOCK_MARK_COLOR = "#8F7E4E";

const LockMark = ({ size = 14, color = LOCK_MARK_COLOR, className = "" }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    aria-label="잠김"
    role="img"
    className={"shrink-0 " + className}
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export default LockMark;
