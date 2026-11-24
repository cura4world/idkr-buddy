// src/components/sheet/AppSheet.tsx
// 앱 안의 모든 옵션 창(입력·고르기·확인·안내)이 쓰는 하나의 틀 (2026-11-24 Arga 승인, docs/review/sheet-unify-2026-11-24.md).
//
//   아래에서 올라오는 시트 · 위 모서리 22px · 손잡이 · 머리(40px 아이콘 칸 + 제목 + 한 줄 설명 + 오른쪽 위 X)
//   · 가운데 본문만 스크롤 · 바닥 단추는 바닥에 고정 · 배경 rgba(20,30,35,.42) 한 가지 · 열고 닫히는 움직임(220/180ms)
//
// X 와 바닥 단추의 뜻(모든 창 공통):
//   바닥 주 단추(완료·저장·삭제…) = 적용하고 닫기, X = 아무것도 바꾸지 않고 닫기(취소).
//   바깥 누르기·아래로 끌기·뒤로가기도 X 와 같은 "취소"입니다 → 모두 onClose 를 부릅니다.
//
// 닫기 규칙
//   - 끌어 닫기는 맨 위 손잡이·머리 영역을 끌 때만. 본문(목록·입력칸)을 밀면 스크롤만 됩니다.
//   - dirty(입력 창에 이미 글을 넣음)면 끌기·바깥 누르기로는 닫히지 않습니다 — X·취소로만.
//   - closeLocked(만드는 중 등)면 어떤 방법으로도 닫히지 않습니다.
//   - backClose 를 켜면 폰 뒤로가기도 이 틀이 처리합니다(useBackClose). 이미 부르는 쪽에서 useBackClose 를 쓰면 켜지 마세요.
//
// 글꼴: 제목·라벨·설명·단추는 font-gothic(Pretendard), 인도네시아어 단어·문장만 font-word(Lora).
// 크기: 글자는 rem(글자 크기 85~125% 를 따름), 테두리·여백·아이콘 칸은 px.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Check, CircleHelp, Trash2, X } from "lucide-react";
import { useBackClose } from "@/hooks/useBackClose";

/** 틀의 값 — 한 곳에서 관리합니다 */
export const SHEET = {
  txt: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  label: "#3B4245",
  teal: "#2C6D63",
  tealSoft: "#EEF6F4",
  danger: "#D23B3B",
  line: "#E3E8EB",
  handle: "#DDE3E6",
  xBg: "#F1F4F5",
  secondaryBg: "#F1F4F5",
  /** 인도네시아어 작은 이름(고르기 줄의 Lora 부제) — 시안보다 한 단계 진하게(2026-11-24 Arga) */
  wordSub: "#5E676C",
  scrim: "rgba(20,30,35,0.42)",
  radius: 22,
  openMs: 220,
  closeMs: 180,
  maxHeight: "92dvh",
};

/** 머리 아이콘 칸의 색 — 입력·고르기 청록, 위험 확인 빨강, Plus 금색, 그 밖 회청 */
export const SHEET_TONE = {
  teal: { bg: "#E3EEEC", ink: "#2C6D63" },
  danger: { bg: "#FDECEC", ink: "#D23B3B" },
  plus: { bg: "#FFF6DC", ink: "#8A6A12" },
  neutral: { bg: "#EEF1F3", ink: "#4A5A63" },
} as const;
export type SheetTone = keyof typeof SHEET_TONE;

