// src/components/MedaliNudge.tsx
// 명찰(별) 아래에 잠깐 뜨는 작은 말풍선.
// 별(Bintang)은 게임·퀴즈로만 오르는데, 공부만 하고 게임을 며칠 안 하면
// 사용자는 그 사실을 모른 채 별이 멈춰 있게 됩니다. 그때만 조용히 한 번 알려 줍니다.
//
// 뜨는 조건 (셋 다 만족할 때만):
//   ① 이번 주에 뭔가 하긴 했다 (Api 주간 점수 > 0)
//   ② 오늘·어제·그제 게임 판 기록이 하나도 없다
//   ③ 오늘 아직 이 말풍선을 띄운 적이 없다
// 조건을 못 채우면 null을 반환하므로 헤더 레이아웃에 아무 영향이 없습니다.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { medaliEngine, listRounds, dateKey } from "@/lib/medali";

const NUDGE_KEY = "medali-nudge-date";
const SHOW_MS = 7000;        // 7초 뒤 스스로 사라집니다
const QUIET_DAYS = 3;        // 오늘 포함 3일간 게임이 없으면 넛지

export default function MedaliNudge() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [entered, setEntered] = useState(false);   // 등장 트랜지션용
  const timersRef = useRef<number[]>([]);

  // 타이머만 정리합니다 (setState를 하지 않아 언마운트 중 크래시가 나지 않습니다)
  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  };

  useEffect(() => {
    let alive = true;

    const decide = async () => {
      try {
        const today = dateKey(new Date());

        // ③ 하루 한 번
        if (localStorage.getItem(NUDGE_KEY) === today) return;

        // ① 이번 주에 아무것도 안 했으면 재촉하지 않습니다
        await medaliEngine.refresh();
        if (!alive) return;
        if (!(medaliEngine.getSummary().weekPoints > 0)) return;

        // ② 최근 며칠 안에 게임 판이 있으면 이미 하고 있는 것이라 뜨지 않습니다
        const recent: string[] = [];
        const base = new Date();
        for (let i = 0; i < QUIET_DAYS; i++) {
          const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
          d.setDate(d.getDate() - i);
          recent.push(dateKey(d));
        }
        const rounds = await listRounds();
        if (!alive) return;
        if (rounds.some((r) => r && recent.indexOf(r.date) >= 0)) return;

        try { localStorage.setItem(NUDGE_KEY, today); } catch (e) { /* 저장 실패해도 표시는 합니다 */ }

        setShow(true);
        // 다음 프레임에 페이드인 (등장이 툭 튀지 않도록)
        timersRef.current.push(window.setTimeout(() => { if (alive) setEntered(true); }, 30));
        timersRef.current.push(window.setTimeout(() => { if (alive) setEntered(false); }, SHOW_MS));
        timersRef.current.push(window.setTimeout(() => { if (alive) setShow(false); }, SHOW_MS + 250));
      } catch (e) {
        // 기록을 못 읽으면 그냥 띄우지 않습니다
      }
    };

    decide();
    return () => {
      alive = false;
      clearTimers();
    };
  }, []);

  if (!show) return null;

  const goPermainan = () => {
    clearTimers();          // setState 없이 정리만 하고 이동합니다
    navigate("/permainan");
  };

  return (
    <div className="absolute right-0 top-9 z-20">
      <button
        type="button"
        onClick={goPermainan}
        className={
          "relative rounded-full bg-white/95 px-3 py-1.5 shadow-lg font-gothic text-[11px] font-semibold text-teal-900 whitespace-nowrap transition-all duration-200 " +
          (entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1")
        }
      >
        {/* 별을 가리키는 꼬리 */}
        <span className="absolute -top-1 right-5 h-2 w-2 rotate-45 bg-white/95" aria-hidden="true" />
        <span className="relative">⭐ 게임 한 판이면 별이 늘어요</span>
      </button>
    </div>
  );
}
