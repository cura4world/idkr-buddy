// src/lib/story.ts
// 인도네시아 이야기 카드: 사용자가 고른 주제(또는 랜덤)와 난이도로 학습용 짧은 글을 생성합니다.
// 기존 Gemini API 키(localStorage "geminiApiKey")를 재사용합니다.
//
// 2026-11-22 사용자 결정(출시 전 수정):
// - 주제 10칸(랜덤 + 9개 주제)을 직접 고릅니다. 주제마다 "다루는 것 / 다루지 않는 것"을 프롬프트에 넣어
//   주제끼리 겹치지 않게 합니다. 예전 "종교"는 여러 종교를 고르게 소개하는 "명절"로 바뀌었습니다.
// - 난이도별 길이를 줄였습니다: 하 40~60 / 중 70~100 / 상 110~150 단어(예전 80~110 / 110~150 / 150~190).
//   길이뿐 아니라 문장 길이·문법 범위도 단계마다 다르게 적고 예시 문장을 함께 줍니다.

import { callGeminiJSON } from "@/lib/geminiText";

/** 주제 칸의 키 — 화면(StoryTopicGrid)과 localStorage "story-category" 에 이 값을 씁니다 */
export type StoryTopicKey =
  | "all"
  | "tale"
  | "life"
  | "food"
  | "culture"
  | "travel"
  | "place"
  | "history"
  | "people"
  | "holiday";

export interface StoryTopic {
  key: Exclude<StoryTopicKey, "all">;
  label: string;  // 화면 칸 이름(두 글자)
  short: string;  // 한 줄 요약 — 다른 주제를 피하라고 알릴 때 씁니다
  name: string;   // 이야기에 저장하는 카테고리 이름 — 칩에는 "인도네시아 " 를 뗀 label 이 보입니다
  covers: string; // 다루는 것
  avoids: string; // 다루지 않는 것 (다른 주제의 몫)
  factual: boolean; // 사실 기반 주제인가 (동화·생활은 창작 장면)
  /** 고르게 돌아가야 하는 주제의 초점 목록 — 코드가 하나를 골라 프롬프트에 넣습니다(모델은 지난번 선택을 모름) */
  focuses?: string[];
}

