import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  migrateSharedIdsOnce,
  makeLegacyWordResolver,
  upgradeLegacyWordId,
  upgradeLegacyCategoryId,
  LEGACY_SHARED_CATEGORY_IDS,
  LEGACY_WORD_RENAMES,
  HEADWORD_RENAMES_V3,
  HEADWORD_RENAMES_V4,
  SHARED_ID_RENAME_KEY,
  SHARED_ID_RENAME_KEY_V4,
  migrateRenamedHeadwordsOnce,
  upgradeRenamedWordId,
  SHARED_ID_MIGRATION_KEY,
  type KeyValueStore,
  type SeedLike,
} from "@/lib/sharedIdMigration";

// 가짜 localStorage
function fakeStore(init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...init };
  return {
    data,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

const OLD01 = "shared_01_인칭·지시·의문";
const OLD09 = "shared_09_상태·성질";
const OLD08 = "shared_08_접사_가족";
const OLD12 = "shared_12_가족·호칭";
const OLD30 = "shared_30_성경_핵심어";

// 새 시드의 일부만 흉내 낸 것
const SEED: SeedLike = {
  categories: [
    { id: "shared_02_인칭·지시·의문" },
    { id: "shared_06_입말·구어" },
    { id: "shared_10_접사_가족" },
    { id: "shared_11_상태·성질" },
    { id: "shared_14_가족·호칭" },
    { id: "shared_35_성경_핵심어" },
    { id: "private_arga_내단어", owner: "arga" },
  ],
  words: [
    { id: "shared_shared_02_인칭·지시·의문_saya", word: "saya", categoryId: "shared_02_인칭·지시·의문" },
    { id: "shared_shared_06_입말·구어_nggak", word: "nggak", categoryId: "shared_06_입말·구어" },
    { id: "shared_shared_11_상태·성질_cokelat", word: "cokelat", categoryId: "shared_11_상태·성질" },
    { id: "shared_shared_14_가족·호칭_Saudara-saudara", word: "Saudara-saudara", categoryId: "shared_14_가족·호칭" },
    { id: "shared_shared_14_가족·호칭_saudara", word: "saudara", categoryId: "shared_14_가족·호칭" },
    { id: "shared_shared_35_성경_핵심어_iman", word: "iman", categoryId: "shared_35_성경_핵심어" },
    { id: "private_arga_내단어_nggak", word: "nggak", categoryId: "private_arga_내단어" },
  ],
};

function oldDevice() {
  const categories = [
    { id: "my-wordbook", name: "내 단어장", emoji: "⭐" },
    { id: OLD30, name: "30 성경 핵심어", emoji: "📕", isShared: true },
    { id: OLD01, name: "01 인칭·지시·의문", emoji: "🙋", isShared: true },
    { id: OLD12, name: "12 가족·호칭", emoji: "👪", isShared: true },
    { id: "u-1", name: "내가 만든 단어장", emoji: "📁" },
  ];
  const words = [
    { id: "shared_" + OLD01 + "_saya", word: "saya", meaning: "저", example: "", exampleMeaning: "", categoryId: OLD01, createdAt: 0, isShared: true },
    { id: "shared_" + OLD01 + "_nggak", word: "nggak", meaning: "아니", example: "", exampleMeaning: "", categoryId: OLD01, createdAt: 0, isShared: true },
    { id: "p-1", word: "rindu", meaning: "그리움", example: "", exampleMeaning: "", categoryId: "my-wordbook", createdAt: 5 },
    // 공용 단어장에 직접 들어간 개인 단어 (드문 경우)
    { id: "p-2", word: "kangen", meaning: "보고 싶다", example: "", exampleMeaning: "", categoryId: OLD12, createdAt: 6 },
  ];
  const saved = [
    "shared_" + OLD01 + "_saya",          // 번호만 바뀜
    "shared_" + OLD01 + "_nggak",         // 06 입말·구어로 옮겨 감
    "shared_" + OLD09 + "_coklat",        // 표기 수정 (coklat → cokelat)
    "shared_" + OLD12 + "_Saudara",       // 표제어 변경 (Saudara → Saudara-saudara)
    "shared_" + OLD12 + "_saudara",       // 대소문자만 다른 다른 단어 — 섞이면 안 됨
    "shared_" + OLD08 + "_memperbaharui", // 검토 때 빠진 단어 — 그대로 남김
    "shared_" + OLD30 + "_iman",          // 성경과 신앙 30 → 35
    "p-1",                                // 개인 단어
  ];
  return fakeStore({
    "kata-categories": JSON.stringify(categories),
    "kata-words": JSON.stringify(words),
    "kata-saved": JSON.stringify(saved),
    "shared_seed_version": "123|",
    ["cat-words-collapsed:" + OLD01]: "1",
    ["cat-words-collapsed:my-wordbook"]: "1",
  });
}

describe("공용 단어장 ID 이전 (S43)", () => {
  it("옛 ID 를 새 ID 로 옮기고, 순서·개인 데이터를 잃지 않는다", () => {
    const s = oldDevice();
    const r = migrateSharedIdsOnce(s, SEED);
    expect(r.ran).toBe(true);

    const cats = JSON.parse(s.data["kata-categories"]);
    expect(cats.map((c: { id: string }) => c.id)).toEqual([
      "my-wordbook",
      "shared_35_성경_핵심어",
      "shared_02_인칭·지시·의문",
      "shared_14_가족·호칭",
      "u-1",
    ]);
    // 이름·이모지 등 나머지 칸은 그대로 (이름은 다음 시드 동기화가 새 이름으로 바꿈)
    expect(cats[2].emoji).toBe("🙋");

    const words = JSON.parse(s.data["kata-words"]);
    expect(words).toHaveLength(4);
    expect(words[0].id).toBe("shared_shared_02_인칭·지시·의문_saya");
    expect(words[0].categoryId).toBe("shared_02_인칭·지시·의문");
    expect(words[1].id).toBe("shared_shared_06_입말·구어_nggak");
    expect(words[2]).toMatchObject({ id: "p-1", categoryId: "my-wordbook" });
    expect(words[3]).toMatchObject({ id: "p-2", categoryId: "shared_14_가족·호칭" });

    expect(JSON.parse(s.data["kata-saved"])).toEqual([
      "shared_shared_02_인칭·지시·의문_saya",
      "shared_shared_06_입말·구어_nggak",
      "shared_shared_11_상태·성질_cokelat",
      "shared_shared_14_가족·호칭_Saudara-saudara",
      "shared_shared_14_가족·호칭_saudara",
      "shared_" + OLD08 + "_memperbaharui",
      "shared_shared_35_성경_핵심어_iman",
      "p-1",
    ]);

    expect(s.data["cat-words-collapsed:shared_02_인칭·지시·의문"]).toBe("1");
    expect(s.data["cat-words-collapsed:" + OLD01]).toBeUndefined();
    expect(s.data["cat-words-collapsed:my-wordbook"]).toBe("1");
    expect(s.data["shared_seed_version"]).toBeUndefined(); // 다음 동기화가 반드시 돈다
    expect(s.data[SHARED_ID_MIGRATION_KEY]).toBe("1");
  });

  it("두 번 돌려도 결과가 같다 (표시가 있으면 건너뛰고, 표시를 지워도 바뀌지 않는다)", () => {
    const s = oldDevice();
    migrateSharedIdsOnce(s, SEED);
    const snap = JSON.stringify(s.data);

    expect(migrateSharedIdsOnce(s, SEED).ran).toBe(false);
    expect(JSON.stringify(s.data)).toBe(snap);

    delete s.data[SHARED_ID_MIGRATION_KEY];
    const again = migrateSharedIdsOnce(s, SEED);
    expect(again).toMatchObject({ ran: true, categories: 0, words: 0, saved: 0 });
    expect(JSON.stringify(s.data)).toBe(snap);
  });

  it("처음 설치한 기기에서는 표시만 남기고 아무것도 만들지 않는다", () => {
    const s = fakeStore();
    migrateSharedIdsOnce(s, SEED);
    expect(Object.keys(s.data)).toEqual([SHARED_ID_MIGRATION_KEY]);
  });

  it("옛 ID 와 새 ID 가 함께 있으면 하나만 남긴다", () => {
    const s = fakeStore({
      "kata-categories": JSON.stringify([
        { id: OLD01, name: "01 인칭·지시·의문", isShared: true },
        { id: "shared_02_인칭·지시·의문", name: "02 인칭·지시·의문", isShared: true },
      ]),
    });
    migrateSharedIdsOnce(s, SEED);
    expect(JSON.parse(s.data["kata-categories"])).toHaveLength(1);
  });

  it("예시 단어 8개의 대문자 표제어는 소문자로, 사용자가 고친 것은 그대로", () => {
    const s = fakeStore({
      "kata-words": JSON.stringify([
        { id: "7", word: "Makan", meaning: "먹다", categoryId: "daily" },
        { id: "8", word: "Tidur pulas", meaning: "푹 자다", categoryId: "daily" }, // 사용자가 고침
        { id: "4", word: "Satu", meaning: "하나", categoryId: "my-wordbook" },  // 다른 단어장으로 옮김
        { id: "x", word: "Jakarta", meaning: "자카르타", categoryId: "daily" },
      ]),
    });
    migrateSharedIdsOnce(s, SEED);
    expect(JSON.parse(s.data["kata-words"]).map((w: { word: string }) => w.word)).toEqual([
      "makan",
      "Tidur pulas",
      "Satu",
      "Jakarta",
    ]);
  });

  it("단어 ID 변환: 개인 폴더 단어로 새지 않고, 시드를 모르면 번호만 바꾼다", () => {
    const res = makeLegacyWordResolver(SEED);
    expect(res.byWord.get("nggak")).toEqual(["shared_shared_06_입말·구어_nggak"]);
    expect(upgradeLegacyWordId("shared_" + OLD01 + "_nggak", makeLegacyWordResolver(null))).toBe(
      "shared_shared_02_인칭·지시·의문_nggak"
    );
    expect(upgradeLegacyWordId("p-1", res)).toBe("p-1");
    expect(upgradeLegacyCategoryId("my-wordbook")).toBe("my-wordbook");
    expect(upgradeLegacyCategoryId("shared_02_인칭·지시·의문")).toBe("shared_02_인칭·지시·의문");
  });
});

describe("이전 표가 실제 CSV 와 맞는다", () => {
  const dir = path.resolve(__dirname, "../../data/categories");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
  const idOf = (f: string) => "shared_" + f.replace(new RegExp("\\.csv$"), "").split(" ").join("_");

  it("새 ID 36개가 모두 지금 파일과 맞고, 옛 ID 는 지금 파일에 없다", () => {
    const now = new Set(files.map(idOf));
    const olds = Object.keys(LEGACY_SHARED_CATEGORY_IDS);
    const news = Object.values(LEGACY_SHARED_CATEGORY_IDS);
    expect(olds).toHaveLength(36);
    expect(new Set(news).size).toBe(36);
    for (const n of news) expect(now.has(n)).toBe(true);
    for (const o of olds) expect(now.has(o)).toBe(false);
    expect(files).toHaveLength(41);
  });

  it("고친 표제어는 새 글자로만 있다", () => {
    const heads = new Set<string>();
    for (const f of files) {
      const text = fs.readFileSync(path.join(dir, f), "utf-8");
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        heads.add(line.split(",")[0]);
      }
    }
    for (const [oldW, newW] of Object.entries(LEGACY_WORD_RENAMES)) {
      expect(heads.has(newW), newW).toBe(true);
      expect(heads.has(oldW), oldW).toBe(false);
    }
  });

  it("2026-11-14 에 표기를 고친 19개는 그 단어장 파일에 새 글자로만 있다", () => {
    expect(HEADWORD_RENAMES_V3).toHaveLength(19);
    for (const [cat, oldW, newW] of HEADWORD_RENAMES_V3) {
      const file = files.find((f) => idOf(f) === cat);
      expect(file, cat).toBeTruthy();
      const heads = fs.readFileSync(path.join(dir, file as string), "utf-8").split("\n").map((l) => l.split(",")[0]);
      expect(heads.indexOf(newW) >= 0, newW).toBe(true);
      expect(heads.indexOf(oldW) >= 0, oldW).toBe(false);
      expect(LEGACY_WORD_RENAMES[oldW]).toBe(newW);
    }
  });

  it("11/13 검수 브랜치 병합으로 바뀐 7개도 그 단어장 파일에 새 글자로만 있다", () => {
    expect(HEADWORD_RENAMES_V4).toHaveLength(7);
    for (const [cat, oldW, newW] of HEADWORD_RENAMES_V4) {
      const file = files.find((f) => idOf(f) === cat);
      expect(file, cat).toBeTruthy();
      const heads = fs.readFileSync(path.join(dir, file as string), "utf-8").split("\n").map((l) => l.split(",")[0]);
      expect(heads.indexOf(newW) >= 0, newW).toBe(true);
      expect(heads.indexOf(oldW) >= 0, oldW).toBe(false);
      expect(LEGACY_WORD_RENAMES[oldW]).toBe(newW);
    }
  });
});

