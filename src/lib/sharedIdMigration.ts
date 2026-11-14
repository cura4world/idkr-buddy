// src/lib/sharedIdMigration.ts
// 공용 단어장 번호를 다시 매긴 일(2026-11, S43) 때문에 바뀐 ID 를 한 번만 옮겨 줍니다.
//
// 공용 단어장 ID 는 파일 이름에서 나옵니다 — `shared_${파일 이름의 빈칸을 _ 로}`.
// 단어 ID 는 `shared_${단어장 ID}_${표제어}` 입니다 (scripts/csv-to-seed.js).
// 그래서 "01 인칭·지시·의문" 이 "02 인칭·지시·의문" 이 되면 단어장 ID 와 그 안 단어 ID 가
// 모두 바뀌고, 옛 ID 로 저장된 것(다시 외울 표시, 단어장 순서, 접힘 상태)이 길을 잃습니다.
//
// 이 파일은 store.ts 가 앱을 켤 때 시드 동기화(initSharedCategories)보다 먼저 부릅니다.
// localStorage·시드에 직접 손대지 않고 인자로 받으므로 테스트에서 가짜 저장소로 돌릴 수 있습니다.
//
// 메달(medali)은 단어 글자로 기록하므로 옮길 것이 없습니다.

/** 한 번 돌았음을 남기는 표시. 값이 "1" 이면 다시 돌지 않습니다. */
export const SHARED_ID_MIGRATION_KEY = "kata-shared-ids-v2";

// store.ts 의 저장 키와 같아야 합니다.
const CATEGORIES_KEY = "kata-categories";
const WORDS_KEY = "kata-words";
const SAVED_KEY = "kata-saved";
const SEED_SYNC_KEY = "shared_seed_version";
const COLLAPSED_PREFIX = "cat-words-collapsed:"; // CategoryDetail.tsx 의 WORDS_COLLAPSED_KEY

/** 옛 공용 단어장 ID → 새 ID (36권 전부, 2026-11-11 재배치). */
export const LEGACY_SHARED_CATEGORY_IDS: Record<string, string> = {
  "shared_01_인칭·지시·의문": "shared_02_인칭·지시·의문",
  "shared_02_전치사·접속사": "shared_03_전치사·접속사",
  "shared_03_수량·숫자·단위": "shared_04_수량·숫자·단위",
  "shared_04_시간·날짜·순서": "shared_05_시간·날짜·순서",
  "shared_05_이동·존재": "shared_07_이동·존재",
  "shared_06_행위·조작": "shared_08_행위·조작",
  "shared_07_인지·소통": "shared_09_인지·소통",
  "shared_08_접사_가족": "shared_10_접사_가족",
  "shared_09_상태·성질": "shared_11_상태·성질",
  "shared_10_평가·정도": "shared_12_평가·정도",
  "shared_11_빈도·양태": "shared_13_빈도·양태",
  "shared_12_가족·호칭": "shared_14_가족·호칭",
  "shared_13_신체·건강": "shared_15_신체·건강",
  "shared_14_감정·성격": "shared_16_감정·성격",
  "shared_15_음식·요리": "shared_17_음식·요리",
  "shared_16_집·생활용품": "shared_18_집·생활용품",
  "shared_17_옷·외모": "shared_19_옷·외모",
  "shared_18_쇼핑·돈": "shared_20_쇼핑·돈",
  "shared_19_직업·직장": "shared_22_직업·직장",
  "shared_20_교육·학교": "shared_23_교육·학교",
  "shared_21_의료·병원": "shared_24_의료·병원",
  "shared_22_행정·법률": "shared_25_행정·법률",
  "shared_23_동물": "shared_28_동물",
  "shared_24_식물·농업": "shared_29_식물·농업",
  "shared_25_날씨·지형": "shared_30_날씨·지형",
  "shared_26_교통": "shared_31_교통",
  "shared_27_장소·여행": "shared_32_장소·여행",
  "shared_28_기술·인터넷": "shared_33_기술·인터넷",
  "shared_29_인도네시아_문화": "shared_34_인도네시아_문화",
  "shared_30_성경_핵심어": "shared_35_성경_핵심어",
  "shared_31_성경_인물·지명": "shared_36_성경_인물·지명",
  "shared_32_예배·예전": "shared_37_예배·예전",
  "shared_33_교리·신학": "shared_38_교리·신학",
  "shared_34_기도·찬양": "shared_39_기도·찬양",
  "shared_35_교회_직분·사역": "shared_40_교회_직분·사역",
  "shared_36_설교_표현": "shared_41_설교_표현",
};

