// src/pages/Percakapan.tsx
// 회화집 폴더 (/percakapan). 카테고리 목록 + 회화집 만들기.
// 시안: PC1-Folders (머리 오른쪽 "+ 회화집 만들기" 알약, 색 타일 + 이모지, "회화집 14개")
//       PC4-Make (아래에서 올라오는 만들기 시트, 난이도 하/중/상 46px, 기본 중)
// 공개판 무료는 회화집이 Plus 기능입니다. 다만 예전에 직접 만든 회화집은 계속 읽을 수 있습니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Lock, MessagesSquare, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import {
  listCategories,
  saveCustomCat,
  saveCustomScene,
  getCustomScenes,
  generateScene,
  fetchBackup,
  restoreBackup,
  hasPercakapanConfig,
  isCategoryVisible,
  PERCAKAPAN_LEVELS,
} from "@/lib/percakapan";
import type { PercakapanCategory, PercakapanLevel } from "@/lib/percakapan";
import { builtinScenesOf } from "@/data/percakapan";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { isStoreApp } from "@/lib/platform";
import LevelCircles from "@/components/LevelCircles";
import { useCompactPill } from "@/lib/useCompactPill";
import { aiErrorToast } from "@/lib/aiErrors";
import { useBackClose } from "@/hooks/useBackClose";

const RESTORE_ASKED_KEY = "percakapan-restore-asked";
const NEW_CAT = "__new__";
const LOCK_TEXT = "회화집은 Plus 회원 기능입니다";

type CatRow = PercakapanCategory & { count: number };

