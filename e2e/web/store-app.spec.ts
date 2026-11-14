// 일반 빌드를 "실제 스토어 앱"처럼 엽니다 — 네이티브가 넣어 주는 window.KataStore 를 흉내 냅니다(src/lib/platform.ts).
// 미리보기 빌드의 등급 전환으로는 볼 수 없는 것을 여기서 봅니다.
//   · 로그인 전에는 로그인 화면 (LoginGate)
//   · 서버 등급 review(심사용 계정) — plan.ts 가 "plus" 로 돌려주므로 홈은 Plus 와 같고, 신앙·뉴스는 열리지 않음
//   · 저장된 세션의 등급(무료·Special·기한 지난 Plus)이 plan.ts 규칙대로 화면에 반영되는지
// 서버(kata-public)와 Play 는 끊겨 있습니다. 서버 확인(refreshMe)이 실패해도 저장된 세션으로 화면이 열려야 합니다.

import { Page } from "@playwright/test";
import { test, expect, openApp, appPath, seedStorage, SESSION_KEY } from "../fixtures";
import { HOME_EXPECTED, expectHomeMenu } from "../homeMenu";
import { PLUS_TITLE, STATE_PLUS, STATE_REVIEW_SUB, PRICE_LOADING, PRICE_FAILED } from "../../src/lib/plusCopy";

async function asStoreApp(page: Page, plan: Record<string, unknown> | null): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { KataStore: { version: () => string } }).KataStore = { version: () => "1.0.0" };
  });
  if (plan) {
    const session = {
      token: "e2e-token",
      user: { id: "u-e2e", email: "e2e@example.com", name: "Tes Akun", picture: "" },
      plan,
      accountId: "acc-e2e",
      savedAt: 1,
    };
    const kv: Record<string, string> = {};
    kv[SESSION_KEY] = JSON.stringify(session);
    await seedStorage(page, kv);
  }
}

const DAY = 24 * 60 * 60 * 1000;

test("스토어 앱 · 로그인 전 — 로그인 화면(앱 화면·안내 화면 아님)", async ({ page }) => {
  await asStoreApp(page, null);
  await openApp(page, "");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kata kata.");
  await expect(page.getByRole("button", { name: new RegExp("Google") })).toBeVisible();
  await expect(page.getByText("BAHASA HARI INI")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "회원키가 있습니다" })).toHaveCount(0);
});

test("심사용 계정(review) — 홈은 Plus 와 같음(신앙·뉴스 없음, 자물쇠 없음)", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.plus);
  await expect(page.locator("[data-preview-tab]"), "일반 빌드에는 미리보기 손잡이가 없음").toHaveCount(0);
});

test("심사용 계정(review) — 신앙 화면은 주소로도 안 열림, 이해 하위 화면은 열림", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  for (const path of ["bible", "devotion", "prayer", "news", "sermon", "one-to-one", "insight/christian"]) {
    await openApp(page, path);
    await expect.poll(() => appPath(page), "/" + path).toBe("/");
  }
  await openApp(page, "wordbooks");
  await page.waitForTimeout(300);
  expect(appPath(page)).toBe("/wordbooks");
});

test("심사용 계정(review) — 구독 화면에 \"심사용 계정\", 요금제는 없음", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: 0 });
  await openApp(page, "plus");
  await expect(page.getByRole("heading", { name: PLUS_TITLE })).toBeVisible();
  await expect(page.getByText(STATE_PLUS, { exact: true })).toBeVisible();
  await expect(page.getByText(STATE_REVIEW_SUB, { exact: true })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "요금제" })).toHaveCount(0);
});

test("기한이 지난 심사용 계정 — 무료로 봄", async ({ page }) => {
  await asStoreApp(page, { tier: "review", until: Date.now() - DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 free — 무료 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "free", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 plus(기한 남음) — Plus 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "plus", until: Date.now() + 30 * DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.plus);
});

test("세션 등급 plus(기한 지남) — 무료 홈", async ({ page }) => {
  await asStoreApp(page, { tier: "plus", until: Date.now() - DAY });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.free);
});

test("세션 등급 special — 신앙·뉴스가 보이고 설교문은 없음", async ({ page }) => {
  await asStoreApp(page, { tier: "special", until: 0 });
  await openApp(page, "");
  await expectHomeMenu(page, HOME_EXPECTED.special);
});

// ── 계정 삭제 뒤 "이 폰의 단어장과 학습 기록도 지울까요?" (2026-11-14, D-10) ─────────────
// 서버는 끊겨 있으므로 계정 삭제·로그아웃 응답만 가짜로 돌려줍니다.
const WIPE_TITLE = "이 폰에 있는 단어장과 학습 기록도 지울까요?";

