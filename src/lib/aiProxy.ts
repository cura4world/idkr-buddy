// src/lib/aiProxy.ts
// AI(Gemini·Claude)를 어디로 부를지 한 곳에서 정합니다.
//
//   이 기기에 내 키가 있으면      → 구글·앤트로픽을 직접 부릅니다(지금까지와 같음)
//   키가 없고 회원키가 있으면     → Worker 를 거칩니다(키는 서버에만 있음)
//   공개판 로그인 세션이 있으면   → kata-public 서버를 거칩니다(계정별 기능 한도)
//   셋 다 없으면                  → NO_API_KEY
//
// 서버가 한도를 넘었다고 하면(429 QUOTA_*) 또는 Plus 기능이라고 하면(403 PLUS_REQUIRED)
// 여기서 한 번만 안내를 띄웁니다(여러 문단을 잇달아 만들 때 토스트가 쏟아지지 않도록).

import { toast } from "sonner";
import { MEMBER_BASE, memberHeaders } from "@/lib/member";
import { PUBLIC_BASE, publicHeaders, expireSession } from "@/lib/account";
import { isPlayStoreApp } from "@/lib/platform";

/**
 * 어떤 기능의 호출인지. 공개판 서버는 이 이름(x-kata-kind)별로 하루·한 달 한도를 셉니다.
 *   text            그 밖의 짧은 풀이 (단어 탭 풀이, 단어 채우기, 지도·이해 설명, 문장 해설)
 *   story           이야기 불러오기
 *   percakapan-make 회화집 만들기
 *   dict-new        사전에서 처음 찾는 말 (캐시에 없을 때만 불림)
 *   phrase          오늘의 문장 새로 만들기
 *   tts             예전 이름(음성 전반) — 관리자판 화면(묵상·기도·설교)이 씀
 *   word-audio      단어·예문 발음 (짧은 글)
 *   shared-audio    기본 회화집·지도·이해 읽기
 *   longread        내가 만든 이야기·회화 듣기
 *   news            뉴스 (회원판만, 공개판 서버는 거절)
 */
export type AiFeatureKind =
  | "story"
  | "percakapan-make"
  | "dict-new"
  | "phrase"
  | "word-audio"
  | "shared-audio"
  | "longread";
export type AiKind = "text" | "tts" | "news" | AiFeatureKind;

const TTS_FEATURES: AiKind[] = ["word-audio", "shared-audio", "longread"];

/** 회원판 Worker(kata-sermon)는 예전 이름(text·tts·news)만 압니다. */
function memberKind(kind: AiKind): "text" | "tts" | "news" {
  if (kind === "tts" || kind === "news") return kind;
  return TTS_FEATURES.indexOf(kind) >= 0 ? "tts" : "text";
}

export interface AiTarget {
  url: string;
  headers: Record<string, string>;
  viaProxy: boolean;
  /** 공개판 서버(kata-public)를 거치는가 — 401·403 을 공개판 문구로 바꿀 때 씁니다. */
  publicProxy?: boolean;
}

// 긴 읽기 한 편을 가리키는 값으로 보낼 수 있는 글자(서버 검사와 같음)
const UNIT_UNSAFE = new RegExp("[^A-Za-z0-9._:\\-]", "g");
// 요청 번호의 모양(서버 검사와 같음)
const REQ_OK = new RegExp("^[A-Za-z0-9]{8,40}$");

/** 한 번의 누름을 가리키는 번호를 새로 만듭니다(영문·숫자 20자). */
export function newRequestId(): string {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  try {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) out += abc.charAt(bytes[i] % abc.length);
  } catch (e) {
    for (let i = 0; i < 20; i++) out += abc.charAt(Math.floor(Math.random() * abc.length));
  }
  return out;
}

/**
 * Gemini 호출 대상. 키가 없고 회원키·공개판 세션도 없으면 null.
 * unit: 긴 읽기 한 편을 여러 조각으로 나눠 부를 때 그 편의 이름(캐시 키). 공개판 서버가 한 편을 한 번으로 셉니다.
 * req:  한 번의 누름을 가리키는 번호(newRequestId). 재시도·모델 바꿈이 같은 번호로 가면 공개판 서버가 한 번으로 셉니다
 *       (2026-11-14 출시 전 점검 C-02 — 실패한 호출이 한도를 여러 칸 깎던 문제).
 */
