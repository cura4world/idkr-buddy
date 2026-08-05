// src/lib/readReturn.ts
// 읽던 자리로 돌아오기 — 설교문 · 성경 읽기 · 이야기 공용
//
// 단어 팝업의 "사전에서 보기" 로 나가면 그 화면은 새로 마운트되고,
// 본문을 비동기로 불러오는 사이 브라우저의 기본 스크롤 복원이 실패해 맨 위에 머뭅니다.
// 그래서 나갈 때 "돌아올 자리" 표를 한 장 적어 두었다가, 돌아온 첫 렌더에서
// 그 표를 쓰고 버립니다. 표는 사전으로 나갈 때만 적히므로 목록에서 새로 열 때는
// 영향이 없습니다.
//
// 처음에는 뒤로가기(POP)일 때만 되돌리게 하고 스크롤을 계속 기억하는 방식을 썼는데
// 폰에서 동작하지 않았습니다. 판단 조건이 많을수록 어디서 막혔는지 알기 어려워서,
// "나갈 때 표 한 장, 돌아와서 쓰고 버리기" 로 단순화한 것입니다.
//
// scope   화면 구분 ("sermon" | "bible" | "story")
// key     같은 화면 안에서 무엇을 보고 있었는지
//         설교문=설교문 id / 성경="mazmur:5" / 이야기=이야기 id
// y       스크롤 위치
// flipped 뒤집힌 면(한국어 면)을 보고 있었는지 — 설교문은 항상 false

const KEY = "read-return";
const TTL = 10 * 60 * 1000; // 10분이 지난 표는 버립니다

export type ReturnTicket = {
  scope: string;
  key: string;
  y: number;
  flipped: boolean;
};

export function writeReturnTicket(scope: string, key: string, y: number, flipped: boolean) {
  try {
    const t = {
      scope: scope,
      key: key,
      y: Math.max(0, Math.round(y)),
      flipped: !!flipped,
      at: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(t));
  } catch (e) {
    // 저장소를 못 쓰는 환경이면 그냥 넘어갑니다
  }
}

// 표는 한 번만 쓰입니다 — 읽자마자 지웁니다.
// 화면이 다르거나(scope) 10분이 지났으면 버리고 null 을 돌려줍니다.
export function takeReturnTicket(scope: string): ReturnTicket | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    window.localStorage.removeItem(KEY);
    const t = JSON.parse(raw);
    if (!t || t.scope !== scope) return null;
    if (typeof t.key !== "string" || !t.key) return null;
    // 스크롤이 0이어도 표는 살려야 합니다.
    // 표에는 스크롤뿐 아니라 "어느 글이었는지(key)"와 "뒤집힌 면(flipped)"도 담겨 있어서,
    // 글 위쪽에서 사전에 다녀온 경우(y=0)에 표를 버리면 이야기는 목록으로,
    // 성경은 앞면 맨 위로 돌아가 버립니다.
    if (typeof t.y !== "number" || !isFinite(t.y) || t.y < 0) return null;
    if (typeof t.at !== "number" || Date.now() - t.at > TTL) return null;
    return { scope: t.scope, key: t.key, y: Math.round(t.y), flipped: !!t.flipped };
  } catch (e) {
    return null;
  }
}

// 지금 화면의 스크롤 위치를 읽습니다.
export function currentScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

// 적어둔 자리로 되돌립니다.
// 글꼴·필기 층 때문에 높이가 늦게 늘어나므로 첫 성공에 끝내지 않고
// 최소 0.4초 · 최대 2.5초 동안 계속 다시 적용합니다.
// 되돌리는 도중에 사용자가 화면을 만지면 곧바로 멈춥니다 (손과 다투지 않도록).
// 돌려주는 함수를 부르면 즉시 중단합니다 (화면을 벗어날 때 쓰세요).
export function restoreScrollTo(target: number): () => void {
  if (!(target > 0)) return () => {};

  let raf = 0;
  let stopped = false;
  const startedAt = Date.now();

  const onUserTouch = () => {
    finish();
  };

  function finish() {
    if (stopped) return;
    stopped = true;
    if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener("touchstart", onUserTouch);
    window.removeEventListener("wheel", onUserTouch);
  }

  const tick = () => {
    if (stopped) return;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.min(target, max);
    window.scrollTo(0, y);
    if (document.documentElement.scrollTop !== y) document.documentElement.scrollTop = y;
    const now = currentScrollY();
    const elapsed = Date.now() - startedAt;
    if (elapsed > 400 && max >= target - 2 && Math.abs(now - target) < 2) {
      finish();
      return;
    }
    if (elapsed > 2500) {
      finish();
      return;
    }
    raf = window.requestAnimationFrame(tick);
  };

  window.addEventListener("touchstart", onUserTouch, { passive: true });
  window.addEventListener("wheel", onUserTouch, { passive: true });
  raf = window.requestAnimationFrame(tick);

  return finish;
}
