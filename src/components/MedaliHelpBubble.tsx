// src/components/MedaliHelpBubble.tsx
// 내 정보 훈장 칸의 ⓘ 설명 단추와 작은 말풍선(2026-11-24 Arga 승인).
//
// 옵션 창 공통 틀(AppSheet)의 예외입니다 — 두세 문장짜리 설명이라 아래 시트를 띄우지 않고 칸 바로 아래에 짙은 말풍선으로 보입니다
// (DECISIONS 28장). 닫기: 바깥 누르기 · 폰 뒤로가기(여는 쪽이 useBackClose) · "알겠어요". 한 번에 하나만(여는 쪽 상태 하나).
// 바깥을 누르면 말풍선만 닫고 그 누르기는 먹습니다 — 닫히면서 뒤에 있던 줄이 함께 눌려 다른 창이 열리지 않게.
// 문구는 lib/medaliHelp.ts 한 곳에서 가져옵니다.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Flame, Star } from "lucide-react";
import { MEDALI_COLORS } from "@/lib/medali";
import { MEDALI_HELP, MEDALI_LADDER } from "@/lib/medaliHelp";

export type MedaliHelpKind = "api" | "bintang";

// 훈장 명찰(MedaliBadge)과 같은 아이콘 외곽선
const STROKE = "rgba(255,255,255,0.55)";
const BUBBLE_BG = "#1F2A30";
const HELP_BTN_ATTR = "data-medali-help-btn";

// 다음 click 하나를 먹습니다(600ms 안에 오지 않으면 그냥 풀림). 말풍선이 사라진 뒤에도 남아 있어야 하므로 컴포넌트 밖에 둡니다.
function swallowNextClick(): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const done = () => {
    try { document.removeEventListener("click", onClick, true); } catch (e) {}
    if (timer) clearTimeout(timer);
  };
  try { document.addEventListener("click", onClick, true); } catch (e) {}
  timer = setTimeout(done, 600);
}

