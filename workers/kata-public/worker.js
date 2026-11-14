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
//   POST /admin/special                     Special Member·관리자·심사용(review) 등급 주기/거두기 (x-admin-key)
//   GET  /admin/special?email=|uid=         그 계정의 등급 확인 (x-admin-key)
//   POST /admin/delete                      이메일로 삭제를 요청한 계정 지우기 (x-admin-key)
//   GET  /admin/budget                      오늘의 AI 호출 수와 하루 상한 설정 확인 (x-admin-key)
//
// 사용량 카운터는 Durable Object(바인딩 USAGE_DO, 클래스 UsageCounter)가 있으면 거기에, 없으면 KV 에 셉니다.
// 전체 하루 상한은 변수 AI_DAILY_BUDGET, 신고 알림은 비밀값 TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID (모두 비워 두면 꺼짐).
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
    // 예전 이름표 — 공개판 화면 가운데 이 이름을 쓰는 곳은 관리자·Special Member 화면(묵상·기도·설교)뿐이라
    // 무료에서는 잠급니다. 열어 두면 잠긴 음성 기능과 같은 요청을 이 이름표로 보낼 수 있었습니다(출시 전 점검 S-20).
    tts: { locked: true },
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

// review = 심사용 계정(Google Play 심사자에게 주는 계정). 기능·한도는 plus 와 똑같고,
// 기독교·뉴스 같은 staff(special·admin) 전용 화면은 열지 않습니다. 관리자가 /admin/special 로 줍니다(2026-11-14).
const TIERS = ["free", "trial", "plus", "review", "special", "admin"];
// 관리자가 계정에 줄 수 있는 등급 (Play 구독과 무관)
const GRANT_TIERS = ["special", "admin", "review"];

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

// 한 번의 누름(x-kata-req 같은 값)이 재시도·모델 바꿈으로 여러 번 와도 한 번으로 셉니다(출시 전 점검 C-02).
//   같은 번호 + 같은 요청 내용(본문 해시) + 처음 온 지 5분 안 + 9번까지(모델 3개 × 3회)만 같은 누름으로 봅니다.
//   번호만 돌려 써서 한도를 늘리지 못하게 내용까지 봅니다. 하루 칸에는 최근 40개만 남깁니다.
const MAX_REQ_CALLS = 9;
const REQ_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQS_KEPT = 40;
const REQ_RE = new RegExp("^[A-Za-z0-9]{8,40}$");
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
// Play 에 구독 상태를 다시 묻는 간격 (2026-11-14 출시 전 점검 B-01·B-02·B-04)
const ENT_LIVE_RECHECK_MS = 24 * 60 * 60 * 1000; // 이용 중: 만료 전이라도 하루에 한 번 (환불·취소를 알아채려고)
const ENT_RECHECK_MS = 60 * 60 * 1000; // 만료 뒤·무료로 내려간 뒤·Play 가 잠깐 안 될 때: 한 시간에 한 번까지
const ENT_ACK_RETRY_MS = 10 * 60 * 1000; // 확인(acknowledge)이 안 된 구매: 10분에 한 번까지 다시 시도
const ENT_FREE_RECHECK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 무료로 내려간 뒤에도 30일 동안은 다시 묻는다
const ENT_OUTAGE_GRACE_MS = 24 * 60 * 60 * 1000; // 만료 시각이 지났는데 Play 가 안 될 때: 하루까지는 지금 등급 유지
const ACK_FAIL_TTL_SEC = 7 * 24 * 3600;
const SPEC_TTL_SEC = 400 * 24 * 3600; // 로그인 전에 미리 준 등급의 수명
const REPORT_TTL_SEC = 180 * 24 * 3600; // 신고 보관 기간
const MAX_REPORTS_TRACKED = 5000; // 계정 삭제 때 연결을 끊으려고 기억하는 내 신고 키 수 (하루 상한 50 × 100일분)
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
    "access-control-allow-headers": "authorization, content-type, x-kata-kind, x-kata-unit, x-kata-req, x-admin-key",
    "access-control-max-age": "86400",
    // 앱이 "서버가 일부러 멈춘 것"(AI_PAUSED·하루 상한)과 AI 쪽 일시 오류(503)를 구분하려고 읽는 머리글
    "access-control-expose-headers": "x-kata-paused",
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
    review: apply("review", plus), // 심사용 계정은 plus 와 같은 한도 (LIMITS_JSON 의 plus 변경도 따라감)
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
  // content-length 가 없거나 거짓이어도 상한까지만 읽고 끊습니다(큰 본문을 통째로 메모리에 올리지 않게).
  let text = "";
  if (request.body && typeof request.body.getReader === "function") {
    const reader = request.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch (e) {}
        throw new HttpError(413, "BODY_TOO_LARGE");
      }
      chunks.push(step.value);
    }
    const all = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { all.set(c, at); at += c.byteLength; }
    text = new TextDecoder().decode(all);
  } else {
    text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, "BODY_TOO_LARGE");
  }
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
  // 이메일은 관리자가 미리 준 등급(spec:)을 붙이는 열쇠라, 구글이 "확인됨"이라고 밝힌 것만 받습니다.
  // (예전에는 false 일 때만 거절해, 이 칸이 아예 없는 토큰의 이메일도 믿었습니다 — 2026-11-14 보안 재검토)
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (payload.email && !verified) throw new HttpError(401, "EMAIL_NOT_VERIFIED");
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
//   ent:<uid> = { tier, productId, purchaseToken, tokenHash, until, trial, state, checkedAt, staff,
//                 triedAt?, freeSince?, ackPending?, ackFailedAt? }
//     checkedAt   Play 가 마지막으로 답해 준 시각
//     triedAt     Play 에 물었지만 답을 못 받은(일시 오류) 마지막 시각 — 답을 받으면 지워짐
//     freeSince   이 구매가 무료로 내려간 시각 — 그 뒤 30일 동안은 한 시간에 한 번까지 Play 에 다시 묻습니다
//     ackPending  Play 는 유효하다고 했는데 확인(acknowledge)이 아직 안 된 구매 — 다음 /me·/billing/verify 때 다시 시도
//   staff = { tier: "special"|"admin", until(0=무기한), note, at } — 관리자가 /admin/special 로 준 등급.
//   Play 검증이 ent 를 다시 써도 staff 는 남습니다. ent.tier 를 KV 에서 직접 special·admin 으로 적어도 인정합니다.
// 앱에 주는 plan: { tier, until, trial?, productId? }  (trial 이면 trial: true)

function staffPlan(ent, now) {
  const s = ent && ent.staff;
  if (s && GRANT_TIERS.indexOf(s.tier) >= 0 && (!s.until || s.until > now)) {
    return { tier: s.tier, until: s.until || 0 };
  }
  if (ent && (ent.tier === "special" || ent.tier === "admin") && (!ent.until || ent.until > now)) {
    return { tier: ent.tier, until: ent.until || 0 };
  }
  return null;
}

// autoRenew: 자동 갱신이 켜져 있는가. Play 에서 해지한(자동 갱신만 끈) 구독은 만료 시각까지 쓰지만 다음 결제는 없습니다 —
// 앱이 "다음 결제 ○월 ○일" 대신 "○월 ○일까지 이용"으로 보여 주도록 싣습니다(출시 전 점검 B-09).
function paidPlan(ent, until) {
  const autoRenew = ent.state !== "SUBSCRIPTION_STATE_CANCELED";
  if (ent.tier === "trial" || ent.trial === true) {
    return { tier: "trial", until, trial: true, productId: ent.productId, autoRenew };
  }
  return { tier: "plus", until, productId: ent.productId, autoRenew };
}

