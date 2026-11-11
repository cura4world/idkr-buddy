// src/pages/Permainan.tsx
// 게임방 (/permainan) — 시안 G1-Plus · G2-Free.
// 7줄: 오늘의 단어 퍼즐(맨 위, 무료도 가능) · 빠른 짝짓기 · 스피드 O/X · 듣고 고르기 · 문장 조립 · 철자 채우기 · 단어 받기.
// 짝맞추기(Cocokkan)와 단어장 퀴즈(Kuis)는 2026-11 결정으로 뺐습니다(단어장 안의 퀴즈 버튼은 그대로).
// 무료 사용자: 귤색 Plus 상자 + 퍼즐 말고 모두 흐리게 잠금(누르면 안내 후 구독 화면).
// Plus·체험·Special·관리자: 머리에 훈장 알약, 아래에 Medali Bintang 안내.
// 공개판에서는 하단 탭(BottomTabs)의 뿌리 화면이라 뒤로가기를 두지 않습니다. 탭 막대 아래 빈칸은
// BottomTabs 가 화면 흐름 끝에 직접 두므로 여기서는 높이만 막대만큼 줄입니다(--kata-tabbar-h).
// 관리자판·회원판에는 탭 막대가 없어 예전처럼 뒤로가기를 둡니다.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { goBackOr } from "@/lib/nav";
import { listRounds } from "@/lib/medali";
import type { GameRound } from "@/lib/medali";
import { usePlan, PAYWALL_PATH } from "@/lib/plan";
import { isStoreApp } from "@/lib/platform";
import { currentStreak } from "@/lib/kataHariIni";
import MedaliSheet from "@/components/MedaliSheet";
import MedaliPill from "@/components/game/MedaliPill";
import PlusLockBox from "@/components/PlusLockBox";
import {
  G,
  CARD_SHADOW,
  GAME_META,
  GAME_ORDER,
  GameIcon,
  IconChevron,
  IconLock,
  Svg,
} from "@/components/game/GameKit";
import type { GameId } from "@/components/game/GameKit";

type Records = Partial<Record<GameId, string>>;

// 판 기록 → 목록 오른쪽 "최고 N…" 글자
export function recordsFrom(rounds: GameRound[]): Records {
  const max = (g: GameRound["game"]): number => {
    let m = 0;
    for (const r of rounds) if (r && r.game === g && r.score > m) m = r.score;
    return m;
  };
  const minSec = (g: GameRound["game"]): number => {
    let m = 0;
    for (const r of rounds) {
      if (r && r.game === g && r.durationSec > 0 && (m === 0 || r.durationSec < m)) m = r.durationSec;
    }
    return m;
  };
  const out: Records = {};
  const jodoh = max("jodoh");
  if (jodoh > 0) out.jodoh = "최고 " + jodoh + "쌍";
  const ox = max("ox");
  if (ox > 0) out.ox = "최고 " + ox + "개";
  const dengar = max("dengar");
  if (dengar > 0) out.dengar = "최고 " + dengar + "개";
  const susun = minSec("susun");
  if (susun > 0) out.susun = "최고 " + susun + "초";
  const eja = max("eja");
  if (eja > 0) out.eja = "최고 " + eja + "개";
  const tangkap = max("tangkap");
  if (tangkap > 0) out.tangkap = "최고 " + tangkap + "개";
  return out;
}

