// src/components/game/MedaliPill.tsx
// 게임방 머리의 훈장 알약 (G1 시안) — 밝은 머리 위에 올라가는 흰 알약: 불꽃(이번 주 점수) | 별(확정 단어).
// 메인 화면의 MedaliBadge 는 어두운 머리용이라 따로 둡니다. 숫자는 같은 엔진(medaliEngine)에서 받습니다.

import { useEffect, useState } from "react";
import { medaliEngine, loadMedaliCache } from "@/lib/medali";
import { G, IconFlame, IconStar } from "@/components/game/GameKit";

const shortNum = (n: number): string => {
  const v = typeof n === "number" && n > 0 ? Math.floor(n) : 0;
  return v > 999 ? "999+" : String(v);
};

export default function MedaliPill({ onClick }: { onClick?: () => void }) {
  const [view, setView] = useState(() => {
    const c = loadMedaliCache();
    return { week: c.apiWeekPoints, stars: c.confirmedCount };
  });

  useEffect(() => {
    const off = medaliEngine.subscribe((s) => {
      setView({ week: s.apiWeekPoints, stars: s.confirmedCount });
    });
    medaliEngine.refresh();
    return off;
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      title="Medali"
      className="h-8 px-[11px] rounded-2xl bg-white flex items-center gap-2 shrink-0 font-word text-[13.5px] font-semibold tabular-nums active:opacity-80"
      style={{ border: "1px solid " + G.hair }}
    >
      <span className="flex items-center gap-[3px]" style={{ color: "#B5643C" }}>
        <IconFlame size={15} />
        {shortNum(view.week)}
      </span>
      <span className="w-px h-3.5" style={{ background: G.hair }} aria-hidden="true" />
      <span className="flex items-center gap-[3px]" style={{ color: "#94723A" }}>
        <IconStar size={14} />
        {shortNum(view.stars)}
      </span>
    </button>
  );
}
