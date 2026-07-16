// src/lib/prayer.ts
// 인도네시아어 기도문 생성 (Claude API).
// 안디옥인도네시아교회 목회 현장에서 바로 읽을 수 있는 "실전 맞춤 기도문"을 만듭니다.
// 쉬운 인도네시아어 + 실제 인도네시아 개신교회 기도 어투.

import { callClaudeJSON } from "@/lib/claude";

export type PrayerLength = "short" | "medium" | "long";
export type MeetingPhase = "open" | "close";

export interface PrayerSituation {
  id: string;
  label: string; // 버튼에 표시
  desc: string;  // 프롬프트에 전달되는 상황 설명
}

export interface PrayerCategory {
  id: string;
  label: string;
  emoji: string;
  needsPhase?: boolean; // 모임: 시작/마침 선택 필요
  situations: PrayerSituation[];
}

export const PRAYER_CATEGORIES: PrayerCategory[] = [
  {
    id: "meal",
    label: "식사 기도",
    emoji: "🍚",
    situations: [
      { id: "church-lunch", label: "교회 점심식사", desc: "주일예배 후 교회에서 성도들과 함께 먹는 점심식사 감사 기도" },
      { id: "restaurant", label: "식당 교제 식사", desc: "식당에서 성도들과 교제하며 함께 먹는 식사 감사 기도" },
      { id: "home-meal", label: "심방 가정 식사", desc: "심방한 성도의 가정에서 대접받는 식사 감사 기도 (준비한 가정을 축복)" },
      { id: "custom", label: "기타", desc: "" },
    ],
  },
  {
    id: "meeting",
    label: "모임 기도",
    emoji: "🤝",
    needsPhase: true,
    situations: [
      { id: "cell", label: "셀모임", desc: "성도들의 소그룹 셀모임" },
      { id: "bible-study", label: "성경공부모임", desc: "성도들이 함께 성경을 공부하는 모임" },
      { id: "leader", label: "리더모임", desc: "교회 리더(봉사자)들의 모임" },
      { id: "korean-class", label: "한국어수업", desc: "성도들을 위한 한국어 수업 (TOPIK 준비 포함)" },
      { id: "sat-prayer", label: "토요기도모임", desc: "토요일 저녁 교회 기도모임" },
      { id: "custom", label: "기타", desc: "" },
    ],
  },
  {
    id: "comfort",
    label: "위로·심방 기도",
    emoji: "🕊️",
    situations: [
      { id: "sick", label: "아픈 성도", desc: "몸이 아픈 성도를 위한 치유와 위로의 기도" },
      { id: "hospital", label: "병원 심방", desc: "병원에 입원한 성도를 심방하여 침상 곁에서 드리는 기도" },
      { id: "home-visit", label: "가정 심방", desc: "성도의 가정을 심방하여 그 가정의 평안과 축복을 위해 드리는 기도" },
      { id: "detention", label: "구금 심방", desc: "체류 문제로 단속되어 외국인보호소(구금 시설)에 있는 성도를 심방하여 드리는 기도. 정죄 없이 위로와 소망, 하나님의 동행, 앞길의 인도하심" },
      { id: "birth", label: "출산", desc: "출산을 앞두었거나 갓 출산한 성도와 아기를 위한 기도" },
      { id: "exam", label: "시험 (TOPIK 등)", desc: "시험(주로 TOPIK 한국어능력시험)을 앞둔 성도를 위한 기도. 평안과 그동안의 수고를 기억하며 결과를 하나님께 맡김" },
      { id: "return-home", label: "귀국 성도", desc: "한국 생활을 마치고 인도네시아로 완전히 귀국하는 성도를 위한 환송 기도. 그동안의 수고와 신앙을 축복하고 고향에서의 새 삶을 하나님께 맡김" },
      { id: "re-departure", label: "재출국 성도", desc: "잠시 인도네시아에 다녀오는(다시 한국으로 돌아올) 성도를 위한 기도. 가는 길과 오는 길의 안전, 가족과의 만남을 축복" },
      { id: "encourage", label: "격려", desc: "타향살이와 고된 일로 지치고 낙심한 성도를 격려하고 힘을 주는 기도" },
      { id: "visit-open", label: "만남 시작", desc: "심방이나 상담 만남을 시작하며 드리는 짧은 기도" },
      { id: "custom", label: "기타", desc: "" },
    ],
  },
  {
    id: "worship",
    label: "예배 기도",
    emoji: "⛪",
    situations: [
      { id: "before-sermon", label: "설교 전 (찬양 후)", desc: "주일예배에서 찬양 후 설교 전에 말씀의 은혜를 구하는 기도" },
      { id: "after-sermon", label: "설교 마침", desc: "설교를 마치며 들은 말씀대로 살게 해달라고 드리는 결단의 기도" },
      { id: "representative", label: "대표기도 (긴 기도)", desc: "주일예배 중 드리는 긴 대표기도. 감사, 회개, 교회와 성도들, 한국의 일터에서 일하는 성도들, 고향의 가족들, 나라(한국과 인도네시아)를 위한 중보를 포함" },
      { id: "new-family", label: "새가족 환영", desc: "교회에 처음 온 새가족을 환영하고 축복하는 기도" },
      { id: "birthday", label: "생일 축복", desc: "생일을 맞은 성도를 축복하는 기도" },
      { id: "custom", label: "기타", desc: "" },
    ],
  },
  {
    id: "etc",
    label: "그외 기도",
    emoji: "🙏",
    situations: [
      { id: "custom", label: "직접 입력", desc: "" },
    ],
  },
];