/** 검토 때 표기를 고친 표제어 (옛 글자 → 새 글자). data/REVIEW-2026-11.md 와 같습니다. */
export const LEGACY_WORD_RENAMES: Record<string, string> = {
  "lagipula": "lagi pula",
  "melipat gandakan": "melipatgandakan",
  "mengendap": "mengendap-endap",
  "menjabat": "berjabat tangan",
  "menyiram api": "memadamkan",
  "memberitahu": "memberi tahu",
  "coklat": "cokelat",
  "lembab": "lembap",
  "kasat mata": "kasatmata",
  "otentik": "autentik",
  "Saudara": "Saudara-saudara",
  "menghembuskan": "mengembuskan",
  "kemurniaan": "kemurnian",
  "mie": "mi",
  "mie goreng": "mi goreng",
  "mie ayam": "mi ayam",
  "kaos kaki": "kaus kaki",
  "kaos": "kaus",
  "mencontek": "menyontek",
  "diagnosa": "diagnosis",
  "materai": "meterai",
  "legalisir": "legalisasi",
  "plat nomor": "pelat nomor",
  // 2026-11-14 출시 전 점검(5-2·5-3)에서 고친 표기 — 아래 HEADWORD_RENAMES_V3 와 같은 쌍입니다
  "turut berduka cita": "turut berdukacita",
  "mempercayai": "memercayai",
  "mempercayakan": "memercayakan",
  "saklar": "sakelar",
  "resleting": "ritsleting",
  "stroke": "strok",
  "orangutan": "orang utan",
  "kecoa": "kecoak",
  "cicak": "cecak",
  "klenteng": "kelenteng",
  "injil": "Injil",
  "Noach": "Nuh",
  "Nikodem": "Nikodemus",
  "Yordania": "Yordan",
  "antiKristus": "antikristus",
  "anthropologi teologi": "antropologi teologis",
  "buku kehidupan": "kitab kehidupan",
  "millenium": "milenium",
  "imanuel": "Imanuel",
};

// ── 2026-11-14: 표제어 표기만 고친 단어 (단어장 번호는 그대로) ─────────────────
// 단어 ID 에 표제어가 들어 있어, 표기를 고치면 ID 가 바뀝니다. 지금 번호 체계(v2)의 ID 로 저장된
// "다시 외울 표시"가 따라가도록 한 번 옮깁니다. v2 이전은 이미 돈 기기에서 다시 돌지 않으므로 표시 키를 따로 둡니다.
export const SHARED_ID_RENAME_KEY = "kata-shared-ids-v3";

/** [단어장 ID, 옛 표제어, 새 표제어] */
export const HEADWORD_RENAMES_V3: [string, string, string][] = [
  ["shared_01_인사·기본_표현", "turut berduka cita", "turut berdukacita"],
  ["shared_10_접사_가족", "mempercayai", "memercayai"],
  ["shared_10_접사_가족", "mempercayakan", "memercayakan"],
  ["shared_18_집·생활용품", "saklar", "sakelar"],
  ["shared_19_옷·외모", "resleting", "ritsleting"],
  ["shared_24_의료·병원", "stroke", "strok"],
  ["shared_28_동물", "orangutan", "orang utan"],
  ["shared_28_동물", "kecoa", "kecoak"],
  ["shared_28_동물", "cicak", "cecak"],
  ["shared_32_장소·여행", "klenteng", "kelenteng"],
  ["shared_35_성경_핵심어", "injil", "Injil"],
  ["shared_36_성경_인물·지명", "Noach", "Nuh"],
  ["shared_36_성경_인물·지명", "Nikodem", "Nikodemus"],
  ["shared_36_성경_인물·지명", "Yordania", "Yordan"],
  ["shared_38_교리·신학", "antiKristus", "antikristus"],
  ["shared_38_교리·신학", "anthropologi teologi", "antropologi teologis"],
  ["shared_38_교리·신학", "buku kehidupan", "kitab kehidupan"],
  ["shared_38_교리·신학", "millenium", "milenium"],
  ["shared_41_설교_표현", "imanuel", "Imanuel"],
];

