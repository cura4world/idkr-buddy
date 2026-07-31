// src/pages/PercakapanCategory.tsx
// 카테고리 안의 회화집 목록 (/percakapan/c/:id).
// 사용자가 만든 회화집만 이름 수정 / 삭제가 됩니다 (롱프레스 0.6초).

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import {
  listScenes,
  findCategory,
  saveCustomScene,
  deleteCustomScene,
} from "@/lib/percakapan";
import type { PercakapanCategory, PercakapanScene } from "@/lib/percakapan";

const PercakapanCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const catId = params.id || "";

  const [cat, setCat] = useState<PercakapanCategory | null>(null);
  const [scenes, setScenes] = useState<PercakapanScene[]>([]);

  // 롱프레스로 뜨는 작은 메뉴
  const [menuScene, setMenuScene] = useState<PercakapanScene | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => {
    if (!catId) return;
    listScenes(catId)
      .then((list) => setScenes(list))
      .catch(() => setScenes([]));
  };

  useEffect(() => {
    if (!catId) return;
    findCategory(catId)
      .then((c) => setCat(c))
      .catch(() => setCat(null));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 사용자가 만든 회화집만 메뉴가 뜹니다. 손가락이 움직이면 취소합니다.
  const startLongPress = (s: PercakapanScene) => {
    if (!s.custom) return;
    firedRef.current = false;
    cancelLongPress();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      setConfirmDelete(false);
      setRenaming(false);
      setRenameText(s.title);
      setMenuScene(s);
    }, 600);
  };

  const closeMenu = () => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setMenuScene(null);
    setConfirmDelete(false);
    setRenaming(false);
  };

  const handleOpenScene = (s: PercakapanScene) => {
    // 롱프레스로 메뉴가 뜬 직후의 click 은 무시합니다
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    navigate("/percakapan/" + s.id);
  };

  const handleRenameSave = () => {
    if (!menuScene) return;
    const t = renameText.trim();
    if (!t) return;
    saveCustomScene({ ...menuScene, title: t })
      .then(() => {
        closeMenu();
        refresh();
      })
      .catch(() => toast.error("이름을 바꾸지 못했습니다"));
  };

  // 인라인 2단 확인: 처음 누르면 "정말 삭제"로 바뀌고 3초 뒤 원복
  const handleDeleteClick = () => {
    if (!menuScene) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    const id = menuScene.id;
    deleteCustomScene(id)
      .then(() => {
        closeMenu();
        refresh();
        toast("회화집을 삭제했습니다");
      })
      .catch(() => toast.error("삭제하지 못했습니다"));
  };

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goBackOr(navigate, location.key, "/percakapan")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="shrink-0 text-[18px] leading-none">{cat ? cat.emoji : "💬"}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {cat ? cat.title : "회화집"}
          </h1>
          <p className="mt-0.5 truncate font-word text-[11.5px] text-muted-foreground">
            {cat ? cat.titleId : "Percakapan"}
          </p>
        </div>
      </header>

      <div className="px-4 py-4">
        {scenes.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleOpenScene(s)}
                onTouchStart={() => startLongPress(s)}
                onTouchMove={cancelLongPress}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                onMouseDown={() => startLongPress(s)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                className={
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
                  (i === scenes.length - 1 ? "" : "border-b border-border")
                }
              >
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] leading-tight text-foreground">
                    <span className="min-w-0 truncate">{s.title}</span>
                    {s.custom ? (
                      <span className="shrink-0 h-[5px] w-[5px] rounded-full bg-muted-foreground/45" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-word text-[11.5px] text-muted-foreground truncate">
                    {s.titleId}
                  </p>
                </div>
                <span className="shrink-0 pl-2.5 font-word text-[12.5px] text-muted-foreground">
                  {s.lines.length}문장
                </span>
                <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-[15px] text-foreground">아직 회화집이 없습니다</p>
            <p className="mt-1 font-word text-[12px] text-muted-foreground">Belum ada percakapan</p>
          </div>
        )}
      </div>

      {/* 롱프레스 메뉴 */}
      {menuScene ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" onClick={closeMenu} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="회화집 관리"
            className="fixed z-50 left-1/2 -translate-x-1/2 top-[26%] w-[min(88vw,20rem)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
              <span className="min-w-0 flex-1 truncate font-body text-[15px] font-semibold text-card-foreground">
                {menuScene.title}
              </span>
              <button
                type="button"
                onClick={closeMenu}
                className="-mt-0.5 -mr-1 p-1 text-muted-foreground/60 hover:text-muted-foreground"
                title="닫기"
              >
                <X size={16} />
              </button>
            </div>

            {renaming ? (
              <div className="px-4 pb-4 pt-3">
                <input
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px] text-card-foreground outline-none focus:border-primary"
                  autoFocus
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="flex-1 h-10 rounded-[11px] border border-border text-[13.5px] font-gothic text-foreground/80 active:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleRenameSave}
                    disabled={renameText.trim() === ""}
                    className="flex-1 h-10 rounded-[11px] bg-primary text-[13.5px] font-medium text-white disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  className="w-full border-b border-border px-4 py-3.5 text-left text-[14px] font-gothic text-foreground active:bg-muted/60"
                >
                  이름 수정
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full px-4 py-3.5 text-left text-[14px] font-gothic text-red-500/90 active:bg-muted/60"
                >
                  {confirmDelete ? "정말 삭제" : "삭제"}
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default PercakapanCategory;
