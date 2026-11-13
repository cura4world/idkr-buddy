// Gemini 키 입력칸 검사: 회원키 모양은 막고, 짧은 값은 막고, 접두어(AIza / AQ.)로는 막지 않는다.

import { describe, expect, it } from "vitest";
import {
  GEMINI_KEY_TOO_SHORT_TEXT,
  MEMBER_KEY_IN_GEMINI_TEXT,
  cleanGeminiKeyInput,
  geminiKeyInputProblem,
  memberKeyInGeminiProblem,
} from "@/lib/gemini";
import { isMemberKeyShape } from "@/lib/member";

// 시험용 가짜 값(실제 키가 아님). 길이만 실제 키와 같게 맞춘다.
const AQ_KEY_53 = "AQ." + "x".repeat(50);
const AIZA_KEY_39 = "AIza" + "y".repeat(35);

describe("geminiKeyInputProblem", () => {
  it("53자 AQ. 키는 통과", () => {
    expect(AQ_KEY_53.length).toBe(53);
    expect(geminiKeyInputProblem(AQ_KEY_53)).toBe("");
  });

  it("예전 39자 AIza 키도 통과(접두어로 막지 않음)", () => {
    expect(AIZA_KEY_39.length).toBe(39);
    expect(geminiKeyInputProblem(AIZA_KEY_39)).toBe("");
  });

  it("접두어가 무엇이든 30자 이상이면 통과", () => {
    expect(geminiKeyInputProblem("ZZ." + "a".repeat(40))).toBe("");
  });

  it("회원키 모양(KK-XXXX-XXXX-XXXX)은 회원키 안내", () => {
    expect(geminiKeyInputProblem("KK-ABCD-EFGH-JKLM")).toBe(MEMBER_KEY_IN_GEMINI_TEXT);
  });

  it("회원키는 소문자·공백이 섞여도 회원키 안내", () => {
    expect(geminiKeyInputProblem("  kk-abcd-efgh-jklm \n")).toBe(MEMBER_KEY_IN_GEMINI_TEXT);
    expect(geminiKeyInputProblem("KK-ABCD- EFGH-JKLM")).toBe(MEMBER_KEY_IN_GEMINI_TEXT);
  });

  it("짧은 값은 길이 안내", () => {
    expect(geminiKeyInputProblem("AQ.abc")).toBe(GEMINI_KEY_TOO_SHORT_TEXT);
    expect(geminiKeyInputProblem("a".repeat(29))).toBe(GEMINI_KEY_TOO_SHORT_TEXT);
  });

  it("30자는 경계 — 통과", () => {
    expect(geminiKeyInputProblem("a".repeat(30))).toBe("");
  });

  it("빈 값은 검사하지 않음(지우기용)", () => {
    expect(geminiKeyInputProblem("")).toBe("");
    expect(geminiKeyInputProblem("   ")).toBe("");
  });
});

describe("memberKeyInGeminiProblem (설정 화면)", () => {
  it("회원키 모양만 막고 나머지는 길이와 상관없이 통과", () => {
    expect(memberKeyInGeminiProblem("KK-ABCD-EFGH-JKLM")).toBe(MEMBER_KEY_IN_GEMINI_TEXT);
    expect(memberKeyInGeminiProblem("AQ.짧음")).toBe("");
    expect(memberKeyInGeminiProblem("")).toBe("");
  });
});

describe("cleanGeminiKeyInput / isMemberKeyShape", () => {
  it("공백·줄바꿈·탭을 모두 뺀다", () => {
    expect(cleanGeminiKeyInput(" AQ.a b\nc\td ")).toBe("AQ.abcd");
  });

  it("회원키 모양: 숫자 0·1 은 쓰지 않으므로 모양이 아니다", () => {
    expect(isMemberKeyShape("KK-ABCD-EFGH-JKLM")).toBe(true);
    expect(isMemberKeyShape("KK-ABCD-EFGH-JKL1")).toBe(false);
    expect(isMemberKeyShape("KK-ABCD-EFGH")).toBe(false);
  });
});
