// src/lib/bible.ts
// 인도네시아어 성경(TB, Terjemahan Baru) + 한국어 성경(새번역, RNKSV) 본문을 불러옵니다.
// 인니어 소스: tobiasagyasta/alkitab-api (raw.githubusercontent.com, CORS 허용)
// 한국어 소스: bolls.life (대한성서공회 허락을 받아 배포되는 새번역, CORS 허용)
// 본문은 저장하지 않고 필요할 때마다 불러오며, 앱 실행 중에만 메모리에 캐시합니다.

export interface BibleBook {
  id: string;        // JSON 파일명 (확장자 제외)
  folder: "pl" | "pb"; // 구약(pl) / 신약(pb)
  ko: string;        // 한국어 책 이름
  idName: string;    // 인도네시아어 책 이름 (표시용)
  chapters: number;  // 전체 장수
  usfm: string;      // Bible.com 책 코드 (성경 듣기 링크용)
  audio: string;     // R2 오디오 폴더/파일 접두 약어 (룻기만 대문자 RUT)
}

export interface BibleVerse {
  verse: number;
  text: string;
}

// 66권 정경 순서. chapters는 실제 데이터에서 실측한 값.
export const BIBLE_BOOKS: BibleBook[] = [
  // 구약 39권
  { id: "kejadian", folder: "pl", ko: "창세기", idName: "Kejadian", chapters: 50, usfm: "GEN", audio: "kej" },
  { id: "keluaran", folder: "pl", ko: "출애굽기", idName: "Keluaran", chapters: 40, usfm: "EXO", audio: "kel" },
  { id: "imamat", folder: "pl", ko: "레위기", idName: "Imamat", chapters: 27, usfm: "LEV", audio: "ima" },
  { id: "bilangan", folder: "pl", ko: "민수기", idName: "Bilangan", chapters: 36, usfm: "NUM", audio: "bil" },
  { id: "ulangan", folder: "pl", ko: "신명기", idName: "Ulangan", chapters: 34, usfm: "DEU", audio: "ula" },
  { id: "yosua", folder: "pl", ko: "여호수아", idName: "Yosua", chapters: 24, usfm: "JOS", audio: "yos" },
  { id: "hakim_hakim", folder: "pl", ko: "사사기", idName: "Hakim-hakim", chapters: 21, usfm: "JDG", audio: "hak" },
  { id: "rut", folder: "pl", ko: "룻기", idName: "Rut", chapters: 4, usfm: "RUT", audio: "RUT" },
  { id: "1_samuel", folder: "pl", ko: "사무엘상", idName: "1 Samuel", chapters: 31, usfm: "1SA", audio: "1sa" },
  { id: "2_samuel", folder: "pl", ko: "사무엘하", idName: "2 Samuel", chapters: 24, usfm: "2SA", audio: "2sa" },
  { id: "1_raja_raja", folder: "pl", ko: "열왕기상", idName: "1 Raja-raja", chapters: 22, usfm: "1KI", audio: "1ra" },
  { id: "2_raja_raja", folder: "pl", ko: "열왕기하", idName: "2 Raja-raja", chapters: 25, usfm: "2KI", audio: "2ra" },
  { id: "1_tawarikh", folder: "pl", ko: "역대상", idName: "1 Tawarikh", chapters: 29, usfm: "1CH", audio: "1ta" },
  { id: "2_tawarikh", folder: "pl", ko: "역대하", idName: "2 Tawarikh", chapters: 36, usfm: "2CH", audio: "2ta" },
  { id: "ezra", folder: "pl", ko: "에스라", idName: "Ezra", chapters: 10, usfm: "EZR", audio: "ezr" },
  { id: "nehemia", folder: "pl", ko: "느헤미야", idName: "Nehemia", chapters: 13, usfm: "NEH", audio: "neh" },
  { id: "ester", folder: "pl", ko: "에스더", idName: "Ester", chapters: 10, usfm: "EST", audio: "est" },
  { id: "ayub", folder: "pl", ko: "욥기", idName: "Ayub", chapters: 42, usfm: "JOB", audio: "ayb" },
  { id: "mazmur", folder: "pl", ko: "시편", idName: "Mazmur", chapters: 150, usfm: "PSA", audio: "mzm" },
  { id: "amsal", folder: "pl", ko: "잠언", idName: "Amsal", chapters: 31, usfm: "PRO", audio: "ams" },
  { id: "pengkotbah", folder: "pl", ko: "전도서", idName: "Pengkhotbah", chapters: 12, usfm: "ECC", audio: "pkh" },
  { id: "kidung_agung", folder: "pl", ko: "아가", idName: "Kidung Agung", chapters: 8, usfm: "SNG", audio: "kid" },
  { id: "yesaya", folder: "pl", ko: "이사야", idName: "Yesaya", chapters: 66, usfm: "ISA", audio: "yes" },
  { id: "yeremia", folder: "pl", ko: "예레미야", idName: "Yeremia", chapters: 52, usfm: "JER", audio: "yer" },
  { id: "ratapan", folder: "pl", ko: "예레미야애가", idName: "Ratapan", chapters: 5, usfm: "LAM", audio: "rat" },
  { id: "yehezkiel", folder: "pl", ko: "에스겔", idName: "Yehezkiel", chapters: 48, usfm: "EZK", audio: "yeh" },
  { id: "daniel", folder: "pl", ko: "다니엘", idName: "Daniel", chapters: 12, usfm: "DAN", audio: "dan" },
  { id: "hosea", folder: "pl", ko: "호세아", idName: "Hosea", chapters: 14, usfm: "HOS", audio: "hos" },
  { id: "yoel", folder: "pl", ko: "요엘", idName: "Yoel", chapters: 3, usfm: "JOL", audio: "yoe" },
  { id: "amos", folder: "pl", ko: "아모스", idName: "Amos", chapters: 9, usfm: "AMO", audio: "amo" },
  { id: "obaja", folder: "pl", ko: "오바댜", idName: "Obaja", chapters: 1, usfm: "OBA", audio: "oba" },
  { id: "yunus", folder: "pl", ko: "요나", idName: "Yunus", chapters: 4, usfm: "JON", audio: "yun" },
  { id: "mikha", folder: "pl", ko: "미가", idName: "Mikha", chapters: 7, usfm: "MIC", audio: "mik" },
  { id: "nahum", folder: "pl", ko: "나훔", idName: "Nahum", chapters: 3, usfm: "NAM", audio: "nah" },
  { id: "habakuk", folder: "pl", ko: "하박국", idName: "Habakuk", chapters: 3, usfm: "HAB", audio: "hab" },
  { id: "zefanya", folder: "pl", ko: "스바냐", idName: "Zefanya", chapters: 3, usfm: "ZEP", audio: "zef" },
  { id: "hagai", folder: "pl", ko: "학개", idName: "Hagai", chapters: 2, usfm: "HAG", audio: "hag" },
  { id: "zakaria", folder: "pl", ko: "스가랴", idName: "Zakharia", chapters: 14, usfm: "ZEC", audio: "zak" },
  { id: "maleakhi", folder: "pl", ko: "말라기", idName: "Maleakhi", chapters: 4, usfm: "MAL", audio: "mal" },
  // 신약 27권
  { id: "matius", folder: "pb", ko: "마태복음", idName: "Matius", chapters: 28, usfm: "MAT", audio: "mat" },
  { id: "markus", folder: "pb", ko: "마가복음", idName: "Markus", chapters: 16, usfm: "MRK", audio: "mrk" },
  { id: "lukas", folder: "pb", ko: "누가복음", idName: "Lukas", chapters: 24, usfm: "LUK", audio: "luk" },
  { id: "yohanes", folder: "pb", ko: "요한복음", idName: "Yohanes", chapters: 21, usfm: "JHN", audio: "yoh" },
  { id: "kisah_para_rasul", folder: "pb", ko: "사도행전", idName: "Kisah Para Rasul", chapters: 28, usfm: "ACT", audio: "kis" },
  { id: "roma", folder: "pb", ko: "로마서", idName: "Roma", chapters: 16, usfm: "ROM", audio: "rom" },
  { id: "1_korintus", folder: "pb", ko: "고린도전서", idName: "1 Korintus", chapters: 16, usfm: "1CO", audio: "1ko" },
  { id: "2_korintus", folder: "pb", ko: "고린도후서", idName: "2 Korintus", chapters: 13, usfm: "2CO", audio: "2ko" },
  { id: "galatia", folder: "pb", ko: "갈라디아서", idName: "Galatia", chapters: 6, usfm: "GAL", audio: "gal" },
  { id: "efesus", folder: "pb", ko: "에베소서", idName: "Efesus", chapters: 6, usfm: "EPH", audio: "efe" },
  { id: "filipi", folder: "pb", ko: "빌립보서", idName: "Filipi", chapters: 4, usfm: "PHP", audio: "fil" },
  { id: "kolose", folder: "pb", ko: "골로새서", idName: "Kolose", chapters: 4, usfm: "COL", audio: "kol" },
  { id: "1_tesalonika", folder: "pb", ko: "데살로니가전서", idName: "1 Tesalonika", chapters: 5, usfm: "1TH", audio: "1te" },
  { id: "2_tesalonika", folder: "pb", ko: "데살로니가후서", idName: "2 Tesalonika", chapters: 3, usfm: "2TH", audio: "2te" },
  { id: "1_timotius", folder: "pb", ko: "디모데전서", idName: "1 Timotius", chapters: 6, usfm: "1TI", audio: "1ti" },
  { id: "2_timotius", folder: "pb", ko: "디모데후서", idName: "2 Timotius", chapters: 4, usfm: "2TI", audio: "2ti" },
  { id: "titus", folder: "pb", ko: "디도서", idName: "Titus", chapters: 3, usfm: "TIT", audio: "tit" },
  { id: "filemon", folder: "pb", ko: "빌레몬서", idName: "Filemon", chapters: 1, usfm: "PHM", audio: "flm" },
  { id: "ibrani", folder: "pb", ko: "히브리서", idName: "Ibrani", chapters: 13, usfm: "HEB", audio: "ibr" },
  { id: "yakobus", folder: "pb", ko: "야고보서", idName: "Yakobus", chapters: 5, usfm: "JAS", audio: "yak" },
  { id: "1_petrus", folder: "pb", ko: "베드로전서", idName: "1 Petrus", chapters: 5, usfm: "1PE", audio: "1pe" },
  { id: "2_petrus", folder: "pb", ko: "베드로후서", idName: "2 Petrus", chapters: 3, usfm: "2PE", audio: "2pe" },
  { id: "1_yohanes", folder: "pb", ko: "요한일서", idName: "1 Yohanes", chapters: 5, usfm: "1JN", audio: "1yo" },
  { id: "2_yohanes", folder: "pb", ko: "요한이서", idName: "2 Yohanes", chapters: 1, usfm: "2JN", audio: "2yo" },
  { id: "3_yohanes", folder: "pb", ko: "요한삼서", idName: "3 Yohanes", chapters: 1, usfm: "3JN", audio: "3yo" },
  { id: "yudas", folder: "pb", ko: "유다서", idName: "Yudas", chapters: 1, usfm: "JUD", audio: "yud" },
  { id: "wahyu", folder: "pb", ko: "요한계시록", idName: "Wahyu", chapters: 22, usfm: "REV", audio: "wah" },
];

