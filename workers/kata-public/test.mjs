// kata-public Worker 자동 테스트 — 실제 구글·클라우드플레어 없이 돌립니다.
//   node --test workers/kata-public/test.mjs
// 가짜 KV, 가짜 구글 키(JWKS), 가짜 Cloud Run·Play API 를 씁니다.

import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { __resetCachesForTest } from "./worker.js";

const ORIGIN = "https://cura4world.github.io";
const CLIENT_ID = "web-client.apps.googleusercontent.com";
const PROXY = "https://kata-ai.example.run.app";

// ── 가짜 KV ─────────────────────────────────────────────────
function makeKV() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix = "", limit = 1000 } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

// ── 키 만들기 ───────────────────────────────────────────────
const b64url = (bytes) => Buffer.from(bytes).toString("base64").replace(new RegExp("\\+", "g"), "-")
  .replace(new RegExp("/", "g"), "_").replace(new RegExp("=+$"), "");
const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));

const googleKeys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"],
);
const googleJwk = Object.assign(await crypto.subtle.exportKey("jwk", googleKeys.publicKey), { kid: "k1", alg: "RS256", use: "sig" });
const otherKeys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"],
);
const saKeys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"],
);
const saPkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", saKeys.privateKey)).toString("base64");
const saPem = "-----BEGIN PRIVATE KEY-----\n" + saPkcs8.match(new RegExp(".{1,64}", "g")).join("\n") + "\n-----END PRIVATE KEY-----\n";

async function idToken(claims, key = googleKeys.privateKey, kid = "k1") {
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({
    iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "1001", email: "a@example.com",
    email_verified: true, name: "Arga", iat: now, exp: now + 3600,
  }, claims);
  const head = enc({ alg: "RS256", kid, typ: "JWT" });
  const body = enc(payload);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + body));
  return head + "." + body + "." + b64url(new Uint8Array(sig));
}

async function sha256hex(t) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// ── 가짜 바깥 세상 ──────────────────────────────────────────
const calls = [];
let playSub = null; // 테스트마다 바꿈
let proxyStatus = 200;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  calls.push({ url, init });
  if (url === "https://www.googleapis.com/oauth2/v3/certs") {
    return new Response(JSON.stringify({ keys: [googleJwk] }), { status: 200 });
  }
  if (url === PROXY) {
    if (proxyStatus !== 200) return new Response(JSON.stringify({ error: { code: proxyStatus } }), { status: proxyStatus });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  if (url === "https://oauth2.googleapis.com/token") {
    return new Response(JSON.stringify({ access_token: "play-access", expires_in: 3600 }), { status: 200 });
  }
  if (url.indexOf("/purchases/subscriptionsv2/tokens/") > 0) {
    if (!playSub) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(playSub), { status: 200 });
  }
  if (url.endsWith(":acknowledge")) return new Response("{}", { status: 200 });
  return new Response("not mocked: " + url, { status: 599 });
};

function makeEnv(extra = {}) {
  return Object.assign({
    PUBLIC_KV: makeKV(),
    GOOGLE_WEB_CLIENT_ID: CLIENT_ID,
    AI_PROXY_URL: PROXY,
    PROXY_SECRET: "proxy-secret",
    PLAY_PACKAGE: "app.naruve.katakata",
    PLAY_SERVICE_ACCOUNT: JSON.stringify({ client_email: "sa@x.iam.gserviceaccount.com", private_key: saPem }),
    ADMIN_KEY: "admin-key",
  }, extra);
}

