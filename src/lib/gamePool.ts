// src/lib/gamePool.ts
// 게임 출제 풀. 재료는 전부 로컬(단어장·찾아본 단어·시드)이라 API 호출이 없습니다.
// 3층 = ① 개인 단어장 ② 사전에서 찾아본 단어 ③ 공용 시드 단어장.
// 같은 단어가 여러 층에 있으면 단어장 > 찾아본 > 시드 순으로 하나만 씁니다.

import { getCategories, getWordsByCategory } from "@/lib/store";
import { listLookupWords } from "@/lib/wordStore";
import { listWordRecords, effectiveStatus } from "@/lib/medali";
import type { WordRecord } from "@/lib/medali";

export interface PoolWord {
  word: string;            // 인니어
  meaning: string;         // 한국어 뜻
  source: "wordbook" | "lookup" | "seed";
  status: "pending" | "confirmed" | "recheck" | "monitoring";  // medali 기록 없으면 "pending"
}

const LOOKUP_LIMIT = 300;   // 찾아본 단어는 최근 300개까지만 후보로
const LOOKUP_WINDOW = 60;   // 그중 최근 60개 안에서 무작위로 뽑습니다 (최근성 + 다양성)
const MEANING_MAX = 24;     // 카드에 들어갈 뜻 길이 상한

// 카드 한 장에 들어갈 만한 길이로 뜻을 다듬습니다.
// (찾아본 단어의 뜻은 여러 뜻이 이어져 있어 그대로 두면 카드가 깨집니다)
function shortMeaning(raw: string): string {
  const flat = String(raw || "").replace(new RegExp("\\s+", "g"), " ").trim();
  if (!flat) return "";
  if (flat.length <= MEANING_MAX) return flat;
  // 여러 뜻이면 첫 번째 것만
  const cut = flat.split(new RegExp("[;,/·]"))[0].trim();
  if (cut && cut.length <= MEANING_MAX) return cut;
  return (cut || flat).slice(0, MEANING_MAX).trim();
}

const wordKey = (w: string): string => String(w || "").trim().toLowerCase();
const meaningKey = (m: string): string =>
  String(m || "").replace(new RegExp("\\s+", "g"), " ").trim().toLowerCase();

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// 후보 모으기. 배열 순서가 곧 우선순위(앞이 셈)이며 같은 단어는 앞의 것만 남습니다.
export async function collectCandidates(): Promise<PoolWord[]> {
  const out: PoolWord[] = [];
  const seen = new Set<string>();

  const push = (word: string, meaning: string, source: PoolWord["source"]) => {
    const key = wordKey(word);
    const m = shortMeaning(meaning);
    if (!key || !m) return;          // 뜻이 없는 단어는 짝을 만들 수 없어 제외
    if (seen.has(key)) return;       // 중복 제거 (wordbook > lookup > seed)
    seen.add(key);
    out.push({ word: String(word).trim(), meaning: m, source, status: "pending" });
  };

  // ① 개인 단어장
  let cats: ReturnType<typeof getCategories> = [];
  try {
    cats = getCategories();
  } catch {
    cats = [];
  }
  for (const c of cats.filter((x) => !x.isShared)) {
    try {
      for (const w of getWordsByCategory(c.id)) push(w.word, w.meaning, "wordbook");
    } catch {
      // 한 단어장이 깨져도 나머지는 계속
    }
  }

  // ② 사전에서 찾아본 단어 (최근순)
  try {
    for (const r of await listLookupWords(LOOKUP_LIMIT)) push(r.key, r.meaning, "lookup");
  } catch {
    // 없으면 그냥 넘어감
  }

  // ③ 공용 시드 단어장
  for (const c of cats.filter((x) => x.isShared)) {
    try {
      for (const w of getWordsByCategory(c.id)) push(w.word, w.meaning, "seed");
    } catch {
      // 무시
    }
  }

  // medali 기록으로 확정 여부를 붙입니다 (기록이 없으면 pending)
  try {
    const recs: WordRecord[] = await listWordRecords();
    const byWord = new Map<string, WordRecord>();
    for (const r of recs) if (r && r.word) byWord.set(r.word, r);
    const now = Date.now();
    for (const p of out) {
      const r = byWord.get(wordKey(p.word));
      if (!r) continue;
      // 확정 후 60일이 지난 단어는 저장값이 confirmed라도 재검증 대상으로 봅니다
      const st = effectiveStatus(r, now);
      if (st === "confirmed" || st === "recheck" || st === "monitoring") p.status = st;
    }
  } catch {
    // 기록을 못 읽으면 전부 pending으로 둡니다
  }

  return out;
}

