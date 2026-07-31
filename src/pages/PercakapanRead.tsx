// src/pages/PercakapanRead.tsx
// 회화 한 편 읽기 (/percakapan/:id).
// 인도네시아어와 한국어를 뒤집지 않고 한 줄씩 위아래로 같이 보여줍니다 (플립 없음).
// 전체 듣기는 남/여 두 목소리로, 줄 오른쪽 스피커는 그 문장 하나만 읽습니다.

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Pause, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { findScene } from "@/lib/percakapan";
import type { PercakapanScene, PercakapanSpeaker } from "@/lib/percakapan";
import { percakapanAudioPlayer } from "@/lib/percakapanAudio";
import type { PcAudioSnapshot } from "@/lib/percakapanAudio";

// 화자 배지 색. A / B / C 를 한눈에 구분하기 위한 것입니다.
const BADGE: Record<string, string> = {
  A: "bg-primary/15 text-primary",
  B: "bg-sky-500/15 text-sky-600",
  C: "bg-amber-500/15 text-amber-600",
};

const badgeClass = (s: PercakapanSpeaker): string => BADGE[s] || BADGE.A;

const PercakapanRead = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const id = params.id || "";

  const [scene, setScene] = useState<PercakapanScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<PcAudioSnapshot>(() =>
    percakapanAudioPlayer.getSnapshot()
  );

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      navigate("/percakapan", { replace: true });
      return;
    }
    findScene(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          navigate("/percakapan", { replace: true });
          return;
        }
        setScene(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        navigate("/percakapan", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    return percakapanAudioPlayer.subscribe((s) => setSnap(s));
  }, []);

  // 화면을 벗어나면 소리를 끕니다
  useEffect(() => {
    return () => {
      try {
        percakapanAudioPlayer.stop();
      } catch (e) {}
    };
  }, []);

  // 재생 오류 알림
  const [lastErr, setLastErr] = useState(0);
  useEffect(() => {
    if (!snap.errorAt || snap.errorAt === lastErr) return;
    setLastErr(snap.errorAt);
    toast.error("음성을 불러오지 못했습니다");
  }, [snap.errorAt, lastErr]);

  const mineAll = !!scene && snap.sceneId === scene.id && snap.lineIndex === null;
  const allLabel = mineAll
    ? snap.state === "loading"
      ? "준비 중..."
      : snap.state === "playing"
      ? "일시정지"
      : snap.state === "paused"
      ? "이어 듣기"
      : "전체 듣기"
    : "전체 듣기";

  const rolesLine = scene
    ? "A " +
      scene.roles.A +
      " · B " +
      scene.roles.B +
      (scene.roles.C ? " · C " + scene.roles.C : "")
    : "";

  return (
    <div className="min-h-screen w-full max-w-lg mx-auto overflow-x-clip bg-background pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              goBackOr(navigate, location.key, scene ? "/percakapan/c/" + scene.cat : "/percakapan")
            }
            className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
            title="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight">
              {scene ? scene.title : "회화집"}
            </h1>
            <p className="mt-0.5 truncate font-word text-[11.5px] text-muted-foreground">
              {scene ? scene.titleId : ""}
            </p>
          </div>
          {scene ? (
            <button
              type="button"
              onClick={() => percakapanAudioPlayer.playAll(scene)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12.5px] font-gothic text-foreground/80 active:bg-muted"
            >
              {mineAll && snap.state === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : mineAll && snap.state === "playing" ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
              {allLabel}
            </button>
          ) : null}
        </div>
        {rolesLine ? (
          <p className="mt-1.5 pl-[2.25rem] truncate font-gothic text-[11.5px] text-muted-foreground">
            {rolesLine}
          </p>
        ) : null}
      </header>

      <div className="px-4 py-4">
        {loading || !scene ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {scene.lines.map((l, i) => {
              const active = snap.sceneId === scene.id && snap.lineIndex === i;
              return (
                <div
                  key={i}
                  className={
                    "flex items-start gap-2.5 px-4 py-3 " +
                    (i === scene.lines.length - 1 ? "" : "border-b border-border ") +
                    (active ? "bg-muted/50" : "")
                  }
                >
                  <span
                    className={
                      "mt-0.5 shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10.5px] font-gothic font-semibold " +
                      badgeClass(l.s)
                    }
                  >
                    {l.s}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-word text-[15.5px] leading-snug text-foreground">{l.id}</p>
                    <p className="mt-0.5 font-gothic text-[12.5px] leading-snug text-muted-foreground">
                      {l.ko}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => percakapanAudioPlayer.playLine(scene, i)}
                    className="shrink-0 -mr-1 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
                    title="이 문장 듣기"
                    aria-label="이 문장 듣기"
                  >
                    {active && snap.state === "loading" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Volume2 size={15} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PercakapanRead;
