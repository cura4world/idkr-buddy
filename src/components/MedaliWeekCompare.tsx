// src/components/MedaliWeekCompare.tsx
// "지난주보다 +12점 · 이번 달 별 +5개" 한 줄 — 내 정보 훈장 카드와 훈장 요약 창이 같이 씁니다(2026-11-24).
// 이번 주 월요일~오늘 vs 지난주 월요일~같은 요일(lib/medali.ts lastWeekPoints), 이 폰 기록만(서버 없음).
// 첫 주(이번 주 월요일보다 앞선 기록 없음)는 비교 대신 안내 한 줄.

import { useEffect, useState } from "react";
import { lastWeekPoints, countMonthStars, listWordRecords } from "@/lib/medali";

const TEAL = "#2C6D63";
const MUTED = "#646C72";

export interface WeekCompareData {
  hasHistory: boolean;
  lastWeek: number;
  monthStars: number;
}

/** 지난주 같은 기간 점수와 이번 달 처음 외운 별. active 가 true 가 될 때마다 다시 셉니다. null = 아직 계산 전 */
export function useMedaliWeekCompare(active: boolean = true): WeekCompareData | null {
  const [data, setData] = useState<WeekCompareData | null>(null);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    Promise.all([lastWeekPoints(), listWordRecords()])
      .then(([lw, words]) => {
        if (alive) setData({ hasHistory: lw.hasHistory, lastWeek: lw.points, monthStars: countMonthStars(words) });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [active]);
  return data;
}

/** 한 줄 글. 계산 전에는 비워 둡니다(감싸는 쪽이 높이를 잡아 둠) */
export function MedaliWeekCompareText({ week, data }: { week: number; data: WeekCompareData | null }) {
  if (!data) return null;
  if (!data.hasHistory) return <>다음 주부터 지난주와 비교해 드립니다</>;
  const diff = week - data.lastWeek;
  return (
    <>
      {diff === 0 ? (
        "지난주와 같습니다"
      ) : (
        <>
          지난주보다{" "}
          <b className="tabular-nums" style={{ fontWeight: 700, color: diff > 0 ? TEAL : MUTED }}>
            {(diff > 0 ? "+" : "−") + Math.abs(diff)}점
          </b>
        </>
      )}
      {" · 이번 달 별 "}
      <b className="tabular-nums" style={{ fontWeight: 700, color: data.monthStars > 0 ? TEAL : MUTED }}>
        +{data.monthStars}개
      </b>
    </>
  );
}
