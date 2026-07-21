// src/lib/tts.ts
// 인도네시아어 "글 전체"를 자연스러운 목소리로 읽어주는 클라우드 TTS.
// - Gemini TTS(gemini-3.1-flash-tts-preview)로 오디오 생성 → IndexedDB에 캐시(5,000개 FIFO)
// - 같은 글은 재과금 0. 실패 시 기존 무료 TTS(speechSynthesis/AndroidTTS)로 자동 폴백.
// - 긴 글은 문단으로 쪼개 생성하되(품질 드리프트 방지), 재생은 이어서 하나처럼.
// - 재생/일시정지/정지 컨트롤 + 상태 구독(subscribe) 제공.

import { getGeminiApiKey } from "@/lib/gemini";

const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const VOICE_STORAGE = "tts-voice";
const DB_NAME = "kata-tts-audio";
const STORE = "audio";
const MAX_ITEMS = 5000;
const SAMPLE_RATE = 24000;

// 남/여 각각 하나씩. 기본은 남성(Charon).
export type TtsVoiceId = "male" | "female";
export const TTS_VOICES: { id: TtsVoiceId; label: string; voiceName: string }[] = [
  { id: "male", label: "남성", voiceName: "Charon" },
  { id: "female", label: "여성", voiceName: "Kore" },
];

export function getTtsVoice(): TtsVoiceId {
  try {
    const v = localStorage.getItem(VOICE_STORAGE);
    return v === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

export function setTtsVoice(id: TtsVoiceId): void {
  try { localStorage.setItem(VOICE_STORAGE, id); } catch {}
}

function voiceNameOf(id: TtsVoiceId): string {
  const v = TTS_VOICES.find((x) => x.id === id);
  return v ? v.voiceName : "Charon";
}

// ── IndexedDB 캐시 (이미지 저장소와 동일 FIFO 패턴) ──────────────
let dbPromise: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("NO_INDEXEDDB")); return; }
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
  } catch { return null; }
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
  } catch {}
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
  } catch {}
}

export async function clearTtsCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// ── PCM(base64) → WAV(base64 data URL) ─────────────────────────
function pcmBase64ToWavDataUrl(pcmB64: string): string {
  const binary = atob(pcmB64);
  const len = binary.length;
  const pcm = new Uint8Array(len);
  for (let i = 0; i < len; i++) pcm[i] = binary.charCodeAt(i);

  const channels = 1, bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = pcm.length;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
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

// ── Gemini TTS 호출 (문단 1개) ─────────────────────────────────
async function generateAudioForText(text: string, voiceName: string, attempt = 0): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  // 지시문을 소리내어 읽어버리는 문제 방지: 명확한 preamble + 낭독 대상 라벨.
  const prompt =
    "Read the following Indonesian text aloud clearly and naturally, in a calm reading voice. " +
    "Read only the text after the colon, do not read these instructions.\n\n: " + text;

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" + TTS_MODEL +
    ":generateContent?key=" + encodeURIComponent(apiKey);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
    });
  } catch {
    throw new Error("NETWORK_FAILED");
  }

  if (!res.ok) {
    // 500은 가끔 오디오 대신 텍스트 토큰을 반환하는 알려진 이슈 → 1회 재시도
    if (res.status === 500 && attempt < 1) return generateAudioForText(text, voiceName, attempt + 1);
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const b64: string = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? "";
  if (!b64) {
    if (attempt < 1) return generateAudioForText(text, voiceName, attempt + 1);
    throw new Error("EMPTY_AUDIO");
  }
  return pcmBase64ToWavDataUrl(b64);
}

// 긴 글은 문단(빈 줄) 단위로 쪼갬. 문단이 너무 길면 문장 경계로 추가 분할.
function splitForTts(text: string): string[] {
  const paras = text.split(new RegExp("\\n{2,}")).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  const MAX = 600; // 문단 하나가 이보다 길면 문장 단위로 더 쪼갬
  for (const para of paras) {
    if (para.length <= MAX) { out.push(para); continue; }
    const sentences = para.split(new RegExp("(?<=[.!?])\\s+"));
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).trim().length > MAX && buf) { out.push(buf.trim()); buf = s; }
      else buf = (buf + " " + s).trim();
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out.length ? out : [text.trim()];
}

