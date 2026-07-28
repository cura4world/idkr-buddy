// src/lib/phrase.ts
// "오늘의 인도네시아어" 문장의 상세 해설을 만들고 IndexedDB에 영구 보관합니다.
// 한 번 만든 문장은 다시 만들지 않으므로 재과금이 0입니다.

import { getGeminiApiKey } from "@/lib/gemini";

const TEXT_MODEL = "gemini-flash-lite-latest";

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

export interface PhraseDetail {
  sentence: string;
  ko: string;
  meaning: string;      // 뜻풀이
  words: PhraseWord[];
  examples: PhraseExample[];
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
    });
  } catch (e) {
    /* 무시 */
  }
}

/* ── Gemini ── */

function buildPrompt(sentence: string, ko: string): string {
  return [
    "당신은 한국인에게 인도네시아어를 가르치는 선생님입니다.",
    "아래 인도네시아어 문장을 한국인 학습자가 이해할 수 있도록 풀어서 설명하세요.",
    "",
    "문장: " + sentence,
    "참고 뜻: " + ko,
    "",
    "규칙:",
    "- 설명은 모두 한국어로, 존댓말로 씁니다.",
    "- 예문은 실제 인도네시아 사람이 일상에서 쓰는 자연스러운 문장으로 3개 만듭니다.",
    "- 예문은 쉬운 단어를 쓰고, 각 예문이 어떤 상황인지 한국어로 짧게 덧붙입니다.",
    "- 단어 풀이는 문장에서 핵심이 되는 것만 3~5개 고릅니다.",
    "- arti 항목은 쉬운 인도네시아어로 된 뜻풀이입니다.",
    "",
    "아래 JSON 형식으로만 답하세요.",
    '{',
    '  "meaning": "이 표현이 실제로 뜻하는 바와 언제 쓰는지 2~3문장 (한국어)",',
    '  "words": [{"word": "단어", "arti": "쉬운 인니어 뜻풀이", "ko": "한국어 뜻"}],',
    '  "examples": [{"id": "인니어 예문", "ko": "한국어 해석", "situasi": "어떤 상황인지 한국어로 짧게"}],',
    '  "note": "함께 알아두면 좋은 점 1~2문장 (한국어)"',
    '}',
  ].join("\n");
}

async function callGeminiJSON(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TEXT_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("EMPTY_RESPONSE");
  return JSON.parse(text) as Record<string, unknown>;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * 캐시에 있으면 즉시 돌려주고, 없으면 생성한 뒤 저장합니다.
 * force가 true면 캐시를 무시하고 새로 만듭니다.
 */
export async function getPhraseDetail(
  sentence: string,
  ko: string,
  force = false
): Promise<PhraseDetail> {
  if (!force) {
    const cached = await getCachedPhrase(sentence);
    if (cached) return cached;
  }

  const raw = await callGeminiJSON(buildPrompt(sentence, ko));

  const words: PhraseWord[] = Array.isArray(raw.words)
    ? (raw.words as Record<string, unknown>[])
        .map((w) => ({ word: asString(w.word), arti: asString(w.arti), ko: asString(w.ko) }))
        .filter((w) => w.word !== "")
    : [];

  const examples: PhraseExample[] = Array.isArray(raw.examples)
    ? (raw.examples as Record<string, unknown>[])
        .map((e) => ({ id: asString(e.id), ko: asString(e.ko), situasi: asString(e.situasi) }))
        .filter((e) => e.id !== "")
    : [];

  const detail: PhraseDetail = {
    sentence,
    ko,
    meaning: asString(raw.meaning),
    words,
    examples,
    note: asString(raw.note),
    createdAt: Date.now(),
  };

  await savePhrase(detail);
  return detail;
}
