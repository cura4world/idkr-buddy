// 공개판 홈 "한 화면 맞춤" (Index.tsx 의 fitHome, 2026-11-13).
//
// 설계(Index.tsx 주석 · HANDOFF.md 측정표)는 "문서 전체가 스크롤 없이 들어간다"가 아니라 기준선 약속입니다.
//   · 무료              : Plus 줄의 윗부분 28px(FIT_PEEK)이 하단 탭 막대 위로 보인다(그 아래는 내리면 보임)
//   · 체험·Plus(·심사용) : 문화 구역("Kenali Indonesia") 목록의 아래 끝이 탭 막대 위에 있다
//   · Special·관리자     : 신앙 구역이 더 있어 스크롤이 전제입니다 — 기준선은 Plus 와 같지만 약속 대상이 아니라 여기서 단언하지 않습니다
// 보이는 높이 = 창 높이 - 탭 막대(74px). 글자 100% · 360×732 · 368×821 · 412×915 에서 봅니다.
// 오늘의 문장은 날짜에 따라 1~2줄이라 맞춤 정도(--kata-fit)는 그날그날 달라질 수 있습니다. 기준선만 단언합니다.

import { Page } from "@playwright/test";
import {
  test, expect, setupPreview, openApp, expectNoHorizontalOverflow, rootFontPx, PreviewTier, ROOT_PX_100,
} from "../fixtures";

/** Index.tsx 의 FIT_PEEK */
const FIT_PEEK = 28;

/** BottomTabs.tsx 의 TABBAR_PX — fitHome 이 "보이는 높이"에서 빼는 값. 실제 막대는 윗선 1px 이 더 있어 1px 높습니다. */
const TABBAR_PX = 74;
/** 본문 아래 여백(Index.tsx 본문 padding-bottom, 맞춤 정도에 따라 16→8px). 기준선 아래에 남는 것은 이 여백뿐이어야 합니다. */
const BODY_PAD_MAX = 16;

// roomy: 맞춤 없이도 넉넉히 들어가는 크기 — 세로 스크롤이 전혀 없어야 합니다.
// 360×732 는 문화 구역 마지막 줄이 탭 막대에 "딱 맞게" 들어가는 크기라(HANDOFF 측정표), 그 아래 여백만큼(16px 이내) 스크롤이 남습니다.
const VIEWPORTS = [
  { w: 360, h: 732, roomy: false },
  { w: 368, h: 821, roomy: true },
  { w: 412, h: 915, roomy: true },
];

interface Measure {
  visible: number;
  navTop: number;
  plusTop: number | null;
  cultureBottom: number | null;
  fit: string;
  scrollY: number;
  docHeight: number;
  innerHeight: number;
}

async function measure(page: Page): Promise<Measure> {
  // fitHome 은 resize·글꼴 로드 뒤 30ms 타이머로 다시 맞춥니다 — 값이 멈출 때까지 기다립니다
  let last = "";
  await expect
    .poll(async () => {
      const now = await page.evaluate(() => {
        const plus = document.querySelector('[data-fit-anchor="plus"]');
        const cul = document.querySelector('[data-fit-anchor="culture"]');
        const a = plus || cul;
        return a ? String(Math.round(a.getBoundingClientRect().top)) : "";
      });
      const stable = now !== "" && now === last;
      last = now;
      return stable;
    }, { intervals: [150, 150, 150, 200, 300] })
    .toBe(true);

  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="하단 메뉴"]') as HTMLElement;
    const plus = document.querySelector('[data-fit-anchor="plus"]') as HTMLElement | null;
    const cul = document.querySelector('[data-fit-anchor="culture"]') as HTMLElement | null;
    const home = (plus || cul) ? ((plus || cul) as HTMLElement).closest("div.max-w-lg") as HTMLElement | null : null;
    const navTop = nav.getBoundingClientRect().top;
    return {
      visible: window.innerHeight - 74,
      navTop,
      plusTop: plus ? plus.getBoundingClientRect().top : null,
      cultureBottom: cul ? cul.getBoundingClientRect().bottom : null,
      fit: home ? home.style.getPropertyValue("--kata-fit") : "",
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    };
  });
}

for (const v of VIEWPORTS) {
  const size = v.w + "×" + v.h;

  test("무료 " + size + " — Plus 줄 윗부분 " + FIT_PEEK + "px 이 첫 화면에 보임", async ({ page }) => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await setupPreview(page, { tier: "free" });
    await openApp(page, "");
    expect(await rootFontPx(page)).toBeCloseTo(ROOT_PX_100, 2);
    const m = await measure(page);
    expect(m.scrollY).toBe(0);
    expect(m.visible).toBe(v.h - TABBAR_PX);
    // 탭 막대는 74px + 윗선 1px
    expect(m.navTop, "탭 막대 윗끝").toBeGreaterThanOrEqual(v.h - TABBAR_PX - 1);
    expect(m.navTop, "탭 막대 윗끝").toBeLessThanOrEqual(v.h - TABBAR_PX);
    expect(m.plusTop).not.toBeNull();
    const peek = m.visible - (m.plusTop as number);
    expect(peek, "Plus 줄이 탭 막대 위로 보이는 높이 " + peek + "px (맞춤 정도 " + m.fit + ")").toBeGreaterThanOrEqual(FIT_PEEK - 0.5);
    await expectNoHorizontalOverflow(page, "홈 무료 " + size);
  });

  for (const tier of ["trial", "plus"] as PreviewTier[]) {
    test(tier + " " + size + " — 문화 구역 끝까지 첫 화면에 들어감", async ({ page }) => {
      await page.setViewportSize({ width: v.w, height: v.h });
      await setupPreview(page, { tier });
      await openApp(page, "");
      const m = await measure(page);
      expect(m.scrollY).toBe(0);
      expect(m.cultureBottom).not.toBeNull();
      expect(
        m.cultureBottom as number,
        "문화 구역 아래 끝 " + m.cultureBottom + " ≤ 보이는 높이 " + m.visible + " (맞춤 정도 " + m.fit + ")",
      ).toBeLessThanOrEqual(m.visible + 0.5);
      // 이 등급은 마지막 줄 아래에 내용이 없습니다. 넉넉한 화면은 세로 스크롤이 전혀 없고,
      // 딱 맞는 화면(360×732)은 본문 아래 여백만큼만 남습니다.
      const extra = m.docHeight - m.innerHeight;
      expect(extra, "세로로 남는 스크롤 " + extra + "px (문서 " + m.docHeight + " / 창 " + m.innerHeight + ")")
        .toBeLessThanOrEqual(v.roomy ? 0 : BODY_PAD_MAX);
      await expectNoHorizontalOverflow(page, "홈 " + tier + " " + size);
    });
  }
}

test("넉넉한 화면(412×915) — 줄이지 않음(맞춤 정도 0)", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "");
  const m = await measure(page);
  expect(parseFloat(m.fit || "0")).toBe(0);
});
