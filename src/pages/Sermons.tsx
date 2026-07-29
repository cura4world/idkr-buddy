// src/pages/Sermons.tsx
// 설교문 목록 (/sermon). 폰에 저장된 것을 먼저 그리고, 설정이 있으면 조용히 서버와 맞춥니다.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  SermonMeta,
  hasSermonConfig,
  getLastSync,
  getCachedSermons,
  syncSermons,
  formatSermonDateShort,
} from "@/lib/sermon";

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

  const [items, setItems] = useState<SermonMeta[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const configured = hasSermonConfig();

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
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-word text-[17px] font-semibold tracking-[0.06em]">KHOTBAH</h1>
      </header>

      <div className="px-4 py-4">
        {/* 불러오기 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-gothic text-foreground/80 active:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            불러오기
          </button>
          <p className="min-w-0 flex-1 truncate text-[12px] font-gothic text-muted-foreground">
            {lastSyncLabel(lastSync)}
          </p>
        </div>

        {/* 목록 */}
        {items.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate("/sermon/" + s.id)}
                className={
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " +
                  (i === items.length - 1 ? "" : "border-b border-border")
                }
              >
                <span className="shrink-0 w-[62px] font-gothic text-[12px] tabular-nums text-muted-foreground">
                  {formatSermonDateShort(s.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
                  {s.title || "제목 없음"}
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : !configured ? (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-8">
            <p className="text-center text-[13px] leading-relaxed font-gothic text-muted-foreground">
              설정에서 설교문 서버 주소와 비밀키를 넣어 주세요.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-8">
            <p className="text-center text-[13px] leading-relaxed font-gothic text-muted-foreground">
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
