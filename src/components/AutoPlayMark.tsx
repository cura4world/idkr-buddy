// src/components/AutoPlayMark.tsx
// 카드 학습 아랫줄 "무작위 자동 재생" 단추 오른쪽 아래의 작은 재생 표시(2026-11-25 Arga 승인 ③).
// 윗줄 "카드 순서 섞기"와 같은 섞기 그림이라 구분하려고 붙입니다. 지름 16px, 바탕 #2C6D63, 흰 재생 아이콘,
// 단추 테두리 바깥으로 살짝(-2px) 걸칩니다. 재생 중(정지 그림)에는 부르는 쪽이 그리지 않습니다.
// 단추에 relative 가 있어야 합니다. StudyMode·SavedStudyMode 가 같이 씁니다.

import { Play } from "lucide-react";

const AutoPlayMark = () => (
  <span
    aria-hidden="true"
    data-autoplay-mark
    className="absolute flex items-center justify-center rounded-full pointer-events-none"
    style={{ right: -2, bottom: -2, width: 16, height: 16, background: "#2C6D63" }}
  >
    <Play size={9} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} style={{ marginLeft: 1 }} />
  </span>
);

export default AutoPlayMark;