const IconBack = () => (
  <Svg size={20}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const Permainan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plus } = usePlan();
  const store = isStoreApp();

  const [records, setRecords] = useState<Records>({});
  const [streak, setStreak] = useState(() => currentStreak());

  useEffect(() => {
    let cancelled = false;
    listRounds()
      .then((rounds) => {
        if (!cancelled) setRecords(recordsFrom(rounds));
      })
      .catch(() => {
        // 기록을 못 읽어도 게임은 열립니다
      });
    // 다른 탭에서 퍼즐을 풀고 돌아온 경우를 위해 다시 셉니다
    const onShow = () => {
      if (document.visibilityState === "visible") setStreak(currentStreak());
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  // 훈장 팝업 — 폰의 뒤로가기로 팝업만 닫히게 히스토리를 한 칸 쌓습니다 (메인 화면과 같은 방식)
  const [medaliOpen, setMedaliOpen] = useState(false);
  const medaliOpenRef = useRef(false);
  const medaliPushedRef = useRef(false);

  const openMedali = () => {
    if (medaliOpenRef.current) return;
    setMedaliOpen(true);
    medaliOpenRef.current = true;
    try {
      window.history.pushState({ medaliSheet: true }, "");
      medaliPushedRef.current = true;
    } catch (e) {
      medaliPushedRef.current = false;
    }
  };

  const closeMedali = () => {
    if (!medaliOpenRef.current) return;
    medaliOpenRef.current = false;
    setMedaliOpen(false);
    if (medaliPushedRef.current) {
      medaliPushedRef.current = false;
      try { window.history.back(); } catch (e) {}
    }
  };

  useEffect(() => {
    const onPop = () => {
      if (!medaliOpenRef.current) return;
      medaliOpenRef.current = false;
      medaliPushedRef.current = false;
      setMedaliOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 이동할 때는 setState 를 하지 않습니다 (언마운트 중 setState 로 WebView 가 죽지 않도록)
  const open = (id: GameId) => {
    const locked = id !== "kata" && !plus;
    if (locked) {
      toast("게임은 Plus 회원 기능입니다");
      navigate(PAYWALL_PATH);
      return;
    }
    navigate(GAME_META[id].path);
  };

  const recordOf = (id: GameId): string => {
    if (id === "kata") return streak > 0 ? "연속 " + streak + "일" : "";
    return records[id] || "";
  };

  return (
    <div
      className="w-full max-w-lg mx-auto overflow-x-clip bg-background text-foreground pb-6"
      style={{ minHeight: "calc(100dvh - var(--kata-tabbar-h, 0px))" }}
    >
      <header
        className="sticky top-0 z-30 bg-background h-14 px-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid " + G.hair }}
      >
        {!store ? (
          <button
            type="button"
            onClick={() => goBackOr(navigate, location.key, "/")}
            className="w-10 h-10 -ml-2 -mr-1 flex items-center justify-center shrink-0 active:opacity-60"
            title="뒤로"
            aria-label="뒤로"
          >
            <IconBack />
          </button>
        ) : null}
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">
          PERMAINAN
        </h1>
        {plus ? <MedaliPill onClick={openMedali} /> : null}
      </header>

      <div className="px-4 pt-4 flex flex-col gap-2.5">
        {!plus ? (
          <PlusLockBox
            title="게임은 Plus 회원 기능입니다"
            lines={["Plus로 모든 게임을 열고,", "맞힌 단어는 훈장 · 별로 쌓입니다"]}
            onClick={() => navigate(PAYWALL_PATH)}
          />
        ) : null}

        {GAME_ORDER.map((id) => {
          const m = GAME_META[id];
          const locked = id !== "kata" && !plus;
          const rec = locked ? "" : recordOf(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              className="w-full flex items-center gap-3.5 rounded-[18px] bg-white py-3 pr-2.5 pl-3.5 text-left active:bg-[#F6F8F9]"
              style={{ boxShadow: CARD_SHADOW, opacity: locked ? 0.72 : 1 }}
            >
              <span
                className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shrink-0"
                style={{ background: m.bg, color: m.fg }}
              >
                <GameIcon id={id} size={22} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline gap-[7px] min-w-0">
                  <span className="text-[14.5px] font-semibold shrink-0" style={{ color: G.text }}>
                    {m.ko}
                  </span>
                  <span className="font-word text-[11px] truncate" style={{ color: G.faint }}>
                    {m.name}
                  </span>
                  {rec ? (
                    <span
                      className="ml-auto font-gothic text-[10.5px] font-semibold shrink-0"
                      style={{ color: G.faint }}
                    >
                      {rec}
                    </span>
                  ) : null}
                </span>
                <span
                  className="block mt-[3px] font-gothic text-[11.5px] leading-[1.5] break-keep"
                  style={{ color: G.sub }}
                >
                  {m.desc}
                </span>
              </span>
              {locked ? <IconLock size={17} /> : <IconChevron size={17} />}
            </button>
          );
        })}

        {plus ? (
          <p className="mt-1.5 text-center font-gothic text-[10.5px]" style={{ color: G.faint }}>
            게임에서 맞힌 단어는 Medali Bintang에 쌓입니다
          </p>
        ) : null}
      </div>

      <MedaliSheet open={medaliOpen} onOpenChange={(o) => { if (!o) closeMedali(); }} />
    </div>
  );
};

export default Permainan;
