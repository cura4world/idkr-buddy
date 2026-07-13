// src/lib/dictionary.ts
// 인도네시아어 → 한국어 학습용 사전.
// 기존 gemini.ts의 API 키(localStorage "geminiApiKey")를 그대로 재사용합니다.
// 텍스트: 풍성한 사전 정보(JSON)를 생성.
// 이미지: 단어를 설명하는 그림을 실시간 생성(on-demand, 저장하지 않음).

import { getGeminiApiKey } from "@/lib/gemini";

// 텍스트 모델 (저렴/빠름). 필요시 이 값만 교체.
const TEXT_MODEL = "gemini-flash-lite-latest";

// 이미지 생성 모델 후보 (순서대로 시도, 실패하면 다음 후보로 폴백).
// 참고: https://ai.google.dev/gemini-api/docs/image-generation
const IMAGE_MODEL_CANDIDATES = [
  "gemini-3.1-flash-image", // Nano Banana 2 (최신 범용)
  "gemini-2.5-flash-image", // 구형 폴백 (무료 티어 지원)
];

export interface DictExample {
  id: string;      // 인도네시아어 예문
  ko: string;      // 한국어 번역
}

export interface DictFormItem {
  form: string;    // 활용형 (예: bercerita)
  meaning: string; // 뜻 (예: 이야기하다)
  example: string; // 인도네시아어 예문
  exampleKo: string; // 예문 한국어 번역
}

export interface DictSimilarItem {
  word: string;
  nuance: string;  // 뉘앙스 설명 (한국어)
}

export interface DictOppositeItem {
  word: string;
  meaning: string; // 한국어 뜻
  example: string;
  exampleKo: string;
}

export interface DictResult {
  word: string;              // 표제어
  meaning: string;           // 기본뜻 (이야기, 스토리)
  meaningDetail: string;     // → 풀어쓴 설명
  examples: DictExample[];   // 예문
  root: string;              // 어근
  affix: string;             // 접사
  register: string;          // 문어체/구어체
  etymology: string[];       // 단어 관련 배경 (여러 줄)
  activeForms: DictFormItem[];   // 능동형
  passiveForms: DictFormItem[];  // 수동형
  opposites: DictOppositeItem[]; // 반대 단어
  similar: DictSimilarItem[];    // 비슷한 단어
  frequency: number;         // 실제 회화 사용빈도 (1~5)
  difficulty: number;        // 난이도 (1~5)
  wordFamily: string;        // 같이 외우면 좋은 표현 (한 줄)
}

const PROMPT_HEADER =
  "당신은 한국인 학습자를 위한 인도네시아어-한국어 사전입니다.\n" +
  "다음 인도네시아어 단어/표현을 한국인이 깊이 이해하도록 아래 JSON으로만 출력하세요.\n" +
  "설명(meaning, nuance 등)은 모두 한국어로 작성합니다. 인도네시아어 예문에는 반드시 한국어 번역을 붙입니다.\n" +
  "마크다운이나 다른 텍스트 없이 순수 JSON 객체 하나만 출력합니다.\n\n";

