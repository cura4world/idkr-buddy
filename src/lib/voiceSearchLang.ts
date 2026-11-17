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

// 예전 마이크 옆 "?" 토글(withQuestionMark, 2026-11-16)은 2026-11-17 Arga 요청으로 없앴습니다.
// 음성 인식은 억양을 넘겨주지 않아 "이미 돈을 냈어요?"도 물음표 없이 들어오므로,
// 이제는 말끝이 애매한 한국어 문장이면 사전 결과가 평서문·의문문을 함께 보여 줍니다(lib/dictionary.ts koQuestionAmbiguous).
