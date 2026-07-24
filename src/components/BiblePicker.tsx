// src/components/BiblePicker.tsx
// 성경 책·장 선택 시트 (묵상 페이지와 성경 읽기 페이지에서 공용).
// 폭은 가장 긴 이름(데살로니가후서) 기준으로 좁게(w-64) 고정, 화면 중앙 하단에 표시.
// 책 목록: 구약(청록) / 신약(파랑) 색 구분. 책을 고르면 장 목록으로 넘어가고,
// 장을 고르면 onSelect(bookId, chapter)를 호출한 뒤 닫힙니다.

import { useState, useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { BIBLE_BOOKS, getBook } from "@/lib/bible";

interface BiblePickerProps {
  open: boolean;
  currentBookId?: string;
  currentChapter?: number;
  onClose: () => void;
  onSelect: (bookId: string, chapter: number) => void;
}

const BiblePicker = ({ open, currentBookId, currentChapter, onClose, onSelect }: BiblePickerProps) => {
  // 장 선택 단계로 넘어간 책 (null이면 책 목록 단계)
  const [stageBookId, setStageBookId] = useState<string | null>(null);

  // 열릴 때마다 책 목록 단계부터 시작
  useEffect(() => {
    if (open) setStageBookId(null);
  }, [open]);

  if (!open) return null;

  const stageBook = stageBookId ? getBook(stageBookId) : undefined;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 max-w-[85vw] bg-card rounded-t-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!stageBook ? (
          <>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2 shrink-0">
              <p className="text-sm font-semibold text-gray-900">성경 선택</p>
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto px-2 pb-6" style={{ WebkitOverflowScrolling: "touch" as any }}>
              <p className="text-[11px] font-gothic font-semibold text-teal-600 px-2 pt-2 pb-1">
                구약 Perjanjian Lama
              </p>
              {BIBLE_BOOKS.filter((b) => b.folder === "pl").map((b) => (
                <button
                  key={b.id}
                  onClick={() => setStageBookId(b.id)}
                  className={`w-full flex items-baseline gap-1.5 text-left px-2 py-2 rounded-lg active:bg-black/5 ${
                    b.id === currentBookId ? "bg-sky-500/10" : ""
                  }`}
                >
                  <span className="text-sm font-word font-semibold text-teal-700 whitespace-nowrap">{b.idName}</span>
                  <span className="text-xs font-gothic text-gray-600 whitespace-nowrap">{b.ko}</span>
                </button>
              ))}
              <p className="text-[11px] font-gothic font-semibold text-blue-600 px-2 pt-3 pb-1">
                신약 Perjanjian Baru
              </p>
              {BIBLE_BOOKS.filter((b) => b.folder === "pb").map((b) => (
                <button
                  key={b.id}
                  onClick={() => setStageBookId(b.id)}
                  className={`w-full flex items-baseline gap-1.5 text-left px-2 py-2 rounded-lg active:bg-black/5 ${
                    b.id === currentBookId ? "bg-sky-500/10" : ""
                  }`}
                >
                  <span className="text-sm font-word font-semibold text-blue-700 whitespace-nowrap">{b.idName}</span>
                  <span className="text-xs font-gothic text-gray-600 whitespace-nowrap">{b.ko}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="px-4 pt-4 pb-2 flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setStageBookId(null)}
                className="w-8 h-8 -ml-2 rounded-full text-gray-500 flex items-center justify-center"
                title="책 목록으로"
              >
                <ChevronLeft size={17} />
              </button>
              <p className="text-sm font-semibold text-gray-900 min-w-0 truncate">
                <span className="font-word">{stageBook.idName}</span>{" "}
                <span className="font-gothic text-gray-500 text-xs">{stageBook.ko}</span>
              </p>
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center shrink-0"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto px-2 pb-6" style={{ WebkitOverflowScrolling: "touch" as any }}>
              {Array.from({ length: stageBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  onClick={() => onSelect(stageBook.id, ch)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-gothic active:bg-black/5 ${
                    stageBook.id === currentBookId && ch === currentChapter
                      ? "bg-sky-500/10 text-sky-700 font-semibold"
                      : "text-gray-800"
                  }`}
                >
                  {ch}장
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BiblePicker;
