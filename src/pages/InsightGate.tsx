// src/pages/InsightGate.tsx
// 인도네시아 이해의 하위 화면(개관·종족·종교·기독교·역사·카드)과 지도(/map)를 감쌉니다.
// 공개판 무료 사용자가 주소로 바로 들어오면 허브(/insight)로 보냅니다 — 허브에서 잠긴 메뉴를 누르면
// 공용 안내 창이 뜹니다(2026-11-23 맛보기·D3. 예전에는 곧바로 구독 화면으로 보냈음).
// 판단은 plan.ts 하나로만 합니다 — 관리자판·회원판은 getTier() 가 "admin" 이라 늘 통과합니다.

import { Navigate } from "react-router-dom";
import { usePlan } from "@/lib/plan";

const InsightGate = ({ children }: { children: React.ReactElement }) => {
  const { plus } = usePlan();
  if (!plus) return <Navigate to="/insight" replace />;
  return children;
};

export default InsightGate;
