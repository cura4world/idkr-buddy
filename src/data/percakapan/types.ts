// 회화집(Percakapan) 공통 타입
// 이 파일은 데이터 파일들이 참조하므로 가장 먼저 커밋할 것.

/** 화자. Gemini 다화자 TTS는 2명이 상한이므로 C는 A와 같은 목소리를 쓴다. */
export type PercakapanSpeaker = "A" | "B" | "C";

/** 목소리 성별. m = Charon(남), f = Kore(여) */
export type PercakapanGender = "m" | "f";

/** 난이도 (하: 기초 단어·짧은 문장 / 중: 기본 / 상: 길고 빠른 대화) */
export type PercakapanLevel = "하" | "중" | "상";

/** 대화 한 줄 */
export interface PercakapanLine {
  /** 화자 */
  s: PercakapanSpeaker;
  /** 인도네시아어 */
  id: string;
  /** 한국어 해석 */
  ko: string;
}

/** 회화 한 장면 */
export interface PercakapanScene {
  /** 고유 id (카테고리-장면) */
  id: string;
  /** 카테고리 id */
  cat: string;
  /** 한국어 제목 */
  title: string;
  /** 인도네시아어 제목 */
  titleId: string;
  /** 화자 역할 설명 (한국어) */
  roles: { A: string; B: string; C?: string };
  /** 화자별 목소리 */
  voices: { A: PercakapanGender; B: PercakapanGender; C?: PercakapanGender };
  /** 난이도 */
  level: PercakapanLevel;
  /** 대화 본문 */
  lines: PercakapanLine[];
  /** 사용자가 만든 회화집이면 true (기본 제공본은 undefined) */
  custom?: boolean;
  /**
   * 기본 장면의 인도네시아어 대사를 고친 횟수 표시 (2부터). 소리 캐시 키에 섞여서
   * 고치기 전 소리가 계속 나오지 않게 합니다 (src/lib/percakapanAudio.ts). 처음 쓴 장면은 비워 둡니다.
   */
  rev?: number;
  /** 생성 시각 (사용자 생성본만) */
  createdAt?: number;
}

/** 카테고리 */
export interface PercakapanCategory {
  id: string;
  /** 한국어 이름 */
  title: string;
  /** 인도네시아어 이름 */
  titleId: string;
  emoji: string;
  /** 사용자가 추가한 카테고리면 true */
  custom?: boolean;
  /**
   * 공개판에서는 staff 등급(Special Member·관리자)에게만 보이는 카테고리면 true.
   * 관리자판·회원판은 등급이 늘 "admin" 이라 그대로 보입니다 (src/lib/plan.ts).
   */
  staffOnly?: boolean;
}
