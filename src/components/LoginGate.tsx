// src/components/LoginGate.tsx
// 스토어 앱(공개판)은 Google 로그인 전에는 앱을 쓸 수 없습니다(2026-11-10 결정: 처음부터 필수).
// 관리자판·회원판 APK와 브라우저에서는 아무것도 하지 않고 그대로 통과시킵니다.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { isStoreApp, PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import {
  getSession,
  onSessionChange,
  refreshMe,
  signInWithGoogle,
  signInErrorText,
  PublicSession,
} from "@/lib/account";
import { autoRestoreOnce } from "@/lib/billing";

const SignInScreen = () => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
          사전·단어장·이야기·회화를 한곳에서. 내 단어장과 기록은 계정에 맞춰 관리됩니다.
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
  const store = isStoreApp();
  const [session, setSession] = useState<PublicSession | null>(() => (store ? getSession() : null));

  useEffect(() => {
    if (!store) return;
    const off = onSessionChange(setSession);
    // 앱이 켜질 때 서버에서 플랜을 다시 받습니다. 세션이 끊겼으면 로그인 화면으로 돌아갑니다.
    // 그다음 구매를 조용히 다시 확인합니다(확인 못 한 구매가 환불되지 않도록).
    if (getSession()) refreshMe().catch(() => {}).finally(() => autoRestoreOnce());
    const offRestore = onSessionChange((s) => {
      if (s) autoRestoreOnce();
    });
    return () => {
      off();
      offRestore();
    };
  }, [store]);

  if (!store || session) return <>{children}</>;
  return <SignInScreen />;
};

export default LoginGate;
