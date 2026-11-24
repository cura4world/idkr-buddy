// src/components/LoginGate.tsx
// 스토어 앱(공개판)은 Google 로그인 전에는 앱을 쓸 수 없습니다(2026-11-10 결정: 처음부터 필수).
// 관리자판·회원판 APK와 브라우저에서는 아무것도 하지 않고 그대로 통과시킵니다.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  autoRestoreOnce,
  isLapsedPaidPlan,
  onVerifyEvent,
  resumeVerifyIfNeeded,
  retryVerifyNow,
  takeManageReturn,
} from "@/lib/billing";
import { createExpiryWatcher } from "@/lib/planExpiry";
import { isPreview } from "@/lib/preview";
import { isOtherAccountCode, TOAST_OTHER_ACCOUNT, TOAST_VERIFIED } from "@/lib/plusCopy";

// 화면이 다시 보일 때 서버에서 등급을 새로 받는 최소 간격 (2026-11-14 출시 전 점검 C-13)
const REFRESH_GAP_MS = 10 * 60 * 1000;
// "유료였는데 만료 시각이 지남"·"구독 관리 화면에서 돌아옴"일 때는 10분을 기다리지 않습니다. 다만 화면이 연달아
// 보였다 숨었다 할 때 Play·서버를 두드리지 않게 이 간격 안에서는 한 번만(2026-11-23 내부 테스트 1장 A·F).
const FORCED_GAP_MS = 30 * 1000;

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
          사전·단어장·이야기·회화집을 한곳에서. 공부 기록은 이 폰에 저장됩니다. 폰을 바꿀 때는 내 정보에서 백업 파일을 만들어 옮기세요.
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

    // 구매를 강제로 다시 확인하고(서버가 Play 에 바로 물음) 그다음 등급을 새로 받습니다.
    // 서버의 /me 는 이용 중인 구독을 하루에 한 번·만료 뒤 한 시간에 한 번만 Play 에 묻기 때문에, /me 만으로는
    // 갱신·해지가 늦게 반영됩니다. 구매 확인(/billing/verify)은 부를 때마다 Play 에 묻습니다.
    let lastForcedAt = 0;
    const forceRecheck = (): Promise<void> => {
      if (!getSession()) return Promise.resolve();
      lastForcedAt = Date.now();
      lastRefreshAt = lastForcedAt;
      return autoRestoreOnce(true, { force: true })
        .then(() => refreshMe().catch(() => null))
        .then(() => undefined);
    };

    // 유료 등급의 만료 시각 + 3초(서버가 아직이면 + 60초·+ 3분)에 다시 확인하는 시계(src/lib/planExpiry.ts).
    // 그동안 등급은 갱신 확인 유예(plan.ts RENEW_GRACE_MS)로 Plus 그대로입니다. 세션이 바뀔 때마다 다시 맞춥니다.
    const watcher = createExpiryWatcher({
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      getPlan: () => {
        const s = getSession();
        return s && s.plan ? { tier: String(s.plan.tier), until: Number(s.plan.until) || 0 } : null;
      },
      recheck: () => forceRecheck(),
    });
    const offWatch = onSessionChange(() => watcher.sync());

    // 앱이 켜질 때 한 번. 지난번에 끝내지 못한 "결제 확인 중"이 있으면 이어 갑니다.
    refresh(false);
    resumeVerifyIfNeeded();
    watcher.sync();

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
      // Play 구독 관리 화면(해지 등)에서 돌아왔거나, 유료였는데 만료 시각이 지났으면 10분을 기다리지 않고 바로 확인합니다.
      const manage = takeManageReturn();
      const s = getSession();
      const lapsed = !!s && isLapsedPaidPlan(s.plan);
      if ((manage || lapsed) && Date.now() - lastForcedAt >= FORCED_GAP_MS) {
        forceRecheck().catch(() => {});
        return;
      }
      if (Date.now() - lastRefreshAt >= REFRESH_GAP_MS) refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // 자동 재검증의 결과 알림 — 결제 직후 확인이 실패했던 구매가 뒤늦게 확인됐을 때.
    const offVerify = onVerifyEvent((e) => {
      if (e.type === "done") toast(TOAST_VERIFIED);
      else if (e.type === "stopped" && isOtherAccountCode(e.code)) toast(TOAST_OTHER_ACCOUNT, { duration: 6000 });
    });

    return () => {
      off();
      offWatch();
      watcher.stop();
      offRestore();
      offVerify();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [store]);

  // 로그인 화면이 떠 있는 동안 주소를 홈으로 돌려 둡니다(2026-11-23 내부 테스트 Arga 3).
  // 내 정보에서 로그아웃·계정 삭제하거나 세션이 끊기면 주소가 /me 등 그대로 남아, 다시 로그인하면 그 화면이 첫 화면으로
  // 열렸습니다. 자식 화면은 이미 내려간 뒤라 이동만 합니다(setState 와 navigate 를 함께 부르지 않음 — CLAUDE.md).
  const navigate = useNavigate();
  const location = useLocation();
  const showSignIn = store && !session;
  useEffect(() => {
    if (!showSignIn || location.pathname === "/") return;
    navigate("/", { replace: true });
    // 라우터는 기본 경로 뒤의 "/"를 떼어 주소를 ".../idkr-buddy" 로 만듭니다. 이 상태에서 화면을 새로 열면(계정 삭제 뒤
    // "모두 지우기"가 새로 고침) 서버에 따라 다른 주소로 봅니다 — 맨 끝 "/"를 붙인 원래 주소로 맞춰 둡니다(라우터 상태는 그대로).
    try {
      const base = import.meta.env.BASE_URL || "/";
      if (window.location.pathname + "/" === base) window.history.replaceState(window.history.state, "", base + window.location.search);
    } catch (e) {}
  }, [showSignIn, location.pathname, navigate]);

  if (!store || session) return <>{children}</>;
  return <SignInScreen />;
};

export default LoginGate;
