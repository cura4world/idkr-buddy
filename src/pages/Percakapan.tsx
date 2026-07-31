// src/pages/Percakapan.tsx
// 회화집 폴더 (/percakapan). 카테고리 목록 + 회화집 만들기.
// 메인 화면과 같은 톤(rounded-2xl 카드 + Row 목록)으로 맞춥니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, RotateCcw, X } from "lucide-react";
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
} from "@/lib/percakapan";
import type { PercakapanCategory, PercakapanLevel } from "@/lib/percakapan";

const RESTORE_ASKED_KEY = "percakapan-restore-asked";
const NEW_CAT = "__new__";

type CatRow = PercakapanCategory & { count: number };

// 메인 화면(Index.tsx)의 Row 와 같은 모양. 여기서만 씁니다.
type RowProps = {
  emoji: string;
  title: string;
  sub: string;
  meta?: string;
  onClick: () => void;
  last?: boolean;
};

const Row = ({ emoji, title, sub, meta, onClick, last }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={
      "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
      (last ? "" : "border-b border-border")
    }
  >
    <span className="shrink-0 w-5 text-center text-[17px] leading-none">{emoji}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[15px] leading-tight text-foreground truncate">{title}</p>
      <p className="mt-0.5 font-word text-[11.5px] text-muted-foreground truncate">{sub}</p>
    </div>
    {meta ? (
      <span className="shrink-0 max-w-[46%] truncate pl-2.5 font-word text-[12.5px] text-muted-foreground">
        {meta}
      </span>
    ) : null}
    <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
  </button>
);

