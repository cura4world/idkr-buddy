// src/lib/plusLock.ts
// 잠긴 항목을 눌렀을 때 뜨는 공용 안내 창(components/PlusLockSheet.tsx)을 여는 통로 (2026-11-23 Arga 결정 D3).
// 예전에는 잠긴 메뉴를 누르면 곧바로 구독 화면으로 넘어갔습니다. 이제는 그 자리에 작은 창이 뜨고,
// "자세히 보기"를 눌러야 구독 화면으로 갑니다 — 메뉴의 목록·제목은 그대로 보며 무엇이 잠겼는지 알 수 있게.
//
//   openPlusLock(LOCK_TITLE_WORDBOOK)

type Listener = (title: string) => void;
const listeners = new Set<Listener>();

/** 안내 창을 엽니다. title 예: "02 단어장부터는 Plus 회원 기능입니다" */
export function openPlusLock(title: string): void {
  listeners.forEach((l) => {
    try { l(title); } catch (e) {}
  });
}

/** 안내 창 컴포넌트가 구독합니다. */
export function onPlusLock(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
