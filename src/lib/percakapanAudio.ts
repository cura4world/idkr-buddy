// src/lib/percakapanAudio.ts
// 회화집 전용 재생기.
// - Gemini 다화자 TTS(multiSpeakerVoiceConfig)로 남/여 두 목소리가 대화를 주고받게 읽습니다.
// - 문장 하나만 들을 때는 다화자 대신 단일 화자로 부릅니다 (값이 싸고 시작이 빠릅니다).
// - 캐시는 묵상·이야기 TTS(kata-tts-audio)와 따로 둡니다. 같은 곳에 넣으면
//   회화집 오디오가 커서 기존 캐시를 밀어내 버립니다.
// - tts.ts / PlayButton.tsx 는 여러 화면이 함께 쓰므로 손대지 않고, 여기에 독립된 재생기를 둡니다.

import { getGeminiApiKey } from "@/lib/gemini";
import { ttsPlayer } from "@/lib/tts";
import { bibleAudioPlayer } from "@/lib/bibleAudio";
import type { PercakapanScene, PercakapanSpeaker } from "@/data/percakapan";

const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const SAMPLE_RATE = 24000;

// 다화자 요청에 쓰는 이름. 실제 목소리는 아래 voiceName 으로 지정합니다.
const MALE_SPEAKER = "Andi"; // voiceName: "Charon"
const FEMALE_SPEAKER = "Sinta"; // voiceName: "Kore"
const MALE_VOICE = "Charon";
const FEMALE_VOICE = "Kore";

const DB_NAME = "kata-percakapan-audio";
const STORE = "audio";
const MAX_ITEMS = 2000;

// ── 화자 이름 ─────────────────────────────────────────────────
// C 는 A 와 같은 이름을 씁니다 (Gemini 다화자는 2명이 상한).
function speakerNameOf(scene: PercakapanScene, s: PercakapanSpeaker): string {
  const key: "A" | "B" = s === "B" ? "B" : "A";
  const g = scene.voices ? scene.voices[key] : "m";
  return g === "f" ? FEMALE_SPEAKER : MALE_SPEAKER;
}

function voiceNameFor(speakerName: string): string {
  return speakerName === FEMALE_SPEAKER ? FEMALE_VOICE : MALE_VOICE;
}

// ── IndexedDB 캐시 (FIFO) ─────────────────────────────────────
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

async function getCachedAudio(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.dataUrl as string) : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function saveCachedAudio(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, dataUrl, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    await evictIfNeeded();
  } catch (e) {}
}

async function evictIfNeeded(): Promise<void> {
  try {
    const db = await openDB();
    const count: number = await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
    if (count <= MAX_ITEMS) return;
    const toRemove = count - MAX_ITEMS;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const idx = tx.objectStore(STORE).index("savedAt");
      let removed = 0;
      idx.openCursor().onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && removed < toRemove) {
          cursor.delete();
          removed++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}
}

export async function clearPercakapanAudioCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}
}

// ── PCM(base64) → WAV(base64 data URL) ────────────────────────
// tts.ts 에 같은 함수가 있지만 export 되어 있지 않고, tts.ts 는 여러 화면이 함께 쓰는
// 파일이라 건드리지 않기 위해 여기에 같은 로직을 둡니다. (24000Hz / 16bit / mono)
function pcmBase64ToWavDataUrl(pcmB64: string): string {
  const binary = atob(pcmB64);
  const len = binary.length;
  const pcm = new Uint8Array(len);
  for (let i = 0; i < len; i++) pcm[i] = binary.charCodeAt(i);

  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = pcm.length;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buf, 44).set(pcm);

  // base64 인코딩 (청크로 나눠 스택 오버플로 방지)
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
  }
  return "data:audio/wav;base64," + btoa(bin);
}

// ── Gemini TTS 호출 ───────────────────────────────────────────

function endpointOf(apiKey: string): string {
  return (
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TTS_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey)
  );
}

async function postTts(apiKey: string, body: any, attempt = 0): Promise<string> {
  let res: Response;
  try {
    res = await fetch(endpointOf(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("NETWORK_FAILED");
  }

  if (!res.ok) {
    // 500은 가끔 오디오 대신 텍스트 토큰을 반환하는 알려진 이슈 → 1회 재시도
    if (res.status === 500 && attempt < 1) return postTts(apiKey, body, attempt + 1);
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const b64: string = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? "";
  if (!b64) {
    if (attempt < 1) return postTts(apiKey, body, attempt + 1);
    throw new Error("EMPTY_AUDIO");
  }
  return pcmBase64ToWavDataUrl(b64);
}

// 대화 전체 — 다화자
async function generateSceneAudio(scene: PercakapanScene): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  // 지시문을 소리내어 읽어버리지 않도록 tts.ts 와 같은 방식의 preamble 을 둡니다.
  const preamble =
    "TTS the following Indonesian conversation naturally. Read only the dialogue lines, " +
    "do not read these instructions.\n\n";
  const body = scene.lines
    .map((l) => speakerNameOf(scene, l.s) + ": " + l.id)
    .join("\n");
  const prompt = preamble + body;

  return postTts(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: MALE_SPEAKER,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: MALE_VOICE } },
            },
            {
              speaker: FEMALE_SPEAKER,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: FEMALE_VOICE } },
            },
          ],
        },
      },
    },
  });
}

