// src/components/WordbookPickerSheet.tsx
// "어디에 담을까요?" — 담을 단어장을 고르는 시트. 사전과 각 화면의 단어 팝업이 함께 씁니다.
//
// 히스토리(폰 뒤로가기)는 이 컴포넌트가 다루지 않습니다.
// 화면마다 팝업의 뒤로가기 처리 방식이 달라, 여는 쪽에서 open/onOpenChange 로 맞춥니다.

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Category, getWordsByCategory } from "@/lib/store";
import { loadSaveTargets, loadSaveTargetId } from "@/lib/saveTarget";
import AddCategoryDialog from "@/components/AddCategoryDialog";

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
      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => onOpenChange(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <h2 className="px-4 pb-3 text-sm font-semibold text-foreground">어디에 담을까요?</h2>
            <div className="max-h-[45vh] overflow-y-auto border-t border-border">
              {targets.length === 0 ? (
                <p className="px-4 py-4 text-[0.75rem] leading-relaxed text-muted-foreground">
                  담을 단어장이 없습니다. 아래에서 새 단어장을 만들어 주세요.
                </p>
              ) : (
                targets.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onPick(c.id); onOpenChange(false); }}
                    className="flex w-full items-center gap-2.5 border-b border-border px-4 py-2.5 text-left active:bg-muted/60"
                  >
                    <span className="shrink-0 text-[0.9375rem]">{c.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground">{counts[c.id] ?? 0}</span>
                    <span className="w-4 shrink-0 text-primary">
                      {c.id === targetId ? <Check size={14} /> : null}
                    </span>
                  </button>
                ))
              )}
            </div>
            {/* 시트를 먼저 닫고 다이얼로그를 엽니다 (히스토리가 겹치지 않도록) */}
            <button
              type="button"
              onClick={() => { onOpenChange(false); setAddOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-[0.8125rem] text-primary active:bg-muted/60"
            >
              <Plus size={14} /> 새 단어장 만들기
            </button>
          </div>
        </>
      ) : null}

      <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
    </>
  );
}
