// src/lib/preview.ts
// 미리보기 APK(출시 전 검사용) 전용 도구.
//
// 미리보기 빌드는 `VITE_PREVIEW=1 npm run build` 로 만들고, APK 안의 파일을
// https://appassets.androidplatform.net/idkr-buddy/ 에서 엽니다(.github/workflows/build-preview.yml).
// 출처(origin)가 지금 쓰는 앱(cura4world.github.io)과 달라 localStorage·IndexedDB 가 완전히 따로입니다.
//
// 미리보기에서는
//   - 서비스워커를 만들지도 등록하지도 않습니다 (vite.config.ts · main.tsx)
//   - 로그인 화면을 건너뜁니다 (LoginGate.tsx)
//   - 스토어 앱으로 동작합니다 (platform.ts 의 isStoreApp)
//   - 등급은 미리보기 패널에서 고른 값을 따릅니다 (plan.ts 의 getPreviewTier)
//   - AI 는 패널에 넣은 Gemini 키로 직접 부릅니다 (aiProxy.ts 의 geminiTarget — 내 키가 있으면 언제나 직접)

import { isPreviewBuild } from "@/lib/plan";

const TRIAL_USED_KEY = "kata-preview-trial-used";

// "데이터 비우기"에서도 남겨 두는 값 — 미리보기 도구의 설정이지 앱 데이터가 아닙니다.
const KEEP_KEYS = ["kata-preview-tier", TRIAL_USED_KEY, "geminiApiKey"];

// indexedDB.databases() 가 없는 웹뷰를 위한 목록 (src 의 DB_NAME 전부, 2026-11-10 기준)
const KNOWN_DBS = [
  "kata-bible-hl", "kata-bible-ko", "kata-devotions", "kata-dict-results", "kata-dict-images",
  "kata-lookup-words", "kata-map-places", "kata-materials", "kata-medali", "kata-news",
  "kata-percakapan", "kata-percakapan-audio", "kata-phrases", "kata-prayers",
  "kata-sermon-audio", "kata-sermon-ink", "kata-sermons", "kata-stories", "kata-tips",
  "kata-tts-audio",
];

const listeners = new Set<() => void>();

/** 미리보기 빌드인가 */
export function isPreview(): boolean {
  return isPreviewBuild();
}

/** 빌드 표시 (워크플로가 VITE_PREVIEW_BUILD 로 넣어 줌. 없으면 빈 문자열) */
export function previewBuildLabel(): string {
  try {
    return String(import.meta.env.VITE_PREVIEW_BUILD || "");
  } catch (e) {
    return "";
  }
}

/** "체험을 이미 쓴 계정" 흉내 — 구독 화면(PW2) 확인용. 미리보기가 아니면 언제나 false. */
export function previewTrialUsed(): boolean {
  if (!isPreview()) return false;
  try {
    return localStorage.getItem(TRIAL_USED_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function setPreviewTrialUsed(v: boolean): void {
  try {
    if (v) localStorage.setItem(TRIAL_USED_KEY, "1");
    else localStorage.removeItem(TRIAL_USED_KEY);
  } catch (e) {}
  listeners.forEach((l) => {
    try { l(); } catch (e) {}
  });
}

/** 미리보기 설정(체험 사용 여부)이 바뀌면 알림. 등급 변경은 plan.ts 의 onTierChange 를 쓰세요. */
export function onPreviewChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      // 이 화면이 연결을 잡고 있으면 막힙니다. 삭제 요청은 줄에 남아 연결이 닫히면(새로고침) 이어집니다.
      req.onblocked = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

async function allDbNames(): Promise<string[]> {
  const names = new Set<string>(KNOWN_DBS);
  try {
    const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
    if (typeof idb.databases === "function") {
      const list = await idb.databases();
      for (const d of list) if (d && d.name) names.add(d.name);
    }
  } catch (e) {}
  return Array.from(names);
}

function withTimeout(p: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(), ms);
    p.then(() => { clearTimeout(t); resolve(); }, () => { clearTimeout(t); resolve(); });
  });
}

async function deleteAllDbs(): Promise<void> {
  const names = await allDbNames();
  await withTimeout(Promise.all(names.map(deleteDb)), 4000);
}

/**
 * 이 미리보기(이 출처)의 데이터를 모두 지우고 처음 화면으로 다시 엽니다.
 * localStorage(미리보기 설정 3개는 남김)·sessionStorage·IndexedDB·Cache Storage.
 * 미리보기가 아니면 아무것도 하지 않습니다 — 지금 쓰는 앱의 데이터를 지울 일은 없습니다.
 */
export async function clearPreviewData(): Promise<void> {
  if (!isPreview()) return;
  const kept: Record<string, string> = {};
  try {
    for (const k of KEEP_KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) kept[k] = v;
    }
    localStorage.clear();
    for (const k of Object.keys(kept)) localStorage.setItem(k, kept[k]);
  } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  await deleteAllDbs();
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}
  // 다시 열면 이 화면의 연결이 닫히면서 막혀 있던 삭제가 마저 끝납니다. 새 화면이 같은 DB 를
  // 여는 요청은 삭제 요청 뒤에 줄을 서므로(IndexedDB 규칙) 옛 데이터를 다시 읽는 일은 없습니다.
  try {
    window.location.replace(import.meta.env.BASE_URL || "/idkr-buddy/");
  } catch (e) {
    window.location.reload();
  }
}