function isPaidTier(ent) {
  return !!ent && (ent.tier === "plus" || ent.tier === "trial");
}

/**
 * 지금 Play 에 이 계정의 구독 상태를 다시 물어야 하는가.
 *   이용 중(만료 전)      마지막 답에서 하루가 지났으면 — 환불·취소(권한 회수)는 만료 전에 일어납니다(B-01).
 *                        확인(acknowledge)이 안 된 구매는 10분에 한 번까지(B-04).
 *   만료 시각이 지남      만료 뒤에 아직 묻지 않았으면 바로, 그 뒤로는 한 시간에 한 번까지.
 *   무료로 내려감         구매 토큰이 있으면 내려간 뒤 30일 동안 한 시간에 한 번까지 — 갱신이 늦게 반영됐거나
 *                        결제 수단을 고쳐 구독이 살아난 사용자가 무료로 굳지 않게(B-02).
 */
function shouldAskPlay(ent, now) {
  if (!ent || !ent.purchaseToken || !ent.productId) return false;
  const checked = ent.checkedAt || 0;
  const last = Math.max(checked, ent.triedAt || 0);
  if (isPaidTier(ent)) {
    if (ent.until > now) {
      if (ent.ackPending) return now - last > ENT_ACK_RETRY_MS;
      return now - checked > ENT_LIVE_RECHECK_MS && now - last > ENT_RECHECK_MS;
    }
    return last < ent.until || now - last > ENT_RECHECK_MS;
  }
  if (ent.tier === "free") {
    const since = ent.freeSince || checked;
    return now - since < ENT_FREE_RECHECK_WINDOW_MS && now - last > ENT_RECHECK_MS;
  }
  return false;
}

/**
 * Play 에 다시 묻고 ent 를 고쳐 돌려줍니다.
 *   Play 가 답함            verifyWithPlay 가 ent 를 새로 씁니다(환불·취소·만료면 무료로, 갱신됐으면 새 만료 시각으로).
 *   Play 가 "이 구매 없음"  (4xx — 없는 토큰·다른 상품·다른 계정) 무료로 적습니다.
 *   일시 오류(5xx·통신)     등급은 그대로 두고 물어본 시각만 남깁니다 → 한 시간 뒤 다시.
 */
async function recheckWithPlay(env, uid, ent, now) {
  try {
    const r = await verifyWithPlay(env, uid, ent.productId, ent.purchaseToken);
    return r.ent || ent;
  } catch (e) {
    const gone = e instanceof HttpError && e.status >= 400 && e.status < 500;
    if (gone) {
      ent.tier = "free";
      ent.until = 0;
      ent.trial = false;
      ent.state = e.code;
      ent.checkedAt = now;
      ent.freeSince = ent.freeSince || now;
      delete ent.triedAt;
      delete ent.ackPending;
    } else {
      ent.triedAt = now;
    }
    try { await kvPutJson(env, "ent:" + uid, ent); } catch (e2) {}
    return ent;
  }
}

async function getPlan(env, uid) {
  let ent = await kvGetJson(env, "ent:" + uid);
  const now = Date.now();
  if (env.PLAY_SERVICE_ACCOUNT && shouldAskPlay(ent, now)) ent = await recheckWithPlay(env, uid, ent, now);
  const staff = staffPlan(ent, now);
  if (staff) return staff;
  if (!isPaidTier(ent)) return { tier: "free", until: 0 };
  if (ent.until > now) return paidPlan(ent, ent.until);
  // 만료 시각은 지났는데 Play 가 답을 못 준 경우(일시 오류): 하루까지는 지금 등급을 유지하고 한 시간 뒤 다시 묻습니다.
  // Play 가 한 번이라도 답하면 ent 가 새로 쓰이므로(무료 또는 새 만료 시각) 이 길로 오지 않습니다.
  const unanswered = (ent.triedAt || 0) > (ent.checkedAt || 0) && (ent.triedAt || 0) >= ent.until;
  if (unanswered && now - ent.until < ENT_OUTAGE_GRACE_MS) return paidPlan(ent, ent.until + ENT_OUTAGE_GRACE_MS);
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
  const u = (await readCounters(env, uid, false)).d;
  return { day: kstDay(now), text: u.text || 0, tts: u.tts || 0, report: u.report || 0 };
}

// 사용량 기록이 실패해도 사용자 요청은 실패시키지 않습니다(이미 Gemini 비용이 든 뒤일 수 있음).
async function safePut(env, key, value, ttl) {
  try { await kvPutJson(env, key, value, ttl); } catch (e) {}
}

function quotaError(kind, period, limit, tier) {
  return new HttpError(429, "QUOTA_" + kind.toUpperCase().split("-").join("_"), { kind, period, limit, plan: tier });
}

// ── 카운터 저장소: KV(기본) 또는 Durable Object ──────────────
//
// 세는 규칙(reserveCore·refundCore·budget*Core)은 하나이고, 어디에 적느냐만 다릅니다.
//   KV            바인딩 USAGE_DO 가 없을 때. 읽고-고쳐-쓰기가 한 덩어리가 아니라서, 같은 순간에 쏜 요청 여러 개가
//                 모두 "아직 한도 전"으로 읽고 통과할 수 있습니다(출시 전 점검 3-6 S8: 20개 동시에 모두 통과).
//   Durable Object 계정마다 객체 하나(u:<uid>)가 요청을 한 줄로 세워 처리하므로 동시 요청에도 정확합니다(S-22).
//                 전체 하루 상한은 객체 "budget" 하나가 셉니다(S-21).
// Durable Object 를 부르다 실패하면(설정 오류·일시 장애) 그 요청은 KV 방식으로 처리합니다 — 서비스가 멈추지 않게.

// strict: 쓰기가 실패하면 던집니다. 칸을 "잡을 때"는 strict 로 — 적지 못했는데 AI 를 부르면 세지 않은 호출이 나가기 때문입니다
// (KV 무료 요금제는 하루 쓰기 횟수에 한도가 있고, 그 한도에 닿으면 쓰기가 실패합니다. 예전에는 이 실패를 삼켜
//  그날 남은 시간 동안 한도가 세어지지 않았습니다 — 2026-11-14 보안 재검토). 돌려줄 때는 실패해도 넘어갑니다.
function kvStore(env, strict) {
  return {
    get: (key) => kvGetJson(env, key),
    put: (key, value, ttl) => (strict ? kvPutJson(env, key, value, ttl) : safePut(env, key, value, ttl)),
  };
}

// 카운터를 적지 못했을 때의 응답 — 앱에는 "지금은 사용할 수 없습니다"로 보입니다(AI_PAUSED 와 같은 길).
function storeFailed() {
  try { console.error("[kata-public] USAGE_STORE_FAILED — 카운터를 적지 못해 AI 호출을 막음 (KV 쓰기 한도?)"); } catch (e) {}
  return new HttpError(503, "SERVICE_PAUSED", { reason: "store" });
}

function usageStub(env, name) {
  if (!env.USAGE_DO) return null;
  try { return env.USAGE_DO.get(env.USAGE_DO.idFromName(name)); } catch (e) { return null; }
}

// 객체에 일을 맡깁니다. 한도 초과 같은 "정상적인 거절"은 HttpError 로 다시 던지고, 그 밖의 실패는 일반 오류로 던집니다.
async function doCall(stub, payload) {
  const res = await stub.fetch("https://usage.internal/op", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data && data.err) throw new HttpError(data.err.status, data.err.code, data.err.extra);
  if (!res.ok || !data) throw new Error("USAGE_DO_FAILED");
  return data.out;
}

