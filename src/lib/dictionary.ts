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

// 능동형/수동형/반대/비슷한/파생 단어 모두 이 통일 구조를 사용합니다.
export interface DictRelatedItem {
  word: string;      // 인도네시아어 단어/활용형
  meaning: string;   // 한국어 뜻(또는 뉘앙스 설명)
  example: string;   // 인도네시아어 예문
  exampleKo: string; // 예문 한국어 해석
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
  activeForms: DictRelatedItem[];   // 능동형
  passiveForms: DictRelatedItem[];  // 수동형
  opposites: DictRelatedItem[];     // 반대 단어
  similar: DictRelatedItem[];       // 비슷한 단어
  derived: DictRelatedItem[];       // 파생 단어 (구 wordFamily)
  frequency: number;         // 실제 회화 사용빈도 (1~5)
  difficulty: number;        // 난이도 (1~5)
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
    '  "activeForms": [{"word": "활용형", "meaning": "뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "passiveForms": [{"word": "활용형", "meaning": "뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "opposites": [{"word": "반대어", "meaning": "한국어 뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "similar": [{"word": "비슷한 단어", "meaning": "뉘앙스 차이 (한국어)", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "derived": [{"word": "파생 단어", "meaning": "한국어 뜻", "example": "인니어 예문", "exampleKo": "한국어 번역"}],\n' +
    '  "frequency": 5,\n' +
    '  "difficulty": 2\n' +
    "}\n\n" +
    "주의:\n" +
    "- examples는 2개 정도, 자연스럽고 일상적인 문장으로.\n" +
    "- activeForms/passiveForms/opposites/similar/derived의 각 항목마다 word, meaning, example, exampleKo를 모두 채우세요.\n" +
    "- activeForms/passiveForms는 해당 단어에 실제로 존재하는 활용형만. 없으면 빈 배열 [].\n" +
    "- opposites는 명확한 반대어가 없으면 문맥상 대조되는 단어. 없으면 빈 배열.\n" +
    "- similar는 헷갈리기 쉬운 유의어 2~4개. meaning에는 뉘앙스 차이를 적으세요.\n" +
    "- derived는 어근이 같은 파생어(접두/접미 파생) 2~4개.\n" +
    "- frequency와 difficulty는 1~5 사이 정수.\n" +
    "- word(표제어)는 반드시 소문자 기본형으로 출력하세요. 입력이 대문자로 시작해도 소문자로 바꿉니다.\n" +
    "- 단, 고유명사(국가/도시/사람/요일/월/종교/언어 등 인도네시아어 맞춤법상 항상 대문자로 쓰는 단어)는 원래 표기를 유지하세요.\n"
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

// 능동형/수동형/반대/비슷한/파생 단어를 통일 구조로 파싱.
// (구버전 호환: form/nuance 필드도 word/meaning으로 흡수)
function relatedItems(v: unknown): DictRelatedItem[] {
  return arr<any>(v).map((r) => ({
    word: (r?.word || r?.form || "").toString().trim(),
    meaning: (r?.meaning || r?.nuance || "").toString().trim(),
    example: (r?.example || "").toString().trim(),
    exampleKo: (r?.exampleKo || "").toString().trim(),
  })).filter((r) => r.word);
}

// \uD45C\uC81C\uC5B4 \uC815\uADDC\uD654: \uACE0\uC720\uBA85\uC0AC\uAC00 \uC544\uB2C8\uBA74 \uC804\uBD80 \uC18C\uBB38\uC790\uB85C.
// (Gemini\uAC00 1\uCC28\uB85C \uD310\uB2E8\uD558\uACE0, \uC5EC\uAE30\uC11C\uB294 "\uCCAB \uAE00\uC790\uB9CC \uB300\uBB38\uC790 + \uB098\uBA38\uC9C0 \uC18C\uBB38\uC790"\uB77C\uB294
//  \uC785\uB825 \uC2B5\uAD00\uC5D0\uC11C \uC628 \uB300\uBB38\uC790\uB9CC \uB0B4\uB9BD\uB2C8\uB2E4. \uACE0\uC720\uBA85\uC0AC \uBAA9\uB85D\uC740 \uC790\uC8FC \uC4F0\uB294 \uAC83\uB9CC.)
const PROPER_NOUNS = new Set([
  "indonesia", "jakarta", "bali", "korea", "seoul", "jawa", "sumatera", "sulawesi",
  "kalimantan", "papua", "bandung", "surabaya", "yogyakarta", "medan", "semarang",
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu",
  "januari", "februari", "maret", "april", "mei", "juni", "juli",
  "agustus", "september", "oktober", "november", "desember",
  "islam", "kristen", "katolik", "hindu", "buddha", "allah", "tuhan",
  "ramadan", "idul", "natal", "lebaran", "pancasila", "asia", "amerika", "eropa",
]);

function normalizeHeadword(w: string): string {
  const t = w.trim();
  if (!t) return t;
  // \uC804\uBD80 \uB300\uBB38\uC790 \uC57D\uC5B4(RI, KTP \uB4F1)\uB294 \uADF8\uB300\uB85C \uB458\uB2E4.
  if (t === t.toUpperCase() && t !== t.toLowerCase()) return t;
  // \uACF5\uBC31 \uD3EC\uD568 \uD45C\uD604\uC740 \uB2E8\uC5B4\uBCC4\uB85C \uD310\uB2E8.
  return t
    .split(new RegExp("(\\s+)"))
    .map((part) => {
      if (!part.trim()) return part;
      const lower = part.toLowerCase();
      const bare = lower.replace(new RegExp("[^a-z\\u00E0-\\u024F-]", "g"), "");
      if (PROPER_NOUNS.has(bare)) return part;
      return lower;
    })
    .join("");
}

// \uC778\uB3C4\uB124\uC2DC\uC544\uC5B4 \uB2E8\uC5B4\uB97C \uBC1B\uC544 \uD48D\uC131\uD55C \uC0AC\uC804 \uB370\uC774\uD130\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4.
// ---- 입력 유형 판별 ----
// 한글이 하나라도 있으면 한국어, 없으면 인도네시아어.
// 공백으로 나눈 토큰이 2개 이하면 "단어", 3개 이상이면 "문장".
export type InputKind = "id_word" | "id_sentence" | "ko_word" | "ko_sentence";

export function detectInputKind(raw: string): InputKind {
  const text = raw.trim();
  const hasHangul = new RegExp("[\\uAC00-\\uD7A3\\u1100-\\u11FF\\u3130-\\u318F]").test(text);
  const tokens = text.split(new RegExp("\\s+")).filter(Boolean);
  const isSentence = tokens.length >= 3 || new RegExp("[.!?\\u2026]").test(text);
  if (hasHangul) return isSentence ? "ko_sentence" : "ko_word";
  return isSentence ? "id_sentence" : "id_word";
}

// ---- 공통 Gemini JSON 호출 ----
async function callGeminiJSON(prompt: string, temperature = 0.4): Promise<Record<string, unknown>> {
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
      generationConfig: {
        temperature,
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

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    return JSON.parse(match[0]);
  }
}

export async function lookupWord(word: string): Promise<DictResult> {
  const trimmed = word.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const parsed = await callGeminiJSON(buildPrompt(trimmed));

  return {
    word: normalizeHeadword((parsed.word || trimmed).toString().trim()),
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
    activeForms: relatedItems(parsed.activeForms),
    passiveForms: relatedItems(parsed.passiveForms),
    opposites: relatedItems(parsed.opposites),
    similar: relatedItems(parsed.similar),
    derived: relatedItems(parsed.derived),
    frequency: num(parsed.frequency, 3),
    difficulty: num(parsed.difficulty, 3),
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

// ============================================================
// (2) 인도네시아어 문장 → 끊어읽기 + 단어 분석 + 문장 구조
// ============================================================
export interface SentenceChunk {
  id: string;   // 인니어 조각 (호흡 단위)
  ko: string;   // 그 조각의 한국어 뜻
}

// 단어 분석 항목
export interface WordAnalysisItem {
  word: string;      // Dia / berjalan / keliling kota ...
  meaning: string;   // 그, 그녀 / 걷다, 걸어가다
  points: string[];  // 불릿 설명 (기본형: jalan 길, 걷다 / ber- + jalan → berjalan 걷다)
  note: string;      // 불릿 아래 보충 문장 (없으면 "")
}

// 더 자연스러운 표현 (선택)
export interface NaturalRewrite {
  id: string;   // 인니어 문장
  ko: string;   // 한국어 번역
}

// 핵심 문형 (선택)
export interface KeyPattern {
  pattern: string;   // mendorong + 사람 + untuk + 동사
  meaning: string;   // 사람이 ~하도록 격려하다 / 촉진하다
}

export interface IdSentenceResult {
  original: string;                 // 입력 문장 (정제)
  translation: string;              // 전체 한국어 번역
  chunks: SentenceChunk[];          // 끊어읽기 (호흡 단위)
  wordAnalysis: WordAnalysisItem[]; // 단어 분석
  natural: NaturalRewrite;          // 더 자연스러운 표현 (없으면 빈 값)
  patterns: KeyPattern[];           // 핵심 문형 (없으면 빈 배열)
}

export async function analyzeIdSentence(sentence: string): Promise<IdSentenceResult> {
  const trimmed = sentence.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const prompt =
    "\uB2F9\uC2E0\uC740 \uD55C\uAD6D\uC778 \uD559\uC2B5\uC790\uB97C \uC704\uD55C \uC778\uB3C4\uB124\uC2DC\uC544\uC5B4 \uBB38\uC7A5 \uBD84\uC11D\uAE30\uC785\uB2C8\uB2E4.\n" +
    "\uC544\uB798 \uC778\uB3C4\uB124\uC2DC\uC544\uC5B4 \uBB38\uC7A5\uC744 \uBD84\uC11D\uD574 JSON\uC73C\uB85C\uB9CC \uCD9C\uB825\uD558\uC138\uC694. \uC124\uBA85\uC740 \uBAA8\uB450 \uD55C\uAD6D\uC5B4.\n\n" +
    '\uBB38\uC7A5: "' + trimmed + '"\n\n' +
    "\uCD9C\uB825 \uD615\uC2DD:\n" +
    "{\n" +
    '  "original": "\uC785\uB825 \uBB38\uC7A5\uC744 \uADF8\uB300\uB85C(\uB9DE\uCDA4\uBC95\uB9CC \uC815\uC81C)",\n' +
    '  "translation": "\uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uD55C\uAD6D\uC5B4 \uC804\uCCB4 \uBC88\uC5ED",\n' +
    '  "chunks": [{"id": "\uC778\uB2C8\uC5B4 \uC870\uAC01", "ko": "\uADF8 \uC870\uAC01\uC758 \uD55C\uAD6D\uC5B4 \uB73B"}],\n' +
    '  "wordAnalysis": [{"word": "\uB2E8\uC5B4/\uB369\uC5B4\uB9AC", "meaning": "\uD55C\uAD6D\uC5B4 \uB73B", "points": ["\uBD88\uB9BF \uC124\uBA85"], "note": "\uBCF4\uCDA9 \uC124\uBA85(\uC5C6\uC73C\uBA74 \uBE48 \uBB38\uC790\uC5F4)"}],\n' +
    '  "natural": {"id": "\uB354 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC778\uB2C8\uC5B4 \uBB38\uC7A5", "ko": "\uADF8 \uD55C\uAD6D\uC5B4 \uBC88\uC5ED"},\n' +
    '  "patterns": [{"pattern": "\uD575\uC2EC \uBB38\uD615 (\uC608: mendorong + \uC0AC\uB78C + untuk + \uB3D9\uC0AC)", "meaning": "\uADF8 \uBB38\uD615\uC758 \uD55C\uAD6D\uC5B4 \uC758\uBBF8"}]\n' +
    "}\n\n" +
    "\uC8FC\uC758:\n" +
    "- chunks\uB294 '\uB05D\uC5B4\uC77D\uAE30'\uC785\uB2C8\uB2E4. \uC18C\uB9AC \uB0B4\uC5B4 \uC77D\uC744 \uB54C \uD638\uD761 \uB2E8\uC704\uB85C\uB9CC \uB098\uB204\uC138\uC694 (\uBCF4\uD1B5 2~4\uC870\uAC01).\n" +
    "- chunks\uC758 ko\uB294 \uD55C\uAD6D\uC5B4 \uC5B4\uC21C\uC73C\uB85C \uC77D\uC5C8\uC744 \uB54C \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC21C\uC11C\uB85C \uC791\uC131\uD558\uC138\uC694.\n" +
    "- wordAnalysis\uB294 \uBB38\uC7A5\uC5D0 \uB098\uC624\uB294 \uC21C\uC11C\uB300\uB85C, \uB2E8\uC5B4 \uB610\uB294 \uC758\uBBF8 \uB369\uC5B4\uB9AC(\uC608: keliling kota) \uB2E8\uC704\uB85C \uBAA8\uB450 \uB123\uC73C\uC138\uC694.\n" +
    "- points\uC5D0\uB294 \uAE30\uBCF8\uD615(\uC5B4\uADFC), \uC811\uC0AC \uACB0\uD569 \uACFC\uC815(\uC608: ber- + jalan \u2192 berjalan \uAC77\uB2E4), \uC5F0\uC5B4/\uD30C\uC0DD\uC5B4 \uB4F1\uC744 \uC9E7\uAC8C \uC801\uC73C\uC138\uC694. \uC124\uBA85\uD560 \uAC8C \uC5C6\uC73C\uBA74 \uBE48 \uBC30\uC5F4 [].\n" +
    "- note\uB294 \uBB38\uBC95\uC801\uC73C\uB85C \uB354 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uB300\uC548 \uB4F1 \uBCF4\uCDA9 \uC124\uBA85\uC774 \uD544\uC694\uD560 \uB54C\uB9CC. \uC5C6\uC73C\uBA74 \uBE48 \uBB38\uC790\uC5F4.\n" +
    "- natural\uC740 \uC6D0\uBB38\uBCF4\uB2E4 \uB354 \uC790\uC5F0\uC2A4\uB7FD\uAC70\uB098 \uBB38\uBC95\uC801\uC73C\uB85C \uB354 \uC644\uC804\uD55C \uD45C\uD604\uC774 \uC788\uC73C\uBA74 \uBC18\uB4DC\uC2DC \uCC44\uC6B0\uC138\uC694. \uC6D0\uBB38\uC774 \uC774\uBBF8 \uC644\uBCBD\uD558\uBA74 id\uC640 ko \uBAA8\uB450 \uBE48 \uBB38\uC790\uC5F4\uB85C \uB450\uC138\uC694.\n" +
    "- patterns\uB294 \uC774 \uBB38\uC7A5\uC5D0\uC11C \uBC30\uC6B8 \uB9CC\uD55C \uD575\uC2EC \uBB38\uD615 1~2\uAC1C\uC785\uB2C8\uB2E4. pattern\uC5D0\uB294 \uC778\uB3C4\uB124\uC2DC\uC544\uC5B4 \uBF08\uB300\uB97C +\uB85C \uC5F0\uACB0\uD574 \uC801\uACE0(\uC608: mendorong + \uC0AC\uB78C + untuk + \uB3D9\uC0AC), meaning\uC5D0\uB294 \uADF8 \uBB38\uD615\uC758 \uD55C\uAD6D\uC5B4 \uC758\uBBF8\uB97C \uC801\uC73C\uC138\uC694. \uBC30\uC6B8 \uBB38\uD615\uC774 \uC5C6\uC73C\uBA74 \uBE48 \uBC30\uC5F4 [].\n";

  const parsed = await callGeminiJSON(prompt);
  return {
    original: (parsed.original || trimmed).toString().trim(),
    translation: (parsed.translation || "").toString().trim(),
    chunks: arr<SentenceChunk>(parsed.chunks).map((c) => ({
      id: (c?.id || "").toString().trim(),
      ko: (c?.ko || "").toString().trim(),
    })).filter((c) => c.id),
    wordAnalysis: arr<any>(parsed.wordAnalysis).map((w) => ({
      word: (w?.word || "").toString().trim(),
      meaning: (w?.meaning || "").toString().trim(),
      points: arr<string>(w?.points).map((p) => (p || "").toString().trim()).filter(Boolean),
      note: (w?.note || "").toString().trim(),
    })).filter((w) => w.word),
    natural: {
      id: ((parsed.natural as any)?.id || "").toString().trim(),
      ko: ((parsed.natural as any)?.ko || "").toString().trim(),
    },
    patterns: arr<any>(parsed.patterns).map((p) => ({
      pattern: (p?.pattern || "").toString().trim(),
      meaning: (p?.meaning || "").toString().trim(),
    })).filter((p) => p.pattern),
  };
}

export interface HardWord {
  word: string;    // 인니어 단어
  meaning: string; // 간략한 한국어 뜻
}

// ============================================================
// (3) 한국어 단어 → 대응 인니어 단어들 (빈도순) + 뜻/뉘앙스/상황/발음
// ============================================================
export interface KoWordCandidate {
  id: string;         // 인도네시아어 단어
  pron: string;       // 발음(한글 근사 표기)
  meaning: string;    // 간략한 뜻
  nuance: string;     // 뉘앙스
  situation: string;  // 사용 상황
  example: string;    // 인도네시아어 예문
  exampleKo: string;  // 예문 한국어 해석
}
export interface KoWordResult {
  query: string;              // 입력 한국어 단어
  candidates: KoWordCandidate[]; // 빈도순
}

export async function lookupKoWord(word: string): Promise<KoWordResult> {
  const trimmed = word.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const prompt =
    "당신은 한국인 학습자를 위한 한국어→인도네시아어 사전입니다.\n" +
    "아래 한국어 단어에 대응하는 인도네시아어 단어들을 JSON으로만 출력하세요. 설명은 모두 한국어.\n\n" +
    '단어: "' + trimmed + '"\n\n' +
    "출력 형식:\n" +
    "{\n" +
    '  "query": "입력 단어",\n' +
    '  "candidates": [\n' +
    '    {"id": "인니어 단어", "pron": "발음(한글 근사 표기)", "meaning": "간략한 뜻", "nuance": "뉘앙스", "situation": "이 단어를 쓰는 상황", "example": "그 단어를 쓴 인니어 예문", "exampleKo": "예문 한국어 해석"}\n' +
    "  ]\n" +
    "}\n\n" +
    "주의:\n" +
    "- candidates는 실제 인도네시아에서 많이 쓰이는 순서(빈도순)로 정렬하세요.\n" +
    "- 2~5개 정도. 뜻이 갈리면 각각의 뉘앙스/상황을 분명히 구분해 설명하세요.\n" +
    "- 각 단어마다 자연스러운 예문 1개와 한국어 해석을 꼭 넣으세요.\n" +
    "- pron은 한국인이 읽기 쉽게 한글로 근사 표기 (예: bicara → 비짜라).\n";

  const parsed = await callGeminiJSON(prompt);
  return {
    query: (parsed.query || trimmed).toString().trim(),
    candidates: arr<KoWordCandidate>(parsed.candidates).map((c) => ({
      id: (c?.id || "").toString().trim(),
      pron: (c?.pron || "").toString().trim(),
      meaning: (c?.meaning || "").toString().trim(),
      nuance: (c?.nuance || "").toString().trim(),
      situation: (c?.situation || "").toString().trim(),
      example: (c?.example || "").toString().trim(),
      exampleKo: (c?.exampleKo || "").toString().trim(),
    })).filter((c) => c.id),
  };
}

// ============================================================
// (4) 한국어 문장 → 인니어 번역 (문어체 / 구어체, 발음 포함)
// ============================================================
export interface KoSentenceVariant {
  id: string;   // 인니어 문장
  pron: string; // 발음(한글 근사 표기)
  note: string; // 짧은 설명 (선택)
}
export interface KoSentenceResult {
  query: string;         // 입력 한국어 문장
  formal: KoSentenceVariant;   // 문어체
  casual: KoSentenceVariant;   // 구어체
  hardWords: HardWord[];       // 학습 단어 (예문에 나온 어려운 단어)
}

export async function translateKoSentence(sentence: string): Promise<KoSentenceResult> {
  const trimmed = sentence.trim();
  if (!trimmed) throw new Error("EMPTY_WORD");

  const prompt =
    "당신은 한국인 학습자를 위한 한국어→인도네시아어 번역기입니다.\n" +
    "아래 한국어 문장을 인도네시아어로 번역해 JSON으로만 출력하세요. 설명은 한국어.\n\n" +
    '문장: "' + trimmed + '"\n\n' +
    "출력 형식:\n" +
    "{\n" +
    '  "query": "입력 문장",\n' +
    '  "formal": {"id": "문어체 인니어 문장", "pron": "발음(한글 근사)"},\n' +
    '  "casual": {"id": "구어체 인니어 문장", "pron": "발음(한글 근사)"},\n' +
    '  "hardWords": [{"word": "인니어 단어", "meaning": "간략한 한국어 뜻"}]\n' +
    "}\n\n" +
    "주의:\n" +
    "- formal은 격식체/문어체(뉴스·공식 상황), casual은 일상 대화체로 자연스럽게.\n" +
    "- pron은 한국인이 읽기 쉽게 한글로 근사 표기.\n" +
    "- hardWords는 위 두 문장에 나온 단어 중 초중급 학습자가 모를 만한 단어만 골라 넣으세요. 쉬운 단어는 제외.\n";

  const parsed = await callGeminiJSON(prompt);
  const variant = (v: any): KoSentenceVariant => ({
    id: (v?.id || "").toString().trim(),
    pron: (v?.pron || "").toString().trim(),
    note: (v?.note || "").toString().trim(),
  });
  return {
    query: (parsed.query || trimmed).toString().trim(),
    formal: variant(parsed.formal),
    casual: variant(parsed.casual),
    hardWords: arr<HardWord>(parsed.hardWords).map((h) => ({
      word: (h?.word || "").toString().trim(),
      meaning: (h?.meaning || "").toString().trim(),
    })).filter((h) => h.word),
  };
}
