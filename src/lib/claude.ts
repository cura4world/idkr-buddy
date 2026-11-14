// src/lib/claude.ts
// Claude API (Anthropic) 호출. 인도네시아어 묵상 생성에 사용합니다.
// API 키는 localStorage("claudeApiKey")에 저장됩니다.
// 주의: claude-sonnet-5는 temperature 등 샘플링 값을 보내면 400 에러 → 보내지 않습니다.

import { isMemberActive } from "@/lib/member";
import { claudeTarget, handleQuotaResponse } from "@/lib/aiProxy";
const CLAUDE_KEY_STORAGE = "claudeApiKey";
const CLAUDE_MODEL = "claude-sonnet-5";
// 호출 하나(재시도·본문 읽기 포함)의 마감. 묵상 한 편은 길어 1~2분이 걸리기도 해 넉넉히 잡습니다.
const CLAUDE_TIMEOUT_MS = 180000;

export function getClaudeApiKey(): string {
  try {
    return localStorage.getItem(CLAUDE_KEY_STORAGE)?.trim() || "";
  } catch {
    return "";
  }
}

export function setClaudeApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(CLAUDE_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(CLAUDE_KEY_STORAGE);
    }
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

// 화면들이 "묵상·기도 생성을 쓸 수 있는가"를 이 함수로 판단합니다.
// 회원키 기기는 내 키가 없어도 Worker 대리 호출로 쓸 수 있으므로 함께 봅니다.
export function hasClaudeApiKey(): boolean {
  return getClaudeApiKey().length > 0 || isMemberActive();
}

// system + user 프롬프트로 Claude를 호출해 JSON 객체를 받습니다.
export async function callClaudeJSON(
  system: string,
  user: string,
  maxTokens = 8000
): Promise<Record<string, unknown>> {
  // 내 키가 있으면 직접, 없고 회원키가 있으면 Worker 를 거칩니다(키는 서버에만).
  const target = claudeTarget(getClaudeApiKey());
  if (!target) throw new Error("NO_API_KEY");

  // 응답이 안 오면 "만드는 중"이 끝나지 않으므로 마감을 겁니다(출시 전 점검 C-16).
  // 재시도와 본문 읽기까지 통틀어 한 번의 마감입니다. 넘기면 TIMEOUT 으로 끝납니다.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch {
      // 무시
    }
  }, CLAUDE_TIMEOUT_MS);

  const doFetch = () =>
    fetch(target.url, {
      method: "POST",
      headers: target.headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

  let data: any;
  try {
    let res: Response;
    try {
      res = await doFetch();
    } catch {
      throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
    }

    // 하루 사용량 한도(대리 호출)면 재시도하지 않습니다.
    if (await handleQuotaResponse(res, target.viaProxy)) throw new Error("QUOTA");

    // 일시적 혼잡(429/529)은 한 번 재시도
    if (res.status === 429 || res.status === 529) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        res = await doFetch();
      } catch {
        throw new Error(timedOut ? "TIMEOUT" : "NETWORK_FAILED");
      }
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error("INVALID_API_KEY");
      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (res.status === 529) throw new Error("OVERLOADED");
      let msg = "";
      try {
        const j = await res.json();
        msg = (j && j.error && j.error.message) || "";
      } catch {
        // 응답 본문이 JSON이 아니면 무시
      }
      if (msg.toLowerCase().indexOf("credit") >= 0) throw new Error("NO_CREDIT");
      throw new Error("REQUEST_FAILED_" + res.status);
    }

    try {
      data = await res.json();
    } catch (e) {
      // 본문을 받는 중에 마감에 걸린 경우만 TIMEOUT 으로 바꿉니다. 그 밖에는 예전처럼 그대로 던집니다.
      if (timedOut) throw new Error("TIMEOUT");
      throw e;
    }
  } finally {
    clearTimeout(timer);
  }
  // 응답 content는 블록 배열이며, thinking 블록이 섞일 수 있어 text 블록만 사용
  const blocks: any[] = Array.isArray(data?.content) ? data.content : [];
  const textBlock = blocks.find((b) => b && b.type === "text");
  const text: string = (textBlock && textBlock.text) || "";
  if (!text) throw new Error("EMPTY_RESPONSE");

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    return JSON.parse(match[0]);
  }
}
