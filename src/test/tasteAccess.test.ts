// 무료 맛보기 범위 (2026-11-23 7일 체험 폐지 → 메뉴별 맛보기)
import { describe, expect, it } from "vitest";
import { canOpenScene, canOpenWordbook, isTasteScene, isTasteWordbook, TASTE_SCENE_ID } from "@/lib/tasteAccess";
import { DASAR } from "@/data/percakapan/01-dasar";

describe("맛보기 단어장", () => {
  const w01 = { name: "01 인사·기본 표현", isShared: true };
  const w02 = { name: "02 숫자·시간", isShared: true };
  const mine = { name: "01 내가 만든 것", isShared: false };
  const priv = { name: "01 개인 폴더", isShared: true, owner: "arga" };

  it("01 인사·기본 표현만 맛보기", () => {
    expect(isTasteWordbook(w01)).toBe(true);
    expect(isTasteWordbook(w02)).toBe(false);
    expect(isTasteWordbook(mine)).toBe(false);
    expect(isTasteWordbook(priv)).toBe(false);
  });

  it("무료는 01 과 내가 만든 단어장만, Plus 는 모두", () => {
    expect(canOpenWordbook(w01, false)).toBe(true);
    expect(canOpenWordbook(w02, false)).toBe(false);
    expect(canOpenWordbook(mine, false)).toBe(true);
    expect(canOpenWordbook(w02, true)).toBe(true);
    expect(canOpenWordbook(null, true)).toBe(false);
  });
});

describe("맛보기 회화 장면", () => {
  it("맛보기 장면 id 가 실제 '인사와 기본'의 첫 장면(처음 만나 인사)이다", () => {
    expect(DASAR[0].id).toBe(TASTE_SCENE_ID);
    expect(DASAR[0].title).toBe("처음 만나 인사");
    expect(DASAR[0].cat).toBe("dasar");
  });

  it("무료는 맛보기 장면과 내가 만든 장면만, Plus 는 모두", () => {
    expect(isTasteScene("dasar-kenalan")).toBe(true);
    expect(canOpenScene({ id: "dasar-kenalan" }, false)).toBe(true);
    expect(canOpenScene({ id: DASAR[1].id }, false)).toBe(false);
    expect(canOpenScene({ id: "x", custom: true }, false)).toBe(true);
    expect(canOpenScene({ id: DASAR[1].id }, true)).toBe(true);
  });
});
