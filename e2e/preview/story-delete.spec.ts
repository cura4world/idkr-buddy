// 오늘의 이야기 — 지난 이야기 길게 눌러 삭제(2026-11-25)
//   · 0.6초 길게 누르면 공용 ConfirmSheet "이야기 삭제"(이야기 제목 + "지운 이야기는 되돌릴 수 없습니다.")
//   · 취소하면 그대로, 삭제하면 목록에서 사라지고 다시 열어도 없음, 그 이야기의 읽기 음성 캐시도 함께 지움(다른 이야기 것은 그대로)
//   · 짧게 누르면 지금처럼 이야기가 열림, 길게 누른 뒤 손을 떼도 열리지 않음
//   · 맛보기 이야기는 길게 눌러도 창 없음

import type { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp, FONT_STEP_100 } from "../fixtures";

const S1 = { id: "e2e-s1", title: "Pasar Pagi di Kampung" };
const S2 = { id: "e2e-s2", title: "Hujan di Bulan November" };

async function seed(page: Page) {
  await page.evaluate(([s1, s2]) => new Promise<void>((resolve) => {
    const req = indexedDB.open("kata-stories", 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore("stories", { keyPath: "id" });
      s.createIndex("createdAt", "createdAt", { unique: false });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("stories", "readwrite");
      const st = tx.objectStore("stories");
      st.put({ id: s1.id, createdAt: Date.now() - 86400000, title: s1.title, titleKo: "마을의 아침 시장", category: "일상생활", difficulty: "하", indonesian: "Setiap pagi ada pasar.", korean: "아침마다 시장이 섭니다.", background: [] });
      st.put({ id: s2.id, createdAt: Date.now() - 2 * 86400000, title: s2.title, titleKo: "11월의 비", category: "날씨·자연", difficulty: "중", indonesian: "Hujan turun setiap sore.", korean: "오후마다 비가 옵니다.", background: [] });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), [S1, S2]);
  // 읽기 음성 캐시(공용 TTS) — 두 이야기 것을 하나씩
  await page.evaluate(([a, b]) => new Promise<void>((resolve) => {
    const req = indexedDB.open("kata-tts-audio", 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore("audio", { keyPath: "key" });
      s.createIndex("savedAt", "savedAt", { unique: false });
    };
    req.onsuccess = () => {
      const db = req.result;
      const name = db.objectStoreNames.contains("audio") ? "audio" : db.objectStoreNames[0];
      const tx = db.transaction(name, "readwrite");
      tx.objectStore(name).put({ key: "story-v2-" + a + "::v=Kore::0/1", dataUrl: "data:,", savedAt: 1 });
      tx.objectStore(name).put({ key: "story-v2-" + b + "::v=Kore::0/1", dataUrl: "data:,", savedAt: 2 });
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }), [S1.id, S2.id]);
}

async function ttsKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve) => {
    const req = indexedDB.open("kata-tts-audio", 1);
    req.onsuccess = () => {
      const db = req.result;
      const name = db.objectStoreNames[0];
      const r = db.transaction(name, "readonly").objectStore(name).getAllKeys();
      r.onsuccess = () => { const k = (r.result as string[]).slice(); db.close(); resolve(k); };
    };
  }));
}

async function longPress(page: Page, text: string) {
  const el = page.getByText(text, { exact: true }).first();
  const b = (await el.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
}

const sheet = (page: Page) => page.getByRole("alertdialog", { name: "이야기 삭제" });

async function openList(page: Page, tier: "plus" | "free") {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier, fontStep: FONT_STEP_100 });
  await openApp(page, "");
  await seed(page);
  await openApp(page, "story");
  await expect(page.getByText("지난 이야기", { exact: true })).toBeVisible();
}

test("길게 누르면 확인 창 — 취소하면 그대로, 손을 떼도 이야기가 열리지 않음", async ({ page }) => {
  await openList(page, "plus");
  await longPress(page, S1.title);
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).locator("[data-delete-story-title]")).toHaveText(S1.title);
  await expect(sheet(page).getByText("지운 이야기는 되돌릴 수 없습니다.")).toBeVisible();
  await page.waitForTimeout(300);
  // 이야기 카드가 열리지 않았음(목록이 그대로)
  await expect(page.getByText("지난 이야기", { exact: true })).toBeVisible();
  await sheet(page).getByRole("button", { name: "취소", exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(1);
  // 뒤로가기로도 닫힘
  await longPress(page, S1.title);
  await expect(sheet(page)).toBeVisible();
  await page.goBack();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(1);
});

test("삭제하면 목록에서 사라지고 다시 열어도 없음, 그 이야기의 읽기 음성 캐시만 지움", async ({ page }) => {
  await openList(page, "plus");
  expect((await ttsKeys(page)).length).toBe(2);
  await longPress(page, S1.title);
  await sheet(page).getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.getByText("이야기를 지웠습니다")).toBeVisible();
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(0);
  await expect(page.locator('[data-past-story="' + S2.id + '"]')).toHaveCount(1);
  const keys = await ttsKeys(page);
  expect(keys.some((k) => k.indexOf("story-v2-" + S1.id + "::") === 0)).toBe(false);
  expect(keys.some((k) => k.indexOf("story-v2-" + S2.id + "::") === 0)).toBe(true);
  // 화면을 다시 열어도 없음
  await openApp(page, "story");
  await expect(page.getByText("지난 이야기", { exact: true })).toBeVisible();
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(0);
});

test("짧게 누르면 이야기가 열림, 카드에서 돌아와도 지운 이야기는 다시 안 나타남", async ({ page }) => {
  await openList(page, "plus");
  await longPress(page, S1.title);
  await sheet(page).getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(0);
  await page.locator('[data-past-story="' + S2.id + '"]').click();
  await expect(page.getByRole("heading", { name: S2.title })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("지난 이야기", { exact: true })).toBeVisible();
  await expect(page.locator('[data-past-story="' + S1.id + '"]')).toHaveCount(0);
  await expect(page.locator('[data-past-story="' + S2.id + '"]')).toHaveCount(1);
});

test("무료 — 지난 이야기는 지울 수 있고, 맛보기 이야기는 길게 눌러도 창 없음", async ({ page }) => {
  await openList(page, "free");
  await expect(page.getByText("맛보기 이야기", { exact: true })).toBeVisible();
  await longPress(page, "Nasi Goreng Ibu");
  await page.waitForTimeout(400);
  await expect(sheet(page)).toHaveCount(0);
  await openApp(page, "story");
  await longPress(page, S2.title);
  await expect(sheet(page)).toBeVisible();
});
