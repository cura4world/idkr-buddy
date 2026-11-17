// src/components/TodayCard.tsx
// 인도네시아 이해 맨 위의 "오늘의 인도네시아" 카드 (2026-11-17 결정 문서 ⑥, 시안 simple-card).
//   글이 주인공, 그림은 오른쪽에 작게. 카드 바탕(크림)을 그림 바탕과 맞춰 그림이 카드에 녹아들게 합니다.
//   누르면 안쪽 화면(/insight/card/<날짜>). 무료 사용자에게도 카드는 보이고, 누르면 구독 화면으로 갑니다
//   (인도네시아 이해의 다른 메뉴와 같은 방식 — 메뉴는 보이고 열 때 Plus).
//   카드를 받지 못하면(서버에 아직 카드가 없고 이 기기에도 없음) 아무것도 그리지 않습니다.

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import DailyCardImage from "@/components/DailyCardImage";
import { DailyCard, loadTodayCard, kstToday, cardDateLabel } from "@/lib/dailyCard";

interface Props {
  locked: boolean;
  onOpen: (d: string) => void;
  /** 카드 위 구역 제목 (허브의 SectionTitle). 카드가 없으면 제목도 함께 숨깁니다 */
  title: React.ReactNode;
}

const TodayCard = ({ locked, onOpen, title }: Props) => {
  const [card, setCard] = useState<DailyCard | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");

  useEffect(() => {
    let alive = true;
    loadTodayCard().then((c) => {
      if (!alive) return;
      setCard(c);
      setState(c ? "ok" : "none");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "none") return null;

  if (state === "loading" || !card) {
    return (
      <section>
        {title}
        <div
          className="rounded-[18px] bg-[#FBF6EC] h-[118px] animate-pulse"
          style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.06)" }}
          aria-hidden="true"
        />
      </section>
    );
  }

  const isToday = card.d === kstToday();
  return (
    <section>
    {title}
    <button
      type="button"
      onClick={() => onOpen(card.d)}
      className="w-full flex items-center gap-3 rounded-[18px] bg-[#FBF6EC] pl-4 pr-3 py-3.5 text-left active:opacity-90"
      style={{ boxShadow: "0 1px 3px rgba(16,40,50,0.06)" }}
    >
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 mb-1.5">
          {card.chip ? (
            <span className="inline-block font-gothic text-[0.6875rem] leading-none text-[#1E8A99] bg-[#E2F4F6] rounded-full px-2 py-[3px]">
              {card.chip}
            </span>
          ) : null}
          {!isToday ? (
            <span className="font-gothic text-[0.6875rem] text-[#9AA2A7]">{cardDateLabel(card.d)}</span>
          ) : null}
          {locked ? <Lock size={12} strokeWidth={2} className="text-[#A9B0B4]" /> : null}
        </span>
        <span className="block font-gothic text-[1rem] font-bold leading-snug text-foreground break-keep">{card.title}</span>
        <span className="block mt-1 font-gothic text-[0.78125rem] leading-[1.5] text-[#4D575C] break-keep">{card.summary}</span>
        {card.phrase.id ? (
          <span className="block mt-2">
            <span className="block font-word text-[0.8125rem] leading-snug text-[#1E8A99]">{card.phrase.id}</span>
            <span className="block mt-px font-gothic text-[0.71875rem] text-[#7A848A]">{card.phrase.ko}</span>
          </span>
        ) : null}
      </span>
      <DailyCardImage d={card.d} has={card.img} size={84} />
    </button>
    </section>
  );
};

export default TodayCard;
