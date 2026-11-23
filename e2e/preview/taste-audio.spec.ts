// 무료 맛보기 회화(01 처음 만나 인사) — 앱에 담긴 음성 파일로 듣기 (2026-11-23 D4)
//   무료도 이 장면에는 '전체 듣기'·문장 듣기 단추가 보이고, 음성 파일이 앱 주소에서 열립니다.
//   다른 기본 장면은 무료에게 열리지 않습니다(목록으로 돌아감).

import { test, expect, setupPreview, openApp, appPath } from "../fixtures";

test("무료 — 맛보기 장면은 본문과 듣기 단추가 보이고, 음성 파일이 열린다", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "percakapan/dasar-kenalan");
  await expect(page.getByRole("heading", { name: "처음 만나 인사" })).toBeVisible();
  await expect(page.getByRole("button", { name: "전체 듣기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "이 문장 듣기" }).first()).toBeVisible();
  const res = await page.request.get("audio/taste/dasar-kenalan-r2/all.wav");
  expect(res.status()).toBe(200);
  expect((await res.body()).slice(0, 4).toString("ascii")).toBe("RIFF");
});

test("무료 — 맛보기가 아닌 기본 장면 주소로 오면 회화집 목록으로", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "percakapan/dasar-perkenalan-diri");
  await expect.poll(() => appPath(page)).not.toBe("/percakapan/dasar-perkenalan-diri");
});
