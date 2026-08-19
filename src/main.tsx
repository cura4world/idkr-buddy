import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyFontScale } from "./lib/fontScale";
import { startUsageTimer } from "./lib/usageTimer";

// 저장된 글자 크기 배율을 앱 시작 시 적용
applyFontScale();

// 앱을 켜 둔 시간을 재서 훈장 팝업 그래프에 보여줍니다 (화면이 보이는 동안만).
startUsageTimer();

// 사전 이미지 기능 제거(2026-08)에 따른 1회성 정리.
// 예전 버전에서 만들어 둔 이미지 저장소(kata-dict-images)를 지워 폰 용량을 돌려줍니다.
// 두 기기 모두에서 한 번씩 실행된 것을 확인하면 이 블록은 걷어내도 됩니다.
try {
  if (localStorage.getItem("kata-dict-images-purged") !== "1") {
    const purgeReq = indexedDB.deleteDatabase("kata-dict-images");
    // 성공했을 때만 표시를 남깁니다. 실패하면 다음 실행에서 다시 시도합니다.
    purgeReq.onsuccess = () => {
      try {
        localStorage.setItem("kata-dict-images-purged", "1");
      } catch (e) {}
    };
  }
} catch (e) {
  // IndexedDB 미지원 환경에서는 무시
}

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
