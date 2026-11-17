// 말끝만으로 평서문·의문문을 알 수 없는 한국어 문장 판별 (2026-11-17 — 예전 "?" 토글 대신 결과에 둘 다)
import { describe, it, expect } from "vitest";
import { koQuestionAmbiguous } from "@/lib/dictionary";

describe("koQuestionAmbiguous", () => {
  it("억양으로만 갈리는 말끝은 애매하다", () => {
    expect(koQuestionAmbiguous("이미 돈을 냈어요")).toBe(true);
    expect(koQuestionAmbiguous("밥 먹었어")).toBe(true);
    expect(koQuestionAmbiguous("내일 비 온대")).toBe(true);
    expect(koQuestionAmbiguous("여기 좋지")).toBe(true);
    expect(koQuestionAmbiguous("  같이 가요  ")).toBe(true);
  });
  it("부호가 붙었거나 말끝이 분명하면 애매하지 않다", () => {
    expect(koQuestionAmbiguous("이미 돈을 냈어요?")).toBe(false);
    expect(koQuestionAmbiguous("이미 돈을 냈어요.")).toBe(false);
    expect(koQuestionAmbiguous("돈을 냈습니다")).toBe(false);
    expect(koQuestionAmbiguous("돈을 냈습니까")).toBe(false);
    expect(koQuestionAmbiguous("어디 가니")).toBe(false);
    expect(koQuestionAmbiguous("")).toBe(false);
  });
});
