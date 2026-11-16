// src/lib/voiceSearchLang.ts
// 마이크 음성 검색의 듣기 언어(한국어 / 인도네시아어). 홈과 사전이 같은 값을 씁니다.
// 마이크 옆 "한 / IN" 버튼으로 바꾸고, 기기에 기억합니다(2026-11-11 사용자 요청).

const KEY = "voice-search-lang";

export type VoiceLang = "ko" | "id";

export function loadVoiceLang(): VoiceLang {
  try {
    return localStorage.getItem(KEY) === "id" ? "id" : "ko";
  } catch (e) {
    return "ko";
  }
}

export function saveVoiceLang(v: VoiceLang): void {
  try {
    localStorage.setItem(KEY, v);
  } catch (e) {
    // 저장이 안 돼도 이번 화면에서는 그대로 씁니다
  }
}

/** 버튼에 보일 글자 */
export function voiceLangLabel(v: VoiceLang): string {
  return v === "id" ? "IN" : "한";
}

/**
 * 마이크 옆 "?" 토글(2026-11-16 사용자 요청).
 * 음성 인식은 억양을 넘겨주지 않아 "이미 돈을 냈어요?"도 물음표 없이 들어옵니다.
 * 토글을 켜고 말하면 인식된 문장 끝에 물음표를 붙여 의문문으로 찾습니다.
 * 끝에 이미 물음표·느낌표가 있으면 그대로 두고, 마침표는 물음표로 바꿉니다.
 * 한 번 쓰면 꺼집니다(화면 쪽에서 처리).
 */
export function withQuestionMark(text: string, on: boolean): string {
  const t = text.trim();
  if (!on || !t) return t;
  const last = t.charAt(t.length - 1);
  if (last === "?" || last === "？" || last === "!") return t;
  if (last === ".") return t.slice(0, -1) + "?";
  return t + "?";
}
