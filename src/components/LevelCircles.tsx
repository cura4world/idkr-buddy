// src/components/LevelCircles.tsx
// 난이도 하/중/상 동그라미 (아래 점 1~3개). 쉬움·보통·어려움 같은 글자는 쓰지 않습니다.
// 시안: ST1-List(이야기, 60px · 세 칸 고르게) / PC4-Make(회화집 만들기, 46px · 가운데 모음).
// 이야기와 회화집 만들기만 씁니다.

export type LevelValue = "하" | "중" | "상";

const LEVELS: { v: LevelValue; n: number }[] = [
  { v: "하", n: 1 },
  { v: "중", n: 2 },
  { v: "상", n: 3 },
];

interface Props {
  value: LevelValue;
  onChange: (v: LevelValue) => void;
  /** "story" = 60px 동그라미를 세 칸에 고르게, "make" = 46px 동그라미를 가운데로 모아 */
  variant: "story" | "make";
  disabled?: boolean;
}

const LevelCircles = ({ value, onChange, variant, disabled }: Props) => {
  const big = variant === "story";
  const size = big ? 60 : 46;
  const wrapClass = big ? "grid grid-cols-3 gap-2" : "flex justify-center gap-7";
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
            disabled={disabled}
            onClick={() => onChange(v)}
            className={"flex flex-col items-center " + (big ? "gap-2" : "gap-1.5")}
          >
            <span
              className={
                "box-border flex items-center justify-center rounded-full font-gothic font-bold " +
                (big ? "text-[1.1875rem]" : "text-[1rem]")
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
                  className="h-1.5 w-1.5 rounded-full"
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
