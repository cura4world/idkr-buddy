import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { updateCategory } from "@/lib/store";
import { useBackClose } from "@/hooks/useBackClose";
import FormSheet, { FORM_FIELD_CLASS, FORM_INPUT_CLASS, FormLabel, FormPrimaryButton } from "@/components/FormSheet";
import IconColorPicker from "@/components/IconColorPicker";
import { CategoryTile } from "@/components/CategoryIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  categoryId: string;
  currentName: string;
  /** Category.emoji 칸의 값 — 옛 이모지이거나 새 "icon:<이름>:<색키>" */
  currentEmoji: string;
}

// 2026-11-13 사용자 요청: 단어장 만들기와 같은 시트·같은 아이콘 고르기. 옛 이모지는 그대로 보이다가, 아이콘을 고르면 새 형태로 바뀝니다.
export default function EditCategoryDialog({ open, onOpenChange, onUpdated, categoryId, currentName, currentEmoji }: Props) {
  const [name, setName] = useState(currentName);
  const [icon, setIcon] = useState(currentEmoji);

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open, () => onOpenChange(false));

  useEffect(() => {
    setName(currentName);
    setIcon(currentEmoji);
  }, [currentName, currentEmoji, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateCategory(categoryId, name.trim(), icon);
    onUpdated();
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="이름 바꾸기"
      desc="이름과 아이콘을 바꾸세요"
      icon={<Pencil size={20} strokeWidth={1.8} />}
      tileBg="#E2E6F3"
      tileInk="#2F3E7C"
      onSubmit={handleSubmit}
      footer={
        <FormPrimaryButton type="submit" disabled={!name.trim()} muted={!name.trim()}>
          저장
        </FormPrimaryButton>
      }
    >
      <div>
        <FormLabel>이름</FormLabel>
        <div className="flex items-center gap-2.5">
          <CategoryTile value={icon} fallbackBg="#EEF1F3" className="w-11 h-11 rounded-xl" iconSize={22} />
          <div className={"flex-1 min-w-0 " + FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FORM_INPUT_CLASS + " font-body"}
              autoFocus
            />
          </div>
        </div>
      </div>
      <IconColorPicker value={icon} onChange={setIcon} />
    </FormSheet>
  );
}
