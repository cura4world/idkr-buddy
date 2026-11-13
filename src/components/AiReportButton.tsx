// src/components/AiReportButton.tsx
// "풀이가 이상합니다" — AI 가 만든 내용을 신고합니다 (Google Play 의 AI 생성 콘텐츠 정책 요건).
// 스토어 앱(공개판)에서만 보입니다. 관리자판·회원판에서는 아무것도 그리지 않습니다.
// 2026-11 게슈탈트 개선안: 주인공 버튼과 떨어진 본문 끝에, 작은 글자 버튼으로 둡니다.

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isStoreApp } from "@/lib/platform";
import { hasPublicSession, sendAiReport } from "@/lib/account";

interface Props {
  // word = 단어 미니 시트의 풀이 · fill = 단어 추가 창의 자동 채우기 (2026-11-14 P-05 에서 추가)
  feature: "dictionary" | "story" | "phrase" | "percakapan" | "tips" | "map" | "word" | "fill";
  input: string;  // 사용자가 찾은 말·고른 주제
  output: string; // AI 가 만든 내용(앞부분이면 충분)
  className?: string;
}

// 말투 규칙(11/10): "~해요" 대신 "~입니다". 시안(사전 안 4)의 버튼 문구 "풀이가 이상합니다"와 맞춥니다.
const REASONS = ["뜻·번역이 틀립니다", "부적절한 내용입니다", "기타"];

const AiReportButton = ({ feature, input, output, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isStoreApp() || !hasPublicSession()) return null;

  const send = async (reason: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await sendAiReport({ feature, input: input.slice(0, 500), output: output.slice(0, 2000), reason });
      setSent(true);
      setOpen(false);
      toast("알려 주셔서 고맙습니다. 살펴보고 고치겠습니다");
    } catch (e) {
      toast("보내지 못했습니다. 잠시 뒤 다시 눌러 주세요");
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <p className={"text-xs font-gothic text-muted-foreground " + (className || "")}>신고를 보냈습니다</p>
    );
  }

  return (
    <div className={className || ""}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="h-8 flex items-center gap-1.5 text-xs font-gothic text-muted-foreground"
      >
        <Flag size={13} />
        풀이가 이상합니다
      </button>
      {open ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => send(r)}
              className="h-9 px-3 rounded-full border border-border bg-card text-xs font-gothic text-foreground active:bg-muted disabled:opacity-60 flex items-center gap-1"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null}
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AiReportButton;