let doFailLoggedAt = 0;
function logDoFailure(e) {
  if (Date.now() - doFailLoggedAt < 60000) return; // 장애 중에 로그가 넘치지 않게 1분에 한 줄
  doFailLoggedAt = Date.now();
  try { console.error("[kata-public] USAGE_DO_FAILED — KV 방식으로 처리 (" + String((e && e.message) || e).slice(0, 80) + ")"); } catch (e2) {}
}

/** 하루·한 달·체험 합계 칸을 읽습니다. */
async function readCounters(env, uid, wantTotal) {
  const now = Date.now();
  const keys = { dKey: dayKey(uid, now), mKey: monthKey(uid, now), tKey: wantTotal ? totalKey(uid) : null };
  const stub = usageStub(env, "u:" + uid);
  if (stub) {
    try { return await doCall(stub, { op: "read", keys }); } catch (e) { logDoFailure(e); }
  }
  return readCore(kvStore(env), keys);
}

async function readCore(store, keys) {
  return {
    d: (await store.get(keys.dKey)) || {},
    m: (await store.get(keys.mKey)) || {},
    t: keys.tKey ? (await store.get(keys.tKey)) || {} : {},
  };
}

/**
 * AI 를 부르기 전에 한 칸을 먼저 잡습니다. 실패하면 refundUse 로 돌려줍니다.
 * 잠긴 기능이면 403 PLUS_REQUIRED, 한도를 넘었으면 429 QUOTA_<KIND> {kind, period, limit}.
 */
async function reserveUse(env, uid, tier, kind, unit, req) {
  const lim = limitsFor(env, tier)[kind] || {};
  const p = { uid, tier, kind, unit, req, lim, now: Date.now() };
  const stub = usageStub(env, "u:" + uid);
  if (stub) {
    try {
      const r = await doCall(stub, { op: "reserve", p });
      r.via = "do";
      return r;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      logDoFailure(e);
    }
  }
  try {
    return await reserveCore(kvStore(env, true), p);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw storeFailed();
  }
}

/** 부른 결과가 실패면 잡아 둔 칸을 돌려줍니다(잡은 곳과 같은 저장소에). */
async function refundUse(env, r) {
  if (!r) return;
  if (r.via === "do") {
    const stub = usageStub(env, "u:" + r.uid);
    if (stub) {
      try { await doCall(stub, { op: "refund", r }); } catch (e) { logDoFailure(e); }
    }
    return;
  }
  await refundCore(kvStore(env), r);
}

async function reserveCore(store, p) {
  const uid = p.uid, tier = p.tier, kind = p.kind, unit = p.unit, req = p.req, now = p.now;
  const lim = p.lim || {};
  if (lim.locked) throw new HttpError(403, "PLUS_REQUIRED", { kind, plan: tier });
  const dKey = dayKey(uid, now);
  const d = (await store.get(dKey)) || {};

  // 같은 누름의 재시도 — 이미 셌으므로 한도를 다시 보지 않습니다.
  if (req && !unit) {
    const reqs = Array.isArray(d.reqs) ? d.reqs : [];
    const hit = reqs.find((r) => r && r.id === req.id && r.kind === kind && r.hash === req.hash);
    if (hit && now - (hit.at || 0) < REQ_WINDOW_MS && (hit.n || 0) < MAX_REQ_CALLS) {
      hit.n = (hit.n || 0) + 1;
      d.reqs = reqs;
      await store.put(dKey, d, DAY_TTL_SEC);
      return { uid, kind, unit: "", counted: false, dKey, req };
    }
  }

  // 같은 편의 다음 조각 — 이미 셌으므로 한도를 다시 보지 않고 조각 수만 늘립니다.
  if (unit) {
    const units = d.units && typeof d.units === "object" ? d.units : {};
    const mine = units[kind] && typeof units[kind] === "object" ? units[kind] : {};
    if (mine[unit]) {
      if (mine[unit] >= MAX_UNIT_CALLS) throw quotaError(kind, "day", lim.day == null ? null : lim.day, tier);
      mine[unit] += 1;
      units[kind] = mine;
      d.units = units;
      await store.put(dKey, d, DAY_TTL_SEC);
      return { uid, kind, unit, counted: false, dKey };
    }
  }

  const mKey = monthKey(uid, now);
  const m = (await store.get(mKey)) || {};
  const useTotal = tier === "trial" && typeof lim.total === "number";
  const tKey = totalKey(uid);
  const t = useTotal ? (await store.get(tKey)) || {} : null;

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
  if (req && !unit) {
    const reqs = (Array.isArray(d.reqs) ? d.reqs : []).filter((r) => !(r && r.id === req.id && r.kind === kind));
    reqs.push({ id: req.id, kind, hash: req.hash, at: now, n: 1 });
    d.reqs = reqs.slice(-MAX_REQS_KEPT);
  }
  await store.put(dKey, d, DAY_TTL_SEC);
  await store.put(mKey, m, MONTH_TTL_SEC);
  if (t) {
    t[kind] = (t[kind] || 0) + 1;
    if (!t.at) t.at = now; // 처음 적은 때 — Durable Object 에서 400일 뒤 지우는 기준
    await store.put(tKey, t, TRIAL_TOTAL_TTL_SEC);
  }
  return { uid, kind, unit, counted: true, dKey, mKey, tKey: t ? tKey : null, req: req && !unit ? req : null };
}

async function refundCore(store, r) {
  if (!r) return;
  try {
    const d = (await store.get(r.dKey)) || {};
    const units = d.units && typeof d.units === "object" ? d.units : null;
    const mine = units && units[r.kind] && typeof units[r.kind] === "object" ? units[r.kind] : null;
    if (!r.counted) {
      if (mine && mine[r.unit] > 1) mine[r.unit] -= 1;
      await store.put(r.dKey, d, DAY_TTL_SEC);
      return;
    }
    d[r.kind] = Math.max(0, (d[r.kind] || 0) - 1);
    // 이 누름은 아직 성공한 적이 없으므로 기록을 지웁니다 — 다음 재시도가 새로 한 칸을 잡습니다.
    if (r.req && Array.isArray(d.reqs)) d.reqs = d.reqs.filter((x) => !(x && x.id === r.req.id && x.kind === r.kind));
    if (r.unit && mine) delete mine[r.unit];
    await store.put(r.dKey, d, DAY_TTL_SEC);
    const m = (await store.get(r.mKey)) || {};
    m[r.kind] = Math.max(0, (m[r.kind] || 0) - 1);
    await store.put(r.mKey, m, MONTH_TTL_SEC);
    if (r.tKey) {
      const t = (await store.get(r.tKey)) || {};
      t[r.kind] = Math.max(0, (t[r.kind] || 0) - 1);
      await store.put(r.tKey, t, TRIAL_TOTAL_TTL_SEC);
    }
  } catch (e) {}
}

