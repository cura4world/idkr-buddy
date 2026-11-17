// src/components/DailyCardImage.tsx
// 오늘의 카드 그림 한 장 — 이 기기에 두었으면 바로, 없으면 서버에서 한 번 받습니다(lib/dailyCard.ts).
// 그림이 없는 카드(서버가 그림을 만들지 못한 날)나 받지 못한 때는 크림 바탕에 작은 전구를 보입니다.

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { loadCardImageUrl } from "@/lib/dailyCard";

interface Props {
  d: string;
  has: boolean; // 서버에 그림이 있는가 (카드의 img)
  size: number; // 한 변(px)
  rounded?: number;
}

const DailyCardImage = ({ d, has, size, rounded = 12 }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (has) {
      loadCardImageUrl(d).then((u) => {
        if (!alive) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        made = u;
        setUrl(u);
      });
    }
    return () => {
      alive = false;
      if (made) {
        try { URL.revokeObjectURL(made); } catch (e) {}
      }
    };
  }, [d, has]);

  const box = { width: size, height: size, borderRadius: rounded };
  if (url) {
    return <img src={url} alt="" className="block shrink-0 object-cover" style={box} draggable={false} />;
  }
  return (
    <span className="shrink-0 flex items-center justify-center bg-[#F6EEDD]" style={box} aria-hidden="true">
      <Lightbulb size={Math.round(size * 0.32)} strokeWidth={1.6} className="text-[#C9A96A]" />
    </span>
  );
};

export default DailyCardImage;
