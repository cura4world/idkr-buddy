// src/lib/nativeTts.ts
// 폰 내장 음성(KataNativeTTS) — 공개판 미리보기·스토어 APK 의 낱말 발음 전용 통로.
//
// 2026-11-11 사용자 요청: "단어만 폰 내장 음성으로(예전 관리자판과 같은 목소리, 누르면 바로)".
// 문장·예문·한국어 뜻은 그대로 Gemini 음성입니다. 그래서 네이티브는 window.AndroidTTS 가 아니라
// 따로 window.KataNativeTTS 로 들어옵니다(AndroidTTS 이름이면 모든 화면의 모든 읽기가 폰 음성이 됨).
//
// 누가 쓰나
//   - storeTtsShim: 화면 20여 곳의 AndroidTTS.speak(...) 중 "낱말"만 여기로 보냅니다.
//   - StudyMode(카드): 인도네시아어 낱말을 읽고, 다 읽을 때까지 기다린 뒤 뒷면으로 넘어갑니다.
//
// 네이티브가 다 읽으면 window.__kataNativeTtsDone('번호') 를 부릅니다(.github/workflows/build-*.yml).

interface NativeTts {
  isReady?: () => boolean;
  speak?: (text: string, lang: string, id: string) => boolean;
  stop?: () => void;
}

const waiting = new Map<string, () => void>();
let seq = 0;
let hooked = false;

function bridge(): NativeTts | null {
  try {
    const w = window as unknown as { KataNativeTTS?: NativeTts };
    return w.KataNativeTTS || null;
  } catch (e) {
    return null;
  }
}

function hook(): void {
  if (hooked) return;
  hooked = true;
  try {
    (window as unknown as { __kataNativeTtsDone?: (id: string) => void }).__kataNativeTtsDone = (id: string) => {
      const f = waiting.get(String(id || ""));
      if (!f) return;
      waiting.delete(String(id || ""));
      try { f(); } catch (e) {}
    };
  } catch (e) {}
}

/** 폰 내장 음성을 쓸 수 있는가 (APK 에 통로가 있고 음성 엔진이 준비됨) */
export function hasNativeTts(): boolean {
  const b = bridge();
  if (!b || typeof b.speak !== "function") return false;
  try {
    return typeof b.isReady === "function" ? !!b.isReady() : true;
  } catch (e) {
    return false;
  }
}

/**
 * "낱말"인가 — 문장이 아닌 짧은 표제어(낱말·짧은 구). 이것만 폰 음성으로 읽습니다.
 * 기준: 한글이 없고, 낱말 3개 이하, 40자 이하, 문장 끝 부호(. ! ?)가 없음.
 */
export function isWordLike(text: string): boolean {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  if (new RegExp("[\\uAC00-\\uD7A3]").test(t)) return false;
  if (new RegExp("[.!?…]\\s*$").test(t)) return false;
  const n = t.split(new RegExp("\\s+")).filter(Boolean).length;
  return n >= 1 && n <= 3;
}

/**
 * 폰 내장 음성으로 읽습니다. 다 읽으면(또는 다른 소리로 끊기면) 끝나는 Promise.
 * 시작하지 못하면 false 로 끝납니다 — 부르는 쪽이 Gemini 음성으로 대신합니다.
 * 네이티브 알림이 오지 않는 경우를 위해 글 길이에 맞춘 넉넉한 마감도 둡니다.
 */
export function speakNative(text: string, lang: "id-ID" | "ko-KR" = "id-ID"): Promise<boolean> {
  const b = bridge();
  const t = String(text || "").trim();
  if (!b || typeof b.speak !== "function" || !t) return Promise.resolve(false);
  hook();
  // 앞서 기다리던 읽기는 새 읽기가 끊으므로 바로 끝난 것으로 칩니다
  waiting.forEach((f) => { try { f(); } catch (e) {} });
  waiting.clear();
  const id = "k" + Date.now().toString(36) + "_" + (++seq);
  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiting.delete(id);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true), Math.min(15000, 2500 + t.length * 180));
    waiting.set(id, () => finish(true));
    let started = false;
    try {
      started = !!b.speak!(t, lang, id);
    } catch (e) {
      started = false;
    }
    if (!started) finish(false);
  });
}

/** 폰 내장 음성 멈춤 */
export function stopNative(): void {
  const b = bridge();
  try { b?.stop?.(); } catch (e) {}
  waiting.forEach((f) => { try { f(); } catch (e) {} });
  waiting.clear();
}