const Percakapan = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cats, setCats] = useState<CatRow[]>([]);

  // 만들기 시트
  const [makeOpen, setMakeOpen] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [newCatKo, setNewCatKo] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [situation, setSituation] = useState("");
  const [level, setLevel] = useState<PercakapanLevel>("중");
  const [creating, setCreating] = useState(false);

  // 백업 복원 물어보기 시트
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreCount, setRestoreCount] = useState(0);
  const [restoring, setRestoring] = useState(false);

  const askedRef = useRef(false);

  const refresh = () => {
    listCategories()
      .then((list) => setCats(list))
      .catch(() => setCats([]));
  };

  useEffect(() => {
    refresh();
  }, []);

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

  const openMake = () => {
    setName("");
    setCatId(cats.length > 0 ? cats[0].id : NEW_CAT);
    setNewCatKo("");
    setNewCatId("");
    setSituation("");
    setLevel("중");
    setCreating(false);
    setMakeOpen(true);
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
      // navigate 를 같이 부르면 화면이 죽는 일이 있었습니다)
      navigate("/percakapan/" + scene.id);
    } catch (e: any) {
      setCreating(false);
      const code = (e && e.message) || "";
      if (code === "NO_API_KEY") toast.error("설정에서 Gemini API 키를 넣어 주세요");
      else if (code === "INVALID_API_KEY") toast.error("Gemini API 키가 맞지 않습니다");
      else if (code === "RATE_LIMIT") toast.error("요청이 많습니다. 잠시 뒤에 다시 해주세요");
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

  // 목록 위 "백업 불러오기"로 언제든 다시 불러올 수 있게 합니다.
  const handleRestoreClick = () => {
    if (!hasPercakapanConfig()) {
      toast("설정에서 회화집 서버 주소와 비밀키를 넣어 주세요");
      return;
    }
    handleRestore();
  };

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
        {/* 제목·폰트·바 스타일은 단어장 폴더(Wordbooks) 첫 화면과 같게 맞춥니다 */}
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          PERCAKAPAN
        </h1>
      </header>

      <div className="px-4">
        {/* 단어장 폴더(Wordbooks)의 "공용 단어장 복구 / + 단어장 추가" 줄과 같은 모양입니다 */}
        <div className="flex justify-end gap-4 pt-3">
          <button
            onClick={handleRestoreClick}
            className="group inline-flex items-center gap-1 text-xs text-foreground font-gothic"
          >
            <RotateCcw size={13} className="shrink-0" />
            <span className="group-hover:underline underline-offset-4">백업 불러오기</span>
          </button>
          <button
            onClick={openMake}
            className="text-xs text-foreground hover:underline underline-offset-4 font-gothic"
          >
            + 회화집 추가
          </button>
        </div>

        {cats.length > 0 ? (
          <div className="mt-3.5 overflow-hidden rounded-2xl border border-border bg-card">
            {cats.map((c, i) => (
              <Row
                key={c.id}
                emoji={c.emoji}
                title={c.title}
                sub={c.titleId}
                meta={c.count + "개"}
                onClick={() => navigate("/percakapan/c/" + c.id)}
                last={i === cats.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3.5 rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-[15px] text-foreground">회화집이 없습니다</p>
            <p className="mt-1 font-word text-[12px] text-muted-foreground">Belum ada percakapan</p>
            <button
              type="button"
              onClick={openMake}
              className="mt-4 h-10 px-4 rounded-full bg-primary text-[13px] font-gothic font-medium text-white active:opacity-90"
            >
              첫 회화집 만들기
            </button>
          </div>
        )}
      </div>

      {/* 만들기 시트 — 단어 정보 팝업과 같은 방식의 플로팅 카드 */}
      {makeOpen ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
            onClick={() => {
              if (creating) return;
              setMakeOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="회화집 만들기"
            className="fixed z-50 left-1/2 -translate-x-1/2 top-[10%] w-[min(92vw,26rem)] rounded-2xl bg-card border border-border/60 shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div
              className="max-h-[80dvh] overflow-y-auto px-5 pt-4"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-body text-base font-semibold text-card-foreground">
                  회화집 만들기
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (creating) return;
                    setMakeOpen(false);
                  }}
                  className="-mt-1 -mr-1 p-1 text-muted-foreground/60 hover:text-muted-foreground"
                  title="닫기"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="h-px bg-border/50 mt-3 mb-4" />

              <label className="block">
                <span className="block text-[12px] font-gothic font-semibold text-muted-foreground">
                  회화집 이름
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 병원 예약 바꾸기"
                  className="mt-1.5 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px] text-card-foreground outline-none focus:border-primary"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>

              <label className="mt-4 block">
                <span className="block text-[12px] font-gothic font-semibold text-muted-foreground">
                  카테고리
                </span>
                <select
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px] text-card-foreground outline-none focus:border-primary"
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji + " " + c.title}
                    </option>
                  ))}
                  <option value={NEW_CAT}>+ 새 카테고리</option>
                </select>
              </label>

              {catId === NEW_CAT ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={newCatKo}
                    onChange={(e) => setNewCatKo(e.target.value)}
                    placeholder="새 카테고리 이름 (한국어)"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px] text-card-foreground outline-none focus:border-primary"
                  />
                  <input
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    placeholder="새 카테고리 이름 (인도네시아어)"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 font-word text-[14px] text-card-foreground outline-none focus:border-primary"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className="block text-[12px] font-gothic font-semibold text-muted-foreground">
                  어떤 상황인가요?
                </span>
                <input
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="예: 예약 날짜를 바꾸려고 전화함"
                  className="mt-1.5 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px] text-card-foreground outline-none focus:border-primary"
                />
              </label>

              <div className="mt-4">
                <span className="block text-[12px] font-gothic font-semibold text-muted-foreground">
                  난이도
                </span>
                <div className="mt-1.5 flex gap-2">
                  {(["중", "상"] as PercakapanLevel[]).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevel(lv)}
                      className={
                        "flex-1 rounded-lg border py-2 text-[13px] font-gothic " +
                        (level === lv
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-transparent text-foreground/80")
                      }
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="mt-6 h-12 w-full rounded-[13px] bg-primary text-[15px] font-medium text-white disabled:opacity-60"
              >
                {creating ? "생성 중..." : "만들기"}
              </button>
              <p className="mt-2 text-center text-[11.5px] font-gothic text-muted-foreground">
                만드는 데 20초쯤 걸립니다
              </p>
            </div>
          </div>
        </>
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
            <p className="text-[15px] leading-relaxed text-card-foreground">
              개인 회화집 {restoreCount}개를 찾았어요. 불러올까요?
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleLater}
                className="flex-1 h-11 rounded-[13px] border border-border text-[14px] font-gothic text-foreground/80 active:bg-muted"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="flex-1 h-11 rounded-[13px] bg-primary text-[14px] font-medium text-white disabled:opacity-60"
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
