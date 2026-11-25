// 지난 카드 모아 보기(ARSIP KARTU) — 최근 1년·월 구분·분야 단추·작은 그림 보관(2026-11-25)
//   · 목록은 1년 치를 한 번에(limit=400) 받아 월마다 나눠 보임, 맨 아래 "최근 1년의 카드를 볼 수 있습니다."
//   · 분야 단추: 목록에 있는 분야만, 누르면 그 분야만. 카드를 열었다 돌아와도 고른 분야 그대로
//   · 목록을 넘겨 봐도 원본 그림은 쌓이지 않고 작은 그림만(thumbs), 카드를 열면 원본은 최근 60장만 남김
//   · 1년 지난 카드·그림은 이 기기에서도 지움
// 저장소 규칙: 정규식 리터럴을 쓰지 않습니다(new RegExp).

import * as fs from "fs";
import { fileURLToPath } from "url";
import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp } from "../fixtures";

const PUBLIC_HOST = "kata-public.cura4world.workers.dev";
const IMG_B64 = fs.readFileSync(fileURLToPath(new URL("../card-sample.png", import.meta.url))).toString("base64");

function kstDay(offset: number): string {
  return new Date(Date.now() + 9 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);
}

const CATS = ["음식", "지역", "속담", "기념일·시기"];
// 오늘부터 70일 — 적어도 석 달에 걸침. 분야는 차례로 돌림
const ITEMS = Array.from({ length: 70 }, (_, i) => ({
  d: kstDay(-i),
  chip: CATS[i % 4] === "기념일·시기" ? "영웅의 날" : CATS[i % 4],
  cat: CATS[i % 4],
  title: "카드 " + (i + 1) + "번",
  img: true,
}));
const OLD = kstDay(-400); // 1년 지난 날

function card(d: string, title: string) {
  return {
    d, chip: "음식", title, summary: "요약", body: ["본문 한 문단입니다."],
    phrase: { id: "Selamat pagi", ko: "좋은 아침" }, words: [{ id: "pagi", ko: "아침" }], img: true, event: false,
  };
}

async function fakeServer(page: Page, seen: { listQuery: string[] }) {
  await page.route("https://" + PUBLIC_HOST + "/**", (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const send = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (p === "/card/list") {
      seen.listQuery.push(url.search);
      const limit = Number(url.searchParams.get("limit")) || 30;
      return send(200, { today: kstDay(0), items: ITEMS.slice(0, limit), more: ITEMS.length > limit });
    }
    if (p === "/card/today") return send(200, { today: kstDay(0), card: card(kstDay(0), "카드 1번") });
    if (p.indexOf("/card/day/") === 0) {
      const d = p.slice(10);
      const it = ITEMS.find((e) => e.d === d);
      return it ? send(200, { card: card(d, it.title) }) : send(404, { error: "NOT_FOUND" });
    }
    if (p.indexOf("/card/img/") === 0) return route.fulfill({ status: 200, contentType: "text/plain", body: IMG_B64 });
    return send(404, { error: "NOT_FOUND" });
  });
}

async function storeKeys(page: Page, store: string): Promise<string[]> {
  return page.evaluate((s) => new Promise<string[]>((resolve) => {
    const req = indexedDB.open("kata-daily-card");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(s)) { db.close(); resolve([]); return; }
      const r = db.transaction(s, "readonly").objectStore(s).getAllKeys();
      r.onsuccess = () => { const k = (r.result as IDBValidKey[]).map(String); db.close(); resolve(k); };
    };
    req.onerror = () => resolve([]);
  }), store);
}

