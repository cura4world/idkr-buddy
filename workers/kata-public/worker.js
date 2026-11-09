// kata-public — Kata kata 공개판(스토어 앱) 전용 서버 (Cloudflare Worker)
//
// 관리자판·회원판이 쓰는 kata-sermon Worker 와는 완전히 따로 돕니다.
// 공개판 사용자의 계정·사용량·구독·신고는 여기 KV(PUBLIC_KV)에만 쌓입니다.
//
//   POST /auth/google                       Google ID 토큰 → 세션
//   GET  /me                                내 계정·플랜·오늘 사용량·한도
//   POST /auth/signout                      이 세션 끊기
//   POST /account/delete                    계정과 서버 데이터 삭제
//   POST /ai/gemini/{model}:generateContent Gemini 대리 호출 (한도·허용 모델)
//   POST /billing/verify                    Play 구독 검증·확인(acknowledge)
//   POST /report                            AI 결과 신고
//   GET  /admin/reports                     신고 목록 (x-admin-key)
//
// 설정(비밀값·변수)은 docs/release/03-architecture.md 의 표를 봅니다.
// 이 파일에는 정규식 리터럴을 쓰지 않습니다(저장소 규칙). new RegExp 만 씁니다.

const APP_ORIGINS = ["https://cura4world.github.io"];

// 잠정 한도 — 요금·혜택은 재논의 예정이라 LIMITS_JSON 변수로 덮어쓸 수 있게 둡니다.
// 무료 텍스트 200 은 "사실상 무제한"(사전 풀이는 무제한으로 주기로 함)이고 남용 방지용 상한입니다.
const DEFAULT_LIMITS = {
  free: { text: 200, tts: 30, report: 20 },
  plus: { text: 1000, tts: 400, report: 50 },
};

const TEXT_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];

const SESSION_TTL_SEC = 60 * 24 * 3600;
const MAX_SESSIONS_PER_USER = 10;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_TEXT_OUTPUT_TOKENS = 16384;
const AI_TIMEOUT_MS = 100000;
const API_TIMEOUT_MS = 15000;
const ENT_RECHECK_MS = 60 * 60 * 1000;
const DEFAULT_PRODUCT_IDS = ["plus"];
const VALID_SUB_STATES = [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED", // 자동 갱신만 꺼진 상태 — 만료 시각까지는 이용 가능
];

const AI_PATH_RE = new RegExp("^/ai/gemini/([A-Za-z0-9.\\-]+):generateContent$");
const PEM_HEADER_RE = new RegExp("-----[^-]+-----", "g");
const SPACE_RE = new RegExp("\\s", "g");

// ── 공용 ─────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const h = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-kata-kind, x-admin-key",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (APP_ORIGINS.indexOf(origin) >= 0) h["access-control-allow-origin"] = origin;
  return h;
}

function json(request, data, status) {
  const headers = corsHeaders(request);
  headers["content-type"] = "application/json; charset=utf-8";
  headers["cache-control"] = "no-store";
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

async function tfetch(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, init, { signal: controller.signal }));
  } catch (e) {
    throw new HttpError(504, "UPSTREAM_UNREACHABLE");
  } finally {
    clearTimeout(timer);
  }
}

