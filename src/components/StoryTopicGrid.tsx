// src/components/StoryTopicGrid.tsx
// 이야기 주제 고르기 — 5×2 격자의 청록 선 아이콘 칸 (2026-11-22 사용자 결정, 시안 "B안 수정").
// 고른 칸은 청록으로 채우고 아이콘·글자를 흰색/청록 굵게 바꿉니다. 하/중/상(LevelCircles)과 같은 카드 안에 놓입니다.
// 아이콘은 직접 그린 선 그림입니다(동화=달과 별, 문화=와양의 구능안, 역사=스투파, 명절=달력과 별 — 특정 종교 상징은 쓰지 않음).

import type { ReactNode } from "react";
import { STORY_TOPIC_KEYS, STORY_TOPIC_LABEL, StoryTopicKey } from "@/lib/story";

const TEAL = "#2C6D63";

const SW = 2.8; // 48 칸 기준 선 굵기

const P = ({ d, fill }: { d: string; fill?: string }) => (
  <path d={d} fill={fill || "none"} stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
);

const ICONS: Record<StoryTopicKey, ReactNode> = {
  all: (
    <>
      <P d="M7 16h7c8 0 12 16 20 16h6" />
      <P d="M7 32h7c8 0 12-16 20-16h6" />
      <P d="M35 11l5 5-5 5" />
      <P d="M35 27l5 5-5 5" />
    </>
  ),
  tale: (
    <>
      <P d="M29 8a16 16 0 1 0 11 27A14 14 0 0 1 29 8z" />
      <P d="M37 9l1.4 2.9 2.9 1.4-2.9 1.4L37 17.6l-1.4-2.9-2.9-1.4 2.9-1.4z" fill="currentColor" />
    </>
  ),
  life: (
    <>
      <P d="M12 21v17h24V21" />
      <P d="M7 23L24 9l17 14" />
      <P d="M21 38v-9h6v9" />
    </>
  ),
  food: (
    <>
      <P d="M7 23h34a17 14 0 0 1-34 0z" />
      <P d="M18 40h12" />
      <P d="M18 17c-2-3 2-5 0-8M24 17c-2-3 2-5 0-8M30 17c-2-3 2-5 0-8" />
    </>
  ),
  culture: (
    <>
      <P d="M24 6C15 16 10 26 12 35h24c2-9-3-19-12-29z" />
      <P d="M24 15v20M24 22l-5 5M24 22l5 5" />
      <P d="M10 41h28" />
    </>
  ),
  travel: (
    <>
      <P d="M9 17h30v21H9z" />
      <P d="M19 17v-5h10v5" />
      <P d="M17 17v21M31 17v21" />
    </>
  ),
  place: (
    <>
      <P d="M24 42S11 30 11 20a13 13 0 0 1 26 0c0 10-13 22-13 22z" />
      <circle cx="24" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth={SW} />
    </>
  ),
  history: (
    <>
      <P d="M16 29c0-7 3.5-11 8-11s8 4 8 11z" />
      <P d="M24 18V8" />
      <P d="M11 29h26v5H11zM8 34h32v5H8z" />
    </>
  ),
  people: (
    <>
      <circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth={SW} />
      <P d="M10 40c0-8 6-13 14-13s14 5 14 13z" />
    </>
  ),
  holiday: (
    <>
      <P d="M8 13h32v26H8z" />
      <P d="M8 20h32" />
      <P d="M16 8v8M32 8v8" />
      <P d="M24 24.5l1.9 3.8 4.2.6-3 2.9.7 4.2-3.8-2-3.8 2 .7-4.2-3-2.9 4.2-.6z" fill="currentColor" />
    </>
  ),
};

export const StoryTopicIcon = ({ topic, size = 26 }: { topic: StoryTopicKey; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    {ICONS[topic]}
  </svg>
);

interface Props {
  value: StoryTopicKey;
  onChange: (v: StoryTopicKey) => void;
  disabled?: boolean;
}

const StoryTopicGrid = ({ value, onChange, disabled }: Props) => (
  <div className="grid grid-cols-5 gap-x-1 gap-y-2.5" role="radiogroup" aria-label="이야기 주제">
    {STORY_TOPIC_KEYS.map((k) => {
      const on = value === k;
      const label = STORY_TOPIC_LABEL[k];
      return (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={on}
          aria-label={"주제 " + label}
          disabled={disabled}
          onClick={() => onChange(k)}
          className="flex flex-col items-center gap-[5px] min-w-0 disabled:opacity-60"
        >
          <span
            className="box-border w-[50px] h-[50px] rounded-2xl flex items-center justify-center"
            style={{
              background: on ? TEAL : "#F3F6F6",
              border: "1px solid " + (on ? TEAL : "#E6EAEC"),
              color: on ? "#FFFFFF" : TEAL,
            }}
          >
            <StoryTopicIcon topic={k} />
          </span>
          <span
            className="font-gothic text-[0.71875rem] whitespace-nowrap"
            style={{ color: on ? TEAL : "#3B4245", fontWeight: on ? 700 : 500 }}
          >
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

export default StoryTopicGrid;
