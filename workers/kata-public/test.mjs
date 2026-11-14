// kata-public Worker 자동 테스트 — 실제 구글·클라우드플레어 없이 돌립니다.
//   node --test workers/kata-public/test.mjs
// 가짜 KV, 가짜 구글 키(JWKS), 가짜 Cloud Run·Play API 를 씁니다.

import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { __resetCachesForTest, UsageCounter } from "./worker.js";

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
let proxyEmpty = false; // true 면 AI 가 200 으로 답하지만 글·소리가 비어 있음
let playStatus = 200; // Play 구독 조회 응답 상태 (503 = 일시 오류 흉내)
let ackStatus = 200;  // Play 확인(acknowledge) 응답 상태 (403 = 서비스 계정 권한 빠짐 흉내)

// 시계 옮기기 — 서버 코드는 Date.now() 만 쓰므로 이것만 밀면 "하루 뒤"를 만들 수 있습니다.
const realNow = Date.now.bind(Date);
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const playAsks = () => calls.filter((c) => c.url.indexOf("/purchases/subscriptionsv2/tokens/") > 0).length;
const ackAsks = () => calls.filter((c) => c.url.endsWith(":acknowledge")).length;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  calls.push({ url, init });
  if (url === "https://www.googleapis.com/oauth2/v3/certs") {
    return new Response(JSON.stringify({ keys: [googleJwk] }), { status: 200 });
  }
  if (url === PROXY) {
    if (proxyStatus !== 200) return new Response(JSON.stringify({ error: { code: proxyStatus } }), { status: proxyStatus });
    // 음성 요청에는 소리 자료를, 글 요청에는 글을 돌려줍니다. proxyEmpty 면 200 인데 내용이 빈 응답.
    const wantsAudio = String(init.body || "").indexOf("AUDIO") >= 0;
    const part = proxyEmpty
      ? (wantsAudio ? {} : { text: "" })
      : (wantsAudio ? { inlineData: { mimeType: "audio/L16", data: "AAAA" } } : { text: "ok" });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [part] } }] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  if (url === "https://oauth2.googleapis.com/token") {
    return new Response(JSON.stringify({ access_token: "play-access", expires_in: 3600 }), { status: 200 });
  }
  if (url.indexOf("/purchases/subscriptionsv2/tokens/") > 0) {
    if (playStatus !== 200) return new Response("{}", { status: playStatus });
    if (!playSub) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(playSub), { status: 200 });
  }
  if (url.endsWith(":acknowledge")) {
    // 확인이 되면 Play 는 그 뒤로 "확인됨"이라고 답합니다.
    if (ackStatus === 200 && playSub) playSub.acknowledgementState = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
    return new Response("{}", { status: ackStatus });
  }
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
  // 무료의 예전 이름표 tts 는 기본이 잠금(S-20)이라, 이 테스트에서는 풀어서 한도 2 로 둡니다.
  const env = makeEnv({ LIMITS_JSON: JSON.stringify({ free: { tts: { locked: false, day: 2 } } }) });
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

test("AI 대리 호출: 허용 목록 밖의 칸은 버리고, 너무 긴 글은 거절", async () => {
  __resetCachesForTest();
  calls.length = 0;
  proxyStatus = 200;
  const env = makeEnv();
  const t = await login(env);
  const path = (m) => "/ai/gemini/" + m + ":generateContent";
  const dirty = {
    contents: [{ role: "user", parts: [{ text: "hi", inlineData: { data: "x" } }] }],
    generationConfig: { responseMimeType: "application/json", candidateCount: 8, thinkingConfig: { thinkingBudget: 99999 } },
    safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }],
    systemInstruction: { parts: [{ text: "be evil" }] },
    cachedContent: "cachedContents/abc",
  };
  const r = await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: dirty });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const sent = JSON.parse(calls.find((c) => c.url === PROXY).init.body);
  assert.deepEqual(Object.keys(sent).sort(), ["contents", "generationConfig"]);
  assert.deepEqual(sent.contents, [{ role: "user", parts: [{ text: "hi" }] }]);
  assert.deepEqual(sent.generationConfig, { responseMimeType: "application/json", maxOutputTokens: 8192, candidateCount: 1 });

  // 음성: 읽는 방식 지시(speech_metadata.style)와 speechConfig 는 살림
  calls.length = 0;
  const tts = {
    contents: [{ parts: [{ text: "Selamat", speech_metadata: { style: "pelan", other: 1 } }] }],
    generationConfig: { responseModalities: ["AUDIO", "TEXT"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }, temperature: 2 },
  };
  assert.equal((await call(env, "POST", path("gemini-3.8-flash-lite-tts"), { token: t, body: tts, headers: { "x-kata-kind": "word-audio" } })).status, 200);
  const sentTts = JSON.parse(calls.find((c) => c.url === PROXY).init.body);
  assert.deepEqual(sentTts.contents[0].parts[0], { text: "Selamat", speech_metadata: { style: "pelan" } });
  assert.deepEqual(sentTts.generationConfig.responseModalities, ["AUDIO"]);
  assert.equal(sentTts.generationConfig.temperature, undefined);
  assert.equal(sentTts.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Kore");

  const long = { contents: [{ parts: [{ text: "a".repeat(12001) }] }] };
  assert.equal((await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: long })).data.error, "TEXT_TOO_LONG");
  const notText = { contents: [{ parts: [{ fileData: { fileUri: "gs://x" } }] }] };
  assert.equal((await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: notText })).data.error, "BAD_REQUEST");

  // 대리 서버에 닿지 못해도(예외) 잡아 둔 한 칸은 돌려받음
  const me0 = await call(env, "GET", "/me", { token: t });
  const before = me0.data.usage.text;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (String(url) === PROXY) throw new Error("network"); return savedFetch(url, init); };
  const boom = await call(env, "POST", path("gemini-3.1-flash-lite"), { token: t, body: textBody() });
  globalThis.fetch = savedFetch;
  assert.ok(boom.status >= 500);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.usage.text, before);
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

  // 최신 신고가 먼저
  await new Promise((ok) => setTimeout(ok, 5));
  await call(env, "POST", "/report", { token: t, body: { feature: "story", reason: "두 번째" } });
  const list2 = await call(env, "GET", "/admin/reports", { headers: { "x-admin-key": "admin-key" } });
  assert.equal(list2.data.items[0].reason, "두 번째");
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
  // 재구독으로 토큰이 하나 더 생긴 경우 — 삭제 때 둘 다 풀려야 함
  await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "pt10" } });
  await call(env, "POST", "/ai/gemini/gemini-3.1-flash-lite:generateContent", { token: t, body: textBody() });
  await call(env, "POST", "/report", { token: t, body: { feature: "story", reason: "이상함" } });
  const sessKey = "sess:" + (await sha256hex(t));
  const sessSaved = env.PUBLIC_KV.m.get(sessKey);
  const del = await call(env, "POST", "/account/delete", { token: t });
  assert.equal(del.status, 200);
  assert.equal(del.data.hadSubscription, true);
  const keys = [...env.PUBLIC_KV.m.keys()];
  assert.deepEqual(keys.filter((k) => !k.startsWith("report:")), [], "남은 키: " + keys.join(", "));
  const rep = JSON.parse(env.PUBLIC_KV.m.get(keys.find((k) => k.startsWith("report:"))));
  assert.equal(rep.uid, null);
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 401);
  assert.equal(await env.PUBLIC_KV.get("ptok:" + (await sha256hex("pt9"))), null);
  assert.equal(await env.PUBLIC_KV.get("ptok:" + (await sha256hex("pt10"))), null);

  // 삭제 때 못 지운 옛 세션이 남아 있어도, 같은 Google 계정으로 다시 가입한 뒤 살아나면 안 됨
  playSub = null;
  env.PUBLIC_KV.m.set(sessKey, sessSaved);
  await new Promise((ok) => setTimeout(ok, 5));
  const tNew = await login(env);
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 401);
  assert.equal((await call(env, "GET", "/me", { token: tNew })).status, 200);
});

// ── S41 기능별 한도 ─────────────────────────────────────────

const aiPath = (m) => "/ai/gemini/" + m + ":generateContent";
const TEXT_M = "gemini-3.1-flash-lite";
const TTS_M = "gemini-3.8-flash-lite-tts";
const ai = (env, t, kind, body, extra = {}) =>
  call(env, "POST", aiPath(kind === "text" || TEXT_KINDS_T.indexOf(kind) >= 0 ? TEXT_M : TTS_M), {
    token: t, body: body || (TEXT_KINDS_T.indexOf(kind) >= 0 ? textBody() : ttsBody), headers: Object.assign({ "x-kata-kind": kind }, extra),
  });
const TEXT_KINDS_T = ["text", "story", "percakapan-make", "dict-new", "phrase"];

function kstNow(offsetDays = 0) {
  return new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400000).toISOString();
}

async function makePlus(env, t, extraSub = {}) {
  const me = await call(env, "GET", "/me", { token: t });
  playSub = Object.assign({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    startTime: new Date().toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 30 * 86400000).toISOString() }],
    externalAccountIdentifiers: { obfuscatedExternalAccountId: me.data.accountId },
  }, extraSub);
  const v = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-" + me.data.user.id } });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  playSub = null;
  return v.data.plan;
}