function b64urlToBytes(s) {
  let b64 = s.split("-").join("+").split("_").join("/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).split("+").join("-").split("/").join("_").split("=").join("");
}

function b64urlToString(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToB64url(bytes);
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function kvGetJson(env, key) {
  const raw = await env.PUBLIC_KV.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function kvPutJson(env, key, value, ttlSec) {
  const opts = ttlSec ? { expirationTtl: ttlSec } : undefined;
  await env.PUBLIC_KV.put(key, JSON.stringify(value), opts);
}

// 한국 날짜 (사용량은 한국 자정에 0 으로)
function kstDay(nowMs) {
  return new Date(nowMs + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function getLimits(env) {
  const out = JSON.parse(JSON.stringify(DEFAULT_LIMITS));
  if (env.LIMITS_JSON) {
    try {
      const o = JSON.parse(env.LIMITS_JSON);
      ["free", "plus"].forEach((tier) => {
        if (o[tier]) Object.keys(o[tier]).forEach((k) => {
          const n = Number(o[tier][k]);
          if (isFinite(n) && n >= 0) out[tier][k] = n;
        });
      });
    } catch (e) {}
  }
  return out;
}

function productIds(env) {
  if (env.PRODUCT_IDS) return String(env.PRODUCT_IDS).split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_PRODUCT_IDS;
}

async function readJsonBody(request, maxBytes) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "BODY_TOO_LARGE");
  if (!text) return {};
  try { return JSON.parse(text); } catch (e) { throw new HttpError(400, "BAD_JSON"); }
}

// ── Google ID 토큰 검증 ──────────────────────────────────────

let jwksCache = null; // { keys, at }

async function googleJwks() {
  if (jwksCache && Date.now() - jwksCache.at < 3600 * 1000) return jwksCache.keys;
  const res = await tfetch("https://www.googleapis.com/oauth2/v3/certs", {}, API_TIMEOUT_MS);
  if (!res.ok) throw new HttpError(502, "JWKS_FAILED");
  const data = await res.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache = { keys, at: Date.now() };
  return keys;
}

async function verifyGoogleIdToken(env, idToken, nonce) {
  if (typeof idToken !== "string") throw new HttpError(400, "BAD_TOKEN");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new HttpError(401, "BAD_TOKEN");
  let header, payload;
  try {
    header = JSON.parse(b64urlToString(parts[0]));
    payload = JSON.parse(b64urlToString(parts[1]));
  } catch (e) {
    throw new HttpError(401, "BAD_TOKEN");
  }
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "BAD_TOKEN");

  let keys = await googleJwks();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = null; // 구글이 키를 돌렸을 수 있음 → 한 번 다시 받기
    keys = await googleJwks();
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new HttpError(401, "BAD_TOKEN");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1]),
  );
  if (!ok) throw new HttpError(401, "BAD_TOKEN");

  const now = Math.floor(Date.now() / 1000);
  const audiences = String(env.GOOGLE_WEB_CLIENT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (audiences.length === 0) throw new HttpError(500, "NOT_CONFIGURED");
  if (audiences.indexOf(payload.aud) < 0) throw new HttpError(401, "BAD_AUDIENCE");
  if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
    throw new HttpError(401, "BAD_ISSUER");
  }
  if (typeof payload.exp !== "number" || payload.exp < now - 60) throw new HttpError(401, "TOKEN_EXPIRED");
  if (!payload.sub) throw new HttpError(401, "BAD_TOKEN");
  if (payload.email_verified === false) throw new HttpError(401, "EMAIL_NOT_VERIFIED");
  if (nonce && payload.nonce !== nonce) throw new HttpError(401, "BAD_NONCE");
  return payload;
}

// ── 세션 ─────────────────────────────────────────────────────

async function createSession(env, uid) {
  const token = randomToken();
  const h = await sha256hex(token);
  const exp = Date.now() + SESSION_TTL_SEC * 1000;
  await kvPutJson(env, "sess:" + h, { uid, exp }, SESSION_TTL_SEC);
  const list = (await kvGetJson(env, "usess:" + uid)) || [];
  list.push(h);
  // 오래된 세션은 끊습니다 (기기 10대 넘게 동시에 로그인할 일은 없다고 봄)
  while (list.length > MAX_SESSIONS_PER_USER) {
    const old = list.shift();
    await env.PUBLIC_KV.delete("sess:" + old);
  }
  await kvPutJson(env, "usess:" + uid, list);
  return token;
}

async function requireAuth(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (auth.indexOf("Bearer ") !== 0) throw new HttpError(401, "NO_SESSION");
  const token = auth.slice(7).trim();
  if (!token) throw new HttpError(401, "NO_SESSION");
  const h = await sha256hex(token);
  const sess = await kvGetJson(env, "sess:" + h);
  if (!sess || !sess.uid || sess.exp < Date.now()) throw new HttpError(401, "NO_SESSION");
  const user = await kvGetJson(env, "user:" + sess.uid);
  if (!user) throw new HttpError(401, "NO_SESSION");
  return { uid: sess.uid, user, sessHash: h };
}

function publicUser(user) {
  return { id: user.uid, email: user.email || "", name: user.name || "", picture: user.picture || "" };
}

// ── 플랜 ─────────────────────────────────────────────────────

async function getPlan(env, uid) {
  const ent = await kvGetJson(env, "ent:" + uid);
  if (!ent || ent.tier !== "plus") return { tier: "free", until: 0 };
  const now = Date.now();
  if (ent.until > now) return { tier: "plus", until: ent.until, productId: ent.productId };
  // 만료가 지났으면 갱신됐는지 한 시간에 한 번까지 Play 에 다시 묻습니다.
  if (ent.purchaseToken && env.PLAY_SERVICE_ACCOUNT && now - (ent.checkedAt || 0) > ENT_RECHECK_MS) {
    try {
      const r = await verifyWithPlay(env, uid, ent.productId, ent.purchaseToken);
      if (r.until > now) return { tier: "plus", until: r.until, productId: ent.productId };
    } catch (e) {}
  }
  return { tier: "free", until: 0 };
}

