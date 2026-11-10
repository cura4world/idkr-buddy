// src/lib/quizRound.ts
// 퀴즈 한 판에 낼 단어 고르기 — 단어장 퀴즈(QuizMode)와 보관함 퀴즈(SavedQuizMode)가 같이 씁니다.
//
// - 한 판은 최대 20문제입니다(시안 Q1 "5 / 20", Q2 "20개 중 16개").
// - 단어장이 20개보다 많으면 단어장 전체에서 무작위로 20개를 뽑습니다. "다시 하기"를 누를 때마다 새로 뽑습니다.
// - 랜덤(섞기)이 꺼져 있으면 뽑힌 단어를 단어장 순서대로, 켜져 있으면 섞은 순서로 냅니다.
// - 20개 이하이면 예전과 똑같습니다(전부, 꺼져 있으면 단어장 순서·켜져 있으면 섞어서).
// - 보기(오답)는 이 함수와 상관없이 단어장 전체에서 고릅니다.

export const QUIZ_ROUND_MAX = 20;

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** 이번 판에 낼 단어 (원본 배열은 건드리지 않습니다) */
export function pickRoundWords<T>(
  all: T[],
  random: boolean,
  max: number = QUIZ_ROUND_MAX,
  rand: () => number = Math.random
): T[] {
  const list = all || [];
  if (list.length <= max) return random ? shuffled(list, rand) : list.slice();
  const idx = shuffled(
    list.map((_, i) => i),
    rand
  ).slice(0, max);
  if (!random) idx.sort((x, y) => x - y);
  return idx.map((i) => list[i]);
}