export const STORY_TOPICS: StoryTopic[] = [
  {
    key: "tale",
    short: "민담·전설·우화와 옛이야기 형식의 동화",
    label: "동화",
    name: "인도네시아 동화",
    covers:
      "인도네시아의 민담·전설·우화(예: Kancil 이야기, Malin Kundang, Timun Mas, Bawang Merah Bawang Putih, Sangkuriang, 토바 호수 전설) " +
      "또는 그런 옛이야기 형식의 짧은 창작 동화. 등장인물과 사건이 있는 이야기로 쓰고 끝에 교훈이 자연스럽게 드러나게.",
    avoids: "실제 역사·지리·관광 정보 설명, 오늘날 도시 생활 장면",
    factual: false,
  },
  {
    key: "life",
    short: "오늘날 사람들의 하루 생활 장면",
    label: "생활",
    name: "인도네시아 생활",
    covers:
      "오늘날 인도네시아 사람의 평범한 하루 장면: 가족, 학교, 직장, 이웃, 시장 보기, 교통(오젝·앙콧·버스), 은행·병원·관공서 가기, 휴대폰과 메신저, 날씨(우기·건기). " +
      "등장인물이 나오는 짧은 장면 이야기로 쓰기.",
    avoids: "음식 자체의 소개(요리법·지역 음식), 관광지 안내, 명절 이야기, 전통 예술",
    factual: false,
  },
  {
    key: "food",
    short: "요리·재료·지역 음식·식사 예절",
    label: "음식",
    name: "인도네시아 음식",
    covers:
      "인도네시아 음식 한 가지 또는 식문화 한 가지: 대표 요리(nasi goreng, rendang, soto, gado-gado, sate 등), 재료와 양념(sambal, tempe), 지역마다 다른 음식, " +
      "길거리 음식과 와룽, 먹는 법과 식사 예절(오른손, 함께 먹기), 열대 과일과 음료.",
    avoids: "명절에만 먹는 음식 이야기(명절 주제의 몫), 식당이 아닌 관광지 안내",
    factual: true,
  },
  {
    key: "culture",
    short: "전통 예술과 관습·예절",
    label: "문화",
    name: "인도네시아 문화",
    covers:
      "전통 예술과 관습 한 가지: 와양, 바틱, 가믈란, 전통 춤, 앙끌룽, 전통 가옥, 공예, 전통 의상, gotong royong(상부상조), 인사와 예절, 존댓말 같은 말 습관.",
    avoids: "명절·종교 행사(명절 주제의 몫), 음식, 관광 안내, 왕국과 역사적 사건",
    factual: true,
  },
  {
    key: "travel",
    short: "관광지 소개와 여행 정보",
    label: "여행",
    name: "인도네시아 여행",
    covers:
      "실제 관광지 한 곳을 여행자 시점으로 소개: 발리, 보로부두르, 족자카르타, 브로모 산, 코모도 섬, 라자 암팟, 토바 호수, 롬복 등. " +
      "무엇을 볼 수 있는지, 어떻게 가는지, 언제 가면 좋은지, 여행할 때 알아 두면 좋은 팁을 담기.",
    avoids: "그 지역의 지리·기후·산업을 고르게 설명하는 글(장소 주제의 몫), 역사 강의",
    factual: true,
    focuses: [
      "발리·롬복",
      "족자카르타와 중부 자바",
      "서부 자바·동부 자바(반둥, 브로모 산 등)",
      "수마트라(토바 호수, 부킷 라왕 등)",
      "술라웨시(타나 토라자, 부나켄 등)",
      "누사틍가라(코모도 섬, 플로레스 등)",
      "말루쿠·파푸아(라자 암팟 등)",
      "칼리만탄(탄중 푸팅 등)",
      "자카르타와 그 근처",
    ],
  },
  {
    key: "place",
    short: "지리·기후·지역 특성",
    label: "장소",
    name: "인도네시아 장소",
    covers:
      "인도네시아의 지리와 지역 특성 한 가지: 섬과 주(provinsi), 화산과 지진, 열대 기후와 우기·건기, 열대우림과 동식물, 강과 바다, 도시의 성격, 지역마다 다른 생활과 산업. " +
      "자바에 몰리지 않게 수마트라·칼리만탄·술라웨시·파푸아·누사틍가라·말루쿠·자바·발리를 고르게 돌아가며 다루기.",
    avoids: "관광 안내(볼거리·가는 법·여행 팁 — 여행 주제의 몫)",
    factual: true,
    focuses: ["수마트라", "자바", "발리", "칼리만탄", "술라웨시", "누사틍가라", "말루쿠", "파푸아", "인도네시아 전체(섬나라·화산·기후 같은 나라 전체의 특징)"],
  },
  {
    key: "history",
    short: "왕국·식민 시대·독립 등 시대와 사건",
    label: "역사",
    name: "인도네시아 역사",
    covers:
      "시대와 사건 한 가지: 스리위자야·마자파힛 같은 옛 왕국, 향신료 무역, 네덜란드 식민 시대, 일본 점령기, 1945년 독립 선언과 독립 전쟁, 청년의 맹세(Sumpah Pemuda), 근현대의 변화.",
    avoids: "한 사람의 일대기(인물 주제의 몫), 전설과 설화(동화 주제의 몫)",
    factual: true,
  },
  {
    key: "people",
    short: "실존 인물 한 명의 삶",
    label: "인물",
    name: "인도네시아 인물",
    covers:
      "실존 인물 한 명의 삶과 그 사람이 남긴 것: 독립 영웅(Kartini, Hatta, Soekarno, Cut Nyak Dhien, Ki Hajar Dewantara 등), 작가·예술가·과학자·운동선수 등. " +
      "그 사람이 왜 기억되는지가 드러나게.",
    avoids: "지금 활동 중인 정치인, 논쟁이 큰 평가, 시대 전체를 설명하는 역사 강의",
    factual: true,
  },
  {
    key: "holiday",
    short: "여러 종교의 명절·국경일·축제",
    label: "명절",
    name: "인도네시아 명절",
    covers:
      "인도네시아의 명절·기념일·축제와 그 속의 신앙생활 한 가지. 6개 공인 종교를 고르게 돌아가며 다루기: " +
      "이슬람(르바란·라마단·이둘아드하), 개신교·가톨릭(성탄절·부활절), 힌두(녜피·갈룽안), 불교(와이삭), 유교(임렉). " +
      "그 밖에 독립기념일(8월 17일 행사와 놀이), 카르티니의 날, 지역 축제와 전통 행사도 좋음. 그 날을 사람들이 어떻게 보내는지, 무슨 뜻이 있는지 소개하기.",
    avoids: "특정 종교를 권하거나 다른 종교와 비교·평가하는 내용, 교리 논쟁. 모든 종교를 같은 존중의 말투로.",
    factual: true,
    focuses: [
      "이슬람의 명절(르바란·라마단·이둘아드하 가운데 하나)",
      "개신교·가톨릭의 명절(성탄절·부활절 가운데 하나)",
      "힌두교의 명절(녜피·갈룽안 가운데 하나)",
      "불교의 명절(와이삭)",
      "유교·중국계 인도네시아인의 명절(임렉)",
      "독립기념일(8월 17일)과 그날의 행사·놀이",
      "지역 축제나 전통 행사(종교와 관계없는 것)",
    ],
  },
];

