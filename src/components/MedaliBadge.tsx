// src/components/MedaliBadge.tsx
// Medali 명찰 캡슐 — 불꽃(이번 주 노력) + 별(누적 실력)을 색으로만 보여준다.
// 메인 헤더의 어두운 teal 배경 위에 올라간다. 숫자·글자는 없다.
// 첫 렌더는 localStorage 캐시 색으로 즉시 칠하고(깜빡임 방지), 마운트 후 IndexedDB에서 다시 계산한다.

import { useState, useEffect } from "react";
import { Flame, Star } from "lucide-react";
import { medaliEngine, loadMedaliCache, MEDALI_COLORS, MedaliColor } from "@/lib/medali";

interface BadgeView {
  apiColor: MedaliColor;
  bintangColor: MedaliColor;
}

export default function MedaliBadge() {
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
      className="h-[30px] px-2.5 rounded-full flex items-center gap-1.5 bg-white/10 shrink-0"
    >
      <Flame size={16} color={api} fill={api} />
      <span className="w-px h-3.5 bg-white/25" aria-hidden="true" />
      <Star size={15} color={bintang} fill={bintang} />
    </button>
  );
}