/** /me 에 싣는 기능별 사용량·한도·남은 수 (null = 제한 없음). */
async function featureUsage(env, uid, tier) {
  const c = await readCounters(env, uid, tier === "trial");
  const d = c.d, m = c.m, t = c.t;
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

// ── 전체 하루 상한 (S-21) ────────────────────────────────────
//
// 변수 AI_DAILY_BUDGET — 하루(한국 날짜)에 이 서버가 AI 쪽으로 보내는 호출 수의 상한. 계정별 한도와 별개로,
// 가입이 몰리거나 누가 계정을 여러 개 만들어 써도 하루 비용이 정해 둔 선을 넘지 않게 하는 마지막 안전장치입니다.
//   ""                         상한 없음(예전과 같음)
//   "5000"                     글·소리 합쳐 하루 5,000번
//   {"all":5000,"tts":2000}    합계 5,000번, 그중 소리는 2,000번까지 ("text" 도 따로 둘 수 있음)
// 세는 단위는 "AI 쪽으로 실제로 나간 호출"입니다(재시도·긴 읽기의 조각도 한 번씩). 실패한 호출은 돌려줍니다.
// 상한에 닿으면 무료·체험·Plus·심사용의 AI 호출을 503 SERVICE_PAUSED {reason:"budget"} 로 막습니다(AI_PAUSED 와 같은 응답).
// Special Member·관리자는 막지 않습니다(운영자가 상황을 확인할 수 있게). 세기는 합니다.
// 값을 잘못 적으면(숫자도 JSON 도 아님) 상한 0 으로 봅니다 — 잘못 적은 줄 모르고 상한 없이 도는 것보다 바로 드러나는 편이 안전합니다.
// 넣은 뒤 GET /admin/budget 으로 서버가 읽은 값을 확인하세요.

const BUDGET_MODES = ["all", "text", "tts"];

function parseBudget(env) {
  const raw = String(env.AI_DAILY_BUDGET == null ? "" : env.AI_DAILY_BUDGET).trim();
  if (!raw) return null;
  let o = null;
  if (raw.charAt(0) === "{") {
    try { o = JSON.parse(raw); } catch (e) { o = null; }
  } else if (isFinite(Number(raw))) {
    o = { all: Number(raw) };
  }
  const caps = {};
  if (o && typeof o === "object") {
    BUDGET_MODES.forEach((k) => {
      if (o[k] === undefined || o[k] === null || o[k] === "") return;
      const n = Number(o[k]);
      if (isFinite(n) && n >= 0) caps[k] = Math.floor(n);
    });
  }
  if (Object.keys(caps).length === 0) return { all: 0, invalid: true };
  return caps;
}

function budgetKey(nowMs) { return "budget:" + kstDay(nowMs); }

// p = { key, mode("text"|"tts"), caps(null = 상한 없음), enforce } → { ok, cap?, first?, key, mode }
async function budgetTakeCore(store, p) {
  const b = (await store.get(p.key)) || {};
  const caps = p.caps || {};
  let hit = "";
  if (typeof caps.all === "number" && (b.all || 0) >= caps.all) hit = "all";
  else if (typeof caps[p.mode] === "number" && (b[p.mode] || 0) >= caps[p.mode]) hit = p.mode;
  if (hit && p.enforce) {
    // 오늘 처음 상한에 닿은 순간만 first — 운영자 알림을 하루 한 번만 보내려고 표시해 둡니다.
    const first = !b.hitAt;
    if (first) {
      b.hitAt = p.now;
      b.hitCap = hit;
      await store.put(p.key, b, DAY_TTL_SEC);
    }
    return { ok: false, cap: hit, first };
  }
  b.all = (b.all || 0) + 1;
  b[p.mode] = (b[p.mode] || 0) + 1;
  await store.put(p.key, b, DAY_TTL_SEC);
  return { ok: true, key: p.key, mode: p.mode };
}

async function budgetRefundCore(store, t) {
  const b = (await store.get(t.key)) || {};
  b.all = Math.max(0, (b.all || 0) - 1);
  b[t.mode] = Math.max(0, (b[t.mode] || 0) - 1);
  await store.put(t.key, b, DAY_TTL_SEC);
  return true;
}

/**
 * AI 를 부르기 직전에 전체 하루 칸을 하나 잡습니다. 상한에 닿았으면 503.
 * Durable Object 가 있으면 늘 세고(오늘 몇 번 나갔는지 볼 수 있게), KV 뿐이면 상한을 정해 둔 때만 셉니다
 * (KV 는 쓰기 횟수에 하루 한도가 있어 쓸데없이 늘리지 않으려고). KV 로 셀 때는 동시 요청에서 조금 넘칠 수 있습니다.
 */
async function takeBudget(env, tier, mode, ctx) {
  const caps = parseBudget(env);
  const stub = usageStub(env, "budget");
  if (!caps && !stub) return null;
  const now = Date.now();
  const p = { key: budgetKey(now), mode, caps, enforce: tier !== "special" && tier !== "admin", now };
  let out = null;
  let via = "kv";
  if (stub) {
    try { out = await doCall(stub, { op: "budget-take", p }); via = "do"; } catch (e) { logDoFailure(e); }
  }
  if (!out) {
    if (!caps) return null;
    try { out = await budgetTakeCore(kvStore(env, true), p); } catch (e) { throw storeFailed(); }
  }
  if (!out.ok) {
    if (out.first) {
      try { console.error("[kata-public] AI_BUDGET_REACHED cap=" + out.cap + " day=" + kstDay(now)); } catch (e) {}
      await defer(ctx, tgSend(env, "[Kata kata] 오늘 AI 하루 상한에 닿았습니다 (" + (out.cap === "all" ? "전체" : out.cap === "tts" ? "소리" : "글") +
        " " + String(caps && caps[out.cap]) + "번). 내일(한국 시각 0시)까지 AI 기능이 멈춥니다. 풀려면 AI_DAILY_BUDGET 값을 올리세요."));
    }
    throw new HttpError(503, "SERVICE_PAUSED", { reason: "budget" });
  }
  out.via = via;
  return out;
}

async function refundBudget(env, t) {
  if (!t) return;
  try {
    if (t.via === "do") {
      const stub = usageStub(env, "budget");
      if (stub) await doCall(stub, { op: "budget-refund", t });
      return;
    }
    await budgetRefundCore(kvStore(env), t);
  } catch (e) {}
}

async function readBudget(env) {
  const key = budgetKey(Date.now());
  const stub = usageStub(env, "budget");
  if (stub) {
    try { return (await doCall(stub, { op: "budget-read", key })) || {}; } catch (e) { logDoFailure(e); }
  }
  return (await kvGetJson(env, key)) || {};
}

// ── 텔레그램 알림 (P-19) ─────────────────────────────────────
//
// 비밀값 TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID 가 둘 다 있을 때만 보냅니다. 없으면 아무것도 하지 않습니다.
// 알림은 덤입니다 — 보내다 실패해도(텔레그램 장애·잘못된 토큰) 신고 저장과 응답에는 영향을 주지 않습니다.
// 묶음: 알림을 한 번 보내면 그 뒤 한 시간 동안 들어온 신고는 세기만 하고, 한 시간이 지난 뒤 한꺼번에 알립니다
//       (다음 신고가 들어올 때, 또는 Cron 이 켜져 있으면 매시간 scheduled 가). 하루에 많아야 스물몇 통입니다.
// 알림에는 기능 이름·시각·글 앞부분 몇 글자만 담습니다. 계정·이메일은 담지 않고, 이메일·긴 숫자 모양은 가립니다.

const TG_TIMEOUT_MS = 8000;
const TG_WINDOW_MS = 60 * 60 * 1000;
const TG_STATE_KEY = "tg:reports";
const TG_STATE_TTL_SEC = 7 * 24 * 3600;
const TG_PREVIEW_CHARS = 30;
const TG_EMAIL_RE = new RegExp("[^\\s@]+@[^\\s@]+", "g");
const TG_DIGITS_RE = new RegExp("[0-9][0-9\\- ]{5,}[0-9]", "g");
const TG_SPACES_RE = new RegExp("\\s+", "g");

function tgConfigured(env) {
  return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

async function tgSend(env, text) {
  if (!tgConfigured(env)) return false;
  try {
    const res = await tfetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT_ID), text: String(text).slice(0, 1000), disable_web_page_preview: true }),
    }, TG_TIMEOUT_MS);
    return !!res.ok;
  } catch (e) {
    return false;
  }
}

