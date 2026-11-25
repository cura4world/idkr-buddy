// src/components/PlusCard.tsx
// "Kata kata Plus" 크림색 카드 — 홈 맨 아래 Plus 카드(시안 H5)의 겉모양을 공용으로 뺐습니다(2026-11-25).
// 홈·내 정보 무료 회원 칸·내 정보 Plus 회원 칸이 함께 씁니다.
//   크림 #FFF6DC · 테두리 #F1E0AE · 둥글기 16 · 왼쪽 흰 칸 32px 안 금색 꽃 · 제목 "Kata kata Plus"(Gowun Dodum 15px) · 둘째 줄(Pretendard 11.5px #6E5612) · 오른쪽 알약
//   as="button"(홈) — 카드 전체가 단추. 알약은 겉모양만(PlusMoreButton as="span")
//   as="div"(내 정보) — 카드는 누르기만 받고, 단추는 안쪽 알약 하나(화면 읽기 이름이 카드 글 전체가 되지 않게)
// 둘째 줄은 덩어리 배열 — " / " 로 잇고, 모자라면 " / " 자리에서만 줄을 넘깁니다(Plus 화면 혜택 설명과 같은 방식).

import type { ReactNode } from "react";
import PlusMoreButton, { PlusManageButton } from "@/components/PlusMoreButton";

/** 카드 안쪽 좌우 여백(px) */
export const PAD_LEFT = 14;
export const PAD_RIGHT = 20;

const FLOWER_PETAL ="M0 0 C8 -6 12 -18 5 -24 C-1 -22 -4 -10 0 0 Z";

export const PlusFlower = () => (
  <span className="shrink-0 flex items-center justify-center bg-white" style={{ width: 32, height: 32, borderRadius: 9 }}>
    <svg width="22" height="22" viewBox="-26 -26 52 52" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d={FLOWER_PETAL} fill="#D9A94A" transform={"rotate(" + r + ")"} />
      ))}
      <circle r="5" fill="#8A6A12" />
    </svg>
  </span>
);

/**
 * " / " 로 이은 덩어리 — 덩어리 안에서는 줄을 넘기지 않음("/"는 앞 덩어리 끝에 붙음).
 * 덩어리가 하나면 그냥 글자로 — inline-block 이 줄 높이를 0.5px 키워 홈 카드 안 글자가 내려앉았음(2026-11-25 전·후 픽셀 비교)
 */
export const ChunkLine = ({ chunks }: { chunks: string[] }) => chunks.length === 1 ? <>{chunks[0]}</> : (
  <>
    {chunks.map((c, i) => (
      <span key={i}>
        <span className="inline-block break-keep">{c}{i < chunks.length - 1 ? " /" : ""}</span>
        {i < chunks.length - 1 ? " " : null}
      </span>
    ))}
  </>
);

interface Props {
  as: "button" | "div";
  onClick: () => void;
  /** 제목 바로 옆 덧말(예: "이용 중") — 넘치면 통째로 다음 줄 */
  titleSuffix?: string;
  /** 둘째 줄 덩어리 */
  sub: string[];
  /** 오른쪽 알약(없으면 null) */
  right: ReactNode;
  /** 위아래 안쪽 여백(홈은 화면 높이에 맞춰 줄어드는 값) */
  padY?: string;
  /** 홈 한 화면 맞춤 기준점(data-fit-anchor) */
  fitAnchor?: string;
  testId?: string;
}

const PlusCard = ({ as, onClick, titleSuffix, sub, right, padY = "11px", fitAnchor, testId }: Props) => {
  const style: React.CSSProperties = {
    gap: 12,
    // 오른쪽 20px(2026-11-25, 예전 12px) — 알약이 카드 끝에서 조금 더 안쪽에. 왼쪽 14px 은 그대로. 세 카드(홈·무료·Plus)가 이 한 곳을 씀
    padding: padY + " " + PAD_RIGHT + "px " + padY + " " + PAD_LEFT + "px",
    background: "#FFF6DC",
    border: "1px solid #F1E0AE",
    borderRadius: 16,
  };
  const body = (
    <>
      <PlusFlower />
      <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
        <span className="flex flex-wrap items-baseline" style={{ columnGap: 6 }}>
          {/* 색·줄 높이는 물려받음 — 홈 카드 모양을 그대로 두려고(2026-11-25 전·후 비교) */}
          <span className="font-body" style={{ fontSize: "0.9375rem", fontWeight: 400 }}>Kata kata Plus</span>
          {titleSuffix ? (
            <span data-plus-suffix className="font-gothic whitespace-nowrap" style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1D1F1E" }}>
              {titleSuffix}
            </span>
          ) : null}
        </span>
        <span data-plus-sub className="font-gothic tabular-nums" style={{ fontSize: "0.71875rem", color: "#6E5612" }}>
          <ChunkLine chunks={sub} />
        </span>
      </span>
      {right}
    </>
  );
  if (as === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        data-fit-anchor={fitAnchor}
        data-testid={testId}
        className="w-full flex items-center text-left active:opacity-90"
        style={style}
      >
        {body}
      </button>
    );
  }
  return (
    <div
      onClick={onClick}
      data-fit-anchor={fitAnchor}
      data-testid={testId}
      className="w-full flex items-center text-left cursor-pointer active:opacity-90"
      style={style}
    >
      {body}
    </div>
  );
};

/** 내 정보 Plus 회원 칸(2026-11-25) — "Kata kata Plus 이용 중" + 둘째 줄(주기 / 다음 결제·해지됨) + "구독 / 관리" 알약. 심사용 계정은 알약 없음 */
export const PlusMemberCard = ({
  review, period, nextText, onOpen, onManage,
}: {
  review: boolean;
  /** "연간"·"월간"(모르면 빈 문자열) */
  period: string;
  /** "다음 결제 2027년 11월 25일" 또는 "정기 결제 취소됨 · …까지 이용"(모르면 빈 문자열) */
  nextText: string;
  onOpen: () => void;
  onManage: () => void;
}) => {
  const sub = review
    ? ["심사용 계정"]
    : [period, nextText].filter((s) => !!s);
  return (
    <PlusCard
      as="div"
      testId="plus-member-card"
      onClick={onOpen}
      titleSuffix="이용 중"
      // 주기도 날짜도 모를 때(서버가 아직 알려 주지 않음)는 한 줄 안내
      sub={sub.length > 0 ? sub : ["모든 기능을 이용할 수 있습니다"]}
      right={review ? null : <PlusManageButton onClick={onManage} />}
    />
  );
};

/** 내 정보 무료 회원 칸 — 둘째 줄 가격 덩어리 + "Plus / 자세히 보기" 알약 */
export const PlusFreeCard = ({ sub, onOpen }: { sub: string[]; onOpen: () => void }) => (
  <PlusCard as="div" testId="plus-free-card" onClick={onOpen} sub={sub} right={<PlusMoreButton onClick={onOpen} />} />
);

export default PlusCard;
