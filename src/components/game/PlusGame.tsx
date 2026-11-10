// src/components/game/PlusGame.tsx
// Plus 전용 게임 화면을 감쌉니다. 무료 사용자가 주소로 바로 들어오면 게임방으로 돌려보냅니다
// (게임방에서 잠긴 줄을 누르면 구독 화면으로 이어집니다).
// 오늘의 단어 퍼즐은 무료에게도 열려 있으므로 감싸지 않습니다.
// 관리자판·회원판은 getTier() 가 "admin" 이라 언제나 그대로 보입니다.

import { Navigate } from "react-router-dom";
import { usePlan } from "@/lib/plan";

const PlusGame = ({ children }: { children: React.ReactElement }) => {
  const { plus } = usePlan();
  if (!plus) return <Navigate to="/permainan" replace />;
  return children;
};

export default PlusGame;
