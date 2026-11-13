// src/components/HiddenInPublic.tsx
// 공개판에서 막는 화면(성경·묵상·기도·설교·일대일·뉴스·기독교 이해·회원 관리)을 감쌉니다.
// 주소를 직접 쳐서 들어와도 홈으로 돌려보냅니다. 관리자판·회원판에서는 그대로 보여 줍니다.
// 판단은 스토어 앱인지(isStoreApp)로만 합니다. 스토어 앱이 아닌 곳에서 여기까지 온 사람은
// 회원키나 예전 설정이 있는 관리자판·회원판 사용자뿐입니다 — 키 없는 브라우저 방문자는
// 2026-11-14 부터 앱 대신 안내 화면을 보므로(WebGate.tsx) 이 화면들에 닿지 않습니다.
//
// 2026-11-12 사용자 요청: 공개판에서도 관리자·Special Member 에게는 기독교 메뉴를 보여 줍니다.
//   need="staff" (기본) — Special Member·관리자에게 열림 (성경·묵상·기도·일대일·뉴스·기독교 이해)
//   need="admin"        — 관리자에게만 열림 (설교·회원 관리 — 관리자판 홈에서도 설교는 관리자만)
// 등급은 plan.ts 로만 판단합니다(미리보기 APK 는 미리보기 패널의 등급).

import { Navigate } from "react-router-dom";
import { isStoreApp } from "@/lib/platform";
import { usePlan } from "@/lib/plan";

interface Props {
  children: React.ReactElement;
  need?: "staff" | "admin";
}

const HiddenInPublic = ({ children, need = "staff" }: Props) => {
  const { tier, staff } = usePlan();
  if (!isStoreApp()) return children;
  const open = need === "admin" ? tier === "admin" : staff;
  if (!open) return <Navigate to="/" replace />;
  return children;
};

export default HiddenInPublic;
