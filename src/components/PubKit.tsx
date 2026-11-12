// src/components/PubKit.tsx
// 공개판 디자인 공통 부품 — 이야기(ST1~ST5)·회화집(PC1~PC4)·인도네시아 이해(IN1)에서 쓰던 모양을 한곳에 모았습니다.
// 2026-11-12: 관리자·Special Member 용 기독교 화면(묵상·기도·성경·일대일·설교·뉴스·기독교 이해)을
// 같은 모양으로 맞추면서 만들었습니다(docs/release/10-faith-stories.md S63).
// 이미 다듬은 화면들은 각자 복사본을 쓰고 있습니다 — 그 화면은 고치지 않았습니다.

import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** 시안 색 (이야기 화면과 같음) */
export const PUB = {
  txt: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  deep: "#104B60",
  teal: "#2C6D63",
  tealSoft: "#E3EEEC",
  amberBg: "#FCEFD9",
  amberFg: "#8C5A12",
  greyBg: "#F1F4F5",
  line: "#EEF1F3",
  section: "#3B4245",
  noteBg: "#FBF5E6",
  noteFg: "#6E5612",
  noteTxt: "#3B3A35",
};

/** 화면별 타일 색 (홈 목록과 같은 짝) */
export const PUB_TILE = {
  devotion: { bg: "#FFF3D6", fg: "#8A6A12" },
  bible: { bg: "#E4EEF6", fg: "#2B5F86" },
  oneToOne: { bg: "#FCEFE3", fg: "#9A5B1E" },
  prayer: { bg: "#F4E8EC", fg: "#8A3E52" },
  sermon: { bg: "#ECE8F6", fg: "#5B4A8C" },
  news: { bg: "#EAF2DF", fg: "#4E6A2A" },
  christian: { bg: "#F4E8EC", fg: "#8A3E52" },
};

/** 흰 카드 */
export const PUB_CARD: CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 18,
  boxShadow: "0 1px 3px rgba(16,40,50,0.06)",
};

/** 소제목 (13px 굵게) */
export const PubSectionTitle = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p
    className={"mx-1 mb-2 font-gothic text-[0.8125rem] font-bold tracking-[0.02em] " + className}
    style={{ color: PUB.section }}
  >
    {children}
  </p>
);

/** 꼬리표 (22px 알약) */
export const PubChip = ({
  children,
  tone = "grey",
  className = "",
}: {
  children: ReactNode;
  tone?: "amber" | "grey" | "teal";
  className?: string;
}) => {
  const style =
    tone === "amber"
      ? { background: PUB.amberBg, color: PUB.amberFg }
      : tone === "teal"
      ? { background: PUB.tealSoft, color: PUB.teal }
      : { background: PUB.greyBg, color: PUB.sub };
  return (
    <span
      className={
        "h-[22px] px-[9px] rounded-full inline-flex items-center font-gothic text-[0.65625rem] font-semibold whitespace-nowrap min-w-0 truncate " +
        className
      }
      style={style}
    >
      {/* flex 안의 글자는 말줄임표가 붙지 않아 안쪽 span 에서 자릅니다 */}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
};

/** 주 버튼 클래스·모양 (청록, 높이 44px) — <button className={PUB_BTN} style={PUB_BTN_STYLE}> */
export const PUB_BTN =
  "w-full h-[44px] rounded-2xl flex items-center justify-center gap-2 font-gothic text-[0.875rem] font-semibold active:opacity-90 disabled:opacity-60";
export const PUB_BTN_STYLE: CSSProperties = { background: PUB.teal, color: "#FFFFFF" };

/** 보조 버튼 (연청록 알약, 높이 34px) */
export const PUB_SOFT_BTN =
  "h-[34px] px-[13px] rounded-full inline-flex items-center justify-center gap-1.5 font-gothic text-[0.78125rem] font-semibold active:opacity-80 disabled:opacity-60";
export const PUB_SOFT_BTN_STYLE: CSSProperties = { background: PUB.tealSoft, color: PUB.teal };

export interface PubRowItem {
  key: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
  title: string;
  sub?: string;
  /** 화살표 앞에 작게 (예: "3장") */
  meta?: string;
  onClick: () => void;
}

/** 타일 목록 (인도네시아 이해 IN1 과 같은 모양) */
export const PubRows = ({ items }: { items: PubRowItem[] }) => (
  <div className="rounded-[18px] overflow-hidden" style={PUB_CARD}>
    {items.map((it, i) => {
      const Icon = it.icon;
      return (
        <button
          key={it.key}
          type="button"
          onClick={it.onClick}
          className={
            "w-full flex items-center gap-3 py-3 pl-3.5 pr-3 text-left active:bg-muted/60 transition-colors " +
            (i < items.length - 1 ? "border-b border-[#EEF1F3]" : "")
          }
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: it.bg, color: it.fg }}
          >
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-gothic text-[0.90625rem] leading-tight text-foreground truncate">{it.title}</span>
            {it.sub ? (
              <span className="block mt-px font-word text-[0.6875rem] truncate" style={{ color: PUB.sub }}>{it.sub}</span>
            ) : null}
          </span>
          {it.meta ? (
            <span className="shrink-0 font-gothic text-[0.71875rem]" style={{ color: PUB.sub }}>{it.meta}</span>
          ) : null}
          <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#B7BDC1]" />
        </button>
      );
    })}
  </div>
);

/**
 * 화면 맨 위 "오늘의 ○○" 카드 (이야기 ST1 과 같은 틀) — 그림 타일 + 제목(+ 설명) + 아래 내용(버튼 등).
 */
export const PubIntroCard = ({
  art,
  artBg,
  title,
  sub,
  right,
  children,
}: {
  art: ReactNode;
  artBg: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}) => (
  <div style={{ ...PUB_CARD, borderRadius: 20, padding: "18px 16px 16px" }}>
    <div className="flex items-center gap-2.5">
      <span
        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: artBg }}
      >
        {art}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-[0.96875rem] font-semibold" style={{ color: PUB.txt }}>{title}</span>
        {sub ? (
          <span className="block mt-[4px] font-gothic text-[0.71875rem] break-words" style={{ color: PUB.sub }}>{sub}</span>
        ) : null}
      </span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </div>
    {children ? <div className="mt-3.5">{children}</div> : null}
  </div>
);

/** 빈 화면·오류 안내 카드 */
export const PubNotice = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="px-4 py-7 text-center" style={PUB_CARD}>
    <div className="font-gothic text-[0.8125rem] leading-[1.7] break-keep" style={{ color: PUB.sub }}>{children}</div>
    {action ? <div className="mt-3.5 flex justify-center">{action}</div> : null}
  </div>
);

/** 설명 상자 (이야기 "이 글을 더 이해하려면") */
export const PubNote = ({ title, icon, children }: { title?: ReactNode; icon?: ReactNode; children: ReactNode }) => (
  <div className="rounded-[14px]" style={{ background: PUB.noteBg, padding: "14px 14px 12px" }}>
    {title ? (
      <p className="flex items-center gap-1.5 font-gothic text-[0.8125rem] font-bold" style={{ color: PUB.noteFg }}>
        {icon}
        {title}
      </p>
    ) : null}
    <div
      className={"font-gothic text-[0.8125rem] leading-[1.7] break-words" + (title ? " mt-2" : "")}
      style={{ color: PUB.noteTxt }}
    >
      {children}
    </div>
  </div>
);
