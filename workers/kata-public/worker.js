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
//   GET  /card/today · /card/list · /card/day/{날짜} · /card/img/{날짜}   오늘의 카드 (로그인 없이, 오늘까지만)
//   POST /admin/card/generate · /admin/card/delete · GET /admin/card   오늘의 카드 미리 만들기·내리기·확인 기록 (x-admin-key)
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
// 칸 하나: { day, month, locked, hidden }
//   day / month  한국 날짜·한국 달 기준 상한. 없으면 그 기간은 제한 없음
//   locked       이 등급에서는 못 씀 → 403 PLUS_REQUIRED
//   hidden       화면에 "남은 횟수"로 보이지 않는 상한(사전 숨은 한도, 남용 방지용 안전 상한)
// 표에서 "제한 없음"·"한도에 안 셈"인 기능에도 Plus 에는 남용 방지용 hidden 상한을 둡니다
// (앱이 스스로 밝히는 이름이라 서버가 내용을 확인할 수 없기 때문). Special·관리자는 정말 제한이 없습니다.
// 운영 중 바꿀 때는 LIMITS_JSON 변수로 덮어씁니다(아래 getLimits).
const DEFAULT_LIMITS = {
  free: {
    // 새 이야기 불러오기는 Plus 전용(2026-11-16 사용자 결정). 무료는 앱에 담긴 맛보기 3편만 읽습니다.
    story: { locked: true },
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
  special: { report: { day: 50, hidden: true } },
  admin: { report: { day: 50, hidden: true } },
};

// 7일 무료 체험은 2026-11-23 Arga 결정으로 없앴습니다(메뉴별 맛보기로 바꿈). 체험 절반 한도·체험 합계(uset:)·
// 체험 반복 기록(trial:)·체험 판정은 지웠습니다. 예전에 체험으로 적힌 계정(ent.tier "trial")은 Plus 로 다루되
// 그 기록의 만료 시각(= 원래 체험 끝)까지만입니다 — 그 뒤에는 Play 에 다시 물어 실제 결제가 이어졌으면 Plus,
// 아니면 무료(getPlan). 기한 없는 Plus 가 되지 않습니다.

// review = 심사용 계정(Google Play 심사자에게 주는 계정). 기능·한도는 plus 와 똑같고,
// 기독교·뉴스 같은 staff(special·admin) 전용 화면은 열지 않습니다. 관리자가 /admin/special 로 줍니다(2026-11-14).
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

// 2026-11-20 Arga 결정: gemini-2.5-flash-lite 를 뺌 — 구글이 새 사용자에게 막은 모델(404)이라 허용해도 쓸 수 없음.
const TEXT_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];

