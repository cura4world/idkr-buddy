// Plus 가 끝난 뒤 만든 것 — 읽기 전용 원칙 + 새 단어장 만들기는 Plus (2026-11-24 사용자 결정)
//   · 무료: 단어장을 새로 만드는 길(+ 메뉴 "단어장 만들기"·담을 단어장 창 "새 단어장 만들기"·내 단어장 "묶기")은 자물쇠 → 공용 잠금 안내 창
//   · 무료: 이미 만든 단어장은 열리고 단어를 담을 수 있음. 직접 만든 대화·지난 이야기는 글이 열리고 듣기는 잠김
//   · Plus: 단어장 만들기 열림
//   · 미리 알림 문장: Plus 화면 혜택 아래, 내 정보 구독 관리 아래

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, appPath, FONT_STEP_100 } from "../fixtures";
import { MY_BOOK, MY_SCENE, MY_STORY, seedMyScene, seedMyStory, seedMyWordbook, seedMyWordbookWords } from "../madeByMe";

const LOCK_MAKE = "단어장 만들기는 Plus 회원 기능입니다";
const LOCK_LISTEN = "듣기는 Plus 회원 기능입니다";
const KEEP = "Plus가 끝나도 만든 단어장·대화·이야기는 그대로 남아 읽을 수 있습니다. 새로 만들기와 듣기는 Plus에서 할 수 있습니다.";

const lockImg = (scope: ReturnType<Page["locator"]>) => scope.getByRole("img", { name: "잠김", exact: true });

async function openPlusMenu(page: Page) {
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  const menu = page.getByRole("menu", { name: "추가하기" });
  await expect(menu).toBeVisible();
  return menu;
}

/**
 * 이야기에서 단어를 눌러 담기 창을 띄운 뒤 "담을 단어장 고르기".
 * 무료는 맛보기 이야기, Plus 는 맛보기가 보이지 않으므로 넣어 둔 지난 이야기(seedMyStory)를 씁니다.
 */
async function openPicker(page: Page, plus = false) {
  await openApp(page, "story");
  await page.getByText(plus ? MY_STORY.title : "Nasi Goreng Ibu").first().click();
  await page.getByText(plus ? "pasar" : "terkenal", { exact: true }).first().click();
  await page.getByRole("button", { name: "담을 단어장 고르기" }).click();
  const picker = page.getByRole("dialog", { name: "담을 단어장을 고르세요" });
  await expect(picker).toBeVisible();
  return picker;
}

test("무료 — 내 단어장 + 메뉴의 단어장 만들기는 자물쇠, 누르면 잠금 안내(만들기 시트는 안 열림)", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "category/my-wordbook");
  const menu = await openPlusMenu(page);
  const make = menu.getByRole("menuitem").filter({ hasText: "단어장 만들기" });
  await expect(lockImg(make)).toHaveCount(1);
  await expect(lockImg(menu.getByRole("menuitem").filter({ hasText: "단어 추가" }))).toHaveCount(0);
  await make.click();
  await expect(page.getByRole("dialog", { name: LOCK_MAKE })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "단어장 만들기", exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("dialog", { name: LOCK_MAKE })).toHaveCount(0);
  expect(appPath(page)).toBe("/category/my-wordbook");
});

test("무료 — 담을 단어장 창: 기존 단어장 고르기는 그대로, 새 단어장 만들기만 잠금", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyWordbook(page);
  let picker = await openPicker(page);
  const make = picker.getByRole("button", { name: "새 단어장 만들기" });
  await expect(lockImg(make)).toHaveCount(1);
  // 직접 만든 단어장을 고르면 그곳이 담을 곳이 됨(시험 빌드는 뜻을 받아 오지 않아 실제 담기 단추는 누르지 않음 —
  // 단어를 넣는 것은 아래 "이미 만든 단어장 … 단어 추가" 시험이 봅니다)
  await picker.getByText(MY_BOOK.name, { exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole("button", { name: MY_BOOK.name + "에 담기" })).toBeVisible();

  // 다시 열어 새 단어장 만들기 → 잠금 안내(단어장 만들기 시트는 안 열림)
  await page.getByRole("button", { name: "담을 단어장 고르기" }).click();
  picker = page.getByRole("dialog", { name: "담을 단어장을 고르세요" });
  await expect(picker).toBeVisible();
  await picker.getByRole("button", { name: "새 단어장 만들기" }).click();
  await expect(page.getByRole("dialog", { name: LOCK_MAKE })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "단어장 만들기", exact: true })).toHaveCount(0);
});