/** 화면 칸 순서: 랜덤이 맨 앞 */
export const STORY_TOPIC_KEYS: StoryTopicKey[] = ["all", ...STORY_TOPICS.map((t) => t.key)];

export const STORY_TOPIC_LABEL: Record<StoryTopicKey, string> = STORY_TOPICS.reduce(
  (acc, t) => {
    acc[t.key] = t.label;
    return acc;
  },
  { all: "랜덤" } as Record<StoryTopicKey, string>
);

/** 예전 코드 호환용 — 주제 이름 목록 */
export const STORY_CATEGORIES = STORY_TOPICS.map((t) => t.name);

export const isStoryTopicKey = (v: unknown): v is StoryTopicKey =>
  typeof v === "string" && (STORY_TOPIC_KEYS as string[]).indexOf(v) >= 0;

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
  category: string;   // 카테고리 이름 (예: "인도네시아 음식")
  difficulty: StoryDifficulty;
  indonesian: string; // 본문 (문단은 \n\n)
  korean: string;     // 전체 번역
  background?: StoryBackground[]; // 글의 배경·도움말 (뒷면)
  hardWords?: StoryHardWord[];    // 예전 이야기 호환용
}

/** 최근 이야기 — 같은 주제 안에서 제목이 겹치지 않게, 랜덤에서 같은 주제가 이어지지 않게 씁니다 */
export interface StoryRecent {
  category: string;
  title: string;
}

interface DiffSpec {
  words: string;      // 분량
  max: number;        // 넘기면 안 되는 단어 수
  paragraphs: string; // 문단 수
  sentences: string;  // 문장 길이
  grammar: string;    // 어휘·문법 범위
  example: string;    // 이 난이도의 예시 문장
  background: string; // 배경 설명 항목 수·길이
}