async function call(env, method, path, { body, token, headers = {} } = {}) {
  const h = Object.assign({ origin: ORIGIN }, headers);
  if (token) h.authorization = "Bearer " + token;
  if (body !== undefined) h["content-type"] = "application/json";
  const req = new Request("https://kata-public.example.workers.dev" + path, {
    method, headers: h, body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
  });
  const res = await worker.fetch(req, env);
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function login(env, claims) {
  const r = await call(env, "POST", "/auth/google", { body: { idToken: await idToken(claims) } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.token;
}

const textBody = (max) => ({ contents: [{ parts: [{ text: "hi" }] }], generationConfig: max ? { maxOutputTokens: max } : {} });
const ttsBody = { contents: [{ parts: [{ text: "Selamat pagi" }] }], generationConfig: { responseModalities: ["AUDIO"] } };

// ── 테스트 ──────────────────────────────────────────────────

test("살아 있음 + CORS", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const r = await call(env, "GET", "/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
  const r2 = await call(env, "GET", "/", { headers: { origin: "https://evil.example" } });
  assert.equal(r2.headers.get("access-control-allow-origin"), null);
});

test("로그인: 올바른 토큰은 세션, 잘못된 토큰은 거절", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const ok = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({}) } });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token.length >= 40);
  assert.equal(ok.data.user.email, "a@example.com");
  assert.equal(ok.data.plan.tier, "free");
  assert.equal(ok.data.accountId.length, 64);
  // 세션 토큰 원문은 KV 에 없어야 함 (해시로만)
  assert.ok(![...env.PUBLIC_KV.m.keys()].some((k) => k.indexOf(ok.data.token) >= 0));

  const badAud = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ aud: "other" }) } });
  assert.equal(badAud.data.error, "BAD_AUDIENCE");
  const expired = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ exp: 1000 }) } });
  assert.equal(expired.data.error, "TOKEN_EXPIRED");
  const forged = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({}, otherKeys.privateKey) } });
  assert.equal(forged.status, 401);
  const badIss = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ iss: "evil" }) } });
  assert.equal(badIss.data.error, "BAD_ISSUER");
  const nonce = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ nonce: "n1" }), nonce: "n2" } });
  assert.equal(nonce.data.error, "BAD_NONCE");
  const notConfigured = await call(makeEnv({ GOOGLE_WEB_CLIENT_ID: "" }), "POST", "/auth/google", { body: { idToken: await idToken({}) } });
  assert.equal(notConfigured.data.error, "NOT_CONFIGURED");
});

test("/me 와 로그아웃", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const t = await login(env);
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.status, 200);
  assert.equal(me.data.limits.text, 200);
  assert.equal(me.data.usage.text, 0);
  assert.equal((await call(env, "GET", "/me")).status, 401);
  assert.equal((await call(env, "GET", "/me", { token: "nope" })).status, 401);
  assert.equal((await call(env, "POST", "/auth/signout", { token: t })).status, 200);
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 401);
});

test("AI 대리 호출: 허용·차단·한도·출력 상한", async () => {
  __resetCachesForTest();
  calls.length = 0;
  proxyStatus = 200;
  const env = makeEnv({ LIMITS_JSON: JSON.stringify({ free: { tts: 2 } }) });
  const t = await login(env);
  const path = (m) => "/ai/gemini/" + m + ":generateContent";

  const ok = await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: textBody(99999), headers: { "x-kata-kind": "text" } });
  assert.equal(ok.status, 200);
  const sent = calls.find((c) => c.url === PROXY);
  assert.equal(sent.init.headers["x-kata-proxy"], "proxy-secret");
  assert.equal(sent.init.headers["x-kata-model"], "gemini-3.1-flash-lite");
  assert.equal(JSON.parse(sent.init.body).generationConfig.maxOutputTokens, 16384);

  assert.equal((await call(env, "POST", path("gemini-3.8-flash"), { token: t, body: textBody(), headers: { "x-kata-kind": "text" } })).data.error, "MODEL_NOT_ALLOWED");
  assert.equal((await call(env, "POST", path("gemini-3.8-flash"), { token: t, body: textBody(), headers: { "x-kata-kind": "news" } })).data.error, "KIND_NOT_ALLOWED");
  const withTools = Object.assign(textBody(), { tools: [{ google_search: {} }] });
  assert.equal((await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: withTools })).data.error, "TOOLS_NOT_ALLOWED");
  assert.equal((await call(env, "POST", path("gemini-3.8-flash-lite-tts"), { token: t, body: textBody(), headers: { "x-kata-kind": "tts" } })).data.error, "KIND_MISMATCH");
  assert.equal((await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: "x".repeat(40000) })).data.error, "BODY_TOO_LARGE");
  assert.equal((await call(env, "POST", path("gemini-3.1-flash-lite"), { body: textBody() })).status, 401);

  // 실패한 호출은 세지 않음
  proxyStatus = 500;
  const fail = await call(env, "POST", path("gemini-3.8-flash-lite-tts"), { token: t, body: ttsBody, headers: { "x-kata-kind": "tts" } });
  assert.equal(fail.status, 500);
  proxyStatus = 200;
  for (let i = 0; i < 2; i++) {
    const r = await call(env, "POST", path("gemini-3.8-flash-lite-tts"), { token: t, body: ttsBody, headers: { "x-kata-kind": "tts" } });
    assert.equal(r.status, 200);
  }
  const over = await call(env, "POST", path("gemini-3.8-flash-lite-tts"), { token: t, body: ttsBody, headers: { "x-kata-kind": "tts" } });
  assert.equal(over.status, 429);
  assert.equal(over.data.error, "QUOTA_TTS");
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.usage.tts, 2);
  assert.equal(me.data.usage.text, 1);
});

