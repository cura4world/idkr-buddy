// 단어장 아이콘 저장 형태: 새 "icon:<이름>:<색키>" 와 옛 이모지가 둘 다 바르게 읽히는지.

import { describe, expect, it } from "vitest";
import {
  CATEGORY_FAITH_ICON_NAMES,
  CATEGORY_ICON_NAMES,
  TILE_COLORS,
  categoryIconText,
  makeCategoryIcon,
  parseCategoryIcon,
  tileColorOf,
} from "@/lib/categoryIcon";

describe("parseCategoryIcon", () => {
  it("새 형태: icon:BookOpen:sky → 아이콘 + 색", () => {
    expect(parseCategoryIcon("icon:BookOpen:sky")).toEqual({ kind: "icon", name: "BookOpen", color: "sky" });
  });

  it("만든 문자열을 다시 읽으면 같은 값", () => {
    const s = makeCategoryIcon("Gamepad2", "violet");
    expect(s).toBe("icon:Gamepad2:violet");
    expect(parseCategoryIcon(s)).toEqual({ kind: "icon", name: "Gamepad2", color: "violet" });
  });

  it("옛 이모지는 이모지 그대로", () => {
    expect(parseCategoryIcon("📚")).toEqual({ kind: "emoji", text: "📚" });
    expect(parseCategoryIcon("✈️")).toEqual({ kind: "emoji", text: "✈️" });
    expect(parseCategoryIcon("⭐")).toEqual({ kind: "emoji", text: "⭐" });
  });

  it("빈 값·undefined 는 📁", () => {
    expect(parseCategoryIcon("")).toEqual({ kind: "emoji", text: "📁" });
    expect(parseCategoryIcon(undefined)).toEqual({ kind: "emoji", text: "📁" });
    expect(parseCategoryIcon(null)).toEqual({ kind: "emoji", text: "📁" });
  });

  it("색 키가 없거나 모르는 값이면 청록", () => {
    expect(parseCategoryIcon("icon:Heart")).toEqual({ kind: "icon", name: "Heart", color: "teal" });
    expect(parseCategoryIcon("icon:Heart:neon")).toEqual({ kind: "icon", name: "Heart", color: "teal" });
  });

  it("이름이 빈 icon: 은 이모지(글자 그대로)로 둔다", () => {
    expect(parseCategoryIcon("icon:")).toEqual({ kind: "emoji", text: "icon:" });
    expect(parseCategoryIcon("icon::sky")).toEqual({ kind: "emoji", text: "icon::sky" });
  });

  it("앞뒤 공백은 무시", () => {
    expect(parseCategoryIcon("  icon:Star:yellow ")).toEqual({ kind: "icon", name: "Star", color: "yellow" });
  });

  it("categoryIconText: 이모지면 글자, 아이콘이면 빈 문자열", () => {
    expect(categoryIconText("📚")).toBe("📚");
    expect(categoryIconText("icon:BookOpen:teal")).toBe("");
  });
});

describe("고르기 목록", () => {
  it("공부 주제 아이콘 30개 안팎, 중복 없음", () => {
    expect(CATEGORY_ICON_NAMES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(CATEGORY_ICON_NAMES).size).toBe(CATEGORY_ICON_NAMES.length);
  });

  it("기독교 아이콘은 일반 목록에 없다", () => {
    for (const n of CATEGORY_FAITH_ICON_NAMES) expect(CATEGORY_ICON_NAMES).not.toContain(n);
  });

  it("색은 6가지, 모두 바탕·선 색이 있고 모르는 키는 첫 색", () => {
    expect(TILE_COLORS.length).toBe(6);
    for (const c of TILE_COLORS) {
      expect(c.bg).toMatch(new RegExp("^#[0-9A-Fa-f]{6}$"));
      expect(c.ink).toMatch(new RegExp("^#[0-9A-Fa-f]{6}$"));
    }
    expect(tileColorOf("nope").key).toBe("teal");
  });
});