// ── 무료 폴백 (기존 프로젝트 공통 speak 패턴) ───────────────────
function speakFallback(text: string) {
  if ((window as any).AndroidTTS) {
    try { (window as any).AndroidTTS.speak(text, "id-ID"); } catch {}
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 0.9;
    speechSynthesis?.cancel?.();
    setTimeout(() => { try { speechSynthesis?.speak?.(u); } catch {} }, 150);
  } catch {}
}

// ── 플레이어 (전역 단일 인스턴스) ───────────────────────────────
export type TtsState = "idle" | "loading" | "playing" | "paused";

interface PlayerSnapshot {
  state: TtsState;
  key: string | null; // 현재(마지막) 재생 대상 키
  usedFallback: boolean;
}

type Listener = (s: PlayerSnapshot) => void;

class TtsPlayer {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private snap: PlayerSnapshot = { state: "idle", key: null, usedFallback: false };
  private token = 0; // 재생 세션 토큰(중간에 stop/새 재생 시 이전 것 무효화)

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snap);
    return () => this.listeners.delete(fn);
  }
  private emit(patch: Partial<PlayerSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l(this.snap));
  }
  getState(): PlayerSnapshot { return this.snap; }

  stop() {
    this.token++;
    if (this.audio) { try { this.audio.pause(); } catch {} this.audio = null; }
    try { speechSynthesis?.cancel?.(); } catch {}
    try { (window as any).AndroidTTS?.stop?.(); } catch {}
    this.emit({ state: "idle" });
  }

  pause() {
    if (this.snap.state !== "playing") return;
    if (this.audio) { try { this.audio.pause(); } catch {} this.emit({ state: "paused" }); }
    else { this.stop(); } // 폴백(내장 TTS)은 일시정지가 불가 → 정지 처리
  }

  resume() {
    if (this.snap.state !== "paused" || !this.audio) return;
    this.audio.play().then(() => this.emit({ state: "playing" })).catch(() => this.stop());
  }

  // toggle 진입점: key(글 식별자)와 text(인니어 전문), 음성.
  async toggle(key: string, text: string) {
    // 같은 글을 재생 중이면 일시정지/재개 토글
    if (this.snap.key === key) {
      if (this.snap.state === "playing") { this.pause(); return; }
      if (this.snap.state === "paused") { this.resume(); return; }
    }
    await this.play(key, text);
  }

  private async play(key: string, text: string) {
    this.stop();
    const myToken = ++this.token;
    this.emit({ state: "loading", key, usedFallback: false });

    const voiceName = voiceNameOf(getTtsVoice());
    const chunks = splitForTts(text);

    // 각 청크의 오디오 dataUrl 확보 (캐시 우선)
    const urls: string[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (myToken !== this.token) return; // 취소됨
        const ckey = key + "::v=" + voiceName + "::" + i + "/" + chunks.length;
        let url = await getCachedAudio(ckey);
        if (!url) {
          url = await generateAudioForText(chunks[i], voiceName);
          await saveCachedAudio(ckey, url);
        }
        urls.push(url);
      }
    } catch (e) {
      // 클라우드 실패 → 무료 폴백으로 전체 읽기
      if (myToken !== this.token) return;
      this.emit({ state: "playing", usedFallback: true });
      speakFallback(text);
      // 내장 TTS는 종료 이벤트를 신뢰하기 어려워 상태만 idle로 되돌릴 타이머 없이 둠(정지 버튼으로 종료)
      return;
    }

    if (myToken !== this.token) return;
    // 청크들을 순서대로 이어서 재생
    this.playSequence(urls, 0, myToken);
  }

  private playSequence(urls: string[], idx: number, myToken: number) {
    if (myToken !== this.token) return;
    if (idx >= urls.length) { this.emit({ state: "idle" }); this.audio = null; return; }
    const audio = new Audio(urls[idx]);
    this.audio = audio;
    audio.onended = () => { if (myToken === this.token) this.playSequence(urls, idx + 1, myToken); };
    audio.onerror = () => { if (myToken === this.token) this.playSequence(urls, idx + 1, myToken); };
    audio.play().then(() => { if (myToken === this.token) this.emit({ state: "playing" }); })
      .catch(() => { if (myToken === this.token) this.stop(); });
  }
}

export const ttsPlayer = new TtsPlayer();
