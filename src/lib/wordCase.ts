// src/lib/wordCase.ts
// 단어장에 저장된 인도네시아어 표제어를 화면에 보여줄 때 첫 글자를 소문자로 낮춥니다.
// 다만 고유명사는 대문자를 지켜야 하므로, 예문에서의 실제 쓰임을 근거로 판단합니다.

// 예문에 근거가 없을 때만 쓰는 최소한의 고유명사 목록.
// 필요하면 여기에 계속 더하면 됩니다.
const PROPER = new Set([
  // 요일
  "senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu",
  // 월
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
  // 나라·지역
  "indonesia", "korea", "jakarta", "bali", "jawa", "sumatra", "sulawesi",
  "papua", "kalimantan", "bandung", "surabaya", "yogyakarta", "medan",
  "malaysia", "singapura", "jepang", "tiongkok", "amerika",
  // 신앙
  "allah", "tuhan", "yesus", "kristus", "roh", "alkitab", "injil",
  "israel", "yerusalem", "musa", "daud", "abraham", "petrus", "paulus",
  "maria", "yusuf", "nuh", "adam", "hawa",
]);

function isUpperLatin(ch: string): boolean {
  return ch >= "A" && ch <= "Z";
}

function hasInnerUpper(s: string): boolean {
  for (let i = 1; i < s.length; i++) {
    if (isUpperLatin(s[i])) return true;
  }
  return false;
}

// 문장부호를 떼어 낸 알맹이만 남깁니다 (정규식 없이 처리).
function stripEdges(token: string): string {
  const marks = ".,!?;:\"'()[]{}<>-—…«»";
  let start = 0;
  let end = token.length;
  while (start < end && marks.indexOf(token[start]) >= 0) start++;
  while (end > start && marks.indexOf(token[end - 1]) >= 0) end--;
  return token.slice(start, end);
}

/**
 * 예문 안에서 이 단어가 "문장 중간"에 어떻게 쓰였는지 찾습니다.
 * 대문자로 쓰였으면 true, 소문자면 false, 근거가 없으면 null.
 */
function properFromExample(word: string, example: string): boolean | null {
  const target = word.toLowerCase();
  const tokens = example.split(" ");
  let seen = 0;

  for (let i = 0; i < tokens.length; i++) {
    const raw = stripEdges(tokens[i]);
    if (!raw) continue;
    seen++;
    if (raw.toLowerCase() !== target) continue;
    // 문장 맨 앞은 문장부호 때문에 대문자라 근거가 되지 못합니다.
    if (seen === 1) continue;
    return isUpperLatin(raw[0]);
  }
  return null;
}

/**
 * 화면에 보여줄 표제어를 만듭니다.
 * 고유명사로 판단되면 원문 그대로, 아니면 첫 글자만 소문자로 낮춥니다.
 */
export function displayWord(word: string, example?: string): string {
  const w = (word || "").trim();
  if (!w) return word;

  // 이미 소문자이거나 라틴 문자가 아니면 손대지 않습니다.
  if (!isUpperLatin(w[0])) return w;

  // 안쪽에 대문자가 또 있으면 약어·복합 고유명사입니다 (TV, AC, Roh Kudus).
  if (hasInnerUpper(w)) return w;

  if (example) {
    const found = properFromExample(w, example);
    if (found === true) return w;
    if (found === false) return w[0].toLowerCase() + w.slice(1);
  }

  // 근거가 없을 때만 목록을 봅니다. 첫 낱말 기준으로 확인합니다.
  const head = w.split(" ")[0].toLowerCase();
  if (PROPER.has(head)) return w;

  return w[0].toLowerCase() + w.slice(1);
}
