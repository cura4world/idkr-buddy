// src/lib/peribahasa.ts
// "오늘의 인도네시아어(Bahasa Hari Ini)"에 나올 문장들.
// 종류를 여러 개 고르면 그중 하나가 무작위로 뽑힙니다.
//
// 성경 말씀은 본문을 이 파일에 담지 않고 "장·절 참조"만 두었다가
// 앱이 이미 쓰고 있는 성경 API에서 그때그때 불러옵니다.
// 내 단어장은 저장된 단어와 예문에서 가져옵니다.

import {
  fetchChapter,
  getBook,
  BIBLE_BOOKS,
  stripVerseIntro,
  isUsableVerseText,
} from "@/lib/bible";
import { getWordsByCategory, getCategories } from "@/lib/store";
import { hasGeminiApiKey } from "@/lib/gemini";
import { askPhraseJSON, generateNewPhrase, getPhraseDetail } from "@/lib/phrase";

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
  ref?: string;      // 화면에 보여줄 출처 (예: "Filipi 4:13", 또는 원래 단어)
  bookId?: string;   // 성경일 때만: 한국어 본문을 불러오기 위한 정보
  chapter?: number;
  verse?: number;
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

/* ── 지금 보여주고 있는 문장 기억 ── */
//
// 새 문장이 나오는 조건은 두 가지입니다.
//   1) 앱이 완전히 새로 뜰 때 (모듈 변수가 비어 있음)
//   2) 마지막으로 문장을 띄운 날짜가 지났을 때
//
// 2번이 중요합니다. 안드로이드가 앱을 메모리에 며칠씩 붙들고 있으면 모듈 변수가
// 살아남아 1번 조건이 영영 안 맞습니다. 그래서 프로세스가 죽었는지가 아니라
// "언제 띄웠는지"로 판단합니다. 화면으로 돌아올 때마다 phraseIsStale()을 확인하면
// 며칠 상주해 있던 앱도 날짜가 바뀐 순간 새 문장으로 넘어갑니다.

let sessionPhrase: Phrase | null = null;
let sessionDay = "";

// 바로 직전에 보여준 문장 (내장 문장으로 채울 때 같은 게 또 나오지 않도록)
const LAST_ID_KEY = "phrase-last-id";
const OLD_TODAY_KEY = "phrase-today";

// 하루의 경계 (그 지역 시간 기준 자정)
function todayKey(): string {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

// 다음 자정까지 남은 밀리초 — 앱을 켜둔 채 날짜가 바뀌는 경우를 위해 씁니다
export function msUntilNextDay(): number {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5);
  return Math.max(1000, next.getTime() - d.getTime());
}

function getLastPhraseId(): string {
  try {
    return localStorage.getItem(LAST_ID_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function loadSavedPhrase(): Phrase | null {
  if (!sessionPhrase) return null;
  if (sessionDay !== todayKey()) return null;
  return sessionPhrase;
}

/** 새 문장으로 갈아탈 때가 되었는지 (앱을 새로 켰거나 날짜가 지났거나) */
export function phraseIsStale(): boolean {
  return sessionPhrase === null || sessionDay !== todayKey();
}

function remember(p: Phrase): Phrase {
  sessionPhrase = p;
  sessionDay = todayKey();
  pushRecent(p.kind === "alkitab" && p.ref ? p.ref : p.id);
  try {
    localStorage.setItem(LAST_ID_KEY, p.id);
    // 더 이상 쓰지 않는 예전 키를 치웁니다
    localStorage.removeItem(OLD_TODAY_KEY);
  } catch (e) { /* 무시 */ }
  return p;
}

/* ── 마음에 든 문장 저장 ── */
//
// 단어장 플래시카드의 리본과 같은 방식입니다. 문장만 담아 두고 해설은
// 이미 IndexedDB 캐시에 있으므로, 저장한 문장을 다시 열면 바로 나옵니다.

const SAVED_KEY = "phrase-saved";

export interface SavedPhrase extends Phrase {
  savedAt: number;
}

export function loadSavedList(): SavedPhrase[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (p: unknown) =>
        p && typeof (p as SavedPhrase).id === "string" && (p as SavedPhrase).id.trim() !== ""
    ) as SavedPhrase[];
  } catch (e) {
    return [];
  }
}

function writeSavedList(list: SavedPhrase[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch (e) { /* 무시 */ }
}

export function countSaved(): number {
  return loadSavedList().length;
}

export function isPhraseSaved(id: string): boolean {
  return loadSavedList().some((p) => p.id === id);
}

/** 저장/해제를 뒤집고, 뒤집은 뒤 상태를 돌려줍니다 */
export function toggleSavedPhrase(p: Phrase): boolean {
  const list = loadSavedList();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) {
    list.splice(i, 1);
    writeSavedList(list);
    return false;
  }
  // 최근에 저장한 것이 위로 오게 합니다
  list.unshift({ ...p, savedAt: Date.now() });
  writeSavedList(list);
  return true;
}

export function removeSavedPhrase(id: string): void {
  writeSavedList(loadSavedList().filter((p) => p.id !== id));
}

/** 문장 하나를 상세 화면 주소로 바꿉니다 (메인 화면과 저장 목록이 함께 씁니다) */
export function phraseToQuery(p: Phrase): string {
  const q = new URLSearchParams();
  q.set("s", p.id);
  if (p.ko) q.set("ko", p.ko);
  q.set("k", p.kind);
  if (p.ref) q.set("ref", p.ref);
  if (p.bookId) q.set("b", p.bookId);
  if (typeof p.chapter === "number") q.set("c", String(p.chapter));
  if (typeof p.verse === "number") q.set("v", String(p.verse));
  return q.toString();
}

/* ── 다음 문장 미리 받아두기 ── */
//
// 앱을 보고 있는 동안 다음에 보여줄 문장을 Gemini로 미리 만들어 폰에 넣어 둡니다.
// 해설(뒷페이지)도 같이 만들어 IndexedDB 캐시에 넣으므로, 다음에 앱을 열면
// 문장이 기다림 없이 바로 뜨고 눌렀을 때 뒷페이지도 즉시 나옵니다.

const NEXT_KEY = "phrase-next";
const RECENT_KEY = "phrase-recent";
const RECENT_MAX = 30;

function loadNext(): Phrase | null {
  try {
    const raw = localStorage.getItem(NEXT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && typeof p.id === "string" && p.id.trim() !== "" && typeof p.kind === "string") {
      return p as Phrase;
    }
  } catch (e) { /* 못 읽으면 없는 셈 칩니다 */ }
  return null;
}

function saveNext(p: Phrase | null): void {
  try {
    if (p) localStorage.setItem(NEXT_KEY, JSON.stringify(p));
    else localStorage.removeItem(NEXT_KEY);
  } catch (e) { /* 무시 */ }
}

/** 종류 설정을 바꿨을 때처럼, 미리 받아둔 문장을 버려야 할 때 */
export function clearNextPhrase(): void {
  saveNext(null);
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v: unknown) => typeof v === "string") : [];
  } catch (e) {
    return [];
  }
}

