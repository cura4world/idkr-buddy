// src/components/LoginGate.tsx
// 스토어 앱(공개판)은 Google 로그인 전에는 앱을 쓸 수 없습니다(2026-11-10 결정: 처음부터 필수).
// 관리자판·회원판 APK와 브라우저에서는 아무것도 하지 않고 그대로 통과시킵니다.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isStoreApp, PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import {
  getSession,
  onSessionChange,
  refreshMe,
  signInWithGoogle,
  signInErrorText,
  takeSessionExpired,
  SESSION_EXPIRED_TEXT,
  PublicSession,
} from "@/lib/account";
import { autoRestoreOnce, onVerifyEvent, resumeVerifyIfNeeded, retryVerifyNow } from "@/lib/billing";
import { isPreview } from "@/lib/preview";
import { isOtherAccountCode, TOAST_OTHER_ACCOUNT, TOAST_VERIFIED, TOAST_VERIFIED_TRIAL } from "@/lib/plusCopy";

// 화면이 다시 보일 때 서버에서 등급을 새로 받는 최소 간격 (2026-11-14 출시 전 점검 C-13)
const REFRESH_GAP_MS = 10 * 60 * 1000;

const SignInScreen = () => {
  const [busy, setBusy] = useState(false);
  // 서버가 세션을 받지 않아(401) 로그인 화면으로 돌아온 것이면 그 사실을 먼저 알려 줍니다.
  const [msg, setMsg] = useState(() => (takeSessionExpired() ? SESSION_EXPIRED_TEXT : ""));

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await signInWithGoogle(); // 성공하면 onSessionChange 로 화면이 바뀝니다
    } catch (e) {
      const code = e instanceof Error ? e.message : "FAILED";
      setMsg(signInErrorText(code));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col bg-background px-6">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="font-word text-[2.25rem] font-semibold leading-none tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground">
          인도네시아어를 단어부터 문장까지.
        </p>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted-foreground">
          사전·단어장·이야기·회화를 한곳에서. 학습 기록은 이 폰에 저장됩니다. 폰을 바꿀 때는 내 정보에서 백업 파일을 만들어 옮기세요.
        </p>
      </div>

      <div className="pb-[max(28px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="w-full h-[54px] rounded-[27px] border border-border bg-card text-[0.9375rem] font-gothic font-semibold text-foreground flex items-center justify-center gap-2 active:bg-muted disabled:opacity-70"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : null}
          Google 계정으로 계속하기
        </button>
        {msg ? (
          <p role="alert" className="mt-3 text-center text-[0.8125rem] leading-relaxed text-red-600">
            {msg}
          </p>
        ) : null}
        <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-muted-foreground font-gothic">
          계속하면{" "}
          <a href={TERMS_URL} className="underline">이용약관</a>과{" "}
          <a href={PRIVACY_URL} className="underline">개인정보처리방침</a>에 동의하는 것으로 봅니다.
        </p>
      </div>
    </div>
  );
};

const LoginGate = ({ children }: { children: React.ReactNode }) => {
  // 미리보기 APK 는 로그인 없이 바로 엽니다(콘솔 설정 전이라 로그인·결제를 쓰지 않음). 서버 확인도 하지 않습니다.
  const store = isStoreApp() && !isPreview();
  const [session, setSession] = useState<PublicSession | null>(() => (store ? getSession() : null));

  useEffect(() => {
    if (!store) return;
    const off = onSessionChange(setSession);
    let lastRefreshAt = 0;

    // 서버에서 등급을 새로 받고, 그다음 구매를 조용히 다시 확인합니다(확인 못 한 구매가 환불되지 않도록).
    // 세션이 끊겼으면 로그인 화면으로 돌아갑니다.
    const refresh = (again: boolean) => {
      if (!getSession()) return;
      lastRefreshAt = Date.now();
      refreshMe().catch(() => {}).finally(() => autoRestoreOnce(again));
    };

    // 앱이 켜질 때 한 번. 지난번에 끝내지 못한 "결제 확인 중"이 있으면 이어 갑니다.
    refresh(false);
    resumeVerifyIfNeeded();

    // 로그인 직후(다른 계정으로 다시 로그인한 경우 포함)에도 구매를 다시 확인합니다.
    const offRestore = onSessionChange((s) => {
      if (s) autoRestoreOnce();
    });

    // 화면이 다시 보일 때: 확인 중인 결제는 바로 다시 검증하고, 등급은 10분에 한 번까지 새로 받습니다.
    // 스토어 앱은 뒤로가기로 꺼지지 않아 페이지가 며칠 살아 있습니다 — 그사이 구독이 갱신·만료·환불돼도
    // 앱을 완전히 닫지 않고 반영되게 합니다.
    const onVisible = () => {
      try {
        if (document.visibilityState !== "visible") return;
      } catch (e) {
        return;
      }
      retryVerifyNow();
      if (Date.now() - lastRefreshAt >= REFRESH_GAP_MS) refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // 자동 재검증의 결과 알림 — 결제 직후 확인이 실패했던 구매가 뒤늦게 확인됐을 때.
    const offVerify = onVerifyEvent((e) => {
      if (e.type === "done") toast(e.plan.tier === "trial" ? TOAST_VERIFIED_TRIAL : TOAST_VERIFIED);
      else if (e.type === "stopped" && isOtherAccountCode(e.code)) toast(TOAST_OTHER_ACCOUNT, { duration: 6000 });
    });

    return () => {
      off();
      offRestore();
      offVerify();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [store]);

  if (!store || session) return <>{children}</>;
  return <SignInScreen />;
};

export default LoginGate;
