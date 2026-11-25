// src/lib/kataHariIniHelp.ts
// 오늘의 단어 퍼즐(Kata Hari Ini) "게임 방법" 창의 문구 — 문구는 여기 한 곳에서만 고칩니다(2026-11-25).
// 예시 줄의 색은 실제 채점 함수(kataHariIni.scoreGuess)로 칠하므로, 여기에는 글자만 둡니다.
// (다음 단계 ②에서 도움말 한 줄을 더하고 셋째 줄을 바꿀 예정)

export const KATA_HELP = {
  title: "게임 방법",
  lead: "한 줄에 단어 하나를 넣습니다. 여섯 줄은 여섯 번의 기회입니다. 색 단서를 보고 다음 줄에 다시 써서 맞혀 보세요.",
  example: {
    caption: "예) 정답이 RUMAH(집)일 때",
    answer: "rumah",
    rows: ["merah", "rumah"],
    solvedNote: "정답!",
  },
  colors: [
    { mark: "hit" as const, name: "초록", text: "글자도 자리도 맞아요" },
    { mark: "near" as const, name: "노랑", text: "단어에 있지만 자리가 달라요" },
    { mark: "miss" as const, name: "회색", text: "단어에 없는 글자예요" },
  ],
  tips: [
    "막히면 “뜻 힌트”로 정답의 뜻을 볼 수 있음",
    "아래 자판도 색이 바뀌어 써 본 글자를 알 수 있음",
    "정답은 한국 시간 자정마다 바뀌며, 모두에게 같은 문제가 나옴",
  ],
};