const SESSION_TTL_SEC = 60 * 24 * 3600;
const MAX_SESSIONS_PER_USER = 10;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_TEXT_OUTPUT_TOKENS = 16384;
const DEFAULT_TEXT_OUTPUT_TOKENS = 8192;
const DAY_TTL_SEC = 3 * 24 * 3600;
const MONTH_TTL_SEC = 40 * 24 * 3600;
// 예전 체험 합계(uset:) 칸의 수명 — 체험은 없어졌지만 이미 적힌 칸을 Durable Object 정리에서 지우는 기준으로만 씁니다.
const TRIAL_TOTAL_TTL_SEC = 400 * 24 * 3600;
const AI_TIMEOUT_MS = 100000;
const API_TIMEOUT_MS = 15000;
// Play 에 구독 상태를 다시 묻는 간격 (2026-11-14 출시 전 점검 B-01·B-02·B-04)
const ENT_LIVE_RECHECK_MS = 24 * 60 * 60 * 1000; // 이용 중: 만료 전이라도 하루에 한 번 (환불·취소를 알아채려고)
const ENT_RECHECK_MS = 60 * 60 * 1000; // 만료 뒤·무료로 내려간 뒤·Play 가 잠깐 안 될 때: 한 시간에 한 번까지
const ENT_ACK_RETRY_MS = 10 * 60 * 1000; // 확인(acknowledge)이 안 된 구매: 10분에 한 번까지 다시 시도
const ENT_FREE_RECHECK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 무료로 내려간 뒤에도 30일 동안은 다시 묻는다
const ENT_OUTAGE_GRACE_MS = 24 * 60 * 60 * 1000; // 만료 시각이 지났는데 Play 가 안 될 때: 하루까지는 지금 등급 유지
// 갱신 반영 지연(2026-11-24): Play 가 "이용 중"이라면서 만료 시각은 아직 옛 값으로 답할 때, 이 시간 동안은 무료로 적지 않고
// 1분 간격으로 다시 묻습니다. 테스트 구독(월간 5분)에서 갱신 순간 이렇게 답해 잠깐 무료로 적힌 것을 막습니다.
const ENT_RENEW_PENDING_MS = 15 * 60 * 1000;
const ENT_RENEW_RETRY_MS = 60 * 1000;
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
// 만료 시각이 막 지났어도 갱신을 기다릴 상태 — 자동 갱신이 살아 있는 것만(해지·만료·환불·보류는 바로 무료)
const RENEW_WAIT_STATES = [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
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
  ["day", "month"].forEach((p) => {
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
  ["day", "month"].forEach((p) => {
    if (!(p in v)) return;
    if (v[p] === null) { delete out[p]; return; }
    const n = Number(v[p]);
    if (isFinite(n) && n >= 0) out[p] = Math.floor(n);
  });
  if ("locked" in v) { if (v.locked) out.locked = true; else delete out.locked; }
  if ("hidden" in v) { if (v.hidden) out.hidden = true; else delete out.hidden; }
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

// 등급: free · plus · review · special · admin  (예전 체험 기록 tier "trial" 은 plus 로 다룸 — 2026-11-23 체험 폐지)
//   ent:<uid> = { tier, productId, purchaseToken, tokenHash, until, state, checkedAt, staff,
//                 triedAt?, freeSince?, ackPending?, ackFailedAt? }
//     checkedAt   Play 가 마지막으로 답해 준 시각
//     triedAt     Play 에 물었지만 답을 못 받은(일시 오류) 마지막 시각 — 답을 받으면 지워짐
//     freeSince   이 구매가 무료로 내려간 시각 — 그 뒤 30일 동안은 한 시간에 한 번까지 Play 에 다시 묻습니다
//     ackPending  Play 는 유효하다고 했는데 확인(acknowledge)이 아직 안 된 구매 — 다음 /me·/billing/verify 때 다시 시도
//   staff = { tier: "special"|"admin", until(0=무기한), note, at } — 관리자가 /admin/special 로 준 등급.
//   Play 검증이 ent 를 다시 써도 staff 는 남습니다. ent.tier 를 KV 에서 직접 special·admin 으로 적어도 인정합니다.
// 앱에 주는 plan: { tier, until, productId?, autoRenew? }

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
// 예전 체험 기록(tier "trial")도 앱에는 "plus" 로 줍니다 — 만료 시각(원래 체험 끝)은 그대로라 그 뒤에는 Plus 가 아닙니다.
function paidPlan(ent, until) {
  const autoRenew = ent.state !== "SUBSCRIPTION_STATE_CANCELED";
  return { tier: "plus", until, productId: ent.productId, autoRenew };
}

function isPaidTier(ent) {
  return !!ent && (ent.tier === "plus" || ent.tier === "trial");
}

/** 체험 폐지 전에 체험으로 적힌 기록인가 — 원래 체험 끝 시각을 넘겨 Plus 를 주지 않으려고 봅니다. */
function isLegacyTrialEnt(ent) {
  return !!ent && (ent.tier === "trial" || ent.trial === true);
}

/**
 * 지금 Play 에 이 계정의 구독 상태를 다시 물어야 하는가.
 *   이용 중(만료 전)      마지막 답에서 하루가 지났으면 — 환불·취소(권한 회수)는 만료 전에 일어납니다(B-01).
 *                        확인(acknowledge)이 안 된 구매는 10분에 한 번까지(B-04).
 *   만료 시각이 지남      만료 뒤에 아직 묻지 않았으면 바로, 그 뒤로는 한 시간에 한 번까지.
 *                        단 갱신 반영을 기다리는 중(renewPending)이면 만료 뒤 15분 동안은 1분에 한 번까지(2026-11-24).
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
    if (ent.renewPending && now - ent.until < ENT_RENEW_PENDING_MS) return now - last > ENT_RENEW_RETRY_MS;
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
  // Play 가 "이용 중"이라면서 만료 시각을 아직 옛 값으로 답함(갱신 반영 지연) — 만료 뒤 15분까지는 Plus 그대로.
  // 만료 시각은 옛 값 그대로 줍니다(앱은 갱신 확인 유예로 Plus 를 유지하며 다시 확인함). 예전 체험 기록은 받지 않습니다.
  if (ent.renewPending && !isLegacyTrialEnt(ent) && now - ent.until < ENT_RENEW_PENDING_MS) return paidPlan(ent, ent.until);
  // 만료 시각은 지났는데 Play 가 답을 못 준 경우(일시 오류): 하루까지는 지금 등급을 유지하고 한 시간 뒤 다시 묻습니다.
  // Play 가 한 번이라도 답하면 ent 가 새로 쓰이므로(무료 또는 새 만료 시각) 이 길로 오지 않습니다.
  // 예전 체험 기록은 이 유예를 받지 않습니다 — 원래 체험 끝 시각까지만(2026-11-23 Arga 결정).
  const unanswered = (ent.triedAt || 0) > (ent.checkedAt || 0) && (ent.triedAt || 0) >= ent.until;
  if (unanswered && !isLegacyTrialEnt(ent) && now - ent.until < ENT_OUTAGE_GRACE_MS) return paidPlan(ent, ent.until + ENT_OUTAGE_GRACE_MS);
  return { tier: "free", until: 0 };
}

// ── 사용량 ───────────────────────────────────────────────────

//   use:<uid>:<YYYY-MM-DD>  하루 사용량 { <kind>: n, units: { longread: { <unit>: 조각 수 } } }  (3일)
//   usem:<uid>:<YYYY-MM>    한 달 사용량 { <kind>: n }  (40일)
//   (uset:<uid> 예전 체험 기간 합계 — 2026-11-23 체험 폐지로 더 적지 않음. 남은 칸은 계정 삭제·DO 정리가 지움)

function dayKey(uid, nowMs) { return "use:" + uid + ":" + kstDay(nowMs); }
function monthKey(uid, nowMs) { return "usem:" + uid + ":" + kstMonth(nowMs); }

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

/** 하루·한 달 칸을 읽습니다. */
async function readCounters(env, uid) {
  const now = Date.now();
  const keys = { dKey: dayKey(uid, now), mKey: monthKey(uid, now) };
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

  if (typeof lim.day === "number" && (d[kind] || 0) >= lim.day) throw quotaError(kind, "day", lim.day, tier);
  if (typeof lim.month === "number" && (m[kind] || 0) >= lim.month) throw quotaError(kind, "month", lim.month, tier);

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
  return { uid, kind, unit, counted: true, dKey, mKey, req: req && !unit ? req : null };
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
  } catch (e) {}
}

/** /me 에 싣는 기능별 사용량·한도·남은 수 (null = 제한 없음). */
async function featureUsage(env, uid, tier) {
  const c = await readCounters(env, uid);
  const d = c.d, m = c.m;
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

// ── 같은 대상 누적 신고 (2026-11-23 내부 테스트 12장 B) ─────────────
// 앱이 신고에 대상 표식 target("dictionary:<sha256 64자>" 같은 모양)을 실어 보내면, 같은 대상의 신고 수를 셉니다.
// 정확히 3번째 신고에서 한 번만 "누적 3회" 알림을 보냅니다. 1회 신고의 한 시간 묶음 알림은 그대로입니다.
//   rcnt:<target> = { n, first, alerted }  수명: 처음 신고 + 180일(신고 보관 기간과 같음, 새 신고로 늘리지 않음)
// 사람을 가리지 않고 신고 건수로 셉니다 — 계정 정보를 새로 남기지 않으려는 것(같은 사람이 세 번 눌러도 3회, 하루 신고 상한 있음).
const REPORT_TARGET_RE = new RegExp("^[a-z]{1,12}:[0-9a-f]{64}$");
const REPORT_REPEAT_ALERT = 3;

function reportTarget(v) {
  const s = String(v == null ? "" : v);
  return REPORT_TARGET_RE.test(s) ? s : "";
}

/** 같은 대상 신고 수를 하나 올리고, 이번이 알림을 보낼 차례(정확히 3번째, 처음)인지 돌려줍니다. 절대 던지지 않습니다. */
async function countReportTarget(env, target, nowMs) {
  try {
    const key = "rcnt:" + target;
    const prev = (await kvGetJson(env, key)) || {};
    const first = typeof prev.first === "number" ? prev.first : nowMs;
    const n = (prev.n || 0) + 1;
    const alert = n >= REPORT_REPEAT_ALERT && !prev.alerted;
    const leftSec = Math.floor((first + REPORT_TTL_SEC * 1000 - nowMs) / 1000);
    if (leftSec >= 60) await kvPutJson(env, key, { n, first, alerted: !!prev.alerted || alert }, leftSec);
    return { n, alert };
  } catch (e) {
    return { n: 0, alert: false };
  }
}

/** "누적 3회" 알림. 절대 던지지 않습니다. */
async function notifyReportRepeat(env, rep, n) {
  if (!tgConfigured(env)) return;
  try {
    const lines = [
      "[Kata kata] 같은 결과 누적 " + n + "회",
      "기능: " + (rep.feature || "-"),
      "시각: " + kstStamp(rep.at || Date.now()),
    ];
    const pv = tgPreview(rep);
    if (pv) lines.push("앞부분: " + pv);
    lines.push("대상: " + String(rep.target || "").slice(0, 24));
    lines.push("전체 보기: GET /admin/reports");
    await tgSend(env, lines.join("\n"));
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
  // 체험 판정은 없앴습니다(2026-11-23 체험 폐지). Play 가 아직 체험 단계라고 답하는 예전 구독도 만료 시각(= 체험 끝)까지만
  // plus 로 적고, 그 뒤에는 다시 물어 실제 결제가 이어졌을 때만 plus 입니다.
  const valid = VALID_SUB_STATES.indexOf(sub.subscriptionState) >= 0 && until > now;

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
    return { valid: false, until: 0, ackPending: false, ent: prevEnt };
  }

  // 갱신 반영 지연(2026-11-24): Play 는 이용 중(ACTIVE·유예)이라는데 만료 시각이 막 지난 옛 값 — 갱신이 아직 반영되지 않았습니다.
  // 만료 뒤 15분까지는 무료로 적지 않고 이전 유료 기록을 그대로 두고 표시(renewPending)만 합니다 → shouldAskPlay 가 1분 간격으로 다시 묻습니다.
  // Play 기준으로는 이용 중이므로 valid 로 답합니다(앱이 결제창을 열어 "이미 가입" 오류가 나지 않게).
  // 해지·만료·환불(CANCELED·EXPIRED 등)은 여기 오지 않고 지금처럼 바로 무료. 예전 체험 기록은 원래 끝까지만(유예 없음).
  const renewPending = !valid && RENEW_WAIT_STATES.indexOf(sub.subscriptionState) >= 0 &&
    until > 0 && until <= now && now - until < ENT_RENEW_PENDING_MS &&
    !!prevEnt && sameToken && isPaidTier(prevEnt) && !isLegacyTrialEnt(prevEnt);
  if (renewPending) {
    const keep = Object.assign({}, prevEnt, { renewPending: true, checkedAt: now });
    delete keep.triedAt;
    await kvPutJson(env, "ent:" + uid, keep);
    return { valid: true, renewPending: true, until: keep.until, ackPending: !!keep.ackPending, ent: keep };
  }

  const nextEnt = {
    tier: valid ? "plus" : "free",
    productId,
    purchaseToken,
    tokenHash,
    until: valid ? until : 0,
    state: sub.subscriptionState || "",
    checkedAt: now,
  };
  // 무료로 내려간 시각 — 같은 구매로 이미 내려가 있었으면 처음 시각을 지킵니다(30일 재확인 기간의 기준).
  if (!valid) nextEnt.freeSince = (sameToken && prevEnt.tier === "free" && prevEnt.freeSince) || now;
  // 계정 표식이 없는 구매(앱 밖에서 만들어진 것 — 프로모션 코드, Play 구독 화면의 "다시 구독")는 먼저 검증을 요청한
  // 계정에 붙습니다. 나중에 운영자가 알아볼 수 있게 표시해 둡니다(B-13).
  if (!got) nextEnt.unbound = true;
  // (예전 체험 반복 기록 trial:<uid> 는 체험 폐지로 더 적지 않습니다. 남은 기록은 계정 삭제 때 지웁니다.)
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
  return { valid, until: valid ? until : 0, ackPending: !!nextEnt.ackPending, ent: nextEnt };
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
  // 같은 대상 표식(있으면) — 모양이 맞을 때만 받습니다(12장 B).
  const target = reportTarget(body.target);
  if (target) rep.target = target;
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
  if (target) {
    const c = await countReportTarget(env, target, rep.at);
    if (c.alert) await defer(ctx, notifyReportRepeat(env, rep, c.n));
  }
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

// ── 오늘의 카드 (인도네시아 이해 맨 위, 2026-11-17) ─────────────────
//
// 서버가 하루에 한 장 만들어 모든 사용자가 같이 봅니다(사용자마다 만들지 않음). 결정 문서 ⑥.
//   1) 주제 고르기 — 그날이 명절·기념일(CARD_EVENTS)이면 그 주제, 명절 앞뒤·계절 시기(CARD_SEASONS)면 며칠에 한 번 그 시기 주제,
//      아니면 일반 주제를 날짜로 돌려 가며(2026-11-20 시기 추가)
//   2) 글 만들기(Gemini) → 3) 확인(ANTHROPIC_API_KEY 가 있으면 Claude, 없으면 Gemini 가 한 번 더) → 고친 판이 있으면 그것을 씀
//   4) 그림 만들기(Gemini 이미지, 파스텔 플랫 고정) → 5) 그림 확인(글자·사람·여러 물건이 없는지). 두 번 다 실패하면 그림 없이 냄
// 만드는 때: Cron(매시간)이 오늘·내일 카드가 없으면 하나씩 만듭니다(변수 CARD_AUTOGEN = "1" 일 때만).
//   그래서 한국 자정에는 이미 다음 날 카드가 준비되어 있습니다. 날짜마다 시도는 CARD_MAX_RUNS 번까지.
// 보이는 것: 오늘(한국 날짜)까지의 카드만. 미리 만든 내일 카드는 내일 0시부터 보입니다.
// 저장: KV — 카드 글 card:v1:<날짜>, 그림 cardimg:v1:<날짜>(base64 글자 그대로, 서버는 풀지 않음), 목록 card:index.
// 그림은 앱이 base64 를 받아 직접 그림으로 바꿉니다(무료 요금제 CPU 한도 안에 들도록 서버에서 풀지 않음).
// AI 호출은 사용자 요청과 같은 Cloud Run 중계를 쓰고, 전체 하루 상한(AI_DAILY_BUDGET)에도 셉니다.

const CARD_VER = "v1";
const CARD_INDEX_KEY = "card:index";
const CARD_LOCK_KEY = "card:lock";
const CARD_INDEX_MAX = 1000;
const CARD_MAX_RUNS = 4;          // 한 날짜에 Cron 이 시도하는 최대 횟수
const CARD_LOCK_SEC = 600;        // 겹쳐 돌지 않게 — 한 번 도는 데 길어야 몇 분
const CARD_DATE_RE = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");
// 문장 끝의 "~요."·"~죠?" (문장부호가 붙었거나 글 끝). "필요 없이"처럼 낱말 속 "요" 는 잡지 않습니다.
const CARD_YO_RE = new RegExp("(요|죠)([.!?…]+|$)");
const CARD_FENCE_RE = new RegExp("```(json)?", "g");
// 글: 앞의 것이 거절되면(없는 모델·일시 오류) 다음 것으로. 사용자 기능의 허용 목록(TEXT_MODELS)보다 앞에 조금 더 좋은 모델을 둡니다.
// 2026-11-20: 맨 뒤 폴백 gemini-2.5-flash-lite 는 구글이 막은 모델이라 뺌(사용자 허용 목록과 같이).
const CARD_TEXT_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
const CARD_IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];
const CARD_CLAUDE_MODEL = "claude-sonnet-5-5";

// 그림체 — 2026-11-17 Arga 가 시안 4가지(파스텔 플랫·수채화·리소·선화) 중 고르고, 다시 "물건 하나만 심플하게"로 줄인 것.
// 이 글을 바꾸면 날마다 그림의 느낌이 바뀝니다. 바꿀 때는 결정 문서 ⑥ 도 함께 고칩니다.
const CARD_IMAGE_STYLE =
  "Style (fixed): minimal spot illustration, a single small object only, soft pastel flat vector, no outlines, " +
  "very few simple geometric shapes, at most 4 colors from this palette: pastel teal (#37C0D2 family), warm cream, " +
  "soft coral, butter yellow, leaf green (use soft red and white only when the object is the Indonesian flag). " +
  "One subtle soft shadow directly beneath the object. Plain solid cream (#FBF6EC) background, nothing else in the scene, " +
  "object centered and occupying about 55% of the frame. No people, no faces, no hands, no text, no letters, no numbers.";

// 일반 주제 — 날짜마다 돌려 가며 고릅니다(같은 날 다시 만들면 다음 것).
const CARD_TOPICS = [
  { chip: "음식", hint: "인도네시아의 음식·간식·길거리 먹거리 하나" },
  { chip: "생활 예절", hint: "인도네시아 사람들의 일상 예절이나 인사 습관 하나" },
  { chip: "말과 표현", hint: "일상에서 자주 쓰는 인도네시아어 표현이나 재미있는 말 하나" },
  { chip: "지역", hint: "인도네시아의 한 지역(섬·도시)의 특색 하나" },
  { chip: "자연", hint: "인도네시아의 자연·동물·식물 하나" },
  { chip: "전통", hint: "전통 공예·의상·악기·춤 가운데 하나" },
  { chip: "시장", hint: "시장·가게·흥정 같은 쇼핑 문화 하나" },
  { chip: "커피와 차", hint: "인도네시아의 커피나 차 문화 하나" },
  { chip: "놀이", hint: "인도네시아의 전통 놀이나 스포츠 하나" },
  { chip: "속담", hint: "인도네시아 속담 하나와 그 뜻" },
  { chip: "교통", hint: "앙꼿·오젝·기차 같은 교통수단이나 이동 문화 하나" },
  { chip: "집과 가족", hint: "집·가족·이웃 사이의 생활 문화 하나" },
];

// 명절·기념일 — 그날 카드의 주제가 됩니다. 이슬람력 명절은 해마다 날짜가 바뀌므로 정부 발표(SKB 3 Menteri)를 보고 해마다 넣습니다.
// 2027년은 SKB 1205·3·2 Tahun 2026(2026-09 발표) 기준.
// 2028년은 정부 발표 전이라 예상 날짜로 넣었습니다(2026-11-20). 고정일(양력 기념일)과 계산일(임렉·성금요일·부활절·승천일)은 확정,
//   이슬람력·녀삐·와이삭은 approx. 출처:
//   - 이슬람력 1449~1450 H: 무함마디야 KHGT https://khgt.muhammadiyah.or.id/calendar-download?year=1449&mode=hijriah
//     (1 Ramadan 2028-01-28 · 1 Syawal 2028-02-26 · 10 Zulhijah 2028-05-05) 와
//     https://www.al-habib.info/islamic-calendar/global/global-islamic-calendar-year-2028-ce.htm
//     (1 Muharam 1450 = 2028-05-25 · 12 Rabiulawal = 2028-08-03 · 27 Rajab = 2028-12-14, 1 Syawal 은 2028-02-27 로 하루 다름)
//   - 휴일 목록(교차 확인): https://hari.co.id/libur-nasional/2028/ · https://kalenderbali.org/liburnasional.php?tahun=2028
//     · http://kalenderindonesia.com/libur/masehi/2028 (이슬람 새해 2028-05-26) · https://husniadil.com/calendar/2028/imlek/ (임렉 2028-01-26)
//   - 부활절 계열: https://publicholidays.co.id/?p=144 (성금요일 2028-04-14 · 부활절 04-16) · https://publicholidays.co.id/?p=39 (승천일 05-25)
//   - 이슬람 새해는 출처마다 5월 25일·26일로 갈리고 25일이 승천일과 겹쳐 26일(approx)에 두었습니다. 녀삐 3월 26일·와이삭 5월 9일은 대다수 출처의 예상일.
// ⚠ 2027년 9~10월 SKB(2028년 공휴일) 발표 뒤 2028년 approx 날짜를 공식값으로 바꾸고 approx 를 뺍니다. 2029년 줄도 그때 덧붙입니다.
// approx: 날짜가 정부 판정(sidang isbat)으로 정해져 하루 이틀 달라질 수 있는 것 — 글에 정확한 날짜를 단정하지 않게 합니다.
const CARD_EVENTS = [
  { d: "2026-10-28", chip: "청년 맹세의 날", name: "Hari Sumpah Pemuda (1928년 청년 맹세 기념일)" },
  { d: "2026-11-10", chip: "영웅의 날", name: "Hari Pahlawan (영웅의 날, 1945년 수라바야 전투 기념)" },
  { d: "2026-11-12", chip: "아버지의 날", name: "Hari Ayah Nasional (인도네시아 아버지의 날)" },
  { d: "2026-11-25", chip: "교사의 날", name: "Hari Guru Nasional (교사의 날)" },
  { d: "2026-12-22", chip: "어머니의 날", name: "Hari Ibu (인도네시아 어머니의 날)" },
  { d: "2026-12-25", chip: "성탄절", name: "Hari Natal (성탄절, 국가 공휴일)" },
  { d: "2027-01-01", chip: "새해", name: "Tahun Baru Masehi (양력 새해, 국가 공휴일)" },
  { d: "2027-01-05", chip: "이스라 미으라즈", name: "Isra Mikraj (이슬람 기념일, 국가 공휴일)" },
  { d: "2027-02-06", chip: "임렉(설날)", name: "Tahun Baru Imlek (중국계 설날, 국가 공휴일)" },
  { d: "2027-02-08", chip: "라마단", name: "Awal Ramadan (라마단 금식 기간이 시작되는 무렵)", approx: true },
  { d: "2027-03-05", chip: "무딕", name: "Mudik (르바란을 앞둔 귀향 행렬)" },
  { d: "2027-03-08", chip: "녀삐", name: "Hari Raya Nyepi (발리 힌두교 새해, 고요의 날, 국가 공휴일)" },
  { d: "2027-03-10", chip: "르바란", name: "Idulfitri / Lebaran (라마단을 마친 명절, 국가 공휴일)" },
  { d: "2027-03-26", chip: "성금요일", name: "Wafat Yesus Kristus (성금요일, 국가 공휴일)" },
  { d: "2027-03-28", chip: "부활절", name: "Paskah (부활절, 국가 공휴일)" },
  { d: "2027-04-21", chip: "까르띠니의 날", name: "Hari Kartini (여성 교육 선구자 까르띠니 기념일)" },
  { d: "2027-05-01", chip: "노동절", name: "Hari Buruh (노동절, 국가 공휴일)" },
  { d: "2027-05-02", chip: "교육의 날", name: "Hari Pendidikan Nasional (교육의 날)" },
  { d: "2027-05-06", chip: "승천일", name: "Kenaikan Yesus Kristus (예수 승천일, 국가 공휴일)" },
  { d: "2027-05-17", chip: "이둘아드하", name: "Iduladha (희생제, 국가 공휴일)" },
  { d: "2027-05-20", chip: "와이삭", name: "Hari Raya Waisak (석가 탄신일, 국가 공휴일)" },
  { d: "2027-06-01", chip: "빤짜실라", name: "Hari Lahir Pancasila (건국 이념 빤짜실라 탄생일, 국가 공휴일)" },
  { d: "2027-06-06", chip: "이슬람 새해", name: "Tahun Baru Islam (이슬람력 새해, 국가 공휴일)" },
  { d: "2027-08-15", chip: "마울리드", name: "Maulid Nabi (예언자 무함마드 탄신일, 국가 공휴일)" },
  { d: "2027-08-17", chip: "독립기념일", name: "Hari Kemerdekaan (1945년 8월 17일 독립 선언, 국가 공휴일)" },
  { d: "2027-10-02", chip: "바틱의 날", name: "Hari Batik Nasional (바틱의 날)" },
  { d: "2027-10-28", chip: "청년 맹세의 날", name: "Hari Sumpah Pemuda (1928년 청년 맹세 기념일)" },
  { d: "2027-11-10", chip: "영웅의 날", name: "Hari Pahlawan (영웅의 날, 1945년 수라바야 전투 기념)" },
  { d: "2027-11-25", chip: "교사의 날", name: "Hari Guru Nasional (교사의 날)" },
  { d: "2027-12-22", chip: "어머니의 날", name: "Hari Ibu (인도네시아 어머니의 날)" },
  { d: "2027-12-25", chip: "성탄절", name: "Hari Natal (성탄절, 국가 공휴일)" },
  { d: "2027-12-26", chip: "이스라 미으라즈", name: "Isra Mikraj (이슬람 기념일, 국가 공휴일)" },
  // ── 2028년 (정부 발표 전 예상 — 위 주석의 출처, approx 는 SKB 발표 뒤 고침) ──
  { d: "2028-01-01", chip: "새해", name: "Tahun Baru Masehi (양력 새해, 국가 공휴일)" },
  { d: "2028-01-26", chip: "임렉(설날)", name: "Tahun Baru Imlek (중국계 설날, 국가 공휴일)" },
  { d: "2028-01-28", chip: "라마단", name: "Awal Ramadan (라마단 금식 기간이 시작되는 무렵)", approx: true },
  { d: "2028-02-21", chip: "무딕", name: "Mudik (르바란을 앞둔 귀향 행렬)", approx: true },
  { d: "2028-02-26", chip: "르바란", name: "Idulfitri / Lebaran (라마단을 마친 명절, 국가 공휴일)", approx: true },
  { d: "2028-03-26", chip: "녀삐", name: "Hari Raya Nyepi (발리 힌두교 새해, 고요의 날, 국가 공휴일)", approx: true },
  { d: "2028-04-14", chip: "성금요일", name: "Wafat Yesus Kristus (성금요일, 국가 공휴일)" },
  { d: "2028-04-16", chip: "부활절", name: "Paskah (부활절, 국가 공휴일)" },
  { d: "2028-04-21", chip: "까르띠니의 날", name: "Hari Kartini (여성 교육 선구자 까르띠니 기념일)" },
  { d: "2028-05-01", chip: "노동절", name: "Hari Buruh (노동절, 국가 공휴일)" },
  { d: "2028-05-02", chip: "교육의 날", name: "Hari Pendidikan Nasional (교육의 날)" },
  { d: "2028-05-05", chip: "이둘아드하", name: "Iduladha (희생제, 국가 공휴일)", approx: true },
  { d: "2028-05-09", chip: "와이삭", name: "Hari Raya Waisak (석가 탄신일, 국가 공휴일)", approx: true },
  { d: "2028-05-25", chip: "승천일", name: "Kenaikan Yesus Kristus (예수 승천일, 국가 공휴일)" },
  { d: "2028-05-26", chip: "이슬람 새해", name: "Tahun Baru Islam (이슬람력 새해, 국가 공휴일)", approx: true },
  { d: "2028-06-01", chip: "빤짜실라", name: "Hari Lahir Pancasila (건국 이념 빤짜실라 탄생일, 국가 공휴일)" },
  { d: "2028-08-03", chip: "마울리드", name: "Maulid Nabi (예언자 무함마드 탄신일, 국가 공휴일)", approx: true },
  { d: "2028-08-17", chip: "독립기념일", name: "Hari Kemerdekaan (1945년 8월 17일 독립 선언, 국가 공휴일)" },
  { d: "2028-10-02", chip: "바틱의 날", name: "Hari Batik Nasional (바틱의 날)" },
  { d: "2028-10-28", chip: "청년 맹세의 날", name: "Hari Sumpah Pemuda (1928년 청년 맹세 기념일)" },
  { d: "2028-11-10", chip: "영웅의 날", name: "Hari Pahlawan (영웅의 날, 1945년 수라바야 전투 기념)" },
  { d: "2028-11-25", chip: "교사의 날", name: "Hari Guru Nasional (교사의 날)" },
  { d: "2028-12-14", chip: "이스라 미으라즈", name: "Isra Mikraj (이슬람 기념일, 국가 공휴일)", approx: true },
  { d: "2028-12-22", chip: "어머니의 날", name: "Hari Ibu (인도네시아 어머니의 날)" },
  { d: "2028-12-25", chip: "성탄절", name: "Hari Natal (성탄절, 국가 공휴일)" },
];

// 시기(계절·명절 앞뒤) — 2026-11-20 Arga 결정. 명절 당일이 아닌 날에도 그 무렵의 생활 이야기가 나오게 합니다.
//   우선순위: 명절 당일(CARD_EVENTS) > major 시기 > minor 시기 > 일반 주제(CARD_TOPICS).
//   섞기: major 시기는 사흘 중 이틀, minor 시기는 나흘 중 하루만 시기 주제이고 나머지 날은 일반 주제(날짜로 정해져 다시 만들어도 같음).
//   겹치면 major 가 먼저, 같은 등급끼리는 기간이 짧은 쪽(명절에 묶인 시기)이 먼저. 같은 등급·같은 길이로 겹치는 줄은 두지 않습니다(시험이 봄).
//   이슬람력 기간은 계산하지 않고 날짜를 그대로 적었습니다(읽기 쉽게). 2028년 이슬람력 기간은 위 CARD_EVENTS 의 예상일 기준이라 approx.
//   우기와 제철 과일은 서로 겹치면 짧은 과일 쪽이 늘 이겨 우기가 사라지므로, 한 줄로 합치고 힌트마다 꼬리표(chip)를 따로 달았습니다.
//   종교 관련 시기는 생활 풍경만, 우기는 재난·홍수 이야기를 넣지 않습니다(글 만들기·확인 프롬프트의 규칙도 그대로).
const SEASON_RAIN = [
  "우기에 쓰는 비옷(jas hujan)과 오토바이를 타며 비를 피하는 풍경",
  "비 오는 오후에 즐겨 먹는 고렝안(튀김 간식)",
  "웨당 자헤 — 몸을 데우는 생강차",
  "비 오는 날 찾는 따뜻한 국물 음식(바소·소토)",
  "오후에 갑자기 쏟아지는 소나기와 비를 피해 기다리는 생활 습관",
];
const SEASON_DURIAN = [
  { chip: "제철 과일", hint: "두리안 — 우기에 제철을 맞는 과일과 두리안을 파는 노점" },
  { chip: "제철 과일", hint: "람부탄 — 길가에 다발로 쌓아 파는 제철 과일" },
];
const SEASON_MANGO_ONE = [{ chip: "제철 과일", hint: "망고 — 제철 망고의 여러 품종과 먹는 법" }];
// 9~10월(건기 끝·망고 철) — 힌트가 하나뿐이면 같은 글이 나흘마다 되풀이되므로 망고와 건기 생활을 섞습니다(2026-11-20 QA).
const SEASON_DRY_MANGO = [
  { chip: "제철 과일", hint: "망고 — 아루마니스·마날라기·그동 긴추 같은 망고 품종" },
  { chip: "건기", hint: "건기 하늘을 수놓는 연날리기(layang-layang) 풍경" },
  { chip: "제철 과일", hint: "루작 — 덜 익은 망고 같은 과일을 매콤달콤한 양념에 찍어 먹는 간식" },
  { chip: "건기", hint: "건기에 많이 찾는 시원한 음료(에스 클라파 무다·에스 테 마니스)" },
  { chip: "제철 과일", hint: "망고 산지 길가에 늘어선 망고 노점 풍경" },
];
const SEASON_YEAR_END = [
  "연말 휴가철 — 쇼핑몰 장식과 연말 할인 풍경",
  "성탄 공휴일과 연말 연휴에 사람들이 이동하고 쉬는 모습(공휴일과 생활 풍경만)",
  "연말 거리에서 파는 트롬펫(종이 나팔)과 새해맞이 준비 풍경",
  "연말 연휴에 많이 찾는 국내 여행지 풍경",
];

/** 두 힌트 목록을 번갈아 섞습니다(우기 하나, 과일 하나 …) — 과일 힌트가 목록 끝에 몰려 안 나오는 일이 없게. */
function interleaveHints(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
const SEASON_RAMADAN = [
  "사후르 — 해 뜨기 전 새벽에 먹는 식사와 사후르를 알리며 동네를 도는 풍경",
  "응아부부릿 — 해 질 녘 금식이 끝나기를 기다리며 시간을 보내는 모습",
  "탁질 — 금식을 마칠 때 먹는 달콤한 간식과 음료(콜락·에스 부아 등)",
  "부카 버르사마 — 직장·친구·이웃이 함께 모여 저녁을 먹는 자리",
  "라마단 시장 — 오후에 길가에 서는 간식 노점",
];
// 무딕은 명절 표(CARD_EVENTS)에 따로 하루가 있어 여기서는 뺐습니다(열흘 안에 세 번 나오지 않게).
const SEASON_LEBARAN_PREP = [
  "명절 선물 꾸러미(parsel·hampers)를 주고받는 풍습",
  "크투팟 — 어린 야자잎(자누르)을 엮은 주머니에 쌀을 넣고 오래 삶는 명절 음식",
  "나스타르 같은 명절 과자(쿠에 크링)를 굽고 나누는 풍습",
  "THR — 명절 전에 받는 상여금 문화",
  "명절에 입을 새 옷을 장만하는 시장·쇼핑몰 풍경",
];
const SEASON_LEBARAN_AFTER = [
  "할랄 비할랄 — 명절 뒤 직장·동네에서 서로 용서를 구하며 모이는 자리",
  "실라투라흐미 — 친척·이웃 집을 돌며 인사하는 방문",
  "오포르 아얌·른당 같은 명절 상차림",
  "아루스 발릭 — 고향에서 도시로 돌아오는 귀경 행렬",
  "'Mohon maaf lahir dan batin' 같은 명절 인사말",
];
const SEASON_AGUSTUS = [
  "빤짯 삐낭(panjat pinang) — 기름 바른 장대 꼭대기의 선물을 향해 오르는 놀이",
  "자루 달리기(balap karung) 같은 8월 17일 동네 경기",
  "크루푹 먹기 대회 — 줄에 매단 과자를 손을 쓰지 않고 먹는 놀이",
  "붉은색·흰색 깃발과 장식으로 골목을 꾸미는 풍경",
  "동네 잔치와 행진 같은 아구스투산 행사",
];
const SEASON_IDULADHA = [
  "이둘아드하를 앞두고 길가에 서는 소·염소 시장 풍경",
  "여러 집이 돈을 모아 함께 소·염소를 사는 풍습(patungan)",
];
const SEASON_IMLEK = [
  "앙파오 — 붉은 봉투에 담아 주는 새해 용돈",
  "바롱사이 — 임렉 무렵 거리에서 보는 사자춤",
  "쿠에 크란장 — 임렉 무렵 먹는 찹쌀 떡",
  "짭고메(정월 대보름) 무렵의 붉은 등불 장식과 론통 짭고메 같은 음식",
];

/** { from, to(끝 날짜 포함), grade: major|minor, chip, name, hints: [글 또는 {chip, hint}], approx } — 시작 날짜 순 */
const CARD_SEASONS = [
  { from: "2026-11-21", to: "2026-12-31", grade: "minor", chip: "우기", name: "우기와 제철 과일", hints: interleaveHints(SEASON_RAIN, SEASON_DURIAN.concat(SEASON_MANGO_ONE)) },
  { from: "2026-12-15", to: "2026-12-31", grade: "minor", chip: "연말", name: "연말", hints: SEASON_YEAR_END },
  { from: "2027-01-01", to: "2027-02-28", grade: "minor", chip: "우기", name: "우기와 제철 과일", hints: interleaveHints(SEASON_RAIN, SEASON_DURIAN) },
  { from: "2027-01-30", to: "2027-02-20", grade: "minor", chip: "임렉", name: "임렉(중국계 설날)부터 짭고메까지", hints: SEASON_IMLEK },
  { from: "2027-02-08", to: "2027-03-09", grade: "major", chip: "라마단", name: "라마단 기간", hints: SEASON_RAMADAN, approx: true },
  { from: "2027-02-28", to: "2027-03-09", grade: "major", chip: "르바란 준비", name: "르바란을 앞둔 열흘", hints: SEASON_LEBARAN_PREP },
  { from: "2027-03-01", to: "2027-03-31", grade: "minor", chip: "우기", name: "우기", hints: SEASON_RAIN },
  { from: "2027-03-11", to: "2027-03-17", grade: "major", chip: "르바란", name: "르바란 뒤 한 주", hints: SEASON_LEBARAN_AFTER },
  { from: "2027-05-12", to: "2027-05-16", grade: "minor", chip: "이둘아드하", name: "이둘아드하를 앞둔 며칠", hints: SEASON_IDULADHA },
  { from: "2027-08-01", to: "2027-08-31", grade: "major", chip: "8월 독립기념일", name: "8월 독립기념일 달(아구스투산)", hints: SEASON_AGUSTUS },
  { from: "2027-09-01", to: "2027-10-31", grade: "minor", chip: "건기", name: "건기 끝과 망고 제철", hints: SEASON_DRY_MANGO },
  { from: "2027-11-01", to: "2027-12-31", grade: "minor", chip: "우기", name: "우기와 제철 과일", hints: interleaveHints(SEASON_RAIN, SEASON_DURIAN.concat(SEASON_MANGO_ONE)) },
  { from: "2027-12-15", to: "2027-12-31", grade: "minor", chip: "연말", name: "연말", hints: SEASON_YEAR_END },
  { from: "2028-01-01", to: "2028-02-29", grade: "minor", chip: "우기", name: "우기와 제철 과일", hints: interleaveHints(SEASON_RAIN, SEASON_DURIAN) },
  { from: "2028-01-19", to: "2028-02-09", grade: "minor", chip: "임렉", name: "임렉(중국계 설날)부터 짭고메까지", hints: SEASON_IMLEK },
  { from: "2028-01-28", to: "2028-02-25", grade: "major", chip: "라마단", name: "라마단 기간", hints: SEASON_RAMADAN, approx: true },
  { from: "2028-02-16", to: "2028-02-25", grade: "major", chip: "르바란 준비", name: "르바란을 앞둔 열흘", hints: SEASON_LEBARAN_PREP, approx: true },
  { from: "2028-02-27", to: "2028-03-04", grade: "major", chip: "르바란", name: "르바란 뒤 한 주", hints: SEASON_LEBARAN_AFTER, approx: true },
  { from: "2028-03-01", to: "2028-03-31", grade: "minor", chip: "우기", name: "우기", hints: SEASON_RAIN },
  { from: "2028-04-30", to: "2028-05-04", grade: "minor", chip: "이둘아드하", name: "이둘아드하를 앞둔 며칠", hints: SEASON_IDULADHA, approx: true },
  { from: "2028-08-01", to: "2028-08-31", grade: "major", chip: "8월 독립기념일", name: "8월 독립기념일 달(아구스투산)", hints: SEASON_AGUSTUS },
  { from: "2028-09-01", to: "2028-10-31", grade: "minor", chip: "건기", name: "건기 끝과 망고 제철", hints: SEASON_DRY_MANGO },
  { from: "2028-11-01", to: "2028-12-31", grade: "minor", chip: "우기", name: "우기와 제철 과일", hints: interleaveHints(SEASON_RAIN, SEASON_DURIAN.concat(SEASON_MANGO_ONE)) },
  { from: "2028-12-15", to: "2028-12-31", grade: "minor", chip: "연말", name: "연말", hints: SEASON_YEAR_END },
];

function cardKey(d) { return "card:" + CARD_VER + ":" + d; }
function cardImgKey(d) { return "cardimg:" + CARD_VER + ":" + d; }
function cardRunsKey(d) { return "card:runs:" + d; }
function addDays(d, n) { return new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10); }
function dayNumber(d) { return Math.floor(Date.parse(d + "T00:00:00Z") / 86400000); }

const CARD_EVENT_DATES = new Set(CARD_EVENTS.map((e) => e.d));

function seasonLength(s) { return dayNumber(s.to) - dayNumber(s.from); }

/** 그날 걸쳐 있는 시기 가운데 하나 — major 먼저, 같은 등급이면 짧은 것, 그래도 같으면 먼저 시작한 것. 없으면 null. */
function cardSeasonFor(d) {
  let best = null;
  for (const s of CARD_SEASONS) {
    if (d < s.from || d > s.to) continue;
    if (!best) { best = s; continue; }
    const rank = (x) => (x.grade === "major" ? 0 : 1);
    if (rank(s) !== rank(best)) { if (rank(s) < rank(best)) best = s; continue; }
    if (seasonLength(s) < seasonLength(best)) best = s;
  }
  return best;
}

/** 시기 주제를 쓰는 날인가 — major 는 사흘 중 이틀, minor 는 나흘 중 하루(날짜 번호로 정함). */
function seasonDayOn(s, n) {
  return s.grade === "major" ? ((n % 3) + 3) % 3 !== 2 : ((n % 4) + 4) % 4 === 0;
}

/** 그날의 주제. attempt 가 늘면 일반 주제·시기 힌트는 다음 것으로(명절은 그대로). */
function cardTopicFor(d, attempt) {
  const a = attempt || 0;
  const ev = CARD_EVENTS.find((e) => e.d === d);
  if (ev) return { kind: "event", chip: ev.chip, hint: ev.name, approx: !!ev.approx };
  const s = cardSeasonFor(d);
  const day = dayNumber(d);
  if (s && seasonDayOn(s, day)) {
    // 이 시기 안에서 앞서 실제로 이 시기 주제였던 날 수만큼 힌트를 넘겨, 힌트가 고르게 돌아가게 합니다.
    // (명절 당일이나 더 앞선 시기가 가져간 날은 세지 않습니다 — 세면 그날 몫의 힌트가 건너뛰어집니다. 2026-11-20 QA)
    let k = 0;
    for (let n = dayNumber(s.from); n < day; n++) {
      if (!seasonDayOn(s, n)) continue;
      const nd = new Date(n * 86400000).toISOString().slice(0, 10);
      if (CARD_EVENT_DATES.has(nd) || cardSeasonFor(nd) !== s) continue;
      k++;
    }
    const h = s.hints[(k + a) % s.hints.length];
    const hint = typeof h === "string" ? h : h.hint;
    const chip = typeof h === "string" ? s.chip : h.chip || s.chip;
    return { kind: "season", chip, hint, name: s.name, grade: s.grade, approx: !!s.approx };
  }
  const n = CARD_TOPICS.length;
  const t = CARD_TOPICS[(((day + a) % n) + n) % n];
  return { kind: "topic", chip: t.chip, hint: t.hint, approx: false };
}

function cardStripJson(text) {
  const s = String(text || "").replace(CARD_FENCE_RE, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}

function cardStr(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }

/** 모델이 준 카드 모양을 다듬고 검사합니다. 모자라면 null. */
function cardNormalize(o) {
  if (!o || typeof o !== "object") return null;
  const body = (Array.isArray(o.body) ? o.body : [o.body]).map((p) => cardStr(p, 600)).filter((p) => p);
  const words = (Array.isArray(o.words) ? o.words : [])
    .map((w) => ({ id: cardStr(w && w.id, 40), ko: cardStr(w && w.ko, 60) }))
    .filter((w) => w.id && w.ko)
    .slice(0, 3);
  const card = {
    chip: cardStr(o.chip, 16),
    title: cardStr(o.title, 40),
    summary: cardStr(o.summary, 160),
    body: body.slice(0, 4),
    phrase: { id: cardStr(o.phrase && o.phrase.id, 120), ko: cardStr(o.phrase && o.phrase.ko, 120) },
    words,
    image: cardStr(o.image, 300),
  };
  if (!card.title || !card.summary || card.body.length < 1 || !card.phrase.id || !card.phrase.ko || words.length < 2 || !card.image) return null;
  return card;
}

/** 앱 문구 규칙 — 설명은 "~입니다" 체. 제목·요약·본문에 "~요" 로 끝나는 문장이 있으면 어긋난 것으로 봅니다(인도네시아어 표현의 뜻풀이는 제외). */
function cardStyleProblem(card) {
  const parts = [card.title, card.summary].concat(card.body);
  for (const p of parts) if (CARD_YO_RE.test(p)) return "STYLE_YO";
  return "";
}

function cardGenPrompt(d, topic, recentTitles) {
  return (
    "당신은 인도네시아 문화를 잘 아는 한국인 편집자입니다. 인도네시아어를 배우는 한국 사람이 앱에서 매일 한 장씩 보는 '오늘의 인도네시아' 카드를 만듭니다.\n" +
    "결과는 JSON 하나로만 출력합니다.\n\n" +
    "날짜: " + d + "\n" +
    (topic.kind === "event"
      ? "오늘의 주제(명절·기념일): " + topic.hint + "\n" +
        (topic.approx ? "이 날짜는 정부 판정으로 하루 이틀 달라질 수 있습니다. 글에 정확한 날짜를 단정하지 말고 '이 무렵'으로 씁니다.\n" : "")
      : topic.kind === "season"
        ? "오늘의 주제(시기): 이 시기(" + topic.name + ")에 인도네시아에서 볼 수 있는 생활 이야기 — " + topic.hint + "\n" +
          "명절 당일 이야기가 아니라 이 무렵의 생활 풍경으로 씁니다.\n" +
          (topic.approx ? "이 시기의 날짜는 정부 판정에 따라 며칠 달라질 수 있습니다. 시작일·끝일 같은 정확한 날짜를 단정하지 말고 '이 무렵'으로 씁니다.\n" : "")
        : "오늘의 분야: " + topic.chip + " — " + topic.hint + " (그 안에서 구체적인 소재 하나를 고릅니다)\n") +
    "\n출력 형식:\n" +
    "{\n" +
    '  "chip": "카드 위 작은 꼬리표, 한국어 2~8자 (예: ' + topic.chip + ')",\n' +
    '  "title": "제목, 한국어 16자 이내",\n' +
    '  "summary": "카드에 보이는 짧은 설명. 한국어 1~2문장, 합쳐서 70자 이내",\n' +
    '  "body": ["자세한 설명 문단 2~3개. 모두 합쳐 4~6문장"],\n' +
    '  "phrase": { "id": "주제와 이어지는 인도네시아어 한 마디(짧은 문장이나 표현)", "ko": "그 뜻(한국어)" },\n' +
    '  "words": [{ "id": "관련 인도네시아어 단어(기본형, 소문자)", "ko": "짧은 한국어 뜻" }, "... 2~3개"],\n' +
    '  "image": "카드 그림으로 그릴 물건 하나를 영어로 짧게 (예: a bowl of bakso soup). 사람·손·글자·여러 물건이 아닌 단순한 물건 하나"\n' +
    "}\n\n" +
    "규칙:\n" +
    "- 반드시 사실만 씁니다. 확실하지 않은 숫자·연도·유래는 쓰지 않거나 '~라는 이야기가 전해집니다'처럼 씁니다.\n" +
    "- 한국어 문장은 모두 '~입니다/~습니다' 체로 끝냅니다. '~해요', '~에요', '~죠' 체는 쓰지 않습니다.\n" +
    "- 인도네시아어는 표준 표기(KBBI·EYD)를 따릅니다. 한국어 음역은 꼭 필요할 때만 괄호 없이 자연스럽게 씁니다.\n" +
    "- 종교 기념일은 국가 공휴일이라는 사실과 사람들이 그날을 어떻게 보내는지만 중립적으로 소개합니다. 교리 설명·신앙 권유·종교 비교나 평가는 하지 않습니다.\n" +
    "- 정치·분쟁·재난·사건 사고·민족이나 종교 갈등은 다루지 않습니다.\n" +
    "- 너무 뻔한 상식보다 '오, 그렇구나' 싶은 구체적인 이야기를 고릅니다.\n" +
    "- 최근 카드와 겹치지 않게 합니다. 최근 제목: " + (recentTitles.length ? recentTitles.join(", ") : "없음") + "\n"
  );
}

function cardReviewPrompt(d, topic, card) {
  return (
    "다음은 인도네시아어를 배우는 한국 사람용 앱의 '오늘의 인도네시아' 카드(" + d + ")입니다. 출판 전에 검수합니다.\n" +
    (topic.kind === "event" ? "주제(명절·기념일): " + topic.hint + "\n" : "") +
    (topic.kind === "season"
      ? "주제(시기): " + topic.name + " — " + topic.hint + "\n" +
        (topic.approx ? "이 시기의 날짜는 정확히 정해지지 않았습니다. 글이 정확한 날짜를 단정하면 '이 무렵'으로 고칩니다.\n" : "")
      : "") +
    "\n카드(JSON):\n" + JSON.stringify(card) + "\n\n" +
    "확인할 것:\n" +
    "1. 인도네시아에 관한 사실이 정확한가 (숫자·연도·유래·지역·관습). 확실하지 않은 내용은 빼거나 '~라는 이야기가 전해집니다'로 바꿉니다.\n" +
    "2. phrase.id 가 자연스럽고 맞춤법이 맞는 인도네시아어인가, phrase.ko 가 그 뜻과 맞는가.\n" +
    "3. words 의 인도네시아어 표기와 한국어 뜻이 맞는가.\n" +
    "4. 한국어 제목·요약·본문이 '~입니다/~습니다' 체인가 ('~해요/~에요/~죠' 체가 있으면 고칩니다).\n" +
    "5. 종교는 중립적인 소개만 있는가, 정치·분쟁·재난·갈등이 없는가.\n" +
    "6. image 가 사람·글자 없는 단순한 물건 하나인가.\n\n" +
    "결과는 JSON 하나로만 출력합니다:\n" +
    '{ "ok": true 또는 false, "problems": ["찾은 문제를 한국어로 짧게"], "fixed": 문제가 있으면 같은 모양으로 고친 카드 전체, 없으면 null }\n' +
    "고칠 수 없을 만큼 틀렸으면 ok 를 false, fixed 를 null 로 둡니다."
  );
}

/** Cloud Run 중계로 한 번 부릅니다. 전체 하루 상한에 셉니다(실패하면 돌려받음). */
async function cardCallProxy(env, model, body, ctx) {
  const budget = await takeBudget(env, "plus", "text", ctx);
  let res;
  try {
    res = await tfetch(env.AI_PROXY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-kata-proxy": env.PROXY_SECRET, "x-kata-model": model },
      body: JSON.stringify(body),
    }, AI_TIMEOUT_MS);
  } catch (e) {
    await refundBudget(env, budget);
    return { ok: false, status: 0, raw: "" };
  }
  let raw = "";
  try { raw = await res.text(); } catch (e) { raw = ""; }
  if (!res.ok) await refundBudget(env, budget);
  return { ok: res.ok, status: res.status, raw };
}

function cardFirstText(raw) {
  try {
    const d = JSON.parse(raw);
    const parts = d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((p) => (p && typeof p.text === "string" ? p.text : "")).join("").trim();
  } catch (e) {
    return "";
  }
}

/** 글 모델에 JSON 을 받습니다. 모델 목록을 차례로 시도. 반환 { obj, model } 또는 null. */
async function cardAskJson(env, prompt, ctx, extraParts) {
  const parts = (extraParts || []).concat([{ text: prompt }]);
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 4096 },
  };
  for (const model of CARD_TEXT_MODELS) {
    const r = await cardCallProxy(env, model, body, ctx);
    if (!r.ok) continue;
    const obj = cardStripJson(cardFirstText(r.raw));
    if (obj) return { obj, model };
  }
  return null;
}

/** Claude 로 확인(ANTHROPIC_API_KEY 가 있을 때만). 반환 { obj } 또는 null(쓸 수 없음). */
async function cardAskClaude(env, prompt) {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await tfetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.CARD_REVIEW_MODEL || CARD_CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    }, AI_TIMEOUT_MS);
    if (!res.ok) return null;
    const d = await res.json();
    const text = Array.isArray(d && d.content) ? d.content.map((c) => (c && c.type === "text" ? c.text : "")).join("") : "";
    const obj = cardStripJson(text);
    return obj ? { obj } : null;
  } catch (e) {
    return null;
  }
}