// 응답을 늦추지 않게 뒤에서 마저 하도록 맡깁니다(ctx.waitUntil). ctx 가 없으면(테스트) 끝날 때까지 기다립니다.
async function defer(ctx, promise) {
  const safe = Promise.resolve(promise).catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(safe);
  else await safe;
}

function tgPreview(rep) {
  const src = String(rep.reason || rep.output || rep.input || "");
  const flat = src.replace(TG_EMAIL_RE, "(메일)").replace(TG_DIGITS_RE, "(숫자)").replace(TG_SPACES_RE, " ").trim();
  return flat.length > TG_PREVIEW_CHARS ? flat.slice(0, TG_PREVIEW_CHARS) + "…" : flat;
}

function kstStamp(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ") + " (한국 시각)";
}

/** 새 신고 하나를 알립니다(또는 묶음에 더합니다). 절대 던지지 않습니다. */
async function notifyReport(env, rep) {
  if (!tgConfigured(env)) return;
  try {
    const now = Date.now();
    const st = (await kvGetJson(env, TG_STATE_KEY)) || {};
    const pending = st.pending || 0;
    if (st.sentAt && now - st.sentAt < TG_WINDOW_MS) {
      await kvPutJson(env, TG_STATE_KEY, { sentAt: st.sentAt, pending: pending + 1 }, TG_STATE_TTL_SEC);
      return;
    }
    const lines = [
      "[Kata kata] 새 신고" + (pending > 0 ? " " + (pending + 1) + "건 (그사이 " + pending + "건 포함)" : " 1건"),
      "기능: " + (rep.feature || "-"),
      "시각: " + kstStamp(rep.at || now),
    ];
    const pv = tgPreview(rep);
    if (pv) lines.push("앞부분: " + pv);
    lines.push("전체 보기: GET /admin/reports");
    const ok = await tgSend(env, lines.join("\n"));
    // 못 보냈으면 묶음에 남겨 두고, 다음 신고 때 다시 시도합니다.
    await kvPutJson(env, TG_STATE_KEY, ok ? { sentAt: now, pending: 0 } : { sentAt: st.sentAt || 0, pending: pending + 1 }, TG_STATE_TTL_SEC);
  } catch (e) {}
}

/** 한 시간이 지난 묶음이 남아 있으면 한꺼번에 알립니다(Cron 이 부름). */
async function flushReportNotice(env) {
  if (!tgConfigured(env)) return false;
  try {
    const now = Date.now();
    const st = (await kvGetJson(env, TG_STATE_KEY)) || {};
    if (!st.pending || (st.sentAt && now - st.sentAt < TG_WINDOW_MS)) return false;
    const ok = await tgSend(env, "[Kata kata] 지난 알림 뒤로 신고 " + st.pending + "건이 더 들어왔습니다.\n전체 보기: GET /admin/reports");
    if (ok) await kvPutJson(env, TG_STATE_KEY, { sentAt: now, pending: 0 }, TG_STATE_TTL_SEC);
    return ok;
  } catch (e) {
    return false;
  }
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

  const now = Date.now();
  const valid = VALID_SUB_STATES.indexOf(sub.subscriptionState) >= 0 && until > now;
  const trial = valid && isFreeTrialPhase(sub, item, now);

  await env.PUBLIC_KV.put("ptok:" + tokenHash, uid, { expirationTtl: 400 * 24 * 3600 });
  // 이 계정에 묶인 구매 토큰을 모두 기억해 두었다가 계정 삭제 때 전부 풉니다
  // (재구독하면 토큰이 새로 생기므로 ent 의 마지막 토큰만으로는 부족).
  const mineTok = (await kvGetJson(env, "uptok:" + uid)) || [];
  if (mineTok.indexOf(tokenHash) < 0) {
    mineTok.push(tokenHash);
    await kvPutJson(env, "uptok:" + uid, mineTok.slice(-50), 400 * 24 * 3600);
  }
  const prevEnt = await kvGetJson(env, "ent:" + uid);
  const sameToken = !!prevEnt && prevEnt.tokenHash === tokenHash;

  // 끝난 구매(만료·환불된 옛 토큰)가 지금 이용 중인 다른 구매를 덮어써 무료로 만들지 않게 합니다.
  if (!valid && prevEnt && !sameToken && isPaidTier(prevEnt) && prevEnt.until > now) {
    return { valid: false, until: 0, trial: false, ackPending: false, ent: prevEnt };
  }

  const nextEnt = {
    tier: valid ? (trial ? "trial" : "plus") : "free",
    productId,
    purchaseToken,
    tokenHash,
    until: valid ? until : 0,
    trial,
    state: sub.subscriptionState || "",
    checkedAt: now,
  };
  // 무료로 내려간 시각 — 같은 구매로 이미 내려가 있었으면 처음 시각을 지킵니다(30일 재확인 기간의 기준).
  if (!valid) nextEnt.freeSince = (sameToken && prevEnt.tier === "free" && prevEnt.freeSince) || now;
  // 계정 표식이 없는 구매(앱 밖에서 만들어진 것 — 프로모션 코드, Play 구독 화면의 "다시 구독")는 먼저 검증을 요청한
  // 계정에 붙습니다. 나중에 운영자가 알아볼 수 있게 표시해 둡니다(B-13).
  if (!got) nextEnt.unbound = true;
  // 이 계정의 무료 체험 기록(B-08). 체험 자격은 Play 계정 기준이라, 같은 앱 계정으로 Play 계정만 바꿔 체험을
  // 되풀이할 수 있습니다. 첫 체험과 그 뒤 체험 횟수를 남겨 운영자가 볼 수 있게 합니다(체험 합계 한도 uset: 은 계정에 묶여 이미 공유됨).
  if (trial) {
    try {
      const rec = (await kvGetJson(env, "trial:" + uid)) || { first: now, firstToken: tokenHash, tokens: [] };
      if (rec.tokens.indexOf(tokenHash) < 0) {
        rec.tokens.push(tokenHash);
        rec.tokens = rec.tokens.slice(-20);
        rec.last = now;
        await kvPutJson(env, "trial:" + uid, rec, TRIAL_TOTAL_TTL_SEC);
      }
      if (rec.tokens.length > 1) nextEnt.trialRepeat = rec.tokens.length;
    } catch (e) {}
  }
  // 관리자가 준 Special Member·관리자 등급은 Play 검증으로 지워지지 않게 그대로 둡니다.
  if (prevEnt && prevEnt.staff) nextEnt.staff = prevEnt.staff;

  // Play 가 유효하다고 한 구매는 권한(ent)을 먼저 저장합니다. 확인(acknowledge)이 실패해도 Plus 는 열리고,
  // 확인은 다음 /me·/billing/verify 때 다시 시도합니다 — 사흘 안에 확인하지 못하면 Google 이 환불합니다(B-04).
  const needAck = valid && sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING";
  if (needAck) nextEnt.ackPending = true;
  await kvPutJson(env, "ent:" + uid, nextEnt);

  if (needAck) {
    let ackStatus = 0;
    try {
      const ack = await tfetch(
        base + "/purchases/subscriptions/" + encodeURIComponent(productId) +
          "/tokens/" + encodeURIComponent(purchaseToken) + ":acknowledge",
        { method: "POST", headers: { authorization: "Bearer " + access, "content-type": "application/json" }, body: "{}" },
        API_TIMEOUT_MS,
      );
      ackStatus = ack.status;
    } catch (e) {
      ackStatus = 0; // 통신 오류·시간 초과
    }
    if (ackStatus >= 200 && ackStatus < 300) {
      delete nextEnt.ackPending;
      await kvPutJson(env, "ent:" + uid, nextEnt);
      try { await env.PUBLIC_KV.delete("ackfail:" + tokenHash); } catch (e) {}
    } else {
      await logAckFailure(env, uid, tokenHash, ackStatus);
    }
  } else if (sameToken && prevEnt.ackPending) {
    // 앞서 실패했던 확인이 그사이 끝났거나(Play 가 확인됨으로 답함) 구매가 끝난 경우 — 실패 기록을 치웁니다.
    try { await env.PUBLIC_KV.delete("ackfail:" + tokenHash); } catch (e) {}
  }
  return { valid, until: valid ? until : 0, trial, ackPending: !!nextEnt.ackPending, ent: nextEnt };
}