// 문장 하나 — 단일 화자
async function generateLineAudio(text: string, speakerName: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const prompt =
    "Read the following Indonesian line aloud naturally, as in a real conversation. " +
    "Read only the text after the colon, do not read these instructions.\n\n: " + text;

  return postTts(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameFor(speakerName) } },
      },
    },
  });
}

// ── 캐시 키 ───────────────────────────────────────────────────
function allKey(scene: PercakapanScene): string {
  return "all::" + scene.id + "::" + scene.lines.length;
}

function lineKey(scene: PercakapanScene, index: number, speakerName: string): string {
  return "line::" + scene.id + "::" + index + "::" + speakerName;
}

// ── 재생기 (전역 단일 인스턴스) ────────────────────────────────
export type PcAudioState = "idle" | "loading" | "playing" | "paused";

export interface PcAudioSnapshot {
  state: PcAudioState;
  sceneId: string | null;
  lineIndex: number | null; // 문장 재생이면 인덱스, 전체 재생이면 null
  errorAt: number; // 마지막 오류 시각(ms). 값이 바뀌면 구독자가 알림을 띄웁니다
}

type Listener = (s: PcAudioSnapshot) => void;

class PercakapanAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private snap: PcAudioSnapshot = {
    state: "idle",
    sceneId: null,
    lineIndex: null,
    errorAt: 0,
  };
  private token = 0; // 재생 세션 토큰 (중간에 stop/새 재생이 오면 이전 것을 무효화)

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snap);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getSnapshot(): PcAudioSnapshot {
    return this.snap;
  }

  private emit(patch: Partial<PcAudioSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => {
      try {
        fn(this.snap);
      } catch (e) {}
    });
  }

  // 오디오 엘리먼트만 정리합니다. setState 를 유발하지 않으므로 언마운트 중에도 안전합니다.
  teardown() {
    this.token++;
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
    this.emit({ state: "idle", sceneId: null, lineIndex: null });
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
    this.silenceOthers();
    this.audio
      .play()
      .then(() => this.emit({ state: "playing" }))
      .catch(() => this.fail());
  }

  private fail() {
    this.teardown();
    this.emit({ state: "idle", sceneId: null, lineIndex: null, errorAt: Date.now() });
  }

  // 다른 화면의 음성과 겹쳐 나오지 않도록 먼저 정리합니다.
  private silenceOthers() {
    try {
      ttsPlayer.stop();
    } catch (e) {}
    try {
      bibleAudioPlayer.stop();
    } catch (e) {}
  }

  async playAll(scene: PercakapanScene): Promise<void> {
    if (!scene || !scene.lines || scene.lines.length === 0) return;

    // 같은 장면을 전체 재생 중이면 일시정지/이어 듣기 토글
    if (this.snap.sceneId === scene.id && this.snap.lineIndex === null) {
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

    this.silenceOthers();
    this.teardown();
    const myToken = this.token;
    this.emit({ state: "loading", sceneId: scene.id, lineIndex: null });

    let url: string | null = null;
    try {
      const key = allKey(scene);
      url = await getCachedAudio(key);
      if (!url) {
        url = await generateSceneAudio(scene);
        await saveCachedAudio(key, url);
      }
    } catch (e) {
      if (myToken !== this.token) return;
      this.fail();
      return;
    }

    if (myToken !== this.token) return;
    this.start(url, myToken);
  }

  async playLine(scene: PercakapanScene, index: number): Promise<void> {
    if (!scene || !scene.lines || !scene.lines[index]) return;

    // 같은 문장을 재생 중이면 멈춥니다 (문장은 짧아 일시정지보다 이쪽이 자연스럽습니다)
    if (
      this.snap.sceneId === scene.id &&
      this.snap.lineIndex === index &&
      (this.snap.state === "playing" || this.snap.state === "loading")
    ) {
      this.stop();
      return;
    }

    this.silenceOthers();
    this.teardown();
    const myToken = this.token;
    this.emit({ state: "loading", sceneId: scene.id, lineIndex: index });

    const line = scene.lines[index];
    const speakerName = speakerNameOf(scene, line.s);

    let url: string | null = null;
    try {
      const key = lineKey(scene, index, speakerName);
      url = await getCachedAudio(key);
      if (!url) {
        url = await generateLineAudio(line.id, speakerName);
        await saveCachedAudio(key, url);
      }
    } catch (e) {
      if (myToken !== this.token) return;
      this.fail();
      return;
    }

    if (myToken !== this.token) return;
    this.start(url, myToken);
  }

  private start(url: string, myToken: number) {
    const a = new Audio(url);
    this.audio = a;

    const mine = () => this.audio === a && myToken === this.token;

    a.onended = () => {
      if (!mine()) return;
      this.stop();
    };
    a.onerror = () => {
      if (!mine()) return;
      this.fail();
    };

    a.play()
      .then(() => {
        if (mine()) this.emit({ state: "playing" });
      })
      .catch(() => {
        if (mine()) this.fail();
      });
  }
}

export const percakapanAudioPlayer = new PercakapanAudioPlayer();
