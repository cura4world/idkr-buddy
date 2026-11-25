// src/lib/usageTimer.ts
// 앱을 쓴 시간을 재서 Medali 일일 로그에 흘려보냅니다.
//
// 화면이 실제로 보이는 동안만 잽니다 — 백그라운드로 내려가거나 화면이 꺼지면 멈춥니다.
// 2026-11-25(Arga 승인 ⓪): 손을 3분 넘게 안 대면 그 뒤는 세지 않습니다. 앱 안에서 음성이 나오는 동안은 손을 안 대도 셉니다.
//   판단은 순수 함수 countableUsageMs(lib/usageIdle.ts) 한 곳에서. 이미 쌓인 기록은 건드리지 않습니다.
//   마지막 활동 시각은 메모리 변수로만 둡니다(새 저장 키 없음 — localWipe 목록과 무관).
// 무엇을 했는지는 따지지 않습니다. 점수(Api)와는 완전히 별개입니다.
//
// 훈장 팝업(MedaliSheet)의 요일 막대 위 숫자·내 정보 공부 시간 그래프가 여기서 쌓인 값입니다.

import { medaliEngine } from "./medali";
import { countableUsageMs } from "./usageIdle";
import { ttsPlayer } from "./tts";
import { bibleAudioPlayer } from "./bibleAudio";
import { percakapanAudioPlayer } from "./percakapanAudio";

const TICK_MS = 60 * 1000;        // 1분마다 흘려보냅니다 (앱이 갑자기 죽어도 최대 1분만 손실)
const AUDIO_POLL_MS = 15 * 1000;  // 음성이 나오는지 이만큼마다 확인 — 음성이 끝난 뒤 3분 계산의 기준이 됩니다
const INPUT_EVENTS = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"];

let started = false;              // 두 번 불려도 리스너·interval이 중복 등록되지 않도록
let lastTick: number | null = null;
let lastActivity = 0;             // 마지막 손 입력 또는 음성 재생이 확인된 시각

function markActivity(): void {
  lastActivity = Date.now();
}

/** 앱 안에서 음성이 나오는가 — 각 재생기의 상태를 읽기만 합니다(불러오는 중도 들으려는 것이라 셈) */
function audioPlaying(): boolean {
  const on = (s: string | null | undefined) => s === "playing" || s === "loading";
  try { if (on(ttsPlayer.getState().state)) return true; } catch {}
  try { if (on(bibleAudioPlayer.getState().state)) return true; } catch {}
  try { if (on(percakapanAudioPlayer.getSnapshot().state)) return true; } catch {}
  try {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (synth?.speaking) return true;
  } catch {}
  return false;
}

function pollAudio(): void {
  try { if (audioPlaying()) markActivity(); } catch {}
}

// 마지막 시점부터 지금까지 가운데 셀 몫을 적립하고 기준 시각을 현재로 옮깁니다.
function flush(): void {
  try {
    if (lastTick === null) return;
    const now = Date.now();
    const audioNow = audioPlaying();
    if (audioNow) lastActivity = now;
    const ms = countableUsageMs({
      from: lastTick,
      to: now,
      lastActivity,
      audioNow,
      visible: typeof document === "undefined" || document.visibilityState === "visible",
    });
    lastTick = now;
    if (ms > 0) void medaliEngine.addUsageMs(ms);
  } catch {}
}

function onVisibility(): void {
  try {
    if (document.visibilityState === "visible") {
      // 다시 보이기 시작한 지금부터 새로 잽니다 (숨어 있던 시간은 세지 않습니다). 앱을 연 것도 활동입니다.
      lastTick = Date.now();
      markActivity();
    } else {
      // 숨기 직전까지의 몫은 보이던 동안이므로 보이는 것으로 계산합니다
      if (lastTick !== null) {
        const now = Date.now();
        const audioNow = audioPlaying();
        if (audioNow) lastActivity = now;
        const ms = countableUsageMs({ from: lastTick, to: now, lastActivity, audioNow, visible: true });
        if (ms > 0) void medaliEngine.addUsageMs(ms);
      }
      lastTick = null;
    }
  } catch {}
}

export function startUsageTimer(): void {
  try {
    if (started) return;
    started = true;

    markActivity();
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      lastTick = Date.now();
    }

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    INPUT_EVENTS.forEach((ev) => window.addEventListener(ev, markActivity, opts));
    window.setInterval(flush, TICK_MS);
    window.setInterval(pollAudio, AUDIO_POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    // 앱을 닫거나 다른 페이지로 떠날 때 마지막 조각을 저장합니다
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
  } catch {}
}
