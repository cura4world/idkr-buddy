import CategoryDetail from "@/pages/CategoryDetail";

/* 공개판 하단 탭 "내 단어장"(/saved) — 시안 W1 "내 단어장 · 추천안".
   홈에서 내 단어장을 눌렀을 때의 화면(/category/my-wordbook)을 탭 뿌리로 그대로 씁니다
   (결정 문서: 하단 내 단어장 탭은 지금 홈에서 내 단어장을 눌렀을 때의 화면으로 바로 갑니다).
   탭 뿌리라 뒤로가기 화살표가 없고, 화면 높이는 탭 막대만큼 줄입니다. 탭 막대는 BottomTabs 가 붙입니다.

   예전 이 자리의 "단어보관함"(다시 외울 표시 단어 목록)은 앱 어디에서도 들어오는 길이 없어
   이 화면으로 바꿨습니다. 표시한 단어는 카드로 외우기의 리본 버튼으로 모아 볼 수 있습니다. */

const MY_WORDBOOK_ID = "my-wordbook";

export default function SavedWords() {
  return <CategoryDetail fixedId={MY_WORDBOOK_ID} asTab />;
}
