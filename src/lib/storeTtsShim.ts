// src/lib/storeTtsShim.ts
// 단어 발음 듣기 같은 짧은 읽기는 화면 20여 곳이 window.AndroidTTS.speak(...) 를 직접 부릅니다.
// 그 화면들을 하나하나 고치는 대신, 스토어 앱에서만 같은 이름의 객체를 채워 넣습니다.
//  - 인도네시아어 낱말(짧고 한글이 없음)은 폰 내장 음성(KataNativeTTS, nativeTts.ts) — 2026-11 사용자 요청
//  - 그 밖의 글(한국어·문장)은 Gemini 음성(ttsPlayer)
//
// 주의: ttsPlayer 는 생성에 실패하면 AndroidTTS.speak 로, 멈출 때는 AndroidTTS.stop 으로 넘어갑니다.
// 그대로 두면 서로를 끝없이 부르므로 두 방향 모두 재진입을 막습니다.
// tts.ts 는 기존 사용법을 바꾸지 않습니다(저장소 규칙). prefetch·playOnce 는 추가만 했습니다.

import { ttsPlayer } from "@/lib/tts";
import { isStoreApp } from "@/lib/platform";
import { hasNativeTts, isWordLike, speakNative, stopNative } from "@/lib/nativeTts";
import { quotaNoticeWithin } from "@/lib/aiProxy";
import { toast } from "sonner";

let speakingText = "";
let inStop = false;
let failShownAt = 0;

/**
 * tts.ts 가 Gemini 음성 만들기에 실패해 "폰 음성으로 대신 읽기"로 넘긴 호출인가.
 * tts.ts 는 폴백 직전에 상태를 { playing, usedFallback: true } 로 바꾸므로 그것으로 알아봅니다(사용법은 읽기만).
 */
function isFallbackFromFailure(): boolean {
  try {
    const s = ttsPlayer.getState();
    return s.state === "playing" && s.usedFallback === true;
  } catch (e) {
    return false;
  }
}

/**
 * 스토어 앱에는 대신 읽어 줄 폰 음성이 없습니다(이 객체가 곧 Gemini 음성). 예전에는 실패한 글 전체를
 * 낱말 발음 이름으로 한 번 더 요청하고, 그것도 실패하면 아무 안내 없이 끝났습니다(출시 전 점검 C-08).
 * 다시 요청하지 않고, 재생 상태를 되돌린 뒤 한 번 알립니다. 한도 안내가 방금 떴으면 겹쳐 띄우지 않습니다.
 */
function notifyFailed(): void {
  setTimeout(() => {
    try { ttsPlayer.stop(); } catch (e) {}
  }, 0);
  const now = Date.now();
  if (now - failShownAt < 4000 || quotaNoticeWithin(4000)) return;
  failShownAt = now;
  try { toast("음성을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요"); } catch (e) {}
}

function speakGemini(t: string): void {
  // ttsPlayer 가 실패 후 폴백으로 같은 글을 다시 넘긴 경우 → 무시 (무한 반복 방지)
  if (speakingText === t) return;
  speakingText = t;
  ttsPlayer
    .toggle("say:" + t, t)
    .catch(() => {})
    .finally(() => {
      if (speakingText === t) speakingText = "";
    });
}

const shim = {
  speak(text: string, langCode?: string): void {
    const t = String(text || "").trim();
    if (!t) return;
    // 음성 만들기가 실패해 넘어온 호출이면 다시 Gemini 로 보내지 않습니다(C-08)
    if (isFallbackFromFailure()) {
      notifyFailed();
      return;
    }
    // 2026-11-11 사용자 요청: 인도네시아어 "낱말"만 폰 내장 음성(예전 관리자판 목소리, 누르면 바로).
    // 문장·예문·한국어는 그대로 Gemini 음성. 폰 음성을 못 쓰면(통로 없음·음성 없음) Gemini 로 대신합니다.
    if (langCode !== "ko-KR" && isWordLike(t) && hasNativeTts()) {
      try { ttsPlayer.stop(); } catch (e) {}
      speakNative(t, "id-ID").then((ok) => {
        if (!ok) speakGemini(t);
      });
      return;
    }
    speakGemini(t);
  },
  stop(): void {
    if (inStop) return; // ttsPlayer.stop() 안에서 다시 불린 경우
    inStop = true;
    try {
      stopNative();
      ttsPlayer.stop();
    } catch (e) {
      // 무시
    } finally {
      inStop = false;
      speakingText = "";
    }
  },
  isReady(): boolean {
    return true;
  },
};

/** 스토어 앱이면 window.AndroidTTS 자리에 Gemini 음성 객체를 넣습니다. 앱 시작 시 한 번. */
export function installStoreTtsShim(): void {
  if (!isStoreApp()) return;
  try {
    const w = window as unknown as { AndroidTTS?: unknown };
    if (w.AndroidTTS) return; // 네이티브 통로가 있으면(스토어 앱에는 없음) 그대로 둡니다
    w.AndroidTTS = shim;
  } catch (e) {
    // 무시 — 발음 듣기만 안 될 뿐 앱은 동작합니다
  }
}
