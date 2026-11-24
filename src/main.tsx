import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./fonts";
import "./index.css";
import { applyFontScale } from "./lib/fontScale";
import { startUsageTimer } from "./lib/usageTimer";
import { isPreview } from "./lib/preview";
import { cleanupRetiredMedaliKeys } from "./lib/medaliSync";

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

// 생활 정보(누를 때마다 생성) → 오늘의 카드로 바뀜(2026-11-17)에 따른 1회성 정리.
// 예전에 가져와 둔 생활 정보 저장소(kata-tips)를 지웁니다 — Arga·아내 앱에 쌓인 목록을 정리하기로 함.
// 위 사전 이미지 정리와 같은 방식: 성공했을 때만 표시를 남기고, 실패하면 다음 실행에서 다시 시도합니다.
try {
  if (localStorage.getItem("kata-tips-purged") !== "1") {
    const tipsReq = indexedDB.deleteDatabase("kata-tips");
    tipsReq.onsuccess = () => {
      try {
        localStorage.setItem("kata-tips-purged", "1");
      } catch (e) {}
    };
  }
} catch (e) {
  // IndexedDB 미지원 환경에서는 무시
}

// 훈장 두 사람 비교를 뺌(2026-11-24)에 따라 쓰지 않게 된 저장 키(상대 요약 사본·요약 올린 시각)를 지웁니다.
// 키 두 개를 지우는 것뿐이라 표시 없이 매번 돌립니다.
cleanupRetiredMedaliKeys();

// 앱 자동 업데이트: 앱이 포그라운드로 돌아올 때마다 새 버전이 있는지 확인하고,
// 서비스워커가 새 버전으로 교체되면 "화면이 가려져 있을 때만" 새로고침합니다(출시 전 점검 C-04).
//   - 처음 설치(이 페이지를 불러올 때 서비스워커가 없던 경우)의 첫 교체는 새 버전이 아니므로 새로고침하지 않습니다.
//     (로그인 화면이 뜬 몇 초 뒤 새로고침되어 Google 계정 창의 결과가 버려지던 것)
//   - 쓰는 중(화면이 보이는 중)에는 새로고침하지 않습니다. 다음에 화면이 가려질 때 새로고침하고,
//     끝내 가려지지 않으면 다음 실행 때 새 버전이 뜹니다(새 서비스워커가 이미 자리를 잡았으므로).
// 미리보기 APK 는 서비스워커를 쓰지 않습니다(vite.config.ts 에서 등록 스크립트도 빠짐).
// 브라우저에서 미리보기를 띄웠을 때 예전에 등록된 것이 남아 있으면 풀어 둡니다.
if (isPreview()) {
  try {
    navigator.serviceWorker
      ?.getRegistrations()
      .then((regs) => regs.forEach((r) => { r.unregister().catch(() => {}); }))
      .catch(() => {});
  } catch (e) {
    // 무시
  }
} else if ("serviceWorker" in navigator) {
  let refreshed = false;
  // 새 버전이 자리를 잡았고, 화면이 가려지면 새로고침하려고 기다리는 중인가
  let updateWaiting = false;
  const reloadOnce = () => {
    if (refreshed) return;
    refreshed = true;
    window.location.reload();
  };
  try {
    // 이 페이지를 불러온 시점에 서비스워커가 이미 이 페이지를 잡고 있었는가.
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        // 처음 설치: 서비스워커가 이 페이지를 처음 잡은 것 — 새 버전이 아닙니다.
        hadController = true;
        return;
      }
      if (document.visibilityState === "hidden") reloadOnce();
      else updateWaiting = true;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        if (updateWaiting) reloadOnce();
        return;
      }
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
