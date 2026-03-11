import { useState, useRef, useCallback } from "react";
import { Category, getWordsByCategory, deleteCategory, moveCategoryUp, moveCategoryDown } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditCategoryDialog from "@/components/EditCategoryDialog";
import { Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface CategoryCardProps {
  category: Category;
  onAddWord: (categoryId: string) => void;
  onChanged?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function CategoryCard({ category, onAddWord, onChanged, isFirst, isLast }: CategoryCardProps) {
  const navigate = useNavigate();
  const words = getWordsByCategory(category.id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Long-press support for touch devices
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });
    longPressTimer.current = setTimeout(() => {
      setContextOpen(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDelete = () => {
    deleteCategory(category.id);
    onChanged?.();
    setDeleteOpen(false);
  };

  const cardContent = (
    <div className="rounded-lg bg-card p-5 shadow-sm border border-border/50 transition-all active:scale-[0.98]">
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/category/${category.id}`)}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{category.emoji}</span>
          <h2 className="text-lg font-medium font-body">{category.name}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{words.length}개의 단어</p>
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => navigate(`/study/${category.id}`)}
          className="text-sm text-primary font-medium hover:underline underline-offset-4"
          disabled={words.length === 0}
        >
          학습하기
        </button>
        <button
          onClick={() => navigate(`/quiz/${category.id}`)}
          className="text-sm text-primary font-medium hover:underline underline-offset-4"
          disabled={words.length < 2}
        >
          퀴즈
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddWord(category.id);
          }}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 ml-auto"
        >
          + 단어 추가
        </button>
      </div>
    </div>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          asChild
        >
          <div>{cardContent}</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            이름 / 아이콘 변경
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            카테고리 삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Popover menu for long-press on mobile */}
      {contextOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextOpen(false)}
        >
          <div
            className="absolute z-50 min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            style={{ top: touchPos.y, left: Math.min(touchPos.x, window.innerWidth - 200) }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex w-full items-center rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => { setContextOpen(false); setEditOpen(true); }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              이름 / 아이콘 변경
            </button>
            <button
              className="flex w-full items-center rounded-sm px-2 py-2 text-sm text-destructive hover:bg-accent"
              onClick={() => { setContextOpen(false); setDeleteOpen(true); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              카테고리 삭제
            </button>
          </div>
        </div>
      )}

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
            <AlertDialogTitle className="font-body">카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              '{category.name}' 카테고리와 포함된 단어 {words.length}개가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
