// src/components/WebGate.tsx
// 스토어 앱이 아닌 곳(브라우저, 관리자판·회원판 APK)에서 회원키도 예전 설교문·성경 설정도 없는 방문자는
// 앱 대신 안내 화면을 봅니다 (2026-11-14 결정 — 출시 전 점검 E-01).
//
// 그 전에는 "스토어 앱이 아니면 모두 열림(관리자 등급)"이라, 같은 주소를 브라우저로 열면 유료 내용
// (기본 단어장·그림·회화집·지도·이해·게임)과 기독교 화면이 로그인·결제 없이 전부 열렸습니다.
//
// 지금과 똑같이 열리는 곳 (getEdition() 이 admin·member):
//   · 회원키를 넣은 브라우저·관리자판 APK·회원판 APK
//   · 예전 설교문 서버 설정이나 성경 비밀키가 남아 있는 기존 기기
// 스토어 앱·미리보기 빌드는 이 문을 그냥 지나갑니다(그쪽은 LoginGate 가 맡음).
//
// 새 기기·새 브라우저에 회원키를 넣을 길이 없어지면 안 되므로, 안내 화면 아래에 회원키 입력을 둡니다.
// 번들에는 본문이 그대로 들어 있어 완전히 막는 것은 아닙니다 — "손쉬운 길"을 닫는 것이 목표입니다.

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { isStoreApp, PLAY_STORE_URL, PRIVACY_URL, TERMS_URL } from "@/lib/platform";
import { activateAndSync, getEdition } from "@/lib/access";
import { formatMemberInput } from "@/components/SettingsDialog";

/** 이 방문자에게 앱 대신 안내 화면을 보여야 하는가 */
export function isWebClosed(): boolean {
  return !isStoreApp() && getEdition() === "public";
}

const NoticeScreen = () => {
  const [keyOpen, setKeyOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openKey = () => {
    setKeyOpen(true);
    if (!input) setInput("KK-");
    setTimeout(() => {
      try { inputRef.current?.focus(); } catch (e) {}
    }, 50);
  };

  const activate = async () => {
    if (busy || done) return;
    setBusy(true);
    setMsg("확인 중...");
    try {
      const r = await activateAndSync(input, (m) => setMsg("받는 중 · " + m));
      setDone(true);
      setMsg((r.profile.name || "회원") + "님, 활성화되었습니다. 앱을 엽니다");
      // 판이 바뀌므로 앱을 새로 그립니다
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (m === "BAD_FORMAT") setMsg("회원키 형식이 맞지 않습니다 (KK-XXXX-XXXX-XXXX)");
      else if (m === "UNKNOWN") setMsg("없는 회원키입니다. 다시 확인해 주세요");
      else if (m === "DEVICE_TAKEN") setMsg("이미 다른 기기에서 쓰고 있는 회원키입니다. 관리자에게 기기 풀어주기를 요청해 주세요");
      else setMsg("서버와 연결하지 못했습니다. 인터넷을 확인해 주세요");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col bg-background px-6">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="font-word text-[2.25rem] font-semibold leading-none tracking-tight text-foreground">
          Kata kata<span className="text-accent">.</span>
        </h1>
        {/* 좁은 화면에서 "있습니다."만 다음 줄로 떨어지지 않게 두 덩어리로 끊습니다 */}
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground">
          <span className="inline-block">Kata kata 는 Google Play 앱으로</span>{" "}
          <span className="inline-block">이용할 수 있습니다.</span>
        </p>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted-foreground" style={{ wordBreak: "keep-all" }}>
          인도네시아어를 단어부터 문장까지. 사전·단어장·이야기·회화를 한곳에서.
        </p>
        {PLAY_STORE_URL ? (
          <a
            href={PLAY_STORE_URL}
            className="mt-6 w-full h-[54px] rounded-[27px] border border-border bg-card text-[0.9375rem] font-gothic font-semibold text-foreground flex items-center justify-center active:bg-muted"
          >
            Google Play 에서 받기
          </a>
        ) : null}
      </div>

      <div className="pb-[max(28px,env(safe-area-inset-bottom))]">
        {keyOpen ? (
          <div>
            <label htmlFor="webgate-member-key" className="block text-[0.8125rem] font-gothic text-foreground">
              회원키
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="webgate-member-key"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(formatMemberInput(e.target.value, input))}
                onKeyDown={(e) => { if (e.key === "Enter") activate(); }}
                placeholder="KK-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                className="flex-1 min-w-0 h-11 rounded-xl border border-border bg-card px-3 font-gothic text-[0.9375rem] text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={activate}
                disabled={busy || input.length < 17}
                className="shrink-0 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-gothic text-[0.875rem] font-semibold flex items-center gap-1.5 disabled:opacity-60"
              >
                {busy && !done ? <Loader2 size={16} className="animate-spin" /> : null}
                확인
              </button>
            </div>
            {msg ? (
              <p role="status" className={"mt-2 text-[0.8125rem] leading-relaxed font-gothic " + (done ? "text-foreground" : "text-muted-foreground")}>
                {msg}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={openKey}
            className="w-full text-center text-[0.8125rem] font-gothic text-muted-foreground underline"
          >
            회원키가 있습니다
          </button>
        )}
        <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-muted-foreground font-gothic">
          <a href={TERMS_URL} className="underline">이용약관</a>
          {" · "}
          <a href={PRIVACY_URL} className="underline">개인정보처리방침</a>
        </p>
      </div>
    </div>
  );
};

const WebGate = ({ children }: { children: React.ReactNode }) => {
  // 한 번만 판단합니다. 회원키를 넣으면 화면을 새로 불러오므로 그때 다시 판단됩니다.
  const [closed] = useState<boolean>(() => isWebClosed());
  if (closed) return <NoticeScreen />;
  return <>{children}</>;
};

export default WebGate;
