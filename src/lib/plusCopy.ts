// src/lib/plusCopy.ts
// Kata kata Plus 구독 화면(PW1·PW2 시안) 문구를 한곳에 모읍니다.
// 시안: 저장소 밖 design-boards/PW1-Trial(체험 가능)·PW2-NoTrial(체험을 이미 쓴 계정).
// 한도 숫자(예: "하루 5편")는 kata-public Worker 의 DEFAULT_LIMITS 와 같아야 합니다 — 한쪽을 바꾸면 같이 고칩니다.
// 말투: 안내는 "~입니다", 버튼은 명사형. "~해요" 를 쓰지 않습니다.

export const PLUS_TITLE = "Kata kata Plus";
export const PLUS_TITLE_BRAND = "Kata kata"; // 제목 앞부분 (Lora)
export const PLUS_TITLE_MARK = "Plus";       // 제목 뒷부분 (황금갈색)

/** 제목 아래 한 줄 소개. 시안처럼 두 줄로 끊어 보입니다. */
export const PLUS_LEAD_LINES: string[] = ["단어장 폴더부터 게임, 회화집, 지도까지", "모든 기능이 열립니다"];

export type PlusPerkIcon = "book" | "game" | "speaker" | "chat" | "map";

export interface PlusPerk {
  icon: PlusPerkIcon;
  title: string;
  /** 제목 옆 회색 덧말 (예: "(3,000단어)") */
  note?: string;
  sub: string;
}

export const PLUS_PERKS: PlusPerk[] = [
  { icon: "book", title: "기본 단어장 34권", note: "(3,000단어)", sub: "주제별 단어를 카드와 퀴즈로 외우기" },
  { icon: "game", title: "단어 게임 6가지", sub: "게임으로 단어 실력 쌓기" },
  { icon: "speaker", title: "인도네시아 음성으로 이야기 듣기", sub: "하루 5편까지 새 이야기 불러오기" },
  { icon: "chat", title: "회화 공부와 만들기", sub: "86개 상황과 새로운 상황 만들기" },
  { icon: "map", title: "인도네시아 이해 · 지도", sub: "섬과 도시마다 읽을거리와 단어공부" },
];

// ── 요금제 카드 ──────────────────────────────────────────────

export const PLAN_YEARLY_LABEL = "연간";
export const PLAN_MONTHLY_LABEL = "월간";
export const PLAN_MONTHLY_SUB = "매달 결제";

/** Play 에서 가격을 못 받았을 때(미리보기 APK·조회 실패) 보이는 고정 가격 — 결정 문서 요금. */
export const FALLBACK_YEARLY_WON = 34800;
export const FALLBACK_MONTHLY_WON = 3900;

export function wonText(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

export function discountBadge(percent: number): string {
  return percent + "% 할인";
}

// ── 버튼 ─────────────────────────────────────────────────────

export function ctaTrial(trialText: string): string {
  return trialText + " 무료로 시작하기";
}
export const CTA_YEARLY = "연간 구독 시작하기";
export const CTA_MONTHLY = "월간 구독 시작하기";
export const CTA_MANAGE = "구독 관리 (Google Play)";
export const CTA_CLOSE = "닫기";

// ── 버튼 아래 안내 ───────────────────────────────────────────

/** 체험 가능(PW1). priceText 예: "연 34,800원" · "월 3,900원" */
export function noteTrialLines(trialText: string, priceText: string): string[] {
  return [
    trialText + " 체험이 끝나면 " + priceText + "이 결제됩니다.",
    "체험 중 언제든 Google Play에서 해지할 수 있습니다.",
  ];
}

/** 체험을 이미 쓴 계정(PW2). */
export const NOTE_NO_TRIAL_LINES: string[] = [
  "Google Play에서 결제되며, 언제든 해지할 수 있습니다.",
  "무료 체험은 계정마다 한 번만 제공됩니다.",
];

export const NOTE_AI_VOICE = "읽기 음성은 AI가 만든 인도네시아어 음성입니다.";

// ── 아래 링크 ────────────────────────────────────────────────

export const LINK_RESTORE = "구매 복원";
export const LINK_TERMS = "이용약관";
export const LINK_PRIVACY = "개인정보처리방침";

// ── 이미 열려 있는 계정 (구독 중·체험 중·Special·관리자) ───────

export const STATE_PLUS = "Plus 이용 중";
export const STATE_TRIAL = "Plus 무료 체험 중";
export const STATE_SPECIAL = "Special Member";
export const STATE_ADMIN = "관리자";
export const STATE_STAFF_SUB = "모든 기능이 열려 있습니다";

export function stateUntilText(dateText: string, trial: boolean): string {
  return trial ? dateText + "까지 체험 · 끝나면 자동으로 구독됩니다" : dateText + "까지 · 자동 갱신";
}

// ── 알림 ─────────────────────────────────────────────────────

export const TOAST_STARTED = "Plus 가 시작되었습니다. 고맙습니다";
export const TOAST_TRIAL_STARTED = "무료 체험이 시작되었습니다. 모든 기능이 열렸습니다";
export const TOAST_PENDING = "결제가 확인되면 Plus 가 켜집니다";
export function toastFailed(code: string): string {
  return "구독을 마치지 못했습니다. 잠시 뒤 다시 시도해 주세요 (" + code + ")";
}
export const TOAST_RESTORED = "구독을 다시 연결했습니다";
export const TOAST_RESTORE_NONE = "이 Google 계정으로 산 구독을 찾지 못했습니다";
export const TOAST_NO_BILLING = "구독은 Google Play에서 받은 앱에서만 할 수 있습니다";
export const TOAST_NO_OFFERS = "요금제를 불러오지 못했습니다. 인터넷을 확인하고 다시 열어 주세요";
export const TOAST_PREVIEW = "미리보기에서는 결제하지 않습니다";
