// src/components/AccountSection.tsx
// 설정 창의 "내 계정" 구역 — 스토어 앱(공개판)에서만, 회원키 구역 자리에 들어갑니다.
// 이메일 · 플랜 · 오늘 사용량 · Plus · 구독 관리 · 로그아웃 · 계정 삭제 · 약관 링크.
// 계정 삭제는 Play 정책 요건입니다(앱 안에서 직접 지울 수 있어야 함).

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAccount,
  getSession,
  onSessionChange,
  refreshMe,
  signOut,
  PublicLimits,
  PublicSession,
  PublicUsage,
} from "@/lib/account";
import { manageSubscription } from "@/lib/billing";
import { DELETE_ACCOUNT_URL, PRIVACY_URL, TERMS_URL } from "@/lib/platform";

interface Props {
  onGo: (path: string) => void; // 설정 창을 닫고 다른 화면으로 (돌아오면 다시 열림)
}

const AccountSection = ({ onGo }: Props) => {
  const [session, setSession] = useState<PublicSession | null>(getSession());
  const [usage, setUsage] = useState<PublicUsage | null>(null);
  const [limits, setLimits] = useState<PublicLimits | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const off = onSessionChange(setSession);
    refreshMe()
      .then((r) => {
        if (r) {
          setUsage(r.usage);
          setLimits(r.limits);
        }
      })
      .catch(() => {});
    return off;
  }, []);

  if (!session) return null;
  const plus = session.plan.tier === "plus" && session.plan.until > Date.now();

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  const handleDelete = async () => {
    if (busy) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setBusy(true);
    try {
      const r = await deleteAccount();
      toast(
        r.hadSubscription
          ? "계정을 지웠습니다. 구독 결제는 Google Play 에서 따로 해지해 주세요"
          : "계정을 지웠습니다",
        { duration: 8000 },
      );
    } catch (e) {
      toast("지우지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요");
      setBusy(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="pt-3 border-t border-border/60">
      <Label className="font-body text-sm text-gray-900">내 계정</Label>
      <p className="mt-1 text-xs font-gothic text-gray-900 break-all">{session.user.email}</p>
      <p className="mt-0.5 text-xs font-gothic text-muted-foreground">
        {plus ? "Kata kata Plus 이용 중" : "무료 이용 중"}
        {usage && limits ? " · 오늘 AI 풀이 " + usage.text + "/" + limits.text + " · 음성 " + usage.tts + "/" + limits.tts : ""}
      </p>

      <Button
        type="button"
        variant={plus ? "outline" : "default"}
        className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
        onClick={() => onGo("/plus")}
      >
        <Sparkles className="w-4 h-4 mr-1.5" />
        {plus ? "Kata kata Plus" : "Kata kata Plus 알아보기"}
      </Button>
      {plus ? (
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
          onClick={() => manageSubscription()}
        >
          구독 관리 (Google Play)
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="w-full mt-2 whitespace-normal h-auto py-2.5 leading-snug text-xs"
        disabled={busy}
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-1.5" />
        로그아웃
      </Button>

      {/* 계정 삭제는 다른 버튼과 간격을 두어 따로 떼어 둡니다(실수로 누르지 않게) */}
      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          className={"w-full whitespace-normal h-auto py-2.5 leading-snug text-xs text-red-600 " + (deleteConfirm ? "border-red-400" : "border-red-200")}
          disabled={busy}
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          {deleteConfirm ? "한 번 더 누르면 계정과 서버 기록을 지웁니다" : "계정 삭제"}
        </Button>
        {deleteConfirm ? (
          <p className="mt-1.5 text-xs leading-relaxed font-gothic text-red-600">
            서버의 계정·사용 기록·구독 연결이 지워지고 되돌릴 수 없습니다. 이 폰의 단어장은 그대로 남습니다.
            구독 중이라면 결제는 Google Play 에서 따로 해지해야 합니다.
          </p>
        ) : null}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-gothic text-muted-foreground">
        <a href={PRIVACY_URL} className="underline">개인정보처리방침</a>
        <a href={TERMS_URL} className="underline">이용약관</a>
        <a href={DELETE_ACCOUNT_URL} className="underline">계정 삭제 안내</a>
      </p>
    </div>
  );
};

export default AccountSection;