test("구독 검증: 계정 일치·확인·Plus 반영·남의 구매 거절", async () => {
  __resetCachesForTest();
  calls.length = 0;
  const env = makeEnv();
  const t = await login(env);
  const me = await call(env, "GET", "/me", { token: t });
  const future = new Date(Date.now() + 30 * 86400000).toISOString();
  playSub = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    lineItems: [{ productId: "plus", expiryTime: future }],
    externalAccountIdentifiers: { obfuscatedExternalAccountId: me.data.accountId },
  };
  assert.equal((await call(env, "POST", "/billing/verify", { token: t, body: { productId: "other", purchaseToken: "pt1" } })).data.error, "BAD_REQUEST");
  const v = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "pt1" } });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.plan.tier, "plus");
  assert.ok(calls.some((c) => c.url.endsWith(":acknowledge")));
  // 서비스 계정 서명이 실제로 만들어졌는지 (토큰 교환 요청에 assertion 이 들어감)
  const tokenCall = calls.find((c) => c.url === "https://oauth2.googleapis.com/token");
  assert.ok(String(tokenCall.init.body).indexOf("assertion=") >= 0);
  const me2 = await call(env, "GET", "/me", { token: t });
  assert.equal(me2.data.limits.text, 1000);

  // 다른 계정이 같은 구매를 붙이려 하면 거절 (계정 표식이 다름)
  const t2 = await login(env, { sub: "2002", email: "b@example.com" });
  const steal = await call(env, "POST", "/billing/verify", { token: t2, body: { productId: "plus", purchaseToken: "pt1" } });
  assert.equal(steal.data.error, "ACCOUNT_MISMATCH");
  // 계정 표식이 빠진 구매라도 이미 주인이 있으면 거절
  delete playSub.externalAccountIdentifiers;
  const steal2 = await call(env, "POST", "/billing/verify", { token: t2, body: { productId: "plus", purchaseToken: "pt1" } });
  assert.equal(steal2.data.error, "PURCHASE_OWNED_BY_OTHER");

  // 만료된 구독은 Plus 가 아님
  __resetCachesForTest();
  playSub = { subscriptionState: "SUBSCRIPTION_STATE_EXPIRED", lineItems: [{ productId: "plus", expiryTime: "2020-01-01T00:00:00Z" }] };
  const t3 = await login(env, { sub: "3003" });
  const ex = await call(env, "POST", "/billing/verify", { token: t3, body: { productId: "plus", purchaseToken: "pt3" } });
  assert.equal(ex.data.valid, false);
  assert.equal(ex.data.plan.tier, "free");
  playSub = null;
});

test("신고와 관리자 조회", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const t = await login(env);
  const r = await call(env, "POST", "/report", { token: t, body: { feature: "dictionary", input: "buruk", output: "x".repeat(5000), reason: "뜻이 틀림" } });
  assert.equal(r.status, 200);
  assert.equal((await call(env, "GET", "/admin/reports")).status, 403);
  assert.equal((await call(env, "GET", "/admin/reports", { headers: { "x-admin-key": "wrong-key" } })).status, 403);
  const list = await call(env, "GET", "/admin/reports", { headers: { "x-admin-key": "admin-key" } });
  assert.equal(list.data.items.length, 1);
  assert.equal(list.data.items[0].output.length, 2000);
  assert.equal(list.data.items[0].uid, "(있음)");
});

test("계정 삭제: 세션·계정·구독 연결·사용량이 지워지고 신고는 익명", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const t = await login(env);
  const me = await call(env, "GET", "/me", { token: t });
  playSub = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 86400000).toISOString() }],
    externalAccountIdentifiers: { obfuscatedExternalAccountId: me.data.accountId },
  };
  await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "pt9" } });
  await call(env, "POST", "/ai/gemini/gemini-3.1-flash-lite:generateContent", { token: t, body: textBody() });
  await call(env, "POST", "/report", { token: t, body: { feature: "story", reason: "이상함" } });
  const del = await call(env, "POST", "/account/delete", { token: t });
  assert.equal(del.status, 200);
  assert.equal(del.data.hadSubscription, true);
  const keys = [...env.PUBLIC_KV.m.keys()];
  assert.deepEqual(keys.filter((k) => !k.startsWith("report:")), [], "남은 키: " + keys.join(", "));
  const rep = JSON.parse(env.PUBLIC_KV.m.get(keys.find((k) => k.startsWith("report:"))));
  assert.equal(rep.uid, null);
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 401);
  assert.equal(await env.PUBLIC_KV.get("ptok:" + (await sha256hex("pt9"))), null);
  playSub = null;
});
