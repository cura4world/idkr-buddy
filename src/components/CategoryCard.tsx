import { useState } from "react";
import { Category, getWordsByCategory, deleteCategory } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import { Settings, Pencil, Trash2 } from "lucide-react";

interface CategoryCardProps {
  category: Category;
  onAddWord: (categoryId: string) => void;
  onChanged?: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  index?: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onCancelDrag?: () => void; // 톱니바퀴 조작 시 드래그 취소
}

export default function CategoryCard({
  category, onAddWord, onChanged,
  cardRef, index, isDragging, isDropTarget,
  onTouchStart, onTouchEnd, onMouseDown, onCancelDrag,
}: CategoryCardProps) {
  const navigate = useNavigate();
  const words = getWordsByCategory(category.id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);

  const handleDelete = () => {
    deleteCategory(category.id);
    onChanged?.();
    setDeleteOpen(false);
  };

  // 톱니바퀴 관련 터치 이벤트 — 드래그와 완전히 격리
  const stopAll = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCancelDrag?.(); // 혹시 시작된 롱프레스 취소
  };

  return (
    <>
      {isDropTarget && (
        <div className="h-0.5 bg-sky-400 rounded-full mx-1 mb-1 shadow-sm shadow-sky-400/20" />
      )}
      <div
        ref={cardRef}
        data-cat-index={index}
        className={`rounded-lg bg-card px-4 py-3 shadow-sm border border-border/50 text-card-foreground select-none ${
          isDragging ? "opacity-20 cursor-grabbing" : "cursor-grab active:scale-[0.98]"
        }`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 상단: 이모지+이름 + 톱니바퀴 */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => navigate(`/category/${category.id}`)}
          >
            <span className="text-lg">{category.emoji}</span>
            <h2 className="text-base font-medium font-body">{category.name}</h2>
          </div>

          {/* 톱니바퀴 버튼 — 터치/클릭 이벤트를 카드와 완전 격리 */}
          <div className="relative">
            <button
              onMouseDown={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onCancelDrag?.(); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); setGearOpen((o) => !o); }}
              className="p-1.5 text-card-foreground/40 hover:text-primary rounded"
            >
              <Settings size={18} />
            </button>

            {gearOpen && (
              <div
                className="absolute right-0 top-8 z-50 min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                onMouseDown={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="flex w-full items-center rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                  onClick={() => { setGearOpen(false); setEditOpen(true); }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> 이름 변경
                </button>
                <button
                  className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-destructive hover:bg-accent"
                  onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                  onClick={() => { setGearOpen(false); setDeleteOpen(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 단어장 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 톱니바퀴 닫기 오버레이 — onCancelDrag 호출로 드래그 방지 */}
        {gearOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setGearOpen(false)}
            onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); setGearOpen(false); }}
          />
        )}

        {/* 하단: 단어 수 + 퀴즈/플래시카드 — 같은 줄 */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-muted-foreground">{words.length}개의 단어</p>
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${category.id}`); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="text-sm text-primary font-medium hover:underline underline-offset-4"
              disabled={words.length < 2}
            >
              퀴즈
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/study/${category.id}`); }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="text-sm text-primary font-medium hover:underline underline-offset-4"
              disabled={words.length === 0}
            >
              플래시카드
            </button>
          </div>
        </div>
      </div>

      <EditCategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={() => onChanged?.()}
        categoryId={category.id}
        currentName={category.name}
        currentEmoji={category.emoji}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">단어장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              '{category.name}' 단어장과 포함된 단어 {words.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
