// src/lib/tts.ts
// 인도네시아어 "글 전체"를 자연스러운 목소리로 읽어주는 클라우드 TTS.
// - Gemini TTS(gemini-3.8-flash-lite-tts, 거절되면 3.1 preview)로 오디오 생성 → IndexedDB에 캐시(5,000개 FIFO)
// - 같은 글은 재과금 0. 실패 시 기존 무료 TTS(speechSynthesis/AndroidTTS)로 자동 폴백.
// - 긴 글은 문단으로 쪼개 생성하되(품질 드리프트 방지), 재생은 이어서 하나처럼.
// - 재생/일시정지/정지 컨트롤 + 상태 구독(subscribe) 제공.

import { geminiTarget, handleQuotaResponse, publicProxyError, AiKind } from "@/lib/aiProxy";
import { getGeminiApiKey } from "@/lib/gemini";
import { isStoreApp } from "@/lib/platform";

/**
 * 공개판 서버가 셀 기능 이름(x-kata-kind)을 재생 키의 앞머리로 정합니다. (추가 전용 — 기존 사용법은 그대로)
 *   "say:"   storeTtsShim 이 넘기는 단어·예문·지도·이해의 짧은 발음 → word-audio
 *   "story-" 이야기 화면의 PlayButton(cacheKey "story-v2-<id>") → longread (한 편 = 한 번)
 *   그 밖     묵상·기도·뉴스(관리자판 화면) → tts
 */
export function ttsKindForKey(key: string): AiKind {
  const k = String(key || "");
  if (k.indexOf("say:") === 0) return "word-audio";
  if (k.indexOf("story-") === 0) return "longread";
  return "tts";
}

const TTS_MODEL = "gemini-3.8-flash-lite-tts";
// 3.8 이 요청을 거절하면(400·404) 한 번만 이 모델로 다시 만듭니다.
const LEGACY_TTS_MODEL = "gemini-3.1-flash-tts-preview";
// 3.8 TTS 는 입력을 "읽을 원고 그대로"로 취급합니다. 읽는 방식은 원고가 아니라 이 값으로 줍니다.
const TTS_READ_STYLE = "Read aloud clearly and naturally, in a calm reading voice.";
// 한글이 없는 글(인도네시아어)에는 언어를 알려 줍니다. 원고만 보면 "perawat" 같은 낱말 하나는
// 영어처럼 읽힐 때가 있었습니다(2026-11-11 S21 사용자 확인 — 문장인 예문은 정상).
const TTS_READ_STYLE_ID =
  "Read aloud in Indonesian (Bahasa Indonesia) with native Indonesian pronunciation, clearly and naturally, in a calm reading voice.";
const HANGUL_RE = new RegExp("[\\uAC00-\\uD7A3]");
function readStyleFor(text: string): string {
  return HANGUL_RE.test(text) ? TTS_READ_STYLE : TTS_READ_STYLE_ID;
}
// 낱말 발음("say:")은 위 언어 지시를 넣기 전에 만든 소리를 다시 쓰지 않도록 캐시 이름에 판을 붙입니다.
// play() 와 getSayAudioUrl() 이 같은 이름을 써야 합니다.
const SAY_CACHE_VER = "::id1";
function isVerbatimTtsModel(model: string): boolean {
  return model.indexOf("gemini-3.8-") === 0;
}
// 설교문 전용 — 싼 순서로 시도합니다 (오디오 출력 100만 토큰당, 2026-09 기준).
// 3.8 Flash-Lite $6(2027-01부터 $12) → 2.5 Flash Preview $10 → 3.1 Flash Preview $20
// 이 순서를 지키려고 playParts 는 레거시 재시도를 끄고 부릅니다(legacyRetry=false).
const SERMON_TTS_MODELS = [TTS_MODEL, "gemini-2.5-flash-preview-tts", LEGACY_TTS_MODEL];
// TTS 요청 하나의 마감. 설교문 묶음은 길어 넉넉히 잡습니다.
const TTS_TIMEOUT_MS = 90000;
export function sermonTtsModels(): string[] { return SERMON_TTS_MODELS.slice(); }

