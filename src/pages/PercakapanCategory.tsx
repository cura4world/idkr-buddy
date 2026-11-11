// src/pages/PercakapanCategory.tsx
// 카테고리 안의 회화집 목록 (/percakapan/c/:id).
// 사용자가 만든 회화집만 이름 수정 / 삭제가 됩니다 (롱프레스 0.6초).
// 시안: PC2-Scenes (한국어 제목 16px + 인니어 부제 12px, 01·02 번호, "8줄").
// 공개판 무료: 기본 회화집은 잠기고(누르면 안내 + 구독 화면), 직접 만든 회화집은 계속 읽힙니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import {
  listScenes,
  findCategory,
  saveCustomScene,
  deleteCustomScene,
  isCategoryVisible,
} from "@/lib/percakapan";
import type { PercakapanCategory, PercakapanScene } from "@/lib/percakapan";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { useBackClose } from "@/hooks/useBackClose";

const LOCK_TEXT = "회화집은 Plus 회원 기능입니다";
const CARD_STYLE = { background: "#FFFFFF", borderRadius: 18, boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

const PercakapanCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const catId = params.id || "";
  const plan = usePlan();

  // 교회와 신앙은 관리자·Special Member 에게만 — 주소로 바로 들어와도 폴더 목록으로 돌려보냅니다.
  useEffect(() => {
    if (catId && !isCategoryVisible(catId)) navigate("/percakapan", { replace: true });
  }, [catId, plan.tier, navigate]);

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

  const [loaded, setLoaded] = useState(false);

  const refresh = () => {
    if (!catId) return;
    listScenes(catId)
      .then((list) => { setScenes(list); setLoaded(true); })
      .catch(() => { setScenes([]); setLoaded(true); });
  };

  // 공개판 무료가 주소로 바로 들어온 경우(QA Q11): 목록 화면과 같이 구독 화면으로 보냅니다.
  // 직접 만든 회화집이 든 폴더는 그대로 열립니다(구독 취소 뒤에도 내 회화 글은 계속 — 결정 문서).
  // setState 없이 이동만 합니다(CLAUDE.md).
  useEffect(() => {
    if (!loaded || plan.plus) return;
    if (scenes.some((s) => s.custom)) return;
    toast(LOCK_TEXT);
    navigate(PAYWALL_PATH, { replace: true });
  }, [loaded, scenes, plan.plus, navigate]);

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

  // 폰의 뒤로가기는 롱프레스 메뉴만 닫습니다(화면을 떠나지 않음)
  useBackClose(!!menuScene, () => setMenuScene(null));

  const handleOpenScene = (s: PercakapanScene) => {
    // 롱프레스로 메뉴가 뜬 직후의 click 은 무시합니다
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    if (!plan.plus && !s.custom) {
      toast(LOCK_TEXT);
      navigate(PAYWALL_PATH);
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {cat ? cat.title : "회화집"}
          </h1>
          <p className="mt-px truncate font-word text-[0.75rem]" style={{ color: "#646C72" }}>
            {cat ? cat.titleId : "Percakapan"}
          </p>
        </div>
      </header>

      <div className="px-4 pt-4 pb-6">
        {/* 무료 + 직접 만든 회화집 없음: 곧 구독 화면으로 넘어가므로 목록을 그리지 않습니다(잠긴 목록이 잠깐 비치지 않게) */}
        {!plan.plus && !scenes.some((s) => s.custom) ? null : scenes.length > 0 ? (
          <div className="overflow-hidden" style={CARD_STYLE}>
            {scenes.map((s, i) => {
              const locked = !plan.plus && !s.custom;
              return (
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
                className="w-full flex items-center gap-3 text-left active:bg-muted/60 transition-colors"
                style={{
                  padding: "13px 12px 13px 16px",
                  borderBottom: i === scenes.length - 1 ? "0" : "1px solid #EEF1F3",
                }}
              >
                <span
                  className="w-[26px] shrink-0 font-word text-[0.8125rem] font-semibold"
                  style={{ color: "#9AA1A6" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  {/* 회화 장면 제목은 2026-11-11 사용자 요청으로 굵게 */}
                  <p className="flex items-center gap-1.5 text-[0.875rem] font-bold leading-tight" style={{ color: "#1D1F1E" }}>
                    <span className="min-w-0 truncate">{s.title}</span>
                    {s.custom ? (
                      <span className="shrink-0 h-[5px] w-[5px] rounded-full bg-muted-foreground/45" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-word text-[0.78125rem] truncate" style={{ color: "#646C72" }}>
                    {s.titleId}
                  </p>
                </div>
                <span className="shrink-0 pl-1 font-gothic text-[0.75rem]" style={{ color: "#9AA1A6" }}>
                  {s.lines.length}줄
                </span>
                {locked ? (
                  <Lock size={14} strokeWidth={2} className="shrink-0" style={{ color: "#B7BDC1" }} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#B7BDC1" }} />
                )}
              </button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center" style={CARD_STYLE}>
            <p className="text-[0.9375rem] text-foreground">아직 회화집이 없습니다</p>
            <p className="mt-1 font-word text-[0.75rem] text-muted-foreground">Belum ada percakapan</p>
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
              <span className="min-w-0 flex-1 truncate font-body text-[0.9375rem] font-semibold text-card-foreground">
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
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[0.875rem] text-card-foreground outline-none focus:border-primary"
                  autoFocus
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="flex-1 h-10 rounded-[11px] border border-border text-[0.84375rem] font-gothic text-foreground/80 active:bg-muted"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleRenameSave}
                    disabled={renameText.trim() === ""}
                    className="flex-1 h-10 rounded-[11px] bg-primary text-[0.84375rem] font-medium text-white disabled:opacity-50"
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
                  className="w-full border-b border-border px-4 py-3.5 text-left text-[0.875rem] font-gothic text-foreground active:bg-muted/60"
                >
                  이름 수정
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full px-4 py-3.5 text-left text-[0.875rem] font-gothic text-red-500/90 active:bg-muted/60"
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
