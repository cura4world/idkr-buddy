// scripts/gen-taste-audio.mjs
// 무료 맛보기 회화 장면(01 처음 만나 인사 · dasar-kenalan)의 음성 파일을 한 번 만들어 앱에 담습니다(2026-11-23 Arga 결정 D4).
// 서버는 무료 사용자의 회화 음성을 잠가 두므로, 이 장면만 미리 만든 파일을 앱이 그대로 틉니다(src/lib/percakapanAudio.ts).
//
// 쓰는 법 (PowerShell, 저장소 폴더에서):
//   $env:GEMINI_API_KEY = "여기에 키"      ← 키는 이 창에만 남고 파일·화면에 적히지 않습니다
//   node scripts/gen-taste-audio.mjs --go
//   Remove-Item Env:GEMINI_API_KEY
// --go 없이 돌리면 무엇을 만들지만 보여 주고 AI 를 부르지 않습니다(실수로 돌려 비용이 나가지 않게).
// ffmpeg 가 있어야 합니다(PATH 에서 찾음) — Gemini 가 준 소리(WAV)를 MP3 로 바꿉니다.
//
// 만드는 것 (2026-11-24 Arga 요청: WAV 3.9MB → MP3 모노 64kbps 로 줄임):
//   public/audio/taste/dasar-kenalan-r<rev>/all.mp3        전체 듣기(남·여 두 목소리)
//   public/audio/taste/dasar-kenalan-r<rev>/line-01.mp3 …  문장 하나씩(그 줄 화자의 목소리)
//   src/data/tasteAudio.ts                                 위 파일 목록(앱이 읽음)
// 같은 폴더에 MP3 가 이미 있으면 건너뛰고, MP3 는 없는데 WAV 가 있으면(예전 판·중간에 멈춘 것) AI 를 부르지 않고 바꾸기만 합니다.
// MP3 를 만든 뒤 WAV 는 지웁니다(같은 소리를 두 벌 남기지 않게).
// 요청 모양(모델·목소리·안내문)은 앱의 회화 재생기와 똑같이 맞췄습니다 — 앱에서 Plus 로 들을 때와 같은 소리입니다.
// 장면 대사를 고쳐 rev 를 올리면 이 스크립트를 다시 돌립니다(옛 파일은 앱이 쓰지 않음).
// 호출 수: 전체 1 + 문장 13 = 14번(실패한 요청은 2번까지 다시).

import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENE_ID = "dasar-kenalan";
// src/lib/percakapanAudio.ts 와 같은 값
const MODEL = "gemini-3.1-flash-tts-preview";
const SAMPLE_RATE = 24000;
const MALE_SPEAKER = "Andi";
const FEMALE_SPEAKER = "Sinta";
const MALE_VOICE = "Charon";
const FEMALE_VOICE = "Kore";
const TIMEOUT_MS = 90000;
const MP3_BITRATE = "64k"; // 모노 64kbps — 말소리에 충분하고 한 장면 합이 1MB 안쪽

const GO = process.argv.indexOf("--go") >= 0;
// 키는 AI 를 실제로 불러야 할 때만 확인합니다(WAV 를 MP3 로 바꾸기만 할 때는 필요 없음).
const key = String(process.env.GEMINI_API_KEY || "").trim();

// ── 장면 불러오기 (TypeScript 데이터 파일을 esbuild 로 잠깐 풀어 읽음) ──
async function loadScene() {
  const out = join(tmpdir(), "kata-taste-scene-" + Date.now() + ".mjs");
  await build({
    entryPoints: [join(ROOT, "src/data/percakapan/01-dasar.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: out,
    logLevel: "error",
  });
  try {
    const mod = await import(pathToFileURL(out).href);
    const scene = (mod.DASAR || []).find((s) => s.id === SCENE_ID);
    if (!scene) throw new Error("장면을 찾지 못했습니다: " + SCENE_ID);
    return scene;
  } finally {
    try { rmSync(out); } catch (e) {}
  }
}

function speakerNameOf(scene, s) {
  const k = s === "B" ? "B" : "A";
  const g = scene.voices ? scene.voices[k] : "m";
  return g === "f" ? FEMALE_SPEAKER : MALE_SPEAKER;
}
function voiceNameFor(name) {
  return name === FEMALE_SPEAKER ? FEMALE_VOICE : MALE_VOICE;
}

function sceneBody(scene) {
  const preamble =
    "TTS the following Indonesian conversation naturally. Read only the dialogue lines, " +
    "do not read these instructions.\n\n";
  const body = scene.lines.map((l) => speakerNameOf(scene, l.s) + ": " + l.id).join("\n");
  return {
    contents: [{ parts: [{ text: preamble + body }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: MALE_SPEAKER, voiceConfig: { prebuiltVoiceConfig: { voiceName: MALE_VOICE } } },
            { speaker: FEMALE_SPEAKER, voiceConfig: { prebuiltVoiceConfig: { voiceName: FEMALE_VOICE } } },
          ],
        },
      },
    },
  };
}

