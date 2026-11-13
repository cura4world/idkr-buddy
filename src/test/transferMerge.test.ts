// 백업 묶음 모으기·합치기·CSV 가져오기 (2026-11-14 출시 전 점검 D-04·D-05·D-06·D-17·D-22·E-05).
// 이 환경에는 IndexedDB 가 없어 단어장(localStorage) 쪽만 봅니다.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCategory, addWord, exportWordsToCSV, getCategories, getWords, getWordsByCategory, importWordsFromCSV,
} from "@/lib/store";
import { applyBundle, collectBundle, parseBackupText, PersonalBundle } from "@/lib/transfer";

function w(categoryId: string, word: string, meaning: string, example = "") {
  return addWord({ word, meaning, example, exampleMeaning: "", categoryId });
}

beforeEach(() => {
  localStorage.clear();
});

// 기본(공용) 단어장은 앱이 켜질 때만 깔리므로, 저장소를 비운 뒤에는 시험용으로 하나 넣어 둡니다.
const SHARED_ID = "shared-test-bible";
function putShared() {
  const cats = getCategories();
  cats.push({ id: SHARED_ID, name: "성경과 신앙 시험", emoji: "✝️", isShared: true });
  localStorage.setItem("kata-categories", JSON.stringify(cats));
  const words = getWords();
  words.push({
    id: "shared-test-word", word: "kasih", meaning: "사랑", example: "", exampleMeaning: "",
    categoryId: SHARED_ID, createdAt: 1, isShared: true,
  });
  localStorage.setItem("kata-words", JSON.stringify(words));
}

describe("묶음 모으기", () => {
  it("기본 단어장(성경과 신앙 포함)은 담지 않고, 직접 만든 단어장과 직접 넣은 단어가 든 단어장만 담는다", async () => {
    putShared();
    const mine = addCategory("여행", "✈️");
    w(mine.id, "bandara", "공항");
    const { bundle } = await collectBundle();
    const names = bundle.words.categories.map((c) => c.name);
    expect(names).toContain("여행");
    expect(bundle.words.categories.some((c) => c.isShared)).toBe(false);
    expect(names.some((n) => n.indexOf("성경") >= 0 || n.indexOf("설교") >= 0)).toBe(false);
    // 기본 단어는 담지 않음
    expect(bundle.words.words.map((x) => x.word)).toEqual(["bandara"]);
  });

  it("기본 단어장에 직접 넣은 단어가 있으면 그 단어장은 담는다(받는 쪽에서 제자리를 찾게)", async () => {
    putShared();
    w(SHARED_ID, "katabaru", "새 낱말");
    const { bundle } = await collectBundle();
    expect(bundle.words.categories.map((c) => c.id)).toContain(SHARED_ID);
    expect(bundle.words.words.map((x) => x.word)).toEqual(["katabaru"]);
  });
});

