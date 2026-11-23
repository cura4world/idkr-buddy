// src/components/PlusLockSheet.tsx
// 잠긴 항목을 눌렀을 때 뜨는 공용 안내 창 (2026-11-23 Arga 결정 D3 — 7일 체험 폐지·메뉴별 맛보기와 함께).
// 앱 어디서든 openPlusLock(제목) 으로 엽니다(src/lib/plusLock.ts). App.tsx 가 한 번만 붙입니다.
//   작은 자물쇠 타일 + 제목("○○는 Plus 회원 기능입니다") + 한 줄 설명 + [자세히 보기] → 구독 화면
// 폰 뒤로가기는 창만 닫습니다(useBackClose). "자세히 보기"는 창이 쌓은 칸을 바꿔치기(replace)해
// 구독 화면에서 한 번 뒤로 = 창을 열기 전 화면이 되게 합니다.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import FormSheet from "@/components/FormSheet";
import { useBackClose } from "@/hooks/useBackClose";
import { onPlusLock } from "@/lib/plusLock";
import { PAYWALL_PATH } from "@/lib/plan";
import { LOCK_BUTTON_SUB } from "@/lib/plusCopy";

const LOCK_DESC = "Plus를 시작하면 기본 단어장 34권, 회화집, 인도네시아 이해, 게임이 모두 열립니다.";

export default function PlusLockSheet() {
  const navigate = useNavigate();
  const [title, setTitle] = useState<string | null>(null);
  const open = title !== null;
  const { onTop } = useBackClose(open, () => setTitle(null));

  useEffect(() => onPlusLock((t) => setTitle(t || "Plus 회원 기능입니다")), []);

  const more = () => {
    // 창이 쌓은 칸 위에서 이동하면 그 칸을 구독 화면으로 바꿔치기 — setState 는 이동 뒤 하나만(CLAUDE.md)
    navigate(PAYWALL_PATH, { replace: onTop() });
    setTitle(null);
  };

  return (
    <FormSheet
      open={open}
      onClose={() => setTitle(null)}
      title={title || ""}
      icon={<Lock size={19} strokeWidth={2} />}
      tileBg="#FFF6DC"
      tileInk="#8A6A12"
      zIndex={60}
      footer={
        <button
          type="button"
          onClick={more}
          className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center font-gothic text-[0.9375rem] font-semibold text-white active:opacity-90"
          style={{ background: "#8A6A12" }}
        >
          Plus {LOCK_BUTTON_SUB}
        </button>
      }
    >
      <p className="m-0 font-gothic text-[0.8125rem] leading-[1.6] break-keep" style={{ color: "#646C72" }}>
        {LOCK_DESC}
      </p>
    </FormSheet>
  );
}