/** 앱이 쓰는 저장소(판 2)를 미리 만들어 원본 그림·작은 그림·카드를 넣어 둡니다 */
async function seedStore(page: Page, images: string[], extra: { card?: string; thumb?: string } = {}) {
  await page.evaluate(([imgs, oldCard, oldThumb]) => new Promise<void>((resolve) => {
    const req = indexedDB.open("kata-daily-card", 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cards")) db.createObjectStore("cards", { keyPath: "d" });
      if (!db.objectStoreNames.contains("images")) db.createObjectStore("images");
      if (!db.objectStoreNames.contains("thumbs")) db.createObjectStore("thumbs");
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(["cards", "images", "thumbs"], "readwrite");
      (imgs as string[]).forEach((d) => tx.objectStore("images").put(new Blob(["x"], { type: "image/png" }), d));
      if (oldCard) tx.objectStore("cards").put({ d: oldCard, chip: "음식", title: "오래된 카드", summary: "", body: [], phrase: { id: "", ko: "" }, words: [], img: false, event: false });
      if (oldThumb) tx.objectStore("thumbs").put(new Blob(["x"], { type: "image/jpeg" }), oldThumb as string);
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), [images, extra.card || "", extra.thumb || ""] as const);
}

const catBtn = (page: Page, name: string) => page.locator('[data-arsip-cat="' + name + '"]');

test("1년 치를 한 번에 받아 월마다 나누고, 분야 단추로 고르며, 돌아와도 고른 분야 그대로", async ({ page }) => {
  const seen = { listQuery: [] as string[] };
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "plus" });
  await fakeServer(page, seen);
  await openApp(page, "insight/cards");
  await expect(page.getByText("카드 1번", { exact: true })).toBeVisible();
  expect(seen.listQuery.some((q) => q.indexOf("limit=400") >= 0)).toBe(true);
  // 월 구분 — 70일이면 석 달 이상
  expect(await page.locator("[data-arsip-month]").count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-arsip-month="' + kstDay(0).slice(0, 7) + '"] h2')).toHaveText(
    kstDay(0).slice(0, 4) + "년 " + Number(kstDay(0).slice(5, 7)) + "월",
  );
  await expect(page.getByText("최근 1년의 카드를 볼 수 있습니다.", { exact: true })).toBeAttached();
  // 분야 단추 — 전체 + 목록에 있는 4개, 정해 둔 순서
  const names = await page.locator("[data-arsip-cat]").evaluateAll((els) => els.map((e) => e.getAttribute("data-arsip-cat")));
  expect(names).toEqual(["전체", "음식", "지역", "속담", "기념일·시기"]);
  await expect(catBtn(page, "전체")).toHaveAttribute("aria-pressed", "true");
  await catBtn(page, "지역").click();
  await expect(catBtn(page, "지역")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("카드 2번", { exact: true })).toBeVisible();
  await expect(page.getByText("카드 1번", { exact: true })).toHaveCount(0);
  const rows = page.locator("[data-arsip-month] button");
  expect(await rows.count()).toBe(ITEMS.filter((e) => e.cat === "지역").length);
  // 카드를 열었다 돌아와도 "지역" 그대로
  await page.getByText("카드 2번", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "카드 2번" })).toBeVisible();
  await page.goBack();
  await expect(catBtn(page, "지역")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("카드 1번", { exact: true })).toHaveCount(0);
  await catBtn(page, "전체").click();
  await expect(page.getByText("카드 1번", { exact: true })).toBeVisible();
});

test("목록은 작은 그림만 보관(원본은 쌓지 않음), 카드를 열면 원본은 최근 60장만, 1년 지난 것은 지움", async ({ page }) => {
  const seen = { listQuery: [] as string[] };
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "plus" });
  await fakeServer(page, seen);
  await openApp(page, "");
  // 원본 그림 65장(오래된 날짜들) + 1년 지난 카드·작은 그림
  const many = Array.from({ length: 65 }, (_, i) => kstDay(-100 - i));
  await seedStore(page, many, { card: OLD, thumb: OLD });
  await openApp(page, "insight/cards");
  await expect(page.getByText("카드 1번", { exact: true })).toBeVisible();
  // 보이는 줄의 작은 그림이 만들어짐 — 화면 가까이 온 것만(70줄 전부는 아님)
  await expect.poll(async () => (await storeKeys(page, "thumbs")).filter((k) => k >= kstDay(-69)).length).toBeGreaterThan(3);
  const thumbs = await storeKeys(page, "thumbs");
  expect(thumbs.length).toBeLessThan(ITEMS.length);
  // 목록만 넘겨서는 원본이 늘지 않음, 1년 지난 카드·작은 그림은 지워짐
  const imgs = await storeKeys(page, "images");
  expect(imgs.filter((k) => k >= kstDay(-69)).length).toBe(0);
  expect(thumbs.indexOf(OLD)).toBe(-1);
  expect((await storeKeys(page, "cards")).indexOf(OLD)).toBe(-1);
  // 작은 그림은 192px JPEG
  const thumbInfo = await page.evaluate(() => new Promise<{ type: string; w: number }>((resolve) => {
    const req = indexedDB.open("kata-daily-card");
    req.onsuccess = () => {
      const db = req.result;
      const r = db.transaction("thumbs", "readonly").objectStore("thumbs").getAll();
      r.onsuccess = () => {
        const b = (r.result as Blob[]).find((x) => x.type === "image/jpeg");
        db.close();
        if (!b) { resolve({ type: "", w: 0 }); return; }
        const u = URL.createObjectURL(b);
        const im = new Image();
        im.onload = () => resolve({ type: b.type, w: im.naturalWidth });
        im.src = u;
      };
    };
  }));
  expect(thumbInfo).toEqual({ type: "image/jpeg", w: 192 });
  // 카드를 열면 원본을 받아 두고, 원본은 최근 60장만 남음(가장 오래된 것부터 지움)
  await page.getByText("카드 1번", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "카드 1번" })).toBeVisible();
  await expect.poll(async () => (await storeKeys(page, "images")).indexOf(kstDay(0))).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => (await storeKeys(page, "images")).length).toBe(60);
  const after = (await storeKeys(page, "images")).sort();
  expect(after.indexOf(many[many.length - 1])).toBe(-1); // 가장 오래된 것은 지워짐
});
