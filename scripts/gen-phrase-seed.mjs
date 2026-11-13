// scripts/gen-phrase-seed.mjs
// 내장 문장(src/lib/peribahasa.ts 의 STATIC_PHRASES, 36개)의 해설을 Gemini 로 한 번 만들어
// src/data/phrase-seed.json 에 저장합니다. 앱은 이 파일을 지연 import 해서, 첫 실행 첫 화면이
// AI 호출 없이 열리게 합니다(src/lib/phrase.ts getPhraseDetail).
//
// 사용법 (PowerShell):
//   $env:GEMINI_API_KEY = "<구글 AI Studio 에서 받은 키>"   # 파일에 쓰거나 커밋하지 않습니다
//   node scripts/gen-phrase-seed.mjs            # 아직 없는 문장만 만듭니다
//   node scripts/gen-phrase-seed.mjs --force    # 전부 다시 만듭니다
//   node scripts/gen-phrase-seed.mjs --check    # 만들지 않고 모양만 검사합니다(키 필요 없음)
//
// 프롬프트는 앱과 같은 src/lib/phrasePrompt.ts 의 buildPrompt 를 씁니다(노드가 타입 표기를 지우고 직접 불러옵니다).
// 키는 환경변수 GEMINI_API_KEY 로만 읽고, 주소(쿼리)에 넣지 않고 헤더로 보냅니다. 로그에도 찍지 않습니다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt } from "../src/lib/phrasePrompt.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src", "lib", "peribahasa.ts");
const OUT = path.join(ROOT, "src", "data", "phrase-seed.json");

// 한 번만 돌리는 작업이라 앱의 기본(lite)보다 품질이 나은 모델을 먼저 씁니다. GEMINI_MODEL 로 바꿀 수 있습니다.
const MODELS = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []).concat([
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
]);

const NOTICE =
  "예문(examples)은 Gemini 가 만들고 Claude 가 교차 검수한 것으로, 나중에 인도네시아 원어민 확인 대상입니다. " +
  "해설을 고치려면 이 파일을 직접 고치지 말고 scripts/gen-phrase-seed.mjs 로 다시 만들거나, 고친 항목을 _meta.edits 에 적으세요.";

/** peribahasa.ts 에서 내장 문장 목록을 읽습니다. */
function readStaticPhrases() {
  const text = fs.readFileSync(SRC, "utf8");
  const start = text.indexOf("const STATIC_PHRASES: Phrase[] = [");
  if (start < 0) throw new Error("STATIC_PHRASES 를 찾지 못했습니다");
  const end = text.indexOf("\n];", start);
  const body = text.slice(start, end);
  const line = new RegExp('\\{\\s*kind:\\s*"(\\w+)",\\s*id:\\s*("(?:[^"\\\\]|\\\\.)*"),\\s*ko:\\s*("(?:[^"\\\\]|\\\\.)*")\\s*\\}', "g");
  const list = [];
  let m;
  while ((m = line.exec(body)) !== null) {
    list.push({ kind: m[1], id: JSON.parse(m[2]), ko: JSON.parse(m[3]) });
  }
  return list;
}

function asString(v) {
  return typeof v === "string" ? v.trim() : "";
}

