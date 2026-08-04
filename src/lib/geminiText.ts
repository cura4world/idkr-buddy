// src/lib/geminiText.ts
// Gemini 텍스트 호출을 한 곳에 모은 공통 모듈.
// 모델 목록·타임아웃·재시도·에러 코드를 여기서만 관리합니다.
//
// 주의: gemini.ts 를 import 하지 않습니다. gemini.ts 가 이 파일을 import 하므로
// 순환 참조를 피하기 위해 API 키는 localStorage 에서 직접 읽습니다.

const KEY_STORAGE = "geminiApiKey";

function readApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE)?.trim() || "";
  } catch {
    return "";
  }
}

// 텍스트 모델 후보 (순서대로 시도, 503 등으로 계속 실패하면 다음 후보로 강등).
// -latest 별칭은 구글이 새 버전으로 조용히 갈아끼우기 때문에(프리뷰가 물릴 수도 있음)
// 매일 쓰는 기능에는 "안정판 명시 버전"을 고정합니다.
export const TEXT_MODEL_CANDIDATES = [
  "gemini-3.1-flash-lite", // 구글이 저비용·고빈도 용도로 권하는 안정 장기 모델
  "gemini-3.5-flash-lite", // 3.5 계열 안정판 폴백
  "gemini-2.5-flash-lite", // 구형 폴백 (2026-10 종료 예정)
];

// 호출 하나당 기본 타임아웃.
const DEFAULT_TIMEOUT_MS = 25000;

// 모델을 바꿔가며 재시도해도 전체는 이 시간을 넘기지 않습니다.
const DEFAULT_DEADLINE_MS = 70000;

// 3.x 는 thinking 토큰이 출력 한도를 같이 먹으므로 넉넉히 잡습니다.
const DEFAULT_MAX_OUTPUT_TOKENS = 16384;

// 한 모델당 시도 횟수 (첫 시도 + 재시도 2회).
const MAX_TRIES_PER_MODEL = 3;

// 같은 모델을 잠시 뒤에 다시 부르면 성공할 수 있는 오류.
const RETRIABLE = new Set(["TIMEOUT", "NETWORK", "SERVER_ERROR", "EMPTY_RESPONSE"]);

// 같은 모델은 가망이 없지만 다른 모델이면 통할 수 있는 오류.
// (쿼터와 모델 종료는 모델 단위로 걸립니다)
const SWITCH_MODEL = new Set(["RATE_LIMIT", "MODEL_NOT_FOUND"]);

export interface GeminiCallOptions {
  timeoutMs?: number;
  maxOutputTokens?: number;
  totalDeadlineMs?: number;
}

// 지수 백오프 + 지터. 503 과부하는 1초로는 회복되지 않습니다.
function backoffDelay(tryIndex: number): number {
  const base = tryIndex <= 0 ? 900 : tryIndex === 1 ? 2600 : 6000;
  return base + Math.floor(Math.random() * 700);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOnce(
  model: string,
  apiKey: string,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens: number,
): Promise<string> {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch (e) {}
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Gemini 3.x 부터 temperature / topP / topK 는 폐기 예정이라 보내지 않습니다.
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens,
        },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (timedOut) throw new Error("TIMEOUT");
    throw new Error("NETWORK");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    if (res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 400) throw new Error("BAD_REQUEST");
    if (res.status === 404) throw new Error("MODEL_NOT_FOUND");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status >= 500) throw new Error("SERVER_ERROR");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text;
}

// 모델 후보를 순회하며 지수 백오프로 재시도합니다. 응답 본문(문자열)을 그대로 돌려줍니다.
export async function callGeminiText(
  prompt: string,
  opts: GeminiCallOptions = {},
): Promise<string> {
  const apiKey = readApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const deadline = opts.totalDeadlineMs ?? DEFAULT_DEADLINE_MS;

  const startedAt = Date.now();
  let lastError: unknown = new Error("SERVER_ERROR");

  for (const model of TEXT_MODEL_CANDIDATES) {
    for (let i = 0; i < MAX_TRIES_PER_MODEL; i++) {
      if (Date.now() - startedAt > deadline) throw lastError;

      try {
        return await callOnce(model, apiKey, prompt, timeoutMs, maxOutputTokens);
      } catch (e: any) {
        lastError = e;
        const code = (e && e.message) || "";

        // 키 문제·요청 형식 문제 등은 몇 번을 더 불러도 같습니다.
        if (!RETRIABLE.has(code) && !SWITCH_MODEL.has(code)) throw e;

        // 쿼터·모델 종료면 같은 모델을 더 두드리지 말고 바로 다음 후보로.
        if (SWITCH_MODEL.has(code)) break;

        if (i < MAX_TRIES_PER_MODEL - 1) await sleep(backoffDelay(i));
      }
    }
  }

  throw lastError;
}

// 응답이 코드펜스 등으로 오염돼도 안전하게 JSON 객체를 뽑아냅니다.
export function parseJsonLoose(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    return JSON.parse(match[0]);
  }
}

export async function callGeminiJSON(
  prompt: string,
  opts: GeminiCallOptions = {},
): Promise<Record<string, unknown>> {
  const text = await callGeminiText(prompt, opts);
  return parseJsonLoose(text);
}