export function getPrayerCategory(id: string): PrayerCategory | undefined {
  return PRAYER_CATEGORIES.find((c) => c.id === id);
}

export interface PrayerData {
  title: string;      // 짧은 한국어 제목 (히스토리 표시용)
  indonesian: string; // 기도문 (문단은 \n\n)
  korean: string;     // 한국어 번역 (문단 구분 동일)
}

export interface GeneratePrayerOptions {
  categoryId: string;
  situationId: string;
  phase?: MeetingPhase | null;
  name?: string;
  note?: string;
  customText?: string; // 상황 "기타"를 골랐을 때 직접 적은 내용
  length: PrayerLength;
}

const LENGTH_SPEC: Record<PrayerLength, string> = {
  short: "짧게: 인도네시아어 60~90 단어 (소리 내어 읽으면 약 30초~1분). 문단 1~2개",
  medium: "보통: 인도네시아어 110~160 단어 (약 1~2분). 문단 2~3개",
  long: "길게: 인도네시아어 220~300 단어 (약 3~4분). 문단 3~5개",
};

const SYSTEM_PROMPT =
  "당신은 인도네시아 개신교회에서 실제로 사용되는 기도문을 쓰는 전문가입니다.\n" +
  "한국에 있는 인도네시아인 교회(안디옥인도네시아교회)의 목사가 현장에서 소리 내어 읽을 기도문을 만듭니다.\n" +
  "성도들은 대부분 한국에서 일하는 인도네시아·말레이시아 근로자(일부 학생·정착자)로, 고향과 가족을 떠나 타향에서 힘들게 일하며 살아갑니다.\n\n" +
  "[언어 원칙]\n" +
  "- 쉬운 인도네시아어로 쓰세요: 일상 어휘, 짧고 단순한 문장. 어려운 문어체·옛말·현학적 단어 금지.\n" +
  "- 실제 인도네시아 개신교회에서 쓰는 자연스러운 기도 어투를 사용하세요.\n" +
  '  예: "Kami bersyukur", "Kami berterima kasih", "Berkatilah", "Sertailah", "Kami serahkan", "Ampunilah", "Jagalah", "Kuatkanlah".\n' +
  '- 기도의 시작 부름말은 매번 다양하게 바꾸세요: "Tuhan Yesus yang kami kasihi", "Allah Bapa yang penuh kasih", "Bapa kami yang di surga", "Allah yang setia", "Tuhan yang baik", "Bapa yang murah hati", "Allah sumber segala berkat" 등.\n' +
  '- 절대 매번 "Bapa yang baik"으로만 시작하지 마세요. 마침 문장만 항상 동일하게 유지합니다.\n' +
  '- 마지막은 반드시 "Dalam nama Tuhan Yesus, kami berdoa. Amin." 으로 끝내세요.\n' +
  "- 회중과 함께 드리는 기도이므로 kami(우리)를 사용하세요.\n" +
  "- 성도들의 현실(타향살이, 일터의 수고, 멀리 있는 가족)을 상황에 맞을 때 자연스럽게 담되, 무겁게 강조하지 마세요.\n\n" +
  "[신학 원칙]\n" +
  "- 성경적이고 복음 중심적으로. 하나님의 성품(사랑, 신실하심, 돌보심)에 근거해 간구합니다.\n" +
  "- 번영신학 금지: 물질적 성공을 보장하거나 요구하는 표현을 쓰지 마세요.\n" +
  "- 시험 기도: 합격을 보장하는 표현 대신, 평안과 그동안의 수고, 결과를 하나님께 맡기는 마음.\n" +
  "- 구금 심방: 정죄 없이 위로와 소망, 하나님의 동행. 사람의 존엄을 지키는 언어.\n" +
  "- 아픈 이를 위한 기도: 치유를 간구하되 하나님의 주권과 평안 안에서.\n\n" +
  "[형식]\n" +
  "- 문단은 빈 줄로 구분하세요.\n" +
  '- 이름이 주어지면 "saudara [이름]" 또는 "saudari [이름]"으로 자연스럽게 부르세요 (성별을 모르면 saudara/i 대신 이름만 불러도 됩니다). 이름이 없으면 이름 없이 자연스럽게.\n' +
  "- 구체적인 사정이 주어지면 기도에 자연스럽게 반영하세요.\n\n" +
  "반드시 아래 JSON 형식으로만 응답하세요:\n" +
  '{"title": "짧은 한국어 제목 (예: 교회 점심 식사 기도)", "indonesian": "기도문 전체", "korean": "자연스러운 한국어 번역 (문단 구분 동일)"}';

