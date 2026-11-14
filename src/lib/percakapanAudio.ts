// src/lib/percakapanAudio.ts
// 회화집 전용 재생기.
// - Gemini 다화자 TTS(multiSpeakerVoiceConfig)로 남/여 두 목소리가 대화를 주고받게 읽습니다.
// - 문장 하나만 들을 때는 다화자 대신 단일 화자로 부릅니다 (값이 싸고 시작이 빠릅니다).
// - 캐시는 묵상·이야기 TTS(kata-tts-audio)와 따로 둡니다. 같은 곳에 넣으면
//   회화집 오디오가 커서 기존 캐시를 밀어내 버립니다.
// - tts.ts / PlayButton.tsx 는 여러 화면이 함께 쓰므로 손대지 않고, 여기에 독립된 재생기를 둡니다.

import { geminiTarget, handleQuotaResponse, publicProxyError, AiKind } from "@/lib/aiProxy";
import { getGeminiApiKey } from "@/lib/gemini";
import { hasInvalidKeyReason } from "@/lib/geminiText";
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
// 음성 요청 하나의 마감(본문을 다 받을 때까지). tts.ts 의 TTS_TIMEOUT_MS 와 같은 값입니다.
const TTS_TIMEOUT_MS = 90000;

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
      tx.onabort = () => resolve(); // 저장공간 초과는 abort 로 옵니다 — 받지 않으면 await 가 끝나지 않습니다
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
      tx.onabort = () => resolve(); // 저장공간 초과는 abort 로 옵니다 — 받지 않으면 await 가 끝나지 않습니다
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
      tx.onabort = () => resolve(); // 저장공간 초과는 abort 로 옵니다 — 받지 않으면 await 가 끝나지 않습니다
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

function isQuotaError(e: unknown): boolean {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  return m.indexOf("QUOTA") === 0;
}

// kind: 공개판 서버가 셀 기능 이름.
//   내가 만든 회화 전체 듣기 → longread (Plus 하루·한 달 한도)
//   기본 회화집 전체 듣기, 문장 하나 듣기 → shared-audio (Plus 는 한도에 안 셈, 무료는 잠김)
async function postTts(apiKey: string, body: any, attempt = 0, kind: AiKind = "shared-audio"): Promise<string> {
  // 내 키가 있으면 직접, 없고 회원키가 있으면 Worker 를 거칩니다(키는 서버에만).
  const target = geminiTarget(TTS_MODEL, apiKey, kind);
  if (!target) throw new Error("NO_API_KEY");

  // 응답이 안 오면 "준비 중"이 끝나지 않으므로 마감을 겁니다(tts.ts 와 같은 방식).
  // 본문(res.json)을 다 읽을 때까지 유지합니다 — 큰 음성은 본문을 받는 데도 시간이 걸립니다.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch (e) {}
  }, TTS_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
    }

    // 하루 음성 한도를 넘으면 안내를 띄우고 재시도하지 않습니다.
    if (await handleQuotaResponse(res, target.viaProxy)) throw new Error("QUOTA_TTS");
    // 공개판 서버의 401(세션 만료 → 로그인 화면)·403(허용 안 됨)은 키 오류가 아닙니다.
    const pubErr = publicProxyError(res, target);
    if (pubErr) throw new Error(pubErr);

    if (!res.ok) {
      // 500은 가끔 오디오 대신 텍스트 토큰을 반환하는 알려진 이슈 → 1회 재시도
      if (res.status === 500 && attempt < 1) return await postTts(apiKey, body, attempt + 1, kind);
      if (res.status === 403) throw new Error("INVALID_API_KEY");
      if (res.status === 400) {
        // 400 을 통째로 키 오류로 보면 오진입니다(DECISIONS 5장). 구글이 상세 이유 API_KEY_INVALID 를
        // 준 경우(내 키로 직접 부를 때)만 키 오류이고, 그 밖의 400 은 요청 형식 문제입니다.
        if (!target.viaProxy && (await hasInvalidKeyReason(res))) throw new Error("INVALID_API_KEY");
        throw new Error("BAD_REQUEST");
      }
      if (res.status === 429) throw new Error("RATE_LIMIT");
      throw new Error("REQUEST_FAILED_" + res.status);
    }

    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
    }
    const b64: string = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? "";
    if (!b64) {
      if (attempt < 1) return await postTts(apiKey, body, attempt + 1, kind);
      throw new Error("EMPTY_AUDIO");
    }
    return pcmBase64ToWavDataUrl(b64);
  } finally {
    clearTimeout(timer);
  }
}