function buildPrompt(word: string): string {
  return (
    PROMPT_HEADER +
    '단어: "' + word + '"\n\n' +
    "출력 형식:\n" +
    "{\n" +
    '  "word": "표제어",\n' +
    '  "meaning": "기본 뜻 (간결하게, 쉼표로 여러 뜻)",\n' +
    '  "meaningDetail": "그 뜻을 한 문장으로 풀어쓴 설명",\n' +
    '  "examples": [{"id": "인도네시아어 예문", "ko": "한국어 번역"}],\n' +
    '  "root": "어근 설명 (예: cerita (명사, \'이야기\'))",\n' +
    '  "affix": "접사 활용 설명",\n' +
    '  "register": "문어체/구어체 사용 설명",\n' +
    '  "etymology": ["단어 관련 배경/어원/문화적 쓰임 (짧은 문장 여러 개)"],\n' +
    '  "activeForms": [{"form": "활용형", "meaning": "뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "passiveForms": [{"form": "활용형", "meaning": "뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "opposites": [{"word": "반대어", "meaning": "한국어 뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "similar": [{"word": "비슷한 단어", "nuance": "뉘앙스 차이 (한국어)"}],\n' +
    '  "frequency": 5,\n' +
    '  "difficulty": 2,\n' +
    '  "wordFamily": "같이 외우면 좋은 표현들을 — 로 이은 한 줄"\n' +
    "}\n\n" +
    "주의:\n" +
    "- examples는 2개 정도, 자연스럽고 일상적인 문장으로.\n" +
    "- activeForms/passiveForms는 해당 단어에 실제로 존재하는 활용형만. 없으면 빈 배열 [].\n" +
    "- opposites는 명확한 반대어가 없으면 문맥상 대조되는 단어. 없으면 빈 배열.\n" +
    "- similar는 헷갈리기 쉬운 유의어 2~4개.\n" +
    "- frequency와 difficulty는 1~5 사이 정수.\n"
  );
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (isNaN(n)) return fallback;
  return Math.max(1, Math.min(5, n));
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// 인도네시아어 단어를 받아 풍성한 사전 데이터를 생성합니다.
export async function lookupWord(word: string): Promise<DictResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const trimmed = word.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TEXT_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(trimmed) }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    parsed = JSON.parse(match[0]);
  }

  return {
    word: (parsed.word || trimmed).toString().trim(),
    meaning: (parsed.meaning || "").toString().trim(),
    meaningDetail: (parsed.meaningDetail || "").toString().trim(),
    examples: arr<DictExample>(parsed.examples).map((e) => ({
      id: (e?.id || "").toString().trim(),
      ko: (e?.ko || "").toString().trim(),
    })),
    root: (parsed.root || "").toString().trim(),
    affix: (parsed.affix || "").toString().trim(),
    register: (parsed.register || "").toString().trim(),
    etymology: arr<string>(parsed.etymology).map((s) => (s || "").toString().trim()).filter(Boolean),
    activeForms: arr<DictFormItem>(parsed.activeForms).map((f) => ({
      form: (f?.form || "").toString().trim(),
      meaning: (f?.meaning || "").toString().trim(),
      example: (f?.example || "").toString().trim(),
      exampleKo: (f?.exampleKo || "").toString().trim(),
    })),
    passiveForms: arr<DictFormItem>(parsed.passiveForms).map((f) => ({
      form: (f?.form || "").toString().trim(),
      meaning: (f?.meaning || "").toString().trim(),
      example: (f?.example || "").toString().trim(),
      exampleKo: (f?.exampleKo || "").toString().trim(),
    })),
    opposites: arr<DictOppositeItem>(parsed.opposites).map((o) => ({
      word: (o?.word || "").toString().trim(),
      meaning: (o?.meaning || "").toString().trim(),
      example: (o?.example || "").toString().trim(),
      exampleKo: (o?.exampleKo || "").toString().trim(),
    })),
    similar: arr<DictSimilarItem>(parsed.similar).map((s) => ({
      word: (s?.word || "").toString().trim(),
      nuance: (s?.nuance || "").toString().trim(),
    })),
    frequency: num(parsed.frequency, 3),
    difficulty: num(parsed.difficulty, 3),
    wordFamily: (parsed.wordFamily || "").toString().trim(),
  };
}

// 단어를 설명하는 이미지를 실시간 생성합니다. 결과는 data URL(base64).
// 저장하지 않고 화면 표시용으로만 사용합니다.
// 모델 후보를 순서대로 시도해, 하나가 실패(모델명 변경/권한/한도)해도 다음 후보로 넘어갑니다.
export async function generateWordImage(word: string, meaning: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const trimmed = word.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const imgPrompt =
    "A simple, clean, friendly illustration that visually explains the meaning of the " +
    'Indonesian word "' + trimmed + '"' +
    (meaning ? " (meaning: " + meaning + ")" : "") +
    ". Minimal flat style, soft colors, no text or letters in the image, easy to understand at a glance.";

  let lastStatus = 0;

  for (const model of IMAGE_MODEL_CANDIDATES) {
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imgPrompt }] }],
        }),
      });
    } catch (e) {
      lastStatus = -1; // 네트워크 오류
      continue;
    }

    if (!res.ok) {
      lastStatus = res.status;
      continue; // 다음 후보 모델로
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p?.inlineData || p?.inline_data;
      if (inline?.data) {
        const mime = inline.mimeType || inline.mime_type || "image/png";
        return "data:" + mime + ";base64," + inline.data;
      }
    }
    lastStatus = 200; // 응답은 왔지만 이미지가 없음 → 다음 후보 시도
  }

  if (lastStatus === 429) throw new Error("RATE_LIMIT");
  if (lastStatus === 200) throw new Error("NO_IMAGE");
  throw new Error("IMAGE_FAILED_" + lastStatus);
}