export function geminiTarget(model: string, apiKey: string, kind: AiKind, unit?: string, req?: string): AiTarget | null {
  // 스토어 앱은 로그인 세션 길만 탑니다. 예전에는 저장소에 Gemini 키·회원키가 남아 있으면(관리자판 백업을
  // 되돌린 경우 등) 그 길을 먼저 타, 계정별 한도·등급을 건너뛰었습니다(출시 전 점검 S-13).
  const sessionOnly = isPlayStoreApp();
  const key = sessionOnly ? "" : (apiKey || "").trim();
  if (key) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/models/" + model +
        ":generateContent?key=" + encodeURIComponent(key),
      headers: { "content-type": "application/json" },
      viaProxy: false,
    };
  }
  const mh = sessionOnly ? null : memberHeaders();
  if (mh) {
    return {
      url: MEMBER_BASE + "/ai/gemini/" + model + ":generateContent",
      headers: Object.assign({ "content-type": "application/json", "x-kata-kind": memberKind(kind) }, mh),
      viaProxy: true,
    };
  }
  // 공개판(스토어 앱): Google 로그인 세션으로 kata-public 서버를 거칩니다(계정별 기능 한도).
  const ph = publicHeaders();
  if (!ph) return null;
  const headers: Record<string, string> = Object.assign({ "content-type": "application/json", "x-kata-kind": kind }, ph);
  const u = String(unit || "").replace(UNIT_UNSAFE, "_").slice(0, 160);
  if (u) headers["x-kata-unit"] = u;
  if (req && REQ_OK.test(req)) headers["x-kata-req"] = req;
  return {
    url: PUBLIC_BASE + "/ai/gemini/" + model + ":generateContent",
    headers,
    viaProxy: true,
    publicProxy: true,
  };
}

/** Claude 호출 대상. 키가 없고 회원키도 없으면 null. */
export function claudeTarget(apiKey: string): AiTarget | null {
  const key = (apiKey || "").trim();
  if (key) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      viaProxy: false,
    };
  }
  const mh = memberHeaders();
  if (!mh) return null;
  return {
    url: MEMBER_BASE + "/ai/claude",
    headers: Object.assign({ "content-type": "application/json", "x-kata-kind": "text" }, mh),
    viaProxy: true,
  };
}

// ── 한도 안내 ───────────────────────────────────────────────

type Period = "day" | "month" | "total";

/**
 * 한도 초과 안내 문장. 서버 응답의 error·period 로 고릅니다.
 * limit: 서버가 함께 준 그 기간의 한도 숫자(없으면 0). 오늘의 문장에서 "하루 한 번"이 맞는지 가릴 때만 봅니다.
 */
export function quotaText(code: string, period: string, limit = 0): string {
  const p: Period = period === "month" ? "month" : period === "total" ? "total" : "day";
  const when = p === "month" ? "이번 달" : "오늘";
  const next = p === "month" ? "다음 달에" : "내일";
  if (code === "QUOTA_STORY") {
    return when + " 불러올 수 있는 이야기를 모두 불러왔습니다. " + next + " 다시 불러오세요.";
  }
  if (code === "QUOTA_PERCAKAPAN_MAKE") {
    return when + " 만들 수 있는 대화를 모두 만들었습니다. " + next + " 다시 만들어 보세요.";
  }
  if (code === "QUOTA_LONGREAD") {
    if (p === "total") return "체험 기간에 들을 수 있는 이야기·대화를 모두 들었습니다. Plus를 시작하면 계속 들을 수 있습니다.";
    return when + " 들을 수 있는 이야기·대화를 모두 들었습니다. " + next + " 다시 들어 보세요.";
  }
  if (code === "QUOTA_DICT_NEW") {
    return when + " 새로 찾을 수 있는 말을 모두 찾았습니다. 이미 찾은 말은 계속 볼 수 있습니다. " + next + " 다시 찾아보세요.";
  }
  if (code === "QUOTA_PHRASE") {
    // 무료는 하루 1번. Plus 는 안전 상한(여러 번)이라 "하루 한 번"이 사실과 다릅니다(출시 전 점검 C-14).
    if (limit > 1) return "오늘 받을 수 있는 새 문장을 모두 받았습니다. 내일 다시 열어 보세요.";
    return "오늘의 새 문장은 하루 한 번 받을 수 있습니다. 내일 다시 열어 보세요.";
  }
  if (code === "QUOTA_WORD_AUDIO") return when + " 들을 수 있는 발음을 모두 들었습니다. " + next + " 다시 들어 보세요.";
  if (code === "QUOTA_SHARED_AUDIO" || code === "QUOTA_TTS") {
    return when + " 음성 듣기 한도를 넘었습니다. " + next + " 다시 들을 수 있습니다.";
  }
  if (code === "QUOTA_NEWS") return "오늘 뉴스 받기 한도를 넘었습니다.";
  if (code === "QUOTA_TEXT") return when + " AI 풀이 한도를 넘었습니다. " + next + " 다시 쓸 수 있습니다.";
  return "오늘 사용량 한도를 넘었습니다.";
}

/** Plus 전용 기능을 무료로 불렀을 때의 안내. */
export function plusRequiredText(kind: string): string {
  if (kind === "longread") return "불러온 이야기와 내가 만든 대화 듣기는 Plus에서 쓸 수 있습니다.";
  if (kind === "percakapan-make") return "대화 만들기는 Plus에서 쓸 수 있습니다.";
  if (kind === "shared-audio") return "회화집·지도 듣기는 Plus에서 쓸 수 있습니다.";
  return "Plus에서 쓸 수 있는 기능입니다.";
}

// 화면이 직접 안내를 그리는 기능은 토스트를 띄우지 않습니다.
//   dict-new: 사전 화면이 결과 자리에 안내를 씀 / phrase: 홈에서 조용히 미리 만들다 막힌 것
const SILENT_KINDS = ["dict-new", "phrase"];

