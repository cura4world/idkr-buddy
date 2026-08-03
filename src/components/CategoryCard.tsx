import { useState } from "react";
import { Category, getWordsByCategory, deleteCategory } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import { Settings, Pencil, Trash2 } from "lucide-react";

/* 단어장 카드.
   기본은 읽기 전용입니다 — 공용 단어장(폴더 화면)은 배포마다 시드로 다시 맞춰지므로
   이름 변경·삭제를 두지 않습니다.
   editable 을 넘기면(내 단어장 안의 보관 단어장) 톱니에 이름 변경·삭제가 붙습니다.
   보관 단어장은 최신순 고정이라 순서 이동 메뉴는 없습니다. */
interface CategoryCardProps {
  category: Category;
  first?: boolean;
  last?: boolean;
  editable?: boolean;
  onChanged?: () => void;
}

export default function CategoryCard({ category, first, last, editable, onChanged }: CategoryCardProps) {
  const navigate = useNavigate();
  const [gearOpen, setGearOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const words = getWordsByCategory(category.id);

  const handleDelete = () => {
    deleteCategory(category.id);
    onChanged?.();
  };

  // 묶음의 첫/마지막 칸은 감싼 상자의 둥근 모서리에 맞춰 같이 둥글게 합니다.
  const rootCls =
    "relative select-none bg-card px-4 py-3 " +
    (first ? "rounded-t-2xl " : "") +
    (last ? "rounded-b-2xl " : "border-b border-border ");

  return (
    <div className={rootCls} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/category/${category.id}`)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left"
        >
          <span className="w-9 h-9 shrink-0 rounded-full border border-border flex items-center justify-center text-[1.0625rem]">
            {category.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] leading-tight text-foreground truncate">{category.name}</span>
            <span className="mt-0.5 block font-word text-[0.71875rem] text-muted-foreground truncate">
              Kosakata · {words.length}단어
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/study/${category.id}`)}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
          >
            카드
          </button>
          <button
            type="button"
            onClick={() => navigate(`/quiz/${category.id}`)}
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-[0.6875rem] font-gothic font-medium text-foreground/80 active:bg-muted"
          >
            퀴즈
          </button>

          {editable && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setGearOpen((o) => !o); }}
                className="-mr-1 w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
              >
                <Settings size={17} />
              </button>

              {gearOpen && (
                <div
                  className="absolute right-0 top-10 z-50 min-w-[10rem] rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex w-full items-center px-3 py-2.5 text-sm text-popover-foreground active:bg-muted"
                    onClick={() => { setGearOpen(false); setEditOpen(true); }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    이름 변경
                  </button>
                  <button
                    className="flex w-full items-center px-3 py-2.5 text-sm text-destructive active:bg-muted"
                    onClick={() => { setGearOpen(false); setDeleteOpen(true); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    단어장 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editable && gearOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setGearOpen(false)} />
      )}

      {editable && (
        <>
          <EditCategoryDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            categoryId={category.id}
            currentName={category.name}
            currentEmoji={category.emoji}
            onUpdated={() => onChanged?.()}
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
        </>
      )}
    </div>
  );
}
