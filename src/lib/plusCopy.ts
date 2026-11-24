// src/lib/plusCopy.ts
// Kata kata Plus 구독 화면(PW1·PW2 시안) 문구를 한곳에 모읍니다.
// 시안: 저장소 밖 design-boards/PW2-NoTrial. 7일 무료 체험은 2026-11-23 Arga 결정으로 없앴습니다(메뉴별 맛보기로 바꿈) —
// 체험 문구(PW1)는 모두 걷어냈습니다.
// 한도 숫자(예: "하루 5편")는 kata-public Worker 의 DEFAULT_LIMITS 와 같아야 합니다 — 한쪽을 바꾸면 같이 고칩니다.
// 말투: 안내는 "~입니다", 버튼은 명사형. "~해요" 를 쓰지 않습니다.

export const PLUS_TITLE = "Kata kata Plus";
export const PLUS_TITLE_BRAND = "Kata kata"; // 제목 앞부분 (Lora)
export const PLUS_TITLE_MARK = "Plus";       // 제목 뒷부분 (황금갈색)

/** 제목 아래 한 줄 소개. 시안처럼 두 줄로 끊어 보입니다. */
export const PLUS_LEAD_LINES: string[] = ["기본 단어장부터 게임, 회화집, 지도까지", "모든 기능이 열립니다"];

export type PlusPerkIcon = "book" | "game" | "speaker" | "chat" | "map";

export interface PlusPerk {
  icon: PlusPerkIcon;
  title: string;
  /** 제목 옆 회색 덧말 (예: "(3,005단어)") */
  note?: string;
  sub: string;
}

/** 단어 수 덧말 — 홈 "단어장" 줄의 "3,005단어"와 같은 수를 같은 모양으로 보입니다(출시 전 점검 C-12). */
export function wordCountNote(n: number): string {
  return "(" + n.toLocaleString("ko-KR") + "단어)";
}

export const PLUS_PERKS: PlusPerk[] = [
  // 덧말의 단어 수는 구독 화면이 실제 수를 세어 바꿔 넣습니다(Plus.tsx). 여기 값은 세지 못했을 때만 보입니다.
  { icon: "book", title: "기본 단어장 34권", note: wordCountNote(3005), sub: "주제별 단어를 카드와 퀴즈로 외우기" },
  { icon: "game", title: "단어 게임 6가지", sub: "게임으로 단어 실력 쌓기" },
  // 한 달 상한(60편)도 함께 적습니다 — "하루 5편"만 보고 매일 5편을 받으면 12일째에 막힙니다(B-10).
  // 2026-11-16: 새 이야기 불러오기가 Plus 전용이 되어(무료는 맛보기 3편) 제목에 "읽기"도 담았습니다.
  { icon: "speaker", title: "매일 새 이야기 읽고 듣기", sub: "새 이야기 하루 5편 · 한 달 60편까지" },
  { icon: "chat", title: "회화집 공부와 대화 만들기", sub: "대화 86개와 새 대화 만들기" },
  { icon: "map", title: "인도네시아 이해 · 지도", sub: "섬과 도시마다 읽을거리와 단어 공부" },
];

// ── 요금제 카드 ──────────────────────────────────────────────

export const PLAN_YEARLY_LABEL = "연간";
export const PLAN_YEARLY_SUB = "매년 결제";
export const PLAN_MONTHLY_LABEL = "월간";
export const PLAN_MONTHLY_SUB = "매달 결제";

/**
 * 미리보기 빌드에서만 쓰는 대체 가격 — 2026-11-14 결정: 연 34,800원(월 2,900원) · 월 3,900원.
 * 정식 스토어 앱은 이 값을 쓰지 않습니다. Play 에서 받은 가격만 보여 주고, 못 받았으면 가격 자리를 비워 둡니다
 * (src/lib/playOffers.ts). 월 환산은 여기 적지 않고 연 가격 ÷ 12 로 계산합니다.
 */