test("무료 — 내 단어장 '묶기'(새 단어장을 만드는 길)도 잠금 안내", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyWordbookWords(page, 30);
  await openApp(page, "category/my-wordbook");
  const bundle = page.getByRole("button", { name: "묶기", exact: false }).first();
  await expect(bundle).toBeVisible();
  await expect(lockImg(bundle)).toHaveCount(1);
  await bundle.click();
  await expect(page.getByRole("dialog", { name: LOCK_MAKE })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "단어장으로 묶기" })).toHaveCount(0);
});

test("무료 — 이미 만든 단어장은 열리고 단어 추가도 됨", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyWordbook(page);
  await openApp(page, "category/" + MY_BOOK.id);
  await expect(page.getByText("pantai", { exact: true }).first()).toBeVisible();
  const menu = await openPlusMenu(page);
  await menu.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  await expect(page.getByRole("dialog", { name: "단어 추가", exact: true })).toBeVisible();
});

test("Plus — 단어장 만들기 두 길 모두 열림(자물쇠 없음)", async ({ page }) => {
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "category/my-wordbook");
  const menu = await openPlusMenu(page);
  const make = menu.getByRole("menuitem").filter({ hasText: "단어장 만들기" });
  await expect(lockImg(make)).toHaveCount(0);
  await make.click();
  await expect(page.getByRole("dialog", { name: "단어장 만들기", exact: true })).toBeVisible();
  await page.goBack();

  await seedMyStory(page);
  const picker = await openPicker(page, true);
  const make2 = picker.getByRole("button", { name: "새 단어장 만들기" });
  await expect(lockImg(make2)).toHaveCount(0);
  await make2.click();
  await expect(page.getByRole("dialog", { name: "단어장 만들기", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: LOCK_MAKE })).toHaveCount(0);
});

test("무료 — 직접 만든 대화: 글은 열리고 듣기는 잠김", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyScene(page);
  // 주제 목록: 직접 만든 대화가 든 '일상생활'은 자물쇠 없음
  await openApp(page, "percakapan");
  const row = page.locator("[data-percakapan-topics] > button").filter({ hasText: "일상생활" });
  await expect(lockImg(row)).toHaveCount(0);

  await openApp(page, "percakapan/" + MY_SCENE.id);
  await expect(page.getByText("Selamat pagi, Bu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "이 문장 듣기" })).toHaveCount(0);
  const all = page.getByRole("button", { name: "전체 듣기 (Plus 회원 기능)" });
  await expect(lockImg(all)).toHaveCount(1);
  await all.click();
  await expect(page.getByRole("dialog", { name: LOCK_LISTEN })).toBeVisible();
  expect(appPath(page)).toBe("/percakapan/" + MY_SCENE.id);
});

test("Plus — 직접 만든 대화는 듣기 단추가 그대로", async ({ page }) => {
  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyScene(page);
  await openApp(page, "percakapan/" + MY_SCENE.id);
  await expect(page.getByText("Selamat pagi, Bu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "이 문장 듣기" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "전체 듣기 (Plus 회원 기능)" })).toHaveCount(0);
});

test("무료 — 지난 이야기: 글은 열리고 듣기는 잠김", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seedMyStory(page);
  await openApp(page, "story");
  await expect(page.getByText("지난 이야기", { exact: true })).toBeVisible();
  await page.getByText(MY_STORY.title).first().click();
  await expect(page.getByText("Setiap", { exact: true }).first()).toBeVisible();
  const listen = page.getByRole("button", { name: "듣기 (Plus 회원 기능)" });
  await expect(listen).toBeVisible();
  await listen.click();
  await expect(page.getByRole("dialog", { name: LOCK_LISTEN })).toBeVisible();
});

test("미리 알림 문장 — Plus 화면 혜택 아래, 내 정보 구독 관리 아래(Plus 등급)", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "plus");
  await expect(page.locator("[data-keep-creations]")).toHaveText(KEEP);

  await setupPreview(page, { tier: "plus", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  const note = page.locator("[data-keep-creations]");
  await expect(note).toHaveText(KEEP);
  // 구독 관리 줄 바로 아래
  const manage = await page.getByText("구독 관리", { exact: true }).boundingBox();
  const nb = await note.boundingBox();
  expect(manage && nb).toBeTruthy();
  if (manage && nb) expect(nb.y).toBeGreaterThan(manage.y);
});

test("무료 — 내 정보에는 미리 알림 문장이 없음(구독 관리 줄이 없음)", async ({ page }) => {
  await setupPreview(page, { tier: "free", fontStep: FONT_STEP_100 });
  await openApp(page, "me");
  await expect(page.getByText("회원", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-keep-creations]")).toHaveCount(0);
});
