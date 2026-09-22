// src/lib/memberAdmin.ts
// 관리자가 회원키를 발급·관리합니다. 서버는 kata-sermon Worker 의 /admin/* 입니다.
// 인증은 기존 설교문 비밀키(설교문 서버가 설정된 기기) 또는 관리자 회원키로 합니다.

import { getSermonBase, getSermonKey } from "@/lib/sermon";
import { pickServerAuth, MemberRole } from "@/lib/member";

export interface AdminMember {
  key: string;
  name: string;
  role: MemberRole;
  folder: string;
  medaliId: string;
  bound: boolean;     // 기기에 묶였는가(한 번이라도 활성화했는가)
  createdAt: number;
  boundAt: number;
}

async function adminFetch(path: string, method: string, body?: unknown): Promise<Response> {
  const auth = pickServerAuth(getSermonBase(), getSermonKey());
  if (!auth) throw new Error("NO_CONFIG");
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 15000);
  let res: Response;
  try {
    res = await fetch(auth.base + path, {
      method,
      headers: body ? Object.assign({ "content-type": "application/json" }, auth.headers) : auth.headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403 || res.status === 409) throw new Error("UNAUTHORIZED");
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("FETCH_FAILED");
  return res;
}

function toMember(p: Record<string, unknown>): AdminMember {
  return {
    key: String(p.key || ""),
    name: String(p.name || ""),
    role: p.role === "admin" ? "admin" : "member",
    folder: String(p.folder || ""),
    medaliId: String(p.medaliId || ""),
    bound: !!p.bound,
    createdAt: Number(p.createdAt) || 0,
    boundAt: Number(p.boundAt) || 0,
  };
}

export async function listMembers(): Promise<AdminMember[]> {
  const res = await adminFetch("/admin/members", "GET");
  let data: { members?: Record<string, unknown>[] } = {};
  try { data = await res.json(); } catch (e) { throw new Error("FETCH_FAILED"); }
  return Array.isArray(data.members) ? data.members.map(toMember) : [];
}

export async function createMember(input: {
  name: string; role: MemberRole; folder?: string; medaliId?: string;
}): Promise<AdminMember> {
  const res = await adminFetch("/admin/members", "POST", input);
  let data: { profile?: Record<string, unknown> } = {};
  try { data = await res.json(); } catch (e) { throw new Error("FETCH_FAILED"); }
  if (!data.profile) throw new Error("FETCH_FAILED");
  const m = toMember(data.profile);
  m.createdAt = Date.now();
  return m;
}

/** 기기 풀어주기 — 그 사람이 새 기기(또는 앱 데이터를 지운 기기)에서 다시 넣을 수 있게 합니다. */
export async function releaseMemberDevice(key: string): Promise<void> {
  await adminFetch("/admin/members/release?key=" + encodeURIComponent(key), "POST");
}

/** 회원키 끊기 — 그 기기는 다음에 앱을 켤 때 받은 성경·교재가 지워집니다. */
export async function revokeMember(key: string): Promise<void> {
  await adminFetch("/admin/members?key=" + encodeURIComponent(key), "DELETE");
}
