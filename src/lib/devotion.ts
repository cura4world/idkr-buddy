// src/lib/devotion.ts
// 두란노 생명의삶 QT(today.json)를 기반으로 인도네시아어 묵상 도우미를 생성합니다 (Claude API).
// 성경 본문 자체는 이미 today.json(개역개정/우리말성경)과 bible.ts(TB)에서 오므로,
// 여기서는 "묵상 도우미 글 + 기도 + 배경 설명"만 생성합니다.

import { callClaudeJSON } from "@/lib/claude";
import { QtToday } from "@/lib/qtToday";
import { BibleBook } from "@/lib/bible";

export interface DevotionContent {
  title: string; // 인니어 제목 (두란노 제목을 자연스럽게 번역)
  titleKo: string; // 원본 두란노 제목 (그대로, 모델이 건드리지 않음)
  helper: string; // 인니어 묵상 도우미 — 흐르는 글, 문단은 \n\n
  helperKo: string; // helper의 한국어 번역
  doa: string; // 기도 한 문장 (인니어)
  doaKo: string; // 기도 번역
  noteTitle: string; // "Menyelami {idName} {장}" — 코드에서 조립
  noteTitleKo: string; // "{책} {장}장 들여다보기" — 코드에서 조립
  note: string; // 배경 설명 (인니어)
  noteKo: string; // 배경 설명 (한국어)
}

const SYSTEM_PROMPT =
  "당신은 인도네시아어-한국어 이중언어로 성경 QT 묵상 도우미 글을 쓰는 작가입니다. " +
  "Our Daily Bread(Santapan Rohani)처럼 따뜻하게 이야기하듯 흐르는 글을 쓰며, 소제목 없이 문단으로만 구성합니다.\n\n" +
  "[신학 원칙 — 반드시 지킬 것]\n" +
  "1. 성경은 하나님의 영감으로 기록된 무오한 말씀입니다. 정통 복음주의 신앙(삼위일체, 그리스도의 신성, 십자가 대속, 부활, 이신칭의)을 전제합니다.\n" +
  "2. 절대 포함 금지: 번영신학, 보편구원론, 성경을 신화나 상징으로 격하하는 자유주의적 해석, 이단적 가르침, 교파 간 논쟁 주제, 정치적 주장.\n" +
  "3. 본문이 말하지 않는 것을 말하지 않습니다. 문맥과 저자의 의도에 충실하고, 억지 알레고리와 비약을 금합니다.\n" +
  "4. 적용은 도덕주의적 훈계의 나열이 아니라 복음에 뿌리를 둡니다. 하나님이 행하신 일에서 출발해 믿음과 감사의 반응으로 이끕니다.\n" +
  "5. 구약은 구속사의 흐름 안에서 그리스도를 바라보되, 부자연스러운 연결은 피합니다.\n" +
  "6. 족보·규례·명단 같은 본문도 회피하지 말고, 그것이 성경 전체 이야기에서 왜 중요한지 다룹니다.\n\n" +
  "[문체]\n" +
  "- 인도네시아어: Santapan Rohani 수준의 쉬운 일상어. 신학 전문용어 최소화. 소제목 없이 하나의 흐르는 글.\n" +
  "- 예화: 인도네시아와 한국을 포함한 어느 나라의 일상, 역사, 문화, 인물, 자연 등에서 자유롭게 가져옵니다. 자극적·정치적 소재는 금지.\n" +
  "- 한국어: 자연스럽고 따뜻한 경어체.\n\n" +
  "출력은 반드시 유효한 JSON 객체 하나만 냅니다. 마크다운 코드펜스나 다른 텍스트를 붙이지 않습니다.";

function versesText(qt: QtToday): string {
  return qt.verses.map((v) => v.n + ". " + v.t).join("\n");
}

export async function generateQtDevotion(qt: QtToday, book: BibleBook | undefined): Promise<DevotionContent> {
  const bookKo = book ? book.ko : qt.book;
  const bookId = book ? book.idName : qt.book;
  const chapterLabel = qt.crossChapter ? qt.chapter + "~" + qt.endChapter : String(qt.chapter);

  const user =
    "[오늘의 QT] " + qt.date + " · " + qt.rangeText + "\n" +
    "[QT 제목(한국어, 두란노 원제)] " + qt.title + "\n\n" +
    "[개역개정 본문]\n" + versesText(qt) + "\n\n" +
    "[작성 지침]\n" +
    "1. title: 위 QT 제목을 인도네시아어로 자연스럽게 번역하세요. 직역이 아니라 묵상 제목답게, 원제의 의미를 살려 다시 쓰세요.\n" +
    "2. helper: 인도네시아어 묵상 도우미 글. 130~180 단어, 소제목 없이 세 문단(빈 줄 \\n\\n으로 구분)으로 흐르듯 씁니다.\n" +
    "   ① 본문의 배경이나 장면을 그림 그리듯 묘사 (2~3문장)\n" +
    "   ② 본문이 실제로 말하는 핵심 내용 (3~4문장)\n" +
    "   ③ 오늘 우리 삶에 닿는 적용 — 질문이나 초대의 톤으로 (2~3문장)\n" +
    "   대화하듯 따뜻하게, 소제목이나 번호 매기기 없이 하나의 글로 씁니다.\n" +
    "3. helperKo: helper 전체의 자연스러운 한국어 번역 (문단 구조 동일)\n" +
    "4. doa / doaKo: 오늘 본문에서 우러나오는 한 문장 기도 (인도네시아어 / 한국어)\n" +
    "5. note / noteKo: '" + bookKo + " " + chapterLabel + "장 들여다보기' 성격의 배경 설명. 저자, 시대, 이 책에서 이 본문이 있는 위치, 왜 중요한지를 2~4문장으로 (인도네시아어 / 한국어)\n\n" +
    "[출력 형식 — 유효한 JSON 하나만]\n" +
    '{"title":"...","helper":"...","helperKo":"...","doa":"...","doaKo":"...","note":"...","noteKo":"..."}';

  const parsed = await callClaudeJSON(SYSTEM_PROMPT, user);

  const content: DevotionContent = {
    title: (parsed.title || "").toString().trim(),
    titleKo: qt.title,
    helper: (parsed.helper || "").toString().trim(),
    helperKo: (parsed.helperKo || "").toString().trim(),
    doa: (parsed.doa || "").toString().trim(),
    doaKo: (parsed.doaKo || "").toString().trim(),
    noteTitle: "Menyelami " + bookId + " " + chapterLabel,
    noteTitleKo: bookKo + " " + chapterLabel + "장 들여다보기",
    note: (parsed.note || "").toString().trim(),
    noteKo: (parsed.noteKo || "").toString().trim(),
  };

  if (!content.title || !content.helper || !content.helperKo) throw new Error("PARSE_FAILED");
  return content;
}