describe("11/13 검수 병합으로 바뀐 표제어의 다시 외울 표시 옮기기 (v4)", () => {
  const OLD4 = "shared_shared_38_교리·신학_omnipresent";
  const NEW4 = "shared_shared_38_교리·신학_omnipresen";
  const OLD3 = "shared_shared_28_동물_orangutan";

  it("v3 이 이미 돈 기기에서도 v4 의 표시만 옮긴다", () => {
    const store = fakeStore({
      [SHARED_ID_RENAME_KEY]: "1",
      "kata-saved": JSON.stringify(["mine-1", OLD4, OLD3]),
    });
    expect(migrateRenamedHeadwordsOnce(store)).toBe(1);
    // v3 은 이미 돈 판이라 그 표의 옛 ID 는 건드리지 않습니다
    expect(JSON.parse(store.data["kata-saved"])).toEqual(["mine-1", NEW4, OLD3]);
    expect(store.data[SHARED_ID_RENAME_KEY_V4]).toBe("1");
    expect(migrateRenamedHeadwordsOnce(store)).toBe(0);
  });

  it("처음 켜는 기기에서는 두 판을 한 번에 옮긴다. 사라진 mukjizat 의 표시는 mujizat 으로 간다", () => {
    const store = fakeStore({
      "kata-saved": JSON.stringify([OLD3, OLD4, "shared_shared_35_성경_핵심어_mukjizat", "shared_shared_35_성경_핵심어_mujizat"]),
    });
    expect(migrateRenamedHeadwordsOnce(store)).toBe(3);
    expect(JSON.parse(store.data["kata-saved"])).toEqual([
      "shared_shared_28_동물_orang utan",
      NEW4,
      "shared_shared_35_성경_핵심어_mujizat",
    ]);
    expect(store.data[SHARED_ID_RENAME_KEY]).toBe("1");
    expect(store.data[SHARED_ID_RENAME_KEY_V4]).toBe("1");
    expect(upgradeRenamedWordId(OLD4)).toBe(NEW4);
  });
});

