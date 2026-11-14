// 스토어 앱에서 Gemini 음성 만들기가 실패했을 때 (2026-11-14 출시 전 점검 C-08).
// tts.ts 는 실패하면 window.AndroidTTS.speak(글) 로 넘기는데, 스토어 앱에서는 그 객체가 다시 Gemini 음성입니다.
// 같은 글을 다시 요청하지 않고, 재생 상태를 되돌린 뒤 한 번 알리는지 봅니다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastSpy = vi.fn();
vi.mock("sonner", () => ({ toast: (...a: unknown[]) => toastSpy(...a) }));

type Shim = { speak: (t: string, lang?: string) => void; stop: () => void };

async function load() {
  vi.resetModules();
  (window as unknown as { KataStore?: unknown }).KataStore = { version: () => "1.0.1" };
  delete (window as unknown as { AndroidTTS?: unknown }).AndroidTTS;
  const tts = await import("@/lib/tts");
  const shimMod = await import("@/lib/storeTtsShim");
  shimMod.installStoreTtsShim();
  const shim = (window as unknown as { AndroidTTS: Shim }).AndroidTTS;
  return { ttsPlayer: tts.ttsPlayer, shim };
}

describe("스토어 앱의 음성 실패 처리", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastSpy.mockClear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { KataStore?: unknown }).KataStore;
    delete (window as unknown as { AndroidTTS?: unknown }).AndroidTTS;
  });

  it("실패해 넘어온 호출은 다시 요청하지 않고, 상태를 되돌리고 한 번만 알린다", async () => {
    const { ttsPlayer, shim } = await load();
    const toggle = vi.spyOn(ttsPlayer, "toggle");
    // tts.ts 가 폴백 직전에 만드는 상태를 그대로 만듭니다
    (ttsPlayer as unknown as { emit: (p: unknown) => void }).emit({ state: "playing", key: "story:1", usedFallback: true });

    shim.speak("Pada suatu hari, seorang anak kecil pergi ke pasar bersama ibunya.");
    shim.speak("Pada suatu hari, seorang anak kecil pergi ke pasar bersama ibunya.");

    expect(toggle).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(String(toastSpy.mock.calls[0][0])).toContain("음성을 불러오지 못했습니다");
    vi.advanceTimersByTime(10);
    expect(ttsPlayer.getState().state).toBe("idle");
  });

  it("평소의 문장 듣기는 예전처럼 Gemini 음성으로 간다", async () => {
    const { ttsPlayer, shim } = await load();
    const toggle = vi.spyOn(ttsPlayer, "toggle").mockResolvedValue(undefined as never);
    shim.speak("Saya mau makan nasi goreng.");
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle.mock.calls[0][0]).toBe("say:Saya mau makan nasi goreng.");
    expect(toastSpy).not.toHaveBeenCalled();
  });
});