test("무료: 이야기 하루 1편, 회화 만들기·긴 읽기·공용 소리 잠김, 단어 발음·오늘의 문장", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv();
  const t = await login(env);

  assert.equal((await ai(env, t, "story")).status, 200);
  const over = await ai(env, t, "story");
  assert.equal(over.status, 429);
  assert.equal(over.data.error, "QUOTA_STORY");
  assert.equal(over.data.period, "day");
  assert.equal(over.data.limit, 1);
  assert.equal(over.data.plan, "free");

  for (const k of ["percakapan-make", "longread", "shared-audio"]) {
    const r = await ai(env, t, k);
    assert.equal(r.status, 403, k);
    assert.equal(r.data.error, "PLUS_REQUIRED", k);
    assert.equal(r.data.kind, k);
  }

  assert.equal((await ai(env, t, "word-audio")).status, 200);
  // 단어 발음은 짧은 글만 (긴 글을 단어 발음으로 위장하지 못하게)
  const longWord = { contents: [{ parts: [{ text: "a".repeat(601) }] }], generationConfig: { responseModalities: ["AUDIO"] } };
  assert.equal((await ai(env, t, "word-audio", longWord)).data.error, "TEXT_TOO_LONG");

  assert.equal((await ai(env, t, "phrase")).status, 200);
  assert.equal((await ai(env, t, "phrase")).data.error, "QUOTA_PHRASE");

  // 모르는 이름은 거절, 예전 이름 text 는 그대로 받음. 예전 이름 tts 는 무료에서 잠금(S-20 — 잠긴 음성 기능의 뒷문이 되지 않게)
  assert.equal((await ai(env, t, "banana")).data.error, "KIND_NOT_ALLOWED");
  assert.equal((await ai(env, t, "text")).status, 200);
  const oldTts = await ai(env, t, "tts");
  assert.equal(oldTts.status, 403);
  assert.equal(oldTts.data.error, "PLUS_REQUIRED");

  const me = await call(env, "GET", "/me", { token: t });
  const f = me.data.features;
  assert.deepEqual(f.story.used, { day: 1, month: 1 });
  assert.deepEqual(f.story.limit, { day: 1, month: null });
  assert.deepEqual(f.story.left, { day: 0, month: null });
  assert.equal(f.longread.locked, true);
  assert.equal(f["dict-new"].hidden, true);
  assert.equal(f["dict-new"].limit.day, 50);
  assert.equal(f.phrase.used.day, 1);
  assert.equal(me.data.usage.month, kstNow().slice(0, 7));
  // 예전 칸은 그대로
  assert.equal(me.data.limits.text, 200);
  assert.equal(me.data.usage.text, 1);
  assert.equal(me.data.usage.tts, 0); // 무료에서는 잠겨 있어 세지 않음
  assert.equal(f.tts.locked, true);
});

test("무료: 사전 처음 찾는 말 하루 50", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv();
  const t = await login(env);
  for (let i = 0; i < 50; i++) assert.equal((await ai(env, t, "dict-new")).status, 200);
  const over = await ai(env, t, "dict-new");
  assert.equal(over.data.error, "QUOTA_DICT_NEW");
  assert.equal(over.data.period, "day");
});

test("Plus: 하루·한 달 한도, 긴 읽기는 한 편(x-kata-unit)을 한 번으로 셈", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv();
  const t = await login(env);
  const plan = await makePlus(env, t);
  assert.equal(plan.tier, "plus");
  assert.equal(plan.trial, undefined);

  for (let i = 0; i < 5; i++) assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");

  // 긴 읽기: 같은 편의 조각 4개 = 1회. 다른 편 4개를 더 들으면 5회, 그다음 편은 한도
  for (let i = 0; i < 4; i++) assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-a" })).status, 200);
  for (const u of ["b", "c", "d", "e"]) assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-" + u })).status, 200);
  const lr = await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-f" });
  assert.equal(lr.data.error, "QUOTA_LONGREAD");
  // 이미 센 편의 다음 조각은 한도가 차도 계속 들을 수 있음
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-a" })).status, 200);
  // 같은 편 값을 돌려 쓰는 것은 조각 24개까지
  // (b 는 위에서 1조각) + 23조각 = 24조각까지 되고, 25번째에서 거절
  for (let i = 0; i < 23; i++) assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-b" })).status, 200);
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story-v2-b" })).data.error, "QUOTA_LONGREAD");

  // 공용 소리·회화 만들기는 열림
  assert.equal((await ai(env, t, "shared-audio")).status, 200);
  assert.equal((await ai(env, t, "percakapan-make")).status, 200);

  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.features.longread.used.day, 5);
  assert.equal(me.data.features.longread.used.month, 5);
  assert.deepEqual(me.data.features.story.limit, { day: 5, month: 60 });
  assert.equal(me.data.limits.text, 1000);

  // 한 달 한도: 이번 달 회화 만들기가 이미 30 이면 거절 (하루 수와 별개)
  const mKey = "usem:g_1001:" + kstNow().slice(0, 7);
  const m = JSON.parse(env.PUBLIC_KV.m.get(mKey));
  m["percakapan-make"] = 30;
  env.PUBLIC_KV.m.set(mKey, JSON.stringify(m));
  const pm = await ai(env, t, "percakapan-make");
  assert.equal(pm.data.error, "QUOTA_PERCAKAPAN_MAKE");
  assert.equal(pm.data.period, "month");
  assert.equal(pm.data.limit, 30);
});

test("실패한 호출은 하루·한 달·긴 읽기 편 모두 돌려받음", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const t = await login(env);
  await makePlus(env, t);
  proxyStatus = 500;
  assert.equal((await ai(env, t, "story")).status, 500);
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "u1" })).status, 500);
  proxyStatus = 200;
  const me = await call(env, "GET", "/me", { token: t });
  assert.deepEqual(me.data.features.story.used, { day: 0, month: 0 });
  assert.deepEqual(me.data.features.longread.used, { day: 0, month: 0 });
  // 편이 지워졌으므로 다시 부르면 새로 1회로 셈
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "u1" })).status, 200);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.features.longread.used.day, 1);
});

test("체험: Play 의 무료 체험 단계 → trial, 한도는 절반·긴 읽기 체험 합계 15", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv();
  const t = await login(env);
  const plan = await makePlus(env, t, {
    lineItems: [{
      productId: "plus",
      expiryTime: new Date(Date.now() + 7 * 86400000).toISOString(),
      offerDetails: { basePlanId: "yearly", offerId: "free-week" },
      offerPhase: { freeTrial: {} },
    }],
  });
  assert.equal(plan.tier, "trial");
  assert.equal(plan.trial, true);
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.plan.tier, "trial");
  const f = me.data.features;
  assert.deepEqual(f.story.limit, { day: 2, month: null });
  assert.deepEqual(f["percakapan-make"].limit, { day: 1, month: 15 });
  assert.deepEqual(f.longread.limit, { day: 2, month: 25, total: 15 });
  assert.deepEqual(f["dict-new"].limit, { day: 50, month: null }); // 무료(50)보다 박해지지 않게
  assert.equal(f.phrase.limit.day, 50);

  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");

  // 체험 기간 합계: 이미 15번 들었으면 오늘 첫 편이라도 거절
  env.PUBLIC_KV.m.set("uset:g_1001", JSON.stringify({ longread: 15 }));
  const tot = await ai(env, t, "longread", null, { "x-kata-unit": "x" });
  assert.equal(tot.data.error, "QUOTA_LONGREAD");
  assert.equal(tot.data.period, "total");
  assert.equal(tot.data.limit, 15);
  env.PUBLIC_KV.m.set("uset:g_1001", JSON.stringify({ longread: 3 }));
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "x" })).status, 200);
  assert.equal(JSON.parse(env.PUBLIC_KV.m.get("uset:g_1001")).longread, 4);
});

test("체험 판정 대비책: offerPhase 가 없으면 제안 이름의 trial + 시작 7일 안쪽만", async () => {
  __resetCachesForTest();
  const env = makeEnv();
  const t = await login(env);
  const fresh = await makePlus(env, t, {
    startTime: new Date(Date.now() - 2 * 86400000).toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 5 * 86400000).toISOString(), offerDetails: { basePlanId: "monthly", offerId: "trial-7d" } }],
  });
  assert.equal(fresh.tier, "trial");
  const t2 = await login(env, { sub: "4004", email: "d@example.com" });
  const old = await makePlus(env, t2, {
    startTime: new Date(Date.now() - 20 * 86400000).toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 10 * 86400000).toISOString(), offerDetails: { basePlanId: "monthly", offerId: "trial-7d" } }],
  });
  assert.equal(old.tier, "plus");
  // offerPhase 가 있으면 그것만 봄 (basePrice = 유료 단계)
  const t3 = await login(env, { sub: "5005", email: "e@example.com" });
  const paid = await makePlus(env, t3, {
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 10 * 86400000).toISOString(), offerDetails: { offerId: "trial-7d" }, offerPhase: { basePrice: {} } }],
  });
  assert.equal(paid.tier, "plus");
});

// 2026-11-14 Play Console 에 실제로 만든 값: 상품 plus · 기본 요금제 monthly / yearly ·
// 체험 제안 trial-7d-monthly / trial-7d-yearly. 콘솔의 이름을 바꾸면 이 테스트도 같이 고칩니다.
test("콘솔 실제 값: 체험 제안 trial-7d-monthly·trial-7d-yearly 는 대비책에서도 체험으로, 제안 없는 구매는 Plus 로", async () => {
  __resetCachesForTest();
  const env = makeEnv({ PRODUCT_IDS: "plus" });
  const cases = [
    { sub: "6101", basePlanId: "monthly", offerId: "trial-7d-monthly", days: 7, want: "trial" },
    { sub: "6102", basePlanId: "yearly", offerId: "trial-7d-yearly", days: 7, want: "trial" },
    { sub: "6103", basePlanId: "monthly", offerId: undefined, days: 30, want: "plus" },
    { sub: "6104", basePlanId: "yearly", offerId: undefined, days: 365, want: "plus" },
  ];
  for (const c of cases) {
    const t = await login(env, { sub: c.sub, email: "c" + c.sub + "@example.com" });
    const od = { basePlanId: c.basePlanId };
    if (c.offerId) od.offerId = c.offerId;
    const plan = await makePlus(env, t, {
      startTime: new Date(Date.now() - 3600000).toISOString(),
      lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + c.days * 86400000).toISOString(), offerDetails: od }],
    });
    assert.equal(plan.tier, c.want, c.basePlanId + " / " + c.offerId);
    assert.equal(plan.productId, "plus");
  }
  // 체험이 끝나 첫 결제가 된 뒤(시작 9일째)에는 같은 제안 이름이어도 Plus
  const t5 = await login(env, { sub: "6105", email: "c6105@example.com" });
  const after = await makePlus(env, t5, {
    startTime: new Date(Date.now() - 9 * 86400000).toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 28 * 86400000).toISOString(), offerDetails: { basePlanId: "monthly", offerId: "trial-7d-monthly" } }],
  });
  assert.equal(after.tier, "plus");
});

