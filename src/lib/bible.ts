// src/lib/bible.ts
// 인도네시아어 성경(TB, Terjemahan Baru) 본문을 GitHub 정적 JSON에서 불러옵니다.
// 소스: tobiasagyasta/alkitab-api (raw.githubusercontent.com은 CORS 허용, 서버 불필요)
// 본문은 저장하지 않고 필요할 때마다 불러오며, 앱 실행 중에만 메모리에 캐시합니다.

export interface BibleBook {
  id: string;        // JSON 파일명 (확장자 제외)
  folder: "pl" | "pb"; // 구약(pl) / 신약(pb)
  ko: string;        // 한국어 책 이름
  idName: string;    // 인도네시아어 책 이름 (표시용)
  chapters: number;  // 전체 장수
}

export interface BibleVerse {
  verse: number;
  text: string;
}

// 66권 정경 순서. chapters는 실제 데이터에서 실측한 값.
export const BIBLE_BOOKS: BibleBook[] = [
  // 구약 39권
  { id: "kejadian", folder: "pl", ko: "창세기", idName: "Kejadian", chapters: 50 },
  { id: "keluaran", folder: "pl", ko: "출애굽기", idName: "Keluaran", chapters: 40 },
  { id: "imamat", folder: "pl", ko: "레위기", idName: "Imamat", chapters: 27 },
  { id: "bilangan", folder: "pl", ko: "민수기", idName: "Bilangan", chapters: 36 },
  { id: "ulangan", folder: "pl", ko: "신명기", idName: "Ulangan", chapters: 34 },
  { id: "yosua", folder: "pl", ko: "여호수아", idName: "Yosua", chapters: 24 },
  { id: "hakim_hakim", folder: "pl", ko: "사사기", idName: "Hakim-hakim", chapters: 21 },
  { id: "rut", folder: "pl", ko: "룻기", idName: "Rut", chapters: 4 },
  { id: "1_samuel", folder: "pl", ko: "사무엘상", idName: "1 Samuel", chapters: 31 },
  { id: "2_samuel", folder: "pl", ko: "사무엘하", idName: "2 Samuel", chapters: 24 },
  { id: "1_raja_raja", folder: "pl", ko: "열왕기상", idName: "1 Raja-raja", chapters: 22 },
  { id: "2_raja_raja", folder: "pl", ko: "열왕기하", idName: "2 Raja-raja", chapters: 25 },
  { id: "1_tawarikh", folder: "pl", ko: "역대상", idName: "1 Tawarikh", chapters: 29 },
  { id: "2_tawarikh", folder: "pl", ko: "역대하", idName: "2 Tawarikh", chapters: 36 },
  { id: "ezra", folder: "pl", ko: "에스라", idName: "Ezra", chapters: 10 },
  { id: "nehemia", folder: "pl", ko: "느헤미야", idName: "Nehemia", chapters: 13 },
  { id: "ester", folder: "pl", ko: "에스더", idName: "Ester", chapters: 10 },
  { id: "ayub", folder: "pl", ko: "욥기", idName: "Ayub", chapters: 42 },
  { id: "mazmur", folder: "pl", ko: "시편", idName: "Mazmur", chapters: 150 },
  { id: "amsal", folder: "pl", ko: "잠언", idName: "Amsal", chapters: 31 },
  { id: "pengkotbah", folder: "pl", ko: "전도서", idName: "Pengkhotbah", chapters: 12 },
  { id: "kidung_agung", folder: "pl", ko: "아가", idName: "Kidung Agung", chapters: 8 },
  { id: "yesaya", folder: "pl", ko: "이사야", idName: "Yesaya", chapters: 66 },
  { id: "yeremia", folder: "pl", ko: "예레미야", idName: "Yeremia", chapters: 52 },
  { id: "ratapan", folder: "pl", ko: "예레미야애가", idName: "Ratapan", chapters: 5 },
  { id: "yehezkiel", folder: "pl", ko: "에스겔", idName: "Yehezkiel", chapters: 48 },
  { id: "daniel", folder: "pl", ko: "다니엘", idName: "Daniel", chapters: 12 },
  { id: "hosea", folder: "pl", ko: "호세아", idName: "Hosea", chapters: 14 },
  { id: "yoel", folder: "pl", ko: "요엘", idName: "Yoel", chapters: 3 },
  { id: "amos", folder: "pl", ko: "아모스", idName: "Amos", chapters: 9 },
  { id: "obaja", folder: "pl", ko: "오바댜", idName: "Obaja", chapters: 1 },
  { id: "yunus", folder: "pl", ko: "요나", idName: "Yunus", chapters: 4 },
  { id: "mikha", folder: "pl", ko: "미가", idName: "Mikha", chapters: 7 },
  { id: "nahum", folder: "pl", ko: "나훔", idName: "Nahum", chapters: 3 },
  { id: "habakuk", folder: "pl", ko: "하박국", idName: "Habakuk", chapters: 3 },
  { id: "zefanya", folder: "pl", ko: "스바냐", idName: "Zefanya", chapters: 3 },
  { id: "hagai", folder: "pl", ko: "학개", idName: "Hagai", chapters: 2 },
  { id: "zakaria", folder: "pl", ko: "스가랴", idName: "Zakharia", chapters: 14 },
  { id: "maleakhi", folder: "pl", ko: "말라기", idName: "Maleakhi", chapters: 4 },
  // 신약 27권
  { id: "matius", folder: "pb", ko: "마태복음", idName: "Matius", chapters: 28 },
  { id: "markus", folder: "pb", ko: "마가복음", idName: "Markus", chapters: 16 },
  { id: "lukas", folder: "pb", ko: "누가복음", idName: "Lukas", chapters: 24 },
  { id: "yohanes", folder: "pb", ko: "요한복음", idName: "Yohanes", chapters: 21 },
  { id: "kisah_para_rasul", folder: "pb", ko: "사도행전", idName: "Kisah Para Rasul", chapters: 28 },
  { id: "roma", folder: "pb", ko: "로마서", idName: "Roma", chapters: 16 },
  { id: "1_korintus", folder: "pb", ko: "고린도전서", idName: "1 Korintus", chapters: 16 },
  { id: "2_korintus", folder: "pb", ko: "고린도후서", idName: "2 Korintus", chapters: 13 },
  { id: "galatia", folder: "pb", ko: "갈라디아서", idName: "Galatia", chapters: 6 },
  { id: "efesus", folder: "pb", ko: "에베소서", idName: "Efesus", chapters: 6 },
  { id: "filipi", folder: "pb", ko: "빌립보서", idName: "Filipi", chapters: 4 },
  { id: "kolose", folder: "pb", ko: "골로새서", idName: "Kolose", chapters: 4 },
  { id: "1_tesalonika", folder: "pb", ko: "데살로니가전서", idName: "1 Tesalonika", chapters: 5 },
  { id: "2_tesalonika", folder: "pb", ko: "데살로니가후서", idName: "2 Tesalonika", chapters: 3 },
  { id: "1_timotius", folder: "pb", ko: "디모데전서", idName: "1 Timotius", chapters: 6 },
  { id: "2_timotius", folder: "pb", ko: "디모데후서", idName: "2 Timotius", chapters: 4 },
  { id: "titus", folder: "pb", ko: "디도서", idName: "Titus", chapters: 3 },
  { id: "filemon", folder: "pb", ko: "빌레몬서", idName: "Filemon", chapters: 1 },
  { id: "ibrani", folder: "pb", ko: "히브리서", idName: "Ibrani", chapters: 13 },
  { id: "yakobus", folder: "pb", ko: "야고보서", idName: "Yakobus", chapters: 5 },
  { id: "1_petrus", folder: "pb", ko: "베드로전서", idName: "1 Petrus", chapters: 5 },
  { id: "2_petrus", folder: "pb", ko: "베드로후서", idName: "2 Petrus", chapters: 3 },
  { id: "1_yohanes", folder: "pb", ko: "요한일서", idName: "1 Yohanes", chapters: 5 },
  { id: "2_yohanes", folder: "pb", ko: "요한이서", idName: "2 Yohanes", chapters: 1 },
  { id: "3_yohanes", folder: "pb", ko: "요한삼서", idName: "3 Yohanes", chapters: 1 },
  { id: "yudas", folder: "pb", ko: "유다서", idName: "Yudas", chapters: 1 },
  { id: "wahyu", folder: "pb", ko: "요한계시록", idName: "Wahyu", chapters: 22 },
];

export function getBook(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id);
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
    .sort((a, b) => a.verse - b.verse);
}
