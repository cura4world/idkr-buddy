// src/components/PreviewPanel.tsx
// 미리보기 APK 전용 — 화면 오른쪽 아래 작은 알약 "미리보기 · 등급" 과 그 설정 시트.
// App.tsx 가 isPreview() 일 때만 한 번 붙입니다. 관리자판·회원판·스토어 앱에는 나타나지 않습니다.
//
// 시트: 등급 전환 / 체험을 이미 쓴 계정 / Gemini API 키 / 이 미리보기 데이터 비우기.
// 폰 뒤로가기는 시트만 닫도록 히스토리를 한 칸 쌓습니다(CLAUDE.md: 한 화면 안의 뒤로가기는 pushState + popstate).

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tier, TIER_LABEL, setPreviewTier, usePlan } from "@/lib/plan";
import {
  clearPreviewData, onPreviewChange, previewBuildLabel, previewTrialUsed, setPreviewTrialUsed,
} from "@/lib/preview";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";

const TIERS: Tier[] = ["free", "trial", "plus", "special", "admin"];

function maskKey(k: string): string {
  if (!k) return "";
  return "끝자리 " + k.slice(-4);
}

export default function PreviewPanel() {
  const { tier } = usePlan();
  const [open, setOpen] = useState(false);
  const [trialUsed, setTrialUsed] = useState<boolean>(previewTrialUsed());
  const [savedKey, setSavedKey] = useState<string>(getGeminiApiKey());
  const [keyInput, setKeyInput] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);
  const openRef = useRef(false);
  const pushedRef = useRef(false);

  useEffect(() => onPreviewChange(() => setTrialUsed(previewTrialUsed())), []);

  // 뒤로가기 → 시트만 닫힘
  useEffect(() => {
    const onPop = () => {
      if (!openRef.current) return;
      openRef.current = false;
      pushedRef.current = false;
      setOpen(false);
      setConfirmWipe(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openSheet = () => {
    if (openRef.current) return;
    setSavedKey(getGeminiApiKey());
    setKeyInput("");
    setConfirmWipe(false);
    setOpen(true);
    openRef.current = true;
    try {
      // 라우터가 쓰는 state(key·idx)는 그대로 두고 표시만 더합니다.
      const prev = (window.history.state || {}) as Record<string, unknown>;
      window.history.pushState(Object.assign({}, prev, { kataPreviewSheet: true }), "");
      pushedRef.current = true;
    } catch (e) {
      pushedRef.current = false;
    }
  };

  const closeSheet = () => {
    if (!openRef.current) return;
    if (pushedRef.current) {
      pushedRef.current = false;
      // openRef 는 popstate 핸들러가 내립니다.
      try { window.history.back(); return; } catch (e) {}
    }
    openRef.current = false;
    setOpen(false);
    setConfirmWipe(false);
  };

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    setGeminiApiKey(k);
    setSavedKey(getGeminiApiKey());
    setKeyInput("");
  };

  const removeKey = () => {
    setGeminiApiKey("");
    setSavedKey("");
    setKeyInput("");
  };

  const wipe = async () => {
    if (wiping) return;
    setWiping(true);
    await clearPreviewData(); // 끝나면 첫 화면으로 다시 열립니다
  };

  const build = previewBuildLabel();

  return (
    <>
      {open ? null : (
        <button
          type="button"
          onClick={openSheet}
          className="fixed z-[60] rounded-full px-3 py-1.5 font-gothic text-[11.5px] font-medium leading-none text-white shadow-sm backdrop-blur-sm active:opacity-80"
          style={{
            right: "12px",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)",
            backgroundColor: "rgba(28, 38, 40, 0.58)",
          }}
          aria-label="미리보기 설정 열기"
        >
          미리보기 · {TIER_LABEL[tier]}
        </button>
      )}

      {open ? (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40" onClick={closeSheet} />
          <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 font-gothic">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <div className="px-4 pb-3">
              <h2 className="text-[14px] font-semibold text-foreground">미리보기 설정</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                출시 전 검사용 앱입니다. 지금 쓰시는 앱과 데이터가 따로 저장됩니다.
              </p>
            </div>

            {/* 등급 */}
            <section className="border-t border-border px-4 pt-3.5 pb-2">
              <h3 className="text-[13px] font-semibold text-foreground">등급</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                고른 등급으로 화면이 바로 바뀝니다.
              </p>
              <div className="mt-2">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPreviewTier(t)}
                    className="flex w-full items-center gap-2 border-b border-border py-2.5 text-left last:border-b-0 active:bg-muted/60"
                  >
                    <span className={"min-w-0 flex-1 text-[13px] " + (t === tier ? "font-semibold text-foreground" : "text-foreground")}>
                      {TIER_LABEL[t]}
                    </span>
                    <span className="w-4 shrink-0 text-primary">{t === tier ? <Check size={15} /> : null}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 체험 사용 여부 */}
            <section className="border-t border-border px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-foreground">체험을 이미 쓴 계정</h3>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    켜면 구독 화면이 체험 없이 바로 구독으로 보입니다.
                  </p>
                </div>
                <Switch checked={trialUsed} onCheckedChange={(v) => setPreviewTrialUsed(!!v)} aria-label="체험을 이미 쓴 계정" />
              </div>
            </section>

            {/* Gemini API 키 */}
            <section className="border-t border-border px-4 py-3.5">
              <h3 className="text-[13px] font-semibold text-foreground">Gemini API 키</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                사전·이야기·회화·음성 같은 AI 기능은 이 키로 직접 불러 확인하세요.
              </p>
              <p className="mt-1.5 text-[12px] text-foreground">
                {savedKey ? "저장됨 · " + maskKey(savedKey) : "키 없음 — AI 기능이 동작하지 않습니다."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="password"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIza…"
                  className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={!keyInput.trim()}
                  className="h-10 shrink-0 rounded-[10px] px-3.5 text-[13px] font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: "#2C6D63" }}
                >
                  저장
                </button>
                {savedKey ? (
                  <button
                    type="button"
                    onClick={removeKey}
                    className="h-10 shrink-0 rounded-[10px] border border-border px-3 text-[13px] text-foreground active:bg-muted"
                  >
                    지우기
                  </button>
                ) : null}
              </div>
            </section>

            {/* 데이터 비우기 */}
            <section className="border-t border-border px-4 py-3.5">
              <h3 className="text-[13px] font-semibold text-foreground">이 미리보기 데이터 비우기</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                처음 설치한 상태로 돌아가 확인하세요. 등급·체험·API 키 설정은 남겨 둡니다.
              </p>
              {confirmWipe ? (
                <div className="mt-2.5 rounded-[12px] border border-border bg-muted/40 p-3">
                  <p className="text-[12px] leading-relaxed text-foreground">
                    이 미리보기의 단어장·기록·저장된 글과 소리가 모두 지워집니다. 지금 쓰시는 앱에는 영향이 없습니다.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      disabled={wiping}
                      className="h-10 flex-1 rounded-[10px] border border-border bg-card text-[13px] text-foreground active:bg-muted disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={wipe}
                      disabled={wiping}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-red-600 text-[13px] font-semibold text-white disabled:opacity-70"
                    >
                      {wiping ? <Loader2 size={15} className="animate-spin" /> : null}
                      비우기
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="mt-2.5 h-10 w-full rounded-[10px] border border-red-300 text-[13px] font-semibold text-red-600 active:bg-red-50"
                >
                  데이터 비우기
                </button>
              )}
            </section>

            <div className="flex items-center justify-between border-t border-border px-4 pt-3">
              <span className="text-[11px] text-muted-foreground">{build ? "빌드 " + build : "미리보기 빌드"}</span>
              <button
                type="button"
                onClick={closeSheet}
                className="h-9 rounded-full border border-border px-4 text-[13px] text-foreground active:bg-muted"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
