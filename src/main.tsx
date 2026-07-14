import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyFontScale } from "./lib/fontScale";

// 저장된 글자 크기 배율을 앱 시작 시 적용
applyFontScale();

// 앱 자동 업데이트: 서비스워커가 새 버전으로 교체되면 즉시 새로고침하고,
// 앱이 포그라운드로 돌아올 때마다 새 버전이 있는지 확인합니다.
if ("serviceWorker" in navigator) {
  let refreshed = false;
  try {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker
          .getRegistration()
          .then((reg) => reg?.update())
          .catch(() => {});
      }
    });
  } catch (e) {
    // 서비스워커 미지원 환경에서는 무시
  }
}

createRoot(document.getElementById("root")!).render(<App />);
