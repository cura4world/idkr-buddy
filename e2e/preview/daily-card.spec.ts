// 오늘의 카드 (인도네시아 이해 맨 위, 2026-11-17) — 서버(/card/*)를 흉내 내 화면만 봅니다.
//   · Plus: 허브 맨 위 카드 → 안쪽 화면(제목·본문·한 마디·관련 단어·지난 카드) → 지난 카드 모아 보기
//   · 무료: 카드는 보이고, 누르면 구독 화면
//   · 서버에 못 닿으면 카드 구역(제목 포함)이 그려지지 않음
//   · 예전 생활 정보 주소(/insight/tips)는 지난 카드로
// 저장소 규칙: 정규식 리터럴을 쓰지 않습니다(new RegExp).

import * as fs from "fs";
import { fileURLToPath } from "url";
import { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath } from "../fixtures";

const PUBLIC_HOST = "kata-public.cura4world.workers.dev";
const IMG_B64 = fs.readFileSync(fileURLToPath(new URL("../card-sample.png", import.meta.url))).toString("base64");

function kstDay(offset: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);
}

const TODAY = kstDay(0);
const YESTERDAY = kstDay(-1);
const BEFORE = kstDay(-2);

function card(d: string, title: string, img: boolean) {
  return {
    d,
    chip: "음식",
    title,
    summary: "고기완자 국수 박소는 집 앞까지 오는 수레에서 사 먹는 일이 흔합니다.",
    body: [
      "박소(bakso)는 다진 고기를 동그랗게 빚어 국물에 넣은 음식입니다.",
      "수레를 끄는 상인이 그릇을 두드리며 동네를 돕니다.",
    ],
    phrase: { id: "Bakso satu, ya!", ko: "박소 하나 주세요!" },
    words: [
      { id: "bakso", ko: "고기완자" },
      { id: "gerobak", ko: "수레" },
    ],
    img,
    event: false,
  };
}

async function fakeServer(page: Page, opts: { down?: boolean } = {}) {
  await page.route("https://" + PUBLIC_HOST + "/**", (route) => {
    if (opts.down) return route.abort();
    const url = new URL(route.request().url());
    const p = url.pathname;
    const send = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (p === "/card/today") return send(200, { today: TODAY, card: card(TODAY, "동네를 도는 박소 수레", true) });
    if (p === "/card/day/" + YESTERDAY) return send(200, { card: card(YESTERDAY, "르바란엔 끄뚜빳", false) });
    if (p === "/card/day/" + TODAY) return send(200, { card: card(TODAY, "동네를 도는 박소 수레", true) });
    if (p === "/card/list") {
      const items = [
        { d: TODAY, chip: "음식", title: "동네를 도는 박소 수레", img: true },
        { d: YESTERDAY, chip: "르바란", title: "르바란엔 끄뚜빳", img: false },
        { d: BEFORE, chip: "자연", title: "코모도왕도마뱀", img: true },
      ];
      const before = url.searchParams.get("before") || "";
      return send(200, { today: TODAY, items: items.filter((e) => !before || e.d < before), more: false });
    }
    if (p.indexOf("/card/img/") === 0) return route.fulfill({ status: 200, contentType: "text/plain", body: IMG_B64 });
    return send(404, { error: "NOT_FOUND" });
  });
}

test("Plus — 허브 맨 위 카드 → 안쪽 화면 → 지난 카드", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await fakeServer(page);
  await openApp(page, "insight");
  await expect(page.getByText("오늘의 인도네시아", { exact: true })).toBeVisible();
  const cardBtn = page.getByRole("button", { name: new RegExp("동네를 도는 박소 수레") });
  await expect(cardBtn).toBeVisible();
  await expect(page.getByText("Bakso satu, ya!", { exact: true })).toBeVisible();
  // 예전 생활 정보 자리
  await expect(page.getByText("지난 카드 모아 보기", { exact: true })).toBeVisible();
  await expect(page.getByText("문화와 생활 정보", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/daily-card-hub.png", fullPage: false });

  await cardBtn.click();
  await expect.poll(() => appPath(page)).toBe("/insight/card/" + TODAY);
  await expect(page.getByRole("heading", { name: "동네를 도는 박소 수레" })).toBeVisible();
  await expect(page.getByText("관련 단어", { exact: true })).toBeVisible();
  await expect(page.getByText("gerobak", { exact: true })).toBeVisible();
  await expect(page.getByText("지난 카드", { exact: true })).toBeVisible();
  await expect(page.getByText("르바란엔 끄뚜빳", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/daily-card-detail.png", fullPage: true });

  await page.getByRole("button", { name: new RegExp("지난 카드 모두 보기") }).click();
  await expect.poll(() => appPath(page)).toBe("/insight/cards");
  await expect(page.getByText("코모도왕도마뱀", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/daily-card-archive.png", fullPage: false });
  await page.getByRole("button", { name: new RegExp("르바란엔 끄뚜빳") }).click();
  await expect.poll(() => appPath(page)).toBe("/insight/card/" + YESTERDAY);
  await expect(page.getByRole("heading", { name: "르바란엔 끄뚜빳" })).toBeVisible();
});

// 2026-11-23 맛보기: 카드(그림·제목)는 보이고, 누르면 공용 안내 창 — "자세히 보기"를 눌러야 구독 화면
test("무료 — 카드는 보이고, 누르면 안내 창을 거쳐 구독 화면", async ({ page }) => {
  await setupPreview(page, { tier: "free" });
  await fakeServer(page);
  await openApp(page, "insight");
  const cardBtn = page.getByRole("button", { name: new RegExp("동네를 도는 박소 수레") });
  await expect(cardBtn).toBeVisible();
  await cardBtn.click();
  const sheet = page.getByRole("dialog", { name: "오늘의 카드 자세히 보기는 Plus 회원 기능입니다" });
  await expect(sheet).toBeVisible();
  expect(appPath(page)).toBe("/insight");
  // 허브 위쪽 귤색 Plus 상자에도 같은 글자의 버튼이 있어 창 안의 것으로 좁힙니다
  await sheet.getByRole("button", { name: "Plus 자세히 보기" }).click();
  await expect.poll(() => appPath(page)).toBe("/plus");
});

test("서버에 못 닿으면 카드 구역을 그리지 않음 · 예전 생활 정보 주소는 지난 카드로", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await fakeServer(page, { down: true });
  await openApp(page, "insight");
  await expect(page.getByText("한눈에 보기", { exact: true })).toBeVisible();
  await expect(page.getByText("오늘의 인도네시아", { exact: true })).toHaveCount(0);
  await openApp(page, "insight/tips");
  await expect.poll(() => appPath(page)).toBe("/insight/cards");
});
