// src/components/game/GameKit.tsx
// 게임방과 게임 7종이 함께 쓰는 조각들 — 시안(G1·G2·GM-*)의 색·글자 크기·간격을 한 곳에 모았습니다.
// 게임마다 따로 그리면 같은 "남은 시간" 줄이 화면마다 조금씩 달라지므로, 모양은 여기서만 정합니다.
//
// 글자 크기 (시안 기준):
//   12 라벨 · 13.5 보조 뜻 · 16 상태 숫자·보기 · 18 알약·글자칸 · 22~26 문제 단어 · 44 결과 숫자
// 색: 청록 #2C6D63 / 연청록 #E3EEEC, 단어 글자 #104B60, 본문 #1D1F1E, 보조 #646C72, 흐림 #9AA1A6
// 소리: 게임 안의 짧은 발음은 speakWord() 하나로 냅니다(스토어 앱에서는 AndroidTTS 자리에
// Gemini 음성이 들어가 있으므로 같은 코드로 공용 음성 캐시를 씁니다 — storeTtsShim.ts).

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { MEDALI_COLORS } from "@/lib/medali";

export type GameId = "kata" | "jodoh" | "ox" | "dengar" | "susun" | "eja" | "tangkap";

/** 시안 색 */
export const G = {
  text: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  faint: "#8C9399",
  deep: "#104B60",
  teal: "#2C6D63",
  tealBg: "#E3EEEC",
  tealBd: "#A9CBC2",
  line: "#DDE3E6",
  tile: "#E6EAEC",
  hair: "#E3E8EB",
  track: "#E3E7EA",
  dotOff: "#D5DCDF",
  soft: "#F1F4F5",
  rowLine: "#EEF1F3",
  okBg: "#EEF5F0",
  okBd: "#7FB596",
  ok: "#2E9A5E",
  badBg: "#F8EEEE",
  badBd: "#D49A9A",
  gold: "#E0B04A",
  goldBg: "#FFF6DC",
  goldBd: "#F1E0AE",
  goldText: "#8A6A12",
  goldInk: "#6E5612",
  lock: "#8F7E4E",
} as const;

export const CARD_SHADOW = "0 1px 3px rgba(16,40,50,0.06)";
export const TILE_SHADOW = "0 1px 2px rgba(16,40,50,0.05)";

export interface GameMeta {
  title: string;  // 헤더 (인니어 대문자)
  ko: string;     // 게임방 목록 이름
  name: string;   // 게임방 목록 인니어 이름
  desc: string;   // 게임방 목록 설명
  bg: string;     // 아이콘 타일 바탕
  fg: string;     // 아이콘 색
  path: string;
}

export const GAME_META: Record<GameId, GameMeta> = {
  kata: {
    title: "KATA HARI INI", ko: "오늘의 단어 퍼즐", name: "Kata Hari Ini",
    desc: "다섯 글자 단어를 여섯 번 안에 맞혀 보세요", bg: "#FFF6DC", fg: "#8A6A12", path: "/permainan/kata",
  },
  jodoh: {
    title: "JODOHKAN", ko: "빠른 짝짓기", name: "Jodohkan",
    desc: "같은 뜻끼리 빠르게 연결해 보세요", bg: "#E6F0EC", fg: "#3F7F6E", path: "/permainan/jodoh",
  },
  ox: {
    title: "CEPAT O/X", ko: "스피드 O/X", name: "Cepat O/X",
    desc: "뜻이 맞는지 빠르게 골라 보세요", bg: "#F4EEE2", fg: "#94723A", path: "/permainan/ox",
  },
  dengar: {
    title: "DENGAR", ko: "듣고 고르기", name: "Dengar",
    desc: "발음을 듣고 맞는 단어를 고르세요", bg: "#EBF0E3", fg: "#5C7A3E", path: "/permainan/dengar",
  },
  susun: {
    title: "SUSUN KALIMAT", ko: "문장 조립", name: "Susun Kalimat",
    desc: "단어를 순서대로 놓아 문장을 완성하세요", bg: "#E6EEF4", fg: "#4A6F8F", path: "/permainan/susun",
  },
  eja: {
    title: "EJA", ko: "철자 채우기", name: "Eja",
    desc: "뜻을 보고 빈칸에 글자를 채우세요", bg: "#ECEAF3", fg: "#665A8C", path: "/permainan/eja",
  },
  tangkap: {
    title: "TANGKAP", ko: "단어 받기", name: "Tangkap",
    desc: "떨어지는 단어의 뜻을 골라 받으세요", bg: "#F4EAE6", fg: "#9A5E4A", path: "/permainan/tangkap",
  },
};