/** 응답을 앱이 쓰는 모양(meaning, examples[3], note)으로 다듬습니다. 모양이 틀리면 null. */
function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;
  const meaning = asString(raw.meaning);
  const examples = Array.isArray(raw.examples)
    ? raw.examples
        .map((e) => ({ id: asString(e && e.id), ko: asString(e && e.ko), situasi: asString(e && e.situasi) }))
        .filter((e) => e.id !== "")
    : [];
  const note = asString(raw.note);
  if (meaning === "") return null;
  if (examples.length !== 3) return null;
  if (examples.some((e) => e.ko === "" || e.situasi === "")) return null;
  return { meaning, examples, note };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(model, prompt, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 16384 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      let reason = "";
      try {
        const j = await res.json();
        reason = (j && j.error && (j.error.status || j.error.message)) || "";
      } catch (e) {}
      const err = new Error("HTTP_" + res.status + (reason ? " " + String(reason).slice(0, 120) : ""));
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content
      && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : "";
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/** 문장 하나. 모델 후보를 돌며, 일시 오류와 모양 불량은 몇 번 더 시도합니다. */
async function generateOne(phrase, key, state) {
  const prompt = buildPrompt(phrase.id, phrase.ko);
  for (let mi = state.modelIndex; mi < MODELS.length; mi += 1) {
    const model = MODELS[mi];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const raw = await callGemini(model, prompt, key);
        const out = normalize(raw);
        if (out) {
          state.modelIndex = mi;
          return { out, model };
        }
        console.log("  모양 불량, 다시 시도 (" + model + ")");
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (e && (e.status === 404)) { console.log("  " + model + " 없음 → 다음 모델"); break; }
        if (e && (e.status === 400 || e.status === 401 || e.status === 403)) throw new Error("키 또는 요청 오류: " + msg);
        console.log("  " + msg + " — 잠시 뒤 다시");
        await sleep(2500 * (attempt + 1));
      }
    }
  }
  throw new Error("모든 모델 실패: " + phrase.id);
}

function readExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch (e) {
    return null;
  }
}

function writeOut(phrases, prev, models) {
  const prevMeta = prev && prev._meta ? prev._meta : {};
  const meta = {
    notice: NOTICE,
    source: "scripts/gen-phrase-seed.mjs",
    generatedAt: new Date().toISOString().slice(0, 10),
    models: models.length > 0 ? models : prevMeta.models || [],
    reviewed: prevMeta.reviewed || "",
    edits: prevMeta.edits || [],
  };
  fs.writeFileSync(OUT, JSON.stringify({ _meta: meta, phrases }, null, 2) + "\n", "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.indexOf("--force") >= 0;
  const checkOnly = args.indexOf("--check") >= 0;

  const list = readStaticPhrases();
  const byKind = {};
  for (const p of list) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
  console.log("내장 문장 " + list.length + "개 읽음:", JSON.stringify(byKind));
  if (list.length !== 36 || byKind.peribahasa !== 22 || byKind.ungkapan !== 14) {
    throw new Error("내장 문장 수가 36(peribahasa 22 + ungkapan 14)이 아닙니다 — peribahasa.ts 가 바뀌었는지 확인하세요");
  }

  const prev = readExisting();
  const phrases = {};
  const prevPhrases = prev && prev.phrases ? prev.phrases : {};

  if (checkOnly) {
    let bad = 0;
    for (const p of list) {
      const e = prevPhrases[p.id];
      const ok = e && normalize(e) !== null;
      if (!ok) { bad += 1; console.log("없거나 모양이 틀림: " + p.id); }
    }
    console.log(bad === 0 ? "검사 통과: 36개 모두 모양이 맞습니다." : "검사 실패: " + bad + "개");
    process.exit(bad === 0 ? 0 : 1);
  }

  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    console.error("GEMINI_API_KEY 환경변수가 없습니다. 터미널에서 $env:GEMINI_API_KEY = \"...\" 로 설정한 뒤 다시 실행하세요.");
    process.exit(2);
  }

  const state = { modelIndex: 0 };
  const usedModels = [];
  let made = 0;
  for (const p of list) {
    const old = prevPhrases[p.id];
    if (!force && old && normalize(old) !== null) {
      phrases[p.id] = old;
      continue;
    }
    console.log("만드는 중 (" + (made + 1) + "): " + p.id);
    const { out, model } = await generateOne(p, key, state);
    if (usedModels.indexOf(model) < 0) usedModels.push(model);
    phrases[p.id] = { ko: p.ko, meaning: out.meaning, examples: out.examples, note: out.note };
    made += 1;
    writeOut(Object.assign({}, prevPhrases, phrases), prev, usedModels); // 한 문장마다 저장 — 중간에 끊겨도 이어서
    await sleep(400);
  }
  writeOut(phrases, prev, usedModels);
  console.log("끝: 새로 만든 것 " + made + "개, 전체 " + Object.keys(phrases).length + "개 → " + path.relative(ROOT, OUT));
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
