// 지도(/map) — 왼쪽 아래 분류 버튼과 핀 표시 (2026-11-15, 11차).
//
// 처음 배율(1.55)에서
//   · 도시만 켜진 처음 상태: 대도시 점만 보이고, 관광지·종교·역사·종족·문화 점은 하나도 안 보입니다(예전 그대로).
//   · 분류 버튼을 켜면: 그 분류의 점이 모두 바로 보입니다. 이름표는 아직 없습니다(겹침 방지 — 확대하면 나옴).
//   · 보이는 점은 눌립니다(IndoMap.tsx 의 render 와 findPin 이 같은 dotStart 를 씀) — 눌러서 시트가 그 지점으로 열리는지 봅니다.
//
// 핀 묶음(<g>)에는 data-pin-type(city|spot|faith|culture) · data-pin-id 가 붙어 있고, 보임은 opacity 속성으로 정해집니다.
// 저장소 규칙: 정규식 리터럴을 쓰지 않습니다.

import { Page } from "@playwright/test";
import { test, expect, setupPreview, openApp } from "../fixtures";

interface PinState {
  id: string;
  type: string;
  opacity: number;
  label: number;
  x: number;
  y: number;
}

/** 지금 그려진 핀 전부 — 묶음의 opacity, 이름표의 opacity, 점의 화면 가운데 좌표 */
async function pins(page: Page): Promise<PinState[]> {
  return page.evaluate(() => {
    const out: { id: string; type: string; opacity: number; label: number; x: number; y: number }[] = [];
    document.querySelectorAll("g[data-pin-type]").forEach((g) => {
      const c = g.querySelector("circle");
      const t = g.querySelector("text");
      const b = c ? c.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      out.push({
        id: g.getAttribute("data-pin-id") || "",
        type: g.getAttribute("data-pin-type") || "",
        opacity: parseFloat(g.getAttribute("opacity") || "0"),
        label: parseFloat((t && t.getAttribute("opacity")) || "0"),
        x: b.left + b.width / 2,
        y: b.top + b.height / 2,
      });
    });
    return out;
  });
}

function legendButton(page: Page, label: string) {
  return page.getByRole("button", { name: label, exact: true });
}

const KINDS = [
  { type: "spot", label: "관광지" },
  { type: "faith", label: "종교·역사" },
  { type: "culture", label: "종족·문화" },
];

test.beforeEach(async ({ page }) => {
  await setupPreview(page, { tier: "plus" });
  await openApp(page, "map");
  await expect(page.getByRole("heading", { name: "PETA INDONESIA" })).toBeVisible();
  // 첫 그리기가 끝나 대도시 점이 보일 때까지
  await expect.poll(async () => (await pins(page)).filter((p) => p.type === "city" && p.opacity === 1).length).toBeGreaterThan(0);
});

test("처음 상태(도시만) — 관광지·종교·역사·종족·문화 점은 안 보임", async ({ page }) => {
  const all = await pins(page);
  for (const k of KINDS) {
    const mine = all.filter((p) => p.type === k.type);
    expect(mine.length, k.label + " 핀이 지도에 있어야 합니다").toBeGreaterThan(0);
    expect(mine.filter((p) => p.opacity > 0).map((p) => p.id), k.label + " 점은 버튼을 켜기 전에는 안 보여야 합니다").toEqual([]);
  }
  // 도시는 예전 그대로: 처음 배율에서는 일부(대도시)만 보이고 나머지(중소도시)는 확대해야 나옵니다
  const cities = all.filter((p) => p.type === "city");
  expect(cities.filter((p) => p.opacity === 0).length, "중소도시는 처음 배율에서 안 보임").toBeGreaterThan(0);
});

for (const k of KINDS) {
  test("분류 버튼 '" + k.label + "' — 처음 배율에서 그 분류의 점이 모두 보이고 눌림", async ({ page }) => {
    await legendButton(page, k.label).click();

    await expect
      .poll(async () => (await pins(page)).filter((p) => p.type === k.type && p.opacity === 1).length, { message: k.label + " 점이 보여야 합니다" })
      .toBeGreaterThan(0);
    const all = await pins(page);
    const mine = all.filter((p) => p.type === k.type);
    expect(mine.filter((p) => p.opacity < 1).map((p) => p.id), k.label + " 점은 하나도 빠짐없이 또렷하게 보여야 합니다").toEqual([]);
    // 이름표는 아직 없음(확대하면 나옴)
    expect(mine.filter((p) => p.label > 0).map((p) => p.id), k.label + " 이름표는 처음 배율에서 안 보여야 합니다").toEqual([]);
    // 다른 분류는 그대로 꺼져 있음
    const others = all.filter((p) => p.type !== k.type && p.type !== "city" && p.opacity > 0);
    expect(others.map((p) => p.id)).toEqual([]);

    // 보이는 점 가운데 이웃과 가장 멀리 떨어진 것을 눌러 시트가 그 지점으로 열리는지 봅니다.
    const visible = all.filter((p) => p.opacity > 0.35);
    const vw = page.viewportSize()!.width;
    let pick: PinState | null = null;
    let pickGap = -1;
    for (const p of mine) {
      if (p.x < 24 || p.x > vw - 24) continue;
      let gap = 1e9;
      for (const q of visible) {
        if (q === p) continue;
        gap = Math.min(gap, Math.hypot(p.x - q.x, p.y - q.y));
      }
      if (gap > pickGap) {
        pickGap = gap;
        pick = p;
      }
    }
    expect(pick, "누를 " + k.label + " 점을 찾지 못했습니다").not.toBeNull();
    if (!pick) return;
    await page.mouse.click(pick.x, pick.y);
    const title = page.locator("h2");
    await expect(title).toBeVisible();
    const head = title.locator("xpath=../..");
    await expect(head.getByText(pick.id, { exact: true })).toBeVisible();
    await expect(head.getByText(k.label, { exact: true })).toBeVisible();
  });
}

test("확대하면 이름표가 나옴 — 관광지", async ({ page }) => {
  await legendButton(page, "관광지").click();
  const zoomIn = page.getByRole("button", { name: "확대", exact: true });
  // 1.55 × 1.5⁴ ≈ 7.8배 — 6배를 넘으면 겹침을 따지지 않고 보이는 점의 이름을 모두 냅니다.
  for (let i = 0; i < 4; i++) await zoomIn.click();
  const spots = (await pins(page)).filter((p) => p.type === "spot");
  expect(spots.filter((p) => p.opacity < 1 || p.label < 1).map((p) => p.id), "관광지 점과 이름표가 모두 보여야 합니다").toEqual([]);

  // 버튼을 끄면 다시 사라집니다
  await legendButton(page, "관광지").click();
  await expect.poll(async () => (await pins(page)).filter((p) => p.type === "spot" && p.opacity > 0).length).toBe(0);
});