/** 게임방 목록 순서 — 오늘의 단어 퍼즐이 맨 위 */
export const GAME_ORDER: GameId[] = ["kata", "jodoh", "ox", "dengar", "susun", "eja", "tangkap"];

// ── 아이콘 (시안의 선 그림 그대로) ────────────────────────────────

interface SvgProps {
  size?: number;
  sw?: number | string;
  fill?: string;
  stroke?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export const Svg = ({ size = 16, sw = 2, fill = "none", stroke = "currentColor", children, style }: SvgProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={style}
  >
    {children}
  </svg>
);

export const GameIcon = ({ id, size = 22 }: { id: GameId; size?: number }) => {
  const sw = 1.9;
  switch (id) {
    case "kata":
      return (
        <Svg size={size} sw={sw}>
          <rect x="2.5" y="8" width="5.5" height="8" rx="1.2" />
          <rect x="9.25" y="8" width="5.5" height="8" rx="1.2" />
          <rect x="16" y="8" width="5.5" height="8" rx="1.2" />
        </Svg>
      );
    case "jodoh":
      return (
        <Svg size={size} sw={sw}>
          <path d="M9 7H6a5 5 0 0 0 0 10h3M15 7h3a5 5 0 0 1 0 10h-3M8 12h8" />
        </Svg>
      );
    case "ox":
      return (
        <Svg size={size} sw={sw}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
        </Svg>
      );
    case "dengar":
      return (
        <Svg size={size} sw={sw}>
          <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
          <path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
        </Svg>
      );
    case "susun":
      return (
        <Svg size={size} sw={sw}>
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
        </Svg>
      );
    case "eja":
      return (
        <Svg size={size} sw={sw}>
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </Svg>
      );
    case "tangkap":
    default:
      return (
        <Svg size={size} sw={sw}>
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="12" r="5.5" />
          <circle cx="12" cy="12" r="1.6" />
        </Svg>
      );
  }
};

export const IconClock = ({ size = 15 }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconCheck = ({ size = 15, sw = 2 }: { size?: number; sw?: number }) => (
  <Svg size={size} sw={sw}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconStar = ({ size = 13, color = G.gold }: { size?: number; color?: string }) => (
  <Svg size={size} sw={0} fill={color} stroke={color}>
    <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z" />
  </Svg>
);

export const IconFlame = ({ size = 15, color = "#E8875A" }: { size?: number; color?: string }) => (
  <Svg size={size} sw={0} fill={color} stroke="none">
    <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" />
  </Svg>
);

export const IconSpeaker = ({ size = 30, small = false }: { size?: number; small?: boolean }) => (
  <Svg size={size}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    {small ? <path d="M16 9a4 4 0 0 1 0 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
  </Svg>
);

export const IconHeart = ({ on, size = 18 }: { on: boolean; size?: number }) => (
  <Svg size={size} sw={1.8} fill={on ? "#C98B6B" : "none"} stroke={on ? "#C98B6B" : "#D5DADD"}>
    <path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z" />
  </Svg>
);

export const IconBackspace = ({ size = 18 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M21 5H9l-7 7 7 7h12z" />
    <path d="m18 9-6 6M12 9l6 6" />
  </Svg>
);

export const IconChevron = ({ size = 17 }: { size?: number }) => (
  <Svg size={size} stroke="#B7BDC1">
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const IconLock = ({ size = 17 }: { size?: number }) => (
  <Svg size={size} stroke={G.lock}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

const IconBack = () => (
  <Svg size={20}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

// ── 화면 틀 ───────────────────────────────────────────────────────

/** 게임 화면 머리 — 뒤로가기 + 게임 아이콘 타일 + 인니어 대문자 제목 */
export const GameHeader = ({ id }: { id: GameId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const m = GAME_META[id];
  return (
    <header
      className="sticky top-0 z-30 bg-background text-foreground h-14 shrink-0 px-4 flex items-center gap-2.5"
      style={{ borderBottom: "1px solid " + G.hair }}
    >
      <button
        type="button"
        onClick={() => goBackOr(navigate, location.key, "/permainan")}
        className="w-10 h-10 -ml-2 flex items-center justify-center shrink-0 active:opacity-60"
        title="뒤로"
        aria-label="뒤로"
      >
        <IconBack />
      </button>
      <span
        className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0"
        style={{ background: m.bg, color: m.fg }}
      >
        <GameIcon id={id} size={17} />
      </span>
      <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
        {m.title}
      </h1>
    </header>
  );
};

/** 게임 화면 전체 — 머리 + 본문(세로로 꽉 채움) */
export const GameScreen = ({ id, children }: { id: GameId; children: ReactNode }) => (
  <div className="min-h-[100dvh] w-full max-w-lg mx-auto overflow-x-clip bg-background text-foreground flex flex-col">
    <GameHeader id={id} />
    <div
      className="flex-1 min-h-0 flex flex-col px-4 pt-2"
      style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  </div>
);

/** 남은 시간·맞힌 수 줄 */
export const StatusRow = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <div className="h-10 shrink-0 flex items-center justify-between">
    {left}
    {right}
  </div>
);

export const Stat = ({
  icon,
  label,
  value,
}: {
  icon: "clock" | "check" | "none";
  label: string;
  value: ReactNode;
}) => (
  <span className="relative flex items-center gap-1.5" style={{ color: G.sub }}>
    {icon === "clock" ? <IconClock /> : icon === "check" ? <IconCheck /> : null}
    <span className="font-gothic text-[11px]">{label}</span>
    <span className="font-word text-[15px] font-semibold tabular-nums" style={{ color: G.text }}>
      {value}
    </span>
  </span>
);

/** 문제 진행 점 — 지난 것은 청록, 지금 것은 길게 */
export const Dots = ({ n, cur }: { n: number; cur: number }) => {
  const list: number[] = [];
  for (let i = 0; i < n; i++) list.push(i);
  return (
    <div className="flex items-center gap-[5px]" aria-label={cur + 1 + " / " + n}>
      {list.map((i) => (
        <span
          key={i}
          className="h-1.5 rounded-[3px]"
          style={{
            width: i === cur ? 18 : 6,
            background: i <= cur ? G.teal : G.dotOff,
            transition: "width 200ms ease",
          }}
        />
      ))}
    </div>
  );
};

export const TimeBar = ({ pct }: { pct: number }) => (
  <div className="h-1.5 shrink-0 rounded-[3px] overflow-hidden" style={{ background: G.track }}>
    <div
      className="h-full rounded-[3px]"
      style={{
        width: Math.max(0, Math.min(100, pct)) + "%",
        background: G.teal,
        transition: "width 200ms linear",
      }}
    />
  </div>
);

/** "0:42" */
export const mmss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" + r : String(r));
};

export const PrimaryButton = ({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "h-[50px] rounded-2xl font-gothic text-[14px] font-semibold text-white active:opacity-90 " + (className || "")
    }
    style={{ background: G.teal }}
  >
    {children}
  </button>
);

export const SecondaryButton = ({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "h-[50px] rounded-2xl bg-white font-gothic text-[14px] font-semibold active:bg-[#F1F4F5] " + (className || "")
    }
    style={{ border: "1px solid " + G.line, color: G.text }}
  >
    {children}
  </button>
);

export const GameLoading = () => (
  <p className="pt-16 text-center font-gothic text-[13px]" style={{ color: G.mute }}>
    준비 중입니다
  </p>
);

/** 단어가 모자라 판을 못 열 때 */
export const GameEmpty = ({ text, sub }: { text: string; sub?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="mt-2 rounded-[20px] bg-white px-5 py-10 text-center" style={{ boxShadow: CARD_SHADOW }}>
      <p className="text-[15px] font-semibold" style={{ color: G.text }}>
        {text}
      </p>
      <p className="mt-1.5 font-gothic text-[12px] leading-relaxed" style={{ color: G.sub }}>
        {sub || "사전에서 단어를 찾아보거나 단어장에 담아 보세요"}
      </p>
      <PrimaryButton onClick={() => navigate("/dictionary")} className="mt-6 w-full max-w-[14rem]">
        사전으로
      </PrimaryButton>
    </div>
  );
};

/** 시작 전 안내 카드 */
export const GameReady = ({
  id,
  lines,
  onStart,
}: {
  id: GameId;
  lines: string[];
  onStart: () => void;
}) => {
  const m = GAME_META[id];
  return (
    <div
      className="mt-2 rounded-[20px] bg-white px-5 pt-8 pb-6 flex flex-col items-center text-center"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <span
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: m.bg, color: m.fg }}
      >
        <GameIcon id={id} size={26} />
      </span>
      <p className="mt-4 text-[16.5px] font-semibold" style={{ color: G.text }}>
        {m.ko}
      </p>
      <p className="mt-0.5 font-word text-[12px]" style={{ color: G.faint }}>
        {m.name}
      </p>
      <div className="mt-3 space-y-0.5">
        {lines.map((l) => (
          <p key={l} className="font-gothic text-[12.5px] leading-relaxed" style={{ color: G.sub }}>
            {l}
          </p>
        ))}
      </div>
      <PrimaryButton onClick={onStart} className="mt-6 w-full">
        시작
      </PrimaryButton>
    </div>
  );
};

// "+3" 같은 점수 표시가 위로 떠오르며 사라집니다. (소리 없음)
export const FloatPoint = ({ text }: { text: string }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <span
      className="pointer-events-none absolute left-full top-0 ml-1 font-gothic text-[0.8125rem] font-semibold"
      style={{
        color: MEDALI_COLORS.emas,
        opacity: on ? 0 : 1,
        transform: on ? "translateY(-12px)" : "translateY(0)",
        transition: "opacity 1s linear, transform 1s ease-out",
      }}
    >
      {text}
    </span>
  );
};

// ── 결과 화면 (GM-Result) ─────────────────────────────────────────

export type ResultSource = "wordbook" | "lookup" | "seed";

export const SOURCE_LABEL: Record<ResultSource, string> = {
  wordbook: "단어장",
  lookup: "찾아본",
  seed: "기본",
};

export interface ResultRow {
  word: string;
  meaning: string;
  source: ResultSource;
  correct: boolean;
}

interface ResultProps {
  label: string;           // "받은 단어"
  value: ReactNode;        // 31
  best: boolean;           // 이번 판이 최고 기록인가
  bestText?: string;       // 최고가 아닐 때 보여 줄 기존 최고 ("최고 31개")
  gained: number;          // 이번에 쌓인 불꽃 점수 (0이면 표시 없음)
  floatOn: boolean;
  starWords: string[];     // 이번에 별이 된 단어
  rows: ResultRow[];
  onAgain: () => void;
}

export const GameResult = ({ label, value, best, bestText, gained, floatOn, starWords, rows, onAgain }: ResultProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="flex-1 flex flex-col gap-3 pt-2">
      <div className="rounded-[20px] bg-white px-4 pt-[26px] pb-[22px] text-center" style={{ boxShadow: CARD_SHADOW }}>
        <p className="font-gothic text-[11px] font-semibold" style={{ color: G.mute }}>
          {label}
        </p>
        <p className="mt-1.5 flex justify-center">
          <span
            className="relative font-word text-[40.5px] font-semibold leading-none tabular-nums"
            style={{ color: G.teal }}
          >
            {value}
            {floatOn && gained > 0 ? <FloatPoint text={"+" + gained} /> : null}
          </span>
        </p>
        {best ? (
          <p
            className="mt-3 mx-auto inline-flex items-center gap-[5px] h-[26px] px-[11px] rounded-[13px] font-gothic text-[11px] font-bold"
            style={{ background: G.goldBg, color: G.goldText }}
          >
            <IconStar size={12} />
            최고 기록
          </p>
        ) : bestText ? (
          <p
            className="mt-3 mx-auto inline-flex items-center h-[26px] px-[11px] rounded-[13px] font-gothic text-[11px] font-semibold"
            style={{ background: G.soft, color: G.sub }}
          >
            {bestText}
          </p>
        ) : null}
      </div>

      {starWords.length > 0 ? (
        <div className="rounded-[20px] bg-white px-4 py-3.5" style={{ boxShadow: CARD_SHADOW }}>
          <p className="flex items-center gap-1.5 font-gothic text-[11px] font-semibold" style={{ color: G.sub }}>
            <IconStar size={13} />
            별이 된 단어
          </p>
          <p className="mt-1.5 font-word text-[15.5px] font-semibold break-words" style={{ color: G.deep }}>
            {starWords.join(", ")}
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="rounded-[20px] bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
          {rows.map((r, i) => (
            <div
              key={r.word + i}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom: i === rows.length - 1 ? "none" : "1px solid " + G.rowLine,
                opacity: r.correct ? 1 : 0.45,
              }}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-word text-[15.5px] font-semibold truncate" style={{ color: G.deep }}>
                  {r.word}
                </span>
                <span className="block mt-0.5 font-gothic text-[12.5px] truncate" style={{ color: G.sub }}>
                  {r.meaning}
                </span>
              </span>
              <span
                className="shrink-0 h-6 px-[9px] rounded-xl flex items-center font-gothic text-[10.5px] font-medium"
                style={{ background: G.soft, color: G.sub }}
              >
                {SOURCE_LABEL[r.source]}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-3 flex gap-2.5">
        <SecondaryButton onClick={() => goBackOr(navigate, location.key, "/permainan")} className="flex-1">
          게임방으로
        </SecondaryButton>
        <PrimaryButton onClick={onAgain} className="flex-1">
          한 판 더
        </PrimaryButton>
      </div>
    </div>
  );
};

// ── 소리 ──────────────────────────────────────────────────────────

/** 짧은 발음. 폰 음성(스토어 앱은 Gemini 음성) 우선, 없으면 브라우저 음성. 실패해도 게임은 계속됩니다. */
export const speakWord = (text: string, rate = 1): void => {
  const w = window as unknown as { AndroidTTS?: { speak: (t: string, l: string) => void; stop?: () => void } };
  if (w.AndroidTTS) {
    try {
      try { w.AndroidTTS.stop?.(); } catch (e) { /* 무시 */ }
      w.AndroidTTS.speak(text, "id-ID");
      return;
    } catch (e) { /* 폴백으로 넘어갑니다 */ }
  }
  try {
    window.speechSynthesis?.cancel?.();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = rate;
    window.speechSynthesis?.speak?.(u);
  } catch (e) { /* 지원하지 않는 기기는 조용히 넘어갑니다 */ }
};

export const stopSpeak = (): void => {
  try { (window as unknown as { AndroidTTS?: { stop?: () => void } }).AndroidTTS?.stop?.(); } catch (e) { /* 무시 */ }
  try { window.speechSynthesis?.cancel?.(); } catch (e) { /* 무시 */ }
};
