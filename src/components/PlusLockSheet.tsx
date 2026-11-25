// src/components/PlusLockSheet.tsx
// 잠긴 항목을 눌렀을 때 뜨는 공용 안내 창 (2026-11-23 Arga 결정 D3 — 7일 체험 폐지·메뉴별 맛보기와 함께).
// 앱 어디서든 openPlusLock(제목) 으로 엽니다(src/lib/plusLock.ts). App.tsx 가 한 번만 붙입니다.
//   작은 자물쇠 타일 + 제목("○○는 Plus 회원 기능입니다") + 본문 + [자세히 보기] → 구독 화면
// 본문(2026-11-25 Arga 승인 ①): 첫 줄은 누른 것에 맞춘 문장(tasteAccess.lockBodyFor), 둘째 줄은 공통 "Plus를 시작하면 모든 기능이 열립니다."
//   첫 줄이 없는 제목은 공통 한 줄만 본문 자리에 씁니다.
// 제목은 "Plus 회원 기능입니다"를 쪼개지 않고 그립니다(components/LockTitle, ⑤).
// 폰 뒤로가기는 창만 닫습니다(useBackClose). "자세히 보기"는 창이 쌓은 칸을 바꿔치기(replace)해
// 구독 화면에서 한 번 뒤로 = 창을 열기 전 화면이 되게 합니다. 구독 화면의 하단 탭은 창을 연 화면의 탭(④).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import FormSheet, { FormPrimaryButton } from "@/components/FormSheet";
import LockTitle from "@/components/LockTitle";
import { paywallState } from "@/components/BottomTabs";
import { SHEET } from "@/components/sheet/AppSheet";
import { useBackClose } from "@/hooks/useBackClose";
import { onPlusLock } from "@/lib/plusLock";
import { PAYWALL_PATH } from "@/lib/plan";
import { LOCK_BUTTON_SUB } from "@/lib/plusCopy";
import { LOCK_BODY_COMMON, lockBodyFor } from "@/lib/tasteAccess";

export default function PlusLockSheet() {
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState<string | null>(null);
  const open = title !== null;
  const { onTop } = useBackClose(open, () => setTitle(null));

  useEffect(() => onPlusLock((t) => setTitle(t || "Plus 회원 기능입니다")), []);

  const more = () => {
    // 창이 쌓은 칸 위에서 이동하면 그 칸을 구독 화면으로 바꿔치기 — setState 는 이동 뒤 하나만(CLAUDE.md)
    navigate(PAYWALL_PATH, { replace: onTop(), state: paywallState(location.pathname) });
    setTitle(null);
  };

  const first = lockBodyFor(title || "");

  return (
    <FormSheet
      open={open}
      onClose={() => setTitle(null)}
      title={title || ""}
      titleNode={
        <span className="block font-gothic text-[1rem] font-bold break-keep" style={{ color: SHEET.txt }}>
          <LockTitle text={title || ""} />
        </span>
      }
      icon={<Lock size={20} strokeWidth={1.8} />}
      tone="plus"
      zIndex={60}
      footer={
        // 주 단추는 앱 공통 청록, 금색은 머리 아이콘 칸에만(2026-11-24 Arga S3)
        <FormPrimaryButton onClick={more}>Plus {LOCK_BUTTON_SUB}</FormPrimaryButton>
      }
    >
      <div data-lock-body>
        {first ? (
          <p data-lock-first className="m-0 font-gothic text-[0.84375rem] leading-[1.6] break-keep" style={{ color: "#3B4245" }}>
            {first}
          </p>
        ) : null}
        <p
          data-lock-common
          className={
            first
              ? "m-0 mt-1 font-gothic text-[0.75rem] leading-[1.55] break-keep"
              : "m-0 font-gothic text-[0.84375rem] leading-[1.6] break-keep"
          }
          style={{ color: first ? "#7A8388" : "#3B4245" }}
        >
          {LOCK_BODY_COMMON}
        </p>
      </div>
    </FormSheet>
  );
}
