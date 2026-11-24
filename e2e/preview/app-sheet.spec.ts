// 옵션 창 공통 틀(AppSheet) — 끌어 닫기·입력 중 보호·바닥 단추 고정 (2026-11-24 옵션 창 통일 묶음 0)
//   · 머리(손잡이·제목 줄)를 아래로 끌면 닫힘, 본문을 밀면 닫히지 않음
//   · 입력 창에 글을 넣었으면 끌기·바깥 누르기로 닫히지 않고 X 로만 닫힘
//   · 내용이 길어도 주 단추는 창 바닥에 붙어 있음

import fs from "node:fs";
import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp } from "../fixtures";

async function openAddWord(page: Page) {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "category/my-wordbook");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await page.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "단어 추가", exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** 창이 다 그려져(글꼴·내용이 늘어나) 머리 자리가 멈출 때까지 기다린 뒤의 위치 */
async function settledBox(page: Page, selector: string) {
  const h = page.locator(selector).first();
  let prev = "";
  for (let i = 0; i < 40; i++) {
    const b = await h.boundingBox();
    const key = b ? Math.round(b.y) + "," + Math.round(b.height) : "";
    if (b && key === prev) return b;
    prev = key;
    await page.waitForTimeout(100);
  }
  throw new Error("머리 자리가 멈추지 않음");
}

async function dragHeader(page: Page, dy: number) {
  const b = await settledBox(page, "[data-sheet-drag]");
  const x = b.x + b.width / 2 - 40;
  const y = b.y + 30;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x, y + (dy * i) / 8);
  await page.mouse.up();
}

test("빈 입력 창은 머리를 끌어 내리면 닫힌다", async ({ page }) => {
  const sheet = await openAddWord(page);
  await dragHeader(page, 220);
  await expect(sheet).toHaveCount(0);
});

