// src/components/PlusLockBox.tsx
// 무료 사용자에게 보이는 Plus 안내 상자 (귤색) — 게임방·이야기·인도네시아 이해·내 정보가 같은 모양을 씁니다.
// 시안 G2·ST2·IN2·ME2 공통: 바탕 #FFF6DC · 테두리 #F1E0AE · 설명 #6E5612 · 버튼 #8A6A12 "Plus / 7일 무료 체험".
// 다듬기 스토리 S56(같은 기능 같은 모양)에서 네 곳의 복사본을 이 하나로 모았습니다.
// 홈의 "Kata kata Plus" 줄(시안 H5)은 꽃 아이콘이 붙은 다른 시안이라 여기 들지 않습니다.

interface Props {
  /** 첫 줄 (15px 굵게, 한 줄) */
  title: string;
  /** 설명 두 줄 */
  lines: [string, string];
  /** 버튼(또는 상자 전체)을 눌렀을 때 — 보통 구독 화면(PAYWALL_PATH)으로 */
  onClick: () => void;
  /** true 면 상자 전체가 눌림 (내 정보 회원 구역) */
  wholeBox?: boolean;
}

const PlusLockBox = ({ title, lines, onClick, wholeBox = false }: Props) => (
  <div
    role={wholeBox ? "button" : undefined}
    tabIndex={wholeBox ? 0 : undefined}
    onClick={wholeBox ? onClick : undefined}
    onKeyDown={wholeBox ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    className={"rounded-[18px] border border-[#F1E0AE] bg-[#FFF6DC] py-3.5 pr-3.5 pl-[22px]" + (wholeBox ? " active:opacity-90" : "")}
  >
    <p className="m-0 text-[0.875rem] font-semibold text-[#1D1F1E] whitespace-nowrap overflow-hidden text-ellipsis">
      {title}
    </p>
    <div className="mt-1.5 flex items-stretch gap-3">
      <span className="flex-1 min-w-0 font-gothic text-[0.6875rem] leading-[1.55] text-[#6E5612] break-keep">
        {lines[0]}
        <br />
        {lines[1]}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="shrink-0 px-3.5 rounded-xl bg-[#8A6A12] text-white font-gothic text-[0.65625rem] font-bold leading-[1.25] active:opacity-90"
      >
        Plus
        <br />
        7일 무료 체험
      </button>
    </div>
  </div>
);

export default PlusLockBox;
