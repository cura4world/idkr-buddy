// src/components/BibleDial.tsx
// 성경 읽기 화면 전용 책/장 선택 다이얼 (앞면에서만 사용).
// 위치 필(MAZMUR / 23) 바로 아래에 왼쪽을 맞춰 열리는 좁은 흰 카드입니다.
// 굴려서 찾고(안드로이드 기본 관성 스크롤) 탭해서 확정합니다.
//
// 묵상 화면이 쓰는 BiblePicker.tsx 는 그대로 두었습니다. 이 파일은 별도입니다.
//
// 자리잡기: 위치 필은 overflow-hidden 컨테이너 안에 있어 absolute 로 두면 잘립니다.
// 그래서 fixed 로 화면에 직접 띄우고, 열 때 잰 필의 화면 좌표(anchor)를 받습니다.

import { useEffect, useRef } from "react";
import { BIBLE_BOOKS, getBook } from "@/lib/bible";

// 한 줄 높이(px). 열릴 때 "선택된 항목을 맨 위로" 맞추는 계산에 그대로 쓰이므로
// 아래 행의 h-9 와 반드시 같아야 합니다.
const ROW_H = 36;

// 신약 책이름 색 — 어두운 벽돌빛 주홍.
// 임의값 클래스는 주입 과정에서 빠질 수 있어 인라인 style 로 줍니다.
const NT_COLOR = "#8E2626";
const MAX_H = 444;   // 12줄 + 여유 (한 줄 36px)

export interface DialAnchor {
  left: number; // 필의 왼쪽 변 (화면 좌표)
  top: number;  // 필의 아래 변 (화면 좌표)
}

interface BibleDialProps {
  open: boolean;
  kind: "book" | "chapter";
  anchor: DialAnchor | null;
  currentBookId: string;
  currentChapter: number;
  onClose: () => void;
  onSelect: (bookId: string, chapter: number) => void;
}

const BibleDial = ({
  open,
  kind,
  anchor,
  currentBookId,
  currentChapter,
  onClose,
  onSelect,
}: BibleDialProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const book = getBook(currentBookId);
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === currentBookId);
  const selIndex = kind === "book" ? Math.max(0, bookIndex) : Math.max(0, currentChapter - 1);

  // 열릴 때마다 선택된 항목이 맨 윗줄에 오도록 맞춥니다.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = selIndex * ROW_H;
  }, [open, kind, selIndex]);

  if (!open || !anchor) return null;

  const top = anchor.top + 6;
  // 가로 자리는 누른 필의 왼쪽 변에 맞춥니다.
  // 다만 그대로 두면 필이 오른쪽에 있을 때 상자가 화면 밖으로 밀려 글자가 잘리므로,
  // 오른쪽 끝을 넘지 않도록 한 번 잡아 둡니다.
  const RIGHT_GAP = 12;
  const width = kind === "book" ? 232 : 62;   // 책: 글자 오른쪽 여백 / 장: 숫자만 들어가면 됩니다
  const maxLeft = window.innerWidth - width - RIGHT_GAP;
  const left = Math.max(8, Math.min(anchor.left, maxLeft));
  // 화면 아래로 넘치지 않게 자릅니다 (아래 여백 16px 확보).
  const maxHeight = Math.max(ROW_H * 3, Math.min(MAX_H, window.innerHeight - top - 16));

  const chapters = book ? book.chapters : 1;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 어둠막 — 필 아래에서 시작해 서서히 진해집니다. 필과 헤더는 밝게 남습니다.
          이 막이 곧 "바깥 탭 = 닫기" 영역입니다. */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          top: anchor.top,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0.2) 64px, rgba(0,0,0,0.2) 100%)",
        }}
      />

      <div
        className="absolute rounded-2xl bg-card shadow-xl overflow-hidden"
        style={{ left, top, width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrollRef}
          className="no-scrollbar overflow-y-auto"
          style={{
            maxHeight,
            // 스냅은 쓰지 않습니다. 관성으로 돌아가는 도중에 가장 가까운 줄로 끌어당겨
            // 세워버려서 "부드럽게 감속하다 멈춤"이 죽습니다. 기본 플링에 맡깁니다.
            touchAction: "pan-y",
            overscrollBehavior: "contain",
            // 스크롤 영역을 별도 레이어로 올려 카드 그림자와 함께 다시 그려지지 않게 합니다.
            transform: "translateZ(0)",
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          {kind === "book"
            ? BIBLE_BOOKS.map((b, i) => {
                const on = i === selIndex;
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b.id, 1)}
                    className={`w-full h-9 flex items-baseline gap-1.5 text-left pl-3.5 pr-5 whitespace-nowrap active:bg-black/5 ${
                      on ? "bg-sky-500/10" : ""
                    }`}
                  >
                    <span
                      className={`font-word font-semibold ${
                        on
                          ? "text-[15px] text-sky-600"
                          : b.folder === "pb"
                          ? "text-sm"
                          : "text-sm text-teal-700"
                      }`}
                      style={!on && b.folder === "pb" ? { color: NT_COLOR } : undefined}
                    >
                      {b.idName}
                    </span>
                    {/* 고른 책도 한국어 이름을 같이 보입니다 (골라 놓고 무슨 책인지 안 보이면 곤란) */}
                    <span className={`font-gothic ${on ? "text-[13px] text-sky-600" : "text-xs text-gray-600"}`}>
                      {b.ko}
                    </span>
                  </button>
                );
              })
            : Array.from({ length: chapters }, (_, i) => i + 1).map((ch) => {
                const on = ch === currentChapter;
                return (
                  <button
                    key={ch}
                    onClick={() => onSelect(currentBookId, ch)}
                    className={`w-full h-9 flex items-center justify-center text-center px-2 whitespace-nowrap active:bg-black/5 ${
                      on ? "bg-sky-500/10" : ""
                    }`}
                  >
                    <span
                      className={`font-gothic ${
                        on ? "text-[15px] font-semibold text-sky-600" : "text-sm text-gray-800"
                      }`}
                    >
                      {ch}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default BibleDial;
