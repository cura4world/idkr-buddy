// src/components/FormSheet.tsx
// 입력 시트(① 입력 종류)의 공용 부품 — 2026-11-24 부터 앱 공통 틀(src/components/sheet/AppSheet.tsx) 위에 얹었습니다.
//   틀: 아래에서 올라옴 · 위 모서리 22px · 손잡이(끌어 닫기) · 머리(40px 아이콘 칸 + 제목 + 한 줄 설명 + X) · 바닥 단추 고정 · 움직임
//   이 파일: 칸 이름(0.84375rem 굵게) · 입력칸(둥근 14px, 1.5px 테두리, 포커스 시 청록 테두리 + 옅은 청록 그림자, 글자 0.875rem) · 주 단추
// 쓰는 곳: 회화집 만들기 · 단어 추가 · 단어장 만들기 · CSV 가져오기 · 이름 바꾸기 · Plus 잠금 안내.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다 — 쓰는 쪽이 useBackClose(open, close) 로 처리합니다.
// 입력 칸 글자는 부르는 쪽이 font-word(인니어)·font-body(한글)를 고릅니다.
// dirty: 이미 글을 넣었으면 true — 끌기·바깥 누르기로는 닫히지 않고 X 로만 닫힙니다(2026-11-24 Arga).

import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import AppSheet, { SHEET, SheetButton, SheetTone } from "@/components/sheet/AppSheet";

export const FORM_C = {
  txt: SHEET.txt,
  sub: SHEET.sub,
  mute: SHEET.mute,
  teal: SHEET.teal,
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
      <p className="m-0 flex-1 min-w-0 font-gothic text-[0.84375rem] font-bold" style={{ color: SHEET.label }}>
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

/** 시트 바닥의 꽉 찬 청록 단추(적용하고 닫기) */
export function FormPrimaryButton({ children, type = "button", onClick, disabled, muted, dim }: PrimaryProps) {
  return (
    <SheetButton type={type} onClick={onClick} disabled={disabled} muted={muted} dim={dim}>
      {children}
    </SheetButton>
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
  /** 머리 칸 안의 아이콘(lucide, size 20 strokeWidth 1.8) */
  icon: ReactNode;
  /** 머리 칸 색 — 입력 창은 청록(기본), Plus 안내는 "plus" */
  tone?: SheetTone;
  children: ReactNode;
  /** 시트 바닥(보통 FormPrimaryButton + 안내 문구) — 바닥에 고정됩니다 */
  footer?: ReactNode;
  /** 있으면 children+footer 를 <form> 으로 감쌉니다(엔터·제출 버튼용) */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** true 면 바깥·닫기 버튼·끌기가 닫지 않습니다(만드는 중 등) */
  closeLocked?: boolean;
  /** true 면 끌기·바깥 누르기로 닫히지 않습니다(이미 글을 넣음) — X 로만 */
  dirty?: boolean;
  /** 겹쳐 뜨는 다른 창보다 위/아래로 둘 때(기본 50) */
  zIndex?: number;
}

export default function FormSheet({
  open, onClose, title, desc, icon, tone = "teal", children, footer, onSubmit, closeLocked, dirty, zIndex = 50,
}: FormSheetProps) {
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      desc={desc}
      icon={icon}
      tone={tone}
      footer={footer}
      onSubmit={onSubmit}
      closeLocked={closeLocked}
      dirty={dirty}
      zIndex={zIndex}
      gap={13}
    >
      {children}
    </AppSheet>
  );
}
