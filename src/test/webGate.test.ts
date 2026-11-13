// 브라우저·관리자판 APK 에서 누구에게 앱 대신 안내 화면을 보이는지 검사합니다 (2026-11-14 출시 전 점검 E-01).
//   닫힘: 스토어 앱이 아니고 회원키도 예전 설교문·성경 설정도 없는 방문자
//   열림: 회원키(회원·관리자)가 있는 기기, 예전 설정이 남은 기존 기기, 스토어 앱

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isWebClosed } from "@/components/WebGate";

function setMember(role: "admin" | "member"): void {
  const key = "KK-TEST-TEST-TEST";
  localStorage.setItem("kata-member-key", key);
  localStorage.setItem("kata-member-profile", JSON.stringify({ key, name: "시험", role, folder: "", medaliId: "" }));
}

describe("WebGate — 누구에게 안내 화면을 보이나", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    delete (window as unknown as { KataStore?: unknown }).KataStore;
  });

  it("아무 키도 없는 브라우저 방문자 → 안내 화면", () => {
    expect(isWebClosed()).toBe(true);
  });

  it("단어장 데이터만 있고 키는 없는 브라우저 → 안내 화면", () => {
    localStorage.setItem("kata-words", "[]");
    localStorage.setItem("geminiApiKey", "some-key");
    expect(isWebClosed()).toBe(true);
  });

  it("회원키(회원)를 넣은 기기 → 그대로 열림", () => {
    setMember("member");
    expect(isWebClosed()).toBe(false);
  });

  it("관리자 회원키를 넣은 기기 → 그대로 열림", () => {
    setMember("admin");
    expect(isWebClosed()).toBe(false);
  });

  it("회원키와 프로필이 어긋나면(지워진 키) 회원으로 보지 않음 → 안내 화면", () => {
    localStorage.setItem("kata-member-key", "KK-AAAA-AAAA-AAAA");
    localStorage.setItem("kata-member-profile", JSON.stringify({ key: "KK-BBBB-BBBB-BBBB", name: "", role: "member" }));
    expect(isWebClosed()).toBe(true);
  });

  it("예전 설교문 서버 설정이 남아 있는 관리자 기기 → 그대로 열림", () => {
    localStorage.setItem("sermon-base", "https://example.invalid");
    localStorage.setItem("sermon-key", "legacy");
    expect(isWebClosed()).toBe(false);
  });

  it("설교문 서버 주소만 있고 키가 없으면 설정으로 보지 않음 → 안내 화면", () => {
    localStorage.setItem("sermon-base", "https://example.invalid");
    expect(isWebClosed()).toBe(true);
  });

  it("예전 성경 비밀키가 남아 있는 기존 기기 → 그대로 열림", () => {
    localStorage.setItem("bible-key", "legacy");
    expect(isWebClosed()).toBe(false);
  });

  it("스토어 앱은 키가 없어도 이 문을 지나감(로그인 화면이 맡음)", () => {
    (window as unknown as { KataStore: unknown }).KataStore = { version: () => "1.0.0" };
    expect(isWebClosed()).toBe(false);
  });
});
