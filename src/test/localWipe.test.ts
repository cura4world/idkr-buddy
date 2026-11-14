import { describe, it, expect, beforeEach } from "vitest";
import { WIPE_LS_KEYS, wipeLocalStorageStudyData } from "@/lib/localWipe";

// 계정 삭제 뒤 "모두 지우기"(D-10) — 단어장·학습 기록만 지우고 설정·키는 남기는지 봅니다.
describe("이 폰의 단어장과 학습 기록 지우기", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("단어장·학습 기록 키는 지우고, 키·글자 크기·목소리 같은 설정은 남긴다", () => {
    const wiped: Record<string, string> = {
      "kata-categories": "[]",
      "kata-words": "[]",
      "kata-saved": "[]",
      "shared_seed_version": "1|",
      "my_wordbook_created": "1",
      "dict-search-history": "[]",
      "phrase-saved": "[]",
      "medali-cache": "{}",
      "kata-hari-ini": "{}",
      "cat-words-collapsed:my-wordbook": "1",
      "cat-words-collapsed:abc": "1",
    };
    const kept: Record<string, string> = {
      "geminiApiKey": "test-not-a-real-key",
      "kata-member-key": "test",
      "kata-member-profile": "{}",
      "app-font-scale-step": "3",
      "app-font-scale-base": "1",
      "app-wide-mode": "1",
      "tts-voice": "Kore",
      "story-difficulty": "mid",
      "quiz-speak": "1",
      "kata-preview-tier": "plus",
      "kata-shared-ids-v2": "1",
      "kata-shared-ids-v3": "1",
      "kata-shared-ids-v4": "1",
      "kata-public-samples-cleared": "1",
      "sermon-base": "x",
      "bible-last-pos": "x",
    };
    for (const k of Object.keys(wiped)) localStorage.setItem(k, wiped[k]);
    for (const k of Object.keys(kept)) localStorage.setItem(k, kept[k]);

    expect(wipeLocalStorageStudyData(localStorage)).toBe(Object.keys(wiped).length);

    for (const k of Object.keys(wiped)) expect(localStorage.getItem(k), k).toBeNull();
    for (const k of Object.keys(kept)) expect(localStorage.getItem(k), k).toBe(kept[k]);
  });

  it("지우는 목록에 키·세션·설정이 섞여 있지 않다", () => {
    const never = ["geminiApiKey", "claudeApiKey", "kata-member-key", "kata-public-session", "app-font-scale-step", "tts-voice", "sermon-key", "bible-key"];
    for (const k of never) expect(WIPE_LS_KEYS.indexOf(k), k).toBe(-1);
  });
});