test("관리자: Special Member 주기(로그인 전 이메일로 미리)·거두기, Play 검증이 지우지 않음", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv();
  const adm = { "x-admin-key": "admin-key" };
  assert.equal((await call(env, "POST", "/admin/special", { body: { email: "s@example.com" } })).status, 403);
  assert.equal((await call(env, "POST", "/admin/special", { body: { email: "s@example.com" }, headers: { "x-admin-key": "nope" } })).status, 403);
  assert.equal((await call(env, "POST", "/admin/special", { body: { email: "not-an-email" }, headers: adm })).data.error, "BAD_REQUEST");

  // 아직 로그인한 적 없는 이메일 → 미리 준 등급
  const pre = await call(env, "POST", "/admin/special", { body: { email: "S@Example.com", action: "grant", note: "교회" }, headers: adm });
  assert.equal(pre.status, 200, JSON.stringify(pre.data));
  assert.equal(pre.data.pending, true);
  const got = await call(env, "GET", "/admin/special?email=s@example.com", { headers: adm });
  assert.equal(got.data.pending.tier, "special");
  assert.equal(got.data.uid, null);

  const t = await login(env, { sub: "7007", email: "s@example.com" });
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.plan.tier, "special");
  assert.equal(me.data.features.story.limit.day, null);
  assert.equal(me.data.features.longread.locked, false);
  for (let i = 0; i < 8; i++) assert.equal((await ai(env, t, "story")).status, 200);
  const got2 = await call(env, "GET", "/admin/special?email=s@example.com", { headers: adm });
  assert.equal(got2.data.uid, "g_7007");
  assert.equal(got2.data.pending, null);

  // Play 구독을 붙여도 Special 은 남음
  await makePlus(env, t);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.plan.tier, "special");

  // 거두면 Play 구독(Plus)으로 돌아감
  const rv = await call(env, "POST", "/admin/special", { body: { uid: "g_7007", action: "revoke" }, headers: adm });
  assert.equal(rv.data.plan.tier, "plus");

  // 로그인한 계정에 관리자 등급, 기한 지나면 끝
  const t2 = await login(env, { sub: "8008", email: "admin2@example.com" });
  const g = await call(env, "POST", "/admin/special", { body: { email: "admin2@example.com", tier: "admin", until: Date.now() + 60000 }, headers: adm });
  assert.equal(g.data.plan.tier, "admin");
  assert.equal((await call(env, "GET", "/me", { token: t2 })).data.plan.tier, "admin");
  const ent = JSON.parse(env.PUBLIC_KV.m.get("ent:g_8008"));
  ent.staff.until = Date.now() - 1;
  env.PUBLIC_KV.m.set("ent:g_8008", JSON.stringify(ent));
  assert.equal((await call(env, "GET", "/me", { token: t2 })).data.plan.tier, "free");

  // KV 에 직접 tier 를 적어도 인정 (수동 운영)
  env.PUBLIC_KV.m.set("ent:g_8008", JSON.stringify({ tier: "special", until: 0 }));
  assert.equal((await call(env, "GET", "/me", { token: t2 })).data.plan.tier, "special");

  assert.equal((await call(env, "POST", "/admin/special", { body: { uid: "g_none" }, headers: adm })).data.error, "USER_NOT_FOUND");
});

test("LIMITS_JSON: 새 모양(칸별 day/month/locked)과 예전 모양(숫자) 모두", async () => {
  __resetCachesForTest();
  proxyStatus = 200;
  const env = makeEnv({
    LIMITS_JSON: JSON.stringify({
      free: { story: { day: 2 }, longread: { locked: false, day: 1 }, text: 3 },
      plus: { story: { month: null } },
      trial: { longread: { total: 3 } },
    }),
  });
  const t = await login(env);
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");
  assert.equal((await ai(env, t, "longread")).status, 200);
  assert.equal((await ai(env, t, "longread")).data.error, "QUOTA_LONGREAD");
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.limits.text, 3);
  assert.equal(me.data.features.text.hidden, true);
  await makePlus(env, t, {
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 7 * 86400000).toISOString(), offerPhase: { freeTrial: {} } }],
  });
  const me2 = await call(env, "GET", "/me", { token: t });
  assert.equal(me2.data.features.longread.limit.total, 3);
  // 체험 이야기: plus month 를 없앴으므로 체험도 month 없음, day 는 max(절반 2, 무료 2) = 2
  assert.deepEqual(me2.data.features.story.limit, { day: 2, month: null });
});

// ── 출시 전 점검(2026-11-13) 3-6 의 결제 시나리오 ───────────────
// S1 환불 · S2 만료 뒤 재확인 · S3 확인(acknowledge) 실패 · S10 Play 일시 오류

function resetWorld() {
  __resetCachesForTest();
  calls.length = 0;
  clockOffset = 0;
  playStatus = 200;
  ackStatus = 200;
  proxyStatus = 200;
  proxyEmpty = false;
  playSub = null;
}

/** 구독을 사서 검증까지 마친 계정. Play 응답(playSub)은 그대로 살려 둡니다(뒤에서 상태를 바꿔 보려고). */
async function buy(env, t, { days = 30, ack = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED", token = "tok-buy" } = {}) {
  const me = await call(env, "GET", "/me", { token: t });
  playSub = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: ack,
    startTime: new Date(Date.now()).toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + days * DAY).toISOString() }],
    externalAccountIdentifiers: { obfuscatedExternalAccountId: me.data.accountId },
  };
  const v = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: token } });
  return { v, uid: me.data.user.id };
}

const entOf = (env, uid) => JSON.parse(env.PUBLIC_KV.m.get("ent:" + uid) || "null");
const tierOf = async (env, t) => (await call(env, "GET", "/me", { token: t })).data.plan.tier;

test("S1 환불: 만료 전이라도 마지막 확인에서 24시간이 지나면 Play 에 다시 묻고, 환불·취소면 바로 무료", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9101", email: "s1@example.com" });
  const { v, uid } = await buy(env, t, { days: 365 });
  assert.equal(v.data.plan.tier, "plus");
  assert.equal(playAsks(), 1);

  // 환불(권한 회수) — Play 는 만료 시각이 남아 있어도 EXPIRED 라고 답합니다.
  playSub.subscriptionState = "SUBSCRIPTION_STATE_EXPIRED";

  // 24시간 안: 아직 다시 묻지 않음 (이 틈이 최대 하루)
  clockOffset = 23 * HOUR;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(playAsks(), 1);

  // 24시간 뒤: 다시 묻고 바로 무료
  clockOffset = 24 * HOUR + MIN;
  assert.equal(await tierOf(env, t), "free");
  assert.equal(playAsks(), 2);
  const ent = entOf(env, uid);
  assert.equal(ent.tier, "free");
  assert.equal(ent.state, "SUBSCRIPTION_STATE_EXPIRED");
  assert.ok(ent.freeSince > 0);
  // 서버 한도도 무료로 (Plus 전용 긴 읽기는 잠김)
  const lr = await ai(env, t, "longread", null, { "x-kata-unit": "s1" });
  assert.equal(lr.status, 403);
  assert.equal(lr.data.error, "PLUS_REQUIRED");
  // 요청마다 Play 를 부르지는 않음 (한 시간에 한 번까지)
  assert.equal(playAsks(), 2);
  resetWorld();
});

test("S1-b 취소(자동 갱신 끔)·유예는 만료 시각까지 그대로 Plus, 보류는 무료", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9102", email: "s1b@example.com" });
  await buy(env, t, { days: 30 });
  playSub.subscriptionState = "SUBSCRIPTION_STATE_CANCELED";
  clockOffset = 25 * HOUR;
  assert.equal(await tierOf(env, t), "plus");
  playSub.subscriptionState = "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
  clockOffset = 50 * HOUR;
  assert.equal(await tierOf(env, t), "plus");
  playSub.subscriptionState = "SUBSCRIPTION_STATE_ON_HOLD";
  clockOffset = 75 * HOUR;
  assert.equal(await tierOf(env, t), "free");
  // 결제 수단을 고쳐 구독이 살아나면 한 시간 뒤 돌아옴
  playSub.subscriptionState = "SUBSCRIPTION_STATE_ACTIVE";
  clockOffset = 75 * HOUR + 30 * MIN;
  assert.equal(await tierOf(env, t), "free");
  clockOffset = 76 * HOUR + MIN;
  assert.equal(await tierOf(env, t), "plus");
  resetWorld();
});

