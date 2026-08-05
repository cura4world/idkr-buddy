// src/lib/usageTimer.ts
// 앱을 켜 둔 시간을 재서 Medali 일일 로그에 흘려보냅니다.
//
// 화면이 실제로 보이는 동안만 잽니다 — 백그라운드로 내려가거나 화면이 꺼지면 멈춥니다.
// 무엇을 했는지는 따지지 않습니다. 점수(Api)와는 완전히 별개라 주일에도 쌓입니다.
//
// 훈장 팝업(MedaliSheet)의 요일 막대 위 숫자가 여기서 쌓인 값입니다.

import { medaliEngine } from "./medali";

const TICK_MS = 60 * 1000;        // 1분마다 흘려보냅니다 (앱이 갑자기 죽어도 최대 1분만 손실)
const MAX_TICK_MS = 90 * 1000;    // 이보다 큰 간격은 절전·시간 점프로 보고 버립니다

let started = false;              // 두 번 불려도 리스너·interval이 중복 등록되지 않도록
let lastTick: number | null = null;

// 마지막 시점부터 지금까지를 적립하고 기준 시각을 현재로 옮깁니다.
function flush(): void {
  try {
    if (lastTick === null) return;
    const now = Date.now();
    const delta = now - lastTick;
    lastTick = now;
    // 범위를 벗어난 tick은 그 값만 버리고 기준 시각은 이미 갱신했습니다
    if (delta > 0 && delta <= MAX_TICK_MS) {
      void medaliEngine.addUsageMs(delta);
    }
  } catch {}
}

function onVisibility(): void {
  try {
    if (document.visibilityState === "visible") {
      // 다시 보이기 시작한 지금부터 새로 잽니다 (숨어 있던 시간은 세지 않습니다)
      lastTick = Date.now();
    } else {
      flush();
      lastTick = null;
    }
  } catch {}
}

export function startUsageTimer(): void {
  try {
    if (started) return;
    started = true;

    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      lastTick = Date.now();
    }

    window.setInterval(flush, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    // 앱을 닫거나 다른 페이지로 떠날 때 마지막 조각을 저장합니다
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
  } catch {}
}
