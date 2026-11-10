import { describe, it, expect, beforeEach, vi } from "vitest";

// 정답이 단어장(seed.json)과 무관한지 확인하려고 빈 단어장으로 바꿔 둡니다.
// kataHariIni 가 seed 를 조금이라도 쓰면 아래 날짜별 정답 시험이 깨집니다.
vi.mock("@/data/seed.json", () => ({ default: { version: 0, categories: [], words: [] } }));

import {
  answerForDay,
  pickForDay,
  scoreGuess,
  keyMarks,
  isValidGuess,
  isKnownWord,
  kstDayNumber,
  dayKeyOf,
  todayKey,
  streakFrom,
  answerList,
  todayPuzzle,
  saveDayRecord,
  getDayRecord,
} from "@/lib/kataHariIni";
import type { DayRecord } from "@/lib/kataHariIni";
import { KATA_ANSWERS, KATA_EPOCH_DAY } from "@/data/kataHariIniWords";
import { KATA_EXTRA_GUESSES } from "@/data/kataHariIniGuesses";

const isAz5 = (w: string): boolean => w.length === 5 && Array.from(w).every((c) => c >= "a" && c <= "z");

describe("정답 목록 (동결본)", () => {
  it("소문자 다섯 글자, 중복 없음, 뜻 있음", () => {
    const list = answerList();
    expect(list.length).toBe(KATA_ANSWERS.length);
    expect(list.length).toBeGreaterThan(100);
    const seen = new Set<string>();
    for (const w of list) {
      expect(isAz5(w.word)).toBe(true);
      expect(seen.has(w.word)).toBe(false);
      seen.add(w.word);
      expect(w.meaning.trim().length).toBeGreaterThan(0);
    }
  });

  it("0번 날은 2026-11-10 (한국 시간)", () => {
    expect(dayKeyOf(KATA_EPOCH_DAY)).toBe("2026-11-10");
  });

  it("날짜별 정답이 고정돼 있다 — 단어장이 비어 있어도 같다", () => {
    // 동결 전 규칙으로 이미 나간 날과 같은 단어여야 합니다 (11-10 mewah, 11-11 pedas)
    const day = (y: number, m: number, d: number): number => kstDayNumber(Date.UTC(y, m - 1, d, 3, 0, 0));
    expect(answerForDay(day(2026, 11, 10))?.word).toBe("mewah");
    expect(answerForDay(day(2026, 11, 11))?.word).toBe("pedas");
    expect(answerForDay(day(2026, 11, 12))?.word).toBe("musim");
    expect(answerForDay(day(2028, 2, 11))?.word).toBe("koper");  // 마지막 줄 (11-11 구어·영어 23개 뺀 뒤 459개)
    expect(answerForDay(day(2028, 2, 12))?.word).toBe("mewah");  // 한 바퀴 돌아 처음으로
    expect(todayPuzzle(Date.UTC(2026, 10, 11, 3, 0, 0))?.word).toBe("pedas");
  });

  it("목록 끝에 붙여도 그 전 날짜의 정답은 그대로", () => {
    const base = answerList();
    const longer = base.concat([{ word: "zzzzz", meaning: "시험" }]);
    for (let i = 0; i < base.length; i++) {
      expect(pickForDay(longer, KATA_EPOCH_DAY + i)).toEqual(pickForDay(base, KATA_EPOCH_DAY + i));
    }
    expect(pickForDay(longer, KATA_EPOCH_DAY + base.length)?.word).toBe("zzzzz");
  });
});