// ── 사용량 ───────────────────────────────────────────────────

async function readUsage(env, uid) {
  const day = kstDay(Date.now());
  const u = (await kvGetJson(env, "use:" + uid + ":" + day)) || {};
  return { day, text: u.text || 0, tts: u.tts || 0, report: u.report || 0 };
}

async function addUsage(env, uid, kind) {
  const day = kstDay(Date.now());
  const key = "use:" + uid + ":" + day;
  const u = (await kvGetJson(env, key)) || {};
  u[kind] = (u[kind] || 0) + 1;
  await kvPutJson(env, key, u, 3 * 24 * 3600);
}

// ── Play 구독 검증 ───────────────────────────────────────────

let playTokenCache = null; // { token, exp }

function pemToDer(pem) {
  const b64 = String(pem).replace(PEM_HEADER_RE, "").replace(SPACE_RE, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function playAccessToken(env) {
  if (playTokenCache && playTokenCache.exp > Date.now() + 60000) return playTokenCache.token;
  let sa;
  try { sa = JSON.parse(env.PLAY_SERVICE_ACCOUNT); } catch (e) { throw new HttpError(500, "NOT_CONFIGURED"); }
  if (!sa || !sa.client_email || !sa.private_key) throw new HttpError(500, "NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = bytesToB64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(header + "." + claims),
  ));
  const assertion = header + "." + claims + "." + bytesToB64url(sig);
  const res = await tfetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" + encodeURIComponent(assertion),
  }, API_TIMEOUT_MS);
  if (!res.ok) throw new HttpError(502, "PLAY_AUTH_FAILED");
  const data = await res.json();
  if (!data.access_token) throw new HttpError(502, "PLAY_AUTH_FAILED");
  playTokenCache = { token: data.access_token, exp: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return playTokenCache.token;
}

async function obfuscatedIdFor(uid) {
  return (await sha256hex(uid)).slice(0, 64);
}

async function verifyWithPlay(env, uid, productId, purchaseToken) {
  const pkg = env.PLAY_PACKAGE || "app.naruve.katakata";
  const access = await playAccessToken(env);
  const base = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + encodeURIComponent(pkg);
  const res = await tfetch(
    base + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(purchaseToken),
    { headers: { authorization: "Bearer " + access } },
    API_TIMEOUT_MS,
  );
  if (res.status === 404 || res.status === 400 || res.status === 410) throw new HttpError(400, "PURCHASE_NOT_FOUND");
  if (!res.ok) throw new HttpError(502, "PLAY_API_FAILED");
  const sub = await res.json();

  const items = Array.isArray(sub.lineItems) ? sub.lineItems : [];
  const item = items.find((li) => li && li.productId === productId) || null;
  if (!item) throw new HttpError(400, "PRODUCT_MISMATCH");
  const until = Date.parse(item.expiryTime || "") || 0;

  // 이 구매가 이 계정에서 시작됐는지 (구매할 때 obfuscatedAccountId 를 넣었음)
  const expected = await obfuscatedIdFor(uid);
  const got = sub.externalAccountIdentifiers && sub.externalAccountIdentifiers.obfuscatedExternalAccountId;
  if (got && got !== expected) throw new HttpError(403, "ACCOUNT_MISMATCH");

  const tokenHash = await sha256hex(purchaseToken);
  const owner = await env.PUBLIC_KV.get("ptok:" + tokenHash);
  if (owner && owner !== uid) throw new HttpError(409, "PURCHASE_OWNED_BY_OTHER");

  const valid = VALID_SUB_STATES.indexOf(sub.subscriptionState) >= 0 && until > Date.now();

  // 확인(acknowledge)하지 않으면 사흘 뒤 Google 이 환불합니다.
  if (valid && sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
    const ack = await tfetch(
      base + "/purchases/subscriptions/" + encodeURIComponent(productId) +
        "/tokens/" + encodeURIComponent(purchaseToken) + ":acknowledge",
      { method: "POST", headers: { authorization: "Bearer " + access, "content-type": "application/json" }, body: "{}" },
      API_TIMEOUT_MS,
    );
    if (!ack.ok) throw new HttpError(502, "ACK_FAILED");
  }

  await env.PUBLIC_KV.put("ptok:" + tokenHash, uid, { expirationTtl: 400 * 24 * 3600 });
  await kvPutJson(env, "ent:" + uid, {
    tier: valid ? "plus" : "free",
    productId,
    purchaseToken,
    tokenHash,
    until: valid ? until : 0,
    state: sub.subscriptionState || "",
    checkedAt: Date.now(),
  });
  return { valid, until: valid ? until : 0 };
}