const RENAMED_WORD_IDS: Record<string, string> = {};
for (const r of HEADWORD_RENAMES_V3) {
  RENAMED_WORD_IDS["shared_" + r[0] + "_" + r[1]] = "shared_" + r[0] + "_" + r[2];
}

/** 표기를 고친 공용 단어의 옛 ID 면 새 ID 를, 아니면 그대로 돌려줍니다. */
export function upgradeRenamedWordId(id: string): string {
  return (typeof id === "string" && RENAMED_WORD_IDS[id]) || id;
}

/**
 * 처음 설치 때 깔리는 예시 단어 8개(store.ts defaultWords)의 대문자 표제어 → 소문자.
 * 고유명사가 아닌데 대문자로 시작해 목록·게임에서 튀었습니다. ID 는 그대로라 글자만 바꿉니다.
 * 사용자가 고친 단어(글자가 다르거나 다른 단어장으로 옮긴 것)는 건드리지 않습니다.
 */
export const LEGACY_DEFAULT_WORD_CASE: Record<string, { from: string; to: string; categoryId: string }> = {
  "1": { from: "Selamat pagi", to: "selamat pagi", categoryId: "greetings" },
  "2": { from: "Terima kasih", to: "terima kasih", categoryId: "greetings" },
  "3": { from: "Nasi goreng", to: "nasi goreng", categoryId: "food" },
  "4": { from: "Satu", to: "satu", categoryId: "numbers" },
  "5": { from: "Dua", to: "dua", categoryId: "numbers" },
  "6": { from: "Apa kabar?", to: "apa kabar?", categoryId: "greetings" },
  "7": { from: "Makan", to: "makan", categoryId: "daily" },
  "8": { from: "Tidur", to: "tidur", categoryId: "daily" },
};

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SeedLike {
  categories: { id: string; owner?: string }[];
  words: { id: string; word: string; categoryId: string }[];
}

export interface LegacyWordResolver {
  ids: Set<string>;
  byWord: Map<string, string[]>;
  byLower: Map<string, string[]>;
}

/** 시드에서 "표제어 → 새 단어 ID" 를 찾는 표를 만듭니다 (공용 단어장만, 개인 폴더 제외). */
export function makeLegacyWordResolver(seed: SeedLike | null | undefined): LegacyWordResolver {
  const ids = new Set<string>();
  const byWord = new Map<string, string[]>();
  const byLower = new Map<string, string[]>();
  if (!seed || !Array.isArray(seed.categories) || !Array.isArray(seed.words)) return { ids, byWord, byLower };
  const shared = new Set(
    seed.categories.filter((c) => c && !c.owner && String(c.id).indexOf("shared_") === 0).map((c) => c.id)
  );
  for (const w of seed.words) {
    if (!w || !shared.has(w.categoryId)) continue;
    ids.add(w.id);
    const a = byWord.get(w.word) || [];
    a.push(w.id);
    byWord.set(w.word, a);
    const lk = String(w.word).toLowerCase();
    const b = byLower.get(lk) || [];
    b.push(w.id);
    byLower.set(lk, b);
  }
  return { ids, byWord, byLower };
}

/** 옛 공용 단어장 ID 면 새 ID 를, 아니면 그대로 돌려줍니다. 새 ID 를 넣어도 그대로입니다. */
export function upgradeLegacyCategoryId(id: string): string {
  return LEGACY_SHARED_CATEGORY_IDS[id] || id;
}

