// src/components/LocalWipeDialog.tsx
// 공개판 계정 삭제가 끝난 직후에만 뜨는 확인 창 — "이 폰에 있는 단어장과 학습 기록도 지울까요?" (2026-11-14, D-10)
// 계정을 지우면 로그인 화면으로 바뀌어 내 정보 화면이 사라지므로, 이 창은 앱 맨 바깥(App.tsx)에 둡니다.
// 기본은 [남겨두기]. 로그아웃에서는 뜨지 않습니다. 관리자판·회원판에는 계정 삭제가 없어 뜰 일이 없습니다.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmSheet } from "@/components/sheet/AppSheet";
import { onAskLocalWipe, wipeLocalStudyData } from "@/lib/localWipe";

const LocalWipeDialog = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAskLocalWipe(() => setOpen(true)), []);

  const keep = () => {
    if (busy) return;
    setOpen(false);
    toast("이 폰의 단어장과 기록은 그대로 남겨 두었습니다", { duration: 5000 });
  };

  const wipe = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await wipeLocalStudyData();
    if (!ok) {
      setBusy(false);
      setOpen(false);
      toast("일부를 지우지 못했습니다. 폰 설정의 앱 정보에서 저장공간을 비우면 모두 지워집니다", { duration: 8000 });
      return;
    }
    // 메모리에 남은 단어장이 다시 저장되지 않게 화면을 새로 엽니다. 기본 단어장은 다시 깔립니다.
    try {
      window.location.reload();
    } catch (e) {
      setBusy(false);
      setOpen(false);
    }
  };

  // 앱 공통 틀의 확인 창(2026-11-24). X·바깥·끌기·폰 뒤로가기 = 남겨두기(예전에는 뒤로가기가 이 창을 닫지 않았음).
  return (
    <ConfirmSheet
      open={open}
      onCancel={keep}
      onConfirm={wipe}
      title="이 폰에 있는 단어장과 학습 기록도 지울까요?"
      message={
        <>
          계정은 삭제했습니다. 내 단어장·찾아본 단어·훈장·불러온 이야기·만든 대화는 아직 이 폰에 있습니다.
          지우면 되돌릴 수 없습니다. 백업 파일을 저장해 두지 않았다면 남겨 두세요. 글자 크기 같은 설정은 그대로입니다.
        </>
      }
      confirmLabel={busy ? "지우는 중..." : "모두 지우기"}
      cancelLabel="남겨두기"
      danger
      busy={busy}
      backClose
      zIndex={70}
    />
  );
};

export default LocalWipeDialog;
