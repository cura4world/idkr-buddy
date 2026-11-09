// src/lib/account.ts
// 공개판(스토어 앱) 계정 — Google 로그인과 kata-public 서버 세션.
//
// 로그인 흐름:
//   네이티브 KataAuth.signIn(nonce) → (Credential Manager) → window.__kataAuthResult({ok, idToken})
//   → POST /auth/google {idToken, nonce} → 세션 토큰 (이 기기 localStorage 에만)
//
// 관리자판·회원판은 이 파일을 쓰지 않습니다. 세션이 없으면 publicHeaders() 가 null 이라
// aiProxy 가 이 길로 오지 않습니다.
// 이 파일은 gemini.ts / aiProxy.ts 를 import 하지 않습니다(순환 방지).

export const PUBLIC_BASE = "https://kata-public.cura4world.workers.dev";

const SESSION_KEY = "kata-public-session";
const REQ_TIMEOUT_MS = 15000;
const SIGNIN_TIMEOUT_MS = 180000;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface PublicPlan {
  tier: "free" | "plus";
  until: number;
  productId?: string;
}

export interface PublicSession {
  token: string;
  user: PublicUser;
  plan: PublicPlan;
  accountId: string; // Play 구매에 넣는 계정 표식 (서버가 만든 값)
  savedAt: number;
}

export interface PublicUsage {
  day: string;
  text: number;
  tts: number;
}

export interface PublicLimits {
  text: number;
  tts: number;
}

// ── 보관 ────────────────────────────────────────────────────

type Listener = (s: PublicSession | null) => void;
const listeners = new Set<Listener>();

export function getSession(): PublicSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.token !== "string" || !s.token || !s.user) return null;
    return s as PublicSession;
  } catch (e) {
    return null;
  }
}

function saveSession(s: PublicSession | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
  listeners.forEach((l) => {
    try { l(s); } catch (e) {}
  });
}

export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function hasPublicSession(): boolean {
  return getSession() !== null;
}

/** 공개판 서버에 보낼 인증 헤더. 세션이 없으면 null. */
export function publicHeaders(): Record<string, string> | null {
  const s = getSession();
  if (!s) return null;
  return { authorization: "Bearer " + s.token };
}

// ── 통신 ────────────────────────────────────────────────────

async function call(path: string, method: string, body?: unknown, auth = true): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth) {
    const h = publicHeaders();
    if (!h) throw new Error("NO_SESSION");
    Object.assign(headers, h);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, REQ_TIMEOUT_MS);
  try {
    return await fetch(PUBLIC_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("NETWORK_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

async function errorCode(res: Response): Promise<string> {
  try {
    const d = await res.json();
    return String((d && d.error) || "HTTP_" + res.status);
  } catch (e) {
    return "HTTP_" + res.status;
  }
}

// ── 네이티브 로그인 통로 ────────────────────────────────────

interface AuthBridge {
  signIn?: (nonce: string) => void;
  signOut?: () => void;
}

function authBridge(): AuthBridge | null {
  try {
    const w = window as unknown as { KataAuth?: AuthBridge };
    return w.KataAuth || null;
  } catch (e) {
    return null;
  }
}

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

interface NativeAuthResult {
  ok: boolean;
  idToken?: string;
  error?: string;
}

let pendingSignIn: ((r: NativeAuthResult) => void) | null = null;

// 네이티브가 결과를 이 함수로 돌려줍니다. 앱 시작 시 한 번 걸어 둡니다.
function installAuthCallback(): void {
  try {
    (window as unknown as { __kataAuthResult?: (r: NativeAuthResult) => void }).__kataAuthResult = (r) => {
      const done = pendingSignIn;
      pendingSignIn = null;
      if (done) done(r || { ok: false, error: "FAILED" });
    };
  } catch (e) {}
}
installAuthCallback();

function askNativeForIdToken(nonce: string): Promise<NativeAuthResult> {
  const bridge = authBridge();
  if (!bridge || typeof bridge.signIn !== "function") {
    return Promise.resolve({ ok: false, error: "NO_BRIDGE" });
  }
  // 앞선 요청이 끝나지 않았으면 취소된 것으로 처리합니다.
  if (pendingSignIn) pendingSignIn({ ok: false, error: "CANCELED" });
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingSignIn) {
        pendingSignIn = null;
        resolve({ ok: false, error: "TIMEOUT" });
      }
    }, SIGNIN_TIMEOUT_MS);
    pendingSignIn = (r) => {
      clearTimeout(timer);
      resolve(r);
    };
    try {
      bridge.signIn!(nonce);
    } catch (e) {
      pendingSignIn = null;
      clearTimeout(timer);
      resolve({ ok: false, error: "FAILED" });
    }
  });
}