// "shared_" + 옛 단어장 ID + "_" + 표제어 로 쪼갭니다. 옛 단어장 ID 는 "shared_NN_" 번호가
// 서로 달라 한 개만 맞습니다.
function splitLegacyWordId(id: string): { cat: string; word: string } | null {
  if (typeof id !== "string" || id.indexOf("shared_shared_") !== 0) return null;
  for (const oldCat of Object.keys(LEGACY_SHARED_CATEGORY_IDS)) {
    const prefix = "shared_" + oldCat + "_";
    if (id.indexOf(prefix) === 0) return { cat: oldCat, word: id.slice(prefix.length) };
  }
  return null;
}

/**
 * 옛 공용 단어 ID → 새 ID.
 * ① 같은 단어장(번호만 바뀜)에 같은 표제어가 있으면 그것,
 * ② 새 단어장으로 옮겨 간 단어면 시드에서 같은 표제어를 찾아서,
 * ③ 검토 때 빠진 단어라 찾을 수 없으면 옛 ID 그대로 (보이지 않을 뿐 해가 없음).
 */
export function upgradeLegacyWordId(id: string, resolver: LegacyWordResolver): string {
  const parts = splitLegacyWordId(id);
  // 지금 번호 체계의 ID 라도, 그 뒤 표기를 고친 단어면 새 ID 로 (예전 백업을 되돌릴 때)
  if (!parts) return upgradeRenamedWordId(id);
  const newCat = LEGACY_SHARED_CATEGORY_IDS[parts.cat];
  const word = LEGACY_WORD_RENAMES[parts.word] || parts.word;
  const direct = "shared_" + newCat + "_" + word;
  if (resolver.ids.size === 0) return direct; // 시드를 모르면 번호만 바꿉니다
  if (resolver.ids.has(direct)) return direct;
  const exact = resolver.byWord.get(word);
  if (exact && exact.length > 0) return exact[0];
  const lower = resolver.byLower.get(word.toLowerCase());
  if (lower && lower.length === 1) return lower[0];
  return id;
}

function parseArray(raw: string | null): unknown[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}

export interface MigrationResult {
  ran: boolean;
  categories: number;
  words: number;
  saved: number;
}

/**
 * 한 번만 돕니다. 단어장·단어의 단어장 ID, 다시 외울 표시, 접힘 상태를 새 ID 로 옮기고
 * 시드 동기화 표시를 지워 다음 동기화가 새 시드로 채우게 합니다.
 * 이미 새 ID 인 데이터에 다시 돌려도 바뀌는 것이 없습니다(표에 새 ID 가 키로 없음).
 */
