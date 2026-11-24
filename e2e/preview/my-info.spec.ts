// 내 정보(/me) — 2026-11-24 "내 정보·훈장 묶음"
//   · 글자 100%·412px 에서 첫 화면(하단 탭 위)에 훈장 카드 끝까지 보인다
//   · 360px·125% 에서 옆으로 넘치지 않는다
//   · 훈장 칸 ⓘ → 말풍선: 한 번에 하나, "알겠어요"·뒤로가기·바깥 누르기로 닫힘, 바깥 누르기는 뒤 줄을 누르지 않음, 칸 누르기(훈장 창)와 겹치지 않음
//   · 두 사람 순위 줄이 없고 "지난주와 비교" 줄이 있다

import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";

const FONT_STEP_125 = 8;

test("412px·100%: 첫 화면에 훈장 카드 끝까지, 순위 줄 대신 지난주 비교 줄", async ({ page }) => {
  // S21 의 실제 웹뷰 높이에 가깝게(상태 표시줄·탐색 막대를 뺀 높이)
  await page.setViewportSize({ width: 412, height: 840 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  const medal = page.getByRole("button", { name: "이번 주 불꽃 설명" });
  await expect(medal).toBeVisible();
  const m = await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll("p")).find((p) => p.textContent === "훈장");
    const card = sec && sec.nextElementSibling ? sec.nextElementSibling.getBoundingClientRect().bottom : 99999;
    const nav = document.querySelector("nav");
    const tabTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    return { card, tabTop };
  });
  expect(m.card).toBeLessThanOrEqual(m.tabTop);
  // 기록이 없는 첫 주 안내
  await expect(page.getByText("다음 주부터 지난주와 비교해 드립니다")).toBeVisible();
  await expect(page.getByText(" 나", { exact: true })).toHaveCount(0);
});

test("360px·125%: 옆으로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_125 });
  await openApp(page, "me");
  await expect(page.getByRole("button", { name: "모은 별 설명" })).toBeVisible();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(360);
});

test("훈장 설명 말풍선 — 하나씩, 알겠어요·뒤로가기·바깥 누르기로 닫힘", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 840 });
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  const apiBtn = page.getByRole("button", { name: "이번 주 불꽃 설명" });
  const starBtn = page.getByRole("button", { name: "모은 별 설명" });
  const apiBubble = page.getByRole("dialog", { name: "이번 주 불꽃 (열정 점수)" });
  const starBubble = page.getByRole("dialog", { name: "모은 별 (암기 성과)" });
  const medaliSheet = page.getByRole("dialog", { name: "훈장", exact: true });

  // ⓘ 는 칸 누르기(훈장 창)와 겹치지 않습니다
  await apiBtn.click();
  await expect(apiBubble).toBeVisible();
  await expect(medaliSheet).toHaveCount(0);
  await expect(apiBubble.getByText("매주 월요일에 0점부터 새로 시작합니다.", { exact: false })).toBeVisible();

  // 다른 칸의 ⓘ → 그 칸 설명으로 바뀜(한 번에 하나)
  await starBtn.click();
  await expect(starBubble).toBeVisible();
  await expect(apiBubble).toHaveCount(0);

  // 알겠어요
  await starBubble.getByRole("button", { name: "알겠어요" }).click();
  await expect(starBubble).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/me$"));

  // 뒤로가기 → 말풍선만 닫히고 화면은 그대로
  await apiBtn.click();
  await expect(apiBubble).toBeVisible();
  await page.goBack();
  await expect(apiBubble).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp("/me$"));
  await expect(apiBtn).toBeVisible();

  // 바깥 누르기 → 닫히고, 그 누르기로 뒤의 단추(회원 카드 → 구독 화면)가 눌리지 않음
  await apiBtn.click();
  await expect(apiBubble).toBeVisible();
  const plusCard = page.getByRole("button", { name: new RegExp("Kata kata Plus") });
  const pb = await plusCard.boundingBox();
  expect(pb).toBeTruthy();
  if (pb) await page.mouse.click(pb.x + 40, pb.y + pb.height / 2);
  await expect(apiBubble).toHaveCount(0);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(new RegExp("/me$"));
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 칸 자체를 누르면 예전처럼 훈장 창
  await page.getByRole("button", { name: new RegExp("열정 점수") }).click();
  await expect(medaliSheet).toBeVisible();
});
