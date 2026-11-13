// 새 아이콘 저장 형태("icon:<이름>:<색키>")가 CSV 백업·복원을 거쳐도 그대로이고, 옛 이모지 단어장도 함께 되살아나는지.

import { beforeEach, describe, expect, it } from "vitest";
import { addCategory, addWord, exportWordsToCSV, getCategories, importWordsFromCSV, updateCategory } from "@/lib/store";
import { parseCategoryIcon } from "@/lib/categoryIcon";

beforeEach(() => {
  localStorage.clear();
});

describe("단어장 아이콘 — 저장·CSV 백업·복원", () => {
  it("새 아이콘과 옛 이모지가 함께 있는 데이터를 내보냈다가 가져와도 값이 그대로", () => {
    const travel = addCategory("여행 표현", "icon:Plane:pink");
    const legacy = addCategory("옛 이모지 단어장", "✈️");
    addWord({ word: "bandara", meaning: "공항", example: "", exampleMeaning: "", categoryId: travel.id });
    addWord({ word: "kopi", meaning: "커피", example: "", exampleMeaning: "", categoryId: legacy.id });

    const { csv } = exportWordsToCSV();
    expect(csv).toContain("icon:Plane:pink");

    localStorage.clear();
    const res = importWordsFromCSV(csv);
    // 내보내기에는 앱 기본 단어도 함께 들어 있어 2개보다 많습니다
    expect(res.imported).toBeGreaterThanOrEqual(2);

    const cats = getCategories();
    const t = cats.find((c) => c.name === "여행 표현");
    const l = cats.find((c) => c.name === "옛 이모지 단어장");
    expect(t && t.emoji).toBe("icon:Plane:pink");
    expect(l && l.emoji).toBe("✈️");
    expect(parseCategoryIcon(t!.emoji)).toEqual({ kind: "icon", name: "Plane", color: "pink" });
    expect(parseCategoryIcon(l!.emoji)).toEqual({ kind: "emoji", text: "✈️" });
  });

  it("이름 바꾸기로 옛 이모지를 새 아이콘으로 바꿔도 단어는 그대로", () => {
    const c = addCategory("음식", "🍜");
    addWord({ word: "nasi", meaning: "밥", example: "", exampleMeaning: "", categoryId: c.id });
    updateCategory(c.id, "음식과 식당", "icon:Utensils:yellow");
    const after = getCategories().find((x) => x.id === c.id);
    expect(after && after.name).toBe("음식과 식당");
    expect(after && after.emoji).toBe("icon:Utensils:yellow");
  });
});