describe("날짜별 단어", () => {
  const list = Array.from({ length: 50 }, (_, i) => ({ word: "w" + String(i).padStart(4, "0"), meaning: "m" + i }));

  it("목록 길이만큼의 날 동안 같은 단어가 다시 나오지 않는다", () => {
    const seen = new Set<string>();
    for (let d = 20000; d < 20050; d++) seen.add((pickForDay(list, d, 20000) as { word: string }).word);
    expect(seen.size).toBe(50);
  });

  it("epoch 이전 날짜도 목록 안에서 고른다", () => {
    expect(pickForDay(list, 19999, 20000)?.word).toBe("w0049");
  });

  it("빈 목록이면 null", () => {
    expect(pickForDay([], 1)).toBeNull();
  });

  it("한국 시간 자정에 날짜가 바뀐다 (기기 시간대와 무관)", () => {
    // 2026-11-10 14:59:59 UTC = 11-10 23:59:59 KST, 15:00:00 UTC = 11-11 00:00 KST
    const before = Date.UTC(2026, 10, 10, 14, 59, 59);
    const after = Date.UTC(2026, 10, 10, 15, 0, 0);
    expect(todayKey(before)).toBe("2026-11-10");
    expect(todayKey(after)).toBe("2026-11-11");
    expect(kstDayNumber(after) - kstDayNumber(before)).toBe(1);
    expect(dayKeyOf(kstDayNumber(after))).toBe("2026-11-11");
    expect(todayPuzzle(before)?.word).toBe("mewah");
    expect(todayPuzzle(after)?.word).toBe("pedas");
  });

  it("같은 날이면 todayPuzzle 이 같은 단어", () => {
    const t = Date.UTC(2026, 10, 10, 3, 0, 0);
    expect(todayPuzzle(t)).toEqual(todayPuzzle(t + 60 * 60 * 1000));
    expect(todayPuzzle(t)).not.toBeNull();
  });
});

describe("입력 검사", () => {
  it("모양 검사", () => {
    expect(isValidGuess("kotak")).toBe(true);
    expect(isValidGuess("kota")).toBe(false);
    expect(isValidGuess("kot4k")).toBe(false);
    expect(isValidGuess("KOTAK")).toBe(false);
  });

  it("정답 목록에 있는 단어는 받는다", () => {
    for (const [w] of KATA_ANSWERS) expect(isKnownWord(w)).toBe(true);
  });

  it("추가 단어 목록의 단어도 받는다", () => {
    expect(isKnownWord("makan")).toBe(true);
    expect(isKnownWord("rumah")).toBe(true);
    expect(isKnownWord("pergi")).toBe(true);
    expect(isKnownWord("sumur")).toBe(true);
    for (const w of KATA_EXTRA_GUESSES) expect(isKnownWord(w)).toBe(true);
  });

  it("단어가 아닌 다섯 글자는 받지 않는다", () => {
    expect(isKnownWord("maanu")).toBe(false);   // QA Q12 재현 입력
    expect(isKnownWord("aaaaa")).toBe(false);
    expect(isKnownWord("qwert")).toBe(false);
    expect(isKnownWord("zzzzz")).toBe(false);
    expect(isKnownWord("kota")).toBe(false);
    expect(isKnownWord("MAKAN")).toBe(false);   // 입력은 소문자로 들어옵니다
  });

  it("추가 단어 목록도 소문자 다섯 글자, 중복 없음, 정답과 겹치지 않음", () => {
    const ans = new Set(KATA_ANSWERS.map((p) => p[0]));
    const seen = new Set<string>();
    for (const w of KATA_EXTRA_GUESSES) {
      expect(isAz5(w)).toBe(true);
      expect(seen.has(w)).toBe(false);
      expect(ans.has(w)).toBe(false);
      seen.add(w);
    }
  });
});