// 대화 전체 — 다화자
async function generateSceneAudio(scene: PercakapanScene): Promise<string> {
  const apiKey = getGeminiApiKey(); // 비어 있으면 회원키로 Worker 를 거칩니다

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
  }, 0, scene.custom ? "longread" : "shared-audio");
}

// 문장 하나 — 단일 화자
async function generateLineAudio(text: string, speakerName: string): Promise<string> {
  const apiKey = getGeminiApiKey(); // 비어 있으면 회원키로 Worker 를 거칩니다

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
  }, 0, "shared-audio");
}

// ── 캐시 키 ───────────────────────────────────────────────────
// 기본 장면의 인도네시아어 대사를 고치면 그 장면에 rev 를 올립니다.
// rev 가 없는 장면은 예전과 같은 키라 이미 받아 둔 소리를 그대로 씁니다.
function revPart(scene: PercakapanScene): string {
  return scene.rev ? "::r" + scene.rev : "";
}

function allKey(scene: PercakapanScene): string {
  return "all::" + scene.id + revPart(scene) + "::" + scene.lines.length;
}

function lineKey(scene: PercakapanScene, index: number, speakerName: string): string {
  return "line::" + scene.id + revPart(scene) + "::" + index + "::" + speakerName;
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

  /**
   * 지금 소리의 재생 위치와 길이(초). 소리가 없거나 길이를 아직 모르면 null.
   * 전체 듣기는 파일 하나라 몇 번째 줄인지 알 수 없으므로, 읽기 화면이 이 값으로 줄을 짐작합니다.
   * (읽기 전용 — 재생 상태는 바꾸지 않습니다)
   */
  progress(): { time: number; duration: number } | null {
    const a = this.audio;
    if (!a) return null;
    const d = a.duration;
    if (!isFinite(d) || d <= 0) return null;
    return { time: a.currentTime || 0, duration: d };
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

  // 캐시에 있으면 그것을, 없으면 만들어 캐시에 담고 돌려줍니다.
  // 같은 소리를 만드는 중에 또 부르면(준비 중 취소 → 곧바로 다시 누름) 새로 요청하지 않고
  // 먼저 보낸 요청을 함께 기다립니다 — 요청이 두 번 나가 한도가 두 칸 깎이지 않게 합니다.
  private inflight = new Map<string, Promise<string>>();

  private audioFor(key: string, make: () => Promise<string>): Promise<string> {
    let job = this.inflight.get(key);
    if (!job) {
      job = (async () => {
        const cached = await getCachedAudio(key);
        if (cached) return cached;
        const made = await make();
        await saveCachedAudio(key, made);
        return made;
      })();
      this.inflight.set(key, job);
      const done = () => {
        this.inflight.delete(key);
      };
      job.then(done, done);
    }
    return job;
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
      // 준비 중에 다시 누르면 취소합니다(예전에는 아무 일도 없어, 응답이 안 오면 버튼이 계속 돌았습니다).
      // 이미 보낸 요청은 그대로 끝나면 캐시에 담기므로, 다시 누르면 바로 나옵니다.
      if (this.snap.state === "loading") {
        this.stop();
        return;
      }
    }

    this.silenceOthers();
    this.teardown();
    const myToken = this.token;
    this.emit({ state: "loading", sceneId: scene.id, lineIndex: null });

    let url: string | null = null;
    try {
      url = await this.audioFor(allKey(scene), () => generateSceneAudio(scene));
    } catch (e) {
      if (myToken !== this.token) return;
      // 한도·Plus 안내는 aiProxy 가 이미 띄웠으므로 오류 알림(errorAt)을 겹쳐 띄우지 않습니다.
      if (isQuotaError(e)) this.stop();
      else this.fail();
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
      url = await this.audioFor(lineKey(scene, index, speakerName), () => generateLineAudio(line.id, speakerName));
    } catch (e) {
      if (myToken !== this.token) return;
      // 한도·Plus 안내는 aiProxy 가 이미 띄웠으므로 오류 알림(errorAt)을 겹쳐 띄우지 않습니다.
      if (isQuotaError(e)) this.stop();
      else this.fail();
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
