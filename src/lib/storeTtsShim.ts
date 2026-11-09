// src/lib/storeTtsShim.ts
// 스토어 앱(공개판)에는 폰 내장 음성(AndroidTTS)을 넣지 않습니다 — 품질이 낮아 앱 인상을 해칩니다.
// 그런데 단어 발음 듣기 같은 짧은 읽기는 화면 20여 곳이 window.AndroidTTS.speak(...) 를 직접 부릅니다.
// 그 화면들을 하나하나 고치는 대신, 스토어 앱에서만 같은 이름의 객체를 Gemini 음성(ttsPlayer)으로 채워 넣습니다.
//
// 주의: ttsPlayer 는 생성에 실패하면 AndroidTTS.speak 로, 멈출 때는 AndroidTTS.stop 으로 넘어갑니다.
// 그대로 두면 서로를 끝없이 부르므로 두 방향 모두 재진입을 막습니다.
// tts.ts 는 한 줄도 바꾸지 않습니다(저장소 규칙: 사용법 변경 금지).

import { ttsPlayer } from "@/lib/tts";
import { isStoreApp } from "@/lib/platform";

let speakingText = "";
let inStop = false;

const shim = {
  speak(text: string, _langCode?: string): void {
    const t = String(text || "").trim();
    if (!t) return;
    // ttsPlayer 가 실패 후 폴백으로 같은 글을 다시 넘긴 경우 → 무시 (무한 반복 방지)
    if (speakingText === t) return;
    speakingText = t;
    ttsPlayer
      .toggle("say:" + t, t)
      .catch(() => {})
      .finally(() => {
        if (speakingText === t) speakingText = "";
      });
  },
  stop(): void {
    if (inStop) return; // ttsPlayer.stop() 안에서 다시 불린 경우
    inStop = true;
    try {
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