/**
 * 확인(acknowledge) 실패 기록 — 관리자가 알 수 있게 Worker 로그와 KV(ackfail:<토큰 해시>, 7일)에 남깁니다.
 * 403 이 이어지면 Play Console 에서 서비스 계정의 "주문 및 구독 관리" 권한이 빠진 것입니다(05 체크리스트 6절).
 * 구매 토큰 원문·이메일은 적지 않습니다.
 */
async function logAckFailure(env, uid, tokenHash, status) {
  try {
    console.error("[kata-public] ACK_FAILED status=" + status + " uid=" + uid + " token=" + tokenHash.slice(0, 12));
  } catch (e) {}
  try {
    const prev = (await kvGetJson(env, "ackfail:" + tokenHash)) || {};
    await kvPutJson(env, "ackfail:" + tokenHash, {
      uid,
      status,
      first: prev.first || Date.now(),
      last: Date.now(),
      count: (prev.count || 0) + 1,
    }, ACK_FAIL_TTL_SEC);
  } catch (e) {}
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
    if (pending && GRANT_TIERS.indexOf(pending.tier) >= 0) {
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
  const r = await deleteAccountData(env, a.uid, a.user, a.sessHash);
  return json(request, { deleted: true, hadSubscription: r.hadSubscription });
}

/**
 * POST /admin/delete  (x-admin-key)  {email | uid} → {deleted, uid, hadSubscription}
 * 앱을 지웠거나 열 수 없는 사용자가 이메일로 삭제를 요청했을 때 운영자가 쓰는 길입니다
 * (계정 삭제 안내 페이지의 "7일 안에 삭제" 약속 — 출시 전 점검 P-15). 앱 안 삭제와 똑같이 지웁니다.
 */
async function handleAdminDelete(request, env) {
  requireAdmin(request, env);
  const body = await readJsonBody(request, 4 * 1024);
  const acc = await resolveAccount(env, body);
  if (!acc.uid) {
    // 가입한 적 없는 이메일이라도, 미리 준 등급이 남아 있으면 그것은 지웁니다.
    if (acc.eh) await env.PUBLIC_KV.delete("spec:" + acc.eh);
    throw new HttpError(404, "USER_NOT_FOUND");
  }
  const user = await kvGetJson(env, "user:" + acc.uid);
  const r = await deleteAccountData(env, acc.uid, user || { email: acc.email }, "");
  return json(request, { deleted: true, uid: acc.uid, hadSubscription: r.hadSubscription });
}

/** 계정과 서버 데이터를 지웁니다(앱 안 삭제·관리자 삭제 공용). */
async function deleteAccountData(env, uid, user, sessHash) {
  const list = (await kvGetJson(env, "usess:" + uid)) || [];
  for (const h of list) await env.PUBLIC_KV.delete("sess:" + h);
  if (sessHash) await env.PUBLIC_KV.delete("sess:" + sessHash);
  await env.PUBLIC_KV.delete("usess:" + uid);

  const ent = await kvGetJson(env, "ent:" + uid);
  const hadSubscription = !!(ent && (ent.tier === "plus" || ent.tier === "trial") && ent.until > Date.now());
  const toks = (await kvGetJson(env, "uptok:" + uid)) || [];
  if (ent && ent.tokenHash && toks.indexOf(ent.tokenHash) < 0) toks.push(ent.tokenHash);
  for (const th of toks) {
    // 다른 계정이 주인인 토큰은 건드리지 않음
    if ((await env.PUBLIC_KV.get("ptok:" + th)) === uid) {
      await env.PUBLIC_KV.delete("ptok:" + th);
      await env.PUBLIC_KV.delete("ackfail:" + th);
    }
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
  // Durable Object 에 센 사용량도 지웁니다(바인딩이 있을 때). 실패하면 삭제 전체를 실패로 돌려 사용자가 다시 시도하게 합니다.
  const usageObj = usageStub(env, "u:" + uid);
  if (usageObj) await doCall(usageObj, { op: "wipe" });
  await env.PUBLIC_KV.delete("trial:" + uid);
  // 이메일 찾기표와(이 계정을 가리킬 때만) 관리자가 미리 준 등급(이메일로 묶인 것)도 지웁니다.
  if (user && normEmail(user.email)) {
    const eh = await emailHash(user.email);
    if ((await env.PUBLIC_KV.get("email:" + eh)) === uid) await env.PUBLIC_KV.delete("email:" + eh);
    await env.PUBLIC_KV.delete("spec:" + eh);
  }

  // 신고 내용은 남기되(서비스 품질 개선용) 누가 보냈는지는 지웁니다.
  // 보관 기간은 새로 시작하지 않습니다 — 처음 보낸 때부터 180일까지만 남깁니다(개인정보처리방침의 "180일", P-08).
  const reports = (await kvGetJson(env, "ureports:" + uid)) || [];
  const now = Date.now();
  for (const key of reports) {
    const r = await kvGetJson(env, key);
    if (r) {
      r.uid = null;
      const leftSec = Math.floor(((r.at || now) + REPORT_TTL_SEC * 1000 - now) / 1000);
      if (leftSec < 60) await env.PUBLIC_KV.delete(key); // KV 의 최소 수명(60초)보다 짧게 남았으면 바로 지움
      else await kvPutJson(env, key, r, leftSec);
    }
  }
  await env.PUBLIC_KV.delete("ureports:" + uid);
  await env.PUBLIC_KV.delete("user:" + uid);
  return { hadSubscription };
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

async function handleAi(request, env, model, ctx) {
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

  // 한 번의 누름을 가리키는 번호(앱이 붙임). 모양이 이상하면 없는 것으로 봅니다(호출마다 셈).
  const rawReq = String(request.headers.get("x-kata-req") || "");
  const req = !unit && REQ_RE.test(rawReq)
    ? { id: rawReq, hash: (await sha256hex(JSON.stringify(body.contents))).slice(0, 16) }
    : null;

  const plan = await getPlan(env, a.uid);
  // 긴급 차단 스위치(Worker 변수 AI_PAUSED): 비용이 갑자기 치솟을 때 배포 없이 변수 하나로 AI 호출을 멈춥니다(S-21).
  //   "all"  모든 등급의 AI 호출을 멈춤 · "free" 무료 등급만 멈춤 · 비우면 평소대로
  // 계정별 한도만으로는 가입이 몰릴 때 전체 비용을 막을 수 없어 둔 손잡이입니다. 자동으로 막는 전체 하루 상한은 AI_DAILY_BUDGET(takeBudget).
  const paused = String(env.AI_PAUSED || "").trim().toLowerCase();
  if (paused === "all" || (paused === "free" && plan.tier === "free")) throw new HttpError(503, "SERVICE_PAUSED");
  const reservation = await reserveUse(env, a.uid, plan.tier, kind, unit, req);
  // 전체 하루 상한 — 계정 한도를 통과한 호출만 셉니다. 상한에 닿았으면 방금 잡은 계정 칸을 돌려주고 503.
  let budget = null;
  try {
    budget = await takeBudget(env, plan.tier, spec.mode, ctx);
  } catch (e) {
    await refundUse(env, reservation);
    throw e;
  }
  const refundAll = async () => {
    await refundUse(env, reservation);
    await refundBudget(env, budget);
  };
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
    await refundAll();
    throw e;
  }
  const headers = corsHeaders(request);
  headers["content-type"] = res.headers.get("content-type") || "application/json";
  headers["cache-control"] = "no-store";
  // 실패 응답은 상태 그대로 돌려줘야 앱의 폴백(3.8 → 3.1)이 동작합니다. 잡아 둔 칸은 돌려줍니다.
  if (!res.ok) {
    await refundAll();
    return new Response(res.body, { status: res.status, headers });
  }
  // 여기부터는 AI 쪽이 답을 만든 것이라(비용이 든 것으로 봄) 전체 하루 칸은 돌려주지 않습니다. 계정 칸만 돌려줍니다.
  // 200 이어도 내용이 비어 있으면(글·소리 없음) 쓴 것으로 치지 않습니다 — 앱은 이것을 실패로 보고 다시 부릅니다(C-02).
  let raw;
  try {
    raw = await res.text();
  } catch (e) {
    await refundUse(env, reservation);
    throw new HttpError(502, "UPSTREAM_UNREACHABLE");
  }
  if (!hasAiContent(spec.mode, raw)) await refundUse(env, reservation);
  return new Response(raw, { status: res.status, headers });
}

/** AI 응답 본문에 쓸 내용이 들어 있는가. 글: 첫 후보의 첫 조각에 글자 / 소리: 소리 자료(inlineData.data). */
function hasAiContent(mode, raw) {
  if (!raw) return false;
  if (mode === "tts") {
    // 소리는 수 MB 라 통째로 풀지 않고 자리만 찾습니다.
    const at = raw.indexOf('"inlineData"');
    if (at < 0) return false;
    const dataAt = raw.indexOf('"data"', at);
    if (dataAt < 0) return false;
    const q1 = raw.indexOf('"', raw.indexOf(":", dataAt) + 1);
    return q1 >= 0 && q1 + 1 < raw.length && raw.charAt(q1 + 1) !== '"';
  }
  try {
    const d = JSON.parse(raw);
    const parts = d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    const text = Array.isArray(parts) && parts[0] && typeof parts[0].text === "string" ? parts[0].text : "";
    return text.trim() !== "";
  } catch (e) {
    return false;
  }
}

async function handleBillingVerify(request, env) {
  const a = await requireAuth(request, env);
  const body = await readJsonBody(request, 8 * 1024);
  const productId = String(body.productId || "");
  const purchaseToken = String(body.purchaseToken || "");
  if (!purchaseToken || productIds(env).indexOf(productId) < 0) throw new HttpError(400, "BAD_REQUEST");
  const r = await verifyWithPlay(env, a.uid, productId, purchaseToken);
  const plan = await getPlan(env, a.uid);
  // ackPending: Plus 는 열렸지만 Play 확인(acknowledge)이 아직 안 됨 — 서버가 다음 요청 때 다시 시도합니다.
  return json(request, { valid: r.valid, plan, ackPending: !!r.ackPending });
}

function clip(v, n) {
  return String(v == null ? "" : v).slice(0, n);
}

async function handleReport(request, env, ctx) {
  const a = await requireAuth(request, env);
  const body = await readJsonBody(request, 16 * 1024);
  const plan = await getPlan(env, a.uid);
  // 하루 신고 수도 AI 한도와 같은 카운터로 먼저 한 칸 잡습니다(동시에 여러 개를 보내 상한을 넘기지 못하게).
  // 넘으면 429 QUOTA_REPORT. 저장이 실패하면 칸을 돌려줍니다.
  const reservation = await reserveUse(env, a.uid, plan.tier, "report", "", null);
  const rand = randomToken().slice(0, 8);
  // KV 목록은 키 사전순이라, 시각을 거꾸로 센 값을 앞에 두어 최신 신고가 먼저 나오게 합니다.
  const rev = String(9999999999999 - Date.now()).padStart(13, "0");
  const key = "report:" + rev + "-" + rand;
  const rep = {
    at: Date.now(),
    uid: a.uid,
    feature: clip(body.feature, 20),
    input: clip(body.input, 500),
    output: clip(body.output, 2000),
    reason: clip(body.reason, 200),
  };
  try {
    await kvPutJson(env, key, rep, REPORT_TTL_SEC);
  } catch (e) {
    await refundUse(env, reservation);
    throw e;
  }
  // 내 신고 키 목록 — 계정을 지울 때 연결을 끊는 데 씁니다. 예전에는 마지막 200개만 기억해, 그보다 오래된
  // 신고는 삭제 뒤에도 계정 연결이 남았습니다(P-08). 180일 동안 보낼 수 있는 수보다 넉넉히 둡니다.
  const mine = (await kvGetJson(env, "ureports:" + a.uid)) || [];
  mine.push(key);
  await kvPutJson(env, "ureports:" + a.uid, mine.slice(-MAX_REPORTS_TRACKED), REPORT_TTL_SEC);
  // 운영자 알림(설정돼 있을 때만). 신고는 이미 저장됐고, 알림이 실패해도 응답은 그대로 성공입니다.
  await defer(ctx, notifyReport(env, rep));
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
 *   {email | uid, action: "grant" | "revoke", tier?: "special" | "admin" | "review", until?: 밀리초(0·생략 = 무기한), note?}
 *   → {ok, uid, pending, plan}
 * 회원키 없이 Special Member 를 정하는 임시 통로입니다. 아직 로그인한 적 없는 이메일이면 "미리 준 등급"으로
 * 남겨 두었다가 그 사람이 처음 로그인할 때 붙입니다(pending: true).
 * tier "review" = 심사용 계정: plus 와 같은 기능·한도만 열립니다(Special 의 신앙 메뉴는 열리지 않음).
 * 미리 준 등급(spec:)은 400일 뒤 저절로 지워집니다 — 끝내 로그인하지 않은 이메일의 흔적이 남지 않게(P-25).
 */
async function handleAdminSpecial(request, env) {
  requireAdmin(request, env);
  const body = await readJsonBody(request, 4 * 1024);
  const action = String(body.action || "grant");
  if (action !== "grant" && action !== "revoke") throw new HttpError(400, "BAD_REQUEST");
  const tier = GRANT_TIERS.indexOf(body.tier) >= 0 ? body.tier : "special";
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
    await kvPutJson(env, "spec:" + acc.eh, grant, SPEC_TTL_SEC);
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
  // cursor: 앞 응답의 nextCursor 를 넣으면 그다음 쪽을 줍니다(200건 넘는 신고도 끝까지 볼 수 있게 — P-19).
  const cursor = url.searchParams.get("cursor") || undefined;
  const page = await env.PUBLIC_KV.list({ prefix: "report:", limit, cursor });
  const items = [];
  for (const k of page.keys) {
    const r = await kvGetJson(env, k.name);
    if (r) items.push(Object.assign({ key: k.name }, r, { uid: r.uid ? "(있음)" : null }));
  }
  return json(request, { items, nextCursor: page.list_complete ? null : page.cursor || null });
}

/** GET /admin/budget  (x-admin-key) → 오늘 AI 쪽으로 나간 호출 수와, 서버가 읽은 하루 상한 설정. */
async function handleAdminBudget(request, env) {
  requireAdmin(request, env);
  const caps = parseBudget(env);
  const b = await readBudget(env);
  return json(request, {
    day: kstDay(Date.now()),
    counter: env.USAGE_DO ? "durable-object" : "kv",
    // caps: null = 상한 없음. invalid: true = AI_DAILY_BUDGET 를 읽지 못해 0 으로 보고 있음(값을 고치세요).
    caps: caps ? { all: caps.all == null ? null : caps.all, text: caps.text == null ? null : caps.text, tts: caps.tts == null ? null : caps.tts } : null,
    invalid: !!(caps && caps.invalid),
    used: { all: b.all || 0, text: b.text || 0, tts: b.tts || 0 },
    // KV 방식에서는 상한을 정해 둔 날만 셉니다. 상한 없이 KV 로 돌 때는 0 으로 보입니다.
    reachedAt: b.hitAt || null,
    paused: String(env.AI_PAUSED || "").trim().toLowerCase() || null,
    telegram: tgConfigured(env),
  });
}

async function route(request, env, ctx) {
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
  if (method === "POST" && path === "/report") return handleReport(request, env, ctx);
  if (method === "GET" && path === "/admin/budget") return handleAdminBudget(request, env);
  if (method === "GET" && path === "/admin/reports") return handleAdminReports(request, env, url);
  if (method === "POST" && path === "/admin/special") return handleAdminSpecial(request, env);
  if (method === "GET" && path === "/admin/special") return handleAdminSpecialGet(request, env, url);
  if (method === "POST" && path === "/admin/delete") return handleAdminDelete(request, env);

  const m = method === "POST" ? path.match(AI_PATH_RE) : null;
  if (m) return handleAi(request, env, m[1], ctx);

  return json(request, { error: "NOT_FOUND" }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        const res = json(request, Object.assign({ error: e.code }, e.extra || {}), e.status);
        // 서버가 일부러 멈춘 것(AI_PAUSED·하루 상한)임을 앱이 알 수 있게 — 앱은 이때 다른 모델로 다시 부르지 않습니다.
        if (e.code === "SERVICE_PAUSED") res.headers.set("x-kata-paused", "1");
        return res;
      }
      return json(request, { error: "SERVER_ERROR" }, 500);
    }
  },
  // Cron Trigger(선택, wrangler.toml 의 [triggers]) — 한 시간 넘게 묵은 신고 알림 묶음을 보냅니다.
  async scheduled(event, env, ctx) {
    await defer(ctx, flushReportNotice(env));
  },
};

// ── Durable Object: 사용량 카운터 ────────────────────────────
//
// 계정마다 하나(이름 "u:<uid>"), 전체 하루 상한용 하나(이름 "budget"). 객체 하나는 한 번에 한 요청만 처리합니다 —
// 저장소 읽기·쓰기 사이에 다른 요청이 끼어들지 않게 줄(queue)을 세웁니다(런타임의 입력 관문에 더해 한 번 더).
// 그래서 "읽고 → 한도와 비교하고 → 더해 쓰기"가 한 덩어리로 끝나, 동시에 쏜 요청도 정확히 한도까지만 통과합니다.
// 저장 형식은 KV 때와 같은 키·같은 모양입니다(use:<uid>:<날짜> · usem:<uid>:<달> · uset:<uid> · budget:<날짜>).
// 이 저장소에는 수명(TTL)이 없어, 날짜가 바뀌면 지난 칸을 직접 지웁니다(pruneOld).

function doJson(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { "content-type": "application/json" } });
}

