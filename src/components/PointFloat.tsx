// src/components/PointFloat.tsx
// 점수가 확정되는 순간에만 "+N"이 잠깐 떠올랐다 사라집니다. 소리 없음.
// 읽기 화면에는 이것 말고 어떤 표시도 두지 않습니다 (타이머·게이지 없음).
// 게임 화면(GameMatch/GameOX)은 각자 로컬 구현을 그대로 씁니다.

import { useEffect, useState } from "react";

interface Props {
  value: number;
  seq: number; // 이 값이 바뀔 때마다 처음부터 다시 재생됩니다
}

const LIFE_MS = 1200;

const Float = ({ value }: { value: number }) => {
  const [on, setOn] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // 마운트 직후 값이 바뀌어야 transition이 걸립니다 (rAF 2번)
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOn(true));
    });
    const t = window.setTimeout(() => setGone(true), LIFE_MS);
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
      window.clearTimeout(t);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 font-gothic text-sm font-semibold text-primary"
      style={{
        top: "4.25rem",
        opacity: on ? 0 : 1,
        transform: on ? "translate(-50%, -12px)" : "translate(-50%, 0)",
        transition: "opacity 1s linear, transform 1s ease-out",
      }}
    >
      +{value}
    </div>
  );
};

export default function PointFloat({ value, seq }: Props) {
  if (!value || !seq) return null;
  // key를 바꿔 새로 마운트시키면 연출이 처음부터 다시 재생됩니다
  return <Float key={seq} value={value} />;
}
