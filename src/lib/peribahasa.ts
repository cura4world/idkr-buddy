// src/lib/peribahasa.ts
// "오늘의 인도네시아어(Bahasa Hari Ini)"에 나올 문장들.
// 종류를 여러 개 고르면 그중 하나가 무작위로 뽑힙니다.
//
// 성경 말씀은 본문을 이 파일에 담지 않고 "장·절 참조"만 두었다가
// 앱이 이미 쓰고 있는 성경 API에서 그때그때 불러옵니다.
// 내 단어장은 저장된 단어와 예문에서 가져옵니다.

import { fetchChapter } from "@/lib/bible";
import { getWordsByCategory, getCategories } from "@/lib/store";

export type PhraseKind =
  | "peribahasa"
  | "ungkapan"
  | "percakapan"
  | "alkitab"
  | "gereja"
  | "kosakataku";

export interface PhraseKindInfo {
  key: PhraseKind;
  ko: string;
  id: string;
}

export const PHRASE_KINDS: PhraseKindInfo[] = [
  { key: "peribahasa", ko: "생활 속담", id: "Peribahasa" },
  { key: "ungkapan", ko: "관용구", id: "Ungkapan" },
  { key: "percakapan", ko: "일상 회화", id: "Percakapan" },
  { key: "alkitab", ko: "성경 말씀", id: "Ayat Alkitab" },
  { key: "gereja", ko: "교회 표현", id: "Istilah Gereja" },
  { key: "kosakataku", ko: "내가 공부한 단어", id: "Kosakataku" },
];

export interface Phrase {
  id: string;   // 인도네시아어
  ko: string;   // 한국어
  kind: PhraseKind;
  ref?: string; // 성경 장절, 원래 단어 등 출처 표시용
}

/* ── 내장 문장 ── */