test("본문을 밀어도 창은 닫히지 않는다(스크롤만)", async ({ page }) => {
  const sheet = await openAddWord(page);
  await settledBox(page, "[data-sheet-drag]");
  const b = await sheet.getByText("인도네시아어", { exact: true }).first().boundingBox();
  if (!b) throw new Error("본문 없음");
  // 누른 곳이 정말 본문(머리 밖)인지 확인
  const inHeader = await page.evaluate(({ x, y }) => !!(document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-sheet-drag]"), { x: b.x + 10, y: b.y + 5 });
  expect(inHeader).toBe(false);
  await page.mouse.move(b.x + 10, b.y + 5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + 10, b.y + 5 + 25 * i);
  await page.mouse.up();
  await expect(sheet).toBeVisible();
});

test("글을 넣은 입력 창은 끌기·바깥 누르기로 닫히지 않고 X 로만 닫힌다", async ({ page }) => {
  const sheet = await openAddWord(page);
  await sheet.locator("input").first().fill("makan");
  await dragHeader(page, 260);
  await expect(sheet).toBeVisible();
  await page.mouse.click(20, 40); // 바깥(어두운 배경)
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(sheet).toHaveCount(0);
});

test("주 단추는 창 바닥에 붙어 있다(글자 125%, 360px)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setupPreview(page, { tier: "plus", fontStep: 8 });
  await openApp(page, "category/my-wordbook");
  await page.getByRole("button", { name: "추가하기", exact: true }).click();
  await page.getByRole("menuitem").filter({ hasText: "단어 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "단어 추가", exact: true });
  await expect(sheet).toBeVisible();
  const btn = sheet.getByRole("button", { name: "추가하기" });
  const bb = await btn.boundingBox();
  const sb = await sheet.boundingBox();
  expect(bb && sb).toBeTruthy();
  if (bb && sb) {
    // 바닥 여백(16px + 안전 여백 0) 안에 단추 아래 끝이 있음
    expect(sb.y + sb.height - (bb.y + bb.height)).toBeLessThanOrEqual(20);
    expect(bb.y).toBeGreaterThanOrEqual(sb.y);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

// ── 묶음 1(고르기): "완료 = 적용, X·바깥·뒤로가기 = 바꾼 것 버림" 으로 동작이 바뀐 창 ──

test("볼 문장 고르기 — X 는 바꾼 것을 버리고, 완료를 눌러야 적용", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "");
  const kindsNow = () => page.evaluate(() => localStorage.getItem("phrase-kinds"));
  const before = await kindsNow();
  const open = async () => {
    await page.locator('button[aria-label="문장 종류 고르기"]:visible').first().click();
    const s = page.getByRole("dialog", { name: "볼 문장을 고르세요", exact: true });
    await expect(s).toBeVisible();
    return s;
  };
  let sheet = await open();
  const row = sheet.getByRole("checkbox", { name: new RegExp("회화집") });
  const was = await row.getAttribute("aria-checked");
  await row.click();
  await expect(row).toHaveAttribute("aria-checked", was === "true" ? "false" : "true");
  expect(await kindsNow()).toBe(before); // 체크만으로는 저장하지 않음
  await sheet.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  expect(await kindsNow()).toBe(before);
  sheet = await open();
  await expect(sheet.getByRole("checkbox", { name: new RegExp("회화집") })).toHaveAttribute("aria-checked", was || "false");
  await sheet.getByRole("checkbox", { name: new RegExp("회화집") }).click();
  await sheet.getByRole("button", { name: "완료", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  expect(await kindsNow()).not.toBe(before);
});

test("글자 크기 — 고르는 동안 미리 보이고, X 는 원래 크기로, 완료는 저장", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "me");
  const rootPx = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  const saved = () => page.evaluate(() => localStorage.getItem("app-font-scale-step"));
  const px0 = await rootPx();
  const step0 = await saved();
  await page.getByText("글자 크기", { exact: true }).first().click();
  let sheet = page.getByRole("dialog", { name: new RegExp("^글자 크기") });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "글자 크게" }).click();
  expect(await rootPx()).not.toBe(px0); // 미리 보기
  await sheet.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  expect(await rootPx()).toBe(px0); // 원래 크기로
  expect(await saved()).toBe(step0);
  await page.getByText("글자 크기", { exact: true }).first().click();
  sheet = page.getByRole("dialog", { name: new RegExp("^글자 크기") });
  await sheet.getByRole("button", { name: "글자 크게" }).click();
  await sheet.getByRole("button", { name: "완료", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  expect(await rootPx()).not.toBe(px0);
  expect(await saved()).not.toBe(step0);
});

test("고르기 줄 — 화면 낭독용 묶음(radiogroup·group)과 선택 여부(checked)", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "me");
  await page.getByText("읽기 음성", { exact: true }).first().click();
  const sheet = page.getByRole("dialog", { name: "읽기 음성", exact: true });
  await expect(sheet).toBeVisible();
  const group = sheet.getByRole("radiogroup", { name: "읽기 음성" });
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  const unchecked = group.getByRole("radio", { checked: false }).first();
  const name = await unchecked.textContent();
  await unchecked.click();
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(group.getByRole("radio", { checked: true })).toHaveText(name || "");
  await sheet.getByRole("button", { name: "닫기", exact: true }).click();

  await openApp(page, "");
  await page.locator('button[aria-label="문장 종류 고르기"]:visible').first().click();
  const kinds = page.getByRole("dialog", { name: "볼 문장을 고르세요", exact: true }).getByRole("group", { name: "볼 문장 종류" });
  await expect(kinds.getByRole("checkbox", { checked: true }).first()).toBeVisible();
});

// ── 묶음 2(확인): 아래 시트 확인 창 — 대상 이름 굵게, X·취소 = 그대로, 빨간 주 단추 = 실행 ──

test("단어장 삭제 확인 — 이름 굵게, X 는 취소, 삭제를 눌러야 지움", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "");
  await page.evaluate(() => {
    const cats = JSON.parse(localStorage.getItem("kata-categories") || "[]");
    cats.push({ id: "cat_e2e_trip", name: "여행 단어", emoji: "✈️" });
    localStorage.setItem("kata-categories", JSON.stringify(cats));
  });
  const hasCat = () => page.evaluate(() => JSON.parse(localStorage.getItem("kata-categories") || "[]").some((c: { id: string }) => c.id === "cat_e2e_trip"));
  await openApp(page, "category/cat_e2e_trip");
  const openConfirm = async () => {
    await page.getByRole("button", { name: "더 보기" }).click();
    await page.getByText("단어장 삭제", { exact: true }).first().click();
    const d = page.getByRole("alertdialog", { name: "단어장 삭제" });
    await expect(d).toBeVisible();
    return d;
  };
  let d = await openConfirm();
  await expect(d.locator("b", { hasText: "여행 단어" })).toBeVisible();
  await d.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(await hasCat()).toBe(true);
  d = await openConfirm();
  await d.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect.poll(hasCat).toBe(false);
});

// ── 묶음 3(안내): 지도 사진 크게 보기 — 폰 뒤로가기는 사진만 닫고 지역 시트는 그대로(예전에는 시트가 닫히고 사진이 남았음) ──

test("지도 사진 크게 보기 — 뒤로가기는 사진만 닫는다", async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  // 사진은 바깥 주소(wikimedia)라 시험에서는 앱에 있는 그림으로 대신 줍니다
  const png = fs.readFileSync("e2e/card-sample.png");
  await page.route("**/upload.wikimedia.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png }));
  await openApp(page, "map");
  const pin = await page.waitForFunction(() => {
    const g = document.querySelector('g[data-pin-id="Jakarta"]') as SVGGElement | null;
    if (!g || getComputedStyle(g).opacity === "0") return null;
    const r = g.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const p = (await pin.jsonValue()) as { x: number; y: number };
  await page.mouse.click(p.x, p.y);
  const sheet = page.getByRole("dialog", { name: "자카르타" });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(600); // 열린 직후 0.5초는 시트 안 누름을 무시함
  await sheet.locator("img[alt$='사진 1']").click();
  await expect(page.getByAltText("확대 사진")).toBeVisible();
  await page.goBack();
  await expect(page.getByAltText("확대 사진")).toHaveCount(0);
  await expect(sheet).toBeVisible();
});
