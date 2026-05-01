import { useState } from "react";
import { Category, getWordsByCategory, deleteCategory } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import { Settings, Pencil, Trash2, ChevronsUp, ChevronsDown } from "lucide-react";

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
  onCancelDrag?: () => void;
  onMoveTop?: () => void;
  onMoveBottom?: () => void;
}

export default function CategoryCard({
  category,
  onAddWord,
  onChanged,
  cardRef,
  isDragging,
  isDropTarget,
  onTouchStart,
  onTouchEnd,
  onMouseDown,
  onCancelDrag,
  onMoveTop,
  onMoveBottom,
}: CategoryCardProps) {
  const navigate = useNavigate();
  const [gearOpen, setGearOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const words = getWordsByCategory(category.id);

  const handleDelete = () => {
    deleteCategory(category.id);
    onChanged?.();
  };

  return (
    <div
      ref={cardRef}
      className={`relative rounded-lg bg-card px-6 py-5 shadow-sm border border-border/50 select-none ${isDragging ? "opacity-20" : ""} ${isDropTarget ? "ring-2 ring-primary ring-offset-2" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative">
        <div
          className="flex items-center gap-2 cursor-pointer pr-8"
          onClick={() => navigate(`/category/${category.id}`)}
        >
          <span className="text-lg">{category.emoji}</span>
          <h2 className="text-base font-medium font-body text-card-foreground">{category.name}</h2>
        </div>

        <div className="absolute -top-2 -right-2">
          <button
            onMouseDown={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onCancelDrag?.(); }}
            onTouchEnd={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); setGearOpen((o) => !o); }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Settings size={18} />
          </button>

          {gearOpen && (
            <div
              className="absolute right-0 top-8 z-50 min-w-[10rem] rounded-md border bg-popover shadow-md"
              onMouseDown={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
              onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onClick={() => { setGearOpen(false); onMoveTop?.(); }}
              >
                <ChevronsUp className="mr-2 h-4 w-4" />
                맨 위로
              </button>
              <button
                className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onClick={() => { setGearOpen(false); onMoveBottom?.(); }}
              >
                <ChevronsDown className="mr-2 h-4 w-4" />
                맨 아래로
              </button>
              <button
                className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onClick={() => { setGearOpen(false); setEditOpen(true); }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                이름 변경
              </button>
              <button
                className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-destructive hover:bg-accent"
                onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); }}
                onClick={() => { setGearOpen(false); setDeleteOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                단어장 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {gearOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setGearOpen(false)}
          onTouchStart={(e) => { e.stopPropagation(); onCancelDrag?.(); setGearOpen(false); }}
        />
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-muted-foreground">{words.length}개의 단어</span>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/quiz/${category.id}`)}
            className="text-sm text-primary hover:text-primary/80"
          >
            퀴즈
          </button>
          <button
            onClick={() => navigate(`/study/${category.id}`)}
            className="text-sm text-primary hover:text-primary/80"
          >
            플래시카드
          </button>
        </div>
      </div>

      <EditCategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        currentName={category.name}
        currentEmoji={category.emoji}
        onChanged={onChanged}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