function doStore(storage) {
  return {
    get: async (key) => {
      const v = await storage.get(key);
      return v === undefined ? null : v;
    },
    put: async (key, value) => { await storage.put(key, value); },
  };
}

export class UsageCounter {
  constructor(state) {
    this.storage = state.storage;
    this.queue = Promise.resolve();
    this.prunedDay = "";
  }

  fetch(request) {
    const run = this.queue.then(() => this.handle(request));
    this.queue = run.then(() => {}, () => {});
    return run;
  }

  async handle(request) {
    let msg;
    try { msg = await request.json(); } catch (e) { return doJson({ err: { status: 400, code: "BAD_REQUEST" } }); }
    const store = doStore(this.storage);
    try {
      let out = null;
      if (msg.op === "reserve") {
        await this.pruneOld(msg.p.now);
        out = await reserveCore(store, msg.p);
      } else if (msg.op === "refund") {
        await refundCore(store, msg.r);
        out = true;
      } else if (msg.op === "read") {
        out = await readCore(store, msg.keys);
      } else if (msg.op === "wipe") {
        await this.storage.deleteAll();
        out = true;
      } else if (msg.op === "budget-take") {
        await this.pruneOld(msg.p.now);
        out = await budgetTakeCore(store, msg.p);
      } else if (msg.op === "budget-refund") {
        out = await budgetRefundCore(store, msg.t);
      } else if (msg.op === "budget-read") {
        out = await store.get(msg.key);
      } else {
        return doJson({ err: { status: 400, code: "BAD_REQUEST" } });
      }
      return doJson({ out });
    } catch (e) {
      // 한도 초과·잠금은 정상적인 거절이라 그대로 전합니다. 그 밖의 오류는 500 — Worker 가 KV 방식으로 처리합니다.
      if (e instanceof HttpError) return doJson({ err: { status: e.status, code: e.code, extra: e.extra } });
      return doJson({ fail: true }, 500);
    }
  }