// ── 경로 ─────────────────────────────────────────────────────

async function handleAuthGoogle(request, env) {
  const body = await readJsonBody(request, 8 * 1024);
  const payload = await verifyGoogleIdToken(env, body.idToken, body.nonce || "");
  const uid = "g_" + payload.sub;
  const prev = await kvGetJson(env, "user:" + uid);
  const user = {
    uid,
    email: payload.email || "",
    name: payload.name || "",
    picture: payload.picture || "",
    createdAt: prev && prev.createdAt ? prev.createdAt : Date.now(),
    lastLoginAt: Date.now(),
  };
  await kvPutJson(env, "user:" + uid, user);
  const token = await createSession(env, uid);
  const plan = await getPlan(env, uid);
  return json(request, { token, user: publicUser(user), plan, accountId: await obfuscatedIdFor(uid) });
}

async function handleMe(request, env) {
  const a = await requireAuth(request, env);
  const plan = await getPlan(env, a.uid);
  const usage = await readUsage(env, a.uid);
  const limits = getLimits(env)[plan.tier];
  return json(request, { user: publicUser(a.user), plan, usage, limits, accountId: await obfuscatedIdFor(a.uid) });
}

async function handleSignout(request, env) {
  const a = await requireAuth(request, env);
  await env.PUBLIC_KV.delete("sess:" + a.sessHash);
  const list = ((await kvGetJson(env, "usess:" + a.uid)) || []).filter((h) => h !== a.sessHash);
  await kvPutJson(env, "usess:" + a.uid, list);
  return json(request, { ok: true });
}

async function handleDelete(request, env) {
  const a = await requireAuth(request, env);
  const uid = a.uid;
  const list = (await kvGetJson(env, "usess:" + uid)) || [];
  for (const h of list) await env.PUBLIC_KV.delete("sess:" + h);
  await env.PUBLIC_KV.delete("sess:" + a.sessHash);
  await env.PUBLIC_KV.delete("usess:" + uid);

  const ent = await kvGetJson(env, "ent:" + uid);
  const hadSubscription = !!(ent && ent.tier === "plus" && ent.until > Date.now());
  if (ent && ent.tokenHash) await env.PUBLIC_KV.delete("ptok:" + ent.tokenHash);
  await env.PUBLIC_KV.delete("ent:" + uid);

  let cursor;
  do {
    const page = await env.PUBLIC_KV.list({ prefix: "use:" + uid + ":", cursor });
    for (const k of page.keys) await env.PUBLIC_KV.delete(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // 신고 내용은 남기되(서비스 품질 개선용) 누가 보냈는지는 지웁니다.
  const reports = (await kvGetJson(env, "ureports:" + uid)) || [];
  for (const key of reports) {
    const r = await kvGetJson(env, key);
    if (r) {
      r.uid = null;
      await kvPutJson(env, key, r, 180 * 24 * 3600);
    }
  }
  await env.PUBLIC_KV.delete("ureports:" + uid);
  await env.PUBLIC_KV.delete("user:" + uid);
  return json(request, { deleted: true, hadSubscription });
}

function checkAiBody(kind, body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.contents)) throw new HttpError(400, "BAD_REQUEST");
  if (body.tools || body.toolConfig || body.tool_config || body.cachedContent) throw new HttpError(403, "TOOLS_NOT_ALLOWED");
  const gc = body.generationConfig || {};
  const modalities = Array.isArray(gc.responseModalities) ? gc.responseModalities : [];
  const wantsAudio = modalities.indexOf("AUDIO") >= 0;
  if (kind === "tts" && !wantsAudio) throw new HttpError(400, "KIND_MISMATCH");
  if (kind === "text") {
    if (wantsAudio) throw new HttpError(400, "KIND_MISMATCH");
    if (gc.maxOutputTokens && Number(gc.maxOutputTokens) > MAX_TEXT_OUTPUT_TOKENS) {
      gc.maxOutputTokens = MAX_TEXT_OUTPUT_TOKENS;
      body.generationConfig = gc;
    }
  }
  return body;
}

