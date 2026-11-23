import { describe, it, expect, vi, afterEach } from "vitest";
import {
  TANGKAP_STAGES,
  stageIndexFor,
  stageFor,
  mulberry32,
  initPickState,
  pickNext,
  pickChoices,
  isSimilarMeaning,
  meaningKey,
  wordsToRecord,
} from "@/lib/tangkapStages";
import { drawFromCandidates } from "@/lib/gamePool";
import type { PoolWord } from "@/lib/gamePool";

const CORE = 20;

// 같은 받은 수에서 n번 뽑아 새 단어 비율을 셉니다 (예비는 넉넉히 둡니다)
function freshRatio(caught: number, n: number, seed: number): number {
  const rand = mulberry32(seed);
  const st = initPickState(CORE, n + 10);
  let fresh = 0;
  for (let i = 0; i < n; i++) if (pickNext(st, caught, rand).fresh) fresh++;
  return fresh / n;
}

describe("단어 받기 단계", () => {
  it("받은 수에 맞는 단계 (0–19 / 20–39 / 40–69 / 70+)", () => {
    expect([0, 19, 20, 39, 40, 69, 70, 500].map((c) => stageIndexFor(c))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(stageIndexFor(120, false)).toBe(0);
    expect(stageFor(70).choices).toBe(4);
    expect(stageFor(70).fallMinMs).toBe(3000);
    expect(stageFor(69).fallMinMs).toBe(3500);
  });

  it("0–19개에서는 예비 단어가 한 번도 나오지 않습니다", () => {
    const rand = mulberry32(1);
    const st = initPickState(CORE, 40);
    for (let caught = 0; caught < 20; caught++) {
      for (let i = 0; i < 100; i++) {
        const r = pickNext(st, caught, rand);
        expect(r.fresh).toBe(false);
        expect(r.index).toBeLessThan(CORE);
      }
    }
    expect(st.reserveLeft.length).toBe(40);
  });

  it("단계별 새 단어 비율 (2000번, ±4%)", () => {
    expect(Math.abs(freshRatio(30, 2000, 7) - 0.2)).toBeLessThanOrEqual(0.04);
    expect(Math.abs(freshRatio(50, 2000, 8) - 0.33)).toBeLessThanOrEqual(0.04);
    expect(Math.abs(freshRatio(80, 2000, 9) - 0.5)).toBeLessThanOrEqual(0.04);
  });

  it("예비가 비어 있으면 core만 쓰는 예전 순서와 같습니다", () => {
    const a = initPickState(CORE, 0);
    const b = initPickState(CORE, 0);
    const c = initPickState(CORE, 40);
    const ra = mulberry32(42);
    const rb = mulberry32(42);
    const rc = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const x = pickNext(a, 80, ra);    // 높은 단계라도 예비가 없으면
      const y = pickNext(b, 0, rb);     // 0단계와 같고
      const z = pickNext(c, 10, rc);    // 예비가 있어도 0–19개면 같습니다
      expect(x.index).toBe(y.index);
      expect(z.index).toBe(y.index);
      expect(x.fresh).toBe(false);
      expect(x.index).toBeLessThan(CORE);
    }
  });

  it("같은 단어가 연달아 나오지 않습니다", () => {
    for (const [core, reserve] of [[20, 40], [20, 0], [6, 3], [2, 0]]) {
      const rand = mulberry32(core * 100 + reserve);
      const st = initPickState(core, reserve);
      let last = -1;
      for (let i = 0; i < 3000; i++) {
        const caught = Math.floor(i / 20);   // 0에서 149까지 천천히 오릅니다
        const r = pickNext(st, caught, rand);
        expect(r.index).not.toBe(last);
        last = r.index;
      }
    }
  });

  it("새 단어는 한 번 나오면 반복 목록에 들어가고, 예비는 한 번씩만 꺼냅니다", () => {
    const rand = mulberry32(5);
    const st = initPickState(CORE, 40);
    const seenFresh = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const r = pickNext(st, 80, rand);
      if (r.fresh) {
        expect(seenFresh.has(r.index)).toBe(false);
        seenFresh.add(r.index);
        expect(st.active).toContain(r.index);
      }
    }
    expect(seenFresh.size).toBe(40);
    expect(st.reserveLeft.length).toBe(0);
    expect(st.active.length).toBe(CORE + 40);
  });

  it("보기 수: 70개 미만 3개, 70개부터 4개, 뜻 중복 없음", () => {
    const meanings: string[] = [];
    for (let i = 0; i < 30; i++) meanings.push("뜻" + i);
    meanings.push("뜻 3", "뜻3");   // 띄어쓰기만 다른 같은 뜻도 한 번만
    const rand = mulberry32(3);
    for (const caught of [0, 25, 50, 69, 70, 100]) {
      const st = stageFor(caught);
      for (let k = 0; k < 200; k++) {
        const truth = meanings[k % 30];
        const got = pickChoices(truth, meanings, st.choices, st.similar, rand);
        expect(got.length).toBe(caught >= 70 ? 4 : 3);
        expect(got).toContain(truth);
        expect(new Set(got.map(meaningKey)).size).toBe(got.length);
      }
    }
  });

  it("비슷한 뜻 단계에서는 첫 글자·길이가 비슷한 뜻을 먼저 고릅니다", () => {
    expect(isSimilarMeaning("먹다", "먹이다")).toBe(true);
    expect(isSimilarMeaning("먹다", "가다")).toBe(false);
    expect(isSimilarMeaning("먹다", "먹다")).toBe(false);
    const cands = ["먹이다", "먹히다", "가다", "오다", "자다", "서다", "보다"];
    const rand = mulberry32(11);
    for (let k = 0; k < 50; k++) {
      const got = pickChoices("먹다", cands, 3, true, rand);
      expect(got.slice().sort()).toEqual(["먹다", "먹이다", "먹히다"].sort());
    }
    // 비슷한 뜻이 모자라면 나머지에서 채웁니다
    const few = pickChoices("먹다", ["먹이다", "가다", "오다"], 4, true, rand);
    expect(few.length).toBe(4);
  });

  it("기록 목록: 새 단어는 첫 응답이 맞았을 때만 남습니다", () => {
    const list = [
      { word: "a", correct: true, fresh: false },
      { word: "b", correct: false, fresh: false },
      { word: "c", correct: true, fresh: true },
      { word: "d", correct: false, fresh: true },
    ];
    expect(wordsToRecord(list).map((w) => w.word)).toEqual(["a", "b", "c"]);
  });

  it("단계 표는 from 오름차순이고 0단계는 예전 값입니다", () => {
    for (let i = 1; i < TANGKAP_STAGES.length; i++) {
      expect(TANGKAP_STAGES[i].from).toBeGreaterThan(TANGKAP_STAGES[i - 1].from);
    }
    expect(TANGKAP_STAGES[0]).toMatchObject({ from: 0, newChance: 0, choices: 3, fallMinMs: 3500, similar: false });
  });
});

