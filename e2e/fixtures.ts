// e2e 공용 도구 — 모든 spec 은 여기의 test / expect 를 씁니다.
//
// 자동으로 하는 일
//   · 바깥 네트워크(127.0.0.1 이 아닌 모든 주소)를 끊습니다 — AI 서버·회원 서버·Play 에 기대지 않습니다.
//   · 화면에서 잡히지 않은 예외(pageerror)가 나면 테스트를 실패시킵니다.
//
// 저장소 규칙: 정규식 리터럴을 쓰지 않습니다(new RegExp).

import { test as base, expect, Page } from "@playwright/test";

// ── 앱이 쓰는 저장 키 (값이 바뀌면 여기만 고칩니다) ─────────────
/** src/lib/plan.ts 의 PREVIEW_TIER_KEY — 미리보기 패널이 고른 등급 */
export const PREVIEW_TIER_KEY = "kata-preview-tier";
/** src/lib/preview.ts 의 TRIAL_USED_KEY — "체험을 이미 쓴 계정" 스위치 */
export const PREVIEW_TRIAL_USED_KEY = "kata-preview-trial-used";
/** src/lib/fontScale.ts 의 KEY — 글자 크기 단계(0~8, 3 = 100%, 6 = 115%) */
export const FONT_STEP_KEY = "app-font-scale-step";
/** src/lib/fontScale.ts 의 FONT_BASE_KEY·FONT_BASE_VER — 없으면 저장된 단계를 한 칸 올려 버립니다(migrateOnce) */
export const FONT_BASE_KEY = "app-font-scale-base";
export const FONT_BASE_VER = "15.2";
/** src/lib/account.ts 의 SESSION_KEY — 공개판 로그인 세션 */
export const SESSION_KEY = "kata-public-session";

/** src/lib/fontScale.ts: BASE_PX 15.2 × 단계 배율 */
export const FONT_STEP_100 = 3;
export const FONT_STEP_115 = 6;
export const ROOT_PX_100 = 15.2;
export const ROOT_PX_115 = 17.48;

export type PreviewTier = "free" | "trial" | "plus" | "special" | "admin";

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ context, page }, use) => {
      await context.route("**/*", (route) => {
        let host = "";
        try {
          host = new URL(route.request().url()).hostname;
        } catch (e) {
          host = "";
        }
        if (host === "127.0.0.1" || host === "localhost") return route.continue();
        return route.abort();
      });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e && e.message ? e.message : e)));
      await use();
      expect(errors, "화면에서 잡히지 않은 예외가 없어야 합니다").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** 화면이 열리기 전에 localStorage 값을 넣습니다(새로 고쳐도 같은 값이 다시 들어갑니다). */
export async function seedStorage(page: Page, entries: Record<string, string>): Promise<void> {
  await page.addInitScript((kv) => {
    try {
      Object.keys(kv).forEach((k) => window.localStorage.setItem(k, kv[k]));
    } catch (e) {
      /* 무시 */
    }
  }, entries);
}

export interface PreviewOptions {
  tier: PreviewTier;
  /** 글자 크기 단계. 기본 3(100%) */
  fontStep?: number;
  /** "체험을 이미 쓴 계정" */
  trialUsed?: boolean;
}

/** 미리보기 빌드에서 등급·글자 크기를 정해 둡니다. page.goto 앞에서 부릅니다. */
export async function setupPreview(page: Page, o: PreviewOptions): Promise<void> {
  const kv: Record<string, string> = {};
  kv[PREVIEW_TIER_KEY] = o.tier;
  kv[FONT_STEP_KEY] = String(o.fontStep === undefined ? FONT_STEP_100 : o.fontStep);
  kv[FONT_BASE_KEY] = FONT_BASE_VER;
  if (o.trialUsed) kv[PREVIEW_TRIAL_USED_KEY] = "1";
  await seedStorage(page, kv);
}

/** 앱 안의 경로를 엽니다. path 는 "" (홈) 또는 "plus" 처럼 앞 슬래시 없이. 글꼴이 다 실릴 때까지 기다립니다. */
export async function openApp(page: Page, path: string): Promise<void> {
  await page.goto(path === "" ? "./" : "./" + path);
  await page.locator("#root > *").first().waitFor({ state: "attached" });
  await page.evaluate(() => {
    const d = document as Document & { fonts?: { ready?: Promise<unknown> } };
    return d.fonts && d.fonts.ready ? d.fonts.ready.then(() => true) : true;
  });
}

/** 지금 주소의 앱 안 경로 ("/", "/plus" …) */
export function appPath(page: Page): string {
  const p = new URL(page.url()).pathname;
  const base = "/idkr-buddy";
  const rest = p.indexOf(base) === 0 ? p.slice(base.length) : p;
  return rest === "" ? "/" : rest;
}

export async function rootFontPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

/**
 * 가로 넘침 검사 — 문서 폭이 창 폭을 넘지 않아야 합니다.
 * 넘치면 창 오른쪽 밖으로 나간 요소를 몇 개 찾아 실패 문구에 넣습니다.
 */
export async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const vw = window.innerWidth;
    const offenders: string[] = [];
    if (de.scrollWidth > vw) {
      const all = Array.from(document.body.querySelectorAll("*"));
      for (let i = 0; i < all.length && offenders.length < 6; i++) {
        const el = all[i] as HTMLElement;
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > vw + 0.5) {
          const cls = typeof el.className === "string" ? el.className.slice(0, 60) : "";
          const txt = (el.textContent || "").trim().slice(0, 30);
          offenders.push(el.tagName.toLowerCase() + "." + cls + " right=" + Math.round(b.right) + " '" + txt + "'");
        }
      }
    }
    return { scrollWidth: de.scrollWidth, vw, offenders };
  });
  expect(
    r.scrollWidth,
    label + " — 가로 넘침: 문서 폭 " + r.scrollWidth + " > 창 폭 " + r.vw + " / " + r.offenders.join(" | "),
  ).toBeLessThanOrEqual(r.vw);
}
