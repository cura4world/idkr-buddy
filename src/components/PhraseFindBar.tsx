// src/components/PhraseFindBar.tsx
// 본문에서 표현을 고르면 화면 아래에 뜨는 "찾기" 버튼.
// OS 기본 복사 메뉴는 고른 자리 근처에 뜨므로 서로 가리지 않습니다.

import { Search } from "lucide-react";

interface Props {
  /** 고른 표현. 빈 문자열이면 아무것도 그리지 않습니다 */
  phrase: string;
  onFind: () => void;
  /** 팝업·시트가 열려 있을 때처럼 잠시 감출 때 */
  hidden?: boolean;
  /** 그 화면의 가로 폭 클래스 (없으면 max-w-lg) */
  widthClass?: string;
}

export default function PhraseFindBar({ phrase, onFind, hidden, widthClass }: Props) {
  if (!phrase || hidden) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-6 pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent">
      <button
        onClick={onFind}
        className={
          "pointer-events-auto w-full " +
          (widthClass || "max-w-lg") +
          " mx-auto flex items-center justify-center gap-2 rounded-full bg-primary text-white py-3 text-sm font-medium shadow-lg"
        }
      >
        <Search size={15} className="shrink-0" />
        <span className="truncate font-word">{phrase}</span>
        <span className="shrink-0 font-gothic">찾기</span>
      </button>
    </div>
  );
}