function lineBody(text, speakerName) {
  const prompt =
    "Read the following Indonesian line aloud naturally, as in a real conversation. " +
    "Read only the text after the colon, do not read these instructions.\n\n: " + text;
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameFor(speakerName) } } },
    },
  };
}

function wavFromPcm(pcm) {
  const header = Buffer.alloc(44);
  const blockAlign = 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function tts(body, label) {
  if (!key) throw new Error("GEMINI_API_KEY 환경 변수가 없습니다(" + label + " 을 새로 만들어야 함). 맨 위 '쓰는 법'을 보세요.");
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        // 429 = 분당 호출 한도 — 기다렸다 다시(30초, 60초). 바로 다시 부르면 또 429 입니다(2026-11-23 실제로 겪음).
        const wait = res.status === 429 ? 30000 * (attempt + 1) : 0;
        console.error("  " + label + ": HTTP " + res.status + (attempt < 2 ? " — " + (wait ? wait / 1000 + "초 뒤 " : "") + "다시 시도" : ""));
        if (wait && attempt < 2) await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      const data = await res.json();
      const part = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0];
      const b64 = part && part.inlineData ? part.inlineData.data : "";
      const mime = part && part.inlineData ? String(part.inlineData.mimeType || "") : "";
      if (!b64) {
        console.error("  " + label + ": 소리가 비어 있음" + (attempt < 2 ? " — 다시 시도" : ""));
        continue;
      }
      const raw = Buffer.from(b64, "base64");
      // 앱(percakapanAudio.ts)과 같이 PCM 에 WAV 머리를 씌웁니다. 이미 WAV 로 오면 그대로.
      return raw.slice(0, 4).toString("ascii") === "RIFF" || mime.indexOf("wav") >= 0 ? raw : wavFromPcm(raw);
    } catch (e) {
      console.error("  " + label + ": " + (ctrl.signal.aborted ? "시간 초과" : "통신 오류") + (attempt < 2 ? " — 다시 시도" : ""));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(label + " 을(를) 만들지 못했습니다");
}

const scene = await loadScene();
const rev = scene.rev || 0;
const dirRel = "audio/taste/" + SCENE_ID + "-r" + rev;
const dirAbs = join(ROOT, "public", dirRel);
console.log("장면 " + SCENE_ID + " (rev " + rev + ", " + scene.lines.length + "줄) → public/" + dirRel);
if (!GO) {
  console.log("만들 파일: all.mp3 + line-01~" + String(scene.lines.length).padStart(2, "0") + ".mp3 (없는 것만 AI 호출, 최대 " + (scene.lines.length + 1) + "번)");
  console.log("실제로 만들려면 --go 를 붙여 다시 돌리세요. 이번에는 AI 를 부르지 않았습니다.");
  process.exit(0);
}
// ffmpeg 가 없으면 AI 를 부르기 전에 멈춥니다(소리만 받고 MP3 로 못 바꾸는 일이 없게)
{
  const v = spawnSync("ffmpeg", ["-hide_banner", "-version"], { encoding: "utf8" });
  if (v.status !== 0) {
    console.error("ffmpeg 를 찾지 못했습니다. ffmpeg 를 설치하고 PATH 에 넣은 뒤 다시 돌리세요.");
    process.exit(1);
  }
}
mkdirSync(dirAbs, { recursive: true });

function readIf(path, ok) {
  try {
    const b = readFileSync(path);
    return ok(b) ? b : null;
  } catch (e) {
    return null;
  }
}
const isWav = (b) => b.length > 1000 && b.slice(0, 4).toString("ascii") === "RIFF";
// MP3: ID3 머리 또는 프레임 동기(0xFFE…)로 시작
const isMp3 = (b) => b.length > 1000 && (b.slice(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));