/**
 * Google 로그인. 성공하면 세션을 저장하고 돌려줍니다.
 * 실패하면 Error(code): CANCELED · NO_ACCOUNT · NO_BRIDGE · TIMEOUT · NETWORK_FAILED · 서버 코드
 */
export async function signInWithGoogle(): Promise<PublicSession> {
  const nonce = makeNonce();
  const r = await askNativeForIdToken(nonce);
  if (!r.ok || !r.idToken) throw new Error(r.error || "FAILED");
  const res = await call("/auth/google", "POST", { idToken: r.idToken, nonce }, false);
  if (!res.ok) throw new Error(await errorCode(res));
  const d = await res.json();
  const s: PublicSession = {
    token: String(d.token),
    user: d.user,
    plan: d.plan || { tier: "free", until: 0 },
    accountId: String(d.accountId || ""),
    savedAt: Date.now(),
  };
  saveSession(s);
  return s;
}

/** 서버에서 계정·플랜·사용량을 다시 받습니다. 세션이 끊겼으면 로그아웃 처리합니다. */
export async function refreshMe(): Promise<{ plan: PublicPlan; usage: PublicUsage; limits: PublicLimits } | null> {
  const s = getSession();
  if (!s) return null;
  let res: Response;
  try {
    res = await call("/me", "GET");
  } catch (e) {
    return null; // 인터넷이 안 되면 지금 상태 유지
  }
  if (res.status === 401) {
    saveSession(null);
    return null;
  }
  if (!res.ok) return null;
  const d = await res.json();
  const next: PublicSession = Object.assign({}, s, {
    user: d.user || s.user,
    plan: d.plan || s.plan,
    accountId: d.accountId || s.accountId,
  });
  saveSession(next);
  return { plan: next.plan, usage: d.usage, limits: d.limits };
}

/** 세션의 플랜만 바꿔 저장합니다 (구독 검증 직후). */
export function updateSessionPlan(plan: PublicPlan): void {
  const s = getSession();
  if (!s) return;
  saveSession(Object.assign({}, s, { plan }));
}

export async function signOut(): Promise<void> {
  try { await call("/auth/signout", "POST", {}); } catch (e) {}
  try { authBridge()?.signOut?.(); } catch (e) {}
  saveSession(null);
}

/** 계정 삭제. 서버의 계정·사용량·구독 연결을 지우고 이 기기에서도 로그아웃합니다. */
export async function deleteAccount(): Promise<{ hadSubscription: boolean }> {
  const res = await call("/account/delete", "POST", {});
  if (!res.ok) throw new Error(await errorCode(res));
  const d = await res.json();
  try { authBridge()?.signOut?.(); } catch (e) {}
  saveSession(null);
  return { hadSubscription: !!d.hadSubscription };
}

/** AI 결과 신고 (Play 의 AI 생성 콘텐츠 정책). */
export async function sendAiReport(r: { feature: string; input: string; output: string; reason: string }): Promise<void> {
  const res = await call("/report", "POST", r);
  if (!res.ok) throw new Error(await errorCode(res));
}

/** 서버 요청 공용 (billing.ts 에서 씁니다). */
export async function publicPost(path: string, body: unknown): Promise<Response> {
  return call(path, "POST", body);
}

/** 로그인 실패 코드를 사람이 읽을 문장으로. */
export function signInErrorText(code: string): string {
  if (code === "CANCELED") return "";
  if (code === "NO_ACCOUNT") return "이 폰에 Google 계정이 없습니다. 폰 설정에서 Google 계정을 추가해 주세요";
  if (code === "NO_BRIDGE") return "Play 스토어에서 받은 앱에서만 로그인할 수 있습니다";
  if (code === "NETWORK_FAILED" || code === "TIMEOUT") return "인터넷 연결을 확인하고 다시 눌러 주세요";
  return "로그인하지 못했습니다. 잠시 뒤 다시 눌러 주세요 (" + code + ")";
}
