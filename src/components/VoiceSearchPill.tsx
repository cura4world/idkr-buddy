// src/components/VoiceSearchPill.tsx
// 검색창 오른쪽의 "음성 검색 언어(한/IN) | 마이크" 한 알약 (2026-11-24 Arga).
// 홈 검색창·관리자판 홈 검색창·사전 검색창이 같이 씁니다 — 세 곳 모양을 이것 하나로 맞춥니다.
//
//   · 알약 바탕은 예전 "한" 칸의 #EEF3F2 하나만, 양 끝은 높이의 절반으로 완전히 둥글게
//   · 좌우 반반: 왼쪽 = 한/IN 글자, 오른쪽 = 마이크. 칸을 34px | 1px 세로선 | 34px 로 나눠 세로선이 정확히 가운데
//   · 크기는 px 고정 — 글자 크기 설정(85~125%)에 따라 커지지 않아 입력칸을 좁히지 않습니다
//   · 글자(11px·700·#2C6D63)와 마이크(18px, 평소 #646C72 · 듣는 중 #DC2626)는 예전 그대로

import type { ReactNode } from "react";

const PILL_H = 34;
const HALF_W = 34;
const DIVIDER_H = 17; // 알약 높이의 절반

interface VoiceSearchPillProps {
  langLabel: string;
  onToggleLang: () => void;
  langAriaLabel?: string;
  langTitle?: string;
  onMic: () => void;
  listening: boolean;
  micAriaLabel?: string;
  micTitle?: string;
  /** 마이크 아이콘(18px) — 화면마다 쓰던 것을 그대로 넘깁니다 */
  micIcon: ReactNode;
}

const VoiceSearchPill = ({
  langLabel,
  onToggleLang,
  langAriaLabel,
  langTitle,
  onMic,
  listening,
  micAriaLabel,
  micTitle,
  micIcon,
}: VoiceSearchPillProps) => (
  <div
    className="shrink-0 grid items-center overflow-hidden"
    style={{
      gridTemplateColumns: HALF_W + "px 1px " + HALF_W + "px",
      height: PILL_H,
      borderRadius: PILL_H / 2,
      background: "#EEF3F2",
    }}
    data-voice-pill=""
  >
    <button
      type="button"
      // 입력칸의 포커스(키보드)를 빼앗지 않습니다
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggleLang}
      aria-label={langAriaLabel}
      title={langTitle}
      className="h-full flex items-center justify-center font-gothic"
      style={{ color: "#2C6D63", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}
    >
      {langLabel}
    </button>
    <span aria-hidden="true" style={{ width: 1, height: DIVIDER_H, background: "#B9CCC8" }} />
    <button
      type="button"
      onClick={onMic}
      aria-label={micAriaLabel}
      title={micTitle}
      className="h-full flex items-center justify-center"
      style={{ color: listening ? "#DC2626" : "#646C72" }}
    >
      {micIcon}
    </button>
  </div>
);

export default VoiceSearchPill;