export function getBook(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id);
}

// bolls.life는 책을 1~66 숫자로 구분합니다(창세기=1 ... 요한계시록=66).
// BIBLE_BOOKS 배열이 정경 순서 그대로라 인덱스+1이 곧 bolls.life 책 번호입니다.
function bollsBookNumber(bookId: string): number {
  const idx = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  return idx + 1;
}

// Bible.com(TB, versionId 306)에서 해당 장을 여는 링크. 앱이 깔려 있으면 앱으로 열립니다.
export function bibleComUrl(bookId: string, chapter: number): string {
  const book = getBook(bookId);
  if (!book) return "https://www.bible.com/bible/306";
  return "https://www.bible.com/bible/306/" + book.usfm + "." + chapter + ".TB";
}

const RAW_BASE = "https://raw.githubusercontent.com/tobiasagyasta/alkitab-api/main/lib";

// 앱 실행 중에만 유지되는 책 단위 캐시 (본문은 영구 저장하지 않음)
const bookCache = new Map<string, Record<string, BibleVerse[]>>();

// 한 장의 본문을 가져옵니다. 같은 책은 세션 내 재요청 없음.
export async function fetchChapter(bookId: string, chapter: number): Promise<BibleVerse[]> {
  const book = getBook(bookId);
  if (!book) throw new Error("UNKNOWN_BOOK");

  let chapters = bookCache.get(bookId);
  if (!chapters) {
    let res: Response;
    try {
      res = await fetch(RAW_BASE + "/" + book.folder + "/" + book.id + ".json");
    } catch {
      throw new Error("BIBLE_FETCH_FAILED");
    }
    if (!res.ok) throw new Error("BIBLE_FETCH_FAILED");
    const data = await res.json();
    chapters = (data && data.chapters) || {};
    bookCache.set(bookId, chapters);
  }

  const verses = chapters[String(chapter)];
  if (!Array.isArray(verses) || verses.length === 0) throw new Error("CHAPTER_NOT_FOUND");
  return [...verses]
    .filter((v) => v && typeof v.verse === "number" && typeof v.text === "string")
    .map((v) => ({ verse: v.verse, text: stripTbMarks(v.text) }))
    .sort((a, b) => a.verse - b.verse);
}

