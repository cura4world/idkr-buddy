// 백업 묶음에 불러온 이야기·만든 회화집이 세어지고 읽히는지, 마지막 백업 시각이 기록되는지 (2026-11-14 출시 전 점검 D-01·D-03).
// (이 테스트 환경에는 IndexedDB 가 없어 실제 담기·되돌리기 왕복은 개발 서버에서 따로 확인합니다.)

import { beforeEach, describe, expect, it } from "vitest";
import {
  describeSummary, getBackupFileSavedAt, markBackupFileSaved, parseBackupText, PersonalBundle, summarize,
} from "@/lib/transfer";

function bundleWith(idb: PersonalBundle["idb"]): PersonalBundle {
  return {
    app: "kata-kata", kind: "personal-backup", v: 1, createdAt: 1,
    words: { categories: [], words: [], saved: [] }, ls: {}, idb,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("백업 묶음 — 이야기·만든 회화집", () => {
  it("묶음에 든 이야기와 만든 회화 장면을 세고 요약에 적는다", () => {
    const b = bundleWith({
      "kata-stories": { stories: [{ id: "s1" }, { id: "s2" }] },
      "kata-percakapan": { scenes: [{ id: "custom-1", cat: "c1" }], cats: [{ id: "c1" }] },
    });
    const s = summarize(b);
    expect(s.stories).toBe(2);
    expect(s.scenes).toBe(1);
    const text = describeSummary(s);
    expect(text).toContain("이야기 2편");
    expect(text).toContain("만든 회화 1개");
  });

  it("이야기·회화가 없는 예전 묶음도 그대로 읽히고 요약에 그 말이 나오지 않는다", () => {
    const old = bundleWith({});
    const parsed = parseBackupText(JSON.stringify(old));
    expect(parsed).not.toBeNull();
    const text = describeSummary(summarize(parsed as PersonalBundle));
    expect(text).not.toContain("이야기");
    expect(text).not.toContain("만든 회화");
  });

  it("이야기가 든 묶음을 글로 바꿨다가 다시 읽어도 그대로", () => {
    const b = bundleWith({ "kata-stories": { stories: [{ id: "s1", title: "Pasar pagi", createdAt: 5 }] } });
    const parsed = parseBackupText(JSON.stringify(b)) as PersonalBundle;
    expect(parsed.idb["kata-stories"].stories).toEqual([{ id: "s1", title: "Pasar pagi", createdAt: 5 }]);
  });
});

describe("마지막 백업 시각", () => {
  it("한 적이 없으면 0, 저장하면 그 시각", () => {
    expect(getBackupFileSavedAt()).toBe(0);
    const before = Date.now();
    markBackupFileSaved();
    expect(getBackupFileSavedAt()).toBeGreaterThanOrEqual(before);
  });
});