let lastQuotaToast = 0;
let lastNotice = "";
let lastCode = "";

/** 방금(ms 안에) 한도·Plus 안내를 띄웠는가 — 같은 실패에 다른 안내를 겹쳐 띄우지 않으려고 봅니다(storeTtsShim). */
export function quotaNoticeWithin(ms: number): boolean {
  return lastQuotaToast > 0 && Date.now() - lastQuotaToast < ms;
}

/** 마지막으로 받은 한도·Plus 안내 문장 (화면이 직접 그릴 때 씀). */
export function lastQuotaNotice(): string {
  return lastNotice;
}

/**
 * 마지막으로 받은 한도 코드. 늘 "QUOTA_" 로 시작합니다 — 화면은 이 앞머리 하나로 한도 오류를 알아봅니다.
 *   한도 초과: 서버 코드 그대로 (QUOTA_STORY · QUOTA_DICT_NEW · QUOTA_LONGREAD …)
 *   Plus 필요: QUOTA_PLUS_REQUIRED
 */
export function lastQuotaCode(): string {
  return lastCode || "QUOTA_TEXT";
}

/** 구독 화면을 엽니다. 라우터 밖(라이브러리)에서도 쓸 수 있게 history 로 이동합니다. */
export function openPaywall(): void {
  try {
    const base = "/idkr-buddy";
    const prevIdx = (window.history.state && typeof window.history.state.idx === "number") ? window.history.state.idx : 0;
    // react-router 가 읽는 모양({usr, key, idx})으로 넣어야 닫기(뒤로가기)가 원래 화면으로 돌아갑니다.
    window.history.pushState({ usr: null, key: "pw" + Date.now().toString(36), idx: prevIdx + 1 }, "", base + "/plus");
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  } catch (e) {}
}

/**
 * 대리 호출이 한도 초과(429 QUOTA_*)나 Plus 필요(403 PLUS_REQUIRED)로 돌아왔을 때 안내를 띄웁니다.
 * 돌려주는 값: 그런 경우였으면 true(호출한 쪽은 재시도하지 않고 "QUOTA…" 오류를 던집니다).
 */
export async function handleQuotaResponse(res: Response, viaProxy: boolean): Promise<boolean> {
  if (!viaProxy || (res.status !== 429 && res.status !== 403)) return false;
  let code = "";
  let kind = "";
  let period = "";
  let limit = 0;
  try {
    const d = await res.clone().json();
    code = String((d && d.error) || "");
    kind = String((d && d.kind) || "");
    period = String((d && d.period) || "");
    limit = d && typeof d.limit === "number" ? d.limit : 0;
  } catch (e) {}
  const plusRequired = res.status === 403 && code === "PLUS_REQUIRED";
  if (!plusRequired && (res.status !== 429 || code.indexOf("QUOTA_") !== 0)) return false;

  lastNotice = plusRequired ? plusRequiredText(kind) : quotaText(code, period, limit);
  lastCode = plusRequired ? "QUOTA_PLUS_REQUIRED" : code;
  if (SILENT_KINDS.indexOf(kind) >= 0) return true;

  const now = Date.now();
  if (now - lastQuotaToast > 5000) {
    lastQuotaToast = now;
    if (plusRequired) {
      // 저절로 화면을 옮기지 않습니다 — 진행 중이던 화면이 정리되기 전에 이동하면 WebView 가 죽은 전례가 있어
      // (CLAUDE.md: setState + navigate 동시 호출 금지) 사용자가 눌러서 구독 화면으로 가게 합니다.
      toast(lastNotice, { action: { label: "Plus 보기", onClick: () => openPaywall() }, duration: 6000 });
    } else {
      toast(lastNotice);
    }
  }
  return true;
}

/**
 * 공개판 서버의 인증·허용 거절을 오류 코드로 바꿉니다. handleQuotaResponse 다음에 부르세요
 * (Plus 필요 403 은 그쪽이 먼저 처리합니다). 공개판 서버 응답이 아니면 빈 문자열 — 관리자판·회원판은 예전 그대로.
 *   401 (NO_SESSION 등)                         → "SESSION_EXPIRED" + 이 기기 세션을 지워 로그인 화면으로
 *   403 (KIND_NOT_ALLOWED·MODEL_NOT_ALLOWED 등)  → "NOT_AVAILABLE"
 * 화면은 aiErrors.ts 로 이 코드를 사용자 문장으로 바꿉니다.
 */
export function publicProxyError(res: Response, target: AiTarget): string {
  if (!target.publicProxy) return "";
  if (res.status === 401) {
    expireSession();
    return "SESSION_EXPIRED";
  }
  if (res.status === 403) return "NOT_AVAILABLE";
  // 서버가 일부러 멈춘 것(긴급 중지 AI_PAUSED·전체 하루 상한)은 머리글 x-kata-paused 로 알려 줍니다.
  // AI 쪽의 일시 오류(같은 503)와 달리 다른 모델로 다시 불러도 소용없으므로 바로 "지금은 사용할 수 없습니다"로 끝냅니다.
  if (res.status === 503 && res.headers.get("x-kata-paused")) return "NOT_AVAILABLE";
  return "";
}
