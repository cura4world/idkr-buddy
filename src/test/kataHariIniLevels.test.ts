// 오늘의 단어 퍼즐 4·5·6글자 단계(2026-11-25) — 동결본 목록·단계 오르내림·날짜별 정답
import { describe, it, expect, beforeEach } from "vitest";
import {
  answerForDay,
  answerList,
  applyDayResult,
  dayKeyOf,
  fixDayLength,
  getDayRecord,
  getLevelState,
  isKnownWord,
  kstDayNumber,
  LEVEL_DEFAULT,
  nextLevel,
  saveDayRecord,
  setLevelForTest,
  todayKey,
} from "@/lib/kataHariIni";
import type { LevelState } from "@/lib/kataHariIni";
import { KATA4_ANSWERS, KATA4_EPOCH_DAY } from "@/data/kataHariIniWords4";
import { KATA6_ANSWERS, KATA6_EPOCH_DAY } from "@/data/kataHariIniWords6";
import { KATA4_EXTRA_GUESSES } from "@/data/kataHariIniGuesses4";
import { KATA6_EXTRA_GUESSES } from "@/data/kataHariIniGuesses6";

const isAz = (w: string, n: number): boolean => w.length === n && Array.from(w).every((c) => c >= "a" && c <= "z");
const day = (y: number, m: number, d: number): number => kstDayNumber(Date.UTC(y, m - 1, d, 3, 0, 0));

