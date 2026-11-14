// 등급별 공개판 홈 메뉴의 기대값과 그 단언 — preview/home-tiers.spec.ts 와 web/store-review.spec.ts 가 같이 씁니다.
//
// 기대값은 src/pages/Index.tsx 의 `if (storeApp)` 쪽과 src/lib/plan.ts 에서 옮겼습니다.
//   plus  = tier !== "free"                    → 단어장·회화집·인도네시아 이해의 자물쇠가 풀리고 Plus 줄이 사라짐
//   staff = tier === "special" || "admin"      → 뉴스 줄 + "Firman hari ini"(신앙) 구역이 보임
//   tier === "admin"                           → 신앙 구역 첫 줄에 설교문
//   서버 등급 review(심사용)는 getTier() 가 "plus" 로 돌려주므로 Plus 와 같은 홈입니다.

import { Page, expect } from "@playwright/test";
import { PreviewTier } from "./fixtures";

export interface HomeExpected {
  /** 자물쇠가 붙는 줄 */
  locked: string[];
  /** 자물쇠 없이 열려 있는 줄 */
  open: string[];
  /** 아예 없는 줄 */
  hidden: string[];
  plusBox: boolean;
  faithSection: boolean;
}

const FAITH = ["오늘의 묵상", "성경 읽기", "일대일 성경공부", "기도문"];
const BASIC = ["단어장", "회화집", "오늘의 이야기", "인도네시아 이해"];

export const HOME_EXPECTED: Record<PreviewTier, HomeExpected> = {
  free: {
    locked: ["단어장", "회화집", "인도네시아 이해"],
    open: ["오늘의 이야기"],
    hidden: ["뉴스", "설교문"].concat(FAITH),
    plusBox: true,
    faithSection: false,
  },
  trial: {
    locked: [],
    open: BASIC,
    hidden: ["뉴스", "설교문"].concat(FAITH),
    plusBox: false,
    faithSection: false,
  },
  plus: {
    locked: [],
    open: BASIC,
    hidden: ["뉴스", "설교문"].concat(FAITH),
    plusBox: false,
    faithSection: false,
  },
  special: {
    locked: [],
    open: BASIC.concat(["뉴스"], FAITH),
    hidden: ["설교문"],
    plusBox: false,
    faithSection: true,
  },
  admin: {
    locked: [],
    open: BASIC.concat(["뉴스", "설교문"], FAITH),
    hidden: [],
    plusBox: false,
    faithSection: true,
  },
};

/** Index.tsx PubRow 의 aria-label: 잠긴 줄은 "제목, Plus 회원 기능" */
export const LOCKED_SUFFIX = ", Plus 회원 기능";

/** 홈 목록의 한 줄(PubRow) — 제목 글자가 정확히 같은 버튼 */
export function homeRow(page: Page, title: string) {
  return page.locator("button").filter({ has: page.getByText(title, { exact: true }) });
}

export async function expectHomeMenu(page: Page, e: HomeExpected): Promise<void> {
  await expect(page.getByText("BAHASA HARI INI", { exact: true })).toBeVisible();
  // 구역 제목
  await expect(page.getByText("Ayo belajar!", { exact: true })).toBeVisible();
  await expect(page.getByText("Kenali Indonesia", { exact: true })).toBeVisible();
  await expect(page.getByText("Firman hari ini", { exact: true })).toHaveCount(e.faithSection ? 1 : 0);

  for (const t of e.locked) {
    const row = homeRow(page, t);
    await expect(row, t + " 줄이 보여야 합니다").toBeVisible();
    await expect(row, t + " 줄에 자물쇠 표시가 있어야 합니다").toHaveAttribute("aria-label", t + LOCKED_SUFFIX);
  }
  for (const t of e.open) {
    const row = homeRow(page, t);
    await expect(row, t + " 줄이 보여야 합니다").toBeVisible();
    expect(await row.getAttribute("aria-label"), t + " 줄은 잠겨 있지 않아야 합니다").toBeNull();
  }
  for (const t of e.hidden) {
    await expect(homeRow(page, t), t + " 줄은 없어야 합니다").toHaveCount(0);
  }

  // 무료에게만 보이는 "Kata kata Plus" 줄
  await expect(page.locator('[data-fit-anchor="plus"]')).toHaveCount(e.plusBox ? 1 : 0);

  // 하단 탭 네 칸은 모든 등급에 같습니다
  const nav = page.getByRole("navigation", { name: "하단 메뉴" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button")).toHaveText(["홈", "내 단어장", "게임", new RegExp("내 정보$")]);
}