// ── 한국어(새번역, RNKSV) ──────────────────────────────────────
// bolls.life는 정적 파일이 아니라 실시간 API라 절 단위로 그때그때 불러옵니다.
// 대한성서공회의 허락을 받아 배포되는 번역이며, 본문은 저장하지 않고 세션 메모리에만 캐시합니다.

const koChapterCache = new Map<string, BibleVerse[]>();

// TB 본문에는 예수님의 말씀을 감싸는 마커(시작 "/", 끝 "*")가 들어 있어 표시 전에 제거합니다.
function stripTbMarks(text: string): string {
  return text
    .replace(new RegExp("[/*]", "g"), "")
    .replace(new RegExp("\\s{2,}", "g"), " ")
    .trim();
}

// bolls.life 응답의 text는 HTML 문자열(예: <i>...</i>)일 수 있어 태그를 제거합니다.
function stripHtml(html: string): string {
  return html.replace(new RegExp("<[^>]*>", "g"), "").trim();
}

export async function fetchChapterKo(bookId: string, chapter: number): Promise<BibleVerse[]> {
  const cacheKey = bookId + "-" + chapter;
  const cached = koChapterCache.get(cacheKey);
  if (cached) return cached;

  const bookNum = bollsBookNumber(bookId);
  if (!bookNum) throw new Error("UNKNOWN_BOOK");

  let res: Response;
  try {
    res = await fetch("https://bolls.life/get-text/RNKSV/" + bookNum + "/" + chapter + "/");
  } catch {
    throw new Error("BIBLE_FETCH_FAILED");
  }
  if (!res.ok) throw new Error("BIBLE_FETCH_FAILED");

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("CHAPTER_NOT_FOUND");

  const verses: BibleVerse[] = data
    .filter((v: any) => v && typeof v.verse === "number" && typeof v.text === "string")
    .map((v: any) => ({ verse: v.verse, text: stripHtml(v.text) }))
    .sort((a: BibleVerse, b: BibleVerse) => a.verse - b.verse);

  if (verses.length === 0) throw new Error("CHAPTER_NOT_FOUND");
  koChapterCache.set(cacheKey, verses);
  return verses;
}

// ── QT(오늘의 묵상) 지원 헬퍼 ────────────────────────────────────
// 두란노 today.json의 "book"은 한국어 책 이름 문자열이라, BIBLE_BOOKS와 매칭합니다.
export function getBookByKo(ko: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.ko === ko);
}

// QT 범위(장이 하나거나, 드물게 장을 걸치는 경우)에 해당하는 TB(인니어) 절만 뽑아옵니다.
export async function fetchQtTbVerses(
  bookId: string,
  range: { chapter: number; verseStart: number; verseEnd: number; endChapter: number; crossChapter: boolean }
): Promise<BibleVerse[]> {
  if (!range.crossChapter) {
    const all = await fetchChapter(bookId, range.chapter);
    return all.filter((v) => v.verse >= range.verseStart && v.verse <= range.verseEnd);
  }
  const [first, second] = await Promise.all([
    fetchChapter(bookId, range.chapter),
    fetchChapter(bookId, range.endChapter),
  ]);
  const part1 = first.filter((v) => v.verse >= range.verseStart);
  const part2 = second.filter((v) => v.verse <= range.verseEnd);
  return [...part1, ...part2];
}
