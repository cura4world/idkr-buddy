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
//   POST /admin/special                     Special Member·관리자 등급 주기/거두기 (x-admin-key)
//   GET  /admin/special?email=|uid=         그 계정의 등급 확인 (x-admin-key)
//
// 설정(비밀값·변수)은 docs/release/03-architecture.md 의 표를 봅니다.
// 이 파일에는 정규식 리터럴을 쓰지 않습니다(저장소 규칙). new RegExp 만 씁니다.

const APP_ORIGINS = ["https://cura4world.github.io"];

// ── 기능별 한도 (S41 — 결정 문서 "무료와 Plus" 표가 정본, docs/release/08 에 사본) ──
//
// 앱은 AI 를 부를 때 x-kata-kind 에 "무슨 기능인지"를 적어 보냅니다. 한도는 그 이름별로 셉니다.
//   텍스트: story(이야기 불러오기) · percakapan-make(회화집 만들기) · dict-new(사전에서 처음 찾는 말)
//          · phrase(오늘의 문장 새로) · text(그 밖의 짧은 풀이 — 단어 탭 풀이, 단어 채우기, 지도·이해 설명 등)
//   음성:   longread(내가 만든 이야기·회화 듣기) · word-audio(단어·예문 발음)
//          · shared-audio(기본 회화집·지도·이해 읽기) · tts(예전 앱이 보내던 이름 — 그대로 받음)
//
// 칸 하나: { day, month, total, locked, hidden }
//   day / month  한국 날짜·한국 달 기준 상한. 없으면 그 기간은 제한 없음
//   total        체험 기간 전체 합계 상한 (체험 긴 읽기 15)
//   locked       이 등급에서는 못 씀 → 403 PLUS_REQUIRED
//   hidden       화면에 "남은 횟수"로 보이지 않는 상한(사전 숨은 한도, 남용 방지용 안전 상한)
// 표에서 "제한 없음"·"한도에 안 셈"인 기능에도 Plus 에는 남용 방지용 hidden 상한을 둡니다
// (앱이 스스로 밝히는 이름이라 서버가 내용을 확인할 수 없기 때문). Special·관리자는 정말 제한이 없습니다.
// 운영 중 바꿀 때는 LIMITS_JSON 변수로 덮어씁니다(아래 getLimits).
const DEFAULT_LIMITS = {
  free: {
    story: { day: 1 },
    "percakapan-make": { locked: true },
    longread: { locked: true },
    "dict-new": { day: 50, hidden: true },
    phrase: { day: 1 },
    text: { day: 200, hidden: true },
    "word-audio": { day: 100, month: 1500, hidden: true },
    "shared-audio": { locked: true },
    tts: { day: 30, hidden: true },
    report: { day: 20, hidden: true },
  },
  plus: {
    story: { day: 5, month: 60 },
    "percakapan-make": { day: 3, month: 30 },
    longread: { day: 5, month: 50 },
    "dict-new": { day: 50, month: 400, hidden: true },
    phrase: { day: 50, hidden: true },
    text: { day: 1000, hidden: true },
    "word-audio": { day: 1000, hidden: true },
    "shared-audio": { day: 400, hidden: true },
    tts: { day: 400, hidden: true },
    report: { day: 50, hidden: true },
  },
  // trial 은 아래 deriveTrialLimits 가 plus 에서 만듭니다(절반).
  special: { report: { day: 50, hidden: true } },
  admin: { report: { day: 50, hidden: true } },
};

// 체험(7일)은 이 기능들만 Plus 의 절반(내림, 최소 1). 나머지는 Plus 와 같음.
const TRIAL_HALF_KINDS = ["story", "percakapan-make", "longread", "dict-new"];
const TRIAL_TOTALS = { longread: 15 }; // 체험 기간 전체 합계

const TIERS = ["free", "trial", "plus", "special", "admin"];

// kind → 텍스트/음성, 한 번에 보낼 수 있는 글자 수
const KINDS = {
  text: { mode: "text", maxChars: 12000 },
  story: { mode: "text", maxChars: 12000 },
  "percakapan-make": { mode: "text", maxChars: 12000 },
  "dict-new": { mode: "text", maxChars: 12000 },
  phrase: { mode: "text", maxChars: 12000 },
  tts: { mode: "tts", maxChars: 6000 },
  "word-audio": { mode: "tts", maxChars: 600 },
  "shared-audio": { mode: "tts", maxChars: 6000 },
  longread: { mode: "tts", maxChars: 6000 },
};

