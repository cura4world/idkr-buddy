// src/components/HiddenInPublic.tsx
// 공개판에서 막는 화면(성경·묵상·기도·설교·일대일·뉴스·기독교 이해·회원 관리)을 감쌉니다.
// 주소를 직접 쳐서 들어와도 홈으로 돌려보냅니다. 관리자판·회원판에서는 그대로 보여 줍니다.
// 판단은 스토어 앱인지(isStoreApp)로만 합니다. 브라우저로 여는 사람(키 없는 공개 사용자)의
// 화면은 예전과 같아야 하므로 getEdition()==="public" 으로 막지 않습니다(2026-11-10 검토).

import { Navigate } from "react-router-dom";
import { isStoreApp } from "@/lib/platform";

const HiddenInPublic = ({ children }: { children: React.ReactElement }) => {
  if (isStoreApp()) return <Navigate to="/" replace />;
  return children;
};

export default HiddenInPublic;
