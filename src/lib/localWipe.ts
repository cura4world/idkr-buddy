// src/lib/localWipe.ts
// 공개판(스토어 앱) 계정 삭제가 끝난 직후에만 쓰는 "이 폰의 단어장과 학습 기록 지우기" (2026-11-14, D-10).
//
// - 로그아웃에서는 부르지 않습니다(로그아웃은 지우지 않고 "남아 있습니다"만 알립니다).
// - 관리자판·회원판에는 계정 삭제가 없어 이 길을 타지 않습니다.
// - 지우는 것: 단어장(직접 만든 단어장·넣은 단어·다시 외울 표시)과 학습 기록
//   (훈장, 찾아본 단어·검색 기록, 저장한 문장, 퍼즐 기록, 불러온 이야기, 만든 대화, 가져온 생활 정보).
// - 남기는 것: API 키·회원키, 글자 크기·목소리·난이도 같은 설정, 읽기 음성 캐시, 신앙 화면의 자료.
// 목록은 아래 상수가 전부입니다. 새 저장 키를 만들면 "학습 기록인가 설정인가"를 정해 여기에 넣거나 뺍니다.

/** 통째로 지우는 localStorage 키 */
export const WIPE_LS_KEYS: string[] = [
  // 단어장
  "kata-categories",
  "kata-words",
  "kata-saved",
  "shared_seed_version",       // 지운 뒤 기본 단어장이 다시 깔리게
  "my_wordbook_created",       // 지운 뒤 빈 "내 단어장"이 다시 만들어지게
  "my_wordbook_newest_first",
  "my-archive-nudge-at",
  "my-archived-collapsed",
  "dict-save-target",          // 담을 단어장 설정 — 가리키던 단어장이 없어집니다
  "kata-save-failed",
  // 학습 기록
  "dict-search-history",
  "phrase-saved",
  "phrase-recent",
  "medali-cache",
  "medali-nudge-date",
  "kata-hari-ini",
  "story-quota-note",
  "story-quota-day",
  // 백업 표시 — 지운 뒤에는 "마지막 백업" 날짜가 맞지 않습니다
  "kata-backup-file-last",
];

/** 이 글자로 시작하는 localStorage 키를 모두 지웁니다 */
export const WIPE_LS_PREFIXES: string[] = [
  "cat-words-collapsed:", // 단어장별 접힘 상태
];

/** 안의 내용을 모두 비우는 IndexedDB (DB 자체는 남겨 각 모듈이 그대로 다시 씁니다) */
export const WIPE_DBS: string[] = [
  "kata-medali",        // 훈장 — 날짜별 점수·확정 단어·게임 판 기록
  "kata-lookup-words",  // 찾아본 단어
  "kata-dict-results",  // 사전 결과
  "kata-stories",       // 불러온 이야기
  "kata-percakapan",    // 만든 대화
  "kata-tips",          // 가져온 생활 정보
];

const ASK_EVENT = "kata-ask-local-wipe";

/** 계정 삭제가 끝난 직후에 부릅니다. 앱 맨 바깥의 확인 창(LocalWipeDialog)이 뜹니다. */
export function askLocalWipe(): void {
  try { window.dispatchEvent(new Event(ASK_EVENT)); } catch (e) {}
}

export function onAskLocalWipe(fn: () => void): () => void {
  const h = () => fn();
  try { window.addEventListener(ASK_EVENT, h); } catch (e) {}
  return () => {
    try { window.removeEventListener(ASK_EVENT, h); } catch (e) {}
  };
}

/** localStorage 쪽만 지웁니다. 지운 키 수를 돌려줍니다. */
export function wipeLocalStorageStudyData(store: Storage): number {
  let n = 0;
  const names: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (typeof k === "string") names.push(k);
    }
  } catch (e) {}
  for (const k of names) {
    const hit = WIPE_LS_KEYS.indexOf(k) !== -1 || WIPE_LS_PREFIXES.some((p) => k.indexOf(p) === 0);
    if (!hit) continue;
    try { store.removeItem(k); n++; } catch (e) {}
  }
  return n;
}

// DB 하나의 모든 저장 칸을 비웁니다. DB 가 아직 없으면 만들지 않습니다
// (판을 지정하지 않고 열었을 때 새로 만들어지려 하면 그 자리에서 취소 — 빈 DB 가 생기면 각 모듈의 초기 설정이 돌지 않습니다).
function clearDb(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    // 응답이 없으면 5초 뒤 넘어갑니다
    const timer = setTimeout(() => finish(false), 5000);
    const end = (ok: boolean) => { clearTimeout(timer); finish(ok); };
    try {
      if (typeof indexedDB === "undefined") { end(false); return; }
      const req = indexedDB.open(name);
      let created = false;
      req.onupgradeneeded = () => {
        created = true;
        try { req.transaction?.abort(); } catch (e) {}
      };
      req.onerror = () => end(created); // 새로 만들려다 취소한 것이면 "지울 것이 없음"이라 성공으로 봅니다
      req.onblocked = () => end(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const stores = Array.from(db.objectStoreNames);
          if (stores.length === 0) { db.close(); end(true); return; }
          const tx = db.transaction(stores, "readwrite");
          for (const s of stores) tx.objectStore(s).clear();
          tx.oncomplete = () => { db.close(); end(true); };
          tx.onerror = () => { db.close(); end(false); };
          tx.onabort = () => { db.close(); end(false); };
        } catch (e) {
          try { db.close(); } catch (e2) {}
          end(false);
        }
      };
    } catch (e) {
      end(false);
    }
  });
}

/**
 * 이 폰의 단어장과 학습 기록을 지웁니다. 설정·키는 건드리지 않습니다.
 * 모두 지웠으면 true. 하나라도 못 지웠으면 false (지울 수 있는 것은 지운 상태).
 * 부른 쪽은 끝난 뒤 화면을 새로 열어야 합니다 — 메모리에 남은 값이 다시 저장되지 않게.
 */
export async function wipeLocalStudyData(): Promise<boolean> {
  let ok = true;
  for (const name of WIPE_DBS) {
    const r = await clearDb(name);
    if (!r) ok = false;
  }
  try {
    wipeLocalStorageStudyData(localStorage);
  } catch (e) {
    ok = false;
  }
  return ok;
}
