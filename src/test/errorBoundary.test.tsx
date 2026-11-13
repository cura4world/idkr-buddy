// 화면 오류가 흰 화면이 되지 않고 안내 + "다시 열기"로 바뀌는지 검사합니다 (2026-11-14 출시 전 점검 C-03).

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("broken-screen-for-test");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("문제가 없으면 화면을 그대로 보여 준다", () => {
    render(<ErrorBoundary><p>정상 화면</p></ErrorBoundary>);
    expect(screen.getByText("정상 화면")).toBeInTheDocument();
  });

  it("화면이 오류를 내면 안내와 '다시 열기' 버튼을 보여 주고, 정식 앱에는 오류 문구를 보이지 않는다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("문제가 생겼습니다.")).toBeInTheDocument();
    expect(screen.getByText("다시 열어 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 열기" })).toBeInTheDocument();
    // 미리보기 빌드가 아니므로(VITE_PREVIEW 없음) 오류 내용은 화면에 없음
    expect(screen.queryByText(new RegExp("broken-screen-for-test"))).toBeNull();
  });
});
