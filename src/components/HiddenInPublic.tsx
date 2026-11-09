// src/components/HiddenInPublic.tsx
// 공개판에서 막는 화면(성경·묵상·기도·설교·일대일·뉴스·기독교 이해·회원 관리)을 감쌉니다.
// 주소를 직접 쳐서 들어와도 홈으로 돌려보냅니다. 관리자판·회원판에서는 그대로 보여 줍니다.

import { Navigate } from "react-router-dom";
import { getEdition } from "@/lib/access";

const HiddenInPublic = ({ children }: { children: React.ReactElement }) => {
  if (getEdition() === "public") return <Navigate to="/" replace />;
  return children;
};

export default HiddenInPublic;
