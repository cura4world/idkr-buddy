// src/lib/news.ts
// 인도네시아 뉴스: Gemini + Google 검색 그라운딩으로 "실제 오늘 뉴스"를 확인한 뒤
// 학습용 인도네시아어 기사로 다시 써서 신문(에디션)을 만듭니다.
// 하루 1회만 호출되며(같은 날짜는 IndexedDB 캐시 사용) 기존 API 키를 재사용합니다.

import { getGeminiApiKey } from "@/lib/gemini";

// 검색 그라운딩(google_search 도구)은 상위 flash 모델이 필요합니다.
// lite 모델은 그라운딩을 지원하지 않아 사용하지 않습니다.
const NEWS_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];

export interface NewsArticle {
  category: string; // 한국어 카테고리 (핫뉴스/정치/경제/사회/문화/스포츠 등)
  title: string;    // 인도네시아어 제목
  titleKo: string;  // 제목 한국어
  lead: string;     // 인도네시아어 리드 한 문장
  body: string;     // 인도네시아어 본문 (문단은 \n\n)
  korean: string;   // 본문 전체 한국어 번역
}

export interface NewsEdition {
  date: string;      // YYYY-MM-DD (로컬 기준, IndexedDB 키)
  dateLabel: string; // 인도네시아어 날짜 표기 (예: Jumat, 17 Juli 2026)
  articles: NewsArticle[];
  createdAt: number;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// 오늘 날짜 키 (로컬 시간 기준 YYYY-MM-DD)
export function todayKey(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// 인도네시아어 날짜 표기 (신문 마스트헤드용)
export function indoDateLabel(d: Date = new Date()): string {
  return HARI[d.getDay()] + ", " + d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
}

// Google 검색 그라운딩을 켠 상태로 Gemini 호출.
// 주의: 검색 도구와 responseMimeType(JSON 모드)은 함께 쓸 수 없어
// 프롬프트로 "순수 JSON만" 요구하고 응답에서 JSON을 추출합니다.
async function callGeminiWithSearch(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  let lastError: Error = new Error("REQUEST_FAILED");

  for (const model of NEWS_MODELS) {
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.6 },
        }),
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("INVALID_API_KEY");
        if (res.status === 429) {
          lastError = new Error("RATE_LIMIT");
          continue; // 다음 모델 시도
        }
        // 400(모델/필드 미지원 등)은 다음 모델로 폴백
        lastError = new Error("REQUEST_FAILED_" + res.status);
        continue;
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const text: string = Array.isArray(parts)
        ? parts.map((p: any) => p?.text || "").join("")
        : "";
      if (!text) {
        lastError = new Error("EMPTY_RESPONSE");
        continue;
      }
      return text;
    } catch (e: any) {
      if (e?.message === "INVALID_API_KEY") throw e;
      lastError = e instanceof Error ? e : new Error("REQUEST_FAILED");
    }
  }
  throw lastError;
}

// 응답 텍스트에서 JSON 객체 추출 (코드펜스/앞뒤 설명이 섞여도 안전)
function extractJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("PARSE_FAILED");
    return JSON.parse(text.slice(start, end + 1));
  }
}

// 오늘의 신문 생성 (기사 6개: 핫뉴스 2 + 분야별 4)
// 호출 전 반드시 IndexedDB에 오늘 에디션이 없는지 확인할 것 (하루 1회 과금 원칙)
export async function generateDailyNews(): Promise<NewsEdition> {
  const now = new Date();
  const dateKr =
    now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일";

  const prompt =
    "당신은 한국인 인도네시아어 학습자를 위한 뉴스 편집자입니다.\n" +
    "Google 검색을 사용해 오늘(" + dateKr + ") 인도네시아의 실제 뉴스를 확인한 뒤,\n" +
    "학습용 신문 기사 6개를 만들어 JSON으로만 출력하세요.\n\n" +
    "기사 구성:\n" +
    '- 1~2번 기사: 지금 인도네시아에서 가장 화제가 되는 핫뉴스 (category는 "핫뉴스")\n' +
    "- 3~6번 기사: 정치, 경제, 사회, 문화, 스포츠, 과학기술 중 서로 다른 분야를 골고루 (category는 해당 분야명)\n\n" +
    "작성 규칙:\n" +
    "- 반드시 검색으로 확인한 실제 오늘/최근 뉴스만 다루세요. 검색으로 확인되지 않는 내용은 쓰지 마세요.\n" +
    "- 뉴스 원문을 그대로 옮기지 말고, 사실 관계는 유지하면서 중급 학습자가 읽기 좋은 인도네시아어로 완전히 새로 쓰세요.\n" +
    "- 본문은 인도네시아어 100~140단어, 문단 2~3개 (문단 구분은 빈 줄 두 개).\n" +
    "- 독자는 인도네시아가 실제로 어떻게 돌아가는지 알고 싶어합니다. 사건 전달에 그치지 말고 배경과 맥락(왜 중요한지, 어떤 흐름 속에 있는지)을 한두 문장 포함하세요.\n\n" +
    "출력 형식 (마크다운·설명 없이 순수 JSON 객체 하나만):\n" +
    "{\n" +
    '  "articles": [\n' +
    "    {\n" +
    '      "category": "핫뉴스",\n' +
    '      "title": "인도네시아어 제목",\n' +
    '      "titleKo": "제목의 한국어 번역",\n' +
    '      "lead": "기사 핵심을 요약한 인도네시아어 리드 한 문장",\n' +
    '      "body": "인도네시아어 본문. 문단 구분은 빈 줄 두 개",\n' +
    '      "korean": "본문 전체의 자연스러운 한국어 번역. 문단 구분 동일"\n' +
    "    }\n" +
    "  ]\n" +
    "}\n";

  const text = await callGeminiWithSearch(prompt);
  const parsed = extractJSON(text);

  const articles: NewsArticle[] = (Array.isArray(parsed.articles) ? parsed.articles : [])
    .map((a: any) => ({
      category: (a?.category || "").toString().trim() || "뉴스",
      title: (a?.title || "").toString().trim(),
      titleKo: (a?.titleKo || "").toString().trim(),
      lead: (a?.lead || "").toString().trim(),
      body: (a?.body || "").toString().trim(),
      korean: (a?.korean || "").toString().trim(),
    }))
    .filter((a: NewsArticle) => a.title && a.body);

  if (articles.length < 3) throw new Error("PARSE_FAILED");

  return {
    date: todayKey(),
    dateLabel: indoDateLabel(now),
    articles,
    createdAt: Date.now(),
  };
}
