// src/lib/phrase.ts
// "오늘의 인도네시아어" 문장의 상세 해설을 만들고 IndexedDB에 영구 보관합니다.
// 한 번 만든 문장은 다시 만들지 않으므로 재과금이 0입니다.

import { callGeminiJSON } from "@/lib/geminiText";
import type { AiKind } from "@/lib/aiProxy";
import { NOTE_RULE, NOTE_FIELD, buildPrompt } from "@/lib/phrasePrompt";

const DB_NAME = "kata-phrases";
const DB_VERSION = 1;
const STORE = "items";
const MAX_ITEMS = 1000;

export interface PhraseWord {
  word: string;   // 인니어 단어
  arti: string;   // 인니어 뜻풀이(쉬운 인니어)
  ko: string;     // 한국어 뜻
}

export interface PhraseExample {
  id: string;     // 인니어 예문
  ko: string;     // 한국어 해석
  situasi: string; // 어떤 상황인지 (한국어)
}

export interface PhraseAnalysisPart {
  part: string;   // 인니어 구절
  ko: string;     // 한국어 번역
  note: string;   // 문법 설명 (한국어)
}

export interface PhraseDetail {
  sentence: string;
  ko: string;
  meaning: string;      // 뜻풀이
  words: PhraseWord[];
  examples: PhraseExample[];
  analysis?: PhraseAnalysisPart[]; // alkitab 전용 문장분석
  note: string;         // 알아두기
  createdAt: number;
}

/* ── IndexedDB ── */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "sentence" });
        s.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedPhrase(sentence: string): Promise<PhraseDetail | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(sentence);
      req.onsuccess = () => resolve((req.result as PhraseDetail) || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function savePhrase(detail: PhraseDetail): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(detail);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    await trimOldest();
  } catch (e) {
    /* 저장 실패는 무시합니다 */
  }
}

