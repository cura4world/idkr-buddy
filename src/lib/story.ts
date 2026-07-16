// src/lib/story.ts
// 인도네시아 이야기 카드: 9개 카테고리 중 랜덤 주제로 학습용 짧은 글을 생성합니다.
// 기존 Gemini API 키(localStorage "geminiApiKey")를 재사용합니다.

import { getGeminiApiKey } from "@/lib/gemini";

const TEXT_MODEL = "gemini-flash-lite-latest";

export const STORY_CATEGORIES = [
  "인도네시아 동화",
  "인도네시아 문화",
  "인도네시아 역사",
  "인도네시아 생활",
  "인도네시아 여행",
  "인도네시아 종교",
  "인도네시아 인물",
  "인도네시아 장소",
];

export type StoryDifficulty = "하" | "중" | "상";

// 예전 이야기 호환용 (지금은 배경 설명을 사용)
export interface StoryHardWord {
  word: string;
  meaning: string;
}

export interface StoryBackground {
  heading: string; // 소제목
  body: string;    // 설명 (한국어)
}

export interface StoryData {
  title: string;      // 인도네시아어 제목
  titleKo: string;    // 제목 한국어
  category: string;   // 카테고리 (랜덤 선택됨)
  difficulty: StoryDifficulty;
  indonesian: string; // 본문 (문단은 \n\n)
  korean: string;     // 전체 번역
  background?: StoryBackground[]; // 글의 배경·도움말 (뒷면)
  hardWords?: StoryHardWord[];    // 예전 이야기 호환용
}

const DIFF_INFO: Record<StoryDifficulty, { desc: string; length: string }> = {
  하: { desc: "아주 기초적인 어휘와 짧은 단문 위주", length: "인도네시아어 80~110단어" },
  중: { desc: "중급 어휘와 보통 길이의 문장", length: "인도네시아어 110~150단어" },
  상: { desc: "고급 어휘와 관용 표현, 복문 포함", length: "인도네시아어 150~190단어" },
};

async function callGeminiJSON(prompt: string, temperature = 0.8): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TEXT_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("EMPTY_RESPONSE");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    return JSON.parse(match[0]);
  }
}

// 랜덤 카테고리로 이야기 1개 생성. recentTitles로 최근 주제와 중복 방지.
export async function generateStory(
  difficulty: StoryDifficulty,
  recentTitles: string[] = []
): Promise<StoryData> {
  const category = STORY_CATEGORIES[Math.floor(Math.random() * STORY_CATEGORIES.length)];
  const info = DIFF_INFO[difficulty] || DIFF_INFO["중"];

  const prompt =
    "당신은 한국인 인도네시아어 학습자를 위한 읽기 자료 작가입니다.\n" +
    "아래 조건으로 짧은 인도네시아어 글을 써서 JSON으로만 출력하세요.\n\n" +
    '카테고리: "' + category + '"\n' +
    "난이도: " + difficulty + " (" + info.desc + ")\n" +
    "분량: " + info.length + " (폰 화면 하나에 들어갈 하루 학습 분량)\n\n" +
    "출력 형식:\n" +
    "{\n" +
    '  "title": "인도네시아어 제목",\n' +
    '  "titleKo": "제목의 한국어 번역",\n' +
    '  "indonesian": "본문. 문단 구분은 빈 줄 두 개",\n' +
    '  "korean": "본문 전체의 자연스러운 한국어 번역. 문단 구분 동일",\n' +
    '  "background": [{"heading": "소제목", "body": "한국어 설명"}]\n' +
    "}\n\n" +
    "주의:\n" +
    "- 역사/인물/장소/문화/상식 등 사실 기반 카테고리는 정확한 사실로, 동화는 흥미로운 창작으로.\n" +
    "- 최근 다룬 주제와 겹치지 않는 새로운 주제로 쓰세요. 최근 제목: " +
    (recentTitles.length ? recentTitles.join(", ") : "없음") + "\n\n" +
    "[background — 글을 더 깊이 이해하게 돕는 배경 설명]\n" +
    "- 항목 2~3개. 각 항목은 heading(6자 내외 소제목) + body(한국어 2~3문장).\n" +
    "- 본문에 이미 쓴 내용을 다시 요약하지 마세요. 본문이 말하지 않은 것을 더해야 합니다.\n" +
    "- 예: 이 소재의 역사적·지리적 배경, 인도네시아 사람들에게 갖는 의미, 한국과 비교되는 문화 차이,\n" +
    "  본문에 나온 고유명사나 관습에 대한 보충 지식, 알아두면 좋은 인도네시아어 표현의 뉘앙스.\n" +
    "- 동화라면 그 이야기가 담고 있는 교훈이나 비슷한 설화 전통을 소개해도 좋습니다.\n" +
    "- 딱딱한 사전식 나열이 아니라, 읽으면 '아하' 하게 되는 친절한 도움말로 쓰세요.\n";

  const parsed = await callGeminiJSON(prompt, 0.9);

  return {
    title: (parsed.title || "").toString().trim(),
    titleKo: (parsed.titleKo || "").toString().trim(),
    category,
    difficulty,
    indonesian: (parsed.indonesian || "").toString().trim(),
    korean: (parsed.korean || "").toString().trim(),
    background: (Array.isArray(parsed.background) ? parsed.background : [])
      .map((b: any) => ({
        heading: (b?.heading || "").toString().trim(),
        body: (b?.body || "").toString().trim(),
      }))
      .filter((b: StoryBackground) => b.body),
  };
}

// 본문 속 단어 탭 → 미니 팝업용 빠른 조회 (문맥 반영, 저비용)
export async function quickLookupWord(
  word: string,
  sentence: string
): Promise<{ meaning: string; info: string; sentenceKo: string }> {
  const prompt =
    "한국인 학습자를 위해 인도네시아어 단어를 JSON으로만 설명하세요.\n\n" +
    '단어: "' + word + '"\n' +
    '이 단어가 쓰인 문장: "' + sentence + '"\n\n' +
    "{\n" +
    '  "meaning": "이 단어의 뜻. 뜻이 여러 개면 쉼표로 모두 나열 (예: 사과, 조회(집합))",\n' +
    '  "info": "단어 자체에 대한 짧은 설명 (어근·활용형·비슷한 말·파생어 중 학습에 유용한 것만 골라 한두 문장)",\n' +
    '  "sentenceKo": "위 문장의 자연스러운 한국어 번역"\n' +
    "}\n\n" +
    "주의:\n" +
    "- meaning은 문맥에 한정하지 말고, 그 단어가 가진 주요 뜻을 모두 적으세요. 어떤 뜻인지는 읽는 사람이 문맥으로 판단합니다.\n";

  const parsed = await callGeminiJSON(prompt, 0.3);
  return {
    meaning: (parsed.meaning || "").toString().trim(),
    info: (parsed.info || "").toString().trim(),
    sentenceKo: (parsed.sentenceKo || "").toString().trim(),
  };
}
