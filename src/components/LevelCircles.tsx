// src/components/LevelCircles.tsx
// 난이도 하/중/상 동그라미 (아래 점 1~3개). 쉬움·보통·어려움 같은 글자는 쓰지 않습니다.
// 시안: ST1-List(이야기, 44px · 세 칸 고르게 — 시안은 60px) / PC4-Make(회화집 만들기, 46px · 가운데 모음).
// 2026-11-12: 이야기는 "오늘의 이야기" 제목 오른쪽에 붙이는 "inline"(34px · 오른쪽에 나란히)으로 바꿨습니다.
// 이야기와 회화집 만들기만 씁니다.

export type LevelValue = "하" | "중" | "상";

const DOTS: Record<LevelValue, number> = { 하: 1, 중: 2, 상: 3 };
const ALL: LevelValue[] = ["하", "중", "상"];

interface Props {
  value: LevelValue;
  onChange: (v: LevelValue) => void;
  /**
   * "story" = 44px 동그라미를 세 칸에 고르게,
   * "make" = 46px 동그라미를 가운데로 모아,
   * "inline" = 34px 동그라미를 제목 줄 오른쪽에 나란히 (이야기 화면)
   */
  variant: "story" | "make" | "inline";
  /** 보여 줄 난이도와 순서 (회화집은 lib 의 PERCAKAPAN_LEVELS). 없으면 하·중·상 */
  levels?: readonly LevelValue[];
  disabled?: boolean;
}

const LevelCircles = ({ value, onChange, variant, levels, disabled }: Props) => {
  const LEVELS = (levels && levels.length ? levels : ALL).map((v) => ({ v, n: DOTS[v] || 2 }));
  const big = variant === "story";
  const inline = variant === "inline";
  // 이야기 동그라미는 2026-11-11 사용자 요청으로 글자 두 단계(19→16px)와 함께 60→52px 로 줄였고,
  // 2026-11-12 사용자 요청으로 한 번 더 52→44px 로 줄였습니다.
  // 같은 날 제목 줄 오른쪽으로 옮기면서 S21(360px) 한 줄에 들어가도록 34px 로 맞췄습니다.
  const size = inline ? 34 : big ? 44 : 46;
  // inline 동그라미 사이는 2026-11-12 사용자 요청으로 6→10px (옆 칸을 함께 누르지 않도록)
  const wrapClass = inline ? "flex gap-2.5" : big ? "grid grid-cols-3 gap-2" : "flex justify-center gap-7";
  const textClass = inline ? "text-[0.84375rem]" : big ? "text-[0.90625rem]" : "text-[1rem]";
  const stackGap = inline ? "gap-1" : big ? "gap-2" : "gap-1.5";
  return (
    <div className={wrapClass} role="radiogroup" aria-label="난이도">
      {LEVELS.map(({ v, n }) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={"난이도 " + v}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={"flex flex-col items-center " + stackGap}
          >
            <span
              className={
                "box-border flex items-center justify-center rounded-full font-gothic font-bold " +
                // 이야기 하/중/상 글자는 2026-11-11 사용자 요청으로 한 단계 더 작게(16 → 14.5px)
                textClass
              }
              style={{
                width: size,
                height: size,
                background: on ? "#FFF7EA" : "#FFFFFF",
                border: "1.5px solid " + (on ? "#E7B66C" : "#E6EAEC"),
                boxShadow: on ? "0 2px 8px rgba(201,134,47,0.12)" : "none",
                color: on ? "#7A4A10" : "#1D1F1E",
              }}
            >
              {v}
            </span>
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={inline ? "h-[5px] w-[5px] rounded-full" : "h-1.5 w-1.5 rounded-full"}
                  style={{
                    background: i < n ? (on ? "#C9862F" : "#9AA1A6") : on ? "#F1DDB9" : "#E3E7EA",
                  }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LevelCircles;
