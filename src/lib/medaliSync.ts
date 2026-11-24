// src/lib/medaliSync.ts
// 같은 사람의 여러 기기(폰·태블릿)가 훈장 점수를 합치도록 Cloudflare Worker(KV)와 주고받습니다.
// 실패해도 내 훈장 화면은 그대로 동작해야 하므로 모든 함수가 조용히 실패합니다.
//
// 2026-11-24: 두 사람 비교(/medali/put·/medali/peer·/medali/who)는 앱에서 뺐습니다.
// 기기 합치기는 아이디 없이 회원키로만 합니다 — 서버가 회원 정보의 아이디(medaliId)를 채워 씁니다.
// 그래서 이 기기의 "medali-my-id" 는 이제 닉네임 저장 칸일 뿐이며, 서버로 보내지 않습니다.

import { medaliEngine, saveOthers, listMyRawLogs, countMyConfirmed } from "@/lib/medali";
import { memberHeaders } from "@/lib/member";

// 서버 주소만 코드에 둡니다(공개 주소). 인증은 회원키+기기번호(memberHeaders)로 합니다. 코드에는 비밀값이 없습니다.
// 회원 상태가 아닌 기기는 요청을 보내지 않고 조용히 건너뜁니다(아래 모든 호출이 실패를 삼킵니다).
const BASE = "https://kata-sermon.cura4world.workers.dev";

// 닉네임 저장 칸 — 키 이름은 예전 그대로 둡니다(이미 설치된 앱의 닉네임을 옮기지 않아도 되게)
const NICK_KEY = "medali-my-id";
const DEVICE_KEY = "medali-device-id";
const LAST_LOG_KEY = "medali-last-log-push";
// 두 사람 비교를 뺄 때 쓰지 않게 된 키 — 앱 시작 때 지웁니다(cleanupRetiredMedaliKeys)
const RETIRED_KEYS = ["medali-peer-cache", "medali-last-push"];

// 앱을 자주 껐다 켜도 요청이 몰리지 않게 합니다.
const PUSH_INTERVAL_MS = 5 * 60 * 1000;
const LOG_KEEP_DAYS = 60;          // 서버 칸에 담아 두는 날짜 수 (Worker는 75일까지 받는다)
const REQ_TIMEOUT_MS = 8000;

// ---------- 닉네임 (기기별 localStorage) ----------

/** 닉네임 규칙: 한글·영문·숫자 6자 이내 */
export function isValidMedaliId(id: string): boolean {
  return new RegExp("^[A-Za-z0-9가-힣]{1,6}$").test((id || "").trim());
}

/** 저장된 닉네임(없으면 빈 문자열). 예전 "사용 안 함" 표시("-")는 빈 것으로 봅니다. */
export function getMyMedaliId(): string {
  try {
    const v = localStorage.getItem(NICK_KEY) || "";
    return v === "-" ? "" : v;
  } catch {
    return "";
  }
}

export function setMyMedaliId(id: string): void {
  try {
    localStorage.setItem(NICK_KEY, (id || "").trim());
  } catch {
    // 저장 실패해도 이번 실행 동안은 화면이 동작합니다
  }
}

/** 두 사람 비교를 뺄 때 쓰지 않게 된 저장 키를 지웁니다. 앱 시작 때 한 번 부릅니다. */
export function cleanupRetiredMedaliKeys(): void {
  for (const k of RETIRED_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      // 무시
    }
  }
}

// ---------- 이 기기의 고유 번호 ----------
// 기기마다 서버에 자기 칸을 하나씩 쓴다. 한 칸을 두 기기가 동시에 쓰지 않으므로
// 충돌 처리(리비전·409)가 필요 없다. 사용자에게는 보이지 않는 값이다.

const DEVICE_OK = new RegExp("^[A-Za-z0-9]{4,32}$");

export function getDeviceId(): string {
  try {
    const cur = localStorage.getItem(DEVICE_KEY) || "";
    if (DEVICE_OK.test(cur)) return cur;

    const made = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const clean = made.replace(new RegExp("[^A-Za-z0-9]", "g"), "").slice(0, 20);
    if (!DEVICE_OK.test(clean)) return "";
    localStorage.setItem(DEVICE_KEY, clean);
    return clean;
  } catch {
    // localStorage를 못 쓰면 동기화를 건너뛴다 (빈 값이면 push·pull이 그냥 돌아간다)
    return "";
  }
}

// ---------- 통신 ----------

async function request(path: string, method: string, body?: unknown): Promise<Response> {
  const auth = memberHeaders();
  if (!auth) throw new Error("NO_MEMBER");
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {}
  }, REQ_TIMEOUT_MS);

  try {
    return await fetch(BASE + path, {
      method,
      headers: body ? { "content-type": "application/json", ...auth } : { ...auth },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 기기별 일별 로그 (같은 회원키를 쓰는 내 기기끼리 합산) ----------

// 내 기기 칸 올리기. 올리는 것은 "이 기기가 번 점수" 원본이며 합산본이 아니다.
// 아이디는 보내지 않는다 — 서버가 회원 정보의 아이디로 정한다.
export async function pushMyLogs(force?: boolean): Promise<void> {
  if (!memberHeaders()) return;
  const deviceId = getDeviceId();
  if (!deviceId) return;

  if (!force) {
    try {
      const last = Number(localStorage.getItem(LAST_LOG_KEY) || "0");
      if (Date.now() - last < PUSH_INTERVAL_MS) return;
    } catch {
      // 읽기 실패하면 그냥 보냅니다
    }
  }

  try {
    const logs = await listMyRawLogs(LOG_KEEP_DAYS);
    const confirmedCount = await countMyConfirmed();
    const res = await request("/medali/log", "PUT", {
      deviceId,
      confirmedCount,
      logs: logs.map((l) => ({
        date: l.date,
        points: l.points || {},
        usageMs: l.usageMs || 0,
      })),
    });
    if (!res.ok) return;
    try {
      localStorage.setItem(LAST_LOG_KEY, String(Date.now()));
    } catch {
      // 무시
    }
  } catch {
    // 통신 실패는 조용히 넘어갑니다 (로컬에 계속 쌓였다가 다음 기회에 통째로 올라갑니다)
  }
}

// 다른 기기들의 로그 받아오기. 실패하면 지난번에 받아 둔 값을 그대로 둔다(지우지 않는다).
export async function pullOtherLogs(): Promise<boolean> {
  if (!memberHeaders()) return false;
  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    const res = await request("/medali/log?exclude=" + encodeURIComponent(deviceId), "GET");
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || !data.ok) return false;

    saveOthers({
      byDate: data.byDate && typeof data.byDate === "object" ? data.byDate : {},
      confirmedMax: Number(data.confirmedMax || 0),
      savedAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

// 앱 진입·복귀 때 한 번에 부르는 창구. 받기 → 재계산 → 올리기 순서다.
export async function syncMedali(force?: boolean): Promise<void> {
  const got = await pullOtherLogs();
  if (got) {
    try {
      await medaliEngine.refresh();
    } catch {
      // 재계산 실패해도 다음 refresh에서 맞춰집니다
    }
  }
  await pushMyLogs(force);
}