// ── 열린 창이 있는가(알림 자리 옮기기용) ─────────────────────────
// 아래 시트의 바닥 단추가 화면 아래쪽 알림(토스트)에 가려 눌리지 않았습니다(2026-11-24 계정 삭제 직후 "단어장도 지울까요?").
// 창이 하나라도 열려 있으면 알림을 화면 위쪽에 띄웁니다(src/components/ui/sonner.tsx).
let openSheetCount = 0;
const openSheetListeners = new Set<() => void>();
// 창이 떠 있는 동안 뒤 화면이 함께 밀리지 않게 잠급니다(훈장 창이 하던 것을 모든 창에 — 2026-11-24).
// touch-action 은 건드리지 않습니다(body 에 none 을 주면 창 안쪽 스크롤까지 막힘).
let savedOverflow: { html: string; body: string } | null = null;
function setOpenSheetDelta(d: number): void {
  const before = openSheetCount;
  openSheetCount = Math.max(0, openSheetCount + d);
  try {
    if (before === 0 && openSheetCount > 0) {
      savedOverflow = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else if (before > 0 && openSheetCount === 0 && savedOverflow) {
      document.documentElement.style.overflow = savedOverflow.html;
      document.body.style.overflow = savedOverflow.body;
      savedOverflow = null;
    }
  } catch (e) {}
  openSheetListeners.forEach((l) => {
    try { l(); } catch (e) {}
  });
}

/** 앱 공통 틀(AppSheet)의 창이 하나라도 열려 있는가 */
export function useAnySheetOpen(): boolean {
  const [v, setV] = useState(openSheetCount > 0);
  useEffect(() => {
    const f = () => setV(openSheetCount > 0);
    openSheetListeners.add(f);
    f();
    return () => {
      openSheetListeners.delete(f);
    };
  }, []);
  return v;
}

function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

export interface AppSheetProps {
  open: boolean;
  /** 취소로 닫기 — X·바깥 누르기·아래로 끌기·(backClose 면) 뒤로가기 */
  onClose: () => void;
  title: string;
  /** 제목 아래 한 줄 설명 */
  desc?: ReactNode;
  /** 머리 아이콘(lucide, size 20 strokeWidth 1.8) */
  icon: ReactNode;
  tone?: SheetTone;
  /** tone 대신 직접 색을 줄 때 */
  tileBg?: string;
  tileInk?: string;
  children?: ReactNode;
  /** 바닥에 고정되는 부분(보통 주 단추) */
  footer?: ReactNode;
  /** 있으면 본문+바닥을 <form> 으로 감쌉니다(엔터·제출 단추용) */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** true 면 어떤 방법으로도 닫히지 않습니다(만드는 중 등) */
  closeLocked?: boolean;
  /** true 면 X 단추를 그리지 않고 어떤 방법으로도 닫히지 않습니다(처음 한 번 꼭 정해야 하는 창 — 아이디 정하기) */
  noClose?: boolean;
  /** true 면 끌기·바깥 누르기로 닫히지 않습니다(입력 창에 글을 넣음) — X·취소로만 */
  dirty?: boolean;
  /** 폰 뒤로가기를 이 틀이 처리(useBackClose). 부르는 쪽이 이미 처리하면 false(기본) */
  backClose?: boolean;
  /** 확인 창은 "alertdialog" */
  role?: "dialog" | "alertdialog";
  zIndex?: number;
  /** 본문 줄 사이 간격(px). 입력 칸 13, 고르기 줄 8(기본) */
  gap?: number;
  /** 제목 자리에 글자 대신 그릴 것(예: 단어 시트의 인니어 단어 + 발음 단추). 화면 읽기 이름은 title */
  titleNode?: ReactNode;
  /** 시트 폭(기본 max-w-lg). 넓게 보기 화면은 더 넓게 */
  widthClass?: string;
  /** 머리 아래 고정되는 줄(예: 훈장 창의 탭) — 스크롤되지 않습니다 */
  subHeader?: ReactNode;
  /** 본문 영역 모양(예: 높이 고정) */
  bodyStyle?: CSSProperties;
  /** 본문 안쪽 여백(기본 "16px 20px …") */
  bodyPadding?: string;
  /** 시트 최대 높이(기본 92dvh). 회전한 가로 보기처럼 화면 높이와 다른 곳에서 씁니다 */
  maxHeight?: string;
  /** 시트 안 누름을 먼저 받아 막을 때(예: 지도 핀을 누른 손가락이 방금 열린 시트까지 누르는 것) */
  onPanelClickCapture?: (e: ReactMouseEvent<HTMLDivElement>) => void;
  /** 머리를 끌어 닫기(기본 켬). 화면을 돌린 가로 보기처럼 끄는 방향이 맞지 않는 곳에서는 끕니다 */
  dragClose?: boolean;
  /** true 면 부른 자리에 그대로 그립니다(기본은 body 에 그림). 돌린 화면(지도 가로 보기)처럼 부모 상자 안에 있어야 할 때만 */
  inline?: boolean;
}

export default function AppSheet({
  open, onClose, title, desc, icon, tone = "teal", tileBg, tileInk, children, footer, onSubmit,
  closeLocked: closeLockedProp, noClose, dirty, backClose, role = "dialog", zIndex = 50, gap = 8,
  titleNode, widthClass = "max-w-lg", subHeader, bodyStyle, bodyPadding, maxHeight, onPanelClickCapture, dragClose = true, inline,
}: AppSheetProps) {
  const closeLocked = !!closeLockedProp || !!noClose;
  const reduce = prefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  // "동작 줄이기"면 움직임 없이 처음부터 제자리(화면 테스트도 이 설정으로 돕니다)
  const [shown, setShown] = useState(open && reduce);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; y0: number; t0: number; active: boolean } | null>(null);

  useBackClose(!!backClose && open, () => { if (!closeLocked) onClose(); });

  // 열려 있는 동안 알림을 화면 위쪽으로(바닥 단추를 가리지 않게)
  useEffect(() => {
    if (!open) return;
    setOpenSheetDelta(1);
    return () => setOpenSheetDelta(-1);
  }, [open]);

  // 열기·닫기 움직임: 열릴 때 그린 뒤 다음 프레임에 올리고, 닫힐 때는 내려가는 동안(closeMs) 남겨 둡니다.
  useEffect(() => {
    let timer: number | undefined;
    let raf1: number | undefined;
    let raf2: number | undefined;
    if (open) {
      setMounted(true);
      setDragY(0);
      if (reduce) {
        setShown(true);
      } else {
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setShown(true));
        });
      }
    } else {
      setShown(false);
      timer = window.setTimeout(() => setMounted(false), reduce ? 0 : SHEET.closeMs);
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      if (raf1 !== undefined) cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 열렸는데 창 안에 초점이 없으면(자동 초점 입력칸이 없으면) 창으로 초점을 옮깁니다(화면 읽기 도구용)
  useEffect(() => {
    if (!open || !shown) return;
    const p = panelRef.current;
    if (!p) return;
    try {
      if (!p.contains(document.activeElement)) p.focus({ preventScroll: true });
    } catch (e) {}
  }, [open, shown]);

  if (!mounted) return null;

  const cancel = () => {
    if (!closeLocked) onClose();
  };
  const outsideOk = !closeLocked && !dirty;
  const onScrim = () => {
    if (outsideOk) onClose();
  };

  // ── 아래로 끌어 닫기(손잡이·머리 영역에서만) ──
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragClose) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, y0: e.clientY, t0: Date.now(), active: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (dy < 6) return;
      d.active = true;
      setDragging(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch (err) {}
    }
    // 닫을 수 없는 상태면 조금만 따라오다 멈춥니다(눌러도 안 닫힌다는 표시)
    setDragY(outsideOk ? Math.max(0, dy) : Math.min(24, Math.max(0, dy) * 0.25));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.active) return;
    const dy = e.clientY - d.y0;
    const v = dy / Math.max(1, Date.now() - d.t0);
    setDragging(false);
    if (outsideOk && (dy > 90 || (dy > 30 && v > 0.6))) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const tileColor = tileBg && tileInk ? { bg: tileBg, ink: tileInk } : SHEET_TONE[tone];
  const dur = reduce ? 0 : shown ? SHEET.openMs : SHEET.closeMs;
  const panelTransform = shown ? "translateY(" + dragY + "px)" : "translateY(100%)";

  const bodyEl = (
    <div
      className={"min-h-0 overflow-y-auto overscroll-contain " + (bodyStyle && bodyStyle.height ? "shrink-0" : "flex-1")}
      style={{
        padding: bodyPadding || (footer ? "16px 20px 4px" : "16px 20px calc(20px + env(safe-area-inset-bottom))"),
        ...bodyStyle,
      }}
    >
      <div className="flex flex-col" style={{ gap }}>{children}</div>
    </div>
  );
  const footerEl = footer ? (
    <div className="shrink-0" style={{ padding: "12px 20px calc(16px + env(safe-area-inset-bottom))" }}>{footer}</div>
  ) : null;

  // body 에 그립니다 — 부모 상자에 transform·overflow 가 있으면(다른 창 안에서 연 창) fixed 가 그 상자에 갇혀
  // 화면 바닥이 아니라 상자 안에 잘려 그려지기 때문입니다(2026-11-24, 설정 창 안 CSV 가져오기).
  const node = (
    <div className="fixed inset-0" style={{ zIndex }} data-app-sheet="">
      <div
        className="absolute inset-0"
        style={{ background: SHEET.scrim, opacity: shown ? 1 : 0, transition: "opacity " + dur + "ms ease" }}
        onClick={onScrim}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role={open ? role : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? title : undefined}
        aria-hidden={open ? undefined : true}
        onClickCapture={onPanelClickCapture}
        className={"absolute bottom-0 left-0 right-0 " + widthClass + " mx-auto bg-white flex flex-col outline-none"}
        style={{
          borderRadius: SHEET.radius + "px " + SHEET.radius + "px 0 0",
          maxHeight: maxHeight || SHEET.maxHeight,
          boxShadow: "0 -8px 28px rgba(8,32,38,0.14)",
          transform: panelTransform,
          transition: dragging ? "none" : "transform " + dur + "ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* 머리 — 이 영역을 끌면 창이 따라 내려옵니다(본문은 스크롤만) */}
        <div
          className="shrink-0 select-none"
          style={{ padding: "8px 20px 0", touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-sheet-drag=""
        >
          <div className="mx-auto rounded-full" style={{ width: 36, height: 4, background: SHEET.handle, marginBottom: 12 }} />
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center shrink-0"
              style={{ width: 40, height: 40, borderRadius: 12, background: tileColor.bg, color: tileColor.ink }}
            >
              {icon}
            </span>
            <span className="flex-1 min-w-0">
              {titleNode || (
                <span className="block font-gothic text-[1rem] font-bold break-keep" style={{ color: SHEET.txt }}>{title}</span>
              )}
              {desc ? (
                <span className="block mt-0.5 font-gothic text-[0.78125rem] leading-[1.45] break-keep" style={{ color: SHEET.sub }}>{desc}</span>
              ) : null}
            </span>
            {noClose ? null : (
              <button
                type="button"
                onClick={cancel}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={closeLocked}
                className="flex items-center justify-center shrink-0 rounded-full disabled:opacity-50"
                style={{ width: 34, height: 34, background: SHEET.xBg, color: SHEET.sub }}
                title="닫기"
                aria-label="닫기"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
        {subHeader ? <div className="shrink-0 mt-3">{subHeader}</div> : null}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="min-h-0 flex-1 flex flex-col">
            {bodyEl}
            {footerEl}
          </form>
        ) : (
          <>
            {bodyEl}
            {footerEl}
          </>
        )}
      </div>
    </div>
  );
  return inline || typeof document === "undefined" ? node : createPortal(node, document.body);
}

// ── 바닥 단추 ────────────────────────────────────────────────

interface SheetButtonProps {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  /** 주(청록) · 위험(빨강) · 보조(회색) */
  variant?: "primary" | "danger" | "secondary";
  /** 회색(할 수 없는 상태) */
  muted?: boolean;
  /** 진행 중(조금 옅게) */
  dim?: boolean;
  className?: string;
}

export function SheetButton({ children, type = "button", onClick, disabled, variant = "primary", muted, dim, className }: SheetButtonProps) {
  const style = muted
    ? { background: "#E9EDEF", color: SHEET.mute }
    : variant === "secondary"
      ? { background: SHEET.secondaryBg, color: SHEET.label }
      : { background: variant === "danger" ? SHEET.danger : SHEET.teal, color: "#FFFFFF", opacity: dim ? 0.75 : 1 };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={"w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-gothic text-[0.9375rem] font-semibold active:opacity-90 " + (className || "")}
      style={style}
    >
      {children}
    </button>
  );
}

/** 바닥 단추 두 개를 나란히(왼쪽 보조, 오른쪽 주) */
export function SheetButtonRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 [&>*]:flex-1">{children}</div>;
}

// ── 고르기 줄 ────────────────────────────────────────────────

interface ChoiceRowProps {
  selected?: boolean;
  onClick: () => void;
  /** multi = 왼쪽 체크(여러 개), single = 오른쪽 라디오(하나), action = 누르면 바로 실행(표시 없음) */
  mode: "multi" | "single" | "action";
  title: ReactNode;
  /** 인도네시아어 작은 이름 — font-word(Lora) */
  wordSub?: ReactNode;
  /** 한국어 보조 설명 */
  sub?: ReactNode;
  /** 왼쪽 아이콘(single 일 때) */
  leading?: ReactNode;
  /** 오른쪽 덧말(개수 등, 라디오 앞) */
  trailing?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export function ChoiceRow({ selected = false, onClick, mode, title, wordSub, sub, leading, trailing, disabled, ariaLabel }: ChoiceRowProps) {
  const box =
    mode === "action" ? null : mode === "multi" ? (
      <span
        className="shrink-0 flex items-center justify-center"
        style={
          selected
            ? { width: 22, height: 22, borderRadius: 7, background: SHEET.teal, color: "#FFFFFF" }
            : { width: 22, height: 22, borderRadius: 7, border: "1.5px solid #C9D1D5", color: "transparent", boxSizing: "border-box" }
        }
      >
        <Check size={14} strokeWidth={3} />
      </span>
    ) : (
      <span
        className="shrink-0"
        style={{ width: 22, height: 22, borderRadius: 11, boxSizing: "border-box", border: selected ? "6.5px solid " + SHEET.teal : "1.5px solid #C9D1D5" }}
      />
    );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role={mode === "multi" ? "checkbox" : mode === "single" ? "radio" : undefined}
      aria-checked={mode === "action" ? undefined : selected}
      aria-label={ariaLabel}
      className="w-full flex items-center gap-3 text-left disabled:opacity-50"
      style={{
        minHeight: 56,
        boxSizing: "border-box",
        padding: "10px 14px",
        borderRadius: 14,
        border: "1.5px solid " + (selected ? SHEET.teal : SHEET.line),
        background: selected ? SHEET.tealSoft : "#FFFFFF",
      }}
    >
      {mode === "multi" ? box : null}
      {leading ? <span className="shrink-0 flex items-center justify-center" style={{ width: 24 }}>{leading}</span> : null}
      <span className="flex-1 min-w-0">
        <span className="block font-gothic text-[0.875rem] font-semibold leading-[1.3] break-keep" style={{ color: SHEET.txt }}>{title}</span>
        {wordSub ? (
          <span className="block mt-0.5 font-word text-[0.75rem]" style={{ color: SHEET.wordSub }}>{wordSub}</span>
        ) : null}
        {sub ? (
          <span className="block mt-0.5 font-gothic text-[0.75rem] break-keep" style={{ color: SHEET.sub }}>{sub}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0 font-gothic text-[0.75rem]" style={{ color: SHEET.mute }}>{trailing}</span> : null}
      {mode === "single" ? box : null}
    </button>
  );
}

// ── 확인 창 ──────────────────────────────────────────────────

interface ConfirmSheetProps {
  open: boolean;
  /** 취소(X·취소 단추·바깥·끌기·뒤로가기) */
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  /** 본문 문장 — 대상 이름은 <b> 로 굵게 */
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** 되돌릴 수 없는 동작이면 빨간 주 단추 + 빨간 휴지통 칸 */
  danger?: boolean;
  icon?: ReactNode;
  /** 처리 중이면 단추·닫기 잠금 */
  busy?: boolean;
  backClose?: boolean;
  zIndex?: number;
}

export function ConfirmSheet({
  open, onCancel, onConfirm, title, message, confirmLabel, cancelLabel = "취소", danger, icon, busy, backClose, zIndex,
}: ConfirmSheetProps) {
  return (
    <AppSheet
      open={open}
      onClose={onCancel}
      title={title}
      icon={icon || (danger ? <Trash2 size={20} strokeWidth={1.8} /> : <CircleHelp size={20} strokeWidth={1.8} />)}
      tone={danger ? "danger" : "neutral"}
      role="alertdialog"
      closeLocked={busy}
      backClose={backClose}
      zIndex={zIndex}
      footer={
        <SheetButtonRow>
          <SheetButton variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</SheetButton>
          <SheetButton variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy} dim={busy}>{confirmLabel}</SheetButton>
        </SheetButtonRow>
      }
    >
      <div className="font-gothic text-[0.84375rem] leading-[1.6] break-keep [&_b]:font-bold" style={{ color: SHEET.label }}>
        {message}
      </div>
    </AppSheet>
  );
}
