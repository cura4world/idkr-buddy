import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAnswerList,
  pickForDay,
  puzzleOrder,
  scoreGuess,
  keyMarks,
  isValidGuess,
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

const CATS = [
  { id: "c1", name: "23 동물" },
  { id: "c2", name: "16 집·생활용품" },
  { id: "c9", name: "30 성경 핵심어" },
];

const WORDS = [
  { word: "kotak", meaning: "상자", categoryId: "c2" },
  { word: "gajah", meaning: "코끼리", categoryId: "c1" },
  { word: "rusa", meaning: "사슴", categoryId: "c1" },        // 네 글자 — 제외
  { word: "Musa", meaning: "모세", categoryId: "c9" },        // 성경 — 제외
  { word: "Yesus", meaning: "예수", categoryId: "c9" },       // 대문자·성경 — 제외
  { word: "Bekas", meaning: "흔적", categoryId: "c2" },       // 대문자 — 제외
  { word: "iman", meaning: "믿음", categoryId: "c9" },
  { word: "dosa1", meaning: "-", categoryId: "c2" },          // 숫자 — 제외
  { word: "kucing", meaning: "고양이", categoryId: "c1" },    // 여섯 글자 — 제외
  { word: "sapi ", meaning: "소", categoryId: "c1" },
  { word: "rumah", meaning: "집; 가정", categoryId: "c2" },
  { word: "rumah", meaning: "가옥", categoryId: "c1" },       // 중복 — id 가 앞선 c1 의 뜻
  { word: "salib", meaning: "십자가", categoryId: "c9" },     // 성경 단어장 — 제외
];

describe("정답 목록", () => {
  it("소문자 다섯 글자만, 성경 단어장 제외, 알파벳순, 중복은 하나", () => {
    const list = buildAnswerList(WORDS, CATS);
    expect(list.map((w) => w.word)).toEqual(["gajah", "kotak", "rumah"]);
    expect(list.find((w) => w.word === "rumah")?.meaning).toBe("가옥");
  });

  it("CSV 줄 순서가 달라도 같은 목록", () => {
    const a = buildAnswerList(WORDS, CATS);
    const b = buildAnswerList(WORDS.slice().reverse(), CATS);
    expect(b).toEqual(a);
  });

  it("앱의 기본 단어장에서 충분한 후보가 나온다", () => {
    const list = answerList();
    expect(list.length).toBeGreaterThan(100);
    for (const w of list) {
      expect(w.word.length).toBe(5);
      expect(isValidGuess(w.word)).toBe(true);
      expect(w.meaning.length).toBeGreaterThan(0);
    }
  });
});

describe("날짜별 단어", () => {
  const list = Array.from({ length: 50 }, (_, i) => ({ word: "w" + String(i).padStart(4, "0"), meaning: "m" + i }));

  it("같은 날짜면 언제나 같은 단어", () => {
    const d = 20402;
    expect(pickForDay(list, d)).toEqual(pickForDay(list.slice(), d));
    expect(puzzleOrder(list)).toEqual(puzzleOrder(list));
  });

  it("목록 길이만큼의 날 동안 같은 단어가 다시 나오지 않는다", () => {
    const seen = new Set<string>();
    for (let d = 20000; d < 20050; d++) seen.add((pickForDay(list, d) as { word: string }).word);
    expect(seen.size).toBe(50);
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
  });

  it("같은 시각이면 todayPuzzle 이 같은 단어", () => {
    const t = Date.UTC(2026, 10, 10, 3, 0, 0);
    expect(todayPuzzle(t)).toEqual(todayPuzzle(t + 60 * 60 * 1000));
    expect(todayPuzzle(t)).not.toBeNull();
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

  it("입력 검사", () => {
    expect(isValidGuess("kotak")).toBe(true);
    expect(isValidGuess("kota")).toBe(false);
    expect(isValidGuess("kot4k")).toBe(false);
    expect(isValidGuess("KOTAK")).toBe(false);
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
