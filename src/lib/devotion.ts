// src/lib/devotion.ts
// 인도네시아어 말씀 묵상 생성 (Claude API).
// TB 본문 전체를 프롬프트에 넣어주므로 모델이 기억에 의존하지 않고 실제 본문으로 씁니다.
// 성경 텍스트 자체는 화면에서 fetch한 TB 원문을 표시하며, 모델은 구절 "번호"만 고릅니다.

import { callClaudeJSON } from "@/lib/claude";
import { BibleBook, BibleVerse } from "@/lib/bible";

export interface DevotionOverview {
  summary: string;  // 이 장의 요지
  flow: string;     // 책 전체 흐름 속 이 장의 위치
  emphasis: string; // 이 장이 책 전체 주제에 더하는 강조점
}

export interface DevotionBookIntro {
  author: string;    // 저자와 시대
  purpose: string;   // 기록 목적
  structure: string; // 전체 구조
  key: string;       // 읽을 때 붙잡을 것
}

export interface DevotionContent {
  title: string;    // 인도네시아어 제목
  titleKo: string;  // 한국어 제목
  nasStart: number; // 묵상 중심 구절 시작
  nasEnd: number;   // 묵상 중심 구절 끝
  body: string;     // 인니어 묵상 (문단은 \n\n)
  bodyKo: string;   // 한국어 번역
  doa: string;      // 인니어 기도 한 문장
  doaKo: string;    // 기도 번역
  overview: DevotionOverview;
  bookIntro: DevotionBookIntro | null; // 1장일 때만
}

const SYSTEM_PROMPT =
  "당신은 인도네시아어-한국어 이중언어로 성경 묵상을 쓰는 작가입니다. " +
  "Our Daily Bread(Santapan Rohani)처럼 따뜻하고 쉬운 문체로, 그러나 본문에 충실한 깊이 있는 묵상을 씁니다.\n\n" +
  "[신학 원칙 — 반드시 지킬 것]\n" +
  "1. 성경은 하나님의 영감으로 기록된 무오한 말씀입니다. 정통 복음주의 신앙(삼위일체, 그리스도의 신성, 십자가 대속, 부활, 이신칭의)을 전제합니다.\n" +
  "2. 절대 포함 금지: 번영신학, 보편구원론, 성경을 신화나 상징으로 격하하는 자유주의적 해석, 이단적 가르침, 교파 간 논쟁 주제, 정치적 주장.\n" +
  "3. 본문이 말하지 않는 것을 말하지 않습니다. 문맥과 저자의 의도에 충실하고, 억지 알레고리와 비약을 금합니다.\n" +
  "4. 적용은 도덕주의적 훈계의 나열이 아니라 복음에 뿌리를 둡니다. 하나님이 행하신 일에서 출발해 믿음과 감사의 반응으로 이끕니다.\n" +
  "5. 구약은 구속사의 흐름 안에서 그리스도를 바라보되, 부자연스러운 연결은 피합니다.\n" +
  "6. 족보·규례·명단 같은 본문도 회피하지 말고, 그것이 성경 전체 이야기에서 왜 중요한지 묵상합니다.\n\n" +
  "[문체]\n" +
  "- 인도네시아어: Santapan Rohani 수준의 쉬운 일상어. 신학 전문용어 최소화.\n" +
  "- 예화: 인도네시아와 한국을 포함한 어느 나라의 일상, 역사, 문화, 인물, 자연 등에서 자유롭게 가져옵니다. 자극적·정치적 소재는 금지.\n" +
  "- 한국어: 자연스럽고 따뜻한 경어체.\n\n" +
  "출력은 반드시 유효한 JSON 객체 하나만 냅니다. 마크다운 코드펜스나 다른 텍스트를 붙이지 않습니다.";

