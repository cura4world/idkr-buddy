// src/lib/dictCorrections.ts
// 사전 결과 정정 목록 (2026-11-23 내부 테스트 12장 A — 프로젝트 문서 claude/kata-kata-feedback-plan.md 의 "남은 일").
//
// 사전 결과는 폰마다 처음 찾을 때 AI 가 만들고 그 폰에 저장됩니다(kata-dict-results). 피드백으로 틀린 결과를 알게 되면
// 그 폰들의 저장본을 지우고, 검증한 결과로 바꿔 보여 줄 길이 필요했습니다.
//
//   public/dict-corrections.json   저장소의 작은 파일(배포하면 바뀜). 형식:
//     { "v": 1, "updated": "YYYY-MM-DD",
//       "items": { "<검색어 해시>": { "kind": "id_word", "data": {...검증된 결과 전체...} } },
//       "purge": ["<검색어 해시>", ...] }      ← 검증본 없이 지우기만 할 것(문장 검색 등)
//   검색어 해시 = sha256(dictCacheKey(종류, 검색어)) 16진수 64자 — 검색어를 그대로 적지 않습니다(Arga 결정 D11).
//
//   앱은 한국 날짜로 하루 한 번 이 파일을 받아(syncDictCorrections), 목록에 오른 저장본을 지웁니다.
//   검색할 때는 정정 목록 → 저장본 → AI 순서로 찾습니다(lookupDictCorrection) — 검증본이 있으면 비용 0.
//   '내 단어장에 담기'로 복사한 단어는 개인 데이터라 건드리지 않습니다(여기서는 사전 저장본만 다룸).
//
// 서비스워커 미리 담기에서 이 파일만 뺐습니다(vite.config.ts globIgnores) — 담아 두면 배포 전 사본을 계속 줍니다.

import { sha256Hex } from "@/lib/hash";
import { deleteCachedResult, listCachedResultKeys } from "@/lib/dictStore";
import type { InputKind } from "@/lib/dictionary";

const DAY_KEY = "dict-corrections-day";
const DATA_KEY = "dict-corrections";
const FETCH_TIMEOUT_MS = 10000;
const KST_MS = 9 * 3600 * 1000;
const HASH_RE = new RegExp("^[0-9a-f]{64}$");

export interface DictCorrectionFile {
  v: number;
  updated?: string;
  items?: Record<string, { kind: InputKind; data: unknown }>;
  purge?: string[];
}

function kstDay(nowMs: number = Date.now()): string {
  return new Date(nowMs + KST_MS).toISOString().slice(0, 10);
}

function fileUrl(): string {
  let base = "/";
  try { base = import.meta.env.BASE_URL || "/"; } catch (e) {}
  return (base.slice(-1) === "/" ? base : base + "/") + "dict-corrections.json";
}

/** 받은 파일의 모양을 확인하고 쓸 수 있는 것만 남깁니다(해시 모양·종류가 맞는 것). */
export function cleanCorrections(raw: unknown): DictCorrectionFile {
  const out: DictCorrectionFile = { v: 1, items: {}, purge: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as DictCorrectionFile;
  const kinds = ["id_word", "id_sentence", "ko_word", "ko_sentence"];
  if (r.items && typeof r.items === "object") {
    Object.keys(r.items).forEach((h) => {
      const it = (r.items as Record<string, { kind: InputKind; data: unknown }>)[h];
      if (!HASH_RE.test(h) || !it || kinds.indexOf(String(it.kind)) < 0 || !it.data || typeof it.data !== "object") return;
      (out.items as Record<string, { kind: InputKind; data: unknown }>)[h] = { kind: it.kind, data: it.data };
    });
  }
  if (Array.isArray(r.purge)) out.purge = r.purge.filter((h) => typeof h === "string" && HASH_RE.test(h));
  if (typeof r.updated === "string") out.updated = r.updated;
  return out;
}

let memo: DictCorrectionFile | null = null;

function loadStored(): DictCorrectionFile {
  if (memo) return memo;
  try {
    memo = cleanCorrections(JSON.parse(localStorage.getItem(DATA_KEY) || "null"));
  } catch (e) {
    memo = cleanCorrections(null);
  }
  return memo;
}

/** 이 검색(정규화된 캐시 키)의 검증본. 없으면 null. 종류가 다르면 쓰지 않습니다. */
export async function lookupDictCorrection(cacheKey: string, kind: InputKind): Promise<unknown | null> {
  const f = loadStored();
  if (!f.items || Object.keys(f.items).length === 0) return null;
  const h = await sha256Hex(cacheKey);
  if (!h) return null;
  const it = f.items[h];
  return it && it.kind === kind ? it.data : null;
}

/**
 * 정정 목록을 반영합니다 — 목록의 해시와 맞는 저장본을 지웁니다(검증본이 있는 것·지우기만 할 것 모두).
 * 돌려주는 값: 지운 개수. (pure 하게 시험하려고 저장소 함수를 밖에서 받을 수 있게 둠)
 */
export async function applyDictCorrections(
  f: DictCorrectionFile,
  io: { listKeys: () => Promise<string[]>; remove: (key: string) => Promise<void> } = {
    listKeys: listCachedResultKeys,
    remove: deleteCachedResult,
  },
): Promise<number> {
  const targets = new Set<string>(Object.keys(f.items || {}).concat(f.purge || []));
  if (targets.size === 0) return 0;
  const keys = await io.listKeys();
  let n = 0;
  for (const k of keys) {
    const h = await sha256Hex(k);
    if (h && targets.has(h)) {
      await io.remove(k);
      n++;
    }
  }
  return n;
}

/**
 * 하루 한 번(한국 날짜) 정정 목록을 받아 반영합니다. 사전 화면을 열 때 부릅니다. 절대 던지지 않습니다.
 * 받지 못하면(인터넷 없음 등) 그날 다시 시도하도록 날짜를 적지 않습니다.
 */
export async function syncDictCorrections(): Promise<void> {
  const today = kstDay();
  try {
    if (localStorage.getItem(DAY_KEY) === today) return;
  } catch (e) {
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    try { ctrl.abort(); } catch (e) {}
  }, FETCH_TIMEOUT_MS);
  let file: DictCorrectionFile;
  try {
    const res = await fetch(fileUrl(), { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) return;
    file = cleanCorrections(await res.json());
  } catch (e) {
    return;
  } finally {
    clearTimeout(timer);
  }
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(file));
    memo = file;
    await applyDictCorrections(file);
    localStorage.setItem(DAY_KEY, today);
  } catch (e) {}
}