/** 이미지 응답에서 base64 자료와 형식만 꺼냅니다(수 MB 라 통째로 풀지 않음). */
function cardExtractImage(raw) {
  if (!raw) return null;
  let at = raw.indexOf('"inlineData"');
  if (at < 0) at = raw.indexOf('"inline_data"');
  if (at < 0) return null;
  let mime = "image/png";
  const mAt = raw.indexOf("ime", at);
  if (mAt > 0 && mAt - at < 200) {
    const q1 = raw.indexOf('"', raw.indexOf(":", mAt) + 1);
    const q2 = raw.indexOf('"', q1 + 1);
    if (q1 > 0 && q2 > q1 && q2 - q1 < 40) mime = raw.slice(q1 + 1, q2);
  }
  const dataAt = raw.indexOf('"data"', at);
  if (dataAt < 0) return null;
  const q1 = raw.indexOf('"', raw.indexOf(":", dataAt) + 1);
  const q2 = raw.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 <= q1 + 100) return null;
  if (mime.indexOf("image/") !== 0) return null;
  return { mime, b64: raw.slice(q1 + 1, q2) };
}

async function cardMakeImage(env, subject, ctx) {
  const body = {
    contents: [{ role: "user", parts: [{ text: "Subject: " + subject + ".\n" + CARD_IMAGE_STYLE }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };
  for (const model of CARD_IMAGE_MODELS) {
    const r = await cardCallProxy(env, model, body, ctx);
    if (!r.ok) continue;
    const img = cardExtractImage(r.raw);
    if (img) return Object.assign(img, { model });
  }
  return null;
}

/** 그림 확인 — 글자·사람·여러 물건이 없고 주제와 맞는가. 확인 자체가 안 되면 통과로 봅니다(그림이 없는 것보다 낫다). */
async function cardCheckImage(env, subject, img, ctx) {
  const prompt =
    "This image should be a minimal pastel flat spot illustration of: " + subject + ".\n" +
    "Check: (1) no visible text, letters or numbers, (2) no people, faces or hands, (3) one main object on a plain light background, " +
    "(4) it recognisably shows the subject, (5) no obvious drawing errors (broken shapes, duplicated or floating parts).\n" +
    'Answer with JSON only: { "ok": true or false, "reason": "short reason" }';
  const r = await cardAskJson(env, prompt, ctx, [{ inlineData: { mimeType: img.mime, data: img.b64 } }]);
  if (!r) return { ok: true, reason: "check-unavailable" };
  return { ok: r.obj.ok === true, reason: cardStr(r.obj.reason, 200) };
}

async function cardReadIndex(env) {
  const v = await kvGetJson(env, CARD_INDEX_KEY);
  return Array.isArray(v) ? v : [];
}

async function cardWriteIndexEntry(env, entry) {
  const list = (await cardReadIndex(env)).filter((e) => e && e.d !== entry.d);
  list.push(entry);
  list.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  await kvPutJson(env, CARD_INDEX_KEY, list.slice(0, CARD_INDEX_MAX));
}

/**
 * 한 날짜의 카드를 만들어 저장합니다. 성공하면 카드, 실패하면 null.
 * 글이 확인을 통과하지 못하면 일반 주제는 다음 주제로 한 번 더 해 봅니다.
 */
async function generateCard(env, d, ctx) {
  const index = await cardReadIndex(env);
  const recentTitles = index.filter((e) => e.d !== d).slice(0, 40).map((e) => e.title);
  let made = null;
  for (let attempt = 0; attempt < 2 && !made; attempt++) {
    const topic = cardTopicFor(d, attempt);
    const gen = await cardAskJson(env, cardGenPrompt(d, topic, recentTitles), ctx);
    let card = gen ? cardNormalize(gen.obj) : null;
    if (!card) continue;
    // 확인 — Claude(있으면) → 없으면 Gemini 가 한 번 더
    const reviewPrompt = cardReviewPrompt(d, topic, card);
    let review = await cardAskClaude(env, reviewPrompt);
    let reviewer = "claude";
    if (!review) {
      review = await cardAskJson(env, reviewPrompt, ctx);
      reviewer = "gemini";
    }
    if (!review) continue; // 확인을 못 했으면 내보내지 않음
    const problems = Array.isArray(review.obj.problems) ? review.obj.problems.map((p) => cardStr(p, 200)).slice(0, 8) : [];
    let fixed = false;
    if (review.obj.ok !== true) {
      const f = cardNormalize(review.obj.fixed);
      if (!f) continue; // 고칠 수 없다고 본 것
      card = f;
      fixed = true;
    }
    if (cardStyleProblem(card)) continue;
    made = {
      v: 1, d, chip: card.chip || topic.chip, title: card.title, summary: card.summary, body: card.body,
      phrase: card.phrase, words: card.words, image: card.image, img: false,
      event: topic.kind === "event" ? topic.hint : null,
      // 주제 종류(event·season·topic)와 시기 이름 — 앱은 쓰지 않고(꼬리표 글자만 씀) 관리자 확인용입니다(2026-11-20).
      kind: topic.kind, season: topic.kind === "season" ? topic.name : null,
      gen: gen.model, review: { by: reviewer, fixed, problems }, at: Date.now(),
    };
  }
  if (!made) return null;

  // 그림 — 확인을 통과하지 못하면 한 번 더. 두 번 다 안 되면 그림 없이 냅니다(앱은 기본 그림을 보임).
  for (let i = 0; i < 2 && !made.img; i++) {
    const img = await cardMakeImage(env, made.image, ctx);
    if (!img) break; // 그림 모델 자체가 안 되면 더 시도하지 않음
    const check = await cardCheckImage(env, made.image, img, ctx);
    made.imgCheck = check.reason;
    if (!check.ok) continue;
    await env.PUBLIC_KV.put(cardImgKey(d), img.b64);
    made.img = true;
    made.imgMime = img.mime;
    made.imgModel = img.model;
  }
  await kvPutJson(env, cardKey(d), made);
  await cardWriteIndexEntry(env, { d, chip: made.chip, title: made.title, img: made.img });
  return made;
}

/**
 * Cron 이 부릅니다 — 오늘·내일 카드 가운데 없는 것 하나를 만듭니다.
 * 둘 다 있으면, 변수 CARD_BACKFILL_FROM(날짜)이 있을 때 그날부터 어제까지 빠진 날을 최근 것부터 하나 채웁니다
 * (출시 첫날에도 "지난 카드"에 읽을거리가 있게 — 결정 문서 ⑥ "출시 전에 2~4주 치").
 */
async function runCardJob(env, ctx) {
  if (String(env.CARD_AUTOGEN || "") !== "1") return { skipped: "off" };
  if (!env.AI_PROXY_URL || !env.PROXY_SECRET) return { skipped: "not-configured" };
  if (String(env.AI_PAUSED || "").trim().toLowerCase() === "all") return { skipped: "paused" };
  if (await env.PUBLIC_KV.get(CARD_LOCK_KEY)) return { skipped: "locked" };
  const today = kstDay(Date.now());
  const targets = [today, addDays(today, 1)];
  const from = String(env.CARD_BACKFILL_FROM || "").trim();
  if (CARD_DATE_RE.test(from) && from < today) {
    const have = {};
    (await cardReadIndex(env)).forEach((e) => { if (e && e.d) have[e.d] = true; });
    // 하루에 너무 많이 돌지 않게 60일까지만
    for (let d = addDays(today, -1), n = 0; d >= from && n < 60; d = addDays(d, -1), n++) {
      if (!have[d]) targets.push(d);
    }
  }
  for (const d of targets) {
    if (await env.PUBLIC_KV.get(cardKey(d))) continue;
    const runs = Number((await env.PUBLIC_KV.get(cardRunsKey(d))) || 0);
    if (runs >= CARD_MAX_RUNS) continue;
    await env.PUBLIC_KV.put(cardRunsKey(d), String(runs + 1), { expirationTtl: 3 * 24 * 3600 });
    await env.PUBLIC_KV.put(CARD_LOCK_KEY, "1", { expirationTtl: CARD_LOCK_SEC });
    try {
      const card = await generateCard(env, d, ctx);
      return { d, made: !!card };
    } catch (e) {
      // 하루 상한(503) 등 — 다음 시간에 다시
      return { d, made: false, error: e && e.code ? e.code : "ERROR" };
    } finally {
      try { await env.PUBLIC_KV.delete(CARD_LOCK_KEY); } catch (e) {}
    }
  }
  return { skipped: "done" };
}

/** 사용자에게 보이는 카드 모양 (확인 기록·모델 이름은 빼고) */
function cardPublic(c) {
  return {
    d: c.d, chip: c.chip, title: c.title, summary: c.summary, body: c.body,
    phrase: c.phrase, words: c.words, img: !!c.img, event: !!c.event,
  };
}

// 카드 조회(로그인 없음·모두에게 같은 글)만 미리보기 앱 출처에도 엽니다(2026-11-17 오류 수정).
// 미리보기 APK 는 웹 파일을 appassets.androidplatform.net 에서 열어(지금 앱과 저장소를 나누려고) 출처가 다르고,
// 예전에는 이 출처에 CORS 허용이 없어 미리보기 앱에서 카드·지난 카드가 늘 비어 보였습니다.
// 로그인·AI·구독 같은 다른 길은 그대로 APP_ORIGINS 만 받습니다.
const CARD_EXTRA_ORIGINS = ["https://appassets.androidplatform.net"];

function cardCors(request, headers) {
  const origin = request.headers.get("origin") || "";
  if (CARD_EXTRA_ORIGINS.indexOf(origin) >= 0) headers.set("access-control-allow-origin", origin);
  return headers;
}

function cardJson(request, data, status, maxAge) {
  const res = json(request, data, status);
  res.headers.set("cache-control", maxAge ? "public, max-age=" + maxAge : "no-store");
  cardCors(request, res.headers);
  return res;
}

/** GET /card/today → 오늘(한국 날짜) 카드. 오늘 것이 아직 없으면 가장 최근 카드. */
async function handleCardToday(request, env) {
  const today = kstDay(Date.now());
  let c = await kvGetJson(env, cardKey(today));
  if (!c) {
    const latest = (await cardReadIndex(env)).find((e) => e && e.d <= today);
    if (latest) c = await kvGetJson(env, cardKey(latest.d));
  }
  if (!c) return cardJson(request, { error: "NO_CARD" }, 404, 0);
  return cardJson(request, { today, card: cardPublic(c) }, 200, 300);
}

/** GET /card/day/<날짜> → 그날 카드(오늘까지만) */
async function handleCardDay(request, env, d) {
  if (!CARD_DATE_RE.test(d) || d > kstDay(Date.now())) return cardJson(request, { error: "NOT_FOUND" }, 404, 0);
  const c = await kvGetJson(env, cardKey(d));
  if (!c) return cardJson(request, { error: "NOT_FOUND" }, 404, 0);
  return cardJson(request, { card: cardPublic(c) }, 200, 3600);
}

/** GET /card/list?before=<날짜>&limit=30 → 지난 카드 목록(최신 먼저, 오늘까지만) */
async function handleCardList(request, env, url) {
  const today = kstDay(Date.now());
  const before = String(url.searchParams.get("before") || "");
  const limit = Math.max(1, Math.min(60, Number(url.searchParams.get("limit")) || 30));
  const all = (await cardReadIndex(env)).filter((e) => e && e.d <= today && (!CARD_DATE_RE.test(before) || e.d < before));
  const items = all.slice(0, limit).map((e) => ({ d: e.d, chip: e.chip, title: e.title, img: !!e.img }));
  return cardJson(request, { today, items, more: all.length > limit }, 200, 300);
}

/** GET /card/img/<날짜> → 그림(base64 글자). 앱이 그림으로 바꿉니다. */
async function handleCardImg(request, env, d) {
  if (!CARD_DATE_RE.test(d) || d > kstDay(Date.now())) return cardJson(request, { error: "NOT_FOUND" }, 404, 0);
  const b64 = await env.PUBLIC_KV.get(cardImgKey(d));
  if (!b64) return cardJson(request, { error: "NOT_FOUND" }, 404, 0);
  const headers = corsHeaders(request);
  headers["content-type"] = "text/plain; charset=utf-8";
  headers["cache-control"] = "public, max-age=31536000, immutable";
  const res = new Response(b64, { status: 200, headers });
  cardCors(request, res.headers);
  return res;
}

/** POST /admin/card/generate {date, force}  (x-admin-key) → 그 날짜 카드를 지금 만듭니다(미리 만들기·다시 만들기). */
async function handleAdminCardGenerate(request, env, ctx) {
  requireAdmin(request, env);
  const body = await readJsonBody(request, 4096);
  const d = String(body.date || "");
  if (!CARD_DATE_RE.test(d)) throw new HttpError(400, "BAD_DATE");
  if (!env.AI_PROXY_URL || !env.PROXY_SECRET) throw new HttpError(500, "NOT_CONFIGURED");
  if (!body.force && (await env.PUBLIC_KV.get(cardKey(d)))) return json(request, { ok: true, existed: true, card: await kvGetJson(env, cardKey(d)) });
  if (body.force) await env.PUBLIC_KV.delete(cardImgKey(d));
  const card = await generateCard(env, d, ctx);
  if (!card) return json(request, { ok: false, error: "GENERATION_FAILED" }, 502);
  return json(request, { ok: true, card });
}

/** GET /admin/card?date=  (x-admin-key) → 확인 기록까지 담긴 카드 전체 */
async function handleAdminCardGet(request, env, url) {
  requireAdmin(request, env);
  const d = String(url.searchParams.get("date") || "");
  if (!CARD_DATE_RE.test(d)) throw new HttpError(400, "BAD_DATE");
  return json(request, { card: await kvGetJson(env, cardKey(d)), runs: Number((await env.PUBLIC_KV.get(cardRunsKey(d))) || 0) });
}

/** POST /admin/card/delete {date}  (x-admin-key) → 카드·그림·목록 줄을 지웁니다(잘못된 카드 내리기). */
async function handleAdminCardDelete(request, env) {
  requireAdmin(request, env);
  const body = await readJsonBody(request, 4096);
  const d = String(body.date || "");
  if (!CARD_DATE_RE.test(d)) throw new HttpError(400, "BAD_DATE");
  await env.PUBLIC_KV.delete(cardKey(d));
  await env.PUBLIC_KV.delete(cardImgKey(d));
  const list = (await cardReadIndex(env)).filter((e) => e && e.d !== d);
  await kvPutJson(env, CARD_INDEX_KEY, list);
  return json(request, { ok: true });
}

// ── 횟수 제한 (2026-11-20 Arga 결정 — Durable Object 로 셈) ─────────────
// /admin/* 는 IP 하나당 1분 10번, /auth/* 는 1분 30번. 넘으면 429 RATE_LIMITED.
// 관리자 키 맞히기·로그인 두드리기를 늦추는 것이 목적입니다. 다른 경로(/me·/ai·/card·/billing·/report)는 세지 않습니다.
// 처음에는 Cloudflare 의 Rate Limiting 바인딩(B안)으로 했지만 실서버에서 50번을 몰아 보내도 한 번도 막지 않아(매번 success),
// 이미 쓰는 사용량 카운터(USAGE_DO)에 IP 마다 객체 하나("rl:admin:<IP>")를 두고 정확히 셉니다(DECISIONS 23장).
//   - 1분 고정 칸: 그 1분 안에 한도까지만 통과, 막힌 요청은 세지 않음. 칸 경계에서는 잠깐 두 배까지 지나갈 수 있습니다.
//   - 객체에는 {칸 시작 시각, 횟수}만 두고, 2분 뒤 알람이 지웁니다(IP 는 객체 이름에만 쓰이고 저장되지 않음).
//   - USAGE_DO 가 없거나 객체 호출이 실패하면 통과시킵니다(이 장치 고장으로 관리자·로그인이 막히지 않게). 실패는 로그에 1분에 한 줄.
const RATE_LIMIT_RETRY_SEC = 60;
const RATE_LIMITS = {
  admin: { limit: 10, periodMs: 60000 },
  auth: { limit: 30, periodMs: 60000 },
};

function rateGroupFor(path) {
  if (path.indexOf("/admin/") === 0) return "admin";
  if (path.indexOf("/auth/") === 0) return "auth";
  return "";
}

async function enforceRateLimit(request, env, path) {
  const group = rateGroupFor(path);
  if (!group) return;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const stub = usageStub(env, "rl:" + group + ":" + ip);
  if (!stub) return;
  let ok = true;
  try {
    const out = await doCall(stub, { op: "rate-hit", p: Object.assign({ now: Date.now() }, RATE_LIMITS[group]) });
    ok = !(out && out.ok === false);
  } catch (e) {
    ok = true;
    logDoFailure(e);
  }
  if (!ok) throw new HttpError(429, "RATE_LIMITED", { retryAfter: RATE_LIMIT_RETRY_SEC });
}

/** 객체 안에서 — 이번 1분 칸의 횟수가 한도보다 적으면 하나 더하고 통과, 아니면 막음(막힌 것은 세지 않음). */
async function rateHitCore(store, p) {
  const limit = Math.max(1, Number(p.limit) || 1);
  const periodMs = Math.max(1000, Number(p.periodMs) || 60000);
  const w = Math.floor(p.now / periodMs) * periodMs;
  const cur = (await store.get("rl")) || {};
  const n = cur.w === w ? Number(cur.n) || 0 : 0;
  if (n >= limit) return { ok: false, n, limit };
  await store.put("rl", { w, n: n + 1, p: periodMs });
  return { ok: true, n: n + 1, limit };
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

  await enforceRateLimit(request, env, path);

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
  if (method === "GET" && path === "/card/today") return handleCardToday(request, env);
  if (method === "GET" && path === "/card/list") return handleCardList(request, env, url);
  if (method === "GET" && path.indexOf("/card/day/") === 0) return handleCardDay(request, env, path.slice(10));
  if (method === "GET" && path.indexOf("/card/img/") === 0) return handleCardImg(request, env, path.slice(10));
  if (method === "POST" && path === "/admin/card/generate") return handleAdminCardGenerate(request, env, ctx);
  if (method === "POST" && path === "/admin/card/delete") return handleAdminCardDelete(request, env);
  if (method === "GET" && path === "/admin/card") return handleAdminCardGet(request, env, url);

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
        if (e.code === "RATE_LIMITED") res.headers.set("Retry-After", String(RATE_LIMIT_RETRY_SEC));
        return res;
      }
      return json(request, { error: "SERVER_ERROR" }, 500);
    }
  },
  // Cron Trigger(선택, wrangler.toml 의 [triggers]) — 한 시간 넘게 묵은 신고 알림 묶음을 보내고,
  // 오늘·내일 카드가 없으면 하나 만듭니다(CARD_AUTOGEN = "1" 일 때만).
  async scheduled(event, env, ctx) {
    await defer(ctx, flushReportNotice(env));
    // 카드 만들기는 몇 분 걸리므로 waitUntil(끝난 뒤 30초까지만 기다려 줌)에 맡기지 않고 여기서 끝까지 기다립니다.
    try { await runCardJob(env, ctx); } catch (e) {}
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
      } else if (msg.op === "rate-hit") {
        out = await rateHitCore(store, msg.p);
        // 칸이 끝나고 1분 뒤 지우게 — 쓰지 않는 IP 의 칸이 남지 않도록
        try { if ((await this.storage.getAlarm()) == null) await this.storage.setAlarm(msg.p.now + 2 * (Number(msg.p.periodMs) || 60000)); } catch (e) {}
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
      else if (key === "rl") { if (!v || nowMs >= (Number(v.w) || 0) + 2 * (Number(v.p) || 60000)) dead.push(key); } // 횟수 제한 칸
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

/** 시험용 — 날짜별 주제 판정과 표(오늘의 카드). 배포에는 영향이 없습니다. */
export function __cardTopicForTest(d, attempt) { return cardTopicFor(d, attempt); }
export function __cardTablesForTest() { return { events: CARD_EVENTS, seasons: CARD_SEASONS, topics: CARD_TOPICS }; }

// 테스트에서 캐시를 비우기 위한 내부 함수 (운영에서는 쓰지 않음)
export function __resetCachesForTest() {
  jwksCache = null;
  playTokenCache = null;
}