describe("예비 단어 뽑기 (drawFromCandidates)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeAll = (): PoolWord[] => {
    const out: PoolWord[] = [];
    const statuses: PoolWord["status"][] = ["pending", "pending", "recheck", "confirmed", "monitoring"];
    const sources: PoolWord["source"][] = ["wordbook", "lookup", "seed"];
    for (let i = 0; i < 120; i++) {
      out.push({
        word: "kata" + i,
        meaning: "뜻" + (i % 90),            // 일부러 뜻이 겹치는 단어를 둡니다
        source: sources[i % 3],
        status: statuses[i % 5],
        nearConfirm: i % 17 === 0 ? true : undefined,
      });
    }
    return out;
  };

  const run = (reserve: number) => {
    const rand = mulberry32(2026);
    vi.spyOn(Math, "random").mockImplementation(rand);
    const r = drawFromCandidates(makeAll(), 14, 6, reserve);
    vi.restoreAllMocks();
    return r;
  };

  it("core는 예비 수와 상관없이 drawPool 결과와 같습니다", () => {
    const plain = run(0);
    const withReserve = run(40);
    expect(plain.reserve.length).toBe(0);
    expect(withReserve.core.map((p) => p.word)).toEqual(plain.core.map((p) => p.word));
    expect(plain.core.length).toBe(20);
  });

  it("예비는 40개 이하이고 core와 단어·뜻이 겹치지 않습니다", () => {
    const { core, reserve } = run(40);
    expect(reserve.length).toBeGreaterThan(0);
    expect(reserve.length).toBeLessThanOrEqual(40);
    const words = new Set<string>();
    const ms = new Set<string>();
    for (const p of core.concat(reserve)) {
      expect(words.has(p.word)).toBe(false);
      expect(ms.has(meaningKey(p.meaning))).toBe(false);
      words.add(p.word);
      ms.add(meaningKey(p.meaning));
    }
  });
});
