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
  // 1절 앞에 붙어 오는 머리말(시편 표제). 본문과 분리해 절번호 없이 따로 보여줍니다.
  intro?: string;
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
  return stripHebrewMarks(
    splitSuperscription(
      repairVerses(
        [...verses]
          .filter((v) => v && typeof v.verse === "number" && typeof v.text === "string")
          .map((v) => ({ verse: v.verse, text: stripTbMarks(v.text) }))
      ),
      chapter
    )
  );
}

// ── 원본 데이터 보정 ───────────────────────────────────────────
// alkitab-api 원문(인쇄본 기반)에는 한 절이 두 조각으로 잘려 들어간 곳이 있습니다.
// 뒷조각이 엉뚱한 절번호를 달고 오는 바람에 한 장에 같은 절번호가 두 번 나타나고,
// 화면에서 React key가 겹쳐 화면을 다시 그릴 때마다 그 문단이 하나씩 쌓입니다.
//
// 66권 전수 점검(2026-08)에서 확인된 곳은 7군데뿐입니다.
//   시편 5·8·68편 — 1절이 "(5-" 에서 끊기고, 뒷조각 ") Berilah ..." 이 2절로 들어옴
//   열왕기상 1장 · 역대상 2·3·4장 — 쪽 머리글이 1절짜리 절로 끼어듦
//
// 두 규칙으로 원래 한 절이던 것을 되돌립니다.
//   1) ")" 로 시작하고 앞 절이 "(숫자-" 로 끝나면 → 앞 절 + 절번호 + 이 조각
//      (잘려나간 절번호가 곧 "(5-2)" 의 2이므로 그대로 되붙습니다)
//   2) 절번호가 앞 절보다 크지 않으면(중복·역행) → 앞 절 뒤에 이어붙임
// 결과적으로 한 장 안의 절번호는 항상 유일해집니다.

const HEBREW_MARK_TAIL = new RegExp("\\(\\d+-$");

function repairVerses(raw: BibleVerse[]): BibleVerse[] {
  const out: BibleVerse[] = [];
  raw.forEach((v) => {
    const prev = out.length > 0 ? out[out.length - 1] : null;
    if (prev) {
      if (v.text.indexOf(")") === 0 && HEBREW_MARK_TAIL.test(prev.text)) {
        prev.text = (prev.text + String(v.verse) + v.text).trim();
        return;
      }
      if (v.verse <= prev.verse) {
        if (v.text) prev.text = (prev.text + " " + v.text).trim();
        return;
      }
    }
    if (!v.text) return;
    out.push({ verse: v.verse, text: v.text });
  });
  return out.sort((a, b) => a.verse - b.verse);
}

// ── 한국어(새번역, RNKSV) ──────────────────────────────────────
// bolls.life는 정적 파일이 아니라 실시간 API라 절 단위로 그때그때 불러옵니다.
// 대한성서공회의 허락을 받아 배포되는 번역이며, 본문은 저장하지 않고 세션 메모리에만 캐시합니다.

const koChapterCache = new Map<string, BibleVerse[]>();

// TB 본문에는 예수님의 말씀을 감싸는 마커(시작 "/", 끝 "*")가 들어 있어 표시 전에 제거합니다.
function stripTbMarks(text: string): string {
  return text
    // 예수님의 말씀을 감싸는 마커 (시작 "/", 끝 "*")
    .replace(new RegExp("[/*]", "g"), "")
    // 인쇄본에서 딸려 들어온 쪽 머리글 + 쪽 번호 (예: "Yunus 1.6-10 2")
    .replace(
      new RegExp("\\s*[A-Z][A-Za-z]*(?:-[A-Za-z]+)*\\s\\d+[.:]\\d+[\\u2013\\u2014-]\\d+(?:[.:]\\d+)?\\s+\\d+\\s*", "g"),
      " "
    )
    .replace(new RegExp("\\s{2,}", "g"), " ")
    .trim();
}

// TB 본문에서 절 하나만 따로 보여줄 때 걸리적거리는 것들을 걷어냅니다.
//
// 1) 표제(superscription) — 시편 1절 앞에 붙는 "Mazmur Daud." 같은 안내문입니다.
//    본문이 아니라 그 편이 어떤 노래인지 알려주는 머리말이라, 절 하나만 볼 때는
//    문장이 엉뚱하게 시작합니다. 시편 116편과 하박국 3장에 있습니다.
//    시편 93:1 "TUHAN adalah Raja..."처럼 진짜 본문으로 시작하는 절을 깎지 않도록
//    표제에만 쓰이는 머리단어로 시작할 때만 걷어냅니다.
// 2) (3-2) 같은 히브리어 절번호 표시 — 인쇄본 대조용이라 읽을 때는 군더더기입니다.
//
// 장 전체를 읽는 화면에서는 표제도 성경 지면 그대로 보여주므로 여기서만 씁니다.