const DIFF_INFO: Record<StoryDifficulty, DiffSpec> = {
  하: {
    words: "인도네시아어 40~60단어",
    max: 60,
    paragraphs: "문단 2개",
    sentences: "문장 6~9개, 한 문장은 8단어 이하로 짧게",
    grammar:
      "아주 쉬운 기초 생활 어휘만. 주어+동사+목적어의 기본 어순, 지금 일이나 습관을 말하는 쉬운 문장. " +
      "접사는 ber-·me- 기본형 정도만. 수동형(di-), yang 으로 길게 꾸미는 말, 관용 표현, 어려운 한자어식 단어는 쓰지 않기. 고유명사는 꼭 필요한 1~2개만.",
    example: "Ini Budi. Budi suka nasi goreng. Setiap pagi, dia makan di warung dekat rumah.",
    background: "항목 2개, 각 body 는 한국어 1~2문장",
  },
  중: {
    words: "인도네시아어 70~100단어",
    max: 100,
    paragraphs: "문단 2~3개",
    sentences: "한 문장 평균 10~12단어, 길어도 15단어 이하",
    grammar:
      "일상에서 자주 쓰는 중급 어휘. me-·di-·ber-·-kan·-an 같은 흔한 접사와 쉬운 수동형, " +
      "karena·tetapi·ketika·lalu·jadi 같은 접속사로 두 문장을 잇는 정도. 관용 표현은 쓰지 않기.",
    example: "Ketika hujan turun, Budi menunggu bus di halte karena dia lupa membawa payung.",
    background: "항목 2~3개, 각 body 는 한국어 2문장 안팎",
  },
  상: {
    words: "인도네시아어 110~150단어",
    max: 150,
    paragraphs: "문단 3개",
    sentences: "길고 짧은 문장을 섞되, 복문을 자연스럽게",
    grammar:
      "교양서·신문에 나오는 고급 어휘. yang 관계절, 수동형, sehingga·meskipun·bahkan·adapun 같은 연결 표현, " +
      "관용 표현 1~2개를 넣어도 좋음.",
    example:
      "Meskipun sudah berabad-abad berlalu, candi yang dibangun dari batu vulkanik itu masih berdiri kokoh sehingga menarik perhatian banyak peneliti.",
    background: "항목 3개, 각 body 는 한국어 2~3문장",
  },
};

// 이야기는 본문이 길어 생성에 시간이 걸리므로 타임아웃을 넉넉히(60초) 잡습니다.
const STORY_TIMEOUT_MS = 60000;

/** 같은 주제 안에서 피할 최근 제목 수 */
const RECENT_TITLES_MAX = 15;

/** 랜덤일 때 고를 주제 — 바로 앞 두 이야기의 주제는 되도록 피합니다 */
const pickRandomTopic = (recent: StoryRecent[]): StoryTopic => {
  const lastTwo = recent.slice(0, 2).map((r) => r.category);
  const pool = STORY_TOPICS.filter((t) => lastTwo.indexOf(t.name) < 0);
  const from = pool.length ? pool : STORY_TOPICS;
  return from[Math.floor(Math.random() * from.length)];
};

/** 초점이 있는 주제면 하나를 고릅니다 — 고르게 돌아가도록 코드가 무작위로 정합니다 */
const pickFocus = (topic: StoryTopic): string =>
  topic.focuses && topic.focuses.length ? topic.focuses[Math.floor(Math.random() * topic.focuses.length)] : "";

/** 다른 주제들의 몫을 한 줄씩 — "이 주제에서 쓰지 말 것"을 더 분명히 합니다 */
const otherTopicsLine = (topic: StoryTopic): string =>
  STORY_TOPICS.filter((t) => t.key !== topic.key)
    .map((t) => "  · " + t.label + ": " + t.short)
    .join("\n");

/**
 * 이야기 1개 생성.
 * @param difficulty 하/중/상
 * @param topicKey 고른 주제 칸 ("all" 이면 랜덤)
 * @param recent 최근 이야기(새것부터) — 같은 주제 제목 중복 방지·랜덤 연속 방지
 */
