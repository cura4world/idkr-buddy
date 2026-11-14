// 일반 빌드(GitHub Pages 에 올라가는 것)를 키 없는 브라우저로 열면 앱 대신 안내 화면이 뜹니다
// (src/components/WebGate.tsx, 2026-11-14 결정 E-01). 회원키도 예전 설정도 없는 새 브라우저 = 빈 localStorage.

import { test, expect, openApp, expectNoHorizontalOverflow, seedStorage, FONT_STEP_KEY, FONT_BASE_KEY, FONT_BASE_VER, FONT_STEP_115 } from "../fixtures";
import { PLAY_STORE_URL, PRIVACY_URL, TERMS_URL } from "../../src/lib/platform";

const LEAD_1 = "Kata kata는 Google Play 앱으로";
const LEAD_2 = "이용할 수 있습니다.";
const SUB = "인도네시아어를 단어부터 문장까지. 사전·단어장·이야기·회화집을 한곳에서.";

test("키 없는 브라우저 — 안내 문구와 약관·방침 링크, 앱 화면은 없음", async ({ page }) => {
  await openApp(page, "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kata kata.");
  await expect(page.getByText(LEAD_1, { exact: true })).toBeVisible();
  await expect(page.getByText(LEAD_2, { exact: true })).toBeVisible();
  await expect(page.getByText(SUB, { exact: true })).toBeVisible();

  await expect(page.getByRole("link", { name: "이용약관", exact: true })).toHaveAttribute("href", TERMS_URL);
  await expect(page.getByRole("link", { name: "개인정보처리방침", exact: true })).toHaveAttribute("href", PRIVACY_URL);

  // Play 주소가 정해지기 전에는 "받기" 버튼이 없습니다(platform.ts PLAY_STORE_URL)
  await expect(page.getByRole("link", { name: "Google Play에서 받기" })).toHaveCount(PLAY_STORE_URL ? 1 : 0);

  // 앱 화면(홈·하단 탭·미리보기 손잡이)은 그려지지 않습니다
  await expect(page.getByText("BAHASA HARI INI")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toHaveCount(0);
  await expect(page.locator("[data-preview-tab]")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "안내 화면");
});

test("키 없는 브라우저 — 어느 주소로 들어와도 안내 화면", async ({ page }) => {
  for (const path of ["wordbooks", "bible", "sermon", "plus", "insight/overview"]) {
    await openApp(page, path);
    await expect(page.getByText(LEAD_1, { exact: true }), "/" + path).toBeVisible();
    await expect(page.getByRole("button", { name: "회원키가 있습니다" })).toBeVisible();
  }
});

test("\"회원키가 있습니다\" 를 누르면 입력칸", async ({ page }) => {
  await openApp(page, "");
  await expect(page.getByLabel("회원키", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "회원키가 있습니다" }).click();

  const input = page.getByLabel("회원키", { exact: true });
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("KK-");
  await expect(input).toHaveAttribute("placeholder", "KK-XXXX-XXXX-XXXX");
  await expect(input).toBeFocused();
  const ok = page.getByRole("button", { name: "확인", exact: true });
  await expect(ok).toBeDisabled();
  await expect(page.getByRole("button", { name: "회원키가 있습니다" })).toHaveCount(0);

  // 17자를 다 채워야 확인 버튼이 켜집니다. 서버에는 닿지 않으므로(네트워크 끊음) 연결 실패 안내가 나옵니다.
  await input.fill("KK-ABCD-EFGH-JKLM");
  await expect(input).toHaveValue("KK-ABCD-EFGH-JKLM");
  await expect(ok).toBeEnabled();
  await ok.click();
  await expect(page.getByRole("status")).toHaveText("서버와 연결하지 못했습니다. 인터넷을 확인해 주세요");
  // 실패해도 안내 화면 그대로
  await expect(page.getByText(LEAD_1, { exact: true })).toBeVisible();
  // 약관 링크는 입력칸 아래에 그대로 있습니다
  await expect(page.getByRole("link", { name: "이용약관", exact: true })).toBeVisible();
});

test("안내 화면 — 360px · 글자 115% 에서 넘침 없음, 입력칸이 화면 안", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const kv: Record<string, string> = {};
  kv[FONT_STEP_KEY] = String(FONT_STEP_115);
  kv[FONT_BASE_KEY] = FONT_BASE_VER;
  await seedStorage(page, kv);
  await openApp(page, "");
  await expectNoHorizontalOverflow(page, "안내 화면 115%");
  await page.getByRole("button", { name: "회원키가 있습니다" }).click();
  const input = page.getByLabel("회원키", { exact: true });
  await expect(input).toBeVisible();
  await expectNoHorizontalOverflow(page, "안내 화면 115% 입력칸");
  const ib = await input.boundingBox();
  const ob = await page.getByRole("button", { name: "확인", exact: true }).boundingBox();
  expect(ib).not.toBeNull();
  expect(ob).not.toBeNull();
  if (ib && ob) {
    expect(ib.x).toBeGreaterThanOrEqual(0);
    expect(ib.x + ib.width).toBeLessThanOrEqual(ob.x);
    expect(ob.x + ob.width).toBeLessThanOrEqual(360);
    expect(ob.y + ob.height).toBeLessThanOrEqual(640);
  }
});
