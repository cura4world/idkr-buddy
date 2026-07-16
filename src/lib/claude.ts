// src/lib/claude.ts
// Claude API (Anthropic) 호출. 인도네시아어 묵상 생성에 사용합니다.
// API 키는 localStorage("claudeApiKey")에 저장됩니다.
// 주의: claude-sonnet-5는 temperature 등 샘플링 값을 보내면 400 에러 → 보내지 않습니다.

const CLAUDE_KEY_STORAGE = "claudeApiKey";
const CLAUDE_MODEL = "claude-sonnet-5";

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

export function hasClaudeApiKey(): boolean {
  return getClaudeApiKey().length > 0;
}

// system + user 프롬프트로 Claude를 호출해 JSON 객체를 받습니다.
export async function callClaudeJSON(
  system: string,
  user: string,
  maxTokens = 8000
): Promise<Record<string, unknown>> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const doFetch = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // 브라우저(WebView)에서 직접 호출을 허용하는 공식 헤더
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new Error("NETWORK_FAILED");
  }

  // 일시적 혼잡(429/529)은 한 번 재시도
  if (res.status === 429 || res.status === 529) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      res = await doFetch();
    } catch {
      throw new Error("NETWORK_FAILED");
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

  const data = await res.json();
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
