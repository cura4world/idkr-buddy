// src/pages/PercakapanCategory.tsx
// 카테고리 안의 회화집 목록 (/percakapan/c/:id).
// 사용자가 만든 회화집만 이름 수정 / 삭제가 됩니다 (롱프레스 0.6초).
// 시안: PC2-Scenes (한국어 제목 16px + 인니어 부제 12px, 01·02 번호, "8줄").
// 공개판 무료: 기본 회화집은 잠기고(누르면 안내 + 구독 화면), 직접 만든 회화집은 계속 읽힙니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, MessagesSquare, Pencil, Trash2 } from "lucide-react";
import AppSheet, { ChoiceRow, SHEET, SheetButton, SheetButtonRow } from "@/components/sheet/AppSheet";
import { FORM_FIELD_CLASS, FORM_INPUT_CLASS } from "@/components/FormSheet";
import LockMark from "@/components/LockMark";
import { openPlusLock } from "@/lib/plusLock";
import { canOpenScene, LOCK_TITLE_SCENE } from "@/lib/tasteAccess";
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
import { usePlan } from "@/lib/plan";
import { useBackClose } from "@/hooks/useBackClose";

const CARD_STYLE = { background: "#FFFFFF", borderRadius: 18, boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

const PercakapanCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const catId = params.id || "";
  const plan = usePlan();


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

  // 교회와 신앙은 관리자·Special Member 에게만 — 주소로 바로 들어와도 폴더 목록으로 돌려보냅니다.
  // 다만 그 폴더에 직접 만든 대화가 있으면 그 대화만 보이는 채로 엽니다(출시 전 점검 D-21 — 등급이 바뀌어도
  // 내가 만든 것은 사라지지 않게). 가려진 폴더의 기본 장면은 listScenes 가 이미 뺍니다. setState 없이 이동만 합니다.
  useEffect(() => {
    if (!catId || isCategoryVisible(catId)) return;
    if (!loaded) return;
    if (scenes.some((s) => s.custom)) return;
    navigate("/percakapan", { replace: true });
  }, [catId, plan.tier, loaded, scenes, navigate]);

  // (2026-11-23 맛보기) 무료도 장면 목록을 봅니다 — 예전에는 구독 화면으로 보냈습니다. 잠긴 장면에는 자물쇠.

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

  // 메뉴 창이 닫히며 내려가는 동안에도 마지막 내용(장면 이름·이름 바꾸기 중인지)을 그대로 보여 줍니다
  const lastMenuRef = useRef<{ scene: PercakapanScene | null; renaming: boolean }>({ scene: null, renaming: false });
  if (menuScene) lastMenuRef.current = { scene: menuScene, renaming };
  const mScene = menuScene || lastMenuRef.current.scene;
  const mRenaming = menuScene ? renaming : lastMenuRef.current.renaming;

  const handleOpenScene = (s: PercakapanScene) => {
    // 롱프레스로 메뉴가 뜬 직후의 click 은 무시합니다
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    // 무료: 맛보기 장면(01 처음 만나 인사)과 직접 만든 대화만 열림. 나머지는 공용 안내 창(D3)
    if (!canOpenScene(s, plan.plus)) {
      openPlusLock(LOCK_TITLE_SCENE);
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

  // 인라인 2단 확인: 처음 누르면 "한 번 더 누르면 삭제"로 바뀌고 3초 뒤 원복
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
        toast("대화를 삭제했습니다");
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
        {scenes.length > 0 ? (
          <div className="overflow-hidden" style={CARD_STYLE}>
            {scenes.map((s, i) => {
              const locked = !canOpenScene(s, plan.plus);
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
                  {/* 제목은 두 줄까지 보입니다 — 한 줄에서 자르면 글자를 키웠을 때 장면을 구분할 수 없었습니다(출시 전 점검 U-04) */}
                  <p className="flex items-center gap-1.5 text-[0.875rem] font-bold leading-tight" style={{ color: "#1D1F1E" }}>
                    <span className="min-w-0 line-clamp-2 break-keep">{s.title}</span>
                    {s.custom ? (
                      <span className="shrink-0 h-[5px] w-[5px] rounded-full bg-muted-foreground/45" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-word text-[0.78125rem] truncate" style={{ color: "#646C72" }}>
                    {s.titleId}
                  </p>
                </div>
                {/* 줄 수("N줄") 표시는 2026-11-19 사용자 요청으로 뺌 — 모든 회화집 공통 */}
                {locked ? (
                  <LockMark size={14} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#B7BDC1" }} />
                )}
              </button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center" style={CARD_STYLE}>
            <p className="text-[0.9375rem] text-foreground">아직 대화가 없습니다</p>
            <p className="mt-1 font-word text-[0.75rem] text-muted-foreground">Belum ada percakapan</p>
          </div>
        )}
      </div>

      {/* 롱프레스 메뉴 — 앱 공통 틀(고르기: 누르면 바로 실행). 이름 바꾸기 중에는 입력 창(글을 고쳤으면 끌기·바깥으로 안 닫힘).
          뒤로가기는 위 useBackClose(menuScene). 닫히는 동안에는 마지막 내용을 그대로 보여 줍니다. */}
      <AppSheet
        open={!!menuScene}
        onClose={closeMenu}
        title={mScene ? mScene.title : ""}
        icon={mRenaming ? <Pencil size={20} strokeWidth={1.8} /> : <MessagesSquare size={20} strokeWidth={1.8} />}
        dirty={mRenaming && !!mScene && renameText.trim() !== mScene.title}
        footer={
          mRenaming ? (
            <SheetButtonRow>
              <SheetButton variant="secondary" onClick={() => setRenaming(false)}>취소</SheetButton>
              <SheetButton onClick={handleRenameSave} disabled={renameText.trim() === ""} muted={renameText.trim() === ""}>저장</SheetButton>
            </SheetButtonRow>
          ) : undefined
        }
      >
        {mRenaming ? (
          <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
            <input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className={FORM_INPUT_CLASS + " font-body"}
              style={{ color: SHEET.txt }}
              autoFocus
            />
          </div>
        ) : (
          <>
            <ChoiceRow mode="action" onClick={() => setRenaming(true)} leading={<Pencil size={17} strokeWidth={1.8} color={SHEET.label} />} title="이름 바꾸기" />
            <ChoiceRow
              mode="action"
              onClick={handleDeleteClick}
              leading={<Trash2 size={17} strokeWidth={1.8} color={SHEET.danger} />}
              title={<span style={{ color: SHEET.danger }}>{confirmDelete ? "한 번 더 누르면 삭제" : "삭제"}</span>}
            />
          </>
        )}
      </AppSheet>
    </div>
  );
};

export default PercakapanCategory;