test("S2 만료 뒤 재확인: 한 번 무료로 적혀도 30일 동안은 한 시간에 한 번까지 다시 묻는다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9201", email: "s2@example.com" });
  const { uid } = await buy(env, t, { days: 3 });
  assert.equal(playAsks(), 1);

  // 만료 직후, Play 는 아직 옛 만료 시각을 답함(갱신 반영 전) → 무료로 적힘. 구매 토큰은 남음.
  clockOffset = 3 * DAY + MIN;
  assert.equal(await tierOf(env, t), "free");
  assert.equal(playAsks(), 2);
  let ent = entOf(env, uid);
  assert.equal(ent.tier, "free");
  assert.equal(ent.purchaseToken, "tok-buy");
  const freeSince = ent.freeSince;
  assert.ok(freeSince > 0);

  // Play 가 갱신을 반영함 — 한 시간 안에는 다시 묻지 않음
  playSub.lineItems[0].expiryTime = new Date(Date.now() + 30 * DAY).toISOString();
  clockOffset = 3 * DAY + 30 * MIN;
  assert.equal(await tierOf(env, t), "free");
  assert.equal(playAsks(), 2);

  // 한 시간 뒤: /me 만으로 Plus 로 돌아옴 (앱을 다시 켜거나 /billing/verify 를 부르지 않아도)
  clockOffset = 3 * DAY + HOUR + 2 * MIN;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(playAsks(), 3);
  ent = entOf(env, uid);
  assert.equal(ent.tier, "plus");
  assert.equal(ent.freeSince, undefined);
  resetWorld();
});

test("S2-b 무료로 내려간 뒤 30일이 지나면 더 묻지 않고, 그 안에서는 처음 내려간 시각을 기준으로 센다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9202", email: "s2b@example.com" });
  const { uid } = await buy(env, t, { days: 1 });
  clockOffset = DAY + MIN;
  assert.equal(await tierOf(env, t), "free");
  const first = entOf(env, uid).freeSince;
  assert.equal(playAsks(), 2);

  // 29일째: 여전히 묻는다(한 시간에 한 번). 처음 내려간 시각은 그대로.
  clockOffset = 29 * DAY;
  assert.equal(await tierOf(env, t), "free");
  assert.equal(playAsks(), 3);
  assert.equal(entOf(env, uid).freeSince, first);

  // 31일 뒤: 더 묻지 않음
  clockOffset = DAY + MIN + 31 * DAY;
  assert.equal(await tierOf(env, t), "free");
  assert.equal(playAsks(), 3);
  resetWorld();
});

test("S3 확인(acknowledge) 실패: 권한을 먼저 저장하고, 다음 /me·/billing/verify 때 다시 확인한다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9301", email: "s3@example.com" });
  ackStatus = 403; // 서비스 계정에 "주문 및 구독 관리" 권한이 빠진 경우
  const { v, uid } = await buy(env, t, { days: 30, ack: "ACKNOWLEDGEMENT_STATE_PENDING" });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.valid, true);
  assert.equal(v.data.plan.tier, "plus");
  assert.equal(v.data.ackPending, true);
  assert.equal(ackAsks(), 1);
  let ent = entOf(env, uid);
  assert.equal(ent.tier, "plus");
  assert.equal(ent.ackPending, true);
  // 실패 기록(관리자용) — 구매 토큰 원문은 없음
  const failKey = "ackfail:" + (await sha256hex("tok-buy"));
  const fail = JSON.parse(env.PUBLIC_KV.m.get(failKey));
  assert.equal(fail.status, 403);
  assert.equal(fail.count, 1);
  assert.ok(![...env.PUBLIC_KV.m.values()].some((val) => val.indexOf("tok-buy") >= 0 && val.indexOf("\"purchaseToken\"") < 0));

  // /me 는 Plus. 10분 안에는 Play 를 다시 부르지 않음
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(ackAsks(), 1);

  // /billing/verify 는 부를 때마다 다시 확인을 시도
  const again = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-buy" } });
  assert.equal(again.data.plan.tier, "plus");
  assert.equal(again.data.ackPending, true);
  assert.equal(ackAsks(), 2);
  assert.equal(JSON.parse(env.PUBLIC_KV.m.get(failKey)).count, 2);

  // 10분 뒤 /me — 권한을 고친 뒤라 확인 성공, 표시와 실패 기록이 지워짐
  ackStatus = 200;
  clockOffset = 11 * MIN;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(ackAsks(), 3);
  ent = entOf(env, uid);
  assert.equal(ent.ackPending, undefined);
  assert.equal(env.PUBLIC_KV.m.has(failKey), false);

  // 확인이 끝난 뒤에는 /me 가 더 확인하지 않음
  clockOffset = 30 * MIN;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(ackAsks(), 3);
  resetWorld();
});

test("S3-b 확인 요청이 통신 오류로 끊겨도 권한은 저장된다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9302", email: "s3b@example.com" });
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith(":acknowledge")) throw new Error("network");
    return savedFetch(url, init);
  };
  const { v, uid } = await buy(env, t, { days: 30, ack: "ACKNOWLEDGEMENT_STATE_PENDING" });
  globalThis.fetch = savedFetch;
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.plan.tier, "plus");
  assert.equal(entOf(env, uid).ackPending, true);
  resetWorld();
});

test("S10 Play 일시 오류: 지금 등급을 유지하고 한 시간 뒤 다시 묻는다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9401", email: "s10@example.com" });
  const { uid } = await buy(env, t, { days: 2 });
  assert.equal(playAsks(), 1);

  // (가) 이용 중 하루 한 번 재확인이 Play 오류를 만남 → Plus 유지, 한 시간 뒤 다시
  playStatus = 503;
  clockOffset = 25 * HOUR;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(playAsks(), 2);
  assert.equal(entOf(env, uid).tier, "plus");
  clockOffset = 25 * HOUR + 30 * MIN;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(playAsks(), 2);

  // (나) 만료 순간에도 Play 오류 → 무료로 적지 않고 Plus 유지(하루까지)
  clockOffset = 2 * DAY + MIN;
  assert.equal(await tierOf(env, t), "plus");
  assert.equal(playAsks(), 3);
  assert.equal(entOf(env, uid).tier, "plus");
  // 그동안 서버 한도도 Plus 로
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "s10" })).status, 200);
  assert.equal(playAsks(), 3);

  // (다) Play 복구(그사이 갱신됨) → 한 시간 뒤 새 만료 시각으로
  playStatus = 200;
  playSub.lineItems[0].expiryTime = new Date(Date.now() + 30 * DAY).toISOString();
  clockOffset = 2 * DAY + HOUR + 2 * MIN;
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.plan.tier, "plus");
  assert.equal(playAsks(), 4);
  assert.ok(me.data.plan.until > Date.now() + 29 * DAY);
  assert.equal(entOf(env, uid).triedAt, undefined);
  resetWorld();
});

test("S10-b Play 오류가 하루 넘게 이어지면 무료로 보이지만, 복구되면 돌아온다 / 인증 오류(401·403)도 일시 오류로 본다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9402", email: "s10b@example.com" });
  const { uid } = await buy(env, t, { days: 1 });
  playStatus = 403; // 서비스 계정 권한이 잠깐 빠짐 — 사용자를 무료로 굳히면 안 됨
  clockOffset = DAY + MIN;
  assert.equal(await tierOf(env, t), "plus");
  clockOffset = 2 * DAY + 2 * MIN; // 만료에서 하루가 넘음
  assert.equal(await tierOf(env, t), "free");
  assert.equal(entOf(env, uid).tier, "plus"); // 무료로 "적지는" 않음
  playStatus = 200;
  playSub.lineItems[0].expiryTime = new Date(Date.now() + 30 * DAY).toISOString();
  clockOffset = 2 * DAY + HOUR + 5 * MIN;
  assert.equal(await tierOf(env, t), "plus");
  resetWorld();
});

// ── 출시 전 점검 C-02: 실패한 AI 호출이 한도를 깎지 않게 ─────────

test("C-02 빈 응답(200 인데 글이 없음)은 한도를 쓰지 않는다 — 글·소리 모두", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9601", email: "c02@example.com" });
  const storyLeft = async () => (await call(env, "GET", "/me", { token: t })).data.features.story;

  // 무료 이야기는 하루 1편. 빈 응답이 세 번 와도 한 편도 쓰지 않은 것으로.
  proxyEmpty = true;
  for (let i = 0; i < 3; i++) {
    const r = await ai(env, t, "story");
    assert.equal(r.status, 200); // 앱은 본문을 보고 EMPTY_RESPONSE 로 처리
  }
  assert.equal((await storyLeft()).used.day, 0);
  assert.equal((await storyLeft()).used.month, 0);

  // 제대로 온 응답만 셈
  proxyEmpty = false;
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await storyLeft()).used.day, 1);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");

  // 소리도 같음
  proxyEmpty = true;
  await ai(env, t, "word-audio");
  let me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.features["word-audio"].used.day, 0);
  proxyEmpty = false;
  await ai(env, t, "word-audio");
  me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.features["word-audio"].used.day, 1);
  resetWorld();
});