describe("묶음 합치기", () => {
  async function roundTrip(prepare: () => void): Promise<PersonalBundle> {
    prepare();
    const { bundle } = await collectBundle();
    const text = JSON.stringify(bundle);
    localStorage.clear();
    return parseBackupText(text) as PersonalBundle;
  }

  it("같은 낱말을 다른 뜻으로 넣은 것(동음이의어)이 둘 다 돌아온다", async () => {
    const b = await roundTrip(() => {
      const c = addCategory("헷갈리는 말", "📁");
      w(c.id, "bisa", "할 수 있다");
      w(c.id, "bisa", "독");
      w(c.id, "Bisa", "할 수 있다"); // 대소문자만 다른 같은 뜻 → 하나로
    });
    const r = await applyBundle(b);
    const cat = getCategories().find((c) => c.name === "헷갈리는 말");
    const got = getWordsByCategory(cat!.id).map((x) => x.word.toLowerCase() + "=" + x.meaning).sort();
    expect(got).toEqual(["bisa=독", "bisa=할 수 있다"]);
    expect(r.words).toBe(2);
    expect(r.skipped).toBe(1);
  });

  it("이름이 같은 단어장 두 개가 하나로 합쳐지지 않는다", async () => {
    const b = await roundTrip(() => {
      const a = addCategory("시험", "icon:Plane:pink");
      const c = addCategory("시험", "🍜");
      w(a.id, "satu", "하나");
      w(c.id, "dua", "둘");
    });
    await applyBundle(b);
    const same = getCategories().filter((c) => c.name === "시험");
    expect(same.length).toBe(2);
    expect(same.map((c) => c.emoji).sort()).toEqual(["icon:Plane:pink", "🍜"].sort());
    expect(same.map((c) => getWordsByCategory(c.id).length)).toEqual([1, 1]);
  });

  it("받는 폰에 같은 이름의 단어장이 이미 있으면 거기에 합친다(두 번 되돌려도 늘지 않음)", async () => {
    const b = await roundTrip(() => {
      const a = addCategory("여행", "✈️");
      w(a.id, "bandara", "공항");
    });
    const here = addCategory("여행", "🧳");
    w(here.id, "tiket", "표");
    await applyBundle(b);
    const r2 = await applyBundle(b);
    const same = getCategories().filter((c) => c.name === "여행");
    expect(same.length).toBe(1);
    expect(getWordsByCategory(same[0].id).map((x) => x.word).sort()).toEqual(["bandara", "tiket"]);
    expect(r2.words).toBe(0);
    expect(r2.skipped).toBe(1);
  });

  it("저장이 실패하면(저장 공간 가득) 성공으로 넘어가지 않는다", async () => {
    const b = await roundTrip(() => {
      const a = addCategory("여행", "✈️");
      w(a.id, "bandara", "공항");
    });
    getWords(); // 기본 데이터 준비
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    let failed = 0;
    const onFail = () => { failed += 1; };
    window.addEventListener("kata-save-failed", onFail);
    await expect(applyBundle(b)).rejects.toThrow("SAVE_FAILED");
    window.removeEventListener("kata-save-failed", onFail);
    spy.mockRestore();
    expect(failed).toBeGreaterThan(0);
  });

  it("단어 CSV 가 아닌 글은 묶음으로 읽지 않는다", () => {
    expect(parseBackupText("오늘 장을 봤다. 사과, 배를 샀다.\n내일은 비가 온다고 한다\n회의는 세 시\n메모 끝")).toBeNull();
    expect(parseBackupText("makan,먹다,Saya makan nasi.,나는 밥을 먹는다\nminum,마시다,,")).not.toBeNull();
  });
});

describe("CSV 가져오기", () => {
  it("줄바꿈이 든 예문을 내보냈다가 다시 읽어도 한 줄로 남는다", () => {
    const c = addCategory("긴 예문", "📁");
    w(c.id, "surat", "편지", "Baris satu.\nBaris dua.");
    const { csv } = exportWordsToCSV();
    localStorage.clear();
    const r = importWordsFromCSV(csv);
    expect(r.saved).toBe(true);
    const cat = getCategories().find((x) => x.name === "긴 예문");
    const words = getWordsByCategory(cat!.id);
    expect(words.length).toBe(1);
    expect(words[0].example).toBe("Baris satu.\nBaris dua.");
  });

  it("같은 파일을 두 번 넣어도 두 배가 되지 않는다", () => {
    const c = addCategory("내 것", "📁");
    const csv = "makan,먹다,,\nminum,마시다,,\nmakan,밥,,";
    const r1 = importWordsFromCSV(csv, c.id);
    expect(r1.imported).toBe(3); // 같은 낱말이라도 뜻이 다르면 따로
    const r2 = importWordsFromCSV(csv, c.id);
    expect(r2.imported).toBe(0);
    expect(r2.skipped).toBe(3);
    expect(getWordsByCategory(c.id).length).toBe(3);
  });
});