function pushRecent(text: string): void {
  if (!text) return;
  try {
    const list = loadRecent().filter((v) => v !== text);
    list.unshift(text);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
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
    // 시편 1절의 표제("Mazmur Daud." 등)와 절번호 표시를 걷어냅니다
    const text = stripVerseIntro(found.text, found.verse);
    if (!isUsableVerseText(text)) return null;
    return {
      kind: "alkitab",
      id: text,
      ko: "",
      ref: ref.label,
      bookId: ref.bookId,
      chapter: ref.chapter,
      verse: ref.verse,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 고른 종류들 중에서 문장 하나를 뽑습니다.
 * 성경·내 단어장을 못 가져오면 다른 종류로 자동 대체됩니다.
 */
async function pickOnce(kinds: PhraseKind[]): Promise<Phrase> {
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

/**
 * 내장 목록에서 문장 하나 — 미리 받아둔 것이 없을 때 쓰는 예비 수단입니다.
 * 바로 직전에 보여준 것과 같으면 몇 번 다시 뽑습니다.
 */
async function pickFallback(kinds: PhraseKind[]): Promise<Phrase> {
  const last = getLastPhraseId();
  let p = await pickOnce(kinds);
  for (let i = 0; i < 3 && last !== "" && p.id === last; i += 1) {
    p = await pickOnce(kinds);
  }
  return p;
}

/**
 * 화면에 올릴 문장 하나를 가져옵니다.
 * 미리 받아둔 것이 있으면 기다림 없이 그것을, 없으면 내장 목록에서 채웁니다.
 */
export async function takePhrase(kinds: PhraseKind[]): Promise<Phrase> {
  const active = kinds.length > 0 ? kinds : DEFAULT_KINDS;
  const queued = loadNext();
  saveNext(null);
  if (queued && active.indexOf(queued.kind) >= 0) return remember(queued);
  return remember(await pickFallback(active));
}

/* ── Gemini로 새 문장 만들기 ── */

// 종류마다 어떤 문장을 만들어야 하는지 알려줍니다.
// 성경(alkitab)과 내 단어장(kosakataku)은 지어내면 안 되므로 여기에 넣지 않습니다.
const KIND_GUIDE: Partial<Record<PhraseKind, string>> = {
  peribahasa:
    "종류: 인도네시아 생활 속담(peribahasa) 한 줄. 인도네시아 사람이 실제로 알고 쓰는 속담이어야 합니다.",
  ungkapan:
    "종류: 인도네시아어 관용구(ungkapan) 한 줄. 단어 뜻만 알아서는 짐작하기 어려운 표현이어야 합니다.",
  percakapan:
    "종류: 일상 회화(percakapan) 문장 한 줄. 가게·이웃·직장 등 실제 상황에서 바로 쓰는 말이어야 합니다.",
  gereja:
    "종류: 인도네시아 교회에서 쓰는 표현(istilah gereja) 한 줄. 예배·기도·교제 자리에서 실제로 듣는 말이어야 합니다.",
};

/** Gemini에게 성경 구절 "참조"만 고르게 합니다 (본문은 성경 API에서 가져옵니다) */
async function suggestAyatRef(recent: string[]): Promise<AyatRef | null> {
  const prompt = [
    "인도네시아어를 배우는 한국인 크리스천에게 오늘 힘이 될 성경 구절 하나를 고르세요.",
    "누구나 아는 유명한 구절만 고르지 말고, 덜 알려졌지만 마음에 닿는 구절까지 폭넓게 골라 주세요.",
    "아래 구절은 최근에 이미 다뤘으니 피하세요: " + (recent.length > 0 ? recent.join(" / ") : "없음"),
    "",
    "book 값은 반드시 아래 목록에 있는 것 중 하나여야 합니다:",
    BIBLE_BOOKS.map((b) => b.id).join(", "),
    "",
    "아래 JSON 형식으로만 답하세요.",
    '{"book": "목록에 있는 값", "chapter": 숫자, "verse": 숫자}',
  ].join("\n");

  const raw = await askPhraseJSON(prompt);
  const bookId = typeof raw.book === "string" ? raw.book.trim().toLowerCase() : "";
  const chapter = Number(raw.chapter);
  const verse = Number(raw.verse);
  const book = getBook(bookId);
  // 없는 책이나 범위를 벗어난 장이면 버립니다 (지어낸 참조 걸러내기)
  if (!book) return null;
  if (!(chapter >= 1) || chapter > book.chapters) return null;
  if (!(verse >= 1)) return null;
  return { bookId, chapter, verse, label: book.idName + " " + chapter + ":" + verse };
}

/** 성경 구절 하나 — 참조는 Gemini가 고르고 본문은 성경 API에서 확인합니다 */
async function createAyat(recent: string[]): Promise<Phrase | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let ref: AyatRef | null = null;
    try {
      ref = await suggestAyatRef(recent);
    } catch (e) {
      ref = null;
    }
    // Gemini가 실패하면 내장 참조 목록으로 대신합니다
    const use: AyatRef = ref || pickOne(AYAT_REFS);

    try {
      const verses = await fetchChapter(use.bookId, use.chapter);
      const found = verses.find((v) => v.verse === use.verse);
      // 실제로 없는 절이면 다시 고릅니다
      if (!found || !found.text) continue;
      // 시편 1절의 표제("Mazmur Daud." 등)와 절번호 표시를 걷어냅니다
      const text = stripVerseIntro(found.text, found.verse);
      // 표제만 있거나 원본이 잘려 있는 절이면 다른 구절로 다시 고릅니다
      if (!isUsableVerseText(text)) continue;
      await getPhraseDetail(text, "");
      return {
        kind: "alkitab",
        id: text,
        ko: "",
        ref: use.label,
        bookId: use.bookId,
        chapter: use.chapter,
        verse: use.verse,
      };
    } catch (e) { /* 다음 시도로 */ }
  }
  return null;
}

async function createPhrase(kind: PhraseKind, recent: string[]): Promise<Phrase | null> {
  if (kind === "alkitab") return createAyat(recent);

  if (kind === "kosakataku") {
    const p = pickFromWordbook();
    if (!p) return null;
    await getPhraseDetail(p.id, p.ko);
    return p;
  }

  const guide = KIND_GUIDE[kind];
  if (!guide) return null;
  const g = await generateNewPhrase(guide, recent);
  return { kind, id: g.id, ko: g.ko };
}

/**
 * 다음에 보여줄 문장을 미리 만들어 둡니다 (해설까지 함께).
 * 앱을 보고 있는 동안 조용히 돌리므로 실패해도 화면에는 영향이 없습니다.
 */
let prefetching = false;

export async function prefetchNextPhrase(kinds: PhraseKind[]): Promise<void> {
  if (!hasGeminiApiKey()) return;
  if (prefetching) return; // 이미 만들고 있으면 중복 호출하지 않습니다
  if (loadNext()) return;  // 이미 준비되어 있으면 그대로 둡니다

  const active = kinds.length > 0 ? kinds : DEFAULT_KINDS;
  const recent = loadRecent();
  prefetching = true;

  try {
    // 고른 종류 중 하나로 만들어 보고, 안 되면 다른 종류로 넘어갑니다
    const pool = active.slice();
    while (pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      const kind = pool[i];
      pool.splice(i, 1);
      try {
        const p = await createPhrase(kind, recent);
        if (p) {
          saveNext(p);
          return;
        }
      } catch (e) { /* 다음 종류로 */ }
    }
  } finally {
    prefetching = false;
  }
}