export async function generatePrayer(opts: GeneratePrayerOptions): Promise<PrayerData> {
  const cat = getPrayerCategory(opts.categoryId);
  const sit = cat?.situations.find((s) => s.id === opts.situationId);
  if (!cat || !sit) throw new Error("BAD_OPTIONS");

  let sitLabel = sit.label;
  let situationDesc = sit.desc;
  if (sit.id === "custom") {
    const custom = (opts.customText || "").trim();
    if (!custom) throw new Error("BAD_OPTIONS");
    sitLabel = custom;
    situationDesc = "사용자가 직접 적은 상황: " + custom + (cat.id === "etc" ? "" : " (" + cat.label + " 관련)");
  }
  if (cat.needsPhase && opts.phase) {
    situationDesc += opts.phase === "open" ? " — 모임을 시작하며 드리는 기도" : " — 모임을 마치며 드리는 기도";
  }

  const user =
    "[기도 상황]\n" +
    "- 분류: " + cat.label + "\n" +
    "- 상황: " + sitLabel + (cat.needsPhase && opts.phase ? (opts.phase === "open" ? " 시작" : " 마침") : "") + "\n" +
    "- 상황 설명: " + situationDesc + "\n" +
    (opts.name && opts.name.trim() ? "- 기도 대상 이름: " + opts.name.trim() + "\n" : "") +
    (opts.note && opts.note.trim() ? "- 구체적인 사정: " + opts.note.trim() + "\n" : "") +
    "- 길이: " + LENGTH_SPEC[opts.length] + "\n\n" +
    "위 상황에 딱 맞는 기도문을 만들어주세요.";

  const parsed = await callClaudeJSON(SYSTEM_PROMPT, user, 4000);

  const title = String(parsed.title || sit.label + " 기도").trim();
  const indonesian = String(parsed.indonesian || "").trim();
  const korean = String(parsed.korean || "").trim();
  if (!indonesian || !korean) throw new Error("PARSE_FAILED");

  return { title, indonesian, korean };
}


