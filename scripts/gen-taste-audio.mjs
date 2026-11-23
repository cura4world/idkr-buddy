// scripts/gen-taste-audio.mjs
// 무료 맛보기 회화 장면(01 처음 만나 인사 · dasar-kenalan)의 음성 파일을 한 번 만들어 앱에 담습니다(2026-11-23 Arga 결정 D4).
// 서버는 무료 사용자의 회화 음성을 잠가 두므로, 이 장면만 미리 만든 파일을 앱이 그대로 틉니다(src/lib/percakapanAudio.ts).
//
// 쓰는 법 (PowerShell, 저장소 폴더에서):
//   $env:GEMINI_API_KEY = "여기에 키"      ← 키는 이 창에만 남고 파일·화면에 적히지 않습니다
//   node scripts/gen-taste-audio.mjs --go
//   Remove-Item Env:GEMINI_API_KEY
// --go 없이 돌리면 무엇을 만들지만 보여 주고 AI 를 부르지 않습니다(실수로 돌려 비용이 나가지 않게).
//
// 만드는 것:
//   public/audio/taste/dasar-kenalan-r<rev>/all.wav        전체 듣기(남·여 두 목소리)
//   public/audio/taste/dasar-kenalan-r<rev>/line-01.wav …  문장 하나씩(그 줄 화자의 목소리)
//   src/data/tasteAudio.ts                                 위 파일 목록(앱이 읽음)
// 요청 모양(모델·목소리·안내문)은 앱의 회화 재생기와 똑같이 맞췄습니다 — 앱에서 Plus 로 들을 때와 같은 소리입니다.
// 장면 대사를 고쳐 rev 를 올리면 이 스크립트를 다시 돌립니다(옛 파일은 앱이 쓰지 않음).
// 호출 수: 전체 1 + 문장 13 = 14번(실패한 요청은 2번까지 다시).

import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
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

const GO = process.argv.indexOf("--go") >= 0;
const key = String(process.env.GEMINI_API_KEY || "").trim();
if (GO && !key) {
  console.error("GEMINI_API_KEY 환경 변수가 없습니다. 맨 위 '쓰는 법'을 보세요.");
  process.exit(1);
}

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
  console.log("만들 파일: all.wav + line-01~" + String(scene.lines.length).padStart(2, "0") + ".wav (AI 호출 " + (scene.lines.length + 1) + "번)");
  console.log("실제로 만들려면 --go 를 붙여 다시 돌리세요. 이번에는 AI 를 부르지 않았습니다.");
  process.exit(0);
}
mkdirSync(dirAbs, { recursive: true });

// 이미 만든 파일(같은 rev 폴더에 있고 WAV 머리가 맞는 것)은 다시 부르지 않습니다 — 중간에 멈췄다 이어 돌릴 때 비용을 아낍니다.
// 처음부터 다시 만들려면 그 폴더를 지우고 돌립니다.
function existing(name) {
  try {
    const b = readFileSync(join(dirAbs, name));
    return b.length > 1000 && b.slice(0, 4).toString("ascii") === "RIFF" ? b : null;
  } catch (e) {
    return null;
  }
}

const files = { all: dirRel + "/all.wav", lines: [] };
let all = existing("all.wav");
if (all) console.log("  all.wav 이미 있음 " + Math.round(all.length / 1024) + " KB");
else {
  all = await tts(sceneBody(scene), "전체 듣기");
  writeFileSync(join(dirAbs, "all.wav"), all);
  console.log("  all.wav " + Math.round(all.length / 1024) + " KB");
}
for (let i = 0; i < scene.lines.length; i++) {
  const l = scene.lines[i];
  const name = "line-" + String(i + 1).padStart(2, "0") + ".wav";
  let buf = existing(name);
  if (buf) console.log("  " + name + " 이미 있음 " + Math.round(buf.length / 1024) + " KB");
  else {
    buf = await tts(lineBody(l.id, speakerNameOf(scene, l.s)), name);
    writeFileSync(join(dirAbs, name), buf);
    console.log("  " + name + " " + Math.round(buf.length / 1024) + " KB");
  }
  files.lines.push(dirRel + "/" + name);
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
  "  /** 앱 주소 기준 경로(BASE_URL 뒤). 예: \"audio/taste/dasar-kenalan-r2/all.wav\" */\n" +
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
