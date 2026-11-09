// src/lib/platform.ts
// 지금 이 웹 앱이 어디에서 돌고 있는지 알려 줍니다.
//
// 스토어 앱(app.naruve.katakata)은 네이티브가 window.KataStore 를 넣어 줍니다.
// 관리자판·회원판 APK(io.github.cura4world.twa)와 브라우저에는 없습니다.
// 웹뷰는 페이지 스크립트가 돌기 전에 이 객체를 넣어 주므로 모듈을 불러오는 시점에 판단해도 됩니다.
//
// 이 파일은 다른 lib 를 import 하지 않습니다(어디서든 순환 없이 쓰도록).

interface KataStoreBridge {
  version?: () => string;
}

function storeBridge(): KataStoreBridge | null {
  try {
    const w = window as unknown as { KataStore?: KataStoreBridge };
    return w.KataStore ? w.KataStore : null;
  } catch (e) {
    return null;
  }
}

/** Google Play 에서 받은 스토어 앱 안인가 — 그렇다면 언제나 공개판입니다. */
export function isStoreApp(): boolean {
  return storeBridge() !== null;
}

/** 스토어 앱 버전 ("1.0.N"). 스토어 앱이 아니면 빈 문자열. */
export function storeAppVersion(): string {
  const b = storeBridge();
  if (!b || typeof b.version !== "function") return "";
  try {
    return String(b.version() || "");
  } catch (e) {
    return "";
  }
}

interface FileBridge {
  save?: (name: string, mime: string, base64: string) => string;
}

/** 네이티브 파일 저장 통로가 있는가 */
export function hasNativeFileSave(): boolean {
  try {
    const b = (window as unknown as { AndroidFile?: FileBridge }).AndroidFile;
    return !!b && typeof b.save === "function";
  } catch (e) {
    return false;
  }
}

/**
 * 네이티브 파일 저장 통로(AndroidFile.save — 다운로드 폴더, 안드로이드 10 이상은 MediaStore)로 저장합니다.
 * 통로가 없으면 null(브라우저 다운로드 등 다른 길을 쓰면 됨), 있으면 성공 여부.
 */
export function saveFileNative(name: string, mime: string, base64: string): boolean | null {
  let b: FileBridge | undefined;
  try {
    b = (window as unknown as { AndroidFile?: FileBridge }).AndroidFile;
  } catch (e) {
    return null;
  }
  if (!b || typeof b.save !== "function") return null;
  try {
    return String(b.save(name, mime, base64)) === "OK";
  } catch (e) {
    return false;
  }
}

/** 웹에 공개해 둔 정책 페이지 (Play 등록에도 같은 주소를 씁니다). */
export const POLICY_BASE = "https://cura4world.github.io/idkr-buddy/";
export const PRIVACY_URL = POLICY_BASE + "privacy.html";
export const TERMS_URL = POLICY_BASE + "terms.html";
export const DELETE_ACCOUNT_URL = POLICY_BASE + "delete-account.html";
