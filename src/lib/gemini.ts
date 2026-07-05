// src/lib/gemini.ts
// Gemini API를 사용해 인도네시아어 단어의 한국어 뜻/예문/예문뜻을 자동 생성합니다.
// API 키는 localStorage("geminiApiKey")에 저장되며, 없으면 자동 채우기 기능이 비활성화됩니다.

const GEMINI_KEY_STORAGE = "geminiApiKey";

// 텍스트 생성용 모델 (저렴하고 빠름). 필요시 이 값만 바꾸면 됩니다.
const GEMINI_MODEL = "gemini-flash-lite-latest";

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

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

export interface WordFillResult {
  meaning: string;         // 한국어 뜻
  example: string;         // 인도네시아어 예문
  exampleMeaning: string;  // 예문의 한국어 뜻
}

// 인도네시아어 단어 하나를 받아 한국어 뜻/예문/예문뜻을 생성합니다.
export async function fillWordWithGemini(word: string): Promise<WordFillResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
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

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      throw new Error("INVALID_API_KEY");
    }
    if (res.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error("EMPTY_RESPONSE");
  }

  // JSON 파싱 (응답에 코드펜스가 섞여도 안전하게 추출)
  let parsed: Partial<WordFillResult>;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) {
      throw new Error("PARSE_FAILED");
    }
    parsed = JSON.parse(match[0]);
  }

  return {
    meaning: (parsed.meaning || "").toString().trim(),
    example: (parsed.example || "").toString().trim(),
    exampleMeaning: (parsed.exampleMeaning || "").toString().trim(),
  };
}
