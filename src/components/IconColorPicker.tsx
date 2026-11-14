// src/components/IconColorPicker.tsx
// 단어장 아이콘·색 고르기 (단어장 만들기 · 이름 바꾸기가 함께 씁니다, 2026-11-13).
// 색 6가지(옅은 타일) 위에 선 아이콘 목록. 고른 값은 "icon:<이름>:<색키>" 문자열로 올려 보냅니다(lib/categoryIcon.ts).
// 옛 이모지 단어장을 고치는 중이면 아이콘을 아직 고르지 않은 상태로 시작하고, 아이콘을 고르는 순간 새 형태로 바뀝니다.
// 기독교 아이콘(교회·십자가)은 관리자·Special Member 에게만 목록에 보입니다.

import { useState } from "react";
import { Check } from "lucide-react";
import {
  CATEGORY_FAITH_ICON_NAMES, CATEGORY_ICON_NAMES, TILE_COLORS, TileColorKey,
  makeCategoryIcon, parseCategoryIcon, tileColorOf,
} from "@/lib/categoryIcon";
import { usePlan } from "@/lib/plan";
import { CATEGORY_ICON_COMPONENTS } from "@/components/CategoryIcon";
import { FormLabel } from "@/components/FormSheet";

interface Props {
  /** 지금 값(Category.emoji 칸의 문자열: 새 "icon:…" 또는 옛 이모지) */
  value: string;
  onChange: (next: string) => void;
}

export default function IconColorPicker({ value, onChange }: Props) {
  const { staff } = usePlan();
  const parsed = parseCategoryIcon(value);
  const [color, setColor] = useState<TileColorKey>(parsed.kind === "icon" ? parsed.color : "teal");
  const names = staff ? CATEGORY_ICON_NAMES.concat(CATEGORY_FAITH_ICON_NAMES) : CATEGORY_ICON_NAMES;
  const selectedName = parsed.kind === "icon" ? parsed.name : "";
  const activeColor = tileColorOf(color);

  const pickColor = (key: TileColorKey) => {
    setColor(key);
    if (parsed.kind === "icon") onChange(makeCategoryIcon(parsed.name, key));
  };

  return (
    <>
      <div>
        <FormLabel>색</FormLabel>
        <div className="flex items-center gap-2.5" role="radiogroup" aria-label="타일 색">
          {TILE_COLORS.map((c) => {
            const on = c.key === color;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={c.label}
                onClick={() => pickColor(c.key)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: c.bg, border: on ? "2px solid " + c.ink : "1.5px solid #E3E8EB", color: c.ink }}
              >
                {on ? <Check size={15} strokeWidth={2.6} /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <FormLabel>아이콘</FormLabel>
        <div
          className="grid grid-cols-6 gap-2 overflow-y-auto rounded-[14px] border-[1.5px] border-[#E3E8EB] p-2"
          // 높이를 글자 크기 단위(rem)로 — 세 줄 반이 보여, 아래에 아이콘이 더 있다는 것이 드러납니다.
          // 예전의 176px 고정은 글자를 키우면 정확히 세 줄에서 끊겨 나머지 17개가 없는 것처럼 보였습니다(출시 전 점검 U-10).
          style={{ maxHeight: "11.75rem" }}
          role="listbox"
          aria-label="아이콘"
        >
          {names.map((n) => {
            const Icon = CATEGORY_ICON_COMPONENTS[n];
            if (!Icon) return null;
            const on = n === selectedName;
            return (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={on}
                aria-label={n}
                onClick={() => onChange(makeCategoryIcon(n, color))}
                className="h-11 rounded-xl flex items-center justify-center active:opacity-80"
                style={
                  on
                    ? { background: activeColor.bg, border: "1.5px solid " + activeColor.ink }
                    : { background: "#F6F7F5", border: "1.5px solid transparent" }
                }
              >
                <Icon size={20} strokeWidth={1.8} color={on ? activeColor.ink : "#4D565B"} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
