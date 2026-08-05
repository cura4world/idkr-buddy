// src/components/MedaliIdDialog.tsx
// 첫 진입 때 딱 한 번 뜨는 이름 등록 팝업.
//
// 짝꿍끼리 서로의 훈장을 보려면 두 사람이 서로 다른 이름을 가져야 합니다.
// 그래서 이 팝업은 닫을 수 없습니다 — 닫기 버튼도, 바깥 탭도, ESC도 막습니다.
// (EditWordDialog와 같은 자체 플로팅 팝업 구조입니다. shadcn Dialog는 ESC로 닫혀서 쓰지 않습니다.)

import { useEffect, useRef, useState } from "react";
import {
  fetchRegisteredIds,
  isValidMedaliId,
  pushMyMedali,
  setMyMedaliId,
} from "@/lib/medaliSync";

interface Props {
  open: boolean;
  onDone: () => void;
}

export default function MedaliIdDialog({ open, onDone }: Props) {
  const [value, setValue] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 열릴 때: 먼저 등록한 사람 목록을 받아 옵니다. 실패하면 빈 목록 그대로 둡니다.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchRegisteredIds()
      .then((ids) => {
        if (alive) setTaken(ids);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  // 열려 있는 동안 뒤 배경 스크롤을 잠그고, ESC를 삼킵니다.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // 이름을 정하기 전에는 어떤 방법으로도 빠져나갈 수 없습니다
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, true);
    // autoFocus가 안 먹는 WebView가 있어 직접 한 번 더 넣어 줍니다
    const t = window.setTimeout(() => {
      try {
        inputRef.current?.focus();
      } catch (e) {}
    }, 80);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey, true);
      window.clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;

  const trimmed = value.trim();
  const formatOk = isValidMedaliId(trimmed);
  const isTaken =
    formatOk && taken.some((t) => (t || "").trim().toLowerCase() === trimmed.toLowerCase());
  const canSubmit = formatOk && !isTaken;

  const hint = !trimmed
    ? ""
    : !formatOk
      ? "한글·영문·숫자만, 6자 이내로 적어주세요."
      : isTaken
        ? "이미 있는 이름이에요. 다른 이름으로 해주세요."
        : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setMyMedaliId(trimmed);
    // 팝업이 먼저 닫히고, 올리는 일은 뒤에서 알아서 끝냅니다
    onDone();
    pushMyMedali(true).catch(() => {});
  };

  return (
    <>
      <style>{`
        @keyframes kkMiFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kkMiPop {
          from { opacity: 0; transform: translate(-50%, 10px) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .kk-mi-backdrop { animation: kkMiFade 150ms ease-out both; }
        .kk-mi-panel { animation: kkMiPop 180ms cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .kk-mi-backdrop, .kk-mi-panel { animation: none !important; }
        }
      `}</style>

      {/* 백드롭 — 눌러도 닫히지 않습니다 (onClick 없음) */}
      <div className="kk-mi-backdrop fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="이름 정하기"
        className="kk-mi-panel fixed z-50 left-1/2 -translate-x-1/2 top-[18%] w-[min(92vw,22rem)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 overflow-hidden"
      >
        <div
          className="px-5 pt-5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <p className="font-body text-base font-semibold text-card-foreground">이름을 정해주세요</p>
          <p className="mt-1.5 font-gothic text-[0.75rem] leading-relaxed text-muted-foreground">
            짝꿍과 서로의 기록을 볼 때 쓰는 이름이에요. 한글·영문·숫자 6자 이내.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={6}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              className="mt-4 w-full bg-transparent border-0 border-b border-border/60 rounded-none px-0 py-2 text-base text-card-foreground outline-none focus:border-primary transition-colors"
            />

            {/* 안내 한 줄 — 자리는 늘 잡아 두어 입력 중 화면이 튀지 않게 합니다 */}
            <p className="mt-2 min-h-4 font-gothic text-[0.6875rem] leading-tight text-muted-foreground">
              {hint ? (
                <span className="text-destructive">{hint}</span>
              ) : taken.length > 0 ? (
                <span>먼저 등록한 사람: {taken.join(", ")}</span>
              ) : null}
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className={
                "mt-5 w-full rounded-full py-2.5 text-sm font-gothic font-semibold transition-colors " +
                (canSubmit
                  ? "bg-primary text-white active:bg-primary/90"
                  : "bg-gray-100 text-gray-400")
              }
            >
              시작하기
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
