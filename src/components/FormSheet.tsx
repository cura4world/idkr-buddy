// src/components/FormSheet.tsx
// 입력 시트의 공용 디자인 (2026-11-13). 회화집 만들기 시트(시안 PC4)의 모양을 그대로 모은 것입니다.
//   아래에서 올라옴 · 위 모서리 22px · 손잡이 막대 · 머리(40px 색 타일 아이콘 + 제목 1rem + 한 줄 설명 + 동그란 닫기)
//   · 칸 이름 0.84375rem 굵게 · 입력칸(둥근 14px, 1.5px 테두리, 포커스 시 청록 테두리 + 옅은 청록 그림자, 글자 0.875rem)
//   · 아래 꽉 찬 청록 버튼(h-12, rounded-2xl, 0.9375rem) · safe-area 여백 · 최대 높이 92dvh 스크롤.
// 쓰는 곳: 회화집 만들기 · 단어 추가 · 단어장 만들기 · CSV 가져오기 · 이름 바꾸기 · 추가하기 메뉴.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다 — 쓰는 쪽이 useBackClose(open, close) 로 처리합니다.
// 글꼴: 제목은 회화집 만들기 시트 그대로 본문 글꼴, 칸 이름·설명은 font-gothic(Pretendard),
//       입력 글자는 부르는 쪽이 font-word(인니어)·font-body(한글)를 고릅니다.

import type { FormEvent, ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export const FORM_C = {
  txt: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  teal: "#2C6D63",
  tealBg: "#E3EEEC",
  line: "#DDE3E6",
};

/** 입력칸 바깥 상자(테두리·포커스 표시). 안에 input/select/textarea 를 둡니다. */
export const FORM_FIELD_CLASS =
  "rounded-[14px] border-[1.5px] border-[#DDE3E6] bg-white box-border px-3.5 flex items-center gap-2 " +
  "focus-within:border-[#2C6D63] focus-within:shadow-[0_0_0_3px_#E3EEEC]";

/** 입력칸 안의 input 공통 클래스(글자 0.875rem). 인니어 칸은 앞에 font-word 를 더합니다. */
export const FORM_INPUT_CLASS = "flex-1 min-w-0 bg-transparent outline-none text-[0.875rem] py-2";

export function FormLabel({ children, hint, right }: { children: ReactNode; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center">
      <p className="m-0 flex-1 min-w-0 font-gothic text-[0.84375rem] font-bold" style={{ color: "#3B4245" }}>
        {children}
        {hint ? (
          <span className="ml-1.5 text-[0.75rem] font-medium" style={{ color: FORM_C.mute }}>
            {hint}
          </span>
        ) : null}
      </p>
      {right}
    </div>
  );
}

interface PrimaryProps {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  /** 눌러도 아무 일도 없음 */
  disabled?: boolean;
  /** 회색(할 수 없는 상태) */
  muted?: boolean;
  /** 진행 중(조금 옅게 + 돌아가는 표시는 children 에서) */
  dim?: boolean;
}

/** 시트 아래 꽉 찬 청록 버튼 */
export function FormPrimaryButton({ children, type = "button", onClick, disabled, muted, dim }: PrimaryProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-gothic text-[0.9375rem] font-semibold"
      style={
        muted
          ? { background: "#E9EDEF", color: FORM_C.mute }
          : { background: FORM_C.teal, color: "#FFFFFF", opacity: dim ? 0.75 : 1 }
      }
    >
      {children}
    </button>
  );
}

export function FormSpinner({ size = 17 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

interface FormSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 제목 아래 한 줄 설명 */
  desc?: string;
  /** 머리 타일 안의 아이콘(lucide, size 20 strokeWidth 1.8) */
  icon: ReactNode;
  tileBg: string;
  tileInk: string;
  children: ReactNode;
  /** 시트 맨 아래(보통 FormPrimaryButton + 안내 문구) */
  footer?: ReactNode;
  /** 있으면 children+footer 를 <form> 으로 감쌉니다(엔터·제출 버튼용) */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** true 면 바깥·닫기 버튼이 닫지 않습니다(만드는 중 등) */
  closeLocked?: boolean;
  /** 겹쳐 뜨는 다른 창보다 위/아래로 둘 때(기본 50) */
  zIndex?: number;
}

export default function FormSheet({
  open, onClose, title, desc, icon, tileBg, tileInk, children, footer, onSubmit, closeLocked, zIndex = 50,
}: FormSheetProps) {
  if (!open) return null;
  const close = () => {
    if (!closeLocked) onClose();
  };
  const body = (
    <>
      <div className="mt-3.5 flex flex-col gap-[13px]">{children}</div>
      {footer}
    </>
  );
  return (
    <div className="fixed inset-0" style={{ zIndex }} onClick={close}>
      <div className="absolute inset-0" style={{ background: "rgba(20,30,35,0.38)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white overflow-y-auto"
        style={{
          borderRadius: "22px 22px 0 0",
          maxHeight: "92dvh",
          padding: "8px 20px calc(18px + env(safe-area-inset-bottom)) 20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2.5 h-1 w-9 rounded-full" style={{ background: FORM_C.line }} />
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: tileBg, color: tileInk }}
          >
            {icon}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[1rem] font-semibold" style={{ color: FORM_C.txt }}>{title}</span>
            {desc ? (
              <span className="block mt-0.5 font-gothic text-[0.78125rem]" style={{ color: FORM_C.sub }}>{desc}</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={close}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#F1F4F5", color: FORM_C.sub }}
            title="닫기"
            aria-label="닫기"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
        {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
      </div>
    </div>
  );
}