async function mockAccountServer(page: Page): Promise<void> {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
  await page.route("**/account/delete", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ ok: true, hadSubscription: false }) }),
  );
  await page.route("**/auth/signout", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ ok: true }) }),
  );
}

// 이 폰에 쌓인 것처럼 넣어 둡니다(화면이 열린 뒤에 넣어, 새로 고쳐도 다시 들어가지 않게)
async function putLocalData(page: Page): Promise<void> {
  await page.evaluate(() => {
    const words = JSON.parse(window.localStorage.getItem("kata-words") || "[]");
    words.unshift({ id: "mine-e2e", word: "kata-e2e", meaning: "시험 낱말", categoryId: "my-wordbook" });
    window.localStorage.setItem("kata-words", JSON.stringify(words));
    window.localStorage.setItem("dict-search-history", JSON.stringify(["makan"]));
    window.localStorage.setItem("phrase-saved", JSON.stringify([{ id: "p1" }]));
    window.localStorage.setItem("tts-voice", "e2e-voice");
    window.localStorage.setItem("geminiApiKey", "e2e-not-a-real-key");
  });
}

async function readLocalData(page: Page) {
  return page.evaluate(() => {
    const words = JSON.parse(window.localStorage.getItem("kata-words") || "[]") as { id?: string }[];
    return {
      mine: words.some((w) => w && w.id === "mine-e2e"),
      history: window.localStorage.getItem("dict-search-history"),
      phrases: window.localStorage.getItem("phrase-saved"),
      voice: window.localStorage.getItem("tts-voice"),
      key: window.localStorage.getItem("geminiApiKey"),
    };
  });
}

async function deleteAccountFromMyInfo(page: Page): Promise<void> {
  await asStoreApp(page, { tier: "free", until: 0 });
  await mockAccountServer(page);
  await openApp(page, "me");
  await putLocalData(page);
  await page.getByRole("button", { name: "계정 삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "계정 삭제" }).click();
  await expect(page.getByRole("alertdialog").getByText(WIPE_TITLE)).toBeVisible();
}

test("계정 삭제 뒤 — 단어장도 지울지 묻고, 기본은 남겨두기", async ({ page }) => {
  await deleteAccountFromMyInfo(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "남겨두기" }).click();
  await expect(page.getByText(WIPE_TITLE)).toHaveCount(0);
  const d = await readLocalData(page);
  expect(d.mine, "직접 넣은 단어가 남아 있음").toBe(true);
  expect(d.history).not.toBeNull();
  expect(d.phrases).not.toBeNull();
});

test("계정 삭제 뒤 — 모두 지우기: 단어장·기록은 지우고 설정·키는 남김", async ({ page }) => {
  await deleteAccountFromMyInfo(page);
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("alertdialog").getByRole("button", { name: "모두 지우기" }).click(),
  ]);
  await page.locator("#root > *").first().waitFor({ state: "attached" });
  const d = await readLocalData(page);
  expect(d.mine, "직접 넣은 단어가 지워짐").toBe(false);
  expect(d.history).toBeNull();
  expect(d.phrases).toBeNull();
  expect(d.voice, "목소리 설정은 그대로").toBe("e2e-voice");
  expect(d.key, "키는 그대로").toBe("e2e-not-a-real-key");
});

test("로그아웃 — 지울지 묻지 않고 남는다고만 알림", async ({ page }) => {
  await asStoreApp(page, { tier: "free", until: 0 });
  await mockAccountServer(page);
  await openApp(page, "me");
  await putLocalData(page);
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByText("로그아웃했습니다. 이 폰의 단어장과 기록은 그대로 남습니다")).toBeVisible();
  await expect(page.getByText(WIPE_TITLE)).toHaveCount(0);
  const d = await readLocalData(page);
  expect(d.mine).toBe(true);
});

test("실제 스토어 앱 경로 — Play 가격을 못 받으면 고정 금액을 보이지 않음", async ({ page }) => {
  // CLAUDE.md: 화면의 금액은 Play 값만. 대체값(plusCopy FALLBACK_*)은 미리보기 빌드에서만 보입니다.
  await asStoreApp(page, { tier: "free", until: 0 });
  await openApp(page, "plus");
  const plans = page.getByRole("radiogroup", { name: "요금제" });
  await expect(plans.getByRole("radio")).toHaveCount(2);
  await expect(plans.getByText(new RegExp("[0-9][0-9,]*원"))).toHaveCount(0);
  await expect(page.getByText(new RegExp("^(" + PRICE_LOADING + "|" + PRICE_FAILED + ")$")).first()).toBeVisible();
});