  // 지난 칸 지우기 — KV 때의 수명과 같게 맞춥니다(개인정보처리방침: 날짜별 3일, 월별 최대 40일, 체험 합계 최대 400일).
  //   하루 칸(use:·budget:)  그 날짜에서 사흘이 지나면
  //   한 달 칸(usem:)        다음 달 10일이 지나면
  //   체험 합계(uset:)       처음 적은 때부터 400일이 지나면
  // 날짜가 바뀐 뒤 첫 요청에서 한 번, 그리고 요청이 없어도 알람이 하루에 한 번 돌립니다(쓰지 않는 계정의 칸도 지워지게).
  async pruneOld(nowMs) {
    const today = kstDay(nowMs);
    if (this.prunedDay === today) return;
    this.prunedDay = today;
    try {
      await this.sweep(nowMs);
      if ((await this.storage.getAlarm()) == null) await this.storage.setAlarm(nowMs + 24 * 3600 * 1000);
    } catch (e) {}
  }

  async sweep(nowMs) {
    const keepDay = kstDay(nowMs - 2 * 24 * 3600 * 1000);
    const keepMonth = kstMonth(nowMs - 10 * 24 * 3600 * 1000);
    const all = await this.storage.list();
    const dead = [];
    all.forEach((v, key) => {
      if (key.indexOf("usem:") === 0) { if (key.slice(-7) < keepMonth) dead.push(key); }
      else if (key.indexOf("use:") === 0 || key.indexOf("budget:") === 0) { if (key.slice(-10) < keepDay) dead.push(key); }
      else if (key.indexOf("uset:") === 0) { if (v && v.at && nowMs - v.at > TRIAL_TOTAL_TTL_SEC * 1000) dead.push(key); }
    });
    for (const key of dead) await this.storage.delete(key);
    return all.size - dead.length; // 남은 칸 수
  }

  async alarm() {
    try {
      const now = Date.now();
      const left = await this.sweep(now);
      if (left > 0) await this.storage.setAlarm(now + 24 * 3600 * 1000);
    } catch (e) {}
  }
}

// 테스트에서 캐시를 비우기 위한 내부 함수 (운영에서는 쓰지 않음)
export function __resetCachesForTest() {
  jwksCache = null;
  playTokenCache = null;
}
