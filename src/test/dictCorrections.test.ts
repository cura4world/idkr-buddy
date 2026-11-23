// 사전 결과 정정 목록 (2026-11-23 내부 테스트 12장 A)
//   정정 목록 적용 → 그 저장본 삭제 → 다시 찾을 때 검증본 / 검증본 없는 항목은 지우기만 / 모양이 틀린 칸은 버림
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@/lib/hash";
import { dictCacheKey } from "@/lib/dictStore";

const VERIFIED = { word: "buruk", meaning: "나쁜", meaningDetail: "검증된 뜻", examples: [] };

describe("사전 정정 목록", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("sha256 은 64자 16진수이고 같은 입력이면 같다", async () => {
    const a = await sha256Hex("id_word:buruk");
    expect(a).toMatch(new RegExp("^[0-9a-f]{64}$"));
    expect(await sha256Hex("id_word:buruk")).toBe(a);
    expect(await sha256Hex("id_word:baik")).not.toBe(a);
  });

  it("목록의 해시와 맞는 저장본만 지운다 — 검증본이 있는 것·지우기만 할 것 모두, 다른 것은 그대로", async () => {
    vi.resetModules();
    const m = await import("@/lib/dictCorrections");
    const kWord = dictCacheKey("id_word", "Buruk");
    const kSent = dictCacheKey("ko_sentence", "이미 돈을 냈어요");
    const kKeep = dictCacheKey("id_word", "baik");
    const f = m.cleanCorrections({
      v: 1,
      items: { [await sha256Hex(kWord)]: { kind: "id_word", data: VERIFIED } },
      purge: [await sha256Hex(kSent)],
    });
    const store = new Set([kWord, kSent, kKeep]);
    const n = await m.applyDictCorrections(f, {
      listKeys: async () => Array.from(store),
      remove: async (k) => { store.delete(k); },
    });
    expect(n).toBe(2);
    expect(Array.from(store)).toEqual([kKeep]);
  });

  it("다시 찾을 때 검증본을 돌려준다(종류가 다르면 쓰지 않음), 없으면 null", async () => {
    vi.resetModules();
    const kWord = dictCacheKey("id_word", "buruk");
    localStorage.setItem("dict-corrections", JSON.stringify({
      v: 1, items: { [await sha256Hex(kWord)]: { kind: "id_word", data: VERIFIED } }, purge: [],
    }));
    const m = await import("@/lib/dictCorrections");
    expect(await m.lookupDictCorrection(kWord, "id_word")).toEqual(VERIFIED);
    expect(await m.lookupDictCorrection(kWord, "ko_word")).toBeNull();
    expect(await m.lookupDictCorrection(dictCacheKey("id_word", "baik"), "id_word")).toBeNull();
  });

  it("모양이 틀린 칸(해시가 아님·종류 모름·내용 없음)은 버린다", async () => {
    vi.resetModules();
    const m = await import("@/lib/dictCorrections");
    const good = await sha256Hex("id_word:x");
    const f = m.cleanCorrections({
      v: 1,
      items: {
        [good]: { kind: "id_word", data: VERIFIED },
        "not-a-hash": { kind: "id_word", data: VERIFIED },
        [await sha256Hex("y")]: { kind: "weird", data: VERIFIED },
        [await sha256Hex("z")]: { kind: "id_word", data: null },
      },
      purge: ["abc", good],
    });
    expect(Object.keys(f.items || {})).toEqual([good]);
    expect(f.purge).toEqual([good]);
  });

  it("하루 한 번만 받는다 — 같은 한국 날짜에 다시 부르면 받지 않음, 받지 못하면 날짜를 적지 않음", async () => {
    vi.resetModules();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls++;
      return new Response(JSON.stringify({ v: 1, items: {}, purge: [] }), { status: 200 });
    }));
    const m = await import("@/lib/dictCorrections");
    await m.syncDictCorrections();
    await m.syncDictCorrections();
    expect(calls).toBe(1);

    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await m.syncDictCorrections();
    expect(localStorage.getItem("dict-corrections-day")).toBeNull();
  });
});