describe("채점", () => {
  it("모두 맞음", () => {
    expect(scoreGuess("kotak", "kotak")).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  });

  it("자리 다름·없음", () => {
    // 정답 sumur: s hit, u near(정답 2번째 자리에 u), r near, a miss, t miss
    expect(scoreGuess("surat", "sumur")).toEqual(["hit", "hit", "near", "miss", "miss"]);
    expect(scoreGuess("tarik", "sumur")).toEqual(["miss", "miss", "near", "miss", "miss"]);
  });

  it("반복 글자 — 정답에 하나뿐이면 hit 를 먼저 쓰고 나머지는 miss", () => {
    // 정답 kotak 에는 k 가 둘(0, 4), a 가 하나(3)
    expect(scoreGuess("kakak", "kotak")).toEqual(["hit", "miss", "miss", "hit", "hit"]);
    // 정답 gajah 에는 a 가 둘(1, 3). 입력 aaaaa → 1, 3 만 hit, 나머지 miss
    expect(scoreGuess("aaaaa", "gajah")).toEqual(["miss", "hit", "miss", "hit", "miss"]);
  });

  it("반복 글자 — 왼쪽부터 남은 개수만큼 near", () => {
    // 정답 kotak, 입력 tkkoa: t near, k near, k near(두 번째 k), o near, a near
    expect(scoreGuess("tkkoa", "kotak")).toEqual(["near", "near", "near", "near", "near"]);
    // 정답 rumah(r 하나), 입력 rerer → r hit 만, 나머지 r 은 miss
    expect(scoreGuess("rerer", "rumah")).toEqual(["hit", "miss", "miss", "miss", "miss"]);
    // 정답 papan(p 둘, a 둘), 입력 apapa → a near, p near, a near, p near, a miss
    expect(scoreGuess("apapa", "papan")).toEqual(["near", "near", "near", "near", "miss"]);
  });

  it("대문자 입력도 같은 판정", () => {
    expect(scoreGuess("KOTAK", "kotak")).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  });

  it("자판 색은 가장 좋은 판정을 남긴다", () => {
    const m = keyMarks(["tarik", "kotak"], "kotak");
    expect(m.k).toBe("hit");
    expect(m.r).toBe("miss");
    // takut vs kotak → t near, a near, k near, u miss, t miss — 같은 글자 t 는 near 가 남습니다
    const m2 = keyMarks(["takut"], "kotak");
    expect(m2.t).toBe("near");
    expect(m2.u).toBe("miss");
  });
});

describe("연속 일수", () => {
  const today = 20402;
  const rec = (won: boolean, done = true): DayRecord => ({ guesses: ["kotak"], done, won, hint: false });

  it("어제까지 3일 연속이고 오늘 아직 안 풀었으면 3", () => {
    const days: Record<string, DayRecord> = {};
    days[dayKeyOf(today - 1)] = rec(true);
    days[dayKeyOf(today - 2)] = rec(true);
    days[dayKeyOf(today - 3)] = rec(true);
    days[dayKeyOf(today - 5)] = rec(true);
    expect(streakFrom(days, today)).toBe(3);
  });

  it("오늘 맞히면 4", () => {
    const days: Record<string, DayRecord> = {};
    days[dayKeyOf(today)] = rec(true);
    days[dayKeyOf(today - 1)] = rec(true);
    days[dayKeyOf(today - 2)] = rec(true);
    days[dayKeyOf(today - 3)] = rec(true);
    expect(streakFrom(days, today)).toBe(4);
  });

  it("오늘 실패하면 0, 풀다 만 것은 어제까지", () => {
    const days: Record<string, DayRecord> = {};
    days[dayKeyOf(today - 1)] = rec(true);
    days[dayKeyOf(today)] = rec(false, true);
    expect(streakFrom(days, today)).toBe(0);
    days[dayKeyOf(today)] = rec(false, false);
    expect(streakFrom(days, today)).toBe(1);
  });
});

describe("기록 저장", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("저장한 것을 그대로 읽는다", () => {
    saveDayRecord("2026-11-10", { guesses: ["surat", "kotak"], done: true, won: true, hint: true });
    const r = getDayRecord("2026-11-10");
    expect(r.guesses).toEqual(["surat", "kotak"]);
    expect(r.won).toBe(true);
    expect(r.hint).toBe(true);
  });

  it("없는 날은 빈 기록", () => {
    expect(getDayRecord("2000-01-01")).toEqual({ guesses: [], done: false, won: false, hint: false });
  });
});