const VERSE_INTRO_HEADS = [
  "Untuk pemimpin biduan",
  "Menurut lagu",
  "Menurut nada",
  "Mazmur",
  "Nyanyian",
  "Doa",
  "Dari Daud",
  "Dari Salomo",
  "Dari Asaf",
  "Miktam",
  "Puji-pujian",
  "Ratapan",
];

const HEBREW_VERSE_MARK = new RegExp("\\(\\d+-\\d+\\)", "g");

function startsWithIntroHead(text: string): boolean {
  return VERSE_INTRO_HEADS.some((h) => text.startsWith(h));
}

export function stripVerseIntro(text: string, verse: number): string {
  let t = text.trim();
  // 표제는 1절에만 붙습니다. 여러 겹으로 붙은 편도 있어 반복해서 걷어냅니다.
  if (verse === 1) {
    for (let i = 0; i < 6; i += 1) {
      if (!startsWithIntroHead(t)) break;
      const m = t.match(new RegExp("^[\\s\\S]{1,250}?[.]\\s+([\\s\\S]+)$"));
      if (!m) break;
      t = m[1].trim();
    }
  }
  return t.replace(HEBREW_VERSE_MARK, " ").replace(new RegExp("\\s{2,}", "g"), " ").trim();
}

/**
 * 절 하나를 문장처럼 보여줘도 되는지 봅니다.
 * 표제만 있고 본문이 없는 절(하박국 3:1)을 걸러냅니다.
 * (시편 8:1 · 68:1처럼 원본이 잘려 있던 절은 repairVerses가 미리 이어붙입니다.)
 */
export function isUsableVerseText(text: string): boolean {
  const t = text.trim();
  if (t.length < 20) return false;
  if (startsWithIntroHead(t)) return false;
  return true;
}

// ── 표제(superscription) 분리 ─────────────────────────────────
// TB 원본은 시편 표제를 1절 본문 앞에 그대로 이어 붙여 보냅니다.
//   시편 23:1 = "Mazmur Daud. TUHAN adalah gembalaku, takkan kekurangan aku."
// 표제는 그 편이 누구의 어떤 노래인지 알려주는 머리말이라 본문 문장이 아닙니다.
// 절번호 없이 1절 위에 따로 얹기 위해 불러오는 자리에서 미리 갈라 둡니다.
//
// 66권 1,189장 전수 점검(2026-09) — 표제가 있는 곳은 117장뿐입니다.
//   시편 116장 + 하박국 3장.
//   시편 1·2·10·33·43·71·91·93~97·99·104~107·111~119·135~137·146~150 (34편)은
//   원래 표제가 없는 편이라 걸리지 않아야 정상입니다.
//
// 가르는 방법 두 가지
//   1) 히브리어 절번호 표시가 있으면 그 앞까지가 표제입니다.
//      "Untuk pemimpin biduan. ... Mazmur Daud. (4-2) Apabila aku berseru, ..."
//      표시 앞이 마침표로 끝나는 것만 경계로 봅니다. 표제가 두 절에 걸친 편
//      (시편 51·52·54·60편)은 첫 표시 앞이 쉼표라 지나가고 다음 표시에서 갈립니다.
//      시편 18:1 한 곳만 표시가 "(18:2)" 처럼 콜론이라 두 형태를 모두 봅니다.
//   2) 표시가 없으면 머리단어로 시작하는 문장을 차례로 떼어냅니다.
//      "Dari Daud. Nyanyian pengajaran. Berbahagialah ..." → 앞 두 문장이 표제
//
// 하박국 3:1은 절 전체가 표제라 본문이 빈 문자열이 됩니다.
// 읽기 화면은 이때 절 문단을 그리지 않고 표제 줄만 보여줍니다.

// 표제의 둘째 문장 이후에만 나타나는 머리단어입니다.
// VERSE_INTRO_HEADS 는 절 하나를 문장처럼 보여줘도 되는지 가리는 데에도 쓰이므로
// (peribahasa.ts) 건드리지 않고 여기에 따로 둡니다.
const INTRO_CONT_HEADS = [
  "Dengan permainan",
  "Dengan lagu",
  "Menurut:",
  "Kesaksian",
  "Dari bani Korah",
  "Dari hamba TUHAN",
  "Untuk Yedutun",
];