const STATIC_PHRASES: Phrase[] = [
  // 생활 속담
  { kind: "peribahasa", id: "Sedikit-sedikit, lama-lama menjadi bukit.", ko: "조금씩 모으다 보면 언덕이 됩니다. 티끌 모아 태산." },
  { kind: "peribahasa", id: "Air tenang menghanyutkan.", ko: "잔잔한 물이 배를 떠내려 보냅니다. 조용한 사람이 더 깊습니다." },
  { kind: "peribahasa", id: "Tak ada gading yang tak retak.", ko: "금 가지 않은 상아는 없습니다. 완벽한 사람은 없습니다." },
  { kind: "peribahasa", id: "Malu bertanya, sesat di jalan.", ko: "묻기를 부끄러워하면 길에서 헤맵니다." },
  { kind: "peribahasa", id: "Berakit-rakit ke hulu, berenang-renang ke tepian.", ko: "먼저 고생하고 나중에 즐깁니다. 고생 끝에 낙이 옵니다." },
  { kind: "peribahasa", id: "Di mana bumi dipijak, di situ langit dijunjung.", ko: "밟고 선 땅에서는 그곳의 하늘을 받듭니다. 그 고장의 법을 따르세요." },
  { kind: "peribahasa", id: "Sambil menyelam minum air.", ko: "잠수하면서 물도 마십니다. 일석이조." },
  { kind: "peribahasa", id: "Bersatu kita teguh, bercerai kita runtuh.", ko: "뭉치면 굳건하고 흩어지면 무너집니다." },
  { kind: "peribahasa", id: "Habis gelap terbitlah terang.", ko: "어둠이 지나면 빛이 떠오릅니다." },
  { kind: "peribahasa", id: "Buah jatuh tidak jauh dari pohonnya.", ko: "열매는 나무에서 멀리 떨어지지 않습니다. 그 아버지에 그 아들." },
  { kind: "peribahasa", id: "Tong kosong nyaring bunyinya.", ko: "빈 통이 소리가 큽니다. 빈 수레가 요란합니다." },
  { kind: "peribahasa", id: "Nasi sudah menjadi bubur.", ko: "밥이 이미 죽이 되었습니다. 엎지른 물입니다." },
  { kind: "peribahasa", id: "Seperti katak dalam tempurung.", ko: "껍데기 속 개구리 같습니다. 우물 안 개구리." },
  { kind: "peribahasa", id: "Ringan sama dijinjing, berat sama dipikul.", ko: "가벼우면 같이 들고, 무거우면 같이 집니다." },
  { kind: "peribahasa", id: "Tak kenal maka tak sayang.", ko: "알지 못하면 사랑하지 못합니다." },
  { kind: "peribahasa", id: "Sepandai-pandai tupai melompat, sekali waktu jatuh juga.", ko: "다람쥐도 언젠가는 떨어집니다. 원숭이도 나무에서 떨어집니다." },
  { kind: "peribahasa", id: "Rajin pangkal pandai.", ko: "부지런함이 지혜의 뿌리입니다." },
  { kind: "peribahasa", id: "Hemat pangkal kaya.", ko: "절약이 넉넉함의 뿌리입니다." },
  { kind: "peribahasa", id: "Ada gula, ada semut.", ko: "설탕이 있는 곳에 개미가 있습니다. 이익이 있는 곳에 사람이 모입니다." },
  { kind: "peribahasa", id: "Bagai pinang dibelah dua.", ko: "빈랑을 둘로 쪼갠 것 같습니다. 붕어빵처럼 닮았습니다." },
  { kind: "peribahasa", id: "Diam itu emas.", ko: "침묵은 금입니다." },
  { kind: "peribahasa", id: "Sedia payung sebelum hujan.", ko: "비 오기 전에 우산을 준비합니다. 유비무환." },

  // 관용구
  { kind: "ungkapan", id: "Panjang tangan", ko: "손이 길다 → 손버릇이 나쁘다" },
  { kind: "ungkapan", id: "Ringan tangan", ko: "손이 가볍다 → 남을 잘 도와준다" },
  { kind: "ungkapan", id: "Turun tangan", ko: "손을 내리다 → 직접 나서서 돕다" },
  { kind: "ungkapan", id: "Angkat tangan", ko: "손을 들다 → 포기하다" },
  { kind: "ungkapan", id: "Banting tulang", ko: "뼈를 내던지다 → 뼈 빠지게 일하다" },
  { kind: "ungkapan", id: "Naik darah", ko: "피가 오르다 → 화가 나다" },
  { kind: "ungkapan", id: "Besar kepala", ko: "머리가 크다 → 거만하다" },
  { kind: "ungkapan", id: "Kutu buku", ko: "책벌레 → 공부만 파는 사람" },
  { kind: "ungkapan", id: "Buah bibir", ko: "입술의 열매 → 사람들 입에 오르내리는 화제" },
  { kind: "ungkapan", id: "Makan hati", ko: "마음을 먹다 → 속을 끓이다" },
  { kind: "ungkapan", id: "Gulung tikar", ko: "돗자리를 말다 → 사업이 망하다" },
  { kind: "ungkapan", id: "Bermuka dua", ko: "두 얼굴을 갖다 → 겉과 속이 다르다" },
  { kind: "ungkapan", id: "Tangan kanan", ko: "오른손 → 가장 믿는 사람" },
  { kind: "ungkapan", id: "Keras kepala", ko: "머리가 단단하다 → 고집이 세다" },

  // 일상 회화
  { kind: "percakapan", id: "Boleh minta tolong?", ko: "좀 도와주실 수 있어요?" },
  { kind: "percakapan", id: "Tidak apa-apa.", ko: "괜찮아요." },
  { kind: "percakapan", id: "Maaf, saya terlambat.", ko: "늦어서 죄송합니다." },
  { kind: "percakapan", id: "Sampai jumpa lagi.", ko: "또 만나요." },
  { kind: "percakapan", id: "Terima kasih banyak.", ko: "정말 감사합니다." },
  { kind: "percakapan", id: "Sama-sama.", ko: "천만에요." },
  { kind: "percakapan", id: "Permisi, numpang tanya.", ko: "실례합니다, 뭐 좀 여쭐게요." },
  { kind: "percakapan", id: "Tunggu sebentar, ya.", ko: "잠깐만 기다려 주세요." },
  { kind: "percakapan", id: "Hati-hati di jalan.", ko: "조심히 가세요." },
  { kind: "percakapan", id: "Saya kurang paham.", ko: "잘 이해가 안 됩니다." },
  { kind: "percakapan", id: "Tolong bicara pelan-pelan.", ko: "천천히 말씀해 주세요." },
  { kind: "percakapan", id: "Tidak usah repot-repot.", ko: "신경 쓰지 마세요." },
  { kind: "percakapan", id: "Silakan masuk dan duduk.", ko: "들어와서 앉으세요." },
  { kind: "percakapan", id: "Sudah makan belum?", ko: "식사하셨어요?" },
  { kind: "percakapan", id: "Kalau ada waktu, mampir ya.", ko: "시간 되면 들르세요." },
  { kind: "percakapan", id: "Semoga cepat sembuh.", ko: "빨리 나으시길 바랍니다." },

  // 교회 표현
  { kind: "gereja", id: "Mari kita berdoa bersama.", ko: "함께 기도합시다." },
  { kind: "gereja", id: "Tuhan memberkati.", ko: "하나님이 축복하시기를." },
  { kind: "gereja", id: "Selamat hari Minggu.", ko: "주일 잘 보내세요." },
  { kind: "gereja", id: "Ibadah dimulai pukul sembilan.", ko: "예배는 아홉 시에 시작합니다." },
  { kind: "gereja", id: "Mari kita menyanyikan pujian.", ko: "함께 찬양합시다." },
  { kind: "gereja", id: "Kita akan membaca firman Tuhan.", ko: "하나님의 말씀을 읽겠습니다." },
  { kind: "gereja", id: "Terima kasih atas pelayanan Anda.", ko: "섬겨 주셔서 감사합니다." },
  { kind: "gereja", id: "Sampai jumpa minggu depan.", ko: "다음 주에 뵙겠습니다." },
  { kind: "gereja", id: "Silakan berdiri untuk berdoa.", ko: "일어서서 기도하겠습니다." },
  { kind: "gereja", id: "Mari kita bersekutu setelah ibadah.", ko: "예배 후에 교제합시다." },
  { kind: "gereja", id: "Doakan saudara kita yang sakit.", ko: "아픈 형제자매를 위해 기도해 주세요." },
  { kind: "gereja", id: "Kelas Alkitab dimulai sore ini.", ko: "성경 공부는 오늘 오후에 시작합니다." },
];

