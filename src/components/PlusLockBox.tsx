// src/components/PlusLockBox.tsx
// 무료 사용자에게 보이는 Plus 안내 상자 (귤색) — 게임방·이야기·인도네시아 이해·내 정보가 같은 모양을 씁니다.
// 시안 G2·ST2·IN2·ME2 공통: 바탕 #FFF6DC · 테두리 #F1E0AE · 설명 #6E5612 · 버튼 #8A6A12 "Plus / 자세히 보기".
// 다듬기 스토리 S56(같은 기능 같은 모양)에서 네 곳의 복사본을 이 하나로 모았습니다.
// 홈의 "Kata kata Plus" 줄(시안 H5)은 꽃 아이콘이 붙은 다른 시안이라 여기 들지 않습니다.
// (예전 버튼 둘째 줄 "7일 무료 체험"은 2026-11-23 체험 폐지로 없앴습니다.)
//
// 버튼은 상자 위아래 끝까지(제목 줄부터) 채웁니다 — 버튼 위·아래·오른쪽 여백이 모두 상자 안쪽 여백 14px 로 같습니다
// (2026-11-17 Arga 요청). 그래서 제목은 버튼 왼쪽 칸에 들어가고, 칸보다 길면 줄임표 대신 두 줄로 넘어갑니다.

import { LOCK_BUTTON_SUB } from "@/lib/plusCopy";

interface Props {
  /** 제목 위 작은 줄(선택, 2026-11-25 게임방 "오늘의 단어 퍼즐 외") — Pretendard 11.5px 500 검정, 제목과 사이 1px */
  eyebrow?: string;
  /** 첫 줄 (15px 굵게). 버튼 왼쪽 칸보다 길면 두 줄 */
  title: string;
  /** 설명 두 줄(예전 그대로) 또는 한 줄(2026-11-25 — 넘치면 글자를 줄이지 않고 자연 줄바꿈) */
  lines: [string, string] | [string];
  /** 버튼(또는 상자 전체)을 눌렀을 때 — 보통 구독 화면(PAYWALL_PATH)으로 */
  onClick: () => void;
  /** true 면 상자 전체가 눌림 (내 정보 회원 구역) */
  wholeBox?: boolean;
}

const PlusLockBox = ({ eyebrow, title, lines, onClick, wholeBox = false }: Props) => {
  return (
  <div
    role={wholeBox ? "button" : undefined}
    tabIndex={wholeBox ? 0 : undefined}
    onClick={wholeBox ? onClick : undefined}
    onKeyDown={wholeBox ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    className={"flex items-stretch gap-3 rounded-[18px] border border-[#F1E0AE] bg-[#FFF6DC] py-3.5 pr-3.5 pl-[22px]" + (wholeBox ? " active:opacity-90" : "")}
  >
    <div className="flex-1 min-w-0">
      {eyebrow ? (
        <p data-lock-eyebrow className="m-0 mb-px font-gothic text-[0.71875rem] font-medium leading-[1.4] text-[#1D1F1E] break-keep">
          {eyebrow}
        </p>
      ) : null}
      <p className="m-0 text-[0.875rem] font-semibold leading-[1.4] text-[#1D1F1E] break-keep">
        {title}
      </p>
      <p data-lock-lines className="m-0 mt-1.5 font-gothic text-[0.6875rem] leading-[1.55] text-[#6E5612] break-keep">
        {lines[0]}
        {lines.length > 1 ? (
          <>
            <br />
            {lines[1]}
          </>
        ) : null}
      </p>
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 self-stretch px-3.5 rounded-xl bg-[#8A6A12] text-white font-gothic text-[0.65625rem] font-bold leading-[1.25] active:opacity-90"
    >
      Plus
      <br />
      {LOCK_BUTTON_SUB}
    </button>
  </div>
  );
};

export default PlusLockBox;