test("C-02 같은 요청 번호(x-kata-req)의 재시도·모델 바꿈은 한 번만 센다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9602", email: "c02b@example.com" });
  const used = async (k) => (await call(env, "GET", "/me", { token: t })).data.features[k].used.day;
  const req = { "x-kata-req": "press0001abcdef" };

  // 한 번의 누름: 앱이 응답을 못 받아(시간 초과) 같은 번호로 다시 부르고, 모델도 바꿔 부름 → 1칸
  assert.equal((await ai(env, t, "dict-new", null, req)).status, 200);
  assert.equal((await ai(env, t, "dict-new", null, req)).status, 200);
  const other = await call(env, "POST", aiPath("gemini-3.5-flash-lite"), { token: t, body: textBody(), headers: Object.assign({ "x-kata-kind": "dict-new" }, req) });
  assert.equal(other.status, 200);
  assert.equal(await used("dict-new"), 1);

  // 번호가 다르면 새 누름
  assert.equal((await ai(env, t, "dict-new", null, { "x-kata-req": "press0002abcdef" })).status, 200);
  assert.equal(await used("dict-new"), 2);

  // 번호가 없으면 예전처럼 호출마다 셈
  await ai(env, t, "dict-new");
  await ai(env, t, "dict-new");
  assert.equal(await used("dict-new"), 4);

  // 같은 번호라도 요청 내용이 다르면 새 누름(번호만 돌려 써서 한도를 늘리지 못함)
  const diff = { contents: [{ parts: [{ text: "다른 내용" }] }], generationConfig: {} };
  assert.equal((await ai(env, t, "dict-new", diff, req)).status, 200);
  assert.equal(await used("dict-new"), 5);

  // 하루 1편인 무료 이야기: 빈 응답 → 같은 번호로 재시도 → 성공. 한 편만 쓰고, 그 재시도는 막히지 않음
  const sreq = { "x-kata-req": "storypress00001" };
  proxyEmpty = true;
  await ai(env, t, "story", null, sreq);
  proxyEmpty = false;
  assert.equal((await ai(env, t, "story", null, sreq)).status, 200);
  assert.equal((await ai(env, t, "story", null, sreq)).status, 200); // 응답을 못 받은 줄 알고 한 번 더 — 같은 누름
  assert.equal(await used("story"), 1);
  assert.equal((await ai(env, t, "story", null, { "x-kata-req": "storypress00002" })).data.error, "QUOTA_STORY");

  // 같은 번호를 9번 넘게 돌려 쓰면 다시 셈 / 5분이 지나도 다시 셈
  const many = { "x-kata-req": "manymanymany001" };
  for (let i = 0; i < 9; i++) await ai(env, t, "text", null, many);
  assert.equal(await used("text"), 1);
  await ai(env, t, "text", null, many);
  assert.equal(await used("text"), 2);
  clockOffset = 6 * MIN;
  await ai(env, t, "text", null, many);
  assert.equal(await used("text"), 3);

  // 번호 모양이 이상하면 없는 것으로 보고 호출마다 셈
  await ai(env, t, "text", null, { "x-kata-req": "bad id!" });
  await ai(env, t, "text", null, { "x-kata-req": "bad id!" });
  assert.equal(await used("text"), 5);
  resetWorld();
});

test("C-02 실패(5xx)한 호출은 요청 번호가 있어도 칸을 돌려받고, 다음 재시도가 새로 한 칸을 잡는다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9603", email: "c02c@example.com" });
  const req = { "x-kata-req": "failthenok00001" };
  proxyStatus = 503;
  assert.equal((await ai(env, t, "story", null, req)).status, 503);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.features.story.used.day, 0);
  proxyStatus = 200;
  assert.equal((await ai(env, t, "story", null, req)).status, 200);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.features.story.used.day, 1);
  resetWorld();
});

// ── 3차(2026-11-14): 심사용 등급 · 관리자 삭제 · 긴급 차단 · 자동 갱신 표시 · 신고 보관 ──

test("심사용 등급(review): plus 와 같은 한도, staff 전용은 아님, 주기·거두기·미리 주기", async () => {
  resetWorld();
  const env = makeEnv();
  const adm = { "x-admin-key": "admin-key" };
  // 아직 로그인한 적 없는 심사용 계정에 미리 줌
  const pre = await call(env, "POST", "/admin/special", { headers: adm, body: { email: "Review@Example.com", action: "grant", tier: "review", note: "play-review" } });
  assert.equal(pre.status, 200, JSON.stringify(pre.data));
  assert.equal(pre.data.pending, true);
  assert.equal(pre.data.plan.tier, "review");
  const t = await login(env, { sub: "9701", email: "review@example.com" });
  const me = await call(env, "GET", "/me", { token: t });
  assert.equal(me.data.plan.tier, "review");
  // 한도는 plus 와 같음: 이야기 하루 5·한 달 60, 회화 만들기 3, 긴 읽기 5
  assert.deepEqual(me.data.features.story.limit, { day: 5, month: 60 });
  assert.deepEqual(me.data.features["percakapan-make"].limit, { day: 3, month: 30 });
  assert.equal(me.data.features.longread.locked, false);
  assert.equal(me.data.features["shared-audio"].locked, false);
  // 무료에서 잠긴 기능이 열림
  assert.equal((await ai(env, t, "percakapan-make")).status, 200);
  assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "rv1" })).status, 200);
  // plus 처럼 상한이 있음(Special·관리자처럼 무제한이 아님)
  for (let i = 0; i < 5; i++) assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");

  // 이미 로그인한 계정에도 바로 줄 수 있고, Play 검증이 지우지 않음
  const t2 = await login(env, { sub: "9702", email: "review2@example.com" });
  const g = await call(env, "POST", "/admin/special", { headers: adm, body: { email: "review2@example.com", tier: "review" } });
  assert.equal(g.data.pending, false);
  assert.equal(g.data.plan.tier, "review");
  assert.equal(await tierOf(env, t2), "review");
  // 조회·거두기
  const q = await call(env, "GET", "/admin/special?email=review2@example.com", { headers: adm });
  assert.equal(q.data.plan.tier, "review");
  const rv = await call(env, "POST", "/admin/special", { headers: adm, body: { email: "review2@example.com", action: "revoke" } });
  assert.equal(rv.data.plan.tier, "free");
  assert.equal(await tierOf(env, t2), "free");
  // 기한을 주면 그 뒤에는 무료
  await call(env, "POST", "/admin/special", { headers: adm, body: { email: "review2@example.com", tier: "review", until: Date.now() + DAY } });
  assert.equal(await tierOf(env, t2), "review");
  clockOffset = DAY + MIN;
  assert.equal(await tierOf(env, t2), "free");
  // 관리자 열쇠 없이는 줄 수 없음
  assert.equal((await call(env, "POST", "/admin/special", { body: { email: "x@example.com", tier: "review" } })).status, 403);
  // 미리 준 등급에는 수명이 있음(끝내 로그인하지 않은 이메일의 흔적이 남지 않게)
  resetWorld();
});

test("자동 갱신 표시(autoRenew): 해지한 구독은 만료까지 Plus 이고 autoRenew 는 false", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9711", email: "ar@example.com" });
  const { v } = await buy(env, t, { days: 30 });
  assert.equal(v.data.plan.autoRenew, true);
  playSub.subscriptionState = "SUBSCRIPTION_STATE_CANCELED";
  const again = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-buy" } });
  assert.equal(again.data.plan.tier, "plus");
  assert.equal(again.data.plan.autoRenew, false);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.plan.autoRenew, false);
  resetWorld();
});

test("관리자 삭제(/admin/delete): 이메일로 요청한 계정을 앱 안 삭제와 똑같이 지운다", async () => {
  resetWorld();
  const env = makeEnv();
  const adm = { "x-admin-key": "admin-key" };
  const t = await login(env, { sub: "9721", email: "gone@example.com" });
  await buy(env, t, { days: 30, token: "tok-gone" });
  await ai(env, t, "story");
  await call(env, "POST", "/report", { token: t, body: { feature: "story", reason: "이상함" } });
  assert.equal((await call(env, "POST", "/admin/delete", { body: { email: "gone@example.com" } })).status, 403);
  const del = await call(env, "POST", "/admin/delete", { headers: adm, body: { email: "Gone@Example.com" } });
  assert.equal(del.status, 200, JSON.stringify(del.data));
  assert.equal(del.data.deleted, true);
  assert.equal(del.data.hadSubscription, true);
  const keys = [...env.PUBLIC_KV.m.keys()];
  assert.deepEqual(keys.filter((k) => !k.startsWith("report:")), [], "남은 키: " + keys.join(", "));
  assert.equal(JSON.parse(env.PUBLIC_KV.m.get(keys.find((k) => k.startsWith("report:")))).uid, null);
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 401);
  // 없는 계정
  assert.equal((await call(env, "POST", "/admin/delete", { headers: adm, body: { email: "nobody@example.com" } })).data.error, "USER_NOT_FOUND");
  resetWorld();
});

test("긴급 차단(AI_PAUSED): free 는 무료만, all 은 모두 멈추고 한도는 쓰지 않는다", async () => {
  resetWorld();
  const envFree = makeEnv({ AI_PAUSED: "free" });
  const tf = await login(envFree, { sub: "9731", email: "p1@example.com" });
  const r = await ai(envFree, tf, "text");
  assert.equal(r.status, 503);
  assert.equal(r.data.error, "SERVICE_PAUSED");
  assert.equal((await call(envFree, "GET", "/me", { token: tf })).data.usage.text, 0);
  await buy(envFree, tf, { days: 30 });
  assert.equal((await ai(envFree, tf, "text")).status, 200); // 구독 중인 사람은 계속 됨
  const envAll = makeEnv({ AI_PAUSED: "all" });
  const ta = await login(envAll, { sub: "9732", email: "p2@example.com" });
  await buy(envAll, ta, { days: 30 });
  assert.equal((await ai(envAll, ta, "text")).data.error, "SERVICE_PAUSED");
  // 로그인·등급 확인은 멈추지 않음
  assert.equal((await call(envAll, "GET", "/me", { token: ta })).status, 200);
  resetWorld();
});

