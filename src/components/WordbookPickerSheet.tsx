// src/components/WordbookPickerSheet.tsx
// "어디에 담을까요?" — 담을 단어장을 고르는 시트. 사전과 각 화면의 단어 팝업이 함께 씁니다.
// 2026-11-24 옵션 창 통일: 앱 공통 틀(AppSheet, 고르기 하나). 동작은 그대로 — 줄을 누르면 그 단어장이 담을 곳이 되고 닫힘.
// 라디오는 "지금 담는 곳" 표시로만 씁니다. X·바깥 누르기는 바꾸지 않고 닫기.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다.
// 화면마다 팝업의 뒤로가기 처리 방식이 달라, 여는 쪽에서 open/onOpenChange 로 맞춥니다.

import { useEffect, useState } from "react";
import { BookmarkPlus, Plus } from "lucide-react";
import { Category, getWordsByCategory } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId } from "@/lib/saveTarget";
import AddCategoryDialog from "@/components/AddCategoryDialog";
import { CategoryGlyph } from "@/components/CategoryIcon";
import AppSheet, { ChoiceRow, SHEET, SheetButton } from "@/components/sheet/AppSheet";

const MY_WORDBOOK_ID = "my-wordbook";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  onPick: (id: string) => void;
  onChanged?: () => void; // 단어장 목록이 바뀌었을 때 (여는 쪽의 라벨을 새로 그리도록)
}

export default function WordbookPickerSheet({ open, onOpenChange, targetId, onPick, onChanged }: Props) {
  const [targets, setTargets] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);

  // 열릴 때마다 목록과 단어 수를 새로 읽습니다 (담는 사이에 개수가 늘기 때문에).
  useEffect(() => {
    if (!open) return;
    const next = loadSaveTargets();
    const c: Record<string, number> = {};
    for (const t of next) c[t.id] = getWordsByCategory(t.id).length;
    setTargets(next);
    setCounts(c);
    // 다른 화면에서 대상 단어장을 지웠을 수 있으므로 다시 확인합니다.
    if (!next.some((t) => t.id === targetId)) onPick(loadSaveTargetId(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 만들어진 단어장을 바로 대상으로 삼습니다.
  // addCategory 가 '내 단어장' 바로 뒤에 넣으므로, 내 단어장을 뺀 첫 번째가 방금 만든 것입니다.
  const handleAdded = () => {
    const next = loadSaveTargets();
    setTargets(next);
    const fresh = next.filter((c) => c.id !== MY_WORDBOOK_ID)[0];
    if (fresh) onPick(fresh.id);
    if (onChanged) onChanged();
  };

  return (
    <>
      <AppSheet
        open={open}
        onClose={() => onOpenChange(false)}
        title="담을 단어장을 고르세요"
        icon={<BookmarkPlus size={20} strokeWidth={1.8} />}
        zIndex={55}
        footer={
          // 시트를 먼저 닫고 다이얼로그를 엽니다 (히스토리가 겹치지 않도록)
          <SheetButton variant="secondary" onClick={() => { onOpenChange(false); setAddOpen(true); }}>
            <Plus size={16} strokeWidth={2} /> 새 단어장 만들기
          </SheetButton>
        }
      >
        {targets.length === 0 ? (
          <p className="m-0 py-3 text-center font-gothic text-[0.8125rem] leading-relaxed break-keep" style={{ color: SHEET.mute }}>
            담을 단어장이 없습니다. 아래에서 새 단어장을 만들어 주세요.
          </p>
        ) : (
          targets.map((c) => (
            <ChoiceRow
              key={c.id}
              mode="single"
              selected={c.id === targetId}
              onClick={() => { onPick(c.id); onOpenChange(false); }}
              leading={<CategoryGlyph value={c.emoji} size={18} />}
              title={<span className="block truncate">{c.name}</span>}
              trailing={(counts[c.id] ?? 0) + "개"}
            />
          ))
        )}
      </AppSheet>

      <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
    </>
  );
}
