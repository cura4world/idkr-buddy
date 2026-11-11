// src/components/WordMiniSheet.tsx
// 이야기·회화집 본문에서 단어를 누르면 아래에서 올라오는 작은 뜻 시트.
// 시안: ST3-Front (단어 Lora + 민트 스피커, 뜻, 설명 13px, "내 단어장에 담기 | ⌄" 청록 + "사전에서 보기" 회색).
// 2026-11-11 사용자 요청으로 단어 24 → 22.5px, 뜻 16 → 14.5px, 버튼 높이 46 → 40px.
// 앱의 단어 팝업은 모두 이것 하나를 씁니다(이야기·회화집·오늘의 문장, 관리자판의 뉴스·묵상·기도·성경·설교문·일대일).
// 모양을 고칠 때는 여기만 고치면 모든 화면이 같이 바뀝니다.

import { Check, ChevronDown, Copy, Loader2, Plus, Volume1, X } from "lucide-react";
import { useBackClose } from "@/hooks/useBackClose";

interface Props {
  word: string;
  loading: boolean;
  meaning: string;
  info: string;
  saved: boolean;
  /** 담기 버튼을 막을지 (뜻을 못 찾았을 때 등) */
  saveDisabled: boolean;
  saveTargetId: string;
  saveTargetName: string;
  widthClass: string;
  onClose: () => void;
  onSave: () => void;
  onPickTarget: () => void;
  onDictionary: () => void;
  /** 단어 발음 듣기. 없으면 스피커를 그리지 않습니다 */
  onSpeak?: () => void;
  /** 단어 복사 (예전 팝업에 있던 화면만 줌). 없으면 버튼을 그리지 않습니다 */
  onCopy?: () => void;
  /**
   * 폰의 뒤로가기를 이 시트가 직접 처리할지 (기본 true).
   * 화면이 팝업용 히스토리 칸을 따로 쌓아 닫는 경우(성경·설교문·일대일의 closeSub)는 false 로 주세요 —
   * 둘 다 쌓으면 뒤로가기를 두 번 눌러야 닫힙니다.
   */
  manageBack?: boolean;
}

const TEAL = "#2C6D63";

const WordMiniSheet = ({
  word,
  loading,
  meaning,
  info,
  saved,
  saveDisabled,
  saveTargetId,
  saveTargetName,
  widthClass,
  onClose,
  onSave,
  onPickTarget,
  onDictionary,
  onSpeak,
  onCopy,
  manageBack,
}: Props) => {
  const grey = saved || !saveTargetId;
  // 폰의 뒤로가기는 이 시트만 닫습니다(이야기 카드·회화 읽기 화면은 그대로). 시트는 열릴 때만 그려집니다.
  useBackClose(manageBack !== false, onClose);
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(20,30,35,0.38)" }} />
      <div
        className={"absolute bottom-0 left-0 right-0 " + widthClass + " mx-auto bg-white"}
        style={{
          borderRadius: "22px 22px 0 0",
          padding: "10px 20px calc(26px + env(safe-area-inset-bottom)) 20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-[14px] h-1 w-9 rounded-full" style={{ background: "#DDE3E6" }} />
        <div className="flex items-center gap-2.5 min-w-0">
          <p
            className="min-w-0 break-words font-word text-[1.40625rem] font-semibold leading-tight"
            style={{ color: "#104B60" }}
          >
            {word}
          </p>
          {onSpeak ? (
            <button
              type="button"
              onClick={onSpeak}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "#E2F1EC", color: TEAL }}
              title="발음 듣기"
              aria-label="발음 듣기"
            >
              <Volume1 size={16} strokeWidth={2} />
            </button>
          ) : null}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center"
            style={{ background: "#F1F4F5", color: "#646C72" }}
            title="닫기"
            aria-label="닫기"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        {loading ? (
          <div className="mt-2 flex items-center gap-2 font-gothic text-[0.875rem]" style={{ color: "#9AA1A6" }}>
            <Loader2 size={15} className="animate-spin" /> 뜻을 찾는 중...
          </div>
        ) : (
          <>
            <p className="mt-2 break-words font-gothic text-[0.90625rem] font-semibold" style={{ color: "#1D1F1E" }}>
              {meaning}
            </p>
            {info ? (
              <p className="mt-1 break-words font-gothic text-[0.8125rem] leading-[1.6]" style={{ color: "#646C72" }}>
                {info}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-4 flex gap-2">
          <div className="flex-1 min-w-0 flex overflow-hidden rounded-[14px] font-gothic text-[0.875rem] font-semibold">
            <button
              type="button"
              onClick={onSave}
              disabled={saved || saveDisabled || !saveTargetId}
              className="flex-1 min-w-0 h-[40px] flex items-center justify-center gap-1.5 px-2 disabled:cursor-default"
              style={
                grey
                  ? { background: "#F1F4F5", color: "#9AA1A6" }
                  : { background: TEAL, color: "#FFFFFF", opacity: saveDisabled ? 0.55 : 1 }
              }
            >
              {saved ? <Check size={15} strokeWidth={2.4} className="shrink-0" /> : <Plus size={15} strokeWidth={2.4} className="shrink-0" />}
              <span className="truncate">
                {saved ? "저장됨" : saveTargetId ? saveTargetName + "에 담기" : "단어장을 먼저 만들어 주세요"}
              </span>
            </button>
            {/* 담긴 뒤에도 다른 단어장에는 담을 수 있어야 하므로 ⌄ 는 잠그지 않습니다 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickTarget();
              }}
              title="담을 단어장 고르기"
              aria-label="담을 단어장 고르기"
              className="shrink-0 w-11 h-[40px] flex items-center justify-center"
              style={
                grey
                  ? { background: "#F1F4F5", color: "#9AA1A6", borderLeft: "1px solid #E3E7EA" }
                  : { background: TEAL, color: "#FFFFFF", borderLeft: "1px solid rgba(255,255,255,0.3)" }
              }
            >
              <ChevronDown size={15} strokeWidth={2.4} />
            </button>
          </div>
          {/* 복사는 글자 대신 아이콘 — "내 단어장에 담기" 글자가 잘리지 않게 폭을 아낍니다 */}
          {onCopy ? (
            <button
              type="button"
              onClick={onCopy}
              className="shrink-0 w-10 h-[40px] rounded-[14px] flex items-center justify-center"
              style={{ background: "#F1F4F5", color: "#1D1F1E" }}
              title="복사"
              aria-label="복사"
            >
              <Copy size={16} strokeWidth={2} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDictionary}
            className="shrink-0 h-[40px] px-3.5 rounded-[14px] font-gothic text-[0.875rem] font-semibold"
            style={{ background: "#F1F4F5", color: "#1D1F1E" }}
          >
            사전에서 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordMiniSheet;
