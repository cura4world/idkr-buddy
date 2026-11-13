// src/lib/gemini.ts
// Gemini API를 사용해 인도네시아어 단어의 한국어 뜻/예문/예문뜻을 자동 생성합니다.
// API 키는 localStorage("geminiApiKey")에 저장되며, 없으면 자동 채우기 기능이 비활성화됩니다.

import { isMemberActive, isMemberKeyShape } from "@/lib/member";
import { callGeminiJSON } from "@/lib/geminiText";
import { hasPublicSession } from "@/lib/account";

const GEMINI_KEY_STORAGE = "geminiApiKey";

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || "";
  } catch {
    return "";
  }
}

export function setGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

// ---------- 키 입력칸 검사 ----------
// 구글 AI Studio 는 이제 "AQ." 로 시작하는 키만 발급하고, 예전 "AIza" 키도 계속 동작합니다.
// 그래서 접두어로는 걸러내지 않습니다(키가 어떤 글자로 시작한다고 가정하지 말 것).

/** 이보다 짧은 값은 복사할 때 일부만 잡힌 것으로 봅니다(실제 키는 39~53자). */
export const GEMINI_KEY_MIN_LENGTH = 30;

export const MEMBER_KEY_IN_GEMINI_TEXT = "이것은 회원키입니다. 여기에는 Google AI Studio 에서 받은 Gemini 키를 넣으세요.";
export const GEMINI_KEY_TOO_SHORT_TEXT = "키가 너무 짧습니다. 복사할 때 일부만 잡혔을 수 있습니다. 키 전체를 다시 붙여 넣으세요.";

/** 붙여 넣을 때 섞여 들어온 띄어쓰기·줄바꿈·탭은 키에 없는 글자라 모두 뺍니다. */
export function cleanGeminiKeyInput(raw: string): string {
  return (raw || "").replace(new RegExp("\\s+", "g"), "");
}

/** 회원키를 Gemini 칸에 넣었는가(회원키 칸이 따로 있어 헷갈리기 쉬움). 맞으면 안내 문장, 아니면 "". */
export function memberKeyInGeminiProblem(raw: string): string {
  return isMemberKeyShape(raw) ? MEMBER_KEY_IN_GEMINI_TEXT : "";
}

/** 미리보기 패널용: 회원키 모양이거나 너무 짧으면 안내 문장, 저장해도 되면 "". 빈 값은 검사하지 않습니다. */
export function geminiKeyInputProblem(raw: string): string {
  const k = cleanGeminiKeyInput(raw);
  if (!k) return "";
  const member = memberKeyInGeminiProblem(k);
  if (member) return member;
  if (k.length < GEMINI_KEY_MIN_LENGTH) return GEMINI_KEY_TOO_SHORT_TEXT;
  return "";
}

// 화면들이 "AI 기능을 쓸 수 있는가"를 이 함수로 판단합니다.
// 회원키 기기는 내 키가 없어도 Worker 대리 호출로 쓸 수 있으므로 함께 봅니다.
export function hasGeminiApiKey(): boolean {
  // 공개판(스토어 앱)은 Google 로그인 세션이 있으면 서버를 거쳐 쓸 수 있습니다.
  return getGeminiApiKey().length > 0 || isMemberActive() || hasPublicSession();
}

export interface WordFillResult {
  meaning: string;         // 한국어 뜻
  example: string;         // 인도네시아어 예문
  exampleMeaning: string;  // 예문의 한국어 뜻
}

// 인도네시아어 단어 하나를 받아 한국어 뜻/예문/예문뜻을 생성합니다.
export async function fillWordWithGemini(word: string): Promise<WordFillResult> {
  if (!hasGeminiApiKey()) {
    throw new Error("NO_API_KEY");
  }

  const trimmed = word.trim();
  if (!trimmed) {
    throw new Error("EMPTY_WORD");
  }

  const prompt =
    "당신은 인도네시아어-한국어 단어장 도우미입니다.\n" +
    "다음 인도네시아어 단어/표현에 대해 아래 정보를 JSON으로만 출력하세요.\n" +
    "다른 설명이나 마크다운 없이 순수 JSON 객체 하나만 출력합니다.\n\n" +
    "단어: \"" + trimmed + "\"\n\n" +
    "출력 형식:\n" +
    "{\n" +
    '  "meaning": "가장 일반적인 한국어 뜻 (간결하게, 필요시 쉼표로 여러 뜻)",\n' +
    '  "example": "이 단어를 사용한 자연스러운 인도네시아어 예문 한 문장",\n' +
    '  "exampleMeaning": "그 예문의 한국어 번역"\n' +
    "}\n\n" +
    "주의: 예문은 일상적이고 자연스러운 문장으로, 너무 길지 않게 작성하세요.";

  const parsed = (await callGeminiJSON(prompt)) as Partial<WordFillResult>;

  return {
    meaning: (parsed.meaning || "").toString().trim(),
    example: (parsed.example || "").toString().trim(),
    exampleMeaning: (parsed.exampleMeaning || "").toString().trim(),
  };
}