export async function generateStory(
  difficulty: StoryDifficulty,
  topicKey: StoryTopicKey = "all",
  recent: StoryRecent[] = []
): Promise<StoryData> {
  const topic =
    topicKey === "all" ? pickRandomTopic(recent) : STORY_TOPICS.find((t) => t.key === topicKey) || pickRandomTopic(recent);
  const info = DIFF_INFO[difficulty] || DIFF_INFO["중"];
  const focus = pickFocus(topic);
  const recentTitles = recent
    .filter((r) => r.category === topic.name && r.title)
    .slice(0, RECENT_TITLES_MAX)
    .map((r) => r.title);

  const prompt =
    "당신은 한국인 인도네시아어 학습자를 위한 읽기 자료 작가입니다.\n" +
    "아래 조건으로 짧은 인도네시아어 글을 써서 JSON으로만 출력하세요.\n\n" +
    "[주제] " + topic.label + " (" + topic.name + ")\n" +
    "- 다루는 것: " + topic.covers + "\n" +
    "- 중심으로 삼지 않는 것: " + topic.avoids + "\n" +
    (focus ? "- 이번 글의 초점: " + focus + " (다른 지역·대상으로 바꾸지 마세요)\n" : "") +
    "- '다루는 것'은 고를 수 있는 예시입니다. 분량에 맞게 그중 1~2가지만 골라 쓰세요.\n" +
    "- 다른 주제와 겹치지 않게, 아래 주제가 글의 중심이 되지 않게 하세요(곁들여 잠깐 언급하는 것은 괜찮음):\n" +
    otherTopicsLine(topic) + "\n" +
    "- 한 편에는 소재 하나만, 분명하게 다루세요.\n\n" +
    "[난이도] " + difficulty + "\n" +
    "- 분량: " + info.words + ". 절대 " + info.max + "단어를 넘기지 마세요. 폰 화면 하나에 들어가는 하루 학습 분량입니다.\n" +
    "- " + info.paragraphs + ", " + info.sentences + "\n" +
    "- 어휘와 문법: " + info.grammar + "\n" +
    "- 이 난이도의 문장 예: \"" + info.example + "\" (이 문장을 그대로 쓰지는 마세요)\n\n" +
    "출력 형식:\n" +
    "{\n" +
    '  "title": "인도네시아어 제목 (짧게)",\n' +
    '  "titleKo": "제목의 한국어 번역",\n' +
    '  "indonesian": "본문. 문단 구분은 빈 줄 두 개",\n' +
    '  "korean": "본문 전체의 자연스러운 한국어 번역. 문단 구분 동일",\n' +
    '  "background": [{"heading": "소제목", "body": "한국어 설명"}]\n' +
    "}\n\n" +
    "주의:\n" +
    (topic.factual
      ? "- 사실 기반 주제입니다. 정확한 사실만 쓰고, 확실하지 않은 숫자·연도·이름은 쓰지 마세요.\n"
      : "- 창작 이야기입니다. 흥미롭게 쓰되, 인도네시아의 실제 생활·풍습과 어긋나지 않게 하세요.\n") +
    "- 인도네시아어는 표준어(KBBI 표기)로, 자연스럽고 정확하게 쓰세요.\n" +
    "- 쓰기 전에 단어 수를 세어 분량을 지키세요. 넘치면 문장을 줄이세요.\n" +
    "- 최근 같은 주제에서 다룬 제목과 겹치지 않는 새로운 소재로 쓰세요. 최근 제목: " +
    (recentTitles.length ? recentTitles.join(", ") : "없음") + "\n\n" +
    "[background — 글을 더 깊이 이해하게 돕는 배경 설명]\n" +
    "- " + info.background + ". 각 항목은 heading(6자 내외 소제목) + body(한국어 설명).\n" +
    "- 본문에 이미 쓴 내용을 다시 요약하지 마세요. 본문이 말하지 않은 것을 더해야 합니다.\n" +
    "- 예: 이 소재의 배경, 인도네시아 사람들에게 갖는 의미, 한국과 비교되는 문화 차이,\n" +
    "  본문에 나온 고유명사나 관습에 대한 보충 지식, 알아두면 좋은 인도네시아어 표현의 뉘앙스.\n" +
    "- 동화라면 그 이야기가 담고 있는 교훈이나 비슷한 설화 전통을 소개해도 좋습니다.\n" +
    "- 딱딱한 사전식 나열이 아니라, 읽으면 '아하' 하게 되는 친절한 도움말로 쓰세요.\n";

  const parsed = await callGeminiJSON(prompt, { timeoutMs: STORY_TIMEOUT_MS, kind: "story" });

  return {
    title: (parsed.title || "").toString().trim(),
    titleKo: (parsed.titleKo || "").toString().trim(),
    category: topic.name,
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

  const parsed = await callGeminiJSON(prompt);
  const meaning = (parsed.meaning || "").toString().trim();
  // 뜻이 빈 답은 실패로 봅니다 — 그대로 돌려주면 단어 팝업에 빈 뜻이 뜹니다(출시 전 점검 C-24)
  if (!meaning) throw new Error("EMPTY_RESPONSE");
  return {
    meaning,
    info: (parsed.info || "").toString().trim(),
    sentenceKo: (parsed.sentenceKo || "").toString().trim(),
  };
}
