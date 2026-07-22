// src/lib/tips.ts
// 인도네시아 정보(팁): 버튼을 누를 때마다 Gemini가 짧은 정보 하나를 생성합니다.
// 폰에 영구 저장(IndexedDB)되며, 중복을 피하기 위해 최근 제목을 함께 전달합니다.

import { getGeminiApiKey } from "@/lib/gemini";

const TEXT_MODEL = "gemini-flash-lite-latest";

// 생성 다양성을 위한 힌트 주제군 (프롬프트에 하나를 랜덤으로 곁들여 편향을 줄임)
const TOPIC_HINTS = [
  "음식과 길거리 먹거리",
  "일상 인사와 예절",
  "축제와 명절",
  "교통과 여행 팁",
  "자연과 동식물",
  "전통 의상과 공예",
  "언어와 재미있는 표현",
  "역사 속 흥미로운 사실",
  "지역별 특색",
  "종교와 생활 관습",
  "음악과 춤",
  "시장과 쇼핑 문화",
  "커피와 차 문화",
  "스포츠와 놀이",
  "미신과 속담",
];

export interface TipData {
  title: string; // 짧은 제목 (한국어)
  emoji: string; // 대표 이모지 1개
  body: string; // 정보 본문 (한국어, 2~4문장)
  indo?: string; // 관련 인도네시아어 한 마디 (선택)
  indoKo?: string; // 그 뜻
}

async function callGeminiJSON(prompt: string, temperature = 1.0): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    TEXT_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("REQUEST_FAILED_" + res.status);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("EMPTY_RESPONSE");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(new RegExp("\\{[\\s\\S]*\\}"));
    if (!match) throw new Error("PARSE_FAILED");
    return JSON.parse(match[0]);
  }
}

// 팁 1개 생성. recentTitles로 최근 주제와 중복 방지.
export async function generateTip(recentTitles: string[] = []): Promise<TipData> {
  const hint = TOPIC_HINTS[Math.floor(Math.random() * TOPIC_HINTS.length)];

  const prompt =
    "당신은 인도네시아를 사랑하는 한국인 친구입니다. 인도네시아에 대한 소소하지만 흥미로운 정보 하나를 알려주세요.\n" +
    "결과는 JSON으로만 출력합니다.\n\n" +
    "이번 소재 힌트: " + hint + " (참고만 하고, 자유롭게 정해도 됩니다)\n\n" +
    "출력 형식:\n" +
    "{\n" +
    '  "title": "짧고 흥미로운 제목 (한국어, 15자 내외)",\n' +
    '  "emoji": "내용을 대표하는 이모지 1개",\n' +
    '  "body": "정보 본문. 한국어 2~4문장. 읽으면 \'오 그렇구나\' 싶은 구체적이고 정확한 사실.",\n' +
    '  "indo": "관련된 인도네시아어 단어나 짧은 표현 (있으면)",\n' +
    '  "indoKo": "그 뜻 (한국어)"\n' +
    "}\n\n" +
    "주의:\n" +
    "- 반드시 사실에 근거하세요. 지어내지 마세요.\n" +
    "- 너무 뻔한 상식(예: 발리는 관광지다)보다, 조금은 새롭고 구체적인 이야기를 고르세요.\n" +
    "- 친근하고 따뜻한 말투로 쓰되, 정보는 정확하게.\n" +
    "- indo/indoKo는 자연스럽게 연결될 때만 넣고, 없으면 빈 문자열로 두세요.\n" +
    "- 최근 다룬 주제와 겹치지 않게 하세요. 최근 제목: " +
    (recentTitles.length ? recentTitles.join(", ") : "없음") +
    "\n";

  const raw = await callGeminiJSON(prompt);

  const title = (raw.title || "").toString().trim();
  const body = (raw.body || "").toString().trim();
  if (!title || !body) throw new Error("EMPTY_FIELDS");

  return {
    title,
    emoji: (raw.emoji || "🇮🇩").toString().trim().slice(0, 4),
    body,
    indo: (raw.indo || "").toString().trim(),
    indoKo: (raw.indoKo || "").toString().trim(),
  };
}

// ---------- IndexedDB 저장소 ----------
const DB_NAME = "kata-tips";
const STORE = "tips";

export interface TipRecord extends TipData {
  id: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("NO_INDEXEDDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("DB_OPEN_FAILED"));
  });
  return dbPromise;
}

export async function saveTip(data: TipData): Promise<TipRecord> {
  const rec: TipRecord = {
    ...data,
    id: (crypto as any)?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
  };
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 저장 실패해도 세션 내 사용은 가능
  }
  return rec;
}

export async function listTips(): Promise<TipRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result || []) as TipRecord[];
        all.sort((a, b) => b.createdAt - a.createdAt);
        resolve(all);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteTip(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 무시
  }
}