// 한 장의 묵상 생성
export async function generateDevotion(
  book: BibleBook,
  chapter: number,
  verses: BibleVerse[]
): Promise<DevotionContent> {
  const isFirst = chapter === 1;
  const versesText = verses.map((v) => v.verse + ". " + v.text).join("\n");

  const user =
    "[오늘의 본문] " + book.ko + " " + chapter + "장 — " + book.idName + " " + chapter +
    " (전체 " + book.chapters + "장 중 " + chapter + "번째 장)\n" +
    (isFirst
      ? "이 책의 첫 장입니다. bookIntro를 반드시 채우세요.\n"
      : "bookIntro는 null로 출력하세요.\n") +
    "\n[TB 본문]\n" + versesText + "\n\n" +
    "[작성 지침]\n" +
    "1. nasStart / nasEnd: 이 장에서 묵상의 중심이 될 연속 구절 범위 (대략 3~8절)\n" +
    "2. title / titleKo: 묵상 제목 (인도네시아어 / 한국어)\n" +
    "3. body: 인도네시아어 묵상 150~180 단어, 세 문단으로.\n" +
    "   ① 일상·역사·문화 등에서 가져온 짧은 예화 3~4문장\n" +
    "   ② 선택한 구절이 말하는 것 5~6문장 (묵상의 중심)\n" +
    "   ③ 오늘의 적용 2~3문장\n" +
    "   문단 구분은 빈 줄(\\n\\n).\n" +
    "4. bodyKo: body 전체의 자연스러운 한국어 번역 (문단 구조 동일)\n" +
    "5. doa / doaKo: 한 문장 기도 (인도네시아어 / 한국어)\n" +
    "6. overview (모두 한국어, 각 2~3문장):\n" +
    "   - summary: 이 장 전체의 요지\n" +
    "   - flow: " + book.ko + " 전체 흐름 속에서 이 장이 어디에 있는지 (몇 장~몇 장 묶음 중 어디, 앞뒤 장과의 연결)\n" +
    "   - emphasis: 이 장이 " + book.ko + " 전체 주제에 더하는 강조점\n" +
    (isFirst
      ? "7. bookIntro (모두 한국어, 각 1~2문장): author(저자와 시대), purpose(기록 목적), structure(전체 구조), key(이 책을 읽을 때 붙잡을 것)\n"
      : "") +
    "\n[출력 형식 — 유효한 JSON 하나만]\n" +
    '{"title":"...","titleKo":"...","nasStart":1,"nasEnd":5,"body":"...","bodyKo":"...","doa":"...","doaKo":"...",' +
    '"overview":{"summary":"...","flow":"...","emphasis":"..."},"bookIntro":' +
    (isFirst ? '{"author":"...","purpose":"...","structure":"...","key":"..."}' : "null") +
    "}";

  const parsed = await callClaudeJSON(SYSTEM_PROMPT, user);

  // 구절 범위 정규화: 숫자화 → 순서 보정 → 실제 장 범위로 클램프
  const maxVerse = verses.length ? verses[verses.length - 1].verse : 1;
  let ns = Math.round(Number(parsed.nasStart)) || 1;
  let ne = Math.round(Number(parsed.nasEnd)) || ns;
  if (ns > ne) {
    const t = ns; ns = ne; ne = t;
  }
  ns = Math.min(Math.max(1, ns), maxVerse);
  ne = Math.min(Math.max(ns, ne), maxVerse);

  const ov: any = parsed.overview || {};
  const bi: any = parsed.bookIntro;

  const content: DevotionContent = {
    title: (parsed.title || "").toString().trim(),
    titleKo: (parsed.titleKo || "").toString().trim(),
    nasStart: ns,
    nasEnd: ne,
    body: (parsed.body || "").toString().trim(),
    bodyKo: (parsed.bodyKo || "").toString().trim(),
    doa: (parsed.doa || "").toString().trim(),
    doaKo: (parsed.doaKo || "").toString().trim(),
    overview: {
      summary: (ov.summary || "").toString().trim(),
      flow: (ov.flow || "").toString().trim(),
      emphasis: (ov.emphasis || "").toString().trim(),
    },
    bookIntro:
      isFirst && bi && typeof bi === "object"
        ? {
            author: (bi.author || "").toString().trim(),
            purpose: (bi.purpose || "").toString().trim(),
            structure: (bi.structure || "").toString().trim(),
            key: (bi.key || "").toString().trim(),
          }
        : null,
  };

  if (!content.title || !content.body || !content.bodyKo) throw new Error("PARSE_FAILED");
  return content;
}
