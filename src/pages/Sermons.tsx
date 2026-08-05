// src/pages/Sermons.tsx
// 설교문 목록 (/sermon). 폰에 저장된 것을 먼저 그리고, 설정이 있으면 조용히 서버와 맞춥니다.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { goBackOr } from "@/lib/nav";
import { ArrowLeft, RefreshCw, ChevronRight, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { useWideMode } from "@/lib/wideMode";
import { toast } from "sonner";
import {
  SermonMeta,
  hasSermonConfig,
  getLastSync,
  getCachedSermons,
  syncSermons,
  deleteSermonOnServer,
  deleteCachedSermon,
  formatSermonDateShort,
} from "@/lib/sermon";
import { deleteInk } from "@/lib/sermonInk";

// 왼쪽으로 이만큼 밀고 손을 떼면 밀린 채로 고정됩니다 (단어 카드와 같은 값)
const SWIPE_THRESHOLD = 80;
const OPEN_W = 64;       // 밀린 채로 고정되는 폭 (휴지통 한 칸)
const CLOSE_BACK = 24;   // 밀린 것을 오른쪽으로 이만큼 되밀면 닫힙니다

// 마지막으로 불러온 시각을 사람이 읽는 말로
const lastSyncLabel = (ms: number): string => {
  if (!ms) return "아직 불러온 적 없음";
  const diff = Date.now() - ms;
  if (diff < 0) return "방금 전";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return min + "분 전";
  const hour = Math.floor(min / 60);
  if (hour < 24) return hour + "시간 전";
  if (hour < 48) return "어제";
  const d = new Date(ms);
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
};

const Sermons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { widthClass, canWide, wide, toggle } = useWideMode();

  const [items, setItems] = useState<SermonMeta[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const configured = hasSermonConfig();

  // ---- 왼쪽으로 밀어 삭제 (단어 카드 스와이프와 같은 방식) ----
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  // 밀린 채로 고정된 항목 (한 번에 하나만). 여기 드러난 휴지통을 눌러야 지워집니다.
  const [openId, setOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const startedOpenRef = useRef(false);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  // 세로 스크롤과 가로 스와이프를 처음 움직임으로 갈라서 서로 방해하지 않게 합니다.
  const touchIntent = useRef<"none" | "swipe" | "scroll">("none");
  const swipeIdRef = useRef<string | null>(null);
  const swipeXRef = useRef(0);
  const touchMoved = useRef(false);
  // 화면을 떠난 뒤 콜백이 돌아와 setState 하지 않도록
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // 밀린 항목 바깥을 누르면 닫습니다 (다른 항목을 밀기 시작하는 경우도 여기서 닫힙니다).
  // 밀린 항목 안쪽은 그 항목의 제스처 처리에 맡깁니다 (되밀어 닫기 / 휴지통 누르기).
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: any) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest && el.closest("[data-swipe-open]")) return;
      setOpenId(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openId]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartPos.current.x;
      const dy = t.clientY - touchStartPos.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (touchIntent.current === "none") {
        if (adx > 12 || ady > 12) {
          // 왼쪽으로 미는 것, 그리고 이미 밀려 있는 항목을 오른쪽으로 되미는 것만 받습니다.
          if (adx > ady * 1.5 && (dx < 0 || startedOpenRef.current)) {
            touchIntent.current = "swipe";
            setSwipingId(swipeIdRef.current);
          } else {
            touchIntent.current = "scroll";
          }
        }
        touchMoved.current = adx > 10 || ady > 10;
      }

      if (touchIntent.current === "swipe") {
        e.preventDefault();
        // 밀려 있던 항목은 그 위치(-OPEN_W)에서 이어서 움직입니다.
        const base = startedOpenRef.current ? -OPEN_W : 0;
        const clampedX = Math.min(0, Math.max(base + dx, -(SWIPE_THRESHOLD + 30)));
        swipeXRef.current = clampedX;
        setSwipeX(clampedX);
      }
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, []);

  const handleTouchStart = (s: SermonMeta, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchIntent.current = "none";
    touchMoved.current = false;
    swipeIdRef.current = s.id;
    startedOpenRef.current = openId === s.id;
    swipeXRef.current = startedOpenRef.current ? -OPEN_W : 0;
  };

  const handleTouchEnd = (s: SermonMeta) => {
    const wasSwipe = touchIntent.current === "swipe";
    const finalX = swipeXRef.current;
    const startedOpen = startedOpenRef.current;
    touchStartPos.current = null;
    touchIntent.current = "none";
    swipeXRef.current = 0;
    setSwipingId(null);
    setSwipeX(0);
    if (!wasSwipe) return;
    // 임계값을 넘겨 떼면 밀린 채로 고정되고, 오른쪽으로 되밀면 닫힙니다.
    // (여기서 지우지 않습니다 — 드러난 휴지통을 한 번 더 눌러야 지워집니다)
    const keepOpen = startedOpen
      ? finalX <= -(OPEN_W - CLOSE_BACK)
      : finalX <= -SWIPE_THRESHOLD;
    setOpenId(keepOpen ? s.id : null);
    // 휴지통이 새로 드러나는 순간에만 무엇이 지워지는지 알립니다.
    // 이미 열려 있던 항목(startedOpen)은 그때 안내를 봤으므로 다시 띄우지 않습니다.
    if (keepOpen && !startedOpen) toast("설교문과 필기가 지워집니다");
  };

  // 서버 → 폰 캐시 → 필기 순으로 지웁니다.
  // 서버가 실패하면 뒤 단계를 하지 않습니다 — 폰에서만 지우면 다음 불러오기에서 되살아납니다.
  const handleDelete = async (target: SermonMeta) => {
    if (!target || deletingId) return;
    setDeletingId(target.id);

    try {
      await deleteSermonOnServer(target.id); // 1. 서버 (실패하면 여기서 멈춤)
    } catch (err: any) {
      const code = (err && err.message) || "";
      if (code === "UNAUTHORIZED") toast("설정의 비밀키를 확인해주세요");
      else toast("서버에서 지우지 못했습니다. 잠시 후 다시 시도해주세요");
      if (aliveRef.current) setDeletingId(null);
      return;
    }

    await deleteCachedSermon(target.id); // 2. 폰 캐시
    // 3. 필기 — 설교문은 이미 지워졌으므로 여기서 실패해도 전체를 실패로 보지 않습니다
    try {
      await deleteInk(target.id);
    } catch (err) {}

    const fresh = await getCachedSermons(); // 4. 목록 새로고침
    if (!aliveRef.current) return;
    // 목록에서 사라지는 것으로 충분하므로 완료 알림은 띄우지 않습니다
    // (무엇이 지워지는지는 밀었을 때 이미 알렸습니다).
    setItems(fresh);
    setOpenId(null);
    setDeletingId(null);
  };

  // 들어오자마자 캐시를 그리고(오프라인에서도 보이도록), 그다음 조용히 서버와 맞춥니다.
  useEffect(() => {
    let cancelled = false;

    getCachedSermons().then((cached) => {
      if (cancelled) return;
      setItems(cached);
      setLastSync(getLastSync());

      if (!hasSermonConfig()) return;
      syncSermons()
        .then(() => getCachedSermons())
        .then((fresh) => {
          if (cancelled) return;
          setItems(fresh);
          setLastSync(getLastSync());
        })
        .catch(() => {
          // 자동 실행은 조용히 넘어갑니다 (알림은 수동 버튼에서만)
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 수동 불러오기 — 결과를 toast 로 알립니다.
  const handleSync = () => {
    if (syncing) return;
    if (!hasSermonConfig()) {
      toast("설정에서 설교문 서버 주소와 비밀키를 넣어 주세요");
      return;
    }
    setSyncing(true);
    syncSermons()
      .then((r) => {
        const fresh = r.added + r.updated;
        if (fresh > 0) toast("설교문 " + fresh + "편을 새로 받았습니다");
        else if (r.removed > 0) toast("목록을 정리했습니다");
        else toast("새로 올라온 설교문이 없습니다");
        return getCachedSermons();
      })
      .then((fresh) => {
        setItems(fresh);
        setLastSync(getLastSync());
      })
      .catch((e: any) => {
        const code = (e && e.message) || "";
        if (code === "UNAUTHORIZED") toast("비밀키가 맞지 않습니다. 설정을 확인해 주세요");
        else if (code === "NO_CONFIG") toast("설정에서 설교문 서버 주소와 비밀키를 넣어 주세요");
        else toast("불러오지 못했습니다");
      })
      .finally(() => setSyncing(false));
  };

  return (
    <div className={"min-h-screen w-full " + widthClass + " mx-auto overflow-x-clip bg-background"}>
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">KHOTBAH</h1>
        {canWide ? (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground active:text-foreground"
            title={wide ? "원래 크기로" : "넓게 보기"}
            aria-label={wide ? "원래 크기로" : "넓게 보기"}
          >
            {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        ) : null}
      </header>

      <div className="px-4 py-4">
        {/* 불러오기 — 버튼은 오른쪽에, 마지막 시각은 왼쪽에 */}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[0.75rem] font-gothic text-muted-foreground">
            {lastSyncLabel(lastSync)}
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[0.75rem] font-gothic text-foreground/80 active:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            불러오기
          </button>
        </div>

        {/* 목록 */}
        {items.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((s, i) => {
              const isSwiping = swipingId === s.id;
              const isOpen = openId === s.id;
              // 미는 중이면 손가락을 따라가고, 손을 뗀 뒤에는 밀린 자리(-OPEN_W)에 고정됩니다.
              const currentSwipeX = isSwiping ? swipeX : (isOpen ? -OPEN_W : 0);
              return (
                <div
                  key={s.id}
                  data-swipe-open={isOpen ? "1" : undefined}
                  className={
                    "relative overflow-hidden " +
                    (i === items.length - 1 ? "" : "border-b border-border")
                  }
                >
                  {/* 삭제 배경은 미는 중이거나 밀린 상태일 때만 렌더링합니다 (평소에 비치지 않도록) */}
                  {isSwiping || isOpen ? (
                    <div className="absolute inset-0 flex items-center justify-end bg-red-500">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                        disabled={deletingId === s.id}
                        className="flex h-full items-center justify-center text-white active:bg-red-600 disabled:opacity-60"
                        style={{ width: OPEN_W + "px" }}
                        aria-label="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onTouchStart={(e) => handleTouchStart(s, e)}
                    onTouchEnd={() => handleTouchEnd(s)}
                    onClick={() => {
                      // click 은 touchend 뒤에 오므로 touchIntent 는 이미 "none" 입니다.
                      // 손가락이 움직였는지(touchMoved)는 남아 있으므로 그것으로 막습니다.
                      if (touchMoved.current) {
                        touchMoved.current = false;
                        return;
                      }
                      // 밀린 상태에서는 설교문이 열리지 않습니다 — 누르면 닫히기만 합니다.
                      if (isOpen) {
                        setOpenId(null);
                        return;
                      }
                      if (deletingId === s.id) return;
                      navigate("/sermon/" + s.id);
                    }}
                    className="relative w-full flex items-center gap-3 bg-card px-4 py-3.5 text-left active:bg-muted/60"
                    style={{
                      transform: "translateX(" + currentSwipeX + "px)",
                      transition: isSwiping ? "none" : "transform 0.25s ease",
                    }}
                  >
                    <span className="shrink-0 w-[62px] font-gothic text-[0.75rem] tabular-nums text-muted-foreground">
                      {formatSermonDateShort(s.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] text-foreground">
                      {s.title || "제목 없음"}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : !configured ? (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-8">
            <p className="text-center text-[0.8125rem] leading-relaxed font-gothic text-muted-foreground">
              설정에서 설교문 서버 주소와 비밀키를 넣어 주세요.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-8">
            <p className="text-center text-[0.8125rem] leading-relaxed font-gothic text-muted-foreground">
              아직 올라온 설교문이 없습니다.
              <br />
              PC에서 워드 파일을 올린 뒤 불러오기를 눌러 주세요.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Sermons;
