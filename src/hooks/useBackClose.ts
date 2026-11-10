// src/hooks/useBackClose.ts
// 창(대화상자·아래 시트)을 폰의 뒤로가기로 닫습니다 — 화면을 떠나지 않게.
//
//   const { onTop } = useBackClose(open, () => setOpen(false));
//
// 창이 열리면 히스토리에 한 칸을 쌓고(주소는 그대로), 뒤로가기가 그 칸을 빼면 onClose 를 부릅니다.
// 버튼·바깥 누르기 등으로 닫히면(open 이 false 가 되면) 쌓아 둔 칸을 history.back() 으로 직접 뺍니다.
// 이미 잘 되던 창(훈장 창·지도 핀 시트·이야기 단어 시트)과 같은 방식을 한 곳에 모은 것입니다.
//
// 규칙
//   - 쌓는 칸에는 지금 칸의 state(react-router 의 key·idx)를 그대로 복사해 둡니다.
//     그래서 goBackOr 의 location.key 판단이 바뀌지 않습니다.
//   - 이 파일이 쌓은 칸을 뺄 때 생기는 popstate 는 다른 리스너(화면 자체의 뒤로가기 처리,
//     react-router)에 전하지 않습니다(capture 단계에서 stopImmediatePropagation). 주소가 같으므로
//     라우터는 알 필요가 없고, 화면 쪽 시트가 덩달아 닫히는 일도 없습니다.
//   - 창이 열린 채 다른 화면으로 이동하면(navigate) 지금 칸은 이미 새 화면의 칸이라 되돌리지 않습니다.
//     창에서 곧바로 이동할 때 쌓은 칸까지 없애려면 navigate(path, { replace: onTop() }) 로 부르세요.
//   - onClose 안에서는 setState 하나만 하세요(CLAUDE.md: setState 여러 개 + navigate 동시 호출 금지).

import { useEffect, useRef } from "react";

interface Entry {
  id: string;
  close: () => void;
}

const STATE_KEY = "kataBackClose";
const stack: Entry[] = [];
let selfBacks = 0;
let seq = 0;

function currentEntryId(): string | null {
  try {
    const s = window.history.state as Record<string, unknown> | null;
    const v = s ? s[STATE_KEY] : null;
    return typeof v === "string" ? v : null;
  } catch (e) {
    return null;
  }
}

function onPopState(e: PopStateEvent): void {
  // 이 파일이 버튼으로 닫으며 직접 뺀 칸 — 아무에게도 알리지 않습니다.
  if (selfBacks > 0) {
    selfBacks--;
    try { e.stopImmediatePropagation(); } catch (err) {}
    return;
  }
  if (stack.length === 0) return;
  const cur = currentEntryId();
  let keep = -1;
  for (let i = 0; i < stack.length; i++) {
    if (stack[i].id === cur) keep = i;
  }
  // 맨 위 창의 칸이 그대로 지금 칸이면, 빠진 것은 그 위에 화면이 쌓은 다른 칸입니다 — 화면에 맡깁니다.
  if (keep === stack.length - 1) return;
  const closing = stack.splice(keep + 1);
  try { e.stopImmediatePropagation(); } catch (err) {}
  for (let i = closing.length - 1; i >= 0; i--) {
    try { closing[i].close(); } catch (err) {}
  }
}

// 화면 컴포넌트보다 먼저 듣도록 모듈을 불러올 때 한 번 붙입니다(capture 는 같은 대상의 일반 리스너보다 먼저 불림).
try {
  if (typeof window !== "undefined") window.addEventListener("popstate", onPopState, true);
} catch (e) {}

/**
 * 지금 히스토리 칸이 이 파일이 창을 열며 쌓은 칸인가. 창 안에서 곧바로 다른 화면으로 갈 때
 * navigate(path, { replace: isBackCloseEntry() }) 로 쓰면, 새 화면에서 한 번 뒤로 = 창을 열기 전 화면입니다.
 */
export function isBackCloseEntry(): boolean {
  const cur = currentEntryId();
  if (!cur) return false;
  for (let i = 0; i < stack.length; i++) {
    if (stack[i].id === cur) return true;
  }
  return false;
}

export function useBackClose(open: boolean, onClose: () => void): { onTop: () => boolean } {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    seq += 1;
    const id = "kbc" + seq + "-" + Date.now().toString(36);
    try {
      const prev = window.history.state;
      const next: Record<string, unknown> = Object.assign({}, prev && typeof prev === "object" ? prev : {});
      next[STATE_KEY] = id;
      window.history.pushState(next, "");
    } catch (e) {
      return; // 쌓지 못했으면 예전처럼 둡니다
    }
    const entry: Entry = {
      id,
      close: () => {
        idRef.current = null;
        closeRef.current();
      },
    };
    stack.push(entry);
    idRef.current = id;
    return () => {
      const i = stack.indexOf(entry);
      if (i < 0) return; // 뒤로가기로 이미 닫힘
      stack.splice(i, 1);
      idRef.current = null;
      // 지금 칸이 이 창이 쌓은 칸일 때만 뺍니다(창이 열린 채 다른 화면으로 갔으면 그대로 둠).
      if (currentEntryId() === id) {
        selfBacks++;
        try {
          window.history.back();
        } catch (e) {
          selfBacks--;
        }
      }
    };
  }, [open]);

  return {
    onTop: () => idRef.current !== null && currentEntryId() === idRef.current,
  };
}

export default useBackClose;