// ── 한국어 번역을 사용자가 수정하면, 그에 맞게 인도네시아어 기도문을 최소한으로 고칩니다 ──
const REVISE_SYSTEM =
  "당신은 인도네시아 개신교회 기도문 전문가입니다.\n" +
  "사용자가 기도문의 한국어 번역을 직접 수정했습니다. 수정된 한국어에 맞게 인도네시아어 기도문을 고치세요.\n\n" +
  "[원칙]\n" +
  "- 한국어에서 바뀐 부분만 인도네시아어에 반영하고, 나머지 문장은 원래 인도네시아어 표현을 그대로 유지하세요.\n" +
  "- 쉬운 인도네시아어: 일상 어휘, 짧고 단순한 문장.\n" +
  '- 인도네시아 개신교회의 자연스러운 기도 어투 유지 ("Bapa yang baik", "Kami bersyukur" 등).\n' +
  "- 문단 수와 순서는 수정된 한국어와 동일하게 맞추세요 (문단은 빈 줄로 구분).\n" +
  '- 한국어에 마침 문장("예수님의 이름으로 기도합니다. 아멘." 등)이 있으면 인도네시아어도 "Dalam nama Tuhan Yesus, kami berdoa. Amin."으로 마치세요.\n\n' +
  "반드시 아래 JSON 형식으로만 응답하세요:\n" +
  '{"indonesian": "수정된 인도네시아어 기도문 전체"}';

export async function revisePrayer(originalIndonesian: string, editedKorean: string): Promise<string> {
  const user =
    "[원래 인도네시아어 기도문]\n" + originalIndonesian + "\n\n" +
    "[사용자가 수정한 한국어]\n" + editedKorean + "\n\n" +
    "수정된 한국어에 맞게 인도네시아어 기도문을 고쳐주세요.";
  const parsed = await callClaudeJSON(REVISE_SYSTEM, user, 4000);
  const indonesian = String(parsed.indonesian || "").trim();
  if (!indonesian) throw new Error("PARSE_FAILED");
  return indonesian;
}

// ── 기도에 관한 말씀·명언 (뒷면 하단 표시용, 앱 내장) ──
export interface PrayerQuote {
  text: string;
  source: string;
}

export const PRAYER_QUOTES: PrayerQuote[] = [
  { text: "쉬지 말고 기도하라", source: "데살로니가전서 5:17" },
  { text: "아무 것도 염려하지 말고 오직 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라", source: "빌립보서 4:6" },
  { text: "구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요", source: "마태복음 7:7" },
  { text: "너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 비밀한 일을 네게 보이리라", source: "예레미야 33:3" },
  { text: "의인의 간구는 역사하는 힘이 큼이니라", source: "야고보서 5:16" },
  { text: "너희가 내 안에 거하고 내 말이 너희 안에 거하면 무엇이든지 원하는 대로 구하라 그리하면 이루리라", source: "요한복음 15:7" },
  { text: "환난 날에 나를 부르라 내가 너를 건지리니 네가 나를 영화롭게 하리로다", source: "시편 50:15" },
  { text: "기도를 계속하고 기도에 감사함으로 깨어 있으라", source: "골로새서 4:2" },
  { text: "항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라", source: "데살로니가전서 5:16-18" },
  { text: "나는 오늘 할 일이 너무 많다. 그래서 세 시간은 기도해야 한다.", source: "마르틴 루터" },
  { text: "모든 것이 하나님께 달린 것처럼 기도하고, 모든 것이 네게 달린 것처럼 일하라.", source: "어거스틴" },
  { text: "기도는 운전대인가, 아니면 예비 타이어인가?", source: "코리 텐 붐" },
  { text: "기도는 더 큰 일을 위한 준비가 아니다. 기도가 곧 그 큰 일이다.", source: "오스왈드 챔버스" },
  { text: "기도하면 죄를 멈추게 되고, 죄를 지으면 기도를 멈추게 된다.", source: "존 번연" },
];

// 기도문 id를 시드로 같은 기도문엔 항상 같은 구절이 나옵니다
export function pickPrayerQuote(seed: string): PrayerQuote {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PRAYER_QUOTES[h % PRAYER_QUOTES.length];
}
