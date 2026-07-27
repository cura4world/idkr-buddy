// src/lib/bibleAudio.ts
// 인도네시아어 성경 낭독(Alkitab Suara TB) 스트리밍 재생.
// - 음원은 Cloudflare R2에 장 단위 mp3로 보관. 앱은 URL만 알면 되고 저장하지 않습니다.
// - 파일 규칙: {BASE}/{약어}/{약어}{장3자리}.mp3  (예: mzm/mzm023.mp3)
//   약어는 bible.ts의 audio 필드를 그대로 씁니다. 룻기만 대문자(RUT)이며
//   R2 키는 대소문자를 구분하므로 toLowerCase()를 태우면 안 됩니다.
// - 합성음(TTS)이 아니라 실제 낭독이므로 Gemini API 과금이 없습니다.

import { getBook } from "@/lib/bible";
import { ttsPlayer } from "@/lib/tts";

const AUDIO_BASE = "https://pub-2d9d776a8be94ef886ff6b7e2678aaf9.r2.dev/ororj7zwt6n1";

// 장 번호는 항상 3자리 (mzm023, kej001)
function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

// 해당 장의 음원 주소. 책을 찾을 수 없으면 null.
export function getChapterAudioUrl(bookId: string, chapter: number): string | null {
  const book = getBook(bookId);
  if (!book || !book.audio) return null;
  if (!(chapter >= 1 && chapter <= book.chapters)) return null;
  return AUDIO_BASE + "/" + book.audio + "/" + book.audio + pad3(chapter) + ".mp3";
}

// 재생 위치를 구분하는 키
export function audioKey(bookId: string, chapter: number): string {
  return "bible-" + bookId + "-" + chapter;
}

// 초 → m:ss
export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" + s : String(s));
}

export type BibleAudioState = "idle" | "loading" | "playing" | "paused";

interface Snapshot {
  key: string | null;
  state: BibleAudioState;
  position: number; // 현재 재생 위치(초)
  duration: number; // 전체 길이(초). 메타데이터 로드 전에는 0
  errorAt: number; // 마지막 오류 시각(ms). 값이 바뀌면 구독자가 알림을 띄웁니다
}

type Listener = (s: Snapshot) => void;

class BibleAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private snap: Snapshot = { key: null, state: "idle", position: 0, duration: 0, errorAt: 0 };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snap);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getState(): Snapshot {
    return this.snap;
  }

  private emit(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => {
      try {
        fn(this.snap);
      } catch (e) {}
    });
  }

  // 오디오 엘리먼트를 정리합니다. setState를 유발하지 않으므로 언마운트 중에도 안전합니다.
  private teardown() {
    const a = this.audio;
    this.audio = null;
    if (!a) return;
    try {
      a.pause();
    } catch (e) {}
    try {
      a.removeAttribute("src");
      a.load();
    } catch (e) {}
  }

  stop() {
    this.teardown();
    this.emit({ key: null, state: "idle", position: 0, duration: 0 });
  }

  pause() {
    if (!this.audio || this.snap.state !== "playing") return;
    try {
      this.audio.pause();
    } catch (e) {}
    this.emit({ state: "paused" });
  }

  resume() {
    if (!this.audio || this.snap.state !== "paused") return;
    // 다른 음성이 물려 있으면 먼저 정리
    try {
      ttsPlayer.stop();
    } catch (e) {}
    this.audio
      .play()
      .then(() => this.emit({ state: "playing" }))
      .catch(() => this.fail());
  }

  seek(sec: number) {
    if (!this.audio) return;
    const d = this.snap.duration;
    const t = Math.max(0, d > 0 ? Math.min(sec, d - 0.3) : sec);
    try {
      this.audio.currentTime = t;
    } catch (e) {}
    this.emit({ position: t });
  }

  private fail() {
    this.teardown();
    this.emit({ key: null, state: "idle", position: 0, duration: 0, errorAt: Date.now() });
  }

  // 같은 장이면 재생/일시정지 토글, 다른 장이면 새로 재생합니다.
  toggle(bookId: string, chapter: number) {
    const key = audioKey(bookId, chapter);
    if (this.snap.key === key) {
      if (this.snap.state === "playing") {
        this.pause();
        return;
      }
      if (this.snap.state === "paused") {
        this.resume();
        return;
      }
      if (this.snap.state === "loading") return;
    }
    this.play(bookId, chapter);
  }

  play(bookId: string, chapter: number) {
    const url = getChapterAudioUrl(bookId, chapter);
    if (!url) {
      this.emit({ errorAt: Date.now() });
      return;
    }

    // 합성음(TTS)과 동시에 나오지 않도록 먼저 정리
    try {
      ttsPlayer.stop();
    } catch (e) {}

    this.teardown();
    const key = audioKey(bookId, chapter);
    this.emit({ key, state: "loading", position: 0, duration: 0 });

    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    this.audio = a;

    const mine = () => this.audio === a;

    a.addEventListener("loadedmetadata", () => {
      if (!mine()) return;
      this.emit({ duration: isFinite(a.duration) ? a.duration : 0 });
    });
    a.addEventListener("waiting", () => {
      if (!mine() || this.snap.state === "paused") return;
      this.emit({ state: "loading" });
    });
    a.addEventListener("playing", () => {
      if (!mine()) return;
      this.emit({ state: "playing" });
    });
    a.addEventListener("timeupdate", () => {
      if (!mine() || this.snap.state === "idle") return;
      this.emit({ position: a.currentTime });
    });
    a.addEventListener("ended", () => {
      if (!mine()) return;
      this.stop();
    });
    a.addEventListener("error", () => {
      if (!mine()) return;
      this.fail();
    });

    a.play()
      .then(() => {
        if (mine()) this.emit({ state: "playing" });
      })
      .catch(() => {
        if (mine()) this.fail();
      });
  }
}

export const bibleAudioPlayer = new BibleAudioPlayer();