// 한 판 재료 뽑기. 미확정(pending/recheck) unconfirmed개 + 확정 confirmed개.
// 재료 부족 시 있는 쪽에서 채우고, 그래도 부족하면 있는 만큼만 반환.
export async function drawPool(unconfirmed: number, confirmed: number): Promise<PoolWord[]> {
  const all = await collectCandidates();

  // 미확정 뽑기 순서: monitoring → recheck → 찾아본 단어 → 단어장 → 시드.
  // monitoring은 한 번 더 틀리면 별이 줄어드는 단어라 재검증 중에서도 가장 먼저 냅니다.
  // 층의 순서는 지키되 층 안에서는 섞습니다 — 안 그러면 판정이 바뀌기 전까지
  // 매판 같은 앞줄만 뽑혀 "또 그 단어"가 됩니다.
  // 찾아본 단어는 최근 60개를 "후보 창"으로 삼고, 그 안에서 무작위로 뽑습니다.
  const monitoringList = all.filter((p) => p.status === "monitoring");
  const recheckList = all.filter((p) => p.status === "recheck");
  const pending = all.filter((p) => p.status === "pending");
  const unconfirmedOrder: PoolWord[] = [
    ...shuffle(monitoringList),
    ...shuffle(recheckList),
    ...shuffle(pending.filter((p) => p.source === "lookup").slice(0, LOOKUP_WINDOW)),
    ...shuffle(pending.filter((p) => p.source === "wordbook")),
    ...shuffle(pending.filter((p) => p.source === "seed")),
  ];
  const confirmedOrder = shuffle(all.filter((p) => p.status === "confirmed"));

  const picked: PoolWord[] = [];
  const usedWord = new Set<string>();
  const usedMeaning = new Set<string>();

  // 뜻이 같은 두 단어가 한 판에 들어가면 짝맞추기가 성립하지 않습니다.
  const take = (list: PoolWord[], n: number): number => {
    let got = 0;
    for (const p of list) {
      if (got >= n) break;
      const wk = wordKey(p.word);
      const mk = meaningKey(p.meaning);
      if (usedWord.has(wk) || usedMeaning.has(mk)) continue;
      usedWord.add(wk);
      usedMeaning.add(mk);
      picked.push(p);
      got++;
    }
    return got;
  };

  take(unconfirmedOrder, unconfirmed);
  take(confirmedOrder, confirmed);

  // 한쪽이 모자라면 다른 쪽에서 채웁니다 (take는 이미 뽑힌 것을 건너뜁니다)
  const short = unconfirmed + confirmed - picked.length;
  if (short > 0) {
    const more = take(confirmedOrder, short);
    if (more < short) take(unconfirmedOrder, short - more);
  }

  return picked;
}

// ── 문장 조립(Susun Kalimat)용 예문 ────────────────────────────────
// 예문이 있는 단어만 씁니다. 찾아본 단어(lookup)는 예문이 없어 제외됩니다.

export interface PoolSentence {
  word: string;         // 표제어 (Bintang 판정 대상)
  meaning: string;      // 표제어 뜻
  sentence: string;     // 인니어 예문
  sentenceKo: string;   // 예문 해석
  source: "wordbook" | "seed";
  status: "pending" | "confirmed" | "recheck" | "monitoring";
}

const MIN_TOKENS = 4;   // 3개 이하는 조립이랄 게 없고
const MAX_TOKENS = 10;  // 11개 이상은 폰 화면에 안 맞습니다

export function tokenizeSentence(text: string): string[] {
  return String(text || "")
    .replace(new RegExp("\\s+", "g"), " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

// 조립 게임용 예문 n개. 미확정 표제어 우선(monitoring → recheck), 부족하면 확정에서 채웁니다.
export async function drawSentences(n: number): Promise<PoolSentence[]> {
  const out: PoolSentence[] = [];
  const seenWord = new Set<string>();
  const seenSentence = new Set<string>();

  const push = (
    word: string,
    meaning: string,
    sentence: string,
    sentenceKo: string,
    source: PoolSentence["source"]
  ) => {
    const key = wordKey(word);
    const text = String(sentence || "").replace(new RegExp("\\s+", "g"), " ").trim();
    if (!key || !text) return;
    const count = tokenizeSentence(text).length;
    if (count < MIN_TOKENS || count > MAX_TOKENS) return;
    const sk = text.toLowerCase();
    if (seenWord.has(key) || seenSentence.has(sk)) return;   // 표제어는 wordbook 우선
    seenWord.add(key);
    seenSentence.add(sk);
    out.push({
      word: String(word).trim(),
      meaning: shortMeaning(meaning),
      sentence: text,
      sentenceKo: String(sentenceKo || "").replace(new RegExp("\\s+", "g"), " ").trim(),
      source,
      status: "pending",
    });
  };

  let cats: ReturnType<typeof getCategories> = [];
  try {
    cats = getCategories();
  } catch {
    cats = [];
  }

  for (const c of cats.filter((x) => !x.isShared)) {
    try {
      for (const w of getWordsByCategory(c.id)) push(w.word, w.meaning, w.example, w.exampleMeaning, "wordbook");
    } catch {
      // 한 단어장이 깨져도 나머지는 계속
    }
  }
  for (const c of cats.filter((x) => x.isShared)) {
    try {
      for (const w of getWordsByCategory(c.id)) push(w.word, w.meaning, w.example, w.exampleMeaning, "seed");
    } catch {
      // 무시
    }
  }

  // 확정 여부 붙이기 (기록이 없으면 pending)
  try {
    const recs: WordRecord[] = await listWordRecords();
    const byWord = new Map<string, WordRecord>();
    for (const r of recs) if (r && r.word) byWord.set(r.word, r);
    const now = Date.now();
    for (const p of out) {
      const r = byWord.get(wordKey(p.word));
      if (!r) continue;
      // 확정 후 60일이 지난 단어는 저장값이 confirmed라도 재검증 대상으로 봅니다
      const st = effectiveStatus(r, now);
      if (st === "confirmed" || st === "recheck" || st === "monitoring") p.status = st;
    }
  } catch {
    // 전부 pending으로 둡니다
  }

  // 층 순서는 지키되 층 안에서는 섞습니다 (매판 같은 예문이 나오지 않도록)
  const order: PoolSentence[] = [
    ...shuffle(out.filter((p) => p.status === "monitoring")),
    ...shuffle(out.filter((p) => p.status === "recheck")),
    ...shuffle(out.filter((p) => p.status === "pending")),
    ...shuffle(out.filter((p) => p.status === "confirmed")),
  ];
  return order.slice(0, n);
}
