// src/lib/tangkapStages.ts
// 단어 받기(Tangkap) 단계 규칙. 받은 수가 늘면 예비 단어가 섞이고 보기가 어려워집니다.
// 화면과 떨어진 순수 함수만 두어 테스트에서 씨앗 있는 난수로 확인할 수 있습니다.
// (게임 화면은 Math.random 을 그대로 씁니다)

export interface TangkapStage {
  from: number;          // 이 단계가 시작되는 받은 수
  newChance: number;     // 다음 단어를 예비에서 새로 꺼낼 확률 (0이면 꺼내지 않음)
  similar: boolean;      // 오답 보기를 정답과 비슷한 뜻에서 먼저 고르는가
  choices: number;       // 뜻 버튼 수 (정답 1 + 오답)
  fallMinMs: number;     // 낙하 시간 하한
  note: string;          // 이 단계에 올라설 때 잠깐 보여 줄 말 (0단계는 비움)
}

// 숫자만 고치면 단계가 바뀝니다. from 은 오름차순이어야 합니다.
export const TANGKAP_STAGES: TangkapStage[] = [
  { from: 0, newChance: 0, similar: false, choices: 3, fallMinMs: 3500, note: "" },
  { from: 20, newChance: 0.2, similar: false, choices: 3, fallMinMs: 3500, note: "새 단어 등장" },
  { from: 40, newChance: 0.33, similar: true, choices: 3, fallMinMs: 3500, note: "비슷한 뜻이 섞입니다" },
  { from: 70, newChance: 0.5, similar: true, choices: 4, fallMinMs: 3000, note: "보기 4개 · 더 빨라집니다" },
];

export const RESERVE_WORDS = 40;    // 판 시작 때 확보할 예비 단어 수 (상한)
export const SIMILAR_LEN_GAP = 2;   // "비슷한 뜻" = 첫 글자가 같고 글자 수 차이가 이 이하

/** 받은 수에 맞는 단계 번호. 예비 단어가 하나도 없으면 늘 0단계(예전과 같은 게임)입니다. */
export function stageIndexFor(caught: number, hasReserve = true): number {
  if (!hasReserve) return 0;
  let idx = 0;
  for (let i = 0; i < TANGKAP_STAGES.length; i++) {
    if (caught >= TANGKAP_STAGES[i].from) idx = i;
  }
  return idx;
}

export function stageFor(caught: number, hasReserve = true): TangkapStage {
  return TANGKAP_STAGES[stageIndexFor(caught, hasReserve)];
}

/** 테스트용 씨앗 난수 (mulberry32). 같은 씨앗이면 같은 수열이 나옵니다. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export const meaningKey = (m: string): string =>
  String(m || "").replace(new RegExp("\\s+", "g"), " ").trim().toLowerCase();

// ── 다음 단어 고르기 ────────────────────────────────────────────────

export interface PickState {
  active: number[];       // 반복 목록 (pool 인덱스). 처음엔 core 전부, 새 단어가 나오면 뒤에 붙습니다
  queue: number[];        // 이번 바퀴에 남은 순서
  reserveLeft: number[];  // 아직 안 나온 예비 단어 (pool 인덱스, 뽑기 순서대로)
  last: number;           // 직전에 낸 인덱스 (-1 = 없음)
  hasReserve: boolean;    // 판 시작 때 예비가 하나라도 있었는가
}

/** pool = core(0..coreCount-1) + 예비(coreCount..) 로 이어 붙인 배열 기준의 시작 상태입니다. */
export function initPickState(coreCount: number, reserveCount: number): PickState {
  const active: number[] = [];
  for (let i = 0; i < coreCount; i++) active.push(i);
  const reserveLeft: number[] = [];
  for (let i = 0; i < reserveCount; i++) reserveLeft.push(coreCount + i);
  return { active, queue: [], reserveLeft, last: -1, hasReserve: reserveCount > 0 };
}

/**
 * 다음에 낼 단어. state 를 직접 고칩니다.
 * 단계 확률에 걸리면 예비에서 새 단어를 꺼내 반복 목록에 넣고, 아니면 반복 목록에서 냅니다.
 * 같은 단어가 연달아 나오지 않습니다(반복 목록이 2개 이상일 때).
 */
export function pickNext(
  state: PickState,
  caught: number,
  rand: () => number = Math.random
): { index: number; fresh: boolean } {
  const st = stageFor(caught, state.hasReserve);
  // 예비가 없거나 확률이 0이면 난수를 쓰지 않습니다 — 예전 게임과 같은 순서가 나옵니다
  if (st.newChance > 0 && state.reserveLeft.length > 0 && rand() < st.newChance) {
    const idx = state.reserveLeft.shift() as number;
    state.active.push(idx);
    state.last = idx;
    return { index: idx, fresh: true };
  }
  if (state.queue.length === 0) {
    state.queue = shuffleWith(state.active, rand);
    // 새 바퀴의 첫 단어가 직전 단어와 같으면 맨 뒤로 보냅니다
    if (state.queue.length > 1 && state.queue[0] === state.last) {
      const first = state.queue.shift() as number;
      state.queue.push(first);
    }
  }
  const next = state.queue.shift();
  const idx = typeof next === "number" ? next : 0;
  state.last = idx;
  return { index: idx, fresh: false };
}

// ── 뜻 보기 고르기 ──────────────────────────────────────────────────

/** 정답과 "비슷한 뜻"인가 — 첫 글자가 같고 글자 수 차이가 SIMILAR_LEN_GAP 이하 */
export function isSimilarMeaning(truth: string, other: string): boolean {
  const a = meaningKey(truth);
  const b = meaningKey(other);
  if (!a || !b || a === b) return false;
  if (a[0] !== b[0]) return false;
  return Math.abs(a.length - b.length) <= SIMILAR_LEN_GAP;
}

/**
 * 뜻 버튼 count개 (정답 1 + 오답 count-1, 섞음). 오답은 정답과 같은 뜻을 빼고 서로 겹치지 않게 고릅니다.
 * similar 면 비슷한 뜻을 먼저 고르고, 모자라면 나머지에서 무작위로 채웁니다.
 */
export function pickChoices(
  truth: string,
  candidates: string[],
  count: number,
  similar: boolean,
  rand: () => number = Math.random
): string[] {
  const key = meaningKey(truth);
  const others = candidates.filter((m) => meaningKey(m) !== key);
  const shuffled = shuffleWith(others, rand);
  const ordered = similar
    ? shuffled.filter((m) => isSimilarMeaning(truth, m)).concat(shuffled.filter((m) => !isSimilarMeaning(truth, m)))
    : shuffled;

  const picked: string[] = [];
  const used = new Set<string>([key]);
  for (const m of ordered) {
    if (picked.length >= count - 1) break;
    const k = meaningKey(m);
    if (used.has(k)) continue;
    used.add(k);
    picked.push(m);
  }
  return shuffleWith([truth].concat(picked), rand);
}

// ── 기록 ────────────────────────────────────────────────────────────

/** 기록에 남길 단어. 예비에서 나온 새 단어는 첫 응답이 맞았을 때만 남깁니다. */
export function wordsToRecord<T extends { correct: boolean; fresh: boolean }>(list: T[]): T[] {
  return list.filter((w) => !w.fresh || w.correct);
}