test("신고: 계정을 지워도 보관 기간을 새로 시작하지 않고, 목록은 다음 쪽을 볼 수 있다", async () => {
  resetWorld();
  const env = makeEnv();
  const ttls = new Map();
  const rawPut = env.PUBLIC_KV.put.bind(env.PUBLIC_KV);
  env.PUBLIC_KV.put = async (k, val, opts) => { ttls.set(k, opts && opts.expirationTtl); return rawPut(k, val, opts); };
  const rawList = env.PUBLIC_KV.list.bind(env.PUBLIC_KV);
  env.PUBLIC_KV.list = async (o = {}) => {
    // 가짜 KV 에 쪽 나누기(cursor)를 붙입니다
    const all = (await rawList({ prefix: o.prefix, limit: 100000 })).keys;
    const start = o.cursor ? Number(o.cursor) : 0;
    const lim = o.limit || 1000;
    const keys = all.slice(start, start + lim);
    const done = start + lim >= all.length;
    return { keys, list_complete: done, cursor: done ? undefined : String(start + lim) };
  };
  const t = await login(env, { sub: "9741", email: "rep@example.com" });
  for (let i = 0; i < 3; i++) await call(env, "POST", "/report", { token: t, body: { feature: "story", reason: "r" + i } });
  const adm = { "x-admin-key": "admin-key" };
  const p1 = await call(env, "GET", "/admin/reports?limit=2", { headers: adm });
  assert.equal(p1.data.items.length, 2);
  assert.ok(p1.data.nextCursor);
  const p2 = await call(env, "GET", "/admin/reports?limit=2&cursor=" + encodeURIComponent(p1.data.nextCursor), { headers: adm });
  assert.equal(p2.data.items.length, 1);
  assert.equal(p2.data.nextCursor, null);

  // 100일 뒤에 계정 삭제 → 신고는 80일만 더 남아야 함(180일을 새로 받지 않음)
  clockOffset = 100 * DAY;
  const t2 = await login(env, { sub: "9741", email: "rep@example.com" });
  const del = await call(env, "POST", "/account/delete", { token: t2 });
  assert.equal(del.status, 200);
  const repKeys = [...env.PUBLIC_KV.m.keys()].filter((k) => k.startsWith("report:"));
  assert.equal(repKeys.length, 3);
  for (const k of repKeys) {
    assert.equal(JSON.parse(env.PUBLIC_KV.m.get(k)).uid, null);
    const ttl = ttls.get(k);
    assert.ok(ttl > 79 * 86400 && ttl <= 80 * 86400, "남은 수명(초): " + ttl);
  }
  resetWorld();
});

test("체험 기록(B-08)·계정 표식 없는 구매 표시(B-13)", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9751", email: "tr@example.com" });
  const me = await call(env, "GET", "/me", { token: t });
  const trialSub = (tok) => ({
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    startTime: new Date(Date.now()).toISOString(),
    lineItems: [{ productId: "plus", expiryTime: new Date(Date.now() + 7 * DAY).toISOString(), offerPhase: { freeTrial: {} } }],
    externalAccountIdentifiers: tok === "tok-t2" ? undefined : { obfuscatedExternalAccountId: me.data.accountId },
  });
  playSub = trialSub("tok-t1");
  await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-t1" } });
  let ent = entOf(env, me.data.user.id);
  assert.equal(ent.tier, "trial");
  assert.equal(ent.trialRepeat, undefined);
  assert.equal(ent.unbound, undefined);
  // 같은 구매를 다시 검증해도 횟수는 그대로
  await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-t1" } });
  assert.equal(JSON.parse(env.PUBLIC_KV.m.get("trial:" + me.data.user.id)).tokens.length, 1);
  // 다른 Play 계정으로 시작한 두 번째 체험(표식도 없음) → 기록에 남음
  clockOffset = 8 * DAY;
  playSub = trialSub("tok-t2");
  await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-t2" } });
  ent = entOf(env, me.data.user.id);
  assert.equal(ent.trialRepeat, 2);
  assert.equal(ent.unbound, true);
  resetWorld();
});

test("끝난 옛 구매를 검증해도 지금 이용 중인 구독이 무료로 덮이지 않는다", async () => {
  resetWorld();
  const env = makeEnv();
  const t = await login(env, { sub: "9501", email: "old@example.com" });
  const { uid } = await buy(env, t, { days: 30, token: "tok-live" });
  playSub.subscriptionState = "SUBSCRIPTION_STATE_EXPIRED";
  playSub.lineItems[0].expiryTime = "2020-01-01T00:00:00Z";
  const old = await call(env, "POST", "/billing/verify", { token: t, body: { productId: "plus", purchaseToken: "tok-old" } });
  assert.equal(old.data.valid, false);
  assert.equal(old.data.plan.tier, "plus");
  assert.equal(entOf(env, uid).purchaseToken, "tok-live");
  resetWorld();
});

// ── 4차(2026-11-14): Durable Object 카운터 · 전체 하루 상한 · 신고 알림 · 보안 보강 ──

// 가짜 Durable Object 저장소·이름공간. 실제처럼 값은 복사해서 주고받고, 읽기·쓰기는 한 박자씩 쉽니다
// (쉬는 사이에 다른 요청이 끼어들 수 있어야 "줄 세우기"가 정말 필요한지 드러납니다).
const tick = () => new Promise((ok) => setTimeout(ok, 0));
function makeStorage() {
  const m = new Map();
  let alarm = null;
  return {
    m,
    async get(k) { await tick(); return m.has(k) ? structuredClone(m.get(k)) : undefined; },
    async put(k, v) { await tick(); m.set(k, structuredClone(v)); },
    async delete(k) { m.delete(k); },
    async deleteAll() { m.clear(); },
    async list() { return new Map([...m].map(([k, v]) => [k, structuredClone(v)])); },
    async getAlarm() { return alarm; },
    async setAlarm(t) { alarm = t; },
    alarmAt: () => alarm,
  };
}
function makeDO({ broken = false } = {}) {
  const objs = new Map();
  return {
    objs,
    idFromName: (n) => n,
    get(id) {
      if (!objs.has(id)) {
        const storage = makeStorage();
        objs.set(id, { storage, obj: new UsageCounter({ storage }) });
      }
      const o = objs.get(id).obj;
      return {
        fetch: async (url, init) => {
          if (broken) throw new Error("durable object unavailable");
          return o.fetch(new Request(url, init));
        },
      };
    },
  };
}
// 읽기가 한 박자 쉬는 KV — 실제 KV 처럼 "읽고 나서 쓰기 전"에 다른 요청이 끼어듭니다.
function makeSlowKV() {
  const kv = makeKV();
  const get = kv.get.bind(kv);
  kv.get = async (k) => { await tick(); return get(k); };
  return kv;
}
const burst = (n, fn) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
const count = (rs, status) => rs.filter((r) => r.status === status).length;
const ADMIN = { headers: { "x-admin-key": "admin-key" } };

// 텔레그램 흉내
let tgStatus = 200; // 0 = 통신 오류
const baseFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).indexOf("https://api.telegram.org/") === 0) {
    calls.push({ url: String(url), init });
    if (tgStatus === 0) throw new Error("network down");
    return new Response(JSON.stringify({ ok: tgStatus === 200 }), { status: tgStatus });
  }
  return baseFetch(url, init);
};
const tgCalls = () => calls.filter((c) => c.url.indexOf("https://api.telegram.org/") === 0);
const tgTexts = () => tgCalls().map((c) => JSON.parse(c.init.body).text);
const TG = { TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "777" };

test("S-22 동시 요청: KV 는 한도를 넘겨 통과시키고(알려진 한계), Durable Object 는 정확히 한도까지만", async () => {
  resetWorld();
  // KV 방식 — 무료 이야기는 하루 1편인데 동시에 20개를 쏘면 여러 개가 통과합니다.
  const envKv = makeEnv({ PUBLIC_KV: makeSlowKV() });
  const tk = await login(envKv, { sub: "9801", email: "c1@example.com" });
  const kvRes = await burst(20, () => ai(envKv, tk, "story"));
  assert.ok(count(kvRes, 200) > 1, "KV 방식의 한계가 재현돼야 함 (통과 " + count(kvRes, 200) + ")");

  // Durable Object — 정확히 1개만 통과
  const envDo = makeEnv({ PUBLIC_KV: makeSlowKV(), USAGE_DO: makeDO() });
  const td = await login(envDo, { sub: "9802", email: "c2@example.com" });
  const doRes = await burst(20, () => ai(envDo, td, "story"));
  assert.equal(count(doRes, 200), 1);
  assert.equal(count(doRes, 429), 19);
  assert.equal(doRes.find((r) => r.status === 429).data.error, "QUOTA_STORY");

  // Plus 이야기 하루 5편 — 정확히 5개
  clockOffset += DAY; // 새 날
  await makePlus(envDo, td);
  const plusRes = await burst(20, () => ai(envDo, td, "story"));
  assert.equal(count(plusRes, 200), 5);
  assert.equal(count(plusRes, 429), 15);
  const me = await call(envDo, "GET", "/me", { token: td });
  assert.equal(me.data.features.story.used.day, 5);
  assert.equal(me.data.features.story.left.day, 0);
  // 사용량은 KV 가 아니라 객체에 적힘
  assert.ok(![...envDo.PUBLIC_KV.m.keys()].some((k) => k.indexOf("use:") === 0 || k.indexOf("usem:") === 0));
  assert.ok(envDo.USAGE_DO.objs.has("u:g_9802"));
  resetWorld();
});

