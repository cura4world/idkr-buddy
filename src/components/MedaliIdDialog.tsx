// src/components/MedaliIdDialog.tsx
// 첫 진입 때 딱 한 번 뜨는 이름 등록 창.
//
// 짝꿍끼리 서로의 훈장을 보려면 두 사람이 서로 다른 이름을 가져야 합니다.
// 그래서 이 창은 닫을 수 없습니다 — X 단추도, 바깥 탭도, 끌어 내리기도, ESC도 막습니다.
// 2026-11-24 옵션 창 통일: 가운데 떠 있던 카드 → 앱 공통 틀(AppSheet, noClose) 아래 시트. 문구·동작은 그대로.

import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import {
  fetchRegisteredIds,
  isValidMedaliId,
  optOutMedali,
  setMyMedaliId,
  syncMedali,
} from "@/lib/medaliSync";
import AppSheet, { SHEET, SheetButton } from "@/components/sheet/AppSheet";
import { FORM_FIELD_CLASS } from "@/components/FormSheet";

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

  // 열려 있는 동안 ESC를 삼킵니다(뒤 화면 스크롤 잠금은 공통 틀이 합니다).
  useEffect(() => {
    if (!open) return;
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
      document.removeEventListener("keydown", onKey, true);
      window.clearTimeout(t);
    };
  }, [open]);

  const trimmed = value.trim();
  const formatOk = isValidMedaliId(trimmed);
  // 내 다른 기기(세컨폰·태블릿)는 같은 이름을 써야 점수가 합쳐지므로 중복을 막지 않습니다.
  // 대신 이미 있는 이름이면 한 줄 알려 주어, 짝꿍 이름을 잘못 고르는 것만 막습니다.
  const isTaken =
    formatOk && taken.some((t) => (t || "").trim().toLowerCase() === trimmed.toLowerCase());
  const canSubmit = formatOk;

  const hint = !trimmed
    ? ""
    : !formatOk
      ? "한글·영문·숫자만, 6자 이내로 적어 주세요."
      : isTaken
        ? "이미 등록된 아이디입니다. 내 다른 기기라면 그대로 시작하세요."
        : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setMyMedaliId(trimmed);
    // 창이 먼저 닫히고, 주고받는 일은 뒤에서 알아서 끝냅니다.
    // syncMedali는 다른 기기 점수를 먼저 받아오므로, 새 기기에서도 바로 합산 점수가 보입니다.
    onDone();
    syncMedali(true).catch(() => {});
  };

  return (
    <AppSheet
      open={open}
      onClose={() => {}}
      noClose
      title="앱에서 사용할 아이디를 입력하세요"
      desc="한글·영문·숫자 6자 이내로 적어 주세요. 아이디를 입력하면 상대방의 공부 점수를 확인할 수 있습니다."
      icon={<UserRound size={20} strokeWidth={1.8} />}
      onSubmit={handleSubmit}
      gap={10}
      footer={
        <>
          <SheetButton type="submit" disabled={!canSubmit} muted={!canSubmit}>시작하기</SheetButton>
          {/* 설교문만 보는 태블릿·세컨폰용. "나중에"가 아니라 다시 묻지 않는 확정입니다. */}
          <button
            type="button"
            onClick={() => {
              optOutMedali();
              onDone();
            }}
            className="mt-2 w-full py-2 font-gothic text-[0.75rem] underline underline-offset-2"
            style={{ color: SHEET.sub }}
          >
            이 기기에서는 사용 안 함
          </button>
        </>
      }
    >
      <div className={FORM_FIELD_CLASS} style={{ minHeight: 52 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={6}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          placeholder="아이디"
          aria-label="아이디"
          className="flex-1 min-w-0 bg-transparent outline-none py-2 text-center font-word text-[1.125rem] tracking-wide"
          style={{ color: SHEET.txt }}
        />
      </div>

      {/* 안내 한 줄 — 자리는 늘 잡아 두어 입력 중 화면이 튀지 않게 합니다 */}
      <p className="m-0 min-h-4 font-gothic text-[0.6875rem] leading-tight" style={{ color: SHEET.sub }}>
        {hint ? <span style={isTaken ? undefined : { color: SHEET.danger }}>{hint}</span> : null}
      </p>

      {/* 이름을 눌러 그대로 넣을 수 있습니다 — 내 다른 기기에서 오타 없이 같은 이름을 쓰는 길입니다 */}
      {taken.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {taken.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue(t)}
              className="rounded-full px-3 py-1 font-gothic text-[0.6875rem]"
              style={{ border: "1px solid " + SHEET.line, background: SHEET.secondaryBg, color: SHEET.txt }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </AppSheet>
  );
}
