// src/pages/Permainan.tsx
// 게임방 (/permainan). 지금은 짝맞추기 하나이고, 스피드 O/X는 자리만 잡아 둡니다.
// 메인 화면과 같은 톤(rounded-2xl 카드)으로 맞춥니다.

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Grid2X2, Zap } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { listRounds } from "@/lib/medali";

const Permainan = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [best, setBest] = useState(0); // 짝맞추기 최고(최단) 기록. 0이면 없음
  const [bestOx, setBestOx] = useState(0); // O/X 최고 정답 수. 0이면 없음

  useEffect(() => {
    let cancelled = false;
    listRounds("match")
      .then((rounds) => {
        if (cancelled) return;
        let min = 0;
        for (const r of rounds) {
          if (r && r.durationSec > 0 && (min === 0 || r.durationSec < min)) min = r.durationSec;
        }
        setBest(min);
      })
      .catch(() => {
        // 기록을 못 읽어도 게임은 열립니다
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listRounds("ox")
      .then((rounds) => {
        if (cancelled) return;
        let max = 0;
        for (const r of rounds) {
          if (r && r.score > max) max = r.score;
        }
        setBestOx(max);
      })
      .catch(() => {
        // 기록을 못 읽어도 게임은 열립니다
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          PERMAINAN
        </h1>
      </header>

      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate("/permainan/match")}
          className="w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <Grid2X2 size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">짝맞추기</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Cocokkan
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              카드를 뒤집어 짝을 찾아요
            </p>
          </div>
          {best > 0 ? (
            <span className="shrink-0 font-word text-[0.78125rem] text-muted-foreground">
              최고 {best}초
            </span>
          ) : null}
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <button
          type="button"
          onClick={() => navigate("/permainan/ox")}
          className="mt-3 w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <Zap size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">스피드 O/X</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Cepat O/X
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              뜻이 맞는지 빠르게 골라요
            </p>
          </div>
          {bestOx > 0 ? (
            <span className="shrink-0 font-word text-[0.78125rem] text-muted-foreground">
              최고 {bestOx}개
            </span>
          ) : null}
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <p className="mt-5 px-1 text-center font-gothic text-[0.71875rem] leading-relaxed text-muted-foreground">
          게임에서 맞힌 단어는 Medali Bintang에 쌓여요.
        </p>
      </div>
    </div>
  );
};

export default Permainan;
