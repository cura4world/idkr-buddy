// src/components/MedaliBadge.tsx
// Medali 명찰 캡슐 — 불꽃(이번 주 노력) + 별(누적 실력)을 색으로만 보여준다.
// 메인 헤더의 어두운 teal 배경 위에 올라간다. 숫자·글자는 없다.
// 첫 렌더는 localStorage 캐시 색으로 즉시 칠하고(깜빡임 방지), 마운트 후 IndexedDB에서 다시 계산한다.

import { useState, useEffect } from "react";
import { Flame, Star } from "lucide-react";
import { medaliEngine, loadMedaliCache, MEDALI_COLORS, MedaliColor } from "@/lib/medali";

// 아이콘 외곽선 — 어두운 헤더 위에서 훈장 모양이 묻히지 않게 하는 최소한의 밝기
const STROKE = "rgba(255,255,255,0.55)";

interface BadgeView {
  apiColor: MedaliColor;
  bintangColor: MedaliColor;
}

interface Props {
  onClick?: () => void;   // 없으면 눌러도 아무 일도 일어나지 않습니다
}

export default function MedaliBadge({ onClick }: Props) {
  const [view, setView] = useState<BadgeView>(() => {
    const c = loadMedaliCache();
    return { apiColor: c.apiColor, bintangColor: c.bintangColor };
  });

  useEffect(() => {
    const off = medaliEngine.subscribe((s) => {
      setView({ apiColor: s.apiColor, bintangColor: s.bintangColor });
    });
    medaliEngine.refresh();
    return off;
  }, []);

  const api = MEDALI_COLORS[view.apiColor];
  const bintang = MEDALI_COLORS[view.bintangColor];

  return (
    <button
      type="button"
      title="Medali"
      onClick={onClick}
      className="h-8 px-3 rounded-full flex items-center gap-1.5 bg-white/15 border border-white/20 shrink-0"
    >
      {/* 어두운 단계(Tanah)에서도 실루엣이 보이도록 면은 훈장 색, 테두리는 옅은 흰색 */}
      <Flame size={18} color={STROKE} fill={api} strokeWidth={1.5} />
      <span className="w-px h-4 bg-white/30" aria-hidden="true" />
      <Star size={17} color={STROKE} fill={bintang} strokeWidth={1.5} />
    </button>
  );
}
