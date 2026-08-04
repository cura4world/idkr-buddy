// src/pages/Permainan.tsx
// 게임방 (/permainan). 짝맞추기·스피드 O/X·문장 조립, 그리고 단어장 퀴즈로 가는 입구.
// 퀴즈는 여기서 단어장을 고르면 기존 화면(/quiz/:id)으로 보냅니다 — 단어장 폴더 안의 퀴즈 버튼도 그대로입니다.
// 메인 화면과 같은 톤(rounded-2xl 카드)으로 맞춥니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Blocks, ChevronRight, Grid2X2, ListChecks, Target, Type, X, Zap } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { listRounds } from "@/lib/medali";
import { getCategories, getWordsByCategory } from "@/lib/store";

interface KuisTarget {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

const Permainan = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [best, setBest] = useState(0); // 짝맞추기 최고(최단) 기록. 0이면 없음
  const [bestOx, setBestOx] = useState(0); // O/X 최고 정답 수. 0이면 없음
  const [bestSusun, setBestSusun] = useState(0); // 문장 조립 최고(최단) 기록. 0이면 없음
  const [bestEja, setBestEja] = useState(0); // 철자 채우기 최고 맞힌 단어 수. 0이면 없음
  const [bestTangkap, setBestTangkap] = useState(0); // 단어 받기 최고 받은 수. 0이면 없음

  // 퀴즈는 단어장별이라 최고 기록 대신 "어느 단어장으로 볼까요?" 시트를 띄웁니다.
  const [kuisOpen, setKuisOpen] = useState(false);
  const [kuisList, setKuisList] = useState<KuisTarget[]>([]);
  const kuisOpenRef = useRef(false);
  const kuisPushedRef = useRef(false);

  const openKuis = () => {
    if (kuisOpenRef.current) return;
    // 열 때마다 목록과 단어 수를 새로 읽습니다.
    // 퀴즈는 단어가 2개 이상이어야 성립하므로(QuizMode와 같은 조건) 그보다 적은 단어장은 뺍니다.
    const list: KuisTarget[] = getCategories()
      .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, count: getWordsByCategory(c.id).length }))
      .filter((c) => c.count >= 2);
    setKuisList(list);
    setKuisOpen(true);
    kuisOpenRef.current = true;
    // 폰의 뒤로가기로도 시트만 닫히도록 히스토리를 한 칸 쌓습니다.
    try {
      window.history.pushState({ kuisPicker: true }, "");
      kuisPushedRef.current = true;
    } catch (e) {
      kuisPushedRef.current = false;
    }
  };

  const closeKuis = () => {
    if (!kuisOpenRef.current) return;
    if (kuisPushedRef.current) {
      kuisPushedRef.current = false;
      // kuisOpenRef 는 여기서 내리지 않습니다 — popstate 핸들러가 이것을 보고 닫습니다.
      try { window.history.back(); return; } catch (e) {}
    }
    kuisOpenRef.current = false;
    setKuisOpen(false);
  };

  // 시트가 떠 있을 때의 뒤로가기만 가로챕니다 (다른 useEffect들과 겹치지 않는 독립 리스너).
  useEffect(() => {
    const onPop = () => {
      if (!kuisOpenRef.current) return;
      kuisOpenRef.current = false;
      kuisPushedRef.current = false;
      setKuisOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 이동할 때는 setState 를 하나만 하고 넘어갑니다 (언마운트 중 setState 로 WebView 가 죽지 않도록).
  const goKuis = (id: string) => {
    kuisOpenRef.current = false;
    kuisPushedRef.current = false;
    setKuisOpen(false);
    navigate("/quiz/" + id);
  };

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

  useEffect(() => {
    let cancelled = false;
    listRounds("susun")
      .then((rounds) => {
        if (cancelled) return;
        let min = 0;
        for (const r of rounds) {
          if (r && r.durationSec > 0 && (min === 0 || r.durationSec < min)) min = r.durationSec;
        }
        setBestSusun(min);
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
    listRounds("eja")
      .then((rounds) => {
        if (cancelled) return;
        let max = 0;
        for (const r of rounds) {
          if (r && r.score > max) max = r.score;
        }
        setBestEja(max);
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
    listRounds("tangkap")
      .then((rounds) => {
        if (cancelled) return;
        let max = 0;
        for (const r of rounds) {
          if (r && r.score > max) max = r.score;
        }
        setBestTangkap(max);
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

        <button
          type="button"
          onClick={() => navigate("/permainan/susun")}
          className="mt-3 w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <Blocks size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">문장 조립</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Susun Kalimat
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              단어를 순서대로 놓아 문장을 완성해요
            </p>
          </div>
          {bestSusun > 0 ? (
            <span className="shrink-0 font-word text-[0.78125rem] text-muted-foreground">
              최고 {bestSusun}초
            </span>
          ) : null}
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <button
          type="button"
          onClick={() => navigate("/permainan/eja")}
          className="mt-3 w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <Type size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">철자 채우기</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Eja
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              뜻을 보고 빈칸에 글자를 채워요
            </p>
          </div>
          {bestEja > 0 ? (
            <span className="shrink-0 font-word text-[0.78125rem] text-muted-foreground">
              최고 {bestEja}개
            </span>
          ) : null}
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <button
          type="button"
          onClick={() => navigate("/permainan/tangkap")}
          className="mt-3 w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <Target size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">단어 받기</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Tangkap
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              떨어지는 단어의 뜻을 골라 받아요
            </p>
          </div>
          {bestTangkap > 0 ? (
            <span className="shrink-0 font-word text-[0.78125rem] text-muted-foreground">
              최고 {bestTangkap}개
            </span>
          ) : null}
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <button
          type="button"
          onClick={openKuis}
          className="mt-3 w-full flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4 text-left active:bg-muted/60 transition-colors"
        >
          <ListChecks size={22} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[0.9375rem] leading-tight text-foreground">단어장 퀴즈</p>
            <p className="mt-0.5 font-word text-[0.71875rem] text-muted-foreground truncate">
              Kuis
            </p>
            <p className="mt-1.5 text-[0.78125rem] text-muted-foreground">
              단어장을 골라 사지선다로 확인해요
            </p>
          </div>
          <ChevronRight size={17} className="shrink-0 text-muted-foreground/50" />
        </button>

        <p className="mt-5 px-1 text-center font-gothic text-[0.71875rem] leading-relaxed text-muted-foreground">
          게임에서 맞힌 단어는 Medali Bintang에 쌓여요.
        </p>
      </div>

      {/* 어느 단어장으로 퀴즈를 볼지 고르는 시트 */}
      {kuisOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeKuis} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <div className="flex items-center gap-2 px-4 pb-3">
              <h2 className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                어느 단어장으로 볼까요?
              </h2>
              <button
                type="button"
                onClick={closeKuis}
                className="-mr-1 p-1 text-muted-foreground/60 active:text-muted-foreground"
                title="닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto border-t border-border">
              {kuisList.length === 0 ? (
                <p className="px-4 py-4 text-[0.75rem] leading-relaxed text-muted-foreground">
                  퀴즈를 볼 단어장이 없습니다. 단어가 2개 이상인 단어장이 있어야 합니다.
                </p>
              ) : (
                kuisList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goKuis(c.id)}
                    className="flex w-full items-center gap-2.5 border-b border-border px-4 py-2.5 text-left active:bg-muted/60"
                  >
                    <span className="shrink-0 text-[0.9375rem]">{c.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground">{c.count}단어</span>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/50" />
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Permainan;