// 설교문 오디오는 한 편이 수십 MB 라 기존 캐시(개수 5,000 FIFO)와 섞으면
// 회화·묵상 음성을 밀어냅니다. 그래서 저장소를 따로 두고 개수 제한을 두지 않습니다.
const SERMON_DB_NAME = "kata-sermon-audio";
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

// ── 설교문 전용 오디오 저장소 (개수 제한 없음) ─────────────────
// 기존 캐시와 DB 를 나눠 두어 서로 밀어내지 않습니다.
let sermonDbPromise: Promise<IDBDatabase> | null = null;
function openSermonDB(): Promise<IDBDatabase> {
  if (sermonDbPromise) return sermonDbPromise;
  sermonDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("NO_INDEXEDDB")); return; }
    const req = indexedDB.open(SERMON_DB_NAME, 1);
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
  return sermonDbPromise;
}

async function getSermonAudio(key: string): Promise<string | null> {
  try {
    const db = await openSermonDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.dataUrl as string) : null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function saveSermonAudio(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openSermonDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, dataUrl, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function clearSermonAudioCache(): Promise<void> {
  try {
    const db = await openSermonDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function countSermonAudio(): Promise<number> {
  try {
    const db = await openSermonDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

// 설교문 한 편의 낭독 음성만 지웁니다. 키는 "sermon:{설교문id}:" 로 시작합니다.
export async function deleteSermonAudioFor(sermonId: string): Promise<number> {
  const prefix = "sermon:" + String(sermonId) + ":";
  try {
    const db = await openSermonDB();
    return await new Promise((resolve) => {
      let n = 0;
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return;
        if (String(cur.key || "").indexOf(prefix) === 0) {
          cur.delete();
          n++;
        }
        cur.continue();
      };
      tx.oncomplete = () => resolve(n);
      tx.onerror = () => resolve(n);
    });
  } catch { return 0; }
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
async function generateAudioForText(
  text: string,
  voiceName: string,
  attempt = 0,
  model: string = TTS_MODEL,
  legacyRetry = true, // false 면 3.8 이 거절돼도 예전 모델로 넘어가지 않고 오류를 그대로 던집니다
  kind: AiKind = "tts", // 공개판 서버가 셀 기능 이름 (ttsKindForKey)
  unit = "",            // 긴 읽기 한 편의 이름 — 문단 여러 조각을 한 번으로 셈
): Promise<string> {
  // 내 키가 있으면 직접, 없고 회원키가 있으면 Worker 를 거칩니다(키는 서버에만).
  const target = geminiTarget(model, getGeminiApiKey(), kind, unit);
  if (!target) throw new Error("NO_API_KEY");

  // 지시문을 소리내어 읽어버리는 문제 방지: 명확한 preamble + 낭독 대상 라벨.
  const prompt =
    "Read the following Indonesian text aloud clearly and naturally, in a calm reading voice. " +
    "Read only the text after the colon, do not read these instructions.\n\n: " + text;
  // 3.8 은 원고만 보내고 읽는 방식은 speech_metadata 로 따로 줍니다(원고에 섞으면 소리 내어 읽음).
  const verbatim = isVerbatimTtsModel(model);
  const part = verbatim
    ? { text, speech_metadata: { style: readStyleFor(text) } }
    : { text: prompt };

  // 응답이 안 오면 로딩이 끝나지 않으므로 마감을 겁니다. 본문(res.json)을 다 읽을 때까지 유지합니다.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TTS_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [part] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        }),
      });
    } catch {
      throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
    }

    // 하루 음성 한도를 넘으면 안내를 띄우고 재시도하지 않습니다.
    if (await handleQuotaResponse(res, target.viaProxy)) throw new Error("QUOTA_TTS");
    // 공개판 서버의 401(세션 만료 → 로그인 화면)·403(허용 안 됨)은 키 오류가 아닙니다.
    const pubErr = publicProxyError(res, target);
    if (pubErr) throw new Error(pubErr);

    if (!res.ok) {
      // 3.8 이 거절하면(모델 없음·형식 오류) 예전 모델로 한 번만 다시 만듭니다.
      if (legacyRetry && verbatim && (res.status === 400 || res.status === 404)) {
        return generateAudioForText(text, voiceName, 0, LEGACY_TTS_MODEL, false, kind, unit);
      }
      // 500은 가끔 오디오 대신 텍스트 토큰을 반환하는 알려진 이슈 → 1회 재시도
      if (res.status === 500 && attempt < 1) return generateAudioForText(text, voiceName, attempt + 1, model, legacyRetry, kind, unit);
      if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
      if (res.status === 429) throw new Error("RATE_LIMIT");
      throw new Error("REQUEST_FAILED_" + res.status);
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
    }
    const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const b64: string = inline?.data ?? "";
    if (!b64) {
      if (attempt < 1) return generateAudioForText(text, voiceName, attempt + 1, model, legacyRetry, kind, unit);
      throw new Error("EMPTY_AUDIO");
    }
    // 3.8 TTS 는 헤더가 붙은 WAV 를 줍니다. 헤더를 또 씌우면 소리가 깨집니다.
    // ("UklGR" = base64 로 쓴 "RIFF", WAV 파일의 첫 네 글자)
    const mime = String(inline?.mimeType ?? "").toLowerCase();
    if (mime.indexOf("wav") >= 0 || b64.slice(0, 5) === "UklGR") return "data:audio/wav;base64," + b64;
    return pcmBase64ToWavDataUrl(b64);
  } finally {
    clearTimeout(timer);
  }
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

// 문단 단위 재생용. 문단마다 자기 캐시 키를 들고 다니므로,
// "문단 하나 듣기"와 "전체 듣기"가 같은 오디오를 공유합니다.
export interface TtsPart {
  key: string;   // 캐시 키 (음성 이름은 내부에서 덧붙입니다)
  text: string;  // 읽을 인니어 문단
}

export interface TtsPartsOptions {
  models?: string[];                 // 앞에서부터 시도, 실패하면 다음 모델
  onError?: (msg: string) => void;   // 생성 실패 알림 (무료 폴백은 쓰지 않습니다)
}

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

  // ── 문단 이어 붙이기 재생 (설교문) ───────────────────────────
  // 기존 toggle/play 와 별개의 진입점입니다. 기존 경로는 건드리지 않습니다.
  // 전부 만들 때까지 기다리지 않고, 첫 문단이 준비되면 바로 재생하면서
  // 다음 문단을 미리 준비합니다.
  async toggleParts(stateKey: string, parts: TtsPart[], opts?: TtsPartsOptions) {
    if (this.snap.key === stateKey) {
      if (this.snap.state === "playing") { this.pause(); return; }
      if (this.snap.state === "paused") { this.resume(); return; }
    }
    await this.playParts(stateKey, parts, opts);
  }

  async playParts(stateKey: string, parts: TtsPart[], opts?: TtsPartsOptions) {
    this.stop();
    if (!parts || parts.length === 0) return;
    const myToken = ++this.token;
    this.emit({ state: "loading", key: stateKey, usedFallback: false });

    const voiceName = voiceNameOf(getTtsVoice());
    const models = opts && opts.models && opts.models.length ? opts.models : [TTS_MODEL];
    const urls: (string | null)[] = parts.map(() => null);

    const ensure = async (i: number): Promise<string> => {
      const have = urls[i];
      if (have) return have;
      const ckey = parts[i].key + "::v=" + voiceName;
      let url = await getSermonAudio(ckey);
      if (!url) {
        let lastErr: any = null;
        for (const m of models) {
          try {
            url = await generateAudioForText(parts[i].text, voiceName, 0, m, false);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!url) throw lastErr || new Error("TTS_FAILED");
        await saveSermonAudio(ckey, url);
      }
      urls[i] = url;
      return url;
    };

    const step = async (i: number) => {
      if (myToken !== this.token) return;
      if (i >= parts.length) { this.audio = null; this.emit({ state: "idle" }); return; }
      let url = urls[i];
      if (!url) {
        this.emit({ state: "loading" });
        try {
          url = await ensure(i);
        } catch (e) {
          if (myToken !== this.token) return;
          this.stop();
          if (opts && opts.onError) opts.onError(String((e as any) && (e as any).message ? (e as any).message : e));
          return;
        }
      }
      if (myToken !== this.token) return;
      const audio = new Audio(url);
      this.audio = audio;
      audio.onended = () => { if (myToken === this.token) step(i + 1); };
      audio.onerror = () => { if (myToken === this.token) step(i + 1); };
      audio.play()
        .then(() => {
          if (myToken !== this.token) return;
          this.emit({ state: "playing" });
          if (i + 1 < parts.length && !urls[i + 1]) { ensure(i + 1).catch(() => {}); }
        })
        .catch(() => { if (myToken === this.token) this.stop(); });
    };

    await step(0);
  }

  private async play(key: string, text: string) {
    this.stop();
    const myToken = ++this.token;
    this.emit({ state: "loading", key, usedFallback: false });

    const voiceName = voiceNameOf(getTtsVoice());
    const chunks = splitForTts(text);
    const kind = ttsKindForKey(key);
    const unit = kind === "longread" ? key : "";

    // 각 청크의 오디오 dataUrl 확보 (캐시 우선)
    const urls: string[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (myToken !== this.token) return; // 취소됨
        const ckey = key + "::v=" + voiceName + "::" + i + "/" + chunks.length + (key.indexOf("say:") === 0 ? SAY_CACHE_VER : "");
        let url = await getCachedAudio(ckey);
        if (!url) {
          url = await generateAudioForText(chunks[i], voiceName, 0, TTS_MODEL, true, kind, unit);
          await saveCachedAudio(ckey, url);
        }
        urls.push(url);
      }
    } catch (e) {
      if (myToken !== this.token) return;
      // 스토어 앱에서 한도 초과·Plus 필요는 안내(aiProxy)만 하고 멈춥니다. 스토어 앱의 폰 음성 폴백은
      // storeTtsShim 이라 다시 Gemini 발음(word-audio)으로 가서 잠금을 우회하게 됩니다.
      // (관리자판·회원판은 진짜 폰 음성이 있으므로 예전처럼 폴백합니다.)
      const msg = String((e as any) && (e as any).message ? (e as any).message : "");
      if (msg.indexOf("QUOTA") === 0 && isStoreApp()) { this.stop(); return; }
      // 클라우드 실패 → 무료 폴백으로 전체 읽기
      this.emit({ state: "playing", usedFallback: true });
      speakFallback(text);
      // 내장 TTS는 종료 이벤트를 신뢰하기 어려워 상태만 idle로 되돌릴 타이머 없이 둠(정지 버튼으로 종료)
      return;
    }

    if (myToken !== this.token) return;
    // 청크들을 순서대로 이어서 재생
    this.playSequence(urls, 0, myToken);
  }

  // ── 추가 전용 (2026-11-11): 목소리를 정해 한 번 읽고, 다 읽을 때까지 기다리기 ─────────
  // 카드 자동재생이 "다 읽은 뒤 다음 카드로" 넘어가려고 씁니다. 기존 toggle/play 는 그대로입니다.
  // voice 를 주면 설정의 목소리 대신 그 목소리로 읽습니다(카드: 한국어 뜻 = 남성).
  // 캐시 이름은 play() 와 같은 규칙이라, 같은 글·같은 목소리는 서로 다시 만들지 않습니다.
  private async urlsFor(key: string, text: string, voiceName: string, isCancelled: () => boolean): Promise<string[] | null> {
    const chunks = splitForTts(text);
    const kind = ttsKindForKey(key);
    const unit = kind === "longread" ? key : "";
    const urls: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (isCancelled()) return null;
      const ckey = key + "::v=" + voiceName + "::" + i + "/" + chunks.length + (key.indexOf("say:") === 0 ? SAY_CACHE_VER : "");
      let url = await getCachedAudio(ckey);
      if (!url) {
        url = await generateAudioForText(chunks[i], voiceName, 0, TTS_MODEL, true, kind, unit);
        await saveCachedAudio(ckey, url);
      }
      urls.push(url);
    }
    return urls;
  }

  /** 미리 만들어 캐시에 넣어 둡니다(재생하지 않음). 실패해도 조용히 넘어갑니다. */
  async prefetch(key: string, text: string, voice?: TtsVoiceId): Promise<void> {
    const t = String(text || "").trim();
    if (!t) return;
    const voiceName = voiceNameOf(voice || getTtsVoice());
    try { await this.urlsFor(key, t, voiceName, () => false); } catch (e) { /* 무시 */ }
  }

  /**
   * 한 번 읽고 다 읽으면 끝나는 Promise. 중간에 stop()·다른 재생이 시작되면 그때 끝납니다.
   * 만들기에 실패하면 false 로 끝납니다(소리 없이) — 부르는 쪽이 다음으로 넘어가면 됩니다.
   */
  async playOnce(key: string, text: string, voice?: TtsVoiceId): Promise<boolean> {
    const t = String(text || "").trim();
    if (!t) return false;
    this.stop();
    const myToken = ++this.token;
    this.emit({ state: "loading", key, usedFallback: false });
    const voiceName = voiceNameOf(voice || getTtsVoice());
    let urls: string[] | null = null;
    try {
      urls = await this.urlsFor(key, t, voiceName, () => myToken !== this.token);
    } catch (e) {
      if (myToken === this.token) this.emit({ state: "idle" });
      return false;
    }
    if (!urls || myToken !== this.token) return false;
    for (let i = 0; i < urls.length; i++) {
      if (myToken !== this.token) return false;
      const ok = await new Promise<boolean>((resolve) => {
        const audio = new Audio(urls![i]);
        this.audio = audio;
        let settled = false;
        const end = (v: boolean) => { if (!settled) { settled = true; clearInterval(watch); resolve(v); } };
        // stop()·다른 재생으로 토큰이 바뀌면 끝난 것으로 칩니다
        const watch = setInterval(() => { if (myToken !== this.token) end(false); }, 200);
        audio.onended = () => end(true);
        audio.onerror = () => end(true);
        audio.play()
          .then(() => { if (myToken === this.token) this.emit({ state: "playing" }); })
          .catch(() => end(false));
      });
      if (!ok) return false;
    }
    if (myToken === this.token) { this.audio = null; this.emit({ state: "idle" }); }
    return true;
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

// ── 추가 전용: 짧은 글(단어 발음)의 음성 주소 ─────────────────────
// 듣고 고르기(Dengar) 게임이 씁니다. 게임은 소리를 직접 재생해야(천천히 듣기 = 재생 속도 조절)
// 하므로 ttsPlayer 대신 주소만 받아 갑니다. 캐시 키는 ttsPlayer.toggle("say:" + 글, 글) 과
// 똑같이 만들어, 단어 발음 버튼(스토어 앱의 AndroidTTS 대체)으로 한 번 들은 단어는 다시 만들지 않습니다.
// cacheOnly 면 새로 만들지 않고 저장된 것만 돌려줍니다(오프라인일 때 "들어 본 단어" 고르기용).
// 실패하면 null — 부르는 쪽이 글자로 대신 보여 줍니다. 기존 함수·메서드는 바꾸지 않았습니다.
export async function getSayAudioUrl(
  text: string,
  opts?: { cacheOnly?: boolean },
): Promise<string | null> {
  const t = String(text || "").trim();
  if (!t) return null;
  try {
    const chunks = splitForTts(t);
    if (chunks.length !== 1) return null; // 단어·짧은 구절 전용
    const voiceName = voiceNameOf(getTtsVoice());
    const ckey = "say:" + t + "::v=" + voiceName + "::0/1" + SAY_CACHE_VER;
    const have = await getCachedAudio(ckey);
    if (have) return have;
    if (opts && opts.cacheOnly) return null;
    const url = await generateAudioForText(chunks[0], voiceName);
    await saveCachedAudio(ckey, url);
    return url;
  } catch {
    return null;
  }
}
