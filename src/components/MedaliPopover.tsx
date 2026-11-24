// src/components/MedaliPopover.tsx
// 명찰 바로 아래 떠 있는 훈장 요약 상자(2026-11-24 Arga 승인) — 공개판(스토어·미리보기) 홈 명찰·게임방 명찰.
// 관리자판·회원판 명찰은 내 정보로 갈 길이 없어 아래 자세히 창(MedaliSheet)을 그대로 엽니다.
//
// 옵션 창 공통 틀(AppSheet)의 예외입니다(DECISIONS 29장, 내 정보 ⓘ 말풍선 옆) — 명찰의 숫자 두 개를 잠깐 펼쳐 보는 것이라
// 화면 아래에서 시트를 올리기보다 누른 자리에서 바로 보이는 편이 맞습니다. 뒤 화면은 어둡게 하지 않습니다.
//   위치  누른 명찰 바로 아래, 오른쪽 끝을 명찰 오른쪽 끝에 맞춤. 위쪽 꼬리가 명찰을 가리킴. 좌우 16px 안, 폭 최대 360px.
//         화면 아래로 넘치면 상자 안만 스크롤(높이 = 화면 바닥까지).
//   닫기  X(44px) · 바깥 누르기(그 누르기는 먹음 — hooks/useOutsideTapClose, ⓘ 말풍선과 같은 코드) · 뒤로가기(useBackClose)
//         · 명찰 다시 누르기(여는 쪽이 열고 닫음 — 바깥 누르기에서 뺌) · 페이지 스크롤 · Esc.
//   움직임 명찰 쪽(꼬리)에서 살짝 커지며 나타남(140ms). 움직임 줄이기 설정이면 바로 표시.
//   접근성 role="dialog" + 이름 "훈장 요약". 열리면 상자로 초점, 닫히면 명찰로 초점 복귀.
// 내용은 MedaliSheet.tsx 의 MedaliSummaryBody(자세히 창과 같은 계산).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { MedaliSummaryBody } from "@/components/MedaliSheet";
import { useBackClose } from "@/hooks/useBackClose";
import { useOutsideTapClose } from "@/hooks/useOutsideTapClose";

const EDGE = 16;        // 화면 좌우 여백
const MAX_W = 360;      // 상자 최대 폭
const GAP = 10;         // 명찰 아래 틈(꼬리 자리)
const BOTTOM_GAP = 12;  // 화면 바닥과의 틈
const CARD_SHADOW = "0 10px 28px rgba(16,40,50,0.16), 0 1px 3px rgba(16,40,50,0.08)";
const BORDER = "#E8ECEE";

// 열려 있는 동안 명찰 말풍선(MedaliNudge)을 숨기려고 바깥에 알립니다
let openCount = 0;
const listeners = new Set<(open: boolean) => void>();
function setOpenFlag(d: number) {
  openCount = Math.max(0, openCount + d);
  listeners.forEach((l) => l(openCount > 0));
}
/** 명찰 요약 상자가 열려 있는가 — MedaliNudge 가 씁니다 */
export function useMedaliPopoverOpen(): boolean {
  const [open, setOpen] = useState(openCount > 0);
  useEffect(() => {
    listeners.add(setOpen);
    return () => { listeners.delete(setOpen); };
  }, []);
  return open;
}

interface Layout {
  top: number;
  left: number;
  width: number;
  tailX: number;
  maxH: number;
}

function reduceMotion(): boolean {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return false;
  }
}

function PopoverBox({ anchor, onClose }: { anchor: HTMLElement | null; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [entered, setEntered] = useState(reduceMotion());

  const measure = useCallback(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(MAX_W, vw - EDGE * 2);
    const left = Math.max(EDGE, Math.min(vw - EDGE - width, r.right - width));
    const top = r.bottom + GAP;
    const tailX = Math.max(18, Math.min(width - 18, r.left + r.width / 2 - left));
    setLayout({ top, left, width, tailX, maxH: Math.max(120, vh - top - BOTTOM_GAP) });
  }, [anchor]);

  useLayoutEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  // 나타나는 움직임(움직임 줄이기면 처음부터 다 보임)
  useEffect(() => {
    if (entered) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 닫히면(사라질 때) 명찰로 초점을 되돌림 + 열려 있는 동안 말풍선 숨김 알림
  useEffect(() => {
    setOpenFlag(1);
    return () => {
      setOpenFlag(-1);
      try { anchor?.focus({ preventScroll: true }); } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상자는 위치를 잰 다음 그려지므로, 처음 그려졌을 때 한 번 상자로 초점을 옮깁니다
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!layout || focusedRef.current) return;
    focusedRef.current = true;
    try { boxRef.current?.focus({ preventScroll: true }); } catch (e) {}
  }, [layout]);

  // 바깥 누르기 — 명찰 자체는 빼서 명찰이 스스로 열고 닫게
  const isAnchor = useCallback((el: Element) => !!(anchor && anchor.contains(el)), [anchor]);
  useOutsideTapClose(true, boxRef, onClose, isAnchor);

  // 페이지 스크롤·Esc 로 닫기. 상자 안 스크롤(넘칠 때)은 닫지 않습니다.
  useEffect(() => {
    const y0 = window.scrollY;
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && boxRef.current && t !== document && boxRef.current.contains(t)) return;
      if (t === document || t === document.documentElement || !t) {
        if (Math.abs(window.scrollY - y0) < 2) return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!layout) return null;

  return createPortal(
    <div
      className="fixed"
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        zIndex: 70,
        transformOrigin: layout.tailX + "px 0px",
        transform: entered ? "scale(1)" : "scale(0.94)",
        opacity: entered ? 1 : 0,
        transition: reduceMotion() ? "none" : "transform 140ms ease-out, opacity 120ms ease-out",
      }}
    >
      {/* 꼬리 — 명찰을 가리킴 */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          top: -6, left: layout.tailX - 7, width: 14, height: 14, background: "#FFFFFF",
          borderLeft: "1px solid " + BORDER, borderTop: "1px solid " + BORDER, transform: "rotate(45deg)", borderRadius: "3px 0 0 0",
        }}
      />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="false"
        aria-label="훈장 요약"
        tabIndex={-1}
        data-medali-popover=""
        className="relative bg-white outline-none font-gothic"
        style={{
          borderRadius: 16, boxShadow: CARD_SHADOW, border: "1px solid " + BORDER,
          maxHeight: layout.maxH, overflowY: "auto", overscrollBehavior: "contain",
        }}
      >
        <div className="flex items-center" style={{ padding: "2px 2px 0 14px" }}>
          <p className="flex-1" style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: "#3B4245" }}>훈장</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 22, color: "#646C72" }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: "0 14px 14px" }}>
          <MedaliSummaryBody open />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 명찰 요약 상자. open 동안만 그립니다. 뒤로가기 닫기는 여기서(useBackClose) 합니다. */
export default function MedaliPopover({
  open, anchor, onClose,
}: {
  open: boolean;
  /** 꼬리가 가리킬 명찰 단추 */
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  useBackClose(open, onClose);
  if (!open || typeof document === "undefined") return null;
  return <PopoverBox anchor={anchor} onClose={onClose} />;
}