describe("4·6글자 동결본 목록", () => {
  it("개수 — 4글자 183, 6글자 313 (후보 문서 2단계 확정)", () => {
    expect(KATA4_ANSWERS.length).toBe(183);
    expect(KATA6_ANSWERS.length).toBe(313);
  });

  it("소문자 4·6글자, 중복 없음, 뜻 있음", () => {
    for (const [list, n] of [[KATA4_ANSWERS, 4], [KATA6_ANSWERS, 6]] as const) {
      const seen = new Set<string>();
      for (const [w, m] of list) {
        expect(isAz(w, n), w).toBe(true);
        expect(seen.has(w), w).toBe(false);
        seen.add(w);
        expect(m.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("기준일(0번 날)은 2026-11-26 — 4·6 모두", () => {
    expect(dayKeyOf(KATA4_EPOCH_DAY)).toBe("2026-11-26");
    expect(dayKeyOf(KATA6_EPOCH_DAY)).toBe("2026-11-26");
    expect(answerForDay(day(2026, 11, 26), 4)?.word).toBe(KATA4_ANSWERS[0][0]);
    expect(answerForDay(day(2026, 11, 26), 6)?.word).toBe(KATA6_ANSWERS[0][0]);
  });

  it("검토에서 뺀 단어는 정답에 없고, 입력으로는 받음", () => {
    const a4 = new Set(KATA4_ANSWERS.map((p) => p[0]));
    const a6 = new Set(KATA6_ANSWERS.map((p) => p[0]));
    for (const w of ["bemo", "mama", "papa", "babi"]) {
      expect(a4.has(w), w).toBe(false);
      expect(isKnownWord(w, 4), w).toBe(true);
    }
    for (const w of ["anjing", "kanker", "campak"]) {
      expect(a6.has(w), w).toBe(false);
      expect(isKnownWord(w, 6), w).toBe(true);
    }
    // 구어·기능어도 정답에 없음
    for (const w of ["yang", "dari", "kita", "tapi", "udah", "ojol", "wifi"]) expect(a4.has(w), w).toBe(false);
    for (const w of ["dengan", "karena", "banget", "ponsel", "laptop"]) expect(a6.has(w), w).toBe(false);
  });

  it("뜻 고침이 들어가 있음", () => {
    const m4 = new Map(KATA4_ANSWERS.map((p) => [p[0], p[1]]));
    const m6 = new Map(KATA6_ANSWERS.map((p) => [p[0], p[1]]));
    expect(m4.get("buah")).toBe("과일·열매 (사물 세는 말)");
    expect(m4.get("hati")).toBe("마음·간");
    expect(m4.get("ekor")).toBe("꼬리 (동물 세는 말)");
    expect(m4.get("biji")).toBe("씨앗·알 (작은 것 세는 말)");
    expect(m6.get("piring")).toBe("접시");
    expect(m6.get("kaleng")).toBe("캔·깡통");
    for (const [, m] of KATA4_ANSWERS.concat(KATA6_ANSWERS)) expect(m.indexOf("수분류사"), m).toBe(-1);
  });

  it("넣을 수 있는 말 — 글자 수 맞음·중복 없음·정답과 겹치지 않음, 4글자는 합쳐 700개 이상", () => {
    for (const [extra, ans, n] of [[KATA4_EXTRA_GUESSES, KATA4_ANSWERS, 4], [KATA6_EXTRA_GUESSES, KATA6_ANSWERS, 6]] as const) {
      const a = new Set(ans.map((p) => p[0]));
      const seen = new Set<string>();
      for (const w of extra) {
        expect(isAz(w, n), w).toBe(true);
        expect(seen.has(w), w).toBe(false);
        expect(a.has(w), w).toBe(false);
        seen.add(w);
      }
    }
    expect(KATA4_ANSWERS.length + KATA4_EXTRA_GUESSES.length).toBeGreaterThanOrEqual(700);
  });

  it("단계마다 자기 목록의 말만 받음", () => {
    expect(isKnownWord("mata", 4)).toBe(true);
    expect(isKnownWord("mata", 5)).toBe(false);
    expect(isKnownWord("rumah", 5)).toBe(true);
    expect(isKnownWord("rumah", 4)).toBe(false);
    expect(isKnownWord("kucing", 6)).toBe(true);
    expect(isKnownWord("zzzz", 4)).toBe(false);
    expect(isKnownWord("qwerty", 6)).toBe(false);
  });
});

describe("날짜별 정답", () => {
  it("같은 날 같은 단계끼리는 같은 문제, 한 바퀴 동안 겹치지 않음", () => {
    for (const n of [4, 6] as const) {
      const list = answerList(n);
      const seen = new Set<string>();
      for (let i = 0; i < list.length; i++) {
        const d = day(2026, 11, 26) + i;
        const a = answerForDay(d, n)!;
        expect(answerForDay(d, n)).toEqual(a);
        seen.add(a.word);
      }
      expect(seen.size).toBe(list.length);
    }
  });

  it("5글자 지난 정답·기준일은 그대로", () => {
    expect(answerForDay(day(2026, 11, 10))?.word).toBe("mewah");
    expect(answerForDay(day(2026, 11, 11))?.word).toBe("pedas");
    expect(answerForDay(day(2026, 11, 25))?.word).toBe("hakim");
    expect(answerForDay(day(2026, 11, 25), 5)?.word).toBe("hakim");
    expect(answerForDay(day(2028, 2, 11), 5)?.word).toBe("koper");
    expect(answerList(5).length).toBe(459);
  });
});

describe("단계 오르내림 (nextLevel)", () => {
  const run = (start: LevelState, results: Array<[boolean, number]>) => {
    let s = start;
    const changes: Array<number | null> = [];
    results.forEach(([won, tries], i) => {
      const r = nextLevel(s, { won, tries }, "d" + i);
      s = r.state;
      changes.push(r.changed);
    });
    return { s, changes };
  };

  it("처음은 5글자", () => {
    expect(LEVEL_DEFAULT.cur).toBe(5);
  });

  it("이틀 연속 못 맞히면 한 단계 아래(5 → 4)", () => {
    const { s, changes } = run(LEVEL_DEFAULT, [[false, 6], [false, 6]]);
    expect(changes).toEqual([null, 4]);
    expect(s.cur).toBe(4);
    expect(s.fails).toBe(0);
  });

  it("못 맞힘 사이에 맞힌 날이 끼면 연속이 끊김", () => {
    const { s } = run(LEVEL_DEFAULT, [[false, 6], [true, 5], [false, 6]]);
    expect(s.cur).toBe(5);
    expect(s.fails).toBe(1);
  });

  it("세 번 연속 세 줄 안에 맞히면 한 단계 위(5 → 6) — 힌트를 본 날도 같게 셈(결과만 봄)", () => {
    const { s, changes } = run(LEVEL_DEFAULT, [[true, 3], [true, 2], [true, 1]]);
    expect(changes).toEqual([null, null, 6]);
    expect(s.cur).toBe(6);
  });

  it("네 줄 이상으로 맞히면 빨리 맞힘 연속이 끊김", () => {
    const { s } = run(LEVEL_DEFAULT, [[true, 3], [true, 3], [true, 4], [true, 3]]);
    expect(s.cur).toBe(5);
    expect(s.fasts).toBe(1);
  });

  it("4글자 아래로는 안 내려가고, 6글자 위로는 안 올라감(연속은 0 으로)", () => {
    const low = run({ cur: 4, fails: 0, fasts: 0 }, [[false, 6], [false, 6]]);
    expect(low.s.cur).toBe(4);
    expect(low.changes).toEqual([null, null]);
    expect(low.s.fails).toBe(0);
    const high = run({ cur: 6, fails: 0, fasts: 0 }, [[true, 1], [true, 2], [true, 3]]);
    expect(high.s.cur).toBe(6);
    expect(high.changes).toEqual([null, null, null]);
    expect(high.s.fasts).toBe(0);
  });

  it("4 → 5 → 6 으로 한 칸씩", () => {
    const { s, changes } = run({ cur: 4, fails: 0, fasts: 0 }, [[true, 2], [true, 2], [true, 2], [true, 3], [true, 3], [true, 1]]);
    expect(changes).toEqual([null, null, 5, null, null, 6]);
    expect(s.cur).toBe(6);
  });
});

describe("기록과 단계 (localStorage)", () => {
  beforeEach(() => localStorage.clear());

  it("안 푼 날(끝내지 않은 날)은 세지 않고 연속도 끊지 않음, 끝난 날은 한 번만 셈", () => {
    saveDayRecord("2026-11-26", { guesses: ["mata"], done: true, won: false, hint: false, len: 5 });
    expect(applyDayResult("2026-11-26")).toBeNull();
    expect(getLevelState().fails).toBe(1);
    // 두 번 불러도 한 번만
    expect(applyDayResult("2026-11-26")).toBeNull();
    expect(getLevelState().fails).toBe(1);
    // 27일은 열기만 하고 끝내지 않음 → 세지 않음
    saveDayRecord("2026-11-27", { guesses: ["kota"], done: false, won: false, hint: false, len: 5 });
    expect(applyDayResult("2026-11-27")).toBeNull();
    expect(getLevelState().fails).toBe(1);
    // 28일 또 실패 → 이틀 연속(가운데 안 푼 날은 무시) → 4글자로
    saveDayRecord("2026-11-28", { guesses: ["a", "b", "c", "d", "e", "f"], done: true, won: false, hint: true, len: 5 });
    expect(applyDayResult("2026-11-28")).toBe(4);
    expect(getLevelState().cur).toBe(4);
    expect(getLevelState().changedOn).toBe("2026-11-28");
    expect(getDayRecord("2026-11-28").counted).toBe(true);
  });

  it("그날 문제의 글자 수는 처음 연 순간의 단계로 고정 — 그 뒤 단계가 바뀌어도 그대로", () => {
    expect(fixDayLength("2026-11-26")).toBe(5);
    // 같은 날 단계가 4로 바뀌어도(다른 날 결과) 오늘 기록의 글자 수는 5
    saveDayRecord("2026-11-25", { guesses: [], done: true, won: false, hint: false, len: 5 });
    saveDayRecord("2026-11-24", { guesses: [], done: true, won: false, hint: false, len: 5 });
    applyDayResult("2026-11-24");
    applyDayResult("2026-11-25");
    expect(getLevelState().cur).toBe(4);
    expect(fixDayLength("2026-11-26")).toBe(5);
    // 다음 날 처음 열면 4글자
    expect(fixDayLength("2026-11-27")).toBe(4);
  });

  it("단계 도입 전에 풀기 시작한 날(글자 수 기록 없음)은 5글자", () => {
    setLevelForTest(6);
    saveDayRecord("2026-11-20", { guesses: ["kotak"], done: false, won: false, hint: false });
    expect(fixDayLength("2026-11-20")).toBe(5);
  });

  it("시험용 단계 바꾸기 — 단계를 정하고 오늘 기록을 지움", () => {
    const now = Date.UTC(2026, 10, 26, 3, 0, 0);
    saveDayRecord(todayKey(now), { guesses: ["mata"], done: false, won: false, hint: false, len: 5 });
    setLevelForTest(6, now);
    expect(getLevelState().cur).toBe(6);
    expect(getDayRecord(todayKey(now)).guesses).toEqual([]);
  });
});