async function trimOldest(): Promise<void> {
  try {
    const db = await openDB();
    const count: number = await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
    if (count <= MAX_ITEMS) return;
    const remove = count - MAX_ITEMS;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const idx = tx.objectStore(STORE).index("createdAt");
      let done = 0;
      idx.openCursor().onsuccess = (ev: any) => {
        const cur = ev.target.result;
        if (!cur || done >= remove) { resolve(); return; }
        cur.delete();
        done += 1;
        cur.continue();
      };
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (e) {
    /* 무시 */
  }
}

/* ── Gemini ── */

// 문장 해설 프롬프트(buildPrompt)와 note 규칙(NOTE_RULE·NOTE_FIELD)은 src/lib/phrasePrompt.ts 에 있습니다.
// 미리 만들기 스크립트(scripts/gen-phrase-seed.mjs)가 같은 프롬프트를 쓰도록 한 곳에 모았습니다.

function buildPromptAyat(sentence: string, ko: string): string {
  return [
    "당신은 한국인에게 인도네시아어를 가르치는 선생님입니다.",
    "아래 인도네시아어 성경 구절을 한국인 학습자가 이해할 수 있도록 분석하세요.",
    "",
    "구절: " + sentence,
    "한국어 참고: " + ko,
    "",
    "규칙:",
    "- 설명은 모두 한국어로, 존댓말로 씁니다.",
    "- 문장분석: 구절을 의미 단위로 3~6개로 나누어 각 부분의 한국어 번역과 문법적 역할을 설명합니다.",
    "- 단어 풀이는 핵심 단어 3~5개만 고릅니다.",
    "- arti 항목은 쉬운 인도네시아어로 된 뜻풀이입니다.",
    "",
    "아래 JSON 형식으로만 답하세요.",
    '{',
    '  "meaning": "이 구절이 전달하는 핵심 메시지 2~3문장 (한국어)",',
    '  "words": [{"word": "단어", "arti": "쉬운 인니어 뜻풀이", "ko": "한국어 뜻"}],',
    '  "analysis": [{"part": "인니어 구절", "ko": "한국어 번역", "note": "문법적 역할과 의미 설명 (한국어)"}],',
    '  "note": "이 구절에 대해 알아두면 좋은 점 1~2문장 (한국어)"',
    '}',
  ].join("\n");
}

/* 새 문장을 고르는 것부터 해설까지 한 번에 받습니다 (미리 받아두기용). */
function buildCreatePrompt(guide: string, recent: string[]): string {
  return [
    "당신은 한국인에게 인도네시아어를 가르치는 선생님입니다.",
    "조건에 맞는 인도네시아어 문장을 하나 새로 고르고, 한국인 학습자를 위한 해설까지 함께 만드세요.",
    "",
    guide,
    "",
    "규칙:",
    "- 설명은 모두 한국어로, 존댓말로 씁니다.",
    "- 교재마다 나오는 뻔한 표현보다, 실제로 자주 쓰이는데 한국인에게는 덜 알려진 것을 우선합니다.",
    "- 예문은 실제 인도네시아 사람이 일상에서 쓰는 자연스러운 문장으로 3개 만듭니다.",
    "- 예문은 쉬운 단어를 쓰고, 각 예문이 어떤 상황인지 한국어로 짧게 덧붙입니다.",
    "- 아래 문장은 최근에 이미 다뤘으니 반드시 피하고, 겹치지 않는 새 문장을 고르세요.",
    "  최근 문장: " + (recent.length > 0 ? recent.join(" / ") : "없음"),
    NOTE_RULE,
    "",
    "아래 JSON 형식으로만 답하세요.",
    '{',
    '  "id": "인도네시아어 문장",',
    '  "ko": "이 문장의 한국어 뜻 한 줄",',
    '  "meaning": "이 표현이 실제로 뜻하는 바와 언제 쓰는지 2~3문장 (한국어)",',
    '  "examples": [{"id": "인니어 예문", "ko": "한국어 해석", "situasi": "어떤 상황인지 한국어로 짧게"}],',
    NOTE_FIELD,
    '}',
  ].join("\n");
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseExamples(v: unknown): PhraseExample[] {
  return Array.isArray(v)
    ? (v as Record<string, unknown>[])
        .map((e) => ({ id: asString(e.id), ko: asString(e.ko), situasi: asString(e.situasi) }))
        .filter((e) => e.id !== "")
    : [];
}

/** 문장 뽑기 쪽에서 쓰는 범용 JSON 호출 (성경 구절 고르기 등) */
export async function askPhraseJSON(prompt: string): Promise<Record<string, unknown>> {
  return callGeminiJSON(prompt, { kind: "phrase" });
}

export interface GeneratedPhrase {
  id: string;   // 인도네시아어 문장
  ko: string;   // 한국어 뜻
}

/**
 * 새 문장과 해설을 한 번의 호출로 만들고, 해설은 캐시에 넣어 둡니다.
 * 나중에 그 문장의 상세 화면을 열면 캐시에서 바로 나옵니다.
 */
export async function generateNewPhrase(
  guide: string,
  recent: string[]
): Promise<GeneratedPhrase> {
  // 오늘의 문장 새로 만들기 — 공개판 서버의 "오늘의 문장" 한도(무료 하루 1)로 셉니다.
  const raw = await callGeminiJSON(buildCreatePrompt(guide, recent), { kind: "phrase" });
  const id = asString(raw.id);
  if (id === "") throw new Error("EMPTY_RESPONSE");
  const ko = asString(raw.ko);

  // 해설(뜻풀이)이 비어 왔으면 캐시에 넣지 않습니다 — 넣으면 상세 화면이 빈 해설을 계속 보여 줍니다(C-24).
  // 문장 자체는 쓸 수 있으므로 돌려주고, 해설은 상세 화면을 열 때 getPhraseDetail 이 새로 만듭니다.
  const meaning = asString(raw.meaning);
  if (meaning !== "") {
    await savePhrase({
      sentence: id,
      ko,
      meaning,
      words: [],
      examples: parseExamples(raw.examples),
      note: asString(raw.note),
      createdAt: Date.now(),
    });
  }

  return { id, ko };
}

/* ── 앱에 담아 둔 내장 문장 해설 (AI 호출 없이 첫 화면이 열리게) ── */

interface SeedEntry {
  ko: string;
  meaning: string;
  examples: unknown;
  note: string;
}

// 번들 크기를 아끼려고 처음 필요할 때 한 번만 불러옵니다(지연 import → 따로 내려받는 조각).
let seedPromise: Promise<Record<string, SeedEntry>> | null = null;

function loadSeed(): Promise<Record<string, SeedEntry>> {
  if (!seedPromise) {
    seedPromise = import("@/data/phrase-seed.json")
      .then((m: any) => ((m.default || m).phrases || {}) as Record<string, SeedEntry>)
      .catch(() => {
        seedPromise = null; // 다음에 다시 시도
        return {} as Record<string, SeedEntry>;
      });
  }
  return seedPromise;
}

/** 내장 문장이면 미리 만들어 둔 해설을 돌려줍니다. 없으면 null. */
async function getSeededPhrase(sentence: string, ko: string): Promise<PhraseDetail | null> {
  const seed = await loadSeed();
  if (!Object.prototype.hasOwnProperty.call(seed, sentence)) return null;
  const e = seed[sentence];
  const examples = parseExamples(e.examples);
  if (!e.meaning || examples.length === 0) return null;
  return {
    sentence,
    ko: ko || e.ko || "",
    meaning: e.meaning,
    words: [],
    examples,
    note: e.note || "",
    createdAt: Date.now(),
  };
}

/**
 * 폰 저장소(캐시)에 있으면 즉시 돌려주고, 없으면 앱에 담긴 내장 문장 해설(seed)을 찾고,
 * 그것도 없으면 AI 로 생성한 뒤 저장합니다. 순서: IndexedDB 캐시 → seed → AI.
 * force가 true면 캐시와 seed 를 무시하고 AI 로 새로 만듭니다("다시 받기").
 * 성경 구절(kind "alkitab")은 seed 대상이 아닙니다.
 * kind가 "alkitab"이면 문장분석 프롬프트를 사용합니다.
 * aiKind: 공개판 서버가 셀 기능 이름. 새 문장을 미리 만드는 길(peribahasa.ts)은 "phrase",
 *         상세 화면에서 처음 여는 해설은 기본값 "text".
 */
export async function getPhraseDetail(
  sentence: string,
  ko: string,
  force = false,
  kind = "",
  aiKind: AiKind = "text"
): Promise<PhraseDetail> {
  const isAyat = kind === "alkitab";
  if (!force) {
    const cached = await getCachedPhrase(sentence);
    // alkitab 구절인데 analysis 필드가 없는 구캐시는 다시 생성합니다.
    // 뜻풀이가 빈 채로 저장된 예전 캐시도 없는 것으로 보고 다시 만듭니다(C-24).
    if (cached && asString(cached.meaning) !== "" && !(isAyat && cached.analysis === undefined)) return cached;
    if (!isAyat) {
      const seeded = await getSeededPhrase(sentence, ko);
      if (seeded) {
        await savePhrase(seeded); // 다음부터는 IndexedDB 에서 바로
        return seeded;
      }
    }
  }

  const raw = await callGeminiJSON(isAyat ? buildPromptAyat(sentence, ko) : buildPrompt(sentence, ko), { kind: aiKind });

  const words: PhraseWord[] = isAyat && Array.isArray(raw.words)
    ? (raw.words as Record<string, unknown>[])
        .map((w) => ({ word: asString(w.word), arti: asString(w.arti), ko: asString(w.ko) }))
        .filter((w) => w.word !== "")
    : [];

  const analysis: PhraseAnalysisPart[] = isAyat && Array.isArray(raw.analysis)
    ? (raw.analysis as Record<string, unknown>[])
        .map((a) => ({ part: asString(a.part), ko: asString(a.ko), note: asString(a.note) }))
        .filter((a) => a.part !== "")
    : [];

  // AI 가 뜻풀이가 빈 JSON 을 주면 저장하지 않고 실패로 알립니다(C-24). 화면은 "다시 시도"를 보입니다.
  const meaning = asString(raw.meaning);
  if (meaning === "") throw new Error("EMPTY_RESPONSE");

  const detail: PhraseDetail = {
    sentence,
    ko,
    meaning,
    words,
    examples: parseExamples(raw.examples),
    ...(isAyat ? { analysis } : {}),
    note: asString(raw.note),
    createdAt: Date.now(),
  };

  await savePhrase(detail);
  return detail;
}
