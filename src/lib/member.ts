// src/lib/member.ts
// 회원키 — 사람(기기)마다 하나. 처음 활성화한 기기에 서버가 묶어 둡니다.
//
// 이 파일은 다른 lib 를 import 하지 않습니다(성경·회화집·설교문·자료가 이 파일을
// 쓰기 때문에, 거꾸로 import 하면 순환 참조가 됩니다). 활성화 뒤 성경 받기나
// 끊겼을 때 지우기처럼 여러 lib 를 엮는 일은 access.ts 가 합니다.
//
// 회원키 기기는 진짜 비밀키를 하나도 갖지 않습니다. 서버 요청마다 회원키와 기기번호를
// 보내고, Worker 가 확인한 뒤 내용을 내줍니다.

export const MEMBER_BASE = "https://kata-sermon.cura4world.workers.dev";

const MEMBER_KEY_KEY = "kata-member-key";
const MEMBER_PROFILE_KEY = "kata-member-profile";
const MEMBER_DEVICE_KEY = "kata-member-device";

export type MemberRole = "admin" | "member";

export interface MemberProfile {
  key: string;
  name: string;
  role: MemberRole;
  folder: string;
  medaliId: string;
}

// ---------- 기기 번호 ----------
// 한 번 만들면 바뀌지 않습니다. 앱 데이터를 지우면 새로 생기고, 그때는 형님이
// 관리 화면에서 "기기 풀어주기"를 해야 다시 활성화됩니다.

const DEVICE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function getMemberDeviceId(): string {
  try {
    const cur = localStorage.getItem(MEMBER_DEVICE_KEY) || "";
    if (new RegExp("^[A-Za-z0-9_-]{16,64}$").test(cur)) return cur;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    let id = "d";
    for (let i = 0; i < bytes.length; i++) id += DEVICE_ALPHABET[bytes[i] % DEVICE_ALPHABET.length];
    localStorage.setItem(MEMBER_DEVICE_KEY, id);
    return id;
  } catch (e) {
    return "";
  }
}

// ---------- 저장된 회원 상태 ----------

export function normalizeMemberKey(raw: string): string {
  return (raw || "").trim().toUpperCase().replace(new RegExp("\\s+", "g"), "");
}

export function getMemberProfile(): MemberProfile | null {
  try {
    const key = localStorage.getItem(MEMBER_KEY_KEY) || "";
    const raw = localStorage.getItem(MEMBER_PROFILE_KEY);
    if (!key || !raw) return null;
    const p = JSON.parse(raw);
    if (!p || p.key !== key) return null;
    return {
      key: key,
      name: String(p.name || ""),
      role: p.role === "admin" ? "admin" : "member",
      folder: String(p.folder || ""),
      medaliId: String(p.medaliId || ""),
    };
  } catch (e) {
    return null;
  }
}

export function isMemberActive(): boolean {
  return getMemberProfile() !== null;
}

export function isAdminMember(): boolean {
  const p = getMemberProfile();
  return !!p && p.role === "admin";
}

function saveProfile(p: MemberProfile): void {
  try {
    localStorage.setItem(MEMBER_KEY_KEY, p.key);
    localStorage.setItem(MEMBER_PROFILE_KEY, JSON.stringify(p));
  } catch (e) {}
}

export function clearMemberState(): void {
  try {
    localStorage.removeItem(MEMBER_KEY_KEY);
    localStorage.removeItem(MEMBER_PROFILE_KEY);
  } catch (e) {}
}

/** 회원 요청에 붙일 헤더. 회원 상태가 아니면 null. */
export function memberHeaders(): Record<string, string> | null {
  const p = getMemberProfile();
  const device = getMemberDeviceId();
  if (!p || !device) return null;
  return { "x-kata-member": p.key, "x-kata-device": device };
}

/**
 * 기존 비밀키가 있으면 그것을, 없으면 회원키를 씁니다.
 * 돌려주는 값: 요청 주소와 헤더. 둘 다 없으면 null.
 */
export function pickServerAuth(
  legacyBase: string, legacyKey: string,
): { base: string; headers: Record<string, string> } | null {
  const b = (legacyBase || "").trim();
  const k = (legacyKey || "").trim();
  if (b && k) return { base: b.replace(new RegExp("/+$"), ""), headers: { "x-kata-key": k } };
  const mh = memberHeaders();
  if (mh) return { base: MEMBER_BASE, headers: mh };
  return null;
}

// ---------- 서버 ----------

function profileFrom(data: unknown): MemberProfile | null {
  const d = data as { profile?: Record<string, unknown> } | null;
  const p = d && d.profile;
  if (!p || typeof p.key !== "string") return null;
  return {
    key: p.key,
    name: String(p.name || ""),
    role: p.role === "admin" ? "admin" : "member",
    folder: String(p.folder || ""),
    medaliId: String(p.medaliId || ""),
  };
}

async function memberFetch(path: string, method: string, key: string): Promise<Response> {
  const device = getMemberDeviceId();
  if (!device) throw new Error("NO_DEVICE");
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 15000);
  try {
    return await fetch(MEMBER_BASE + path, {
      method,
      headers: { "x-kata-member": key, "x-kata-device": device },
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 회원키를 이 기기에 활성화합니다.
 * 에러 코드: UNKNOWN(없는 키) · DEVICE_TAKEN(다른 기기에서 사용 중) · FETCH_FAILED
 */
export async function activateMember(rawKey: string): Promise<MemberProfile> {
  const key = normalizeMemberKey(rawKey);
  if (!new RegExp("^KK-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$").test(key)) throw new Error("BAD_FORMAT");
  const res = await memberFetch("/member/activate", "POST", key);
  if (res.status === 401) throw new Error("UNKNOWN");
  if (res.status === 409) throw new Error("DEVICE_TAKEN");
  if (!res.ok) throw new Error("FETCH_FAILED");
  let data: unknown;
  try { data = await res.json(); } catch (e) { throw new Error("FETCH_FAILED"); }
  const p = profileFrom(data);
  if (!p) throw new Error("FETCH_FAILED");
  saveProfile(p);
  return p;
}

/**
 * 앱이 켜질 때 부릅니다. 서버가 "이 키는 더 이상 이 기기 것이 아니다"라고 하면
 * "revoked", 연결이 안 되면 "offline"(지금 상태 유지), 정상이면 "ok".
 * 회원 상태가 아니면 "none".
 */
export async function checkMemberOnServer(): Promise<"ok" | "revoked" | "offline" | "none"> {
  const p = getMemberProfile();
  if (!p) return "none";
  let res: Response;
  try {
    res = await memberFetch("/member/me", "GET", p.key);
  } catch (e) {
    return "offline";
  }
  if (res.status === 401 || res.status === 403 || res.status === 409) return "revoked";
  if (!res.ok) return "offline";
  try {
    const fresh = profileFrom(await res.json());
    if (fresh) saveProfile(fresh); // 형님이 폴더명 등을 바꿨으면 여기서 따라옵니다
  } catch (e) {}
  return "ok";
}