export function migrateSharedIdsOnce(store: KeyValueStore, seed: SeedLike | null | undefined): MigrationResult {
  const result: MigrationResult = { ran: false, categories: 0, words: 0, saved: 0 };
  try {
    if (store.getItem(SHARED_ID_MIGRATION_KEY) === "1") return result;
  } catch (e) {
    return result;
  }
  result.ran = true;
  try {
    const resolver = makeLegacyWordResolver(seed);

    // 1) 단어장 목록 — 자리를 그대로 두고 ID 만 바꿉니다 (사용자가 정한 순서 유지)
    const cats = parseArray(store.getItem(CATEGORIES_KEY)) as { id?: string }[] | null;
    if (cats) {
      const seen = new Set<string>();
      const next: unknown[] = [];
      for (const c of cats) {
        if (!c || typeof c.id !== "string") { next.push(c); continue; }
        const id = upgradeLegacyCategoryId(c.id);
        if (id !== c.id) result.categories++;
        if (seen.has(id)) continue; // 혹시 옛것과 새것이 함께 있으면 앞의 것 하나만
        seen.add(id);
        next.push(id === c.id ? c : { ...c, id });
      }
      store.setItem(CATEGORIES_KEY, JSON.stringify(next));
    }

    // 2) 단어 — 단어장 ID 를 바꾸고, 공용 단어는 단어 ID 도 바꿉니다
    //    (공용 단어는 곧 시드 동기화가 새로 채우지만, 그 전에 읽는 곳이 있어도 맞도록)
    const words = parseArray(store.getItem(WORDS_KEY)) as { id?: string; word?: string; categoryId?: string; isShared?: boolean }[] | null;
    if (words) {
      const seen = new Set<string>();
      const next: unknown[] = [];
      for (const w of words) {
        if (!w || typeof w.id !== "string") { next.push(w); continue; }
        const catId = typeof w.categoryId === "string" ? upgradeLegacyCategoryId(w.categoryId) : w.categoryId;
        const id = w.isShared ? upgradeLegacyWordId(w.id, resolver) : w.id;
        // 예시 단어 8개의 대문자 표제어를 소문자로 (사용자가 고치지 않은 것만)
        const dc = !w.isShared ? LEGACY_DEFAULT_WORD_CASE[w.id] : undefined;
        const word = dc && w.word === dc.from && catId === dc.categoryId ? dc.to : w.word;
        if (catId !== w.categoryId || id !== w.id || word !== w.word) result.words++;
        if (seen.has(id)) continue;
        seen.add(id);
        next.push(catId === w.categoryId && id === w.id && word === w.word ? w : { ...w, id, word, categoryId: catId });
      }
      store.setItem(WORDS_KEY, JSON.stringify(next));
    }

    // 3) 다시 외울 표시 (단어 ID 목록)
    const saved = parseArray(store.getItem(SAVED_KEY));
    if (saved) {
      const out: string[] = [];
      for (const s of saved) {
        if (typeof s !== "string" || !s) continue;
        const id = upgradeLegacyWordId(s, resolver);
        if (id !== s) result.saved++;
        if (out.indexOf(id) === -1) out.push(id);
      }
      store.setItem(SAVED_KEY, JSON.stringify(out));
    }

    // 4) 단어장별 접힘 상태
    for (const oldId of Object.keys(LEGACY_SHARED_CATEGORY_IDS)) {
      const oldKey = COLLAPSED_PREFIX + oldId;
      const v = store.getItem(oldKey);
      if (v === null) continue;
      const newKey = COLLAPSED_PREFIX + LEGACY_SHARED_CATEGORY_IDS[oldId];
      if (store.getItem(newKey) === null) store.setItem(newKey, v);
      store.removeItem(oldKey);
    }

    // 5) 다음 시드 동기화가 반드시 돌도록
    store.removeItem(SEED_SYNC_KEY);
    store.setItem(SHARED_ID_MIGRATION_KEY, "1");
  } catch (e) {
    // 저장소가 막혀 있으면 다음 실행에 다시 시도합니다 (표시를 남기지 않음)
  }
  return result;
}

/**
 * 한 번만 돕니다(2026-11-14). 표기를 고친 표제어 19개의 "다시 외울 표시"를 새 ID 로 옮깁니다.
 * 공용 단어 자체는 시드 동기화가 새 표기로 다시 깔므로 손대지 않습니다. 옮긴 표시 수를 돌려줍니다.
 */
export function migrateRenamedHeadwordsOnce(store: KeyValueStore): number {
  let moved = 0;
  try {
    if (store.getItem(SHARED_ID_RENAME_KEY) === "1") return 0;
    const saved = parseArray(store.getItem(SAVED_KEY));
    if (saved) {
      const out: string[] = [];
      for (const s of saved) {
        if (typeof s !== "string" || !s) continue;
        const id = upgradeRenamedWordId(s);
        if (id !== s) moved++;
        if (out.indexOf(id) === -1) out.push(id);
      }
      if (moved > 0) store.setItem(SAVED_KEY, JSON.stringify(out));
    }
    store.setItem(SHARED_ID_RENAME_KEY, "1");
  } catch (e) {
    // 다음 실행에 다시 시도합니다
  }
  return moved;
}
