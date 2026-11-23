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
  const res = await page.request.get("audio/taste/dasar-kenalan-r2/all.mp3");
  expect(res.status()).toBe(200);
  // MP3: ID3 머리 또는 프레임 동기(0xFFE…)로 시작 (2026-11-24 WAV → MP3)
  const b = await res.body();
  const isMp3 = b.slice(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
  expect(isMp3).toBe(true);
  // 옛 WAV 는 지웠으므로 더는 WAV 가 오지 않는다(테스트 서버는 없는 주소에 앱 첫 화면을 200 으로 주므로 상태 대신 내용으로 본다)
  const old = await page.request.get("audio/taste/dasar-kenalan-r2/all.wav");
  expect((await old.body()).slice(0, 4).toString("ascii")).not.toBe("RIFF");
});

test("무료 — 맛보기가 아닌 기본 장면 주소로 오면 회화집 목록으로", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await openApp(page, "percakapan/dasar-perkenalan-diri");
  await expect.poll(() => appPath(page)).not.toBe("/percakapan/dasar-perkenalan-diri");
});