/* 성경은 본문을 담지 않고 참조만 둡니다 (표시할 때 성경 API에서 불러옵니다) */
interface AyatRef {
  bookId: string;
  chapter: number;
  verse: number;
  label: string;
}

const AYAT_REFS: AyatRef[] = [
  { bookId: "mazmur", chapter: 23, verse: 1, label: "Mazmur 23:1" },
  { bookId: "mazmur", chapter: 119, verse: 105, label: "Mazmur 119:105" },
  { bookId: "mazmur", chapter: 46, verse: 2, label: "Mazmur 46:2" },
  { bookId: "amsal", chapter: 3, verse: 5, label: "Amsal 3:5" },
  { bookId: "amsal", chapter: 17, verse: 22, label: "Amsal 17:22" },
  { bookId: "yesaya", chapter: 41, verse: 10, label: "Yesaya 41:10" },
  { bookId: "matius", chapter: 11, verse: 28, label: "Matius 11:28" },
  { bookId: "matius", chapter: 22, verse: 39, label: "Matius 22:39" },
  { bookId: "yohanes", chapter: 14, verse: 27, label: "Yohanes 14:27" },
  { bookId: "roma", chapter: 12, verse: 12, label: "Roma 12:12" },
  { bookId: "filipi", chapter: 4, verse: 13, label: "Filipi 4:13" },
  { bookId: "1_tesalonika", chapter: 5, verse: 16, label: "1 Tesalonika 5:16" },
];

/* ── 선택한 종류 저장 ── */

