// src/lib/geminiText.ts
// Gemini 텍스트 호출을 한 곳에 모은 공통 모듈.
// 모델 목록·타임아웃·재시도·에러 코드를 여기서만 관리합니다.
//
// 주의: gemini.ts 를 import 하지 않습니다. gemini.ts 가 이 파일을 import 하므로
// 순환 참조를 피하기 위해 API 키는 localStorage 에서 직접 읽습니다.

import { geminiTarget, handleQuotaResponse, lastQuotaCode, newRequestId, publicProxyError, AiKind } from "@/lib/aiProxy";
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
  "gemini-3.1-flash-lite", // 현행 lite 중 가장 쌈. 2027-05-07 종료 예정 → 그 전에 3.5-flash-lite 를 1순위로
  "gemini-3.5-flash-lite", // 3.1 의 공식 후속 (3.1 보다 비쌈)
  "gemini-2.5-flash-lite", // 구형 폴백 (폐기 아님, 예전부터 쓰던 계정에만 제공)
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
  /** 어떤 기능의 호출인지 (공개판 서버가 기능별 한도를 셈). 생략하면 "text". */
  kind?: AiKind;
}

// 지수 백오프 + 지터. 503 과부하는 1초로는 회복되지 않습니다.
function backoffDelay(tryIndex: number): number {
  const base = tryIndex <= 0 ? 900 : tryIndex === 1 ? 2600 : 6000;
  return base + Math.floor(Math.random() * 700);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 기기가 오프라인이라고 알려 주는가. 알 수 없는 환경(값이 없음)은 온라인으로 봅니다.
// 웹뷰는 실제로 끊겨 있어도 true 를 주는 일이 있어, 이 값은 "false 면 확실히 끊김"으로만 씁니다.
function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

/**
 * 구글의 400 응답 본문(error.details)에 reason "API_KEY_INVALID" 가 있는가. 본문을 못 읽으면 false.
 * 회화 음성(percakapanAudio.ts)도 400 을 키 오류와 요청 형식 오류로 가를 때 이것을 씁니다.
 */
export async function hasInvalidKeyReason(res: Response): Promise<boolean> {
  try {
    const j = await res.clone().json();
    const details = j && j.error && Array.isArray(j.error.details) ? j.error.details : [];
    return details.some((d: any) => d && d.reason === "API_KEY_INVALID");
  } catch {
    return false;
  }
}

async function callOnce(
  model: string,
  apiKey: string,
  prompt: string,
  timeoutMs: number,
  maxOutputTokens: number,
  kind: AiKind = "text",
  req = "",
): Promise<string> {
  // 내 키가 있으면 직접, 없고 회원키가 있으면 Worker 를 거칩니다.
  const target = geminiTarget(model, apiKey, kind, "", req);
  if (!target) throw new Error("NO_API_KEY");

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
    res = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
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

  // 한도 초과·Plus 필요: 서버 코드(QUOTA_STORY·QUOTA_DICT_NEW·QUOTA_PLUS_REQUIRED …)로 던집니다. 재시도하지 않습니다.
  if (await handleQuotaResponse(res, target.viaProxy)) throw new Error(lastQuotaCode());
  // 공개판 서버의 401(세션 만료)·403(허용 안 됨)은 키 오류가 아닙니다 — 공개판 전용 코드로.
  const pubErr = publicProxyError(res, target);
  if (pubErr) throw new Error(pubErr);
  if (!res.ok) {
    // 내 키로 직접 부른 경우(서버를 거치지 않음)의 키 오류.
    //   400 + 상세 이유 API_KEY_INVALID → 키 모양이 틀림(회원키를 Gemini 칸에 넣은 경우 등. 2026-11-13 폴드6 진단)
    //   401(ACCESS_TOKEN_TYPE_UNSUPPORTED 등)  → 키 종류가 맞지 않음
    // 그 밖의 400 은 요청 형식 문제라 예전처럼 BAD_REQUEST 입니다(DECISIONS 5장: 400 을 통째로 키 오류로 보면 오진).
    if (!target.viaProxy) {
      if (res.status === 401) throw new Error("INVALID_API_KEY");
      if (res.status === 400 && (await hasInvalidKeyReason(res))) throw new Error("INVALID_API_KEY");
    }
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
  const apiKey = readApiKey(); // 비어 있으면 회원키로 Worker 를 거칩니다

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const deadline = opts.totalDeadlineMs ?? DEFAULT_DEADLINE_MS;

  const startedAt = Date.now();
  let lastError: unknown = new Error("SERVER_ERROR");
  // 이 한 번의 부름(= 한 번의 누름)을 가리키는 번호. 아래의 재시도·모델 바꿈이 모두 같은 번호로 가서,
  // 공개판 서버가 한 번으로 셉니다(빈 응답·시간 초과가 한도를 여러 칸 깎지 않게 — 출시 전 점검 C-02).
  const req = newRequestId();

  // 인터넷이 끊겨 있으면 부르지 않고 바로 알립니다(출시 전 점검 C-07: 예전에는 9번을 불러 보고 10~15초 뒤에야 알렸습니다).
  if (isOffline()) throw new Error("NETWORK");

  // 연결 실패(NETWORK)는 모델과 상관없는 문제라 모델을 바꿔 가며 다시 부르지 않습니다.
  // 잠깐 끊긴 것일 수 있으니 같은 모델로 한 번만 더 불러 보고, 또 실패하면 그대로 알립니다.
  let networkFails = 0;

  for (const model of TEXT_MODEL_CANDIDATES) {
    for (let i = 0; i < MAX_TRIES_PER_MODEL; i++) {
      if (Date.now() - startedAt > deadline) throw lastError;

      try {
        return await callOnce(model, apiKey, prompt, timeoutMs, maxOutputTokens, opts.kind || "text", req);
      } catch (e: any) {
        lastError = e;
        const code = (e && e.message) || "";

        // 키 문제·요청 형식 문제 등은 몇 번을 더 불러도 같습니다.
        if (!RETRIABLE.has(code) && !SWITCH_MODEL.has(code)) throw e;

        // 쿼터·모델 종료면 같은 모델을 더 두드리지 말고 바로 다음 후보로.
        if (SWITCH_MODEL.has(code)) break;

        if (code === "NETWORK") {
          networkFails++;
          // 두 번째 연결 실패이거나, 이 모델의 마지막 시도였으면(다음은 모델을 바꾸는 차례) 여기서 끝냅니다.
          if (networkFails >= 2 || i >= MAX_TRIES_PER_MODEL - 1) throw e;
        }

        if (i < MAX_TRIES_PER_MODEL - 1) {
          await sleep(backoffDelay(i));
          // 기다리는 사이에 끊겼으면 더 부르지 않습니다.
          if (isOffline()) throw new Error("NETWORK");
        }
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
