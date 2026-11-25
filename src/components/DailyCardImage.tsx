// src/components/DailyCardImage.tsx
// 오늘의 카드 그림 한 장 — 이 기기에 두었으면 바로, 없으면 서버에서 한 번 받습니다(lib/dailyCard.ts).
// 그림이 없는 카드(서버가 그림을 만들지 못한 날)나 받지 못한 때는 크림 바탕에 작은 전구를 보입니다.
//
// 작은 그림(한 변 THUMB_MAX px 이하 — 지난 카드 목록·카드 안쪽의 지난 카드 3장)은 작게 줄인 그림을 쓰고(2026-11-25),
// 화면 가까이 왔을 때만 받습니다. 1년 치 목록(최대 365줄)을 열어도 보이는 몇 장만 받게 하려는 것입니다.

import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { loadCardImageUrl, loadCardThumbUrl } from "@/lib/dailyCard";

const EDGE_FADE = "radial-gradient(closest-side, #000 80%, transparent 100%)";
const THUMB_MAX = 72;

interface Props {
  d: string;
  has: boolean; // 서버에 그림이 있는가 (카드의 img)
  size: number; // 한 변(px)
  rounded?: number;
}

const DailyCardImage = ({ d, has, size, rounded = 12 }: Props) => {
  const thumb = size <= THUMB_MAX;
  const [url, setUrl] = useState<string | null>(null);
  const [near, setNear] = useState(!thumb);
  const holderRef = useRef<HTMLSpanElement | null>(null);

  // 작은 그림은 화면 가까이(위아래 400px) 왔을 때부터 받습니다
  useEffect(() => {
    if (!thumb || near || !has) return;
    const el = holderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [thumb, near, has]);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (has && near) {
      (thumb ? loadCardThumbUrl(d) : loadCardImageUrl(d)).then((u) => {
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
  }, [d, has, near, thumb]);

  const box = { width: size, height: size, borderRadius: rounded };
  if (url) {
    // 그림 바탕(크림)이 날마다 조금씩 다르고 JPEG 라 가장자리에 얼룩이 있습니다. 바깥 둘레를 흐리게 지워
    // 카드 바탕(#F9F2E1)에 녹아들게 합니다 — 네모난 그림을 붙인 티가 나지 않게(2026-11-18 사용자 요청).
    // 그림은 가운데에 있으므로(서버 그림 지시: 가운데 사물 하나) 안쪽 80% 는 그대로 보입니다.
    const style = { ...box, maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE };
    return <img src={url} alt="" className="block shrink-0 object-cover" style={style} draggable={false} />;
  }
  return (
    <span ref={holderRef} className="shrink-0 flex items-center justify-center bg-[#F6EEDD]" style={box} aria-hidden="true">
      <Lightbulb size={Math.round(size * 0.32)} strokeWidth={1.6} className="text-[#C9A96A]" />
    </span>
  );
};

export default DailyCardImage;