/** ⓘ 단추 — 보이는 원은 20px, 누르는 영역은 32px. 칸을 눌러 훈장 창을 여는 동작과 겹치지 않게 전파를 막습니다. */
export function MedaliHelpButton({
  kind, open, onToggle, bg, fg, buttonRef,
}: {
  kind: MedaliHelpKind;
  open: boolean;
  onToggle: () => void;
  bg: string;
  fg: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      {...{ [HELP_BTN_ATTR]: kind }}
      aria-label={MEDALI_HELP[kind].buttonLabel}
      aria-expanded={open}
      aria-controls={"medali-help-" + kind}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex items-center justify-center"
      style={{ width: 32, height: 32, borderRadius: 16 }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center font-gothic"
        style={{ width: 20, height: 20, borderRadius: 10, background: bg, color: fg, fontSize: 12, fontWeight: 800, lineHeight: 1 }}
      >
        i
      </span>
    </button>
  );
}

/**
 * 말풍선. 부모(position: relative)의 바로 아래에 부모 폭만큼 붙습니다 — 칸 두 개를 덮는 폭이라 화면 가장자리에서 잘리지 않고,
 * 꼬리만 단추 쪽으로 옮깁니다(가장자리 16px 안으로 보정).
 */
export function MedaliHelpBubble({
  kind, anchor, onClose,
}: {
  kind: MedaliHelpKind;
  /** 꼬리가 가리킬 ⓘ 단추 */
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tailX, setTailX] = useState<number | null>(null);
  const text = MEDALI_HELP[kind];

  // 꼬리 위치 = 단추 가운데(말풍선 기준)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const b = el.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const x = a.left + a.width / 2 - b.left;
    setTailX(Math.max(16, Math.min(b.width - 16, x)));
  }, [kind, anchor]);

  // 열리면 말풍선으로 초점을 옮기고, 화면 밖이면 보이게 굴립니다(하단 탭에 가리지 않게 scroll-margin)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) {}
    try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
  }, [kind]);

  // 바깥 누르기 → 닫고, 그 누르기는 먹습니다. ⓘ 단추를 누른 것은 단추가 스스로 처리합니다(다른 칸 설명으로 바꾸기·닫기).
  // 닫히면 말풍선이 먼저 사라지므로(click 보다 앞), 먹는 일은 말풍선과 따로 사는 한 번짜리 리스너(swallowNextClick)가 합니다.
  useEffect(() => {
    const isInside = (t: EventTarget | null): boolean => {
      const n = t as Node | null;
      if (!n) return false;
      if (ref.current && ref.current.contains(n)) return true;
      const el = (n as Element).closest ? (n as Element) : n.parentElement;
      return !!(el && el.closest && el.closest("[" + HELP_BTN_ATTR + "]"));
    };
    const onDown = (e: PointerEvent) => {
      if (isInside(e.target)) return;
      swallowNextClick();
      onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  const Icon = kind === "api" ? Flame : Star;

  return (
    <div
      ref={ref}
      id={"medali-help-" + kind}
      role="dialog"
      aria-modal="false"
      aria-labelledby={"medali-help-" + kind + "-title"}
      tabIndex={-1}
      className="absolute left-0 right-0 font-gothic outline-none"
      style={{
        top: "calc(100% + 10px)",
        zIndex: 30,
        background: BUBBLE_BG,
        color: "#FFFFFF",
        borderRadius: 14,
        padding: "14px 14px 6px",
        boxShadow: "0 8px 24px rgba(10,25,30,0.28)",
        scrollMarginBottom: "calc(var(--kata-tabbar-h, 0px) + 12px)",
        scrollMarginTop: 72,
      }}
    >
      {tailX !== null ? (
        <span
          aria-hidden="true"
          className="absolute"
          style={{ top: -6, left: tailX - 7, width: 14, height: 14, background: BUBBLE_BG, transform: "rotate(45deg)", borderRadius: 2 }}
        />
      ) : null}
      <p id={"medali-help-" + kind + "-title"} className="relative" style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, lineHeight: 1.4 }}>
        {text.title}
      </p>
      <p className="relative" style={{ margin: "6px 0 0", fontSize: "0.8125rem", lineHeight: 1.6, color: "rgba(255,255,255,0.88)", wordBreak: "keep-all" }}>
        {text.body}
      </p>
      {/* 색 사다리 — 명찰과 같은 아이콘·색. 360px·글자 100% 에서 한 줄(2026-11-24 S21 412px 에서 "→ 보석"이 넘어가 간격을 줄임).
          화살표는 글꼴에 따라 폭이 달라지지 않게 작은 그림(8px)으로, 다음 단계와 한 묶음이라 줄이 바뀌어도 화살표가 줄 맨 앞에 오지 않습니다. */}
      <p
        className="relative flex flex-wrap items-center"
        style={{ margin: "10px 0 0", columnGap: 3, rowGap: 4, fontSize: "0.75rem", color: "rgba(255,255,255,0.9)" }}
        aria-label={MEDALI_LADDER.map((c) => c.name).join(", ")}
      >
        {MEDALI_LADDER.map((c, i) => (
          <span key={c.color} className="inline-flex items-center whitespace-nowrap" style={{ gap: 2 }} aria-hidden="true">
            {i > 0 ? (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.3"
                strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M1 4h6M4.5 1.5 7 4 4.5 6.5" />
              </svg>
            ) : null}
            <Icon size={13} color={STROKE} fill={MEDALI_COLORS[c.color]} strokeWidth={1.5} className="shrink-0" />
            <span>{c.name}</span>
          </span>
        ))}
      </p>
      <p className="relative" style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
        {text.ladderNote}
      </p>
      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="font-gothic"
          style={{ minHeight: 40, padding: "0 6px", fontSize: "0.8125rem", fontWeight: 700, color: "#8FE0D6" }}
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}
