import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { addCategory } from "@/lib/store";
import { makeCategoryIcon } from "@/lib/categoryIcon";
import { useBackClose } from "@/hooks/useBackClose";
import FormSheet, { FORM_FIELD_CLASS, FORM_INPUT_CLASS, FormLabel, FormPrimaryButton } from "@/components/FormSheet";
import IconColorPicker from "@/components/IconColorPicker";
import { CategoryTile } from "@/components/CategoryIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

// 2026-11-13 사용자 요청: 새 입력 시트(FormSheet) 디자인 + 이모지 대신 선 아이콘·색 타일.
// 저장은 기존 category.emoji 칸에 "icon:<이름>:<색키>" 로 합니다(lib/categoryIcon.ts).
const DEFAULT_ICON = makeCategoryIcon("BookOpen", "teal");

export default function AddCategoryDialog({ open, onOpenChange, onAdded }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON);

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open, () => onOpenChange(false));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name.trim(), icon);
    setName("");
    setIcon(DEFAULT_ICON);
    onAdded();
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="단어장 만들기"
      desc="주제별로 새 단어장을 만드세요"
      icon={<FolderPlus size={20} strokeWidth={1.8} />}
      tileBg="#E2E6F3"
      tileInk="#2F3E7C"
      onSubmit={handleSubmit}
      footer={
        <FormPrimaryButton type="submit" disabled={!name.trim()} muted={!name.trim()}>
          만들기
        </FormPrimaryButton>
      }
    >
      <div>
        <FormLabel>이름</FormLabel>
        <div className="flex items-center gap-2.5">
          <CategoryTile value={icon} className="w-11 h-11 rounded-xl" iconSize={22} />
          <div className={"flex-1 min-w-0 " + FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 여행"
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
