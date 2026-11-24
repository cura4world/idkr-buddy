// 내 정보 화면 시험용 자료 넣기(2026-11-25) — 날별 공부 시간(훈장 일일 기록의 usageMs)과 공개판 로그인 상태.
// 앱을 한 번 열어 저장소를 만든 뒤 넣고, 부르는 쪽이 /me 를 다시 엽니다.

import type { Page } from "@playwright/test";

/** 로컬 날짜 키 "2026-11-05" (앱 medali.dateKey 와 같은 모양) */
export function dayKey(y: number, m: number, d: number): string {
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return y + "-" + p(m) + "-" + p(d);
}

/** 날짜 키 → 분. 훈장 일일 기록(kata-medali/daily)에 usageMs 로 넣습니다 */
export async function seedUsage(page: Page, minutesByDate: Record<string, number>): Promise<void> {
  await page.evaluate((rows) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open("kata-medali", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("daily")) db.createObjectStore("daily", { keyPath: "date" });
      if (!db.objectStoreNames.contains("words")) db.createObjectStore("words", { keyPath: "word" });
      if (!db.objectStoreNames.contains("rounds")) db.createObjectStore("rounds", { keyPath: "id" });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("daily", "readwrite");
      const st = tx.objectStore("daily");
      for (const [date, min] of rows) st.put({ date, points: {}, usageMs: min * 60000 });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), Object.entries(minutesByDate));
}

/** 공개판 로그인 상태(구독 정보). 미리보기 빌드의 등급은 따로 정하고, 이 값은 다음 결제·해지 표시만 씁니다 */
export async function seedSession(page: Page, plan: { tier: string; until: number; autoRenew?: boolean; basePlanId?: string }): Promise<void> {
  await page.evaluate((plan) => {
    localStorage.setItem("kata-public-session", JSON.stringify({
      token: "e2e-token",
      user: { id: "e2e", email: "", name: "", picture: "" },
      plan,
      accountId: "e2e",
      savedAt: Date.now(),
    }));
  }, plan);
}
