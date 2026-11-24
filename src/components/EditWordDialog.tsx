import { useState, useEffect, useRef } from "react";
import { updateWord, Word, deleteWord } from "@/lib/store";
import { Pencil, Trash2 } from "lucide-react";
import { useBackClose } from "@/hooks/useBackClose";
import AppSheet, { SHEET, SheetButton, SheetButtonRow } from "@/components/sheet/AppSheet";
import { FORM_FIELD_CLASS, FORM_INPUT_CLASS, FormLabel } from "@/components/FormSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: Word | null;
  onUpdated: () => void;
}

// 2026-11-24 옵션 창 통일: 가운데 떠 있던 카드 → 앱 공통 틀(입력) 아래 시트. 칸은 다른 입력 창과 같은 모양.
// 고친 것이 있으면 끌기·바깥 누르기로 닫히지 않고 X 로만 닫힙니다. 저장 = 적용하고 닫기, X = 고친 것 버리고 닫기.

// 입력 한 줄. 컴포넌트 밖에 두어야 입력 중 포커스가 풀리지 않습니다.
const Field = ({
  label,
  value,
  onChange,
  font,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  font: string;
  readOnly?: boolean;
}) => (
  <div>
    <FormLabel>{label}</FormLabel>
    <div className={FORM_FIELD_CLASS} style={{ minHeight: 44, background: readOnly ? "#F7F9FA" : undefined }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!!readOnly}
        aria-label={label}
        className={FORM_INPUT_CLASS + " " + font}
        style={{ color: SHEET.txt }}
        autoCapitalize="none"
        autoCorrect="off"
      />
    </div>
  </div>
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
  // 닫히며 내려가는 동안 보여 줄 마지막 단어
  const lastWordRef = useRef<Word | null>(null);
  if (word) lastWordRef.current = word;
  const shownWord = word || lastWordRef.current;

  // 다른 단어가 들어오면 렌더 중에 즉시 값을 맞춰, 이전 단어가 한 프레임 비치는 것을 막습니다.
  if (word && word.id !== editingId) {
    setEditingId(word.id);
    setWordText(word.word || "");
    setMeaning(word.meaning || "");
    setExample(word.example || "");
    setExampleMeaning(word.exampleMeaning || "");
    setConfirmDelete(false);
  }

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open && !!word, () => onOpenChange(false));

  // 열려 있는 동안 Escape로 닫기(뒤 화면 스크롤 잠금은 공통 틀이 합니다)
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
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

  // 기본 단어장의 단어(앱에 들어 있는 단어)는 읽기 전용입니다. 고치거나 지워도 앱이 새 버전을 받을 때마다
  // 기본 단어가 통째로 다시 깔려, 고친 것이 사라지고 지운 것이 되살아났습니다(출시 전 점검 D-07).
  const locked = !!(shownWord && shownWord.isShared);

  const dirty = !!shownWord && (
    wordText.trim() !== (shownWord.word || "").trim() ||
    meaning.trim() !== (shownWord.meaning || "").trim() ||
    example.trim() !== (shownWord.example || "").trim() ||
    exampleMeaning.trim() !== (shownWord.exampleMeaning || "").trim()
  );
  const canSave = dirty && wordText.trim().length > 0 && meaning.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || locked || !canSave) return;
    updateWord(word.id, {
      word: wordText.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      exampleMeaning: exampleMeaning.trim(),
    });
    onUpdated();
    onOpenChange(false);
  };

  // 인라인 2단 확인: 처음 누르면 "한 번 더 누르면 삭제"로 바뀌고 3초 뒤 원복, 그 상태에서 다시 누르면 삭제
  const handleDeleteClick = () => {
    if (!word || locked) return;
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
    <AppSheet
      open={open && !!word}
      onClose={() => {
        if (Date.now() - openedAt.current < 350) return; // 열자마자 닫히는 것 방지
        onOpenChange(false);
      }}
      title="단어 정보"
      icon={<Pencil size={20} strokeWidth={1.8} />}
      dirty={!locked && dirty}
      onSubmit={handleSubmit}
      gap={13}
      footer={
        locked ? undefined : (
          <SheetButtonRow>
            <SheetButton variant="secondary" onClick={handleDeleteClick}>
              <span className="flex items-center gap-1.5" style={{ color: SHEET.danger }}>
                <Trash2 size={15} strokeWidth={2} />
                {confirmDelete ? "한 번 더 누르면 삭제" : "삭제"}
              </span>
            </SheetButton>
            <SheetButton type="submit" disabled={!canSave} muted={!canSave}>저장</SheetButton>
          </SheetButtonRow>
        )
      }
    >
      <Field label="인도네시아어" value={wordText} onChange={setWordText} font="font-word" readOnly={locked} />
      <Field label="한국어 뜻" value={meaning} onChange={setMeaning} font="font-body" readOnly={locked} />
      <Field label="예문 (인도네시아어)" value={example} onChange={setExample} font="font-word" readOnly={locked} />
      <Field label="예문 뜻 (한국어)" value={exampleMeaning} onChange={setExampleMeaning} font="font-body" readOnly={locked} />
      {locked ? (
        <p className="m-0 font-gothic text-[0.78125rem] leading-relaxed break-keep" style={{ color: SHEET.sub }}>
          기본 단어장의 단어는 고치거나 지울 수 없습니다. 내 단어장에 담으면 고칠 수 있습니다.
        </p>
      ) : null}
    </AppSheet>
  );
}
