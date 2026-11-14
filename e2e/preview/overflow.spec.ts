// 작은 화면(폭 360px) · 글자 115% 에서 주요 화면에 가로 넘침이 없는지.
// 단언: document.documentElement.scrollWidth <= window.innerWidth. 넘치면 창 밖으로 나간 요소를 실패 문구에 적습니다.
// 등급에 따라 열리는 화면이 달라 무료·Plus·관리자로 나눠 봅니다(잠긴 화면은 돌려보내진 곳에서 잽니다).

import {
  test, expect, setupPreview, openApp, appPath, expectNoHorizontalOverflow, rootFontPx,
  FONT_STEP_115, ROOT_PX_115, PreviewTier,
} from "../fixtures";

interface Screen {
  path: string;
  /** 열린 뒤 머무는 경로 (돌려보내지면 그곳) */
  lands: string;
  /** 화면이 그려졌는지 확인할 글자 */
  sees: string;
}

const COMMON: Screen[] = [
  { path: "", lands: "/", sees: "BAHASA HARI INI" },
  { path: "plus", lands: "/plus", sees: "Plus" },
  { path: "dictionary", lands: "/dictionary", sees: "KAMUS BAHASA INDONESIA" },
  { path: "story", lands: "/story", sees: "CERITA INDONESIA" },
  { path: "permainan", lands: "/permainan", sees: "PERMAINAN" },
  { path: "me", lands: "/me", sees: "글자 크기" },
  { path: "insight", lands: "/insight", sees: "WAWASAN INDONESIA" },
  { path: "saved", lands: "/saved", sees: "내 단어장" },
  { path: "category/my-wordbook", lands: "/category/my-wordbook", sees: "내 단어장" },
  { path: "phrase/saved", lands: "/phrase/saved", sees: "" },
  { path: "about/photos", lands: "/about/photos", sees: "" },
  { path: "percakapan", lands: "/percakapan", sees: "PERCAKAPAN" },
];

// 기본 단어장 목록은 Plus 부터 (Wordbooks.tsx: 무료는 구독 화면으로 돌려보냄)
const WORDBOOKS_FREE: Screen = { path: "wordbooks", lands: "/plus", sees: "Plus" };
const WORDBOOKS_PLUS: Screen = { path: "wordbooks", lands: "/wordbooks", sees: "KOSAKATA" };

const STAFF: Screen[] = [
  { path: "", lands: "/", sees: "Firman hari ini" },
  { path: "prayer", lands: "/prayer", sees: "DOA" },
  { path: "devotion", lands: "/devotion", sees: "SAAT TEDUH" },
  { path: "bible", lands: "/bible", sees: "" },
  { path: "news", lands: "/news", sees: "BERITA HARI INI" },
];

const PLAN: { tier: PreviewTier; screens: Screen[] }[] = [
  { tier: "free", screens: COMMON.concat([WORDBOOKS_FREE]) },
  { tier: "plus", screens: COMMON.concat([WORDBOOKS_PLUS]) },
  { tier: "admin", screens: STAFF },
];

for (const p of PLAN) {
  for (const s of p.screens) {
    test("가로 넘침 없음 — " + p.tier + " /" + s.path + " (360px · 115%)", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 732 });
      await setupPreview(page, { tier: p.tier, fontStep: FONT_STEP_115 });
      await openApp(page, s.path);
      expect(await rootFontPx(page), "글자 115% 가 적용됨").toBeCloseTo(ROOT_PX_115, 2);
      await expect.poll(() => appPath(page)).toBe(s.lands);
      if (s.sees) await expect(page.getByText(s.sees).first()).toBeVisible();
      // 늦게 그려지는 목록·그림이 자리 잡을 시간
      await page.waitForTimeout(400);
      await expectNoHorizontalOverflow(page, p.tier + " /" + s.path + " 맨 위");
      // 아래쪽 내용도 봅니다
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      await expectNoHorizontalOverflow(page, p.tier + " /" + s.path + " 맨 아래");
    });
  }
}