async function handleAi(request, env, model) {
  const a = await requireAuth(request, env);
  const kind = (request.headers.get("x-kata-kind") || "text").toLowerCase();
  if (kind !== "text" && kind !== "tts") throw new HttpError(403, "KIND_NOT_ALLOWED");
  const allowed = kind === "tts" ? TTS_MODELS : TEXT_MODELS;
  if (allowed.indexOf(model) < 0) throw new HttpError(403, "MODEL_NOT_ALLOWED");

  const body = checkAiBody(kind, await readJsonBody(request, MAX_BODY_BYTES));

  const plan = await getPlan(env, a.uid);
  const limit = getLimits(env)[plan.tier][kind];
  const usage = await readUsage(env, a.uid);
  if (usage[kind] >= limit) {
    return json(request, { error: kind === "tts" ? "QUOTA_TTS" : "QUOTA_TEXT", limit, plan: plan.tier }, 429);
  }

  if (!env.AI_PROXY_URL || !env.PROXY_SECRET) throw new HttpError(500, "NOT_CONFIGURED");
  const res = await tfetch(env.AI_PROXY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kata-proxy": env.PROXY_SECRET,
      "x-kata-model": model,
    },
    body: JSON.stringify(body),
  }, AI_TIMEOUT_MS);

  // 성공한 호출만 셉니다. 실패 응답은 상태 그대로 돌려줘야 앱의 폴백(3.8 → 3.1)이 동작합니다.
  if (res.ok) await addUsage(env, a.uid, kind);
  const headers = corsHeaders(request);
  headers["content-type"] = res.headers.get("content-type") || "application/json";
  headers["cache-control"] = "no-store";
  return new Response(res.body, { status: res.status, headers });
}

async function handleBillingVerify(request, env) {
  const a = await requireAuth(request, env);
  const body = await readJsonBody(request, 8 * 1024);
  const productId = String(body.productId || "");
  const purchaseToken = String(body.purchaseToken || "");
  if (!purchaseToken || productIds(env).indexOf(productId) < 0) throw new HttpError(400, "BAD_REQUEST");
  const r = await verifyWithPlay(env, a.uid, productId, purchaseToken);
  const plan = await getPlan(env, a.uid);
  return json(request, { valid: r.valid, plan });
}

function clip(v, n) {
  return String(v == null ? "" : v).slice(0, n);
}

async function handleReport(request, env) {
  const a = await requireAuth(request, env);
  const body = await readJsonBody(request, 16 * 1024);
  const plan = await getPlan(env, a.uid);
  const usage = await readUsage(env, a.uid);
  if (usage.report >= getLimits(env)[plan.tier].report) return json(request, { error: "QUOTA_REPORT" }, 429);
  const rand = randomToken().slice(0, 8);
  const key = "report:" + new Date().toISOString() + "-" + rand;
  await kvPutJson(env, key, {
    at: Date.now(),
    uid: a.uid,
    feature: clip(body.feature, 20),
    input: clip(body.input, 500),
    output: clip(body.output, 2000),
    reason: clip(body.reason, 200),
  }, 180 * 24 * 3600);
  const mine = (await kvGetJson(env, "ureports:" + a.uid)) || [];
  mine.push(key);
  await kvPutJson(env, "ureports:" + a.uid, mine.slice(-200), 180 * 24 * 3600);
  await addUsage(env, a.uid, "report");
  return json(request, { ok: true });
}

async function handleAdminReports(request, env, url) {
  const given = request.headers.get("x-admin-key") || "";
  if (!env.ADMIN_KEY || !safeEqual(given, env.ADMIN_KEY)) throw new HttpError(403, "FORBIDDEN");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const page = await env.PUBLIC_KV.list({ prefix: "report:", limit });
  const items = [];
  for (const k of page.keys) {
    const r = await kvGetJson(env, k.name);
    if (r) items.push(Object.assign({ key: k.name }, r, { uid: r.uid ? "(있음)" : null }));
  }
  return json(request, { items });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

  if (method === "GET" && path === "/") return json(request, { ok: true, service: "kata-public" });
  if (method === "POST" && path === "/auth/google") return handleAuthGoogle(request, env);
  if (method === "GET" && path === "/me") return handleMe(request, env);
  if (method === "POST" && path === "/auth/signout") return handleSignout(request, env);
  if (method === "POST" && path === "/account/delete") return handleDelete(request, env);
  if (method === "POST" && path === "/billing/verify") return handleBillingVerify(request, env);
  if (method === "POST" && path === "/report") return handleReport(request, env);
  if (method === "GET" && path === "/admin/reports") return handleAdminReports(request, env, url);

  const m = method === "POST" ? path.match(AI_PATH_RE) : null;
  if (m) return handleAi(request, env, m[1]);

  return json(request, { error: "NOT_FOUND" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) return json(request, { error: e.code }, e.status);
      return json(request, { error: "SERVER_ERROR" }, 500);
    }
  },
};

// 테스트에서 캐시를 비우기 위한 내부 함수 (운영에서는 쓰지 않음)
export function __resetCachesForTest() {
  jwksCache = null;
  playTokenCache = null;
}
