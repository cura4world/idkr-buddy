// src/components/ErrorBoundary.tsx
// 화면 한 곳에서 난 오류가 앱 전체를 흰 화면으로 만들지 않게 받는 장치 (2026-11-14 출시 전 점검 C-03).
// 웹뷰에는 새로고침 단추가 없어, 이것이 없으면 사용자는 앱을 강제로 닫아야 했습니다.
//
//   · 안내 "문제가 생겼습니다. 다시 열어 주세요." + "다시 열기"(새로고침)
//   · 새로고침 직후 또 같은 화면이면(15초 안) 그 주소 자체가 문제일 수 있어 다음에는 첫 화면으로 엽니다
//   · 오류 내용은 미리보기 빌드에서만 작게 보입니다(정식 앱에는 영어 오류 문구를 보이지 않음)
// 이 파일은 색·글꼴을 인라인으로 씁니다 — 스타일이나 다른 부품이 깨진 상황에서도 그려져야 하기 때문입니다.

import { Component, ErrorInfo, ReactNode } from "react";
import { isPreviewBuild } from "@/lib/plan";

const RELOADED_KEY = "kata-error-reloaded-at";
const RELOAD_LOOP_MS = 15000;
const HOME_PATH = "/idkr-buddy/";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  detail: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, detail: "" };

  static getDerivedStateFromError(error: unknown): State {
    let detail = "";
    try {
      const e = error as { name?: string; message?: string };
      detail = String((e && e.name) || "Error") + ": " + String((e && e.message) || "");
    } catch (e) {}
    return { failed: true, detail: detail.slice(0, 200) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    try {
      console.error("[kata] 화면 오류", error, info && info.componentStack);
    } catch (e) {}
  }

  reopen = (): void => {
    let again = false;
    try {
      const last = Number(sessionStorage.getItem(RELOADED_KEY) || 0);
      again = last > 0 && Date.now() - last < RELOAD_LOOP_MS;
      sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
    } catch (e) {}
    try {
      if (again) window.location.replace(HOME_PATH);
      else window.location.reload();
    } catch (e) {}
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          backgroundColor: "#F0F2F4",
          color: "#1D1F1E",
          textAlign: "center",
          fontFamily: "'Pretendard', 'Gowun Dodum', sans-serif",
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>문제가 생겼습니다.</p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#646C72" }}>다시 열어 주세요.</p>
        <button
          type="button"
          onClick={this.reopen}
          style={{
            marginTop: 24,
            height: 48,
            padding: "0 28px",
            borderRadius: 24,
            border: "none",
            backgroundColor: "#2C6D63",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          다시 열기
        </button>
        {isPreviewBuild() && this.state.detail ? (
          <p style={{ margin: "20px 0 0", fontSize: 11, color: "#9AA1A6", wordBreak: "break-all" }}>{this.state.detail}</p>
        ) : null}
      </div>
    );
  }
}
