// src/lib/access.ts
// 어떤 판(관리자판·회원판·공개판)인지 정하고, 회원키를 활성화했을 때와
// 끊겼을 때 여러 lib 를 엮어 처리합니다.
//
//   관리자판  설교문 비밀키가 있는 기존 기기, 또는 관리자 회원키
//   회원판    회원 회원키, 또는 성경 비밀키가 있는 기존 기기
//   공개판    아무 키도 없음 — "말씀과 기도"·"설교"가 보이지 않습니다
//
// 판은 보이는 것만 정합니다. 실제로 내용을 내줄지는 Worker 가 회원키로 다시 확인합니다.

import {
  activateMember, checkMemberOnServer, clearMemberState, getMemberProfile,
  isAdminMember, isMemberActive, MemberProfile,
} from "@/lib/member";
import { hasLegacySermonConfig, getCachedSermons, deleteCachedSermon } from "@/lib/sermon";
import {
  BIBLE_VERSIONS, clearKoBible, getBibleBase, getBibleKey, pullKoFromServer, KoMeta,
} from "@/lib/bibleKo";
import { clearKoMemoryCache } from "@/lib/bible";
import { clearCachedMaterial } from "@/lib/materials";
import { clearCustomPercakapan, restoreBackup } from "@/lib/percakapan";
import { getPrivateFolderName, setPrivateFolderName } from "@/lib/store";
import { getMyMedaliId, setMyMedaliId, isValidMedaliId } from "@/lib/medaliSync";

export type Edition = "admin" | "member" | "public";

export const EDITION_LABEL: Record<Edition, string> = {
  admin: "관리자판",
  member: "회원판",
  public: "공개판",
};

function hasLegacyBibleKey(): boolean {
  return getBibleKey().trim() !== "";
}

export function getEdition(): Edition {
  if (hasLegacySermonConfig() || isAdminMember()) return "admin";
  if (isMemberActive() || hasLegacyBibleKey()) return "member";
  return "public";
}

export interface ActivateResult {
  profile: MemberProfile;
  bibles: string[];        // 받은 역본 이름
  scenes: number;          // 새로 받은 회화집 장면 수
  folderChanged: boolean;  // 개인 단어장 폴더가 바뀜 → 앱을 다시 켜야 단어장에 반영
}

/**
 * 회원키 활성화 → 프로필 적용 → 성경 세 역본·회화집 자동 받기.
 * 받기 중 하나가 실패해도 활성화 자체는 유지합니다(다음에 "성경받기"로 다시).
 */
export async function activateAndSync(
  rawKey: string, onProgress?: (msg: string) => void,
): Promise<ActivateResult> {
  const profile = await activateMember(rawKey);

  let folderChanged = false;
  if (profile.folder && profile.folder !== getPrivateFolderName()) {
    setPrivateFolderName(profile.folder);
    folderChanged = true;
  }
  if (profile.medaliId && isValidMedaliId(profile.medaliId) && profile.medaliId !== getMyMedaliId()) {
    setMyMedaliId(profile.medaliId);
  }

  const got = await syncMemberContent(onProgress);
  return { profile, bibles: got.bibles, scenes: got.scenes, folderChanged };
}

/** 성경 세 역본과 회화집을 서버에서 (다시) 받습니다. 활성화 직후와 "다시 받기"에 씁니다. */
export async function syncMemberContent(
  onProgress?: (msg: string) => void,
): Promise<{ bibles: string[]; scenes: number }> {
  const bibles: string[] = [];
  for (const v of BIBLE_VERSIONS) {
    try {
      const meta: KoMeta = await pullKoFromServer(getBibleBase(), getBibleKey(), v.id, (done, total) => {
        if (onProgress) onProgress(v.label + " " + done + "/" + total);
      });
      clearKoMemoryCache(v.id);
      bibles.push(meta.label);
    } catch (e) {
      // 서버에 없는 역본(EMPTY)이나 일시 오류는 건너뜁니다
    }
  }
  let scenes = 0;
  try {
    if (onProgress) onProgress("회화집");
    const r = await restoreBackup();
    scenes = r.addedScenes;
  } catch (e) {}
  return { bibles, scenes };
}

/** 회원키가 끊겼을 때 — 이 기기에 받아 둔 보호 대상 내용을 지웁니다. */
async function wipeProtectedContent(wasAdmin: boolean): Promise<void> {
  // 기존 성경 비밀키가 남아 있는 기기는 그 키로 받은 것이므로 두고, 그렇지 않을 때만 지웁니다.
  if (!hasLegacyBibleKey()) {
    for (const v of BIBLE_VERSIONS) {
      try { await clearKoBible(v.id); } catch (e) {}
      clearKoMemoryCache(v.id);
    }
    try { await clearCachedMaterial("onetoone"); } catch (e) {}
    try { await clearCustomPercakapan(); } catch (e) {}
  }
  // 관리자 회원키로만 설교문을 보던 기기면 받아 둔 설교문(필기·낭독 포함)도 지웁니다.
  if (wasAdmin && !hasLegacySermonConfig()) {
    try {
      const list = await getCachedSermons();
      for (const s of list) await deleteCachedSermon(s.id);
    } catch (e) {}
  }
}

const REVOKED_NOTICE_KEY = "kata-member-revoked-notice";

/**
 * 앱이 켜질 때 한 번. 서버가 이 기기의 회원키를 더 이상 인정하지 않으면
 * 회원 상태를 풀고 보호 대상 내용을 지운 뒤 화면을 새로 그립니다.
 * 인터넷이 안 되면 아무것도 하지 않습니다(지금 상태 유지).
 */
export async function refreshMembershipOnStart(): Promise<void> {
  const before = getMemberProfile();
  if (!before) return;
  const r = await checkMemberOnServer();
  if (r !== "revoked") return;
  await wipeProtectedContent(before.role === "admin");
  clearMemberState();
  try { localStorage.setItem(REVOKED_NOTICE_KEY, "1"); } catch (e) {}
  window.location.reload();
}

/** 끊긴 뒤 다시 켰을 때 한 번만 안내하기 위해 씁니다. */
export function takeRevokedNotice(): boolean {
  try {
    if (localStorage.getItem(REVOKED_NOTICE_KEY)) {
      localStorage.removeItem(REVOKED_NOTICE_KEY);
      return true;
    }
  } catch (e) {}
  return false;
}

/** 사용자가 설정에서 직접 회원키를 빼는 경우. 받은 내용도 함께 지웁니다. */
export async function leaveMembership(): Promise<void> {
  const before = getMemberProfile();
  if (!before) return;
  await wipeProtectedContent(before.role === "admin");
  clearMemberState();
}
