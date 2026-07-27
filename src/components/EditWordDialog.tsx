import { useState, useEffect, useRef } from "react";
import { updateWord, Word, deleteWord } from "@/lib/store";
import { Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: Word | null;
  onUpdated: () => void;
}

// 밑줄형 입력 한 줄. 컴포넌트 밖에 두어야 입력 중 포커스가 풀리지 않습니다.
const UnderlineField = ({
  label,
  value,
  onChange,
  font,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  font: string;
}) => (
  <label className="block">
    <span className="block text-sm font-gothic font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent border-0 border-b border-border/60 rounded-none px-0 py-2 text-sm text-card-foreground outline-none focus:border-primary transition-colors ${font}`}
      autoCapitalize="none"
      autoCorrect="off"
    />
  </label>
);

export default function EditWordDialog({ open, onOpenChange, word, onUpdated }: Props) {
  const [wordText, setWordText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [exampleMeaning, setExampleMeaning] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 손가락을 떼기 전에 열린 경우, 뒤따라오는 click이 백드롭을 눌러 바로 닫는 것을 막습니다.
  const openedAt = useRef(0);

  // 다른 단어가 들어오면 렌더 중에 즉시 값을 맞춰, 이전 단어가 한 프레임 비치는 것을 막습니다.
  if (word && word.id !== editingId) {
    setEditingId(word.id);
    setWordText(word.word || "");
    setMeaning(word.meaning || "");
    setExample(word.example || "");
    setExampleMeaning(word.exampleMeaning || "");
    setConfirmDelete(false);
  }

  // 열려 있는 동안 뒤 배경 스크롤 잠금 + Escape로 닫기
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  // 닫히면 삭제 확인 상태와 타이머를 정리하고, 다음에 열 때 저장된 값으로 다시 채우도록 초기화
  useEffect(() => {
    if (open) return;
    setConfirmDelete(false);
    setEditingId(null);
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
      confirmTimer.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  if (!open || !word) return null;

  const dirty =
    wordText.trim() !== (word.word || "").trim() ||
    meaning.trim() !== (word.meaning || "").trim() ||
    example.trim() !== (word.example || "").trim() ||
    exampleMeaning.trim() !== (word.exampleMeaning || "").trim();
  const canSave = dirty && wordText.trim().length > 0 && meaning.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    updateWord(word.id, {
      word: wordText.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      exampleMeaning: exampleMeaning.trim(),
    });
    onUpdated();
    onOpenChange(false);
  };

  // 인라인 2단 확인: 처음 누르면 "정말 삭제?"로 바뀌고 3초 뒤 원복, 그 상태에서 다시 누르면 삭제
  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
      confirmTimer.current = null;
    }
    deleteWord(word.id);
    onUpdated();
    onOpenChange(false);
  };

  return (
    <>
      <style>{`
        @keyframes kkWiFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kkWiPop {
          from { opacity: 0; transform: translate(-50%, 10px) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .kk-wi-backdrop { animation: kkWiFade 150ms ease-out both; }
        .kk-wi-panel { animation: kkWiPop 180ms cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .kk-wi-backdrop, .kk-wi-panel { animation: none !important; }
        }
      `}</style>

      {/* 단어장이 은은하게 비치는 백드롭 */}
      <div
        className="kk-wi-backdrop fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
        onClick={() => {
          if (Date.now() - openedAt.current < 350) return; // 열자마자 닫히는 것 방지
          onOpenChange(false);
        }}
      />

      {/* 떠오르는 플로팅 카드 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="단어 정보"
        className="kk-wi-panel fixed z-50 left-1/2 -translate-x-1/2 top-[14%] w-[min(92vw,26rem)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="max-h-[80dvh] overflow-y-auto px-5 pt-4"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-start justify-between gap-2">
            {/* 메인 화면 '내 단어장'과 같은 서체 (Gowun Dodum, text-base, semibold) */}
            <span className="font-body text-base font-semibold text-card-foreground">
              단어 정보
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mt-1 -mr-1 p-1 text-muted-foreground/60 hover:text-muted-foreground"
              title="닫기"
            >
              <X size={16} />
            </button>
          </div>

          <div className="h-px bg-border/50 mt-3 mb-4" />

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <UnderlineField label="인도네시아어" value={wordText} onChange={setWordText} font="font-word" />
              <UnderlineField label="한국어 뜻" value={meaning} onChange={setMeaning} font="font-body" />
            </div>
            <div className="mt-6 space-y-4">
              <UnderlineField label="예문 (인도네시아어)" value={example} onChange={setExample} font="font-word" />
              <UnderlineField label="예문 뜻 (한국어)" value={exampleMeaning} onChange={setExampleMeaning} font="font-body" />
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 text-sm font-gothic font-bold text-red-500/80 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
                {confirmDelete ? "정말 삭제?" : "삭제"}
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={`rounded-full bg-primary text-primary-foreground px-6 h-10 font-gothic font-bold text-sm transition-opacity ${
                  canSave ? "" : "opacity-50"
                }`}
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
