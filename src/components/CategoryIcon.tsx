// src/components/CategoryIcon.tsx
// 단어장 아이콘을 그리는 한 곳 (2026-11-13). Category.emoji 칸의 값을 읽어
//   "icon:<이름>:<색키>" → lucide 선 아이콘 + 고른 색 타일
//   그 밖(옛 이모지) → 이모지 그대로(타일 바탕은 부르는 쪽이 정한 색)
// 으로 그립니다. 저장 형태는 lib/categoryIcon.ts 를 보세요.
// 단어장 아이콘을 보여 주는 모든 곳(목록 줄·담을 곳 고르기·옮길 곳 고르기·이름 바꾸기 …)이 이것을 씁니다.

import type { LucideIcon } from "lucide-react";
import {
  Baby, BookOpen, Briefcase, Bus, Calendar, Camera, Church, Clock, CloudRain, Coffee, Cross, Flag, Gamepad2,
  GraduationCap, Hash, Heart, HeartPulse, Home, Languages, Laptop, Leaf, Lightbulb, Luggage, MapPin,
  MessageCircle, Mic, Music, PenLine, Pill, Plane, School, Shirt, ShoppingBag, Star, Sun, Users, Utensils,
} from "lucide-react";
import { DEFAULT_ICON_NAME, parseCategoryIcon, tileColorOf } from "@/lib/categoryIcon";

/** 이름 → 아이콘. 목록(lib/categoryIcon.ts)에 있는 이름은 모두 여기에 있어야 합니다. */
export const CATEGORY_ICON_COMPONENTS: Record<string, LucideIcon> = {
  BookOpen, GraduationCap, PenLine,
  MessageCircle, Languages, Mic,
  Home, Utensils, Coffee, ShoppingBag, Shirt,
  Plane, Bus, MapPin, Luggage,
  Briefcase, School, Laptop,
  HeartPulse, Pill,
  Hash, Clock, Calendar,
  Sun, Leaf, CloudRain,
  Users, Baby,
  Heart, Music, Camera, Gamepad2,
  Star, Lightbulb, Flag,
  Church, Cross,
};

function iconOf(name: string): LucideIcon {
  return CATEGORY_ICON_COMPONENTS[name] || CATEGORY_ICON_COMPONENTS[DEFAULT_ICON_NAME];
}

interface GlyphProps {
  value: string;
  /** 선 아이콘 크기(px). 이모지는 부르는 쪽의 글자 크기를 따릅니다 */
  size?: number;
  /** 색을 정하지 않은 곳(예: 타일 없이 쓸 때)에서 아이콘 색을 바꾸려면 */
  inkOverride?: string;
}

/** 글자(이모지) 또는 선 아이콘만 — 타일 바탕은 그리지 않습니다. */
export function CategoryGlyph({ value, size = 18, inkOverride }: GlyphProps) {
  const p = parseCategoryIcon(value);
  if (p.kind === "emoji") return <span aria-hidden="true">{p.text}</span>;
  const Icon = iconOf(p.name);
  return <Icon size={size} strokeWidth={1.8} color={inkOverride || tileColorOf(p.color).ink} aria-hidden="true" />;
}

interface TileProps {
  value: string;
  /** 이모지일 때의 타일 바탕색(아이콘이면 고른 색을 씁니다) */
  fallbackBg?: string;
  /** 타일 크기·모서리 등 (예: "w-10 h-10 rounded-xl") */
  className?: string;
  /** 선 아이콘 크기(px) */
  iconSize?: number;
  /** 이모지 글자 크기 클래스 (예: "text-[1.1875rem]") */
  emojiClassName?: string;
}

/** 색 타일 + 아이콘(또는 이모지) 한 덩어리. */
export function CategoryTile({ value, fallbackBg = "#EEF1F3", className = "w-10 h-10 rounded-xl", iconSize = 20, emojiClassName = "text-[1.1875rem]" }: TileProps) {
  const p = parseCategoryIcon(value);
  if (p.kind === "emoji") {
    return (
      <span
        className={"shrink-0 flex items-center justify-center leading-none " + emojiClassName + " " + className}
        style={{ background: fallbackBg }}
      >
        {p.text}
      </span>
    );
  }
  const color = tileColorOf(p.color);
  const Icon = iconOf(p.name);
  return (
    <span className={"shrink-0 flex items-center justify-center " + className} style={{ background: color.bg }}>
      <Icon size={iconSize} strokeWidth={1.8} color={color.ink} aria-hidden="true" />
    </span>
  );
}

export default CategoryTile;