export const FALLBACK_YEARLY_WON = 34800;
export const FALLBACK_MONTHLY_WON = 3900;

export function wonText(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

/** 요금제 카드의 가격 자리 — Play 에서 아직 못 받았을 때 */
export const PRICE_LOADING = "가격을 불러오는 중";
export const PRICE_FAILED = "가격을 불러오지 못했습니다";
/** 연간 카드의 작은 덧말: "(월 2,900원)" */
export function perMonthNote(perMonthPrice: string): string {
  return "(월 " + perMonthPrice + ")";
}

export function discountBadge(percent: number): string {
  return percent + "% 할인";
}

// ── 버튼 ─────────────────────────────────────────────────────

export const CTA_YEARLY = "연간 구독 시작하기";
export const CTA_MONTHLY = "월간 구독 시작하기";
export const CTA_MANAGE = "구독 관리 (Google Play)";
export const CTA_CLOSE = "닫기";

// ── 버튼 아래 안내 ───────────────────────────────────────────
// 첫 줄은 언제나 자동 결제 고지입니다(Play 구독 정책 — 2026-11-14 출시 전 점검 B-07).

// 2026-11-18 사용자 요청: 줄마다 작은 점을 붙여 왼쪽 정렬로(Plus.tsx), 해지·환불 안내를 분명하게.
//   환불 문구는 이용약관 제5조와 맞춥니다 — "해지해도 이미 결제한 기간 끝까지 이용, 해지·환불은 Google Play 정책을 따름".
//   그래서 "환불되지 않습니다"처럼 잘라 말하지 않고, 남은 기간 금액을 돌려주지 않는다고만 적습니다
//   (Google Play 의 환불 요청 절차와 전자상거래법의 청약철회는 그대로 살아 있기 때문입니다).

/** "Google Play에서 결제되며, 해지 전까지 매년 자동으로 결제됩니다." · 월간은 "매달" */
export function noteAutoRenew(yearly: boolean): string {
  return "Google Play에서 결제되며, 해지 전까지 " + (yearly ? "매년" : "매달") + " 자동으로 결제됩니다.";
}

/** 해지·환불 안내 */
export const NOTE_CANCEL =
  "해지는 언제든 할 수 있으며, 결제한 기간이 끝날 때까지 이용할 수 있습니다. 남은 기간의 금액은 돌려드리지 않습니다.";

/** 구독 버튼 아래 안내 — 자동 결제 고지 + 해지·환불 */
export function notePlanLines(yearly: boolean): string[] {
  return [noteAutoRenew(yearly), NOTE_CANCEL];
}

/** Play 에서 가격을 받는 중·못 받았을 때 */
export const NOTE_PRICE_LOADING = "Google Play에서 가격을 불러오는 중입니다.";
export const NOTE_PRICE_FAILED = "가격을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.";
export const LINK_PRICE_RETRY = "다시 불러오기";

/** 결제는 끝났는데 서버 확인이 아직인 동안 (다시 결제하라고 하지 않습니다) */
export const NOTE_VERIFYING_LINES: string[] = [
  "결제는 완료되었습니다. 확인 중입니다.",
  "확인되면 Plus가 바로 열립니다. 다시 결제하지 않으셔도 됩니다.",
];
export const CTA_VERIFYING = "결제 확인 중";
/** 최근까지 유료였던 계정이 구독 버튼을 눌렀을 때 — 결제창을 열기 전에 기존 구독을 먼저 확인하는 동안(2026-11-23) */
export const CTA_CHECKING = "확인 중…";

/** Play 에서 해지한(자동 갱신을 끈) 구독 — 내 정보·구독 화면 공통(2026-11-23 내부 테스트 I-8) */
export function canceledUntilText(dateText: string): string {
  return "정기 결제 취소됨 · " + dateText + "까지 이용";
}

// ── 잠금 상자·홈의 Plus 버튼 둘째 줄 ─────────────────────────
export const LOCK_BUTTON_SUB = "자세히 보기";

export const NOTE_AI_VOICE = "읽기 음성은 AI가 만든 인도네시아어 음성입니다.";

// ── 아래 링크 ────────────────────────────────────────────────

export const LINK_RESTORE = "구독 복원";
export const LINK_TERMS = "이용약관";
export const LINK_PRIVACY = "개인정보처리방침";

// ── 이미 열려 있는 계정 (구독 중·Special·관리자) ───────

export const STATE_PLUS = "Plus 이용 중";
export const STATE_SPECIAL = "Special Member";
export const STATE_ADMIN = "관리자";
export const STATE_STAFF_SUB = "모든 기능이 열려 있습니다";

/** 심사용 계정(서버 등급 review) — Plus 와 같은 화면에 이 한 줄만 다릅니다. */
export const STATE_REVIEW_SUB = "심사용 계정";

/** autoRenew 가 false 면 Play 에서 해지한 구독입니다 — 다음 결제가 없으므로 "자동 갱신"이라고 하지 않습니다(B-09). */
export function stateUntilText(dateText: string, autoRenew = true): string {
  if (!autoRenew) return canceledUntilText(dateText);
  return dateText + "까지 · 자동 갱신";
}

// ── 알림 ─────────────────────────────────────────────────────

export const TOAST_STARTED = "Plus가 시작되었습니다. 고맙습니다";
export const TOAST_PENDING = "결제가 확인되면 Plus가 켜집니다";
/** 결제는 끝났는데 서버 확인이 실패 — 자동으로 다시 확인합니다(billing.ts). */
export const TOAST_VERIFYING = "결제는 완료되었습니다. 확인 중입니다.";
export const TOAST_VERIFIED = "결제가 확인되었습니다. Plus가 시작되었습니다";
/** 이 기기의 구독이 다른 앱 계정에 묶여 있을 때 (서버 403 ACCOUNT_MISMATCH · 409 PURCHASE_OWNED_BY_OTHER) */
export const TOAST_OTHER_ACCOUNT = "이 구독은 다른 Google 계정으로 로그인했을 때 산 것입니다. 그 계정으로 로그인해 주세요";
export const TOAST_RESTORE_RETRY = "구독을 확인하지 못했습니다. 인터넷을 확인하고 다시 눌러 주세요";

/** 결제·복원 결과 코드 가운데 "다른 계정의 구독"인 것 */
export function isOtherAccountCode(code: string): boolean {
  return code === "ACCOUNT_MISMATCH" || code === "PURCHASE_OWNED_BY_OTHER";
}

/** 결제 창에서 구매가 끝나지 않았을 때(Play 오류). 결제가 끝난 뒤의 확인 실패에는 쓰지 않습니다. */
export function toastFailed(code: string): string {
  if (isOtherAccountCode(code)) return TOAST_OTHER_ACCOUNT;
  // 영어 오류 코드는 미리보기 빌드에서만 붙입니다(출시 전 점검 E-08)
  let preview = false;
  try { preview = import.meta.env.VITE_PREVIEW === "1"; } catch (e) {}
  return "구독을 마치지 못했습니다. 잠시 뒤 다시 시도하세요" + (preview ? " (" + code + ")" : "");
}
export const TOAST_RESTORED = "구독을 복원했습니다";
export const TOAST_RESTORE_NONE = "이 Google 계정으로 산 구독을 찾지 못했습니다";
export const TOAST_NO_BILLING = "구독은 Google Play에서 받은 앱에서만 할 수 있습니다";
export const TOAST_NO_OFFERS = "요금제를 불러오지 못했습니다. 인터넷을 확인하고 다시 열어 주세요";
export const TOAST_PREVIEW = "미리보기에서는 결제하지 않습니다";
/** 구독 단추를 눌렀는데 인터넷이 없음 — Play 결제 창을 열지 않습니다(2026-11-24) */
export const TOAST_OFFLINE = "인터넷 연결을 확인해 주세요";
