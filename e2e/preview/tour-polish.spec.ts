// 출시 전 둘러보기 다듬기(2026-11-25 Arga 승인) — ①②③④⑤ 화면 확인
//   ① 잠금 안내 창: 누른 것에 맞춘 첫 줄 + 공통 둘째 줄(흐리게·작게)
//   ② 무료 게임방에도 명찰(누르면 요약 상자)
//   ③ 카드 학습: 무작위 자동 재생 단추의 작은 재생 표시, 모든 단추 이름
//   ④ 구독 화면의 하단 탭은 들어온 곳의 탭
//   ⑤ 잠금 제목의 "Plus 회원 기능입니다"는 쪼개지지 않음
// 저장소 규칙: 정규식 리터럴을 쓰지 않습니다(new RegExp).

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, FONT_STEP_100 } from "../fixtures";

const activeTab = (page: Page) => page.locator('nav button[aria-current="page"]');

test("① 게임 잠금 창 — 첫 줄은 게임 문장, 둘째 줄은 공통(흐리고 작게), 제목 뒷부분은 한 덩어리 · ④ 자세히 보기 → 게임 탭", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  await page.getByRole("button", { name: new RegExp("Jodoh") }).click();
  const sheet = page.getByRole("dialog", { name: "이 게임은 Plus 회원 기능입니다" });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("[data-lock-first]")).toHaveText("단어 게임 6가지를 모두 할 수 있습니다.");
  const common = sheet.locator("[data-lock-common]");
  await expect(common).toHaveText("Plus를 시작하면 모든 기능이 열립니다.");
  const fs = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
  expect(await common.evaluate(fs)).toBeLessThan(await sheet.locator("[data-lock-first]").evaluate(fs));
  await expect(common).toHaveCSS("color", "rgb(122, 131, 136)");
  await expect(sheet.getByText("기본 단어장 34권, 회화집", { exact: false })).toHaveCount(0);
  await expect(sheet.locator("[data-lock-tail]")).toHaveCSS("white-space", "nowrap");
  await sheet.getByRole("button", { name: "Plus 자세히 보기" }).click();
  await expect.poll(() => appPath(page)).toBe("/plus");
  await expect(activeTab(page)).toHaveText("게임");
});

test("① 단어장·대화 잠금 창 첫 줄 — 수는 구독 화면과 같은 값", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "wordbooks");
  await page.getByRole("button", { name: new RegExp("\\(잠김\\)$") }).first().click();
  const sheet = page.getByRole("dialog", { name: "02 단어장부터는 Plus 회원 기능입니다" });
  await expect(sheet.locator("[data-lock-first]")).toHaveText("기본 단어장 34권을 모두 카드와 퀴즈로 외울 수 있습니다.");
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  // 구독 화면 혜택에도 같은 수
  await openApp(page, "plus");
  await expect(page.getByText("기본 단어장 34권", { exact: false }).first()).toBeVisible(); // "(3,005단어)" 덧말과 한 칸
  await expect(page.getByText("단어 게임 6가지", { exact: true })).toBeVisible();
  await expect(page.getByText("대화 86개와 새 대화 만들기", { exact: true })).toBeVisible();
});

test("⑤ 360px·125% — 잠금 제목이 '…부터는 / Plus 회원 기능입니다'로 나뉨(뒷부분 한 줄)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setupPreview(page, { tier: "free", fontStep: 8 }); // 125%
  await openApp(page, "wordbooks");
  await page.getByRole("button", { name: new RegExp("\\(잠김\\)$") }).first().click();
  const tail = page.getByRole("dialog").locator("[data-lock-tail]");
  await expect(tail).toHaveText("Plus 회원 기능입니다");
  expect(await tail.evaluate((e) => e.getClientRects().length)).toBe(1);
  // 인도네시아 이해 상자(PlusLockBox)도 같은 방식
  await page.goBack();
  await openApp(page, "insight");
  const boxTail = page.locator("[data-lock-tail]").first();
  await expect(boxTail).toHaveText("Plus 회원 기능입니다");
  expect(await boxTail.evaluate((e) => e.getClientRects().length)).toBe(1);
});

test("② 무료 게임방에도 명찰 — 누르면 요약 상자", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "permainan");
  const pill = page.locator('header button[title="Medali"]'); // 화면 읽기 이름은 숫자라 title 로 찾음
  await expect(pill).toBeVisible();
  await pill.click();
  await expect(pill).toHaveAttribute("aria-expanded", "true");
});

test("④ 구독 화면 하단 탭 — 홈 Plus 카드면 홈, 내 정보면 내 정보, 바로 열면 내 정보", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await page.locator('[data-fit-anchor="plus"]').click();
  await expect.poll(() => appPath(page)).toBe("/plus");
  await expect(activeTab(page)).toHaveText("홈");
  await openApp(page, "me");
  await page.getByRole("button", { name: "Plus 자세히 보기" }).first().click();
  await expect.poll(() => appPath(page)).toBe("/plus");
  await expect(activeTab(page)).toContainText("내 정보"); // 내 정보 탭은 사진(첫 글자) + 이름
  await openApp(page, "plus");
  await expect(activeTab(page)).toContainText("내 정보");
});

test("⑥ 앱 정보 — 버전 옆에 화면 쪽 빌드 번호(흐리게, 한 덩어리)", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "about");
  const build = page.locator("[data-web-build]");
  // 이 PC 빌드는 "dev", Actions(E2E 워크플로, 미리보기 빌드)는 "11.25-80p" 꼴
  await expect(build).toHaveText(new RegExp("^· (dev|[0-9]{1,2}\\.[0-9]{2}-[0-9]+p?)$"));
  await expect(build).toHaveCSS("color", "rgb(138, 147, 152)");
  await expect(build).toHaveCSS("white-space", "nowrap");
  await expect(page.getByText("Kata kata", { exact: false }).first()).toBeVisible();
});

test("③ 카드 학습 — 단추 이름 9개, 무작위 자동 재생에만 작은 재생 표시", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "wordbooks");
  const row = page.locator("div").filter({ has: page.getByText("인사·기본 표현", { exact: false }) }).filter({ has: page.getByRole("button", { name: "카드", exact: true }) }).last();
  await row.getByRole("button", { name: "카드", exact: true }).click();
  await expect.poll(() => appPath(page)).toMatch(new RegExp("^/study/"));
  for (const name of ["앞면 언어 바꾸기", "카드 순서 섞기", "듣기", "다시 외울 단어만 보기", "이전 카드", "자동 재생", "반복 재생", "무작위 자동 재생", "다음 카드"]) {
    const b = page.getByRole("button", { name, exact: true });
    await expect(b, name).toHaveCount(1);
    await expect(b, name).toHaveAttribute("title", name);
  }
  await expect(page.locator("[data-autoplay-mark]")).toHaveCount(1);
  const mark = page.getByRole("button", { name: "무작위 자동 재생", exact: true }).locator("[data-autoplay-mark]");
  await expect(mark).toHaveCSS("background-color", "rgb(44, 109, 99)");
  const box = (await mark.boundingBox())!;
  expect(Math.round(box.width)).toBe(16);
  await expect(page.getByRole("button", { name: "카드 순서 섞기", exact: true }).locator("[data-autoplay-mark]")).toHaveCount(0);
});