const HEBREW_MARK_G = new RegExp("\\((\\d+)[-:](\\d+)\\)", "g");
const INTRO_SENTENCE = new RegExp("^([\\s\\S]{1,260}?[.])\\s+([\\s\\S]+)$");
const CLOSING_QUOTES = "\"\u201d\u2019\u00bb";

function continuesIntro(text: string): boolean {
  if (startsWithIntroHead(text)) return true;
  return INTRO_CONT_HEADS.some((h) => text.startsWith(h));
}

// 표제의 경계로 쓸 수 있는 자리인지 — 닫는 따옴표를 걷어낸 뒤 마침표로 끝나는가
function endsSentence(text: string): boolean {
  let s = text.trim();
  while (s.length > 0 && CLOSING_QUOTES.indexOf(s.charAt(s.length - 1)) >= 0) {
    s = s.slice(0, s.length - 1).trim();
  }
  return s.endsWith(".");
}

// ── 히브리어 절번호 표시 제거 ────────────────────────────────
// TB 인쇄본은 히브리어 원문과 절번호가 어긋나는 곳에 "(51-4)" 같은 대조 표시를 답니다.
// 원문 대조용 군더더기라 읽는 화면에서는 걷어냅니다.
// 66권 전수 점검(2026-09) — 16권 1,327곳입니다. 시편이 990곳으로 가장 많고
// 욥기 91 · 호세아 48 · 출애굽기 30 · 다니엘 29 · 학개 23 · 사무엘상 24 ·
// 이사야 22 · 전도서 20 · 느헤미야 19 · 미가 15 · 열왕기상 11 순입니다.
// 시편 18:1 한 곳만 "(18:2)" 처럼 콜론이라 두 형태를 모두 봅니다.
//
// 순서가 중요합니다. repairVerses 가 끊어진 절을 이어붙일 때 "(5-" 라는 반쪽 표시를
// 단서로 쓰므로, 표시 제거는 반드시 이어붙이기와 표제 분리가 끝난 뒤에 합니다.

function stripHebrewMarks(verses: BibleVerse[]): BibleVerse[] {
  return verses.map((v) => {
    const text = v.text.replace(HEBREW_MARK_G, " ").replace(new RegExp("\\s{2,}", "g"), " ").trim();
    if (v.intro === undefined) return { verse: v.verse, text };
    const intro = v.intro.replace(HEBREW_MARK_G, " ").replace(new RegExp("\\s{2,}", "g"), " ").trim();
    return { verse: v.verse, text, intro };
  });
}

function splitSuperscription(verses: BibleVerse[], chapter: number): BibleVerse[] {
  if (verses.length === 0 || verses[0].verse !== 1) return verses;
  const t = verses[0].text.trim();
  if (!startsWithIntroHead(t)) return verses;

  let intro = "";
  let body = "";

  // 1) 히브리어 절번호 표시를 경계로
  HEBREW_MARK_G.lastIndex = 0;
  let m = HEBREW_MARK_G.exec(t);
  while (m) {
    if (parseInt(m[1], 10) === chapter) {
      const before = t.slice(0, m.index).trim();
      if (endsSentence(before)) {
        intro = before;
        body = t.slice(m.index + m[0].length).trim();
        break;
      }
    }
    m = HEBREW_MARK_G.exec(t);
  }
  HEBREW_MARK_G.lastIndex = 0;

  // 2) 표시가 없으면 머리단어로 시작하는 문장을 차례로 떼어낸다
  if (!intro) {
    let rest = t;
    for (let i = 0; i < 8; i += 1) {
      if (!continuesIntro(rest)) break;
      const s = rest.match(INTRO_SENTENCE);
      if (!s) {
        // 남은 것이 짧은 머리말 한 문장뿐이면 (하박국 3:1) 통째로 표제로 본다
        if (intro && rest.length <= 60) {
          intro = (intro + " " + rest).trim();
          rest = "";
        }
        break;
      }
      intro = (intro + " " + s[1]).trim();
      rest = s[2].trim();
    }
    if (!intro) return verses;
    body = rest;
  }

  const out = verses.slice();
  out[0] = { verse: 1, text: body, intro };
  return out;
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

  // 같은 절번호가 두 번 오면 화면 key가 겹쳐 문단이 쌓이므로 첫 것만 남깁니다
  const seenVerse = new Set<number>();
  const verses: BibleVerse[] = data
    .filter((v: any) => v && typeof v.verse === "number" && typeof v.text === "string")
    .map((v: any) => ({ verse: v.verse, text: stripHtml(v.text) }))
    .filter((v: BibleVerse) => {
      if (seenVerse.has(v.verse)) return false;
      seenVerse.add(v.verse);
      return true;
    })
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