describe("표기를 고친 표제어의 다시 외울 표시 옮기기 (2026-11-14)", () => {
  const OLD = "shared_shared_28_동물_orangutan";
  const NEW = "shared_shared_28_동물_orang utan";

  it("옛 ID 의 표시를 새 ID 로 옮기고, 다른 표시는 그대로 둔다", () => {
    const store = fakeStore({ "kata-saved": JSON.stringify(["mine-1", OLD, "shared_shared_28_동물_kucing"]) });
    expect(migrateRenamedHeadwordsOnce(store)).toBe(1);
    expect(JSON.parse(store.data["kata-saved"])).toEqual(["mine-1", NEW, "shared_shared_28_동물_kucing"]);
    expect(store.data[SHARED_ID_RENAME_KEY]).toBe("1");
  });

  it("한 번만 돈다. 옛것과 새것이 함께 있으면 하나만 남긴다", () => {
    const store = fakeStore({ "kata-saved": JSON.stringify([NEW, OLD]) });
    expect(migrateRenamedHeadwordsOnce(store)).toBe(1);
    expect(JSON.parse(store.data["kata-saved"])).toEqual([NEW]);
    store.data["kata-saved"] = JSON.stringify([OLD]);
    expect(migrateRenamedHeadwordsOnce(store)).toBe(0);
    expect(JSON.parse(store.data["kata-saved"])).toEqual([OLD]);
  });

  it("처음 설치한 기기에서는 표시만 남긴다. 예전 백업의 ID 도 새 ID 로 읽는다", () => {
    const store = fakeStore();
    expect(migrateRenamedHeadwordsOnce(store)).toBe(0);
    expect(store.data["kata-saved"]).toBeUndefined();
    expect(store.data[SHARED_ID_RENAME_KEY]).toBe("1");
    expect(upgradeRenamedWordId(OLD)).toBe(NEW);
    expect(upgradeRenamedWordId("mine-1")).toBe("mine-1");
    // 지금 번호 체계의 ID 는 번호 이전 함수를 거쳐도 표기만 바뀝니다
    expect(upgradeLegacyWordId(OLD, makeLegacyWordResolver(null))).toBe(NEW);
  });
});