const C = {
  txt: "#1D1F1E",
  sub: "#646C72",
  mute: "#9AA1A6",
  teal: "#2C6D63",
  tealBg: "#E3EEEC",
  line: "#DDE3E6",
};
const CARD_STYLE = { background: "#FFFFFF", borderRadius: 18, boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

// 카테고리 타일 바탕색 (시안 PC1). 새 카테고리는 인니어 이름으로도 알아봅니다.
const TILE_BG: Record<string, string> = {
  dasar: "#E2F1EC",
  perkenalan: "#E2F1EC",
  makan: "#FCEFE3",
  belanja: "#FCEFE3",
  transportasi: "#E4EEF6",
  penginapan: "#E4EEF6",
  "sehari-hari": "#EAF2DF",
  kesehatan: "#ECE8F6",
  kerja: "#ECE8F6",
  telepon: "#F1F4F5",
  masalah: "#F8ECEC",
  uang: "#FCEFE3",
  "hari-raya": "#EAF2DF",
  kantor: "#ECE8F6",
  gereja: "#EAF2DF",
};

function tileBg(c: PercakapanCategory): string {
  if (TILE_BG[c.id]) return TILE_BG[c.id];
  const t = (c.titleId || "").toLowerCase();
  if (t.indexOf("uang") >= 0 || t.indexOf("bank") >= 0) return "#FCEFE3";
  if (t.indexOf("hari raya") >= 0 || t.indexOf("acara") >= 0) return "#EAF2DF";
  if (t.indexOf("kantor") >= 0 || t.indexOf("dokumen") >= 0) return "#ECE8F6";
  return "#F1F4F5";
}


const Percakapan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const plan = usePlan();

  const [allCats, setAllCats] = useState<CatRow[]>([]);
  // 교회와 신앙(staffOnly)은 listCategories 가 이미 거릅니다. 등급이 바뀐 직후를 위해 화면에서도 한 번 더.
  const cats = allCats.filter((c) => isCategoryVisible(c.id));

  // 만들기 시트
  const [makeOpen, setMakeOpen] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [newCatKo, setNewCatKo] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [situation, setSituation] = useState("");
  // 난이도 하·중·상 (PERCAKAPAN_LEVELS), 기본 중
  const [level, setLevel] = useState<PercakapanLevel>("중");
  const [creating, setCreating] = useState(false);
  // 서버가 오늘 만들기 한도를 다 썼다고 알려 왔는지 (이 화면에 있는 동안만)
  const [quotaHit, setQuotaHit] = useState(false);

  // 백업 복원 물어보기 시트
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreCount, setRestoreCount] = useState(0);
  const [restoring, setRestoring] = useState(false);

  const askedRef = useRef(false);

  // 헤더 "PERCAKAPAN" 을 자르지 않도록 (QA Q09)
  const headTitleRef = useRef<HTMLHeadingElement>(null);
  const makePillRef = useRef<HTMLButtonElement>(null);
  const makeLabelRef = useRef<HTMLSpanElement>(null);
  const makeCompact = useCompactPill(headTitleRef, makePillRef, makeLabelRef);

  // 폰의 뒤로가기는 시트만 닫습니다(회화집 화면을 떠나지 않음). 만드는 중에 눌러도 시트만 내려가고,
  // 다 만들어지면 그대로 읽기 화면으로 넘어갑니다.
  const makeBack = useBackClose(makeOpen, () => setMakeOpen(false));
  useBackClose(restoreOpen, () => setRestoreOpen(false));

  const refresh = () => {
    listCategories()
      .then((list) => setAllCats(list))
      .catch(() => setAllCats([]));
  };

  // 등급이 바뀌면(예: 회원키 입력) 보이는 폴더가 달라지므로 다시 불러옵니다.
  useEffect(() => {
    refresh();
  }, [plan.tier]);

  // 처음 들어왔을 때 한 번만: 이 기기가 비어 있고 서버에 백업이 있으면 물어봅니다.
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;

    if (!hasPercakapanConfig()) return;
    try {
      if (localStorage.getItem(RESTORE_ASKED_KEY)) return;
    } catch (e) {}

    let cancelled = false;
    getCustomScenes()
      .then((mine) => {
        if (cancelled || mine.length > 0) return null;
        return fetchBackup();
      })
      .then((backup) => {
        if (cancelled || !backup) return;
        if (backup.savedAt > 0 && backup.scenes.length > 0) {
          setRestoreCount(backup.scenes.length);
          setRestoreOpen(true);
        }
      })
      .catch(() => {
        // 자동 확인은 조용히 넘어갑니다
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 잠긴 기능: 안내를 띄우고 구독 화면으로 (setState 없이 이동만)
  const goLocked = () => {
    toast(LOCK_TEXT);
    navigate(PAYWALL_PATH);
  };

  const openMake = () => {
    if (!plan.plus) {
      goLocked();
      return;
    }
    setName("");
    setCatId(cats.length > 0 ? cats[0].id : NEW_CAT);
    setNewCatKo("");
    setNewCatId("");
    setSituation("");
    setLevel("중");
    setCreating(false);
    setMakeOpen(true);
  };

  const openCat = (c: CatRow) => {
    // 무료: 기본 회화집은 잠겨 있고, 직접 만든 회화집이 든 폴더만 열립니다.
    if (!plan.plus) {
      const mine = c.custom ? c.count : c.count - builtinScenesOf(c.id).length;
      if (mine <= 0) {
        goLocked();
        return;
      }
    }
    navigate("/percakapan/c/" + c.id);
  };

  const handleCreate = async () => {
    if (creating) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("회화집 이름을 넣어 주세요");
      return;
    }

    let targetCat = catId;
    let madeCat: PercakapanCategory | null = null;

    if (catId === NEW_CAT) {
      const ko = newCatKo.trim();
      if (!ko) {
        toast.error("새 카테고리 이름을 넣어 주세요");
        return;
      }
      madeCat = {
        id: "cat-" + Date.now().toString(36),
        title: ko,
        titleId: newCatId.trim() || ko,
        emoji: "💬",
        custom: true,
      };
      targetCat = madeCat.id;
    }

    setCreating(true);
    try {
      const scene = await generateScene({
        name: trimmed,
        catId: targetCat,
        situation: situation.trim(),
        level,
      });
      if (madeCat) await saveCustomCat(madeCat);
      await saveCustomScene(scene);
      // 시트를 닫는 setState 없이 곧바로 이동합니다 (WebView 에서 setState 여러 개 +
      // navigate 를 같이 부르면 화면이 죽는 일이 있었습니다).
      // 시트가 쌓아 둔 히스토리 칸은 새 화면으로 바꿔 끼웁니다 — 읽기 화면에서 한 번 뒤로 = 회화집 목록.
      navigate("/percakapan/" + scene.id, { replace: makeBack.onTop() });
    } catch (e: any) {
      setCreating(false);
      const code = (e && e.message) || "";
      // 한도 초과(QUOTA_PERCAKAPAN_MAKE 등): 토스트는 aiProxy 가 이미 띄웁니다. 시트 안에 오늘은 더 못 만든다는 안내를 둡니다.
      // Plus 필요(QUOTA_PLUS_REQUIRED): aiProxy 가 "Plus 보기" 알림을 띄웠으므로 여기서는 아무것도 하지 않습니다.
      if (code === "QUOTA_PLUS_REQUIRED") { /* 겹쳐 띄우지 않음 */ }
      else if (code.indexOf("QUOTA") === 0) setQuotaHit(true);
      // 공개판은 키 설정이 없으므로 aiErrors 가 사용자용 문장으로 바꿉니다(관리자판은 기존 문구).
      else if (code === "NO_API_KEY" || code === "SESSION_EXPIRED") aiErrorToast(code, "설정에서 Gemini API 키를 넣어 주세요", true);
      else if (code === "INVALID_API_KEY" || code === "NOT_AVAILABLE") aiErrorToast(code, "Gemini API 키가 맞지 않습니다", true);
      else if (code === "RATE_LIMIT") toast.error("요청이 많습니다. 잠시 뒤에 다시 하세요");
      else if (code === "TIMEOUT") toast.error("시간이 너무 오래 걸려 멈췄습니다");
      else if (code === "NETWORK_FAILED") toast.error("인터넷 연결을 확인해 주세요");
      else toast.error("회화집을 만들지 못했습니다");
    }
  };

  const handleRestore = () => {
    if (restoring) return;
    setRestoring(true);
    restoreBackup()
      .then((r) => {
        setRestoring(false);
        setRestoreOpen(false);
        if (r.addedScenes > 0) toast.success("회화집 " + r.addedScenes + "개를 불러왔습니다");
        else toast("새로 불러올 회화집이 없습니다");
        refresh();
      })
      .catch((e: any) => {
        setRestoring(false);
        const code = (e && e.message) || "";
        if (code === "UNAUTHORIZED") toast.error("비밀키가 맞지 않습니다. 설정을 확인해 주세요");
        else if (code === "NO_CONFIG") toast.error("설정에서 회화집 서버 주소와 비밀키를 넣어 주세요");
        else toast.error("불러오지 못했습니다");
      });
  };

  const handleLater = () => {
    try {
      localStorage.setItem(RESTORE_ASKED_KEY, "1");
    } catch (e) {}
    setRestoreOpen(false);
  };

  // 관리자판·회원판: "백업 불러오기"로 언제든 다시 불러올 수 있게 합니다 (공개판에는 없음).
  const handleRestoreClick = () => {
    if (!hasPercakapanConfig()) {
      toast("설정에서 회화집 서버 주소와 비밀키를 넣어 주세요");
      return;
    }
    handleRestore();
  };

  const closeMake = () => {
    if (creating) return;
    setMakeOpen(false);
  };

  const selectedCat = cats.find((c) => c.id === catId) || null;
  const fieldClass =
    "rounded-[14px] border-[1.5px] border-[#DDE3E6] bg-white box-border px-3.5 flex items-center gap-2 " +
    "focus-within:border-[#2C6D63] focus-within:shadow-[0_0_0_3px_#E3EEEC]";
  const labelEl = (t: string, hint?: string) => (
    <p className="mb-1.5 font-gothic text-[0.84375rem] font-bold" style={{ color: "#3B4245" }}>
      {t}
      {hint ? (
        <span className="ml-1.5 text-[0.75rem] font-medium" style={{ color: C.mute }}>
          {hint}
        </span>
      ) : null}
    </p>
  );

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        {/* 제목은 자르지 않습니다(QA Q09). 자리가 모자라면 "회화집 만들기" 알약이 아이콘만 남은 동그라미로 줄어듭니다. */}
        <h1
          ref={headTitleRef}
          className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]"
          style={{ minWidth: "fit-content" }}
        >
          PERCAKAPAN
        </h1>
        <button
          ref={makePillRef}
          type="button"
          onClick={openMake}
          aria-label="회화집 만들기"
          className={
            "-mr-1 h-9 rounded-full flex items-center font-gothic text-[0.8125rem] font-semibold active:opacity-80 " +
            (makeCompact ? "w-9 shrink-0 justify-center" : "min-w-9 overflow-hidden pl-[11px] pr-[13px] gap-[5px]")
          }
          style={{ background: C.tealBg, color: C.teal }}
        >
          {plan.plus ? <Plus size={15} strokeWidth={2.4} className="shrink-0" /> : <Lock size={13} strokeWidth={2.2} className="shrink-0" />}
          {makeCompact ? null : <span ref={makeLabelRef} className="whitespace-nowrap">회화집 만들기</span>}
        </button>
      </header>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-2.5">
        <div className="flex items-center mx-1">
          <p className="flex-1 font-gothic text-[0.875rem] font-bold tracking-[0.02em]" style={{ color: "#3B4245" }}>
            회화집 {cats.length}개
          </p>
          {!isStoreApp() ? (
            <button
              onClick={handleRestoreClick}
              className="inline-flex items-center gap-1 font-gothic text-[0.75rem]"
              style={{ color: C.sub }}
            >
              <RotateCcw size={13} className="shrink-0" />
              백업 불러오기
            </button>
          ) : null}
        </div>

        {cats.length > 0 ? (
          <div className="overflow-hidden" style={CARD_STYLE}>
            {cats.map((c, i) => {
              const locked = !plan.plus && (c.custom ? c.count : c.count - builtinScenesOf(c.id).length) <= 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCat(c)}
                  className="w-full flex items-center gap-3 text-left active:bg-muted/60 transition-colors"
                  style={{
                    padding: "12px 12px 12px 14px",
                    borderBottom: i < cats.length - 1 ? "1px solid #EEF1F3" : "0",
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[1.1875rem] leading-none"
                    style={{ background: tileBg(c) }}
                  >
                    {c.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    {/* 회화집 제목은 2026-11-11 사용자 요청으로 굵게 */}
                    <span className="block truncate text-[0.875rem] font-bold" style={{ color: C.txt }}>{c.title}</span>
                    <span className="block mt-px truncate font-word text-[0.75rem]" style={{ color: C.sub }}>{c.titleId}</span>
                  </span>
                  <span className="shrink-0 font-gothic text-[0.78125rem]" style={{ color: C.mute }}>{c.count}개</span>
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
            <p className="text-[0.9375rem]" style={{ color: C.txt }}>회화집이 없습니다</p>
            <p className="mt-1 font-word text-[0.75rem]" style={{ color: C.sub }}>Belum ada percakapan</p>
          </div>
        )}
      </div>

      {/* 만들기 시트 — 아래에서 올라옵니다 (시안 PC4) */}
      {makeOpen ? (
        <div className="fixed inset-0 z-50" onClick={closeMake}>
          <div className="absolute inset-0" style={{ background: "rgba(20,30,35,0.38)" }} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="회화집 만들기"
            className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white overflow-y-auto"
            style={{
              borderRadius: "22px 22px 0 0",
              maxHeight: "92dvh",
              padding: "8px 20px calc(18px + env(safe-area-inset-bottom)) 20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1 w-9 rounded-full" style={{ background: C.line }} />
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#E4EEF6", color: "#2B5F86" }}
              >
                <MessagesSquare size={20} strokeWidth={1.8} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[1rem] font-semibold" style={{ color: C.txt }}>회화집 만들기</span>
                <span className="block mt-0.5 font-gothic text-[0.78125rem]" style={{ color: C.sub }}>
                  상황을 적으면 두 사람의 대화를 만듭니다
                </span>
              </span>
              <button
                type="button"
                onClick={closeMake}
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#F1F4F5", color: C.sub }}
                title="닫기"
                aria-label="닫기"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-3.5 flex flex-col gap-[13px]">
              <div>
                {labelEl("회화집 이름")}
                <div className={fieldClass} style={{ minHeight: 44 }}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 병원 예약 바꾸기"
                    className="flex-1 min-w-0 bg-transparent outline-none text-[0.875rem] py-2"
                    style={{ color: C.txt }}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div>
                {labelEl("카테고리")}
                <div className={"relative " + fieldClass} style={{ minHeight: 44 }}>
                  <span className="text-[1rem] leading-none shrink-0" aria-hidden="true">
                    {catId === NEW_CAT ? "💬" : selectedCat ? selectedCat.emoji : ""}
                  </span>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                    className="flex-1 min-w-0 appearance-none bg-transparent outline-none text-[0.875rem] py-2 pr-6"
                    style={{ color: C.txt }}
                  >
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                    <option value={NEW_CAT}>+ 새 카테고리</option>
                  </select>
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: C.sub }}
                  />
                </div>
              </div>

              {catId === NEW_CAT ? (
                <div className="-mt-1 flex flex-col gap-2">
                  <div className={fieldClass} style={{ minHeight: 44 }}>
                    <input
                      value={newCatKo}
                      onChange={(e) => setNewCatKo(e.target.value)}
                      placeholder="새 카테고리 이름 (한국어)"
                      className="flex-1 min-w-0 bg-transparent outline-none text-[0.875rem] py-2"
                      style={{ color: C.txt }}
                    />
                  </div>
                  <div className={fieldClass} style={{ minHeight: 44 }}>
                    <input
                      value={newCatId}
                      onChange={(e) => setNewCatId(e.target.value)}
                      placeholder="새 카테고리 이름 (인도네시아어)"
                      className="flex-1 min-w-0 bg-transparent outline-none font-word text-[0.875rem] py-2"
                      style={{ color: C.txt }}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                {labelEl("상황 설명", "자세할수록 대화가 자연스럽습니다")}
                <div className={fieldClass} style={{ minHeight: 66 }}>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="예: 예약한 날 일이 생겨서, 병원에 전화해 다음 주로 날짜를 바꾸려고 함"
                    rows={2}
                    className="flex-1 min-w-0 resize-none bg-transparent outline-none text-[0.875rem] leading-[1.5] py-[9px] break-keep"
                    style={{ color: C.txt }}
                  />
                </div>
              </div>

              <div>
                {labelEl("난이도")}
                <LevelCircles
                  value={level}
                  onChange={setLevel}
                  variant="make"
                  levels={PERCAKAPAN_LEVELS}
                  disabled={creating}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || quotaHit}
              className="mt-4 w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-gothic text-[0.9375rem] font-semibold"
              style={
                quotaHit
                  ? { background: "#E9EDEF", color: C.mute }
                  : { background: C.teal, color: "#FFFFFF", opacity: creating ? 0.75 : 1 }
              }
            >
              {creating ? (
                <><Loader2 size={17} className="animate-spin" /> 만드는 중...</>
              ) : (
                <><Plus size={17} strokeWidth={2.4} /> 회화집 만들기</>
              )}
            </button>
            <p className="mt-2 text-center font-gothic text-[0.75rem]" style={{ color: quotaHit ? C.sub : C.mute }}>
              {quotaHit
                ? "오늘 만들 수 있는 회화집을 모두 만들었습니다 · 내일 다시 만들 수 있습니다"
                : "만드는 데 20초쯤 걸립니다"}
            </p>
          </div>
        </div>
      ) : null}

      {/* 백업이 있을 때 물어보는 시트 */}
      {restoreOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" onClick={handleLater} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="백업 불러오기"
            className="fixed z-50 left-1/2 -translate-x-1/2 top-[22%] w-[min(92vw,22rem)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 px-5 py-5"
          >
            <p className="text-[0.9375rem] leading-relaxed text-card-foreground">
              개인 회화집 {restoreCount}개를 찾았습니다. 불러오시겠습니까?
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleLater}
                className="flex-1 h-11 rounded-[13px] border border-border text-[0.875rem] font-gothic text-foreground/80 active:bg-muted"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="flex-1 h-11 rounded-[13px] bg-primary text-[0.875rem] font-medium text-white disabled:opacity-60"
              >
                {restoring ? "불러오는 중..." : "불러오기"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Percakapan;
