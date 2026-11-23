// src/lib/hash.ts
// SHA-256 → 소문자 16진수 64자. 사전 정정 목록·피드백 대상 표식이 같은 값을 씁니다(2026-11-23 내부 테스트 12장).
// 브라우저의 crypto.subtle 을 씁니다(https·웹뷰). 쓸 수 없으면 빈 문자열 — 부르는 쪽이 "표식 없음"으로 다룹니다.

export async function sha256Hex(text: string): Promise<string> {
  try {
    const subtle = typeof crypto !== "undefined" && crypto && crypto.subtle ? crypto.subtle : null;
    if (!subtle) return "";
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    const bytes = new Uint8Array(buf);
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
    return out;
  } catch (e) {
    return "";
  }
}