test("Durable Object: 실패한 호출 돌려받기·같은 요청 번호·긴 읽기 한 편·신고 상한이 KV 때와 같게 돈다", async () => {
  resetWorld();
  const env = makeEnv({ USAGE_DO: makeDO() });
  const t = await login(env, { sub: "9811", email: "d1@example.com" });
  // 실패(5xx)는 돌려받음
  proxyStatus = 500;
  assert.equal((await ai(env, t, "story")).status, 500);
  proxyStatus = 200;
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY");
  // 잠긴 기능
  assert.equal((await ai(env, t, "longread")).data.error, "PLUS_REQUIRED");
  // 같은 요청 번호의 재시도는 한 번만 셈 (무료 오늘의 문장 하루 1번)
  const h = { "x-kata-req": "abcdefgh1234" };
  assert.equal((await ai(env, t, "phrase", null, h)).status, 200);
  assert.equal((await ai(env, t, "phrase", null, h)).status, 200);
  assert.equal((await ai(env, t, "phrase", null, { "x-kata-req": "zzzzzzzz9999" })).data.error, "QUOTA_PHRASE");
  // Plus: 긴 읽기 한 편의 조각 여러 개는 한 번
  await makePlus(env, t);
  for (let i = 0; i < 4; i++) assert.equal((await ai(env, t, "longread", null, { "x-kata-unit": "story:1" })).status, 200);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.features.longread.used.day, 1);
  // 신고 하루 상한(Plus 50) — 동시에 60개를 보내도 정확히 50개
  const reps = await burst(60, (i) => call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "r" + i } }));
  assert.equal(count(reps, 200), 50);
  assert.equal(count(reps, 429), 10);
  assert.equal(reps.find((r) => r.status === 429).data.error, "QUOTA_REPORT");
  resetWorld();
});

test("Durable Object: 계정을 지우면 객체의 사용량도 지워지고, 지난 칸은 날짜가 바뀌면 정리된다", async () => {
  resetWorld();
  const env = makeEnv({ USAGE_DO: makeDO() });
  const t = await login(env, { sub: "9821", email: "d2@example.com" });
  assert.equal((await ai(env, t, "text")).status, 200);
  const st = env.USAGE_DO.objs.get("u:g_9821").storage;
  assert.ok(st.m.size >= 2); // 하루 칸 + 한 달 칸
  assert.ok(st.alarmAt() > Date.now()); // 요청이 없어도 지우도록 알람을 걸어 둠
  const firstDayKey = [...st.m.keys()].find((k) => k.indexOf("use:") === 0);
  // 사흘 뒤 다시 쓰면 지난 하루 칸은 사라짐
  clockOffset += 4 * DAY;
  assert.equal((await ai(env, t, "text")).status, 200);
  assert.ok(!st.m.has(firstDayKey));
  // 알람만 돌아도(요청 없이) 지난 칸이 지워짐
  clockOffset += 45 * DAY;
  await env.USAGE_DO.objs.get("u:g_9821").obj.alarm();
  assert.equal([...st.m.keys()].filter((k) => k.indexOf("use") === 0).length, 0);
  // 계정 삭제
  clockOffset = 0;
  const t2 = await login(env, { sub: "9822", email: "d3@example.com" });
  await ai(env, t2, "text");
  const st2 = env.USAGE_DO.objs.get("u:g_9822").storage;
  assert.ok(st2.m.size > 0);
  assert.equal((await call(env, "POST", "/account/delete", { token: t2 })).status, 200);
  assert.equal(st2.m.size, 0);
  resetWorld();
});

test("Durable Object 가 없거나 고장 나도 KV 방식으로 그대로 돈다", async () => {
  resetWorld();
  const env = makeEnv({ USAGE_DO: makeDO({ broken: true }) });
  const t = await login(env, { sub: "9831", email: "d4@example.com" });
  assert.equal((await ai(env, t, "story")).status, 200);
  assert.equal((await ai(env, t, "story")).data.error, "QUOTA_STORY"); // KV 로 세어 한도도 지켜짐
  assert.ok([...env.PUBLIC_KV.m.keys()].some((k) => k.indexOf("use:g_9831:") === 0));
  assert.equal((await call(env, "GET", "/me", { token: t })).data.features.story.used.day, 1);
  resetWorld();
});

test("S-21 전체 하루 상한(AI_DAILY_BUDGET): 넘으면 503, 계정 한도는 쓰지 않고, 다음 날 풀린다", async () => {
  resetWorld();
  // 비어 있으면 상한 없음(예전과 같음) — KV 에 전체 칸도 만들지 않음
  const envNone = makeEnv();
  const tn = await login(envNone, { sub: "9841", email: "b0@example.com" });
  for (let i = 0; i < 5; i++) assert.equal((await ai(envNone, tn, "text")).status, 200);
  assert.ok(![...envNone.PUBLIC_KV.m.keys()].some((k) => k.indexOf("budget:") === 0));
  assert.equal((await call(envNone, "GET", "/admin/budget", ADMIN)).data.caps, null);

  const env = makeEnv({ AI_DAILY_BUDGET: "3" });
  const t = await login(env, { sub: "9842", email: "b1@example.com" });
  calls.length = 0;
  // 실패한 호출은 전체 칸도 돌려받음
  proxyStatus = 500;
  assert.equal((await ai(env, t, "text")).status, 500);
  proxyStatus = 200;
  for (let i = 0; i < 3; i++) assert.equal((await ai(env, t, "text")).status, 200);
  const blocked = await ai(env, t, "text");
  assert.equal(blocked.status, 503);
  assert.equal(blocked.data.error, "SERVICE_PAUSED");
  assert.equal(blocked.data.reason, "budget");
  assert.equal(blocked.headers.get("x-kata-paused"), "1");
  // 막힌 호출은 AI 쪽으로 나가지 않았고 계정 한도도 쓰지 않음
  assert.equal(calls.filter((c) => c.url === PROXY).length, 4);
  assert.equal((await call(env, "GET", "/me", { token: t })).data.usage.text, 3);
  // 다른 계정도 막힘(전체 상한). 로그인·/me 는 그대로
  const t2 = await login(env, { sub: "9843", email: "b2@example.com" });
  assert.equal((await ai(env, t2, "story")).status, 503);
  assert.equal((await call(env, "GET", "/me", { token: t2 })).data.features.story.used.day, 0);
  // 관리자·Special 은 막지 않음(세기는 함)
  await call(env, "POST", "/admin/special", Object.assign({ body: { email: "b2@example.com", tier: "admin" } }, ADMIN));
  assert.equal((await ai(env, t2, "text")).status, 200);
  const b = await call(env, "GET", "/admin/budget", ADMIN);
  assert.equal(b.status, 200);
  assert.deepEqual(b.data.caps, { all: 3, text: null, tts: null });
  assert.equal(b.data.used.all, 4);
  assert.equal(b.data.counter, "kv");
  assert.ok(b.data.reachedAt > 0);
  assert.equal((await call(env, "GET", "/admin/budget")).status, 403);
  // 다음 날(한국 날짜)에는 풀림
  clockOffset += DAY;
  assert.equal((await ai(env, t, "text")).status, 200);
  resetWorld();
});

test("S-21 하루 상한: 소리만 따로 두기, 잘못 적은 값은 0 으로 보고 막기, AI_PAUSED 와 함께", async () => {
  resetWorld();
  const env = makeEnv({ AI_DAILY_BUDGET: '{"all":10,"tts":2}' });
  const t = await login(env, { sub: "9851", email: "b3@example.com" });
  assert.equal((await ai(env, t, "word-audio")).status, 200);
  assert.equal((await ai(env, t, "word-audio")).status, 200);
  const r = await ai(env, t, "word-audio");
  assert.equal(r.status, 503);
  assert.equal(r.data.reason, "budget");
  assert.equal((await ai(env, t, "text")).status, 200); // 글은 아직 됨

  const envBad = makeEnv({ AI_DAILY_BUDGET: "많이" });
  const tb = await login(envBad, { sub: "9852", email: "b4@example.com" });
  assert.equal((await ai(envBad, tb, "text")).status, 503);
  const b = await call(envBad, "GET", "/admin/budget", ADMIN);
  assert.equal(b.data.invalid, true);
  assert.equal(b.data.caps.all, 0);

  // AI_PAUSED 가 먼저 — 전체 칸을 쓰지 않음
  const envP = makeEnv({ AI_DAILY_BUDGET: "5", AI_PAUSED: "all" });
  const tp = await login(envP, { sub: "9853", email: "b5@example.com" });
  const p = await ai(envP, tp, "text");
  assert.equal(p.data.error, "SERVICE_PAUSED");
  assert.equal(p.data.reason, undefined);
  assert.equal(p.headers.get("x-kata-paused"), "1");
  assert.equal((await call(envP, "GET", "/admin/budget", ADMIN)).data.used.all, 0);
  resetWorld();
});

test("S-21 하루 상한 + Durable Object: 여러 계정이 동시에 쏴도 정확히 상한까지만 나간다", async () => {
  resetWorld();
  const env = makeEnv({ PUBLIC_KV: makeSlowKV(), USAGE_DO: makeDO(), AI_DAILY_BUDGET: "7", ...TG });
  const tokens = [];
  for (let i = 0; i < 4; i++) tokens.push(await login(env, { sub: "986" + i, email: "m" + i + "@example.com" }));
  calls.length = 0;
  const rs = await burst(40, (i) => ai(env, tokens[i % 4], "text"));
  assert.equal(count(rs, 200), 7);
  assert.equal(count(rs, 503), 33);
  assert.equal(calls.filter((c) => c.url === PROXY).length, 7);
  // 막힌 호출은 계정 칸을 돌려받음 — 계정별 사용량 합이 7
  let used = 0;
  for (const tk of tokens) used += (await call(env, "GET", "/me", { token: tk })).data.usage.text;
  assert.equal(used, 7);
  const b = await call(env, "GET", "/admin/budget", ADMIN);
  assert.equal(b.data.counter, "durable-object");
  assert.equal(b.data.used.all, 7);
  // 상한에 닿았다는 운영자 알림은 하루 한 번만
  assert.equal(tgCalls().length, 1);
  assert.ok(tgTexts()[0].indexOf("하루 상한") >= 0);
  // 상한이 없어도 Durable Object 가 있으면 오늘 나간 수를 셈
  const env2 = makeEnv({ USAGE_DO: makeDO() });
  const t2 = await login(env2, { sub: "9869", email: "m9@example.com" });
  await ai(env2, t2, "text");
  assert.equal((await call(env2, "GET", "/admin/budget", ADMIN)).data.used.all, 1);
  resetWorld();
});

