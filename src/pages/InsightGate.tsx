// src/pages/InsightGate.tsx
// 인도네시아 이해의 하위 화면(개관·종족·종교·기독교·역사·생활 정보)과 지도(/map)를 감쌉니다.
// 공개판 무료 사용자는 주소로 바로 들어와도 구독 화면으로 보냅니다(허브 /insight 는 잠긴 메뉴를 보여 주므로 감싸지 않음).
// 판단은 plan.ts 하나로만 합니다 — 관리자판·회원판은 getTier() 가 "admin" 이라 늘 통과합니다.

import { Navigate } from "react-router-dom";
import { PAYWALL_PATH, usePlan } from "@/lib/plan";

const InsightGate = ({ children }: { children: React.ReactElement }) => {
  const { plus } = usePlan();
  if (!plus) return <Navigate to={PAYWALL_PATH} replace />;
  return children;
};

export default InsightGate;
