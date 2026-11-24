// 관리자판 옵션 창(2026-11-24 옵션 창 통일 묶음 4)
//   · 설정 창이 아래 시트가 되고, 안의 확인 창은 폰 뒤로가기로 확인 창만 닫힘(예전에는 설정 창이 닫히고 확인 창이 남았음)
//   · 설정 창 안에서 연 CSV 가져오기 창이 설정 상자에 갇히지 않고 화면 바닥에 붙음
//   · 첫 진입 아이디 정하기 창은 X 가 없고 바깥 누르기·ESC 로 닫히지 않음
// 관리자판 = 예전 설교문 서버 설정이 남은 기기(src/lib/access.ts getEdition). 시험용 주소는 실제로 부르지 않습니다.

import type { Page } from "@playwright/test";
import { test, expect, openApp, seedStorage } from "../fixtures";

async function asAdmin(page: Page, extra: Record<string, string> = {}) {
  // 바깥 주소는 모두 막습니다(시험용 서버 주소·훈장 서버 등)
  await page.route(new RegExp("^https?://(?!127\\.0\\.0\\.1)"), (r) => r.abort());
  await seedStorage(page, { "sermon-base": "https://e2e.invalid", "sermon-key": "e2e-admin", ...extra });
}

test("아이디 정하기 — X 가 없고 바깥·ESC 로 닫히지 않으며, 시작하기로 닫힌다", async ({ page }) => {
  await asAdmin(page);
  await openApp(page, "");
  const sheet = page.getByRole("dialog", { name: "앱에서 사용할 아이디를 입력하세요" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "닫기", exact: true })).toHaveCount(0);
  await page.mouse.click(20, 40);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("textbox", { name: "아이디" }).fill("e2e1");
  await sheet.getByRole("button", { name: "시작하기", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("medali-my-id"))).toBe("e2e1");
});

test("설정 — 확인 창은 뒤로가기로 확인 창만 닫히고, 안에서 연 CSV 창은 화면 바닥에 붙는다", async ({ page }) => {
  await asAdmin(page, { "medali-my-id": "e2e1" });
  await openApp(page, "");
  await page.locator('button[title="설정"]:visible').first().click();
  const settings = page.getByRole("dialog", { name: "설정", exact: true });
  await expect(settings).toBeVisible();

  await settings.getByRole("button", { name: "저장된 읽기 음성 비우기" }).click();
  const confirm = page.getByRole("alertdialog", { name: "저장된 읽기 음성을 비우시겠습니까?" });
  await expect(confirm).toBeVisible();
  await page.goBack();
  await expect(confirm).toHaveCount(0);
  await expect(settings).toBeVisible();

  await settings.getByRole("button", { name: "CSV 가져오기 (단어 추가)" }).click();
  const csv = page.getByRole("dialog", { name: "CSV 가져오기", exact: true });
  await expect(csv).toBeVisible();
  const vh = page.viewportSize()?.height || 0;
  const b = await csv.boundingBox();
  expect(b).toBeTruthy();
  if (b) expect(Math.abs(b.y + b.height - vh)).toBeLessThanOrEqual(2);
  // 뒤로가기는 CSV 창만 닫음
  await page.goBack();
  await expect(csv).toHaveCount(0);
  await expect(settings).toBeVisible();
  await page.goBack();
  await expect(settings).toHaveCount(0);
});
