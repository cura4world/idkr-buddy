// 내 정보 회원 칸 공용 카드(2026-11-25, components/PlusCard.tsx).
// 심사용 계정은 미리보기 빌드에서 만들 수 없어(isReviewAccount 는 스토어 앱에서만) 여기서 부품으로 확인합니다.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlusFreeCard, PlusMemberCard } from "@/components/PlusCard";

describe("PlusMemberCard", () => {
  afterEach(() => cleanup());

  it("Plus — 제목 옆 '이용 중', 둘째 줄 '연간 / 다음 결제 …', '구독 관리' 알약은 openManage, 카드 나머지는 Plus 화면", () => {
    const onOpen = vi.fn();
    const onManage = vi.fn();
    render(<PlusMemberCard review={false} period="연간" nextText="다음 결제 2027년 11월 25일" onOpen={onOpen} onManage={onManage} />);
    expect(screen.getByText("이용 중")).toBeInTheDocument();
    expect(screen.getByTestId("plus-member-card").textContent).toContain("연간 / 다음 결제 2027년 11월 25일");
    fireEvent.click(screen.getByRole("button", { name: "구독 관리" }));
    expect(onManage).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Kata kata Plus"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("해지한 구독 — '연간 / 정기 결제 취소됨 · …까지 이용'", () => {
    render(<PlusMemberCard review={false} period="연간" nextText="정기 결제 취소됨 · 2027년 11월 25일까지 이용" onOpen={() => {}} onManage={() => {}} />);
    expect(screen.getByTestId("plus-member-card").textContent).toContain("연간 / 정기 결제 취소됨 · 2027년 11월 25일까지 이용");
  });

  it("심사용 계정 — 둘째 줄 '심사용 계정', 알약 없음", () => {
    render(<PlusMemberCard review period="연간" nextText="다음 결제 2027년 11월 25일" onOpen={() => {}} onManage={() => {}} />);
    expect(screen.getByTestId("plus-member-card").textContent).toContain("심사용 계정");
    expect(screen.queryByText("다음 결제", { exact: false })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("주기를 모르면 날짜만", () => {
    render(<PlusMemberCard review={false} period="" nextText="다음 결제 2027년 11월 25일" onOpen={() => {}} onManage={() => {}} />);
    const t = screen.getByTestId("plus-member-card").textContent || "";
    expect(t).toContain("다음 결제 2027년 11월 25일");
    expect(t).not.toContain(" / ");
  });
});

describe("PlusFreeCard", () => {
  afterEach(() => cleanup());

  it("둘째 줄은 ' / ' 로 이은 가격 덩어리, 단추는 'Plus 자세히 보기' 하나", () => {
    const onOpen = vi.fn();
    render(<PlusFreeCard sub={["월 3,900원", "연간 구독 시 월 2,900원"]} onOpen={onOpen} />);
    expect(screen.getByTestId("plus-free-card").textContent).toContain("월 3,900원 / 연간 구독 시 월 2,900원");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Plus 자세히 보기" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