// 긴 읽기 한 편을 문단 여러 개로 나눠 부르면(x-kata-unit 같은 값) 첫 조각만 한 번으로 셉니다.
// 같은 편으로 하루에 부를 수 있는 조각 수 상한 — 같은 값을 돌려 쓰는 남용 방지.
const MAX_UNIT_CALLS = 24;
const UNIT_RE = new RegExp("^[A-Za-z0-9._:\\-]{1,160}$");

const TEXT_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];

const SESSION_TTL_SEC = 60 * 24 * 3600;
const MAX_SESSIONS_PER_USER = 10;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_TEXT_OUTPUT_TOKENS = 16384;
const DEFAULT_TEXT_OUTPUT_TOKENS = 8192;
const DAY_TTL_SEC = 3 * 24 * 3600;
const MONTH_TTL_SEC = 40 * 24 * 3600;
const TRIAL_TOTAL_TTL_SEC = 400 * 24 * 3600;
const TRIAL_DAYS = 7;
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
  constructor(status, code, extra) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra || null; // 응답 JSON 에 함께 실을 값 (한도 초과 시 kind·period·limit)
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const h = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-kata-kind, x-kata-unit, x-admin-key",
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

// 한국 달 (월 사용량은 한국 기준 매달 1일 0시에 0 으로)
function kstMonth(nowMs) {
  return kstDay(nowMs).slice(0, 7);
}

function cloneCell(c) {
  const o = {};
  if (!c || typeof c !== "object") return o;
  ["day", "month", "total"].forEach((p) => {
    if (typeof c[p] === "number") o[p] = c[p];
  });
  if (c.locked) o.locked = true;
  if (c.hidden) o.hidden = true;
  return o;
}

// LIMITS_JSON 한 칸 덮어쓰기.
//   숫자 하나(예전 모양 {"free":{"tts":30}}) → 하루 상한만 바꿈
//   객체({"day":2,"month":10,"locked":false}) → 적힌 값만 바꿈. 값이 null 이면 그 기간 제한을 없앰
function mergeCell(base, v) {
  const out = cloneCell(base);
  if (typeof v === "number" || (typeof v === "string" && v !== "" && isFinite(Number(v)))) {
    const n = Number(v);
    if (isFinite(n) && n >= 0) out.day = Math.floor(n);
    return out;
  }
  if (!v || typeof v !== "object") return out;
  ["day", "month", "total"].forEach((p) => {
    if (!(p in v)) return;
    if (v[p] === null) { delete out[p]; return; }
    const n = Number(v[p]);
    if (isFinite(n) && n >= 0) out[p] = Math.floor(n);
  });
  if ("locked" in v) { if (v.locked) out.locked = true; else delete out.locked; }
  if ("hidden" in v) { if (v.hidden) out.hidden = true; else delete out.hidden; }
  return out;
}

function halfOf(n) {
  return Math.max(1, Math.floor(n / 2));
}

// 체험 한도 = Plus 의 절반(내림, 최소 1). 다만 무료보다 박해지지는 않게 합니다
// (사전 하루 50 은 무료도 50 이라 절반 25 로 두면 체험이 무료보다 못해짐 — 무료 값으로 올림).
function deriveTrialLimits(free, plus) {
  const out = {};
  Object.keys(plus).forEach((kind) => {
    const p = cloneCell(plus[kind]);
    if (TRIAL_HALF_KINDS.indexOf(kind) < 0) { out[kind] = p; return; }
    const f = free[kind] || {};
    const t = cloneCell(p);
    ["day", "month"].forEach((per) => {
      if (typeof p[per] !== "number") return;
      t[per] = halfOf(p[per]);
      if (!f.locked) {
        if (typeof f[per] !== "number") delete t[per];          // 무료가 그 기간 제한이 없음
        else if (f[per] > t[per]) t[per] = f[per];
      }
    });
    if (typeof TRIAL_TOTALS[kind] === "number") t.total = TRIAL_TOTALS[kind];
    out[kind] = t;
  });
  return out;
}

function getLimits(env) {
  let o = null;
  if (env.LIMITS_JSON) {
    try { o = JSON.parse(env.LIMITS_JSON); } catch (e) { o = null; }
  }
  const apply = (tier, base) => {
    const out = {};
    Object.keys(base).forEach((k) => { out[k] = cloneCell(base[k]); });
    const over = o && o[tier] && typeof o[tier] === "object" ? o[tier] : null;
    if (over) Object.keys(over).forEach((k) => { out[k] = mergeCell(out[k], over[k]); });
    return out;
  };
  const free = apply("free", DEFAULT_LIMITS.free);
  const plus = apply("plus", DEFAULT_LIMITS.plus);
  return {
    free,
    plus,
    trial: apply("trial", deriveTrialLimits(free, plus)),
    special: apply("special", DEFAULT_LIMITS.special),
    admin: apply("admin", DEFAULT_LIMITS.admin),
  };
}