test("P-19 신고 알림: 비밀값이 없으면 아무것도 안 함, 있으면 첫 신고를 알리고 한 시간 안의 것은 묶는다", async () => {
  resetWorld();
  tgStatus = 200;
  const envOff = makeEnv();
  const t0 = await login(envOff, { sub: "9871", email: "n0@example.com" });
  assert.equal((await call(envOff, "POST", "/report", { token: t0, body: { feature: "dict", reason: "x" } })).status, 200);
  assert.equal(tgCalls().length, 0);
  // 하나만 있어도 보내지 않음
  const envHalf = makeEnv({ TELEGRAM_BOT_TOKEN: "123:abc" });
  const th = await login(envHalf, { sub: "9872", email: "n1@example.com" });
  await call(envHalf, "POST", "/report", { token: th, body: { feature: "dict", reason: "x" } });
  assert.equal(tgCalls().length, 0);

  const env = makeEnv(TG);
  const t = await login(env, { sub: "9873", email: "reporter@example.com", name: "Budi Reporter" });
  const long = "뜻이 틀렸습니다 제 메일 someone@example.com 전화 0812-3456-7890 로 알려 주세요 그리고 더 긴 설명이 이어집니다";
  assert.equal((await call(env, "POST", "/report", { token: t, body: { feature: "story", input: "in", output: "out", reason: long } })).status, 200);
  assert.equal(tgCalls().length, 1);
  const c = tgCalls()[0];
  assert.ok(c.url.indexOf("/bot123:abc/sendMessage") > 0);
  const sent = JSON.parse(c.init.body);
  assert.equal(sent.chat_id, "777");
  assert.ok(sent.text.indexOf("새 신고 1건") >= 0);
  assert.ok(sent.text.indexOf("기능: story") >= 0);
  assert.ok(sent.text.indexOf("한국 시각") >= 0);
  assert.ok(sent.text.indexOf("앞부분: 뜻이 틀렸습니다") >= 0);
  // 개인정보 없음: 계정 번호·이메일·이름·전화, 그리고 긴 글의 뒷부분
  for (const bad of ["g_9873", "reporter@example.com", "Budi", "someone@example.com", "0812", "이어집니다"]) {
    assert.ok(sent.text.indexOf(bad) < 0, "알림에 들어가면 안 되는 값: " + bad);
  }
  // 한 시간 안의 신고 둘 — 보내지 않고 셈
  clockOffset += 10 * MIN;
  await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "둘" } });
  clockOffset += 10 * MIN;
  await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "셋" } });
  assert.equal(tgCalls().length, 1);
  // 한 시간이 지난 뒤의 다음 신고 — 그사이 것까지 한 통으로
  clockOffset += 61 * MIN;
  await call(env, "POST", "/report", { token: t, body: { feature: "tips", reason: "넷" } });
  assert.equal(tgCalls().length, 2);
  assert.ok(tgTexts()[1].indexOf("새 신고 3건 (그사이 2건 포함)") >= 0);
  // 신고 4건이 모두 저장돼 있음
  assert.equal((await call(env, "GET", "/admin/reports", ADMIN)).data.items.length, 4);
  resetWorld();
});

test("P-19 신고 알림: 텔레그램이 실패해도 신고는 저장되고, 묵은 묶음은 Cron(scheduled)이 보낸다", async () => {
  resetWorld();
  const env = makeEnv(TG);
  const t = await login(env, { sub: "9881", email: "n2@example.com" });
  tgStatus = 500;
  assert.equal((await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "하나" } })).status, 200);
  tgStatus = 0; // 통신 오류
  assert.equal((await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "둘" } })).status, 200);
  assert.equal((await call(env, "GET", "/admin/reports", ADMIN)).data.items.length, 2);
  assert.equal(tgCalls().length, 2); // 둘 다 시도는 했음
  // 텔레그램이 돌아오면 다음 신고 때 밀린 것까지 알림
  tgStatus = 200;
  await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "셋" } });
  assert.ok(tgTexts()[2].indexOf("새 신고 3건 (그사이 2건 포함)") >= 0);
  // 한 시간 안에 하나 더 → 묶임. 그 뒤 신고가 없어도 Cron 이 한 시간 뒤에 알림
  await call(env, "POST", "/report", { token: t, body: { feature: "dict", reason: "넷" } });
  assert.equal(tgCalls().length, 3);
  await worker.scheduled({}, env, undefined);
  assert.equal(tgCalls().length, 3); // 아직 한 시간 전
  clockOffset += 61 * MIN;
  await worker.scheduled({}, env, undefined);
  assert.equal(tgCalls().length, 4);
  assert.ok(tgTexts()[3].indexOf("신고 1건이 더") >= 0);
  await worker.scheduled({}, env, undefined);
  assert.equal(tgCalls().length, 4); // 보낸 뒤에는 다시 보내지 않음
  // 비밀값이 없으면 Cron 도 아무것도 안 함
  await worker.scheduled({}, makeEnv(), undefined);
  assert.equal(tgCalls().length, 4);
  tgStatus = 200;
  resetWorld();
});

test("보안 보강: 카운터를 적지 못하면(KV 쓰기 한도 등) AI 를 부르지 않고 503 — 세지 않은 호출이 나가지 않는다", async () => {
  resetWorld();
  const kv = makeKV();
  const put = kv.put.bind(kv);
  let full = false; // true 면 사용량·전체 칸 쓰기가 실패(무료 요금제의 하루 쓰기 한도에 닿은 상황 흉내)
  kv.put = async (k, v, o) => {
    if (full && ["use:", "usem:", "uset:", "budget:"].some((p) => k.indexOf(p) === 0)) throw new Error("KV PUT failed: 429 Too Many Requests");
    return put(k, v, o);
  };
  const env = makeEnv({ PUBLIC_KV: kv });
  const t = await login(env, { sub: "9895", email: "kvfull@example.com" });
  assert.equal((await ai(env, t, "text")).status, 200);
  full = true;
  calls.length = 0;
  const r = await ai(env, t, "text");
  assert.equal(r.status, 503);
  assert.equal(r.data.error, "SERVICE_PAUSED");
  assert.equal(r.data.reason, "store");
  assert.equal(r.headers.get("x-kata-paused"), "1");
  assert.equal(calls.filter((c) => c.url === PROXY).length, 0);
  // 로그인·/me 는 그대로
  assert.equal((await call(env, "GET", "/me", { token: t })).status, 200);
  // 전체 하루 칸(KV)을 적지 못해도 마찬가지 — 상한을 정해 두었고 Durable Object 가 없을 때
  const env2 = makeEnv({ PUBLIC_KV: kv, AI_DAILY_BUDGET: "100", LIMITS_JSON: "{}" });
  const t2 = await login(env2, { sub: "9896", email: "kvfull2@example.com" });
  const kvPut = kv.put;
  kv.put = async (k, v, o) => {
    if (k.indexOf("budget:") === 0) throw new Error("KV PUT failed");
    return put(k, v, o);
  };
  calls.length = 0;
  const r2 = await ai(env2, t2, "text");
  assert.equal(r2.status, 503);
  assert.equal(r2.data.reason, "store");
  assert.equal(calls.filter((c) => c.url === PROXY).length, 0);
  assert.equal((await call(env2, "GET", "/me", { token: t2 })).data.usage.text, 0); // 계정 칸은 돌려받음
  kv.put = kvPut;
  resetWorld();
});

test("보안 보강: 이메일 확인 표시가 없는 토큰은 거절, content-length 없이 보낸 큰 본문은 끊는다", async () => {
  resetWorld();
  const env = makeEnv();
  const noFlag = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ email_verified: undefined }) } });
  assert.equal(noFlag.status, 401);
  assert.equal(noFlag.data.error, "EMAIL_NOT_VERIFIED");
  const notVerified = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ email_verified: false }) } });
  assert.equal(notVerified.status, 401);
  assert.equal((await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ email_verified: "true" }) } })).status, 200);
  // 미리 준 등급이 확인 안 된 이메일로 넘어가지 않음
  await call(env, "POST", "/admin/special", Object.assign({ body: { email: "vip@example.com", tier: "special" } }, ADMIN));
  const steal = await call(env, "POST", "/auth/google", { body: { idToken: await idToken({ sub: "9891", email: "vip@example.com", email_verified: undefined }) } });
  assert.equal(steal.status, 401);
  assert.ok([...env.PUBLIC_KV.m.keys()].some((k) => k.indexOf("spec:") === 0)); // 그대로 남아 있음

  // 본문 상한: 흘려보내는(스트림) 본문은 content-length 가 없음 — 상한에서 끊고 413
  const t = await login(env, { sub: "9892", email: "big@example.com" });
  const big = new TextEncoder().encode(JSON.stringify({ feature: "dict", reason: "x".repeat(40 * 1024) }));
  const stream = new ReadableStream({
    start(ctrl) { for (let i = 0; i < big.length; i += 4096) ctrl.enqueue(big.slice(i, i + 4096)); ctrl.close(); },
  });
  const req = new Request("https://kata-public.example.workers.dev/report", {
    method: "POST", headers: { origin: ORIGIN, authorization: "Bearer " + t, "content-type": "application/json" }, body: stream, duplex: "half",
  });
  assert.equal(req.headers.get("content-length"), null);
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 413);
  assert.equal((await call(env, "GET", "/admin/reports", ADMIN)).data.items.length, 0);
  resetWorld();
});
