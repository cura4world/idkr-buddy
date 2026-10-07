// src/lib/bibleAutoSync.ts
// 이 기기에 빠진 성경 역본을 서버에서 받아 채웁니다.
//
// 왜 — 성경 본문은 코드 배포로 퍼지지 않고 기기마다 따로 받아야 합니다(bibleKo.ts).
// 그런데 회원키 활성화 때 받는 과정(access.ts syncMemberContent)은 역본 하나가
// 실패해도 조용히 넘어갑니다. 그래서 갤럭시 탭에만 우리말성경이 빠진 채
// 아무도 몰랐습니다(2026-10). 이제
//   · 앱이 켜질 때 빠진 역본이 있고 와이파이면 알아서 받고
//   · 성경 화면에서 빠진 역본 자리에 "지금 받기" 단추를 둡니다.
//
// 이미 이 기기에 있는 역본은 다시 받지 않습니다(갱신은 설정의 "성경받기"가 맡습니다).

import {
  BIBLE_VERSIONS, BibleVersion, getBibleBase, getBibleKey, koMetaSync, pullKoFromServer,
} from "@/lib/bibleKo";
import { clearKoMemoryCache } from "@/lib/bible";
import { pickServerAuth } from "@/lib/member";

/** 역본 하나를 새로 받았을 때 window 에 쏘는 이벤트. detail = { version } */
export const BIBLE_KO_UPDATED_EVENT = "kata-bible-ko-updated";

// 서버에 아직 없는 역본(EMPTY)은 앱을 켤 때마다 묻지 않도록 하루 쉬었다가 다시 봅니다.
const EMPTY_MARK_PREFIX = "bible-auto-empty:";
const EMPTY_RETRY_MS = 24 * 60 * 60 * 1000;
// 앱 첫 화면이 뜨는 동안 네트워크를 다투지 않도록 조금 기다렸다 시작합니다.
const START_DELAY_MS = 3000;

export interface PullMissingResult {
  got: string[];      // 받은 역본 이름
  missing: string[];  // 서버에 아직 없는 역본
  failed: string[];   // 네트워크 등으로 실패한 역본
}

/** 이 기기가 성경 서버에 접근할 수 있는가 (회원키 또는 기존 성경 비밀키). */
export function canPullBible(): boolean {
  return pickServerAuth(getBibleBase(), getBibleKey()) !== null;
}

/** 이 기기에 아직 없는 역본 */
export function missingBibleVersions(): BibleVersion[] {
  return BIBLE_VERSIONS.filter((v) => !koMetaSync(v.id)).map((v) => v.id);
}

/** 와이파이(또는 유선)로 확인될 때만 true. 알 수 없으면 false 로 둡니다(데이터 요금 보호). */
function onWifi(): boolean {
  try {
    const c = (navigator as unknown as { connection?: { type?: string } }).connection;
    const t = c && c.type;
    return t === "wifi" || t === "ethernet";
  } catch (e) {
    return false;
  }
}

function emptyRecently(v: BibleVersion): boolean {
  try {
    const at = Number(localStorage.getItem(EMPTY_MARK_PREFIX + v) || "0");
    return at > 0 && Date.now() - at < EMPTY_RETRY_MS;
  } catch (e) {
    return false;
  }
}

function markEmpty(v: BibleVersion): void {
  try { localStorage.setItem(EMPTY_MARK_PREFIX + v, String(Date.now())); } catch (e) {}
}

function clearEmptyMark(v: BibleVersion): void {
  try { localStorage.removeItem(EMPTY_MARK_PREFIX + v); } catch (e) {}
}

// 자동 받기와 "지금 받기"가 겹치면 같은 작업을 기다리게 합니다(두 번 받지 않음).
let running: Promise<PullMissingResult> | null = null;

/**
 * 빠진 역본만 받습니다.
 * manual = true 면 "서버에 없음" 표시(하루 쉬기)를 무시하고 다시 물어봅니다.
 */
export function pullMissingBibles(manual: boolean): Promise<PullMissingResult> {
  if (running) return running;
  running = (async () => {
    const result: PullMissingResult = { got: [], missing: [], failed: [] };
    if (!canPullBible()) return result;
    const targets = missingBibleVersions();
    for (let i = 0; i < targets.length; i++) {
      const v = targets[i];
      const label = BIBLE_VERSIONS.find((x) => x.id === v)?.label || v;
      if (!manual && emptyRecently(v)) continue;
      try {
        const meta = await pullKoFromServer(getBibleBase(), getBibleKey(), v);
        clearKoMemoryCache(v);
        clearEmptyMark(v);
        result.got.push(meta.label);
        try {
          window.dispatchEvent(new CustomEvent(BIBLE_KO_UPDATED_EVENT, { detail: { version: v } }));
        } catch (e) {}
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "EMPTY") {
          markEmpty(v);
          result.missing.push(label);
        } else {
          result.failed.push(label);
        }
      }
    }
    return result;
  })();
  const p = running;
  p.finally(() => { running = null; }).catch(() => {});
  return p;
}

let startedThisSession = false;

/**
 * 앱이 켜질 때 한 번. 빠진 역본이 있고 와이파이면 배경에서 받습니다.
 * 받은 역본 이름 목록을 돌려줍니다(없으면 빈 배열).
 */
export async function autoSyncBibleOnStart(): Promise<string[]> {
  if (startedThisSession) return [];
  startedThisSession = true;
  if (!canPullBible()) return [];
  if (missingBibleVersions().length === 0) return [];
  await new Promise((r) => setTimeout(r, START_DELAY_MS));
  try { if (navigator.onLine === false) return []; } catch (e) {}
  if (!onWifi()) return [];
  const r = await pullMissingBibles(false);
  return r.got;
}
