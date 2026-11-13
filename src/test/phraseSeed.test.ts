// 내장 문장(STATIC_PHRASES)의 해설을 담은 src/data/phrase-seed.json 이 온전한지 검사합니다.
// (첫 실행 첫 화면이 AI 없이 열리려면 36개 전부, 앱이 읽는 모양대로 들어 있어야 합니다.)

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import seed from "@/data/phrase-seed.json";
import { buildPrompt } from "@/lib/phrasePrompt";

const ROOT = process.cwd();

function staticSentences(): string[] {
  const text = fs.readFileSync(path.join(ROOT, "src", "lib", "peribahasa.ts"), "utf8");
  const start = text.indexOf("const STATIC_PHRASES: Phrase[] = [");
  const end = text.indexOf("\n];", start);
  const line = new RegExp('\\{\\s*kind:\\s*"\\w+",\\s*id:\\s*("(?:[^"\\\\]|\\\\.)*")', "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const body = text.slice(start, end);
  while ((m = line.exec(body)) !== null) out.push(JSON.parse(m[1]));
  return out;
}

describe("phrase-seed.json", () => {
  const sentences = staticSentences();
  const phrases = (seed as { phrases: Record<string, any> }).phrases;

  it("내장 문장은 36개(속담 22 + 관용구 14)", () => {
    expect(sentences.length).toBe(36);
  });

  it("내장 문장마다 해설이 있고, 목록에 없는 문장은 들어 있지 않다", () => {
    for (const s of sentences) expect(Object.keys(phrases)).toContain(s);
    expect(Object.keys(phrases).length).toBe(sentences.length);
  });

  it("해설 모양: meaning 있음, 예문 3개(id·ko·situasi), note 는 문자열", () => {
    for (const s of sentences) {
      const e = phrases[s];
      expect(typeof e.meaning).toBe("string");
      expect(e.meaning.trim()).not.toBe("");
      expect(Array.isArray(e.examples)).toBe(true);
      expect(e.examples.length).toBe(3);
      for (const ex of e.examples) {
        expect(String(ex.id).trim()).not.toBe("");
        expect(String(ex.ko).trim()).not.toBe("");
        expect(String(ex.situasi).trim()).not.toBe("");
      }
      expect(typeof e.note).toBe("string");
    }
  });

  it("note 는 meaning 과 같은 글이 아니다", () => {
    for (const s of sentences) {
      const e = phrases[s];
      if (e.note.trim() !== "") expect(e.note.trim()).not.toBe(e.meaning.trim());
    }
  });
});

describe("phrasePrompt.buildPrompt", () => {
  it("문장과 참고 뜻이 들어가고 JSON 모양을 요구한다", () => {
    const p = buildPrompt("Diam itu emas.", "침묵은 금입니다.");
    expect(p).toContain("문장: Diam itu emas.");
    expect(p).toContain("참고 뜻: 침묵은 금입니다.");
    expect(p).toContain('"meaning"');
    expect(p).toContain('"examples"');
    expect(p).toContain('"note"');
  });
});