const KINDS_KEY = "phrase-kinds";
const DEFAULT_KINDS: PhraseKind[] = ["peribahasa", "ungkapan"];

export function loadKinds(): PhraseKind[] {
  try {
    const raw = localStorage.getItem(KINDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const valid = arr.filter((k: unknown) =>
          PHRASE_KINDS.some((info) => info.key === k)
        ) as PhraseKind[];
        if (valid.length > 0) return valid;
      }
    }
  } catch (e) { /* 기본값으로 */ }
  return DEFAULT_KINDS.slice();
}

export function saveKinds(kinds: PhraseKind[]): void {
  try {
    if (kinds.length === 0) return;
    localStorage.setItem(KINDS_KEY, JSON.stringify(kinds));
  } catch (e) { /* 무시 */ }
}

/* ── 오늘 문장 저장 (앱을 다시 열어도 같은 문장이 보이도록) ── */

const TODAY_KEY = "phrase-today";

function todayStamp(): string {
  const d = new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}

export function loadSavedPhrase(): Phrase | null {
  try {
    const raw = localStorage.getItem(TODAY_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.date === todayStamp() && typeof o.id === "string" && typeof o.ko === "string") {
      return { id: o.id, ko: o.ko, kind: o.kind, ref: o.ref };
    }
  } catch (e) { /* 무시 */ }
  return null;
}

export function savePhraseForToday(p: Phrase): void {
  try {
    localStorage.setItem(
      TODAY_KEY,
      JSON.stringify({ date: todayStamp(), id: p.id, ko: p.ko, kind: p.kind, ref: p.ref })
    );
  } catch (e) { /* 무시 */ }
}

/* ── 문장 뽑기 ── */

const MY_WORDBOOK_ID = "my-wordbook";

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 내 단어장(비어 있으면 전체 단어장)에서 문장 하나 */
function pickFromWordbook(): Phrase | null {
  try {
    let words = getWordsByCategory(MY_WORDBOOK_ID);
    if (words.length === 0) {
      const all = getCategories();
      for (let i = 0; i < all.length; i += 1) {
        const w = getWordsByCategory(all[i].id);
        if (w.length > 0) words = words.concat(w);
      }
    }
    if (words.length === 0) return null;
    const w = pickOne(words);
    const example = typeof w.example === "string" ? w.example.trim() : "";
    const exampleKo = typeof w.exampleMeaning === "string" ? w.exampleMeaning.trim() : "";
    if (example !== "") {
      return { kind: "kosakataku", id: example, ko: exampleKo || w.meaning, ref: w.word };
    }
    return { kind: "kosakataku", id: w.word, ko: w.meaning };
  } catch (e) {
    return null;
  }
}

/** 성경 참조 하나를 골라 본문을 불러옵니다 */
async function pickFromAlkitab(): Promise<Phrase | null> {
  try {
    const ref = pickOne(AYAT_REFS);
    const verses = await fetchChapter(ref.bookId, ref.chapter);
    const found = verses.find((v) => v.verse === ref.verse);
    if (!found || !found.text) return null;
    return { kind: "alkitab", id: found.text.trim(), ko: "", ref: ref.label };
  } catch (e) {
    return null;
  }
}

/**
 * 고른 종류들 중에서 문장 하나를 뽑습니다.
 * 성경·내 단어장을 못 가져오면 다른 종류로 자동 대체됩니다.
 */
export async function pickPhrase(kinds: PhraseKind[]): Promise<Phrase> {
  const pool = (kinds.length > 0 ? kinds : DEFAULT_KINDS).slice();

  while (pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    const kind = pool[i];
    pool.splice(i, 1);

    if (kind === "alkitab") {
      const p = await pickFromAlkitab();
      if (p) return p;
      continue;
    }
    if (kind === "kosakataku") {
      const p = pickFromWordbook();
      if (p) return p;
      continue;
    }
    const list = STATIC_PHRASES.filter((p) => p.kind === kind);
    if (list.length > 0) return pickOne(list);
  }

  return pickOne(STATIC_PHRASES.filter((p) => p.kind === "peribahasa"));
}
