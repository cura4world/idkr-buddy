// src/components/LockTitle.tsx
// 잠금 제목 "…는 Plus 회원 기능입니다" 의 뒷부분 "Plus 회원 기능입니다"를 한 덩어리로 그립니다(2026-11-25 Arga 승인 ⑤).
// 예전에는 "02 단어장부터는 Plus 회원 / 기능입니다"처럼 어색하게 나뉘었습니다. 이제 자리가 모자라면 그 앞에서 줄이 바뀝니다
// → "02 단어장부터는 / Plus 회원 기능입니다". 글자는 바꾸지 않습니다(화면 읽기·검색에도 같은 글).
// 잠금 안내 창(PlusLockSheet)과 Plus 안내 상자(PlusLockBox — 게임방·이야기·이해) 두 곳이 같이 씁니다.

const TAIL = "Plus 회원 기능입니다";

/** [앞부분, "Plus 회원 기능입니다"] — 그 꼴이 아니면 null */
export function splitLockTitle(title: string): [string, string] | null {
  const i = title.lastIndexOf(TAIL);
  if (i <= 0 || i + TAIL.length !== title.length) return null;
  return [title.slice(0, i), TAIL];
}

const LockTitle = ({ text }: { text: string }) => {
  const parts = splitLockTitle(text);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <span data-lock-tail style={{ whiteSpace: "nowrap" }}>{parts[1]}</span>
    </>
  );
};

export default LockTitle;