function limitsFor(env, tier) {
  const all = getLimits(env);
  return all[tier] || all.free;
}

function productIds(env) {
  if (env.PRODUCT_IDS) return String(env.PRODUCT_IDS).split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_PRODUCT_IDS;
}

async function readJsonBody(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new HttpError(413, "BODY_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, "BODY_TOO_LARGE");
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
  await kvPutJson(env, "sess:" + h, { uid, exp, at: Date.now() }, SESSION_TTL_SEC);
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
  // 계정을 지운 뒤 같은 Google 계정으로 다시 가입하면 createdAt 이 새로 찍힙니다.
  // 그보다 먼저 만들어진 세션(삭제 때 미처 못 지운 것)은 살아나지 않게 막습니다.
  if ((sess.at || 0) < (user.createdAt || 0)) throw new HttpError(401, "NO_SESSION");
  return { uid: sess.uid, user, sessHash: h };
}

function publicUser(user) {
  return { id: user.uid, email: user.email || "", name: user.name || "", picture: user.picture || "" };
}

// ── 플랜 ─────────────────────────────────────────────────────

// 등급: free · trial · plus · special · admin
//   ent:<uid> = { tier, productId, purchaseToken, tokenHash, until, trial, state, checkedAt, staff }
//   staff = { tier: "special"|"admin", until(0=무기한), note, at } — 관리자가 /admin/special 로 준 등급.
//   Play 검증이 ent 를 다시 써도 staff 는 남습니다. ent.tier 를 KV 에서 직접 special·admin 으로 적어도 인정합니다.
// 앱에 주는 plan: { tier, until, trial?, productId? }  (trial 이면 trial: true)

function staffPlan(ent, now) {
  const s = ent && ent.staff;
  if (s && (s.tier === "special" || s.tier === "admin") && (!s.until || s.until > now)) {
    return { tier: s.tier, until: s.until || 0 };
  }
  if (ent && (ent.tier === "special" || ent.tier === "admin") && (!ent.until || ent.until > now)) {
    return { tier: ent.tier, until: ent.until || 0 };
  }
  return null;
}

function paidPlan(ent, until) {
  if (ent.tier === "trial" || ent.trial === true) {
    return { tier: "trial", until, trial: true, productId: ent.productId };
  }
  return { tier: "plus", until, productId: ent.productId };
}

async function getPlan(env, uid) {
  const ent = await kvGetJson(env, "ent:" + uid);
  const now = Date.now();
  const staff = staffPlan(ent, now);
  if (staff) return staff;
  if (!ent || (ent.tier !== "plus" && ent.tier !== "trial")) return { tier: "free", until: 0 };
  if (ent.until > now) return paidPlan(ent, ent.until);
  // 만료가 지났으면 갱신됐는지 한 시간에 한 번까지 Play 에 다시 묻습니다.
  if (ent.purchaseToken && env.PLAY_SERVICE_ACCOUNT && now - (ent.checkedAt || 0) > ENT_RECHECK_MS) {
    try {
      const r = await verifyWithPlay(env, uid, ent.productId, ent.purchaseToken);
      if (r.until > now) return paidPlan({ tier: r.trial ? "trial" : "plus", trial: r.trial, productId: ent.productId }, r.until);
    } catch (e) {
      // 실패해도 확인 시각은 남겨, 요청마다 Play 를 다시 부르지 않게 합니다(한 시간 뒤 재시도).
      try {
        ent.checkedAt = now;
        await kvPutJson(env, "ent:" + uid, ent);
      } catch (e2) {}
    }
  }
  return { tier: "free", until: 0 };
}

// ── 사용량 ───────────────────────────────────────────────────

//   use:<uid>:<YYYY-MM-DD>  하루 사용량 { <kind>: n, units: { longread: { <unit>: 조각 수 } } }  (3일)
//   usem:<uid>:<YYYY-MM>    한 달 사용량 { <kind>: n }  (40일)
//   uset:<uid>              체험 기간 합계 { longread: n }  (400일 — 체험은 계정마다 한 번)

function dayKey(uid, nowMs) { return "use:" + uid + ":" + kstDay(nowMs); }
function monthKey(uid, nowMs) { return "usem:" + uid + ":" + kstMonth(nowMs); }
function totalKey(uid) { return "uset:" + uid; }

async function readUsage(env, uid) {
  const now = Date.now();
  const u = (await kvGetJson(env, dayKey(uid, now))) || {};
  return { day: kstDay(now), text: u.text || 0, tts: u.tts || 0, report: u.report || 0 };
}

// 사용량 기록이 실패해도 사용자 요청은 실패시키지 않습니다(이미 Gemini 비용이 든 뒤일 수 있음).
async function safePut(env, key, value, ttl) {
  try { await kvPutJson(env, key, value, ttl); } catch (e) {}
}

// 하루 칸만 더함 (신고 수)
async function addUsage(env, uid, kind, delta) {
  try {
    const key = dayKey(uid, Date.now());
    const u = (await kvGetJson(env, key)) || {};
    u[kind] = Math.max(0, (u[kind] || 0) + (delta === undefined ? 1 : delta));
    await kvPutJson(env, key, u, DAY_TTL_SEC);
  } catch (e) {}
}

function quotaError(kind, period, limit, tier) {
  return new HttpError(429, "QUOTA_" + kind.toUpperCase().split("-").join("_"), { kind, period, limit, plan: tier });
}

/**
 * AI 를 부르기 전에 한 칸을 먼저 잡습니다(동시에 여러 개를 쏘아 한도를 넘기는 것을 줄임).
 * 실패하면 refundUse 로 돌려줍니다. KV 는 원자적이지 않아 짧은 순간의 동시 요청까지 완벽히
 * 막지는 못합니다 — 사용자가 늘면 Durable Object 카운터로 바꿉니다(docs/release/05 참고).
 * 잠긴 기능이면 403 PLUS_REQUIRED, 한도를 넘었으면 429 QUOTA_<KIND> {kind, period, limit}.
 */
async function reserveUse(env, uid, tier, kind, unit) {
  const lim = limitsFor(env, tier)[kind] || {};
  if (lim.locked) throw new HttpError(403, "PLUS_REQUIRED", { kind, plan: tier });
  const now = Date.now();
  const dKey = dayKey(uid, now);
  const d = (await kvGetJson(env, dKey)) || {};

  // 같은 편의 다음 조각 — 이미 셌으므로 한도를 다시 보지 않고 조각 수만 늘립니다.
  if (unit) {
    const units = d.units && typeof d.units === "object" ? d.units : {};
    const mine = units[kind] && typeof units[kind] === "object" ? units[kind] : {};
    if (mine[unit]) {
      if (mine[unit] >= MAX_UNIT_CALLS) throw quotaError(kind, "day", lim.day == null ? null : lim.day, tier);
      mine[unit] += 1;
      units[kind] = mine;
      d.units = units;
      await safePut(env, dKey, d, DAY_TTL_SEC);
      return { uid, kind, unit, counted: false, dKey };
    }
  }

  const mKey = monthKey(uid, now);
  const m = (await kvGetJson(env, mKey)) || {};
  const useTotal = tier === "trial" && typeof lim.total === "number";
  const tKey = totalKey(uid);
  const t = useTotal ? (await kvGetJson(env, tKey)) || {} : null;

  if (typeof lim.day === "number" && (d[kind] || 0) >= lim.day) throw quotaError(kind, "day", lim.day, tier);
  if (typeof lim.month === "number" && (m[kind] || 0) >= lim.month) throw quotaError(kind, "month", lim.month, tier);
  if (t && (t[kind] || 0) >= lim.total) throw quotaError(kind, "total", lim.total, tier);

  d[kind] = (d[kind] || 0) + 1;
  if (unit) {
    const units = d.units && typeof d.units === "object" ? d.units : {};
    const mine = units[kind] && typeof units[kind] === "object" ? units[kind] : {};
    mine[unit] = 1;
    units[kind] = mine;
    d.units = units;
  }
  m[kind] = (m[kind] || 0) + 1;
  await safePut(env, dKey, d, DAY_TTL_SEC);
  await safePut(env, mKey, m, MONTH_TTL_SEC);
  if (t) {
    t[kind] = (t[kind] || 0) + 1;
    await safePut(env, tKey, t, TRIAL_TOTAL_TTL_SEC);
  }
  return { uid, kind, unit, counted: true, dKey, mKey, tKey: t ? tKey : null };
}

/** 부른 결과가 실패면 잡아 둔 칸을 돌려줍니다. */
async function refundUse(env, r) {
  if (!r) return;
  try {
    const d = (await kvGetJson(env, r.dKey)) || {};
    const units = d.units && typeof d.units === "object" ? d.units : null;
    const mine = units && units[r.kind] && typeof units[r.kind] === "object" ? units[r.kind] : null;
    if (!r.counted) {
      if (mine && mine[r.unit] > 1) mine[r.unit] -= 1;
      await safePut(env, r.dKey, d, DAY_TTL_SEC);
      return;
    }
    d[r.kind] = Math.max(0, (d[r.kind] || 0) - 1);
    if (r.unit && mine) delete mine[r.unit];
    await safePut(env, r.dKey, d, DAY_TTL_SEC);
    const m = (await kvGetJson(env, r.mKey)) || {};
    m[r.kind] = Math.max(0, (m[r.kind] || 0) - 1);
    await safePut(env, r.mKey, m, MONTH_TTL_SEC);
    if (r.tKey) {
      const t = (await kvGetJson(env, r.tKey)) || {};
      t[r.kind] = Math.max(0, (t[r.kind] || 0) - 1);
      await safePut(env, r.tKey, t, TRIAL_TOTAL_TTL_SEC);
    }
  } catch (e) {}
}

/** /me 에 싣는 기능별 사용량·한도·남은 수 (null = 제한 없음). */
async function featureUsage(env, uid, tier) {
  const now = Date.now();
  const d = (await kvGetJson(env, dayKey(uid, now))) || {};
  const m = (await kvGetJson(env, monthKey(uid, now))) || {};
  const t = tier === "trial" ? (await kvGetJson(env, totalKey(uid))) || {} : {};
  const lims = limitsFor(env, tier);
  const out = {};
  Object.keys(KINDS).concat(["report"]).forEach((kind) => {
    const lim = lims[kind] || {};
    const used = { day: d[kind] || 0, month: m[kind] || 0 };
    const limit = {
      day: typeof lim.day === "number" ? lim.day : null,
      month: typeof lim.month === "number" ? lim.month : null,
    };
    const left = {
      day: limit.day === null ? null : Math.max(0, limit.day - used.day),
      month: limit.month === null ? null : Math.max(0, limit.month - used.month),
    };
    if (tier === "trial" && typeof lim.total === "number") {
      used.total = t[kind] || 0;
      limit.total = lim.total;
      left.total = Math.max(0, lim.total - used.total);
    }
    out[kind] = { locked: !!lim.locked, hidden: !!lim.hidden, used, limit, left };
  });
  return out;
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
  const trial = valid && isFreeTrialPhase(sub, item, Date.now());

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
  // 이 계정에 묶인 구매 토큰을 모두 기억해 두었다가 계정 삭제 때 전부 풉니다
  // (재구독하면 토큰이 새로 생기므로 ent 의 마지막 토큰만으로는 부족).
  const mineTok = (await kvGetJson(env, "uptok:" + uid)) || [];
  if (mineTok.indexOf(tokenHash) < 0) {
    mineTok.push(tokenHash);
    await kvPutJson(env, "uptok:" + uid, mineTok.slice(-50), 400 * 24 * 3600);
  }
  const prevEnt = await kvGetJson(env, "ent:" + uid);
  const nextEnt = {
    tier: valid ? (trial ? "trial" : "plus") : "free",
    productId,
    purchaseToken,
    tokenHash,
    until: valid ? until : 0,
    trial,
    state: sub.subscriptionState || "",
    checkedAt: Date.now(),
  };
  // 관리자가 준 Special Member·관리자 등급은 Play 검증으로 지워지지 않게 그대로 둡니다.
  if (prevEnt && prevEnt.staff) nextEnt.staff = prevEnt.staff;
  await kvPutJson(env, "ent:" + uid, nextEnt);
  return { valid, until: valid ? until : 0, trial };
}

/**
 * 지금 무료 체험 기간인지 (best-effort).
 *  1) subscriptionsv2 의 lineItems[].offerPhase.freeTrial 이 있으면 체험 중 (Google 이 주는 정식 값)
 *  2) offerPhase 칸이 아예 없는 응답이면: 제안 ID·태그에 "trial" 이 들어 있고 시작한 지 7일(+1일 여유)이
 *     안 됐을 때만 체험으로 봅니다. 체험이 끝나 유료로 넘어가도 offerId 는 그대로 남기 때문에 날짜로 자릅니다.
 * Play 콘솔에서 체험 제안 ID 에 "trial" 을 넣어 두면(예: "trial-7d") 2) 의 대비책도 맞게 돕니다.
 */
function isFreeTrialPhase(sub, item, nowMs) {
  const phase = item && item.offerPhase;
  if (phase && typeof phase === "object") return !!phase.freeTrial;
  const od = (item && item.offerDetails) || {};
  const tags = Array.isArray(od.offerTags) ? od.offerTags : [];
  const named = [String(od.offerId || "")].concat(tags.map(String)).some((s) => s.toLowerCase().indexOf("trial") >= 0);
  if (!named) return false;
  const start = Date.parse((sub && sub.startTime) || "") || 0;
  return start > 0 && nowMs - start < (TRIAL_DAYS + 1) * 86400000;
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
  await linkEmailAndPendingGrant(env, uid, user.email);
  const token = await createSession(env, uid);
  const plan = await getPlan(env, uid);
  return json(request, { token, user: publicUser(user), plan, accountId: await obfuscatedIdFor(uid) });
}

function normEmail(e) {
  return String(e || "").trim().toLowerCase();
}

async function emailHash(e) {
  return sha256hex(normEmail(e));
}

// 이메일 → uid 찾기표(관리자가 이메일로 등급을 줄 때 씀). 관리자가 로그인 전에 미리 준 등급이 있으면 지금 붙입니다.
async function linkEmailAndPendingGrant(env, uid, email) {
  if (!normEmail(email)) return;
  try {
    const h = await emailHash(email);
    await env.PUBLIC_KV.put("email:" + h, uid);
    const pending = await kvGetJson(env, "spec:" + h);
    if (pending && (pending.tier === "special" || pending.tier === "admin")) {
      const ent = (await kvGetJson(env, "ent:" + uid)) || { tier: "free", until: 0 };
      ent.staff = { tier: pending.tier, until: pending.until || 0, note: pending.note || "", at: pending.at || Date.now() };
      await kvPutJson(env, "ent:" + uid, ent);
      await env.PUBLIC_KV.delete("spec:" + h);
    }
  } catch (e) {}
}

async function handleMe(request, env) {
  const a = await requireAuth(request, env);
  const plan = await getPlan(env, a.uid);
  const usage = await readUsage(env, a.uid);
  const lims = limitsFor(env, plan.tier);
  const dayCap = (k) => (lims[k] && typeof lims[k].day === "number" ? lims[k].day : null);
  // usage·limits 의 text·tts·report 는 예전 앱이 읽던 칸(하루 수)이라 그대로 둡니다.
  // 기능별 하루·한 달 사용량과 한도는 features 에 있습니다.
  const limits = { text: dayCap("text"), tts: dayCap("tts"), report: dayCap("report") };
  usage.month = kstMonth(Date.now());
  const features = await featureUsage(env, a.uid, plan.tier);
  return json(request, { user: publicUser(a.user), plan, usage, limits, features, accountId: await obfuscatedIdFor(a.uid) });
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
  const hadSubscription = !!(ent && (ent.tier === "plus" || ent.tier === "trial") && ent.until > Date.now());
  const toks = (await kvGetJson(env, "uptok:" + uid)) || [];
  if (ent && ent.tokenHash && toks.indexOf(ent.tokenHash) < 0) toks.push(ent.tokenHash);
  for (const th of toks) {
    // 다른 계정이 주인인 토큰은 건드리지 않음
    if ((await env.PUBLIC_KV.get("ptok:" + th)) === uid) await env.PUBLIC_KV.delete("ptok:" + th);
  }
  await env.PUBLIC_KV.delete("uptok:" + uid);
  await env.PUBLIC_KV.delete("ent:" + uid);

  for (const prefix of ["use:" + uid + ":", "usem:" + uid + ":"]) {
    let cursor;
    do {
      const page = await env.PUBLIC_KV.list({ prefix, cursor });
      for (const k of page.keys) await env.PUBLIC_KV.delete(k.name);
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  await env.PUBLIC_KV.delete("uset:" + uid);
  // 이메일 찾기표와(이 계정을 가리킬 때만) 관리자가 미리 준 등급(이메일로 묶인 것)도 지웁니다.
  if (normEmail(a.user.email)) {
    const eh = await emailHash(a.user.email);
    if ((await env.PUBLIC_KV.get("email:" + eh)) === uid) await env.PUBLIC_KV.delete("email:" + eh);
    await env.PUBLIC_KV.delete("spec:" + eh);
  }

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

// 앱이 실제로 보내는 모양만 새로 만들어 넘깁니다(허용 목록). 그 밖의 칸(safetySettings·candidateCount·
// thinkingConfig·cachedContent·systemInstruction 등)은 모두 버립니다 — 이 서버가 아무 용도의
// Gemini 대리 창구로 쓰이지 않게 하려는 것입니다(2026-11-10 독립 검토 지적).
function sanitizeAiBody(kind, body, maxCharsOverride) {
  if (!body || typeof body !== "object" || !Array.isArray(body.contents)) throw new HttpError(400, "BAD_REQUEST");
  if (body.tools || body.toolConfig || body.tool_config) throw new HttpError(403, "TOOLS_NOT_ALLOWED");
  if (body.contents.length > 4) throw new HttpError(400, "BAD_REQUEST");

  let chars = 0;
  const contents = body.contents.map((c) => {
    const parts = Array.isArray(c && c.parts) ? c.parts : [];
    if (parts.length > 8) throw new HttpError(400, "BAD_REQUEST");
    return {
      role: c && c.role === "model" ? "model" : "user",
      parts: parts.map((p) => {
        if (!p || typeof p.text !== "string") throw new HttpError(400, "BAD_REQUEST");
        chars += p.text.length;
        const out = { text: p.text };
        // 3.8 음성 모델의 읽는 방식 지시(tts.ts)
        if (kind === "tts" && p.speech_metadata && typeof p.speech_metadata.style === "string") {
          out.speech_metadata = { style: p.speech_metadata.style.slice(0, 200) };
        }
        return out;
      }),
    };
  });
  const maxChars = maxCharsOverride || (kind === "tts" ? KINDS.tts.maxChars : KINDS.text.maxChars);
  if (chars > maxChars) throw new HttpError(413, "TEXT_TOO_LONG");

  const gc = body.generationConfig || {};
  const modalities = Array.isArray(gc.responseModalities) ? gc.responseModalities : [];
  const wantsAudio = modalities.indexOf("AUDIO") >= 0;
  const outGc = {};
  if (kind === "tts") {
    if (!wantsAudio) throw new HttpError(400, "KIND_MISMATCH");
    outGc.responseModalities = ["AUDIO"];
    if (gc.speechConfig && typeof gc.speechConfig === "object") outGc.speechConfig = gc.speechConfig;
  } else {
    if (wantsAudio) throw new HttpError(400, "KIND_MISMATCH");
    if (typeof gc.responseMimeType === "string") outGc.responseMimeType = gc.responseMimeType;
    if (gc.responseSchema && typeof gc.responseSchema === "object") outGc.responseSchema = gc.responseSchema;
    const want = Number(gc.maxOutputTokens) || DEFAULT_TEXT_OUTPUT_TOKENS;
    outGc.maxOutputTokens = Math.min(Math.max(want, 1), MAX_TEXT_OUTPUT_TOKENS);
    outGc.candidateCount = 1;
  }
  return { contents, generationConfig: outGc };
}

async function handleAi(request, env, model) {
  const a = await requireAuth(request, env);
  const kind = (request.headers.get("x-kata-kind") || "text").trim().toLowerCase();
  const spec = Object.prototype.hasOwnProperty.call(KINDS, kind) ? KINDS[kind] : null;
  if (!spec) throw new HttpError(403, "KIND_NOT_ALLOWED");
  const allowed = spec.mode === "tts" ? TTS_MODELS : TEXT_MODELS;
  if (allowed.indexOf(model) < 0) throw new HttpError(403, "MODEL_NOT_ALLOWED");

  // 긴 읽기 한 편을 가리키는 값(앱이 붙임). 모양이 이상하면 없는 것으로 봅니다(그 조각을 한 편으로 셈).
  const rawUnit = String(request.headers.get("x-kata-unit") || "");
  const unit = kind === "longread" && UNIT_RE.test(rawUnit) ? rawUnit : "";

  const body = sanitizeAiBody(spec.mode, await readJsonBody(request, MAX_BODY_BYTES), spec.maxChars);
  if (!env.AI_PROXY_URL || !env.PROXY_SECRET) throw new HttpError(500, "NOT_CONFIGURED");

  const plan = await getPlan(env, a.uid);
  const reservation = await reserveUse(env, a.uid, plan.tier, kind, unit);
  let res;
  try {
    res = await tfetch(env.AI_PROXY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kata-proxy": env.PROXY_SECRET,
        "x-kata-model": model,
      },
      body: JSON.stringify(body),
    }, AI_TIMEOUT_MS);
  } catch (e) {
    await refundUse(env, reservation);
    throw e;
  }
  // 실패 응답은 상태 그대로 돌려줘야 앱의 폴백(3.8 → 3.1)이 동작합니다. 잡아 둔 칸은 돌려줍니다.
  if (!res.ok) await refundUse(env, reservation);
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
  const rlim = limitsFor(env, plan.tier).report || {};
  if (typeof rlim.day === "number" && usage.report >= rlim.day) return json(request, { error: "QUOTA_REPORT" }, 429);
  const rand = randomToken().slice(0, 8);
  // KV 목록은 키 사전순이라, 시각을 거꾸로 센 값을 앞에 두어 최신 신고가 먼저 나오게 합니다.
  const rev = String(9999999999999 - Date.now()).padStart(13, "0");
  const key = "report:" + rev + "-" + rand;
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

function requireAdmin(request, env) {
  const given = request.headers.get("x-admin-key") || "";
  if (!env.ADMIN_KEY || !safeEqual(given, env.ADMIN_KEY)) throw new HttpError(403, "FORBIDDEN");
}

// 이메일 또는 uid 로 계정 찾기. 이메일 찾기표는 로그인할 때 만들어지므로, 이 기능을 넣기 전에
// 로그인한 사람은 한 번 더 로그인해야 찾힙니다(그 전에는 "미리 준 등급"으로 남았다가 로그인 때 붙음).
async function resolveAccount(env, q) {
  const uid = String(q.uid || "").trim();
  if (uid) {
    const user = await kvGetJson(env, "user:" + uid);
    return { uid: user ? uid : "", email: user ? user.email || "" : "", eh: "" };
  }
  const email = normEmail(q.email);
  if (!email || email.indexOf("@") < 1) throw new HttpError(400, "BAD_REQUEST");
  const eh = await emailHash(email);
  const found = (await env.PUBLIC_KV.get("email:" + eh)) || "";
  const user = found ? await kvGetJson(env, "user:" + found) : null;
  return { uid: user ? found : "", email, eh };
}

/**
 * POST /admin/special  (x-admin-key)
 *   {email | uid, action: "grant" | "revoke", tier?: "special" | "admin", until?: 밀리초(0·생략 = 무기한), note?}
 *   → {ok, uid, pending, plan}
 * 회원키 없이 Special Member 를 정하는 임시 통로입니다. 아직 로그인한 적 없는 이메일이면 "미리 준 등급"으로
 * 남겨 두었다가 그 사람이 처음 로그인할 때 붙입니다(pending: true).
 */
async function handleAdminSpecial(request, env) {
  requireAdmin(request, env);
  const body = await readJsonBody(request, 4 * 1024);
  const action = String(body.action || "grant");
  if (action !== "grant" && action !== "revoke") throw new HttpError(400, "BAD_REQUEST");
  const tier = body.tier === "admin" ? "admin" : "special";
  const untilN = Number(body.until || 0);
  const until = isFinite(untilN) && untilN > 0 ? Math.floor(untilN) : 0;
  const note = clip(body.note, 100);
  const acc = await resolveAccount(env, body);
  if (!acc.uid && !acc.eh) throw new HttpError(404, "USER_NOT_FOUND");

  if (action === "grant") {
    const grant = { tier, until, note, at: Date.now() };
    if (acc.uid) {
      const ent = (await kvGetJson(env, "ent:" + acc.uid)) || { tier: "free", until: 0 };
      ent.staff = grant;
      await kvPutJson(env, "ent:" + acc.uid, ent);
      return json(request, { ok: true, uid: acc.uid, pending: false, plan: await getPlan(env, acc.uid) });
    }
    await kvPutJson(env, "spec:" + acc.eh, grant);
    return json(request, { ok: true, uid: null, pending: true, plan: { tier, until } });
  }

  // 거두기: 관리자가 준 등급만 지웁니다. Play 구독은 그대로 둡니다.
  if (acc.eh) await env.PUBLIC_KV.delete("spec:" + acc.eh);
  if (acc.uid) {
    const ent = await kvGetJson(env, "ent:" + acc.uid);
    if (ent) {
      delete ent.staff;
      if (ent.tier === "special" || ent.tier === "admin") { ent.tier = "free"; ent.until = 0; }
      await kvPutJson(env, "ent:" + acc.uid, ent);
    }
    return json(request, { ok: true, uid: acc.uid, pending: false, plan: await getPlan(env, acc.uid) });
  }
  return json(request, { ok: true, uid: null, pending: false, plan: { tier: "free", until: 0 } });
}

/** GET /admin/special?email=… 또는 ?uid=…  (x-admin-key) → {uid, pending, plan} */
async function handleAdminSpecialGet(request, env, url) {
  requireAdmin(request, env);
  const acc = await resolveAccount(env, { email: url.searchParams.get("email"), uid: url.searchParams.get("uid") });
  const pending = acc.eh ? await kvGetJson(env, "spec:" + acc.eh) : null;
  return json(request, {
    uid: acc.uid || null,
    pending: pending ? { tier: pending.tier, until: pending.until || 0, note: pending.note || "" } : null,
    plan: acc.uid ? await getPlan(env, acc.uid) : null,
  });
}

async function handleAdminReports(request, env, url) {
  requireAdmin(request, env);
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
  if (method === "POST" && path === "/admin/special") return handleAdminSpecial(request, env);
  if (method === "GET" && path === "/admin/special") return handleAdminSpecialGet(request, env, url);

  const m = method === "POST" ? path.match(AI_PATH_RE) : null;
  if (m) return handleAi(request, env, m[1]);

  return json(request, { error: "NOT_FOUND" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) return json(request, Object.assign({ error: e.code }, e.extra || {}), e.status);
      return json(request, { error: "SERVER_ERROR" }, 500);
    }
  },
};

// 테스트에서 캐시를 비우기 위한 내부 함수 (운영에서는 쓰지 않음)
export function __resetCachesForTest() {
  jwksCache = null;
  playTokenCache = null;
}
