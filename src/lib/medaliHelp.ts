// src/lib/medaliHelp.ts
// 훈장(불꽃·별) 설명 문구를 한 곳에 둡니다 — 내 정보의 설명 말풍선과 훈장 팝업(MedaliSheet)이 같이 씁니다.
// 문구를 고칠 때는 여기만 고칩니다(2026-11-24 Arga 승인 문구, "~입니다" 체).
// 실제 규칙은 lib/medali.ts — 문구가 규칙과 어긋나면 문구보다 규칙을 먼저 확인합니다.

import type { MedaliColor } from "@/lib/medali";

export interface MedaliHelpText {
  /** 말풍선 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 색 사다리 아래 회색 한 줄 */
  ladderNote: string;
  /** 설명 단추의 화면 낭독 이름 */
  buttonLabel: string;
}

export const MEDALI_HELP: { api: MedaliHelpText; bintang: MedaliHelpText } = {
  api: {
    title: "이번 주 불꽃 (열정 점수)",
    body:
      "이번 주에 얼마나 꾸준히 공부했는지 보여 주는 점수입니다. " +
      "오늘의 문장, 글 읽기, 단어 공부와 사전 찾기, 게임과 퀴즈, 회화, 인도네시아 이해 둘러보기처럼 앱에서 공부할 때마다 쌓입니다. " +
      "하루에 쌓을 수 있는 양에는 한도가 있어서, 하루에 몰아서 하기보다 매일 조금씩 하는 것이 좋습니다. " +
      "매주 월요일에 0점부터 새로 시작합니다.",
    ladderNote: "점수가 늘수록 불꽃 색이 바뀝니다.",
    buttonLabel: "이번 주 불꽃 설명",
  },
  bintang: {
    title: "모은 별 (암기 성과)",
    body:
      "공부해서 실제로 외운 단어의 수입니다. " +
      "게임과 퀴즈에서 같은 단어를 맞힌 뒤, 3일이 지나 다시 맞히면 확실히 외운 단어가 되어 별이 하나 늘어납니다. " +
      "외운 단어도 가끔 다시 나오고, 그때 연달아 틀리면 별이 하나 줄어 다시 외우게 됩니다.",
    ladderNote: "별이 늘수록 별 색이 바뀝니다.",
    buttonLabel: "모은 별 설명",
  },
};

/** 색 사다리 순서(낮은 것부터)와 한국어 이름 */
export const MEDALI_LADDER: { color: MedaliColor; name: string }[] = [
  { color: "tanah", name: "흙" },
  { color: "perunggu", name: "동" },
  { color: "perak", name: "은" },
  { color: "emas", name: "금" },
  { color: "platina", name: "백금" },
  { color: "permata", name: "보석" },
];
