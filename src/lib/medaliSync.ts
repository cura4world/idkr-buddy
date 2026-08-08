// src/lib/medaliSync.ts
// 부부 두 사람의 Medali 요약을 Cloudflare Worker(KV)로 주고받습니다.
// 실패해도 내 훈장 화면은 그대로 동작해야 하므로 모든 함수가 조용히 실패합니다.

import {
  medaliEngine,
  MedaliColor,
  saveOthers,
  listMyRawLogs,
  countMyConfirmed,
} from "@/lib/medali";

// 두 사람만 쓰는 앱이라 주소와 열쇠를 코드에 심습니다.
// 이 열쇠로는 medali: 항목만 건드릴 수 있고 설교문에는 접근할 수 없습니다.
const BASE = "https://kata-sermon.cura4world.workers.dev";
const MEDALI_KEY = "mdl_7Qk2xR9vLp4Ns8Ht";

const ID_KEY = "medali-my-id";
const DEVICE_KEY = "medali-device-id";
const LAST_LOG_KEY = "medali-last-log-push";
const PEER_KEY = "medali-peer-cache";
const LAST_PUSH_KEY = "medali-last-push";

// 앱을 자주 껐다 켜도 요청이 몰리지 않게 합니다.
const PUSH_INTERVAL_MS = 5 * 60 * 1000;
const LOG_KEEP_DAYS = 60;          // 서버 칸에 담아 두는 날짜 수 (Worker는 75일까지 받는다)
const REQ_TIMEOUT_MS = 8000;

export interface PeerSummary {
  id: string;
  apiColor: MedaliColor;
  bintangColor: MedaliColor;
  bintangTier: number;
  weekPoints: number;
  confirmedCount: number;
  savedAt: number;
}

// ---------- 내 아이디 (기기별 localStorage) ----------

export function isValidMedaliId(id: string): boolean {
  return new RegExp("^[A-Za-z0-9가-힣]{1,6}$").test((id || "").trim());
}

export function getMyMedaliId(): string {
  try {
    return localStorage.getItem(ID_KEY) || "";
  } catch {
    return "";
  }
}

export function setMyMedaliId(id: string): void {
  try {
    localStorage.setItem(ID_KEY, (id || "").trim());
  } catch {
    // 저장 실패해도 이번 실행 동안은 화면이 동작합니다
  }
}

export function hasMyMedaliId(): boolean {
  return isValidMedaliId(getMyMedaliId());
}

// 이 기기를 Medali 동기화에서 제외합니다 (태블릿·세컨폰용).
// "-" 는 아이디 규칙에 어긋나므로 업로드·다운로드가 자동으로 건너뛰어집니다.
const OPT_OUT = "-";

export function optOutMedali(): void {
  try {
    localStorage.setItem(ID_KEY, OPT_OUT);
  } catch {
    // 무시
  }
}

// 팝업을 띄울지 판단합니다. 아이디가 있거나 제외를 선택했으면 띄우지 않습니다.
export function needsMedaliId(): boolean {
  const v = getMyMedaliId();
  if (v === OPT_OUT) return false;
  return !isValidMedaliId(v);
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

// ---------- 상대 요약 캐시 ----------

export function loadPeerCache(): PeerSummary | null {
  try {
    const raw = localStorage.getItem(PEER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.id !== "string") return null;
    return p as PeerSummary;
  } catch {
    return null;
  }
}

function savePeerCache(p: PeerSummary | null): void {
  try {
    if (p) localStorage.setItem(PEER_KEY, JSON.stringify(p));
    else localStorage.removeItem(PEER_KEY);
  } catch {
    // 무시
  }
}

// ---------- 통신 ----------

async function request(path: string, method: string, body?: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {}
  }, REQ_TIMEOUT_MS);

  try {
    return await fetch(BASE + path, {
      method,
      headers: body
        ? { "content-type": "application/json", "x-kata-key": MEDALI_KEY }
        : { "x-kata-key": MEDALI_KEY },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// 이미 등록된 아이디 목록 (아이디 팝업에서 "먼저 등록된 사람"을 보여줍니다)
export async function fetchRegisteredIds(): Promise<string[]> {
  try {
    const res = await request("/medali/who", "GET");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.ids) ? data.ids : [];
  } catch {
    return [];
  }
}

// 내 요약 올리기. force가 아니면 5분에 한 번만 보냅니다.
export async function pushMyMedali(force?: boolean): Promise<void> {
  const id = getMyMedaliId();
  if (!isValidMedaliId(id)) return;

  if (!force) {
    try {
      const last = Number(localStorage.getItem(LAST_PUSH_KEY) || "0");
      if (Date.now() - last < PUSH_INTERVAL_MS) return;
    } catch {
      // 읽기 실패하면 그냥 보냅니다
    }
  }

  try {
    const s = medaliEngine.getSummary();
    const res = await request("/medali/put", "PUT", {
      id,
      apiColor: s.apiColor,
      bintangColor: s.bintangColor,
      bintangStage: s.bintangTier,
      weekPoints: s.weekPoints,
      confirmedCount: s.confirmedCount,
    });
    if (!res.ok) return;
    try {
      localStorage.setItem(LAST_PUSH_KEY, String(Date.now()));
    } catch {
      // 무시
    }
  } catch {
    // 통신 실패는 조용히 넘어갑니다
  }
}

// 상대 요약 받아오기. 실패하면 마지막으로 받아둔 값을 돌려줍니다.
export async function fetchPeer(): Promise<PeerSummary | null> {
  const me = getMyMedaliId();
  if (!isValidMedaliId(me)) return null;

  try {
    const res = await request("/medali/peer?me=" + encodeURIComponent(me), "GET");
    if (!res.ok) return loadPeerCache();
    const data = await res.json();
    const peer = data?.peer;
    if (!peer || typeof peer.id !== "string") return loadPeerCache();

    const clean: PeerSummary = {
      id: peer.id,
      apiColor: peer.apiColor,
      bintangColor: peer.bintangColor,
      bintangTier: Number(peer.bintangStage || peer.bintangTier || 3),
      weekPoints: Number(peer.weekPoints || 0),
      confirmedCount: Number(peer.confirmedCount || 0),
      savedAt: Number(peer.savedAt || 0),
    };
    savePeerCache(clean);
    return clean;
  } catch {
    return loadPeerCache();
  }
}

// ---------- 기기별 일별 로그 (같은 아이디를 쓰는 내 기기끼리 합산) ----------

// 내 기기 칸 올리기. 올리는 것은 "이 기기가 번 점수" 원본이며 합산본이 아니다.
export async function pushMyLogs(force?: boolean): Promise<void> {
  const id = getMyMedaliId();
  if (!isValidMedaliId(id)) return;
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
      id,
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
  const id = getMyMedaliId();
  if (!isValidMedaliId(id)) return false;
  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    const res = await request(
      "/medali/log?id=" + encodeURIComponent(id) + "&exclude=" + encodeURIComponent(deviceId),
      "GET"
    );
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
  await pushMyMedali(force);
}

// "3시간 전" 같은 짧은 표기. 6시간 이내면 빈 문자열(굳이 안 보여줌).
export function staleLabel(savedAt: number): string {
  if (!savedAt) return "";
  const diff = Date.now() - savedAt;
  const hours = Math.floor(diff / 3600000);
  if (hours < 6) return "";
  if (hours < 24) return hours + "시간 전";
  const days = Math.floor(hours / 24);
  return days + "일 전";
}