/** WAV 바이트 → MP3 바이트 (ffmpeg, 모노·24kHz·64kbps) */
function toMp3(wav) {
  const stamp = join(tmpdir(), "kata-taste-" + process.pid + "-" + Date.now());
  const tin = stamp + ".wav";
  const tout = stamp + ".mp3";
  writeFileSync(tin, wav);
  try {
    const r = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", tin,
      "-ac", "1", "-ar", String(SAMPLE_RATE), "-codec:a", "libmp3lame", "-b:a", MP3_BITRATE, tout,
    ], { encoding: "utf8" });
    if (r.status !== 0) throw new Error("ffmpeg 로 MP3 를 만들지 못했습니다: " + String(r.stderr || "").slice(0, 300));
    return readFileSync(tout);
  } finally {
    try { rmSync(tin); } catch (e) {}
    try { rmSync(tout); } catch (e) {}
  }
}

// base("all"·"line-01") 의 MP3 를 마련합니다.
//   MP3 가 있으면 그대로 → WAV 만 있으면 바꾸기만(AI 호출 없음) → 둘 다 없으면 AI 로 WAV 를 받아 먼저 저장(중간에 멈춰도 다음에 이어 감) 뒤 바꿈.
//   MP3 를 만든 뒤 WAV 는 지웁니다. 처음부터 다시 만들려면 그 폴더를 지우고 돌립니다.
async function ensureMp3(base, makeWav) {
  const mp3Path = join(dirAbs, base + ".mp3");
  const wavPath = join(dirAbs, base + ".wav");
  const have = readIf(mp3Path, isMp3);
  if (have) {
    console.log("  " + base + ".mp3 이미 있음 " + Math.round(have.length / 1024) + " KB");
    return;
  }
  let wav = readIf(wavPath, isWav);
  const from = wav ? "WAV 에서 바꿈" : "새로 만듦";
  if (!wav) {
    wav = await makeWav();
    writeFileSync(wavPath, wav);
  }
  const mp3 = toMp3(wav);
  if (!isMp3(mp3)) throw new Error(base + ".mp3 가 MP3 모양이 아닙니다");
  writeFileSync(mp3Path, mp3);
  try { rmSync(wavPath); } catch (e) {}
  console.log("  " + base + ".mp3 " + Math.round(mp3.length / 1024) + " KB (" + from + ", WAV " + Math.round(wav.length / 1024) + " KB)");
}

const files = { all: dirRel + "/all.mp3", lines: [] };
await ensureMp3("all", () => tts(sceneBody(scene), "전체 듣기"));
for (let i = 0; i < scene.lines.length; i++) {
  const l = scene.lines[i];
  const base = "line-" + String(i + 1).padStart(2, "0");
  await ensureMp3(base, () => tts(lineBody(l.id, speakerNameOf(scene, l.s)), base));
  files.lines.push(dirRel + "/" + base + ".mp3");
}

const ts =
  "// src/data/tasteAudio.ts\n" +
  "// 무료 맛보기 회화 장면(01 처음 만나 인사)의 음성 파일 목록 — scripts/gen-taste-audio.mjs 가 만들어 덮어씁니다.\n" +
  "// 서버는 무료 사용자의 회화 음성(shared-audio)을 잠가 두므로(2026-11-23 Arga 결정 D4: 서버는 바꾸지 않음),\n" +
  "// 이 장면만 미리 만든 파일(public/audio/taste/…)을 앱에 담아 듣게 합니다.\n" +
  "//\n" +
  "// 파일을 아직 만들지 않았으면 null — 그동안 무료 사용자에게는 이 장면의 듣기 단추를 보이지 않습니다(글은 보임).\n" +
  "// 장면의 대사를 고쳐 rev 가 오르거나 줄 수가 바뀌면 이 목록과 맞지 않게 되어 파일을 쓰지 않습니다 — 스크립트를 다시 돌립니다.\n" +
  "\n" +
  "export interface TasteAudio {\n" +
  "  sceneId: string;\n" +
  "  rev: number;\n" +
  "  lineCount: number;\n" +
  "  /** 앱 주소 기준 경로(BASE_URL 뒤). 예: \"audio/taste/dasar-kenalan-r2/all.mp3\" */\n" +
  "  all: string;\n" +
  "  /** 줄마다 하나(줄 순서대로) */\n" +
  "  lines: string[];\n" +
  "}\n" +
  "\n" +
  "export const TASTE_AUDIO: TasteAudio | null = " +
  JSON.stringify({ sceneId: SCENE_ID, rev, lineCount: scene.lines.length, all: files.all, lines: files.lines }, null, 2) +
  ";\n";
writeFileSync(join(ROOT, "src/data/tasteAudio.ts"), ts);
console.log("src/data/tasteAudio.ts 를 새로 썼습니다. 끝.");
