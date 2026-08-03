import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesDir = path.join(__dirname, '../data/categories');
const outputFile = path.join(__dirname, '../src/data/seed.json');

const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// 디폴트 정렬 순서
const SORT_ORDER = [
  'kotbah', 'khotbah', 'sermon',
  '명사', 'noun',
  '형용사', 'adjective',
  '부사', 'adverb',
  '동사', 'verb',
  '기독교', 'ibadah', 'worship', 'doa', 'prayer',
];

function getSortIndex(name) {
  // 이름이 두 자리 숫자로 시작하면 그 숫자를 정렬 기준으로 쓴다 ("01 인칭·지시·의문").
  const m = name.match(new RegExp("^(\\d+)"));
  if (m) return Number(m[1]);
  const lower = name.toLowerCase();
  for (let i = 0; i < SORT_ORDER.length; i++) {
    if (lower.includes(SORT_ORDER[i])) return i + 1000;
  }
  return 9999;
}

// 키워드별 이모지 풀 (문자 직접 사용)
const emojiMap = [
  { keywords: ['동사', 'verb', 'kata kerja'],
    pool: ['🏃','💪','🤸','🙌','🦵','🤾','🏊','🚴'] },
  { keywords: ['형용사', 'adjective', 'kata sifat'],
    pool: ['🌈','🎨','✨','🌸','🌺','🦋','🌻','💫'] },
  { keywords: ['명사', 'noun', 'kata benda'],
    pool: ['📦','🗂️','🦺','🎁','🧸','📫','📌','📋'] },
  { keywords: ['부사', 'adverb', 'kata keterangan'],
    pool: ['⚡','💨','🌀','🔥','☄️','🌊','💥','🌬️'] },
  { keywords: ['인사', 'greeting', 'salam'],
    pool: ['👋','🤝','😊','🙏','👐','💌','🫲','🤗'] },
  { keywords: ['음식', 'food', 'makanan', 'makan'],
    pool: ['🍜','🍚','🍱','🍛','🥗','🍲','🍳','🍭'] },
  { keywords: ['숫자', 'number', 'angka'],
    pool: ['🔢','1️⃣','🎲','🔟','💯','🧭','🃏','🎯'] },
  { keywords: ['동물', 'animal', 'hewan'],
    pool: ['🐾','🐘','🦁','🐬','🦊','🐧','🦜','🐢'] },
  // '08 접사 가족'이 아래 '가족' 항목에 먼저 걸리지 않도록 앞에 둔다.
  { keywords: ['접사'],
    pool: ['🧱','🪚','🔤','🧬','🪆','🧮','🔩','🪡'] },
  { keywords: ['가족', 'family', 'keluarga'],
    pool: ['👪','🏠','❤️','👶','👴','💑','👫','👨‍👧'] },
  { keywords: ['날씨', 'weather', 'cuaca'],
    pool: ['⛅','🌤️','🌧️','❄️','🌈','☀️','🌪️','🌊'] },
  { keywords: ['여행', 'travel', 'perjalanan'],
    pool: ['✈️','🗺️','🧓','🏖️','🚂','⛵','🏔️','🎒'] },
  { keywords: ['직업', 'job', 'pekerjaan'],
    pool: ['💼','👷','👨‍⚕️','👩‍🏫','👨‍🍳','👮','🧑‍💻','🧑‍🎨'] },
  { keywords: ['시간', 'time', 'waktu'],
    pool: ['⏰','🕐','📅','⌛','🗓️','⏱️','🌙','🌅'] },
  { keywords: ['학교', 'school', 'sekolah'],
    pool: ['🏫','📚','✏️','🎓','📐','📏','🖊️','🧑‍🏫'] },
  { keywords: ['감정', 'emotion', 'perasaan'],
    pool: ['😊','😢','😡','🥰','😱','😴','🤩','😌'] },
  { keywords: ['교통', 'transport', 'kendaraan'],
    pool: ['🚌','🚗','🚂','✈️','🛵','🚢','🚁','🚲'] },
  { keywords: ['자연', 'nature', 'alam'],
    pool: ['🌿','🌳','🌄','🌊','🦋','🌸','🍃','🌋'] },
  { keywords: ['kotbah', 'khotbah', 'sermon', '설교'],
    pool: ['📖','✝️','🕊️','📜','🙌','⛪','📣','🕯️'] },
  { keywords: ['doa', 'prayer', '기도'],
    pool: ['🙏','💒','✨','🕊️','💫','🌟','🫶','📿'] },
  { keywords: ['기독교', 'ibadah', 'worship', '예배'],
    pool: ['⛪','🎵','🙌','✝️','🌟','🕊️','💒','📖'] },
  { keywords: ['lagu', 'song', 'music', '노래'],
    pool: ['🎵','🎶','🎸','🎹','🎤','🥁','🎺','🎻'] },
  // 주제별 36권용 키워드. 위 항목이 먼저 매칭되므로 순서를 바꾸지 말 것.
  { keywords: ['인칭', '지시'],
    pool: ['🙋','👉','👤','🫵','🙎','👥','☝️','🙍'] },
  { keywords: ['전치사', '접속사'],
    pool: ['🔗','➕','🪢','⛓️','🧷','↔️','🔀','➰'] },
  { keywords: ['이동', '존재'],
    pool: ['🚶','🏃‍♀️','🧭','🪜','🚪','🛤️','🧗','🪂'] },
  { keywords: ['행위', '조작'],
    pool: ['🛠️','🤲','🔧','🔨','✋','🪛','⚙️','🧰'] },
  { keywords: ['인지', '소통'],
    pool: ['💭','🗣️','💡','🧠','📢','🗨️','👂','❓'] },
  { keywords: ['상태', '성질'],
    pool: ['🎨','🔷','🌗','🟩','🔶','⚪','🟪','🔺'] },
  { keywords: ['평가', '정도'],
    pool: ['⭐','🏅','📊','🥇','📈','💯','🎖️','🔝'] },
  { keywords: ['빈도', '양태'],
    pool: ['🔁','🔄','⏩','♻️','🔂','⤴️','⏱️','🕹️'] },
  { keywords: ['신체', '건강'],
    pool: ['🫀','💪','🦴','🧘','🦷','👣','🫁','🧎'] },
  { keywords: ['집', '생활용품'],
    pool: ['🛋️','🛏️','🪑','🚿','🧹','🪟','🧺','🕯️'] },
  { keywords: ['옷', '외모'],
    pool: ['👗','👕','👟','🧢','🧣','👖','👜','🧥'] },
  { keywords: ['쇼핑', '돈'],
    pool: ['🛒','💰','💵','🏷️','💳','🧾','🪙','🛍️'] },
  { keywords: ['의료', '병원'],
    pool: ['🏥','💊','🩺','🩹','💉','🚑','🧑‍⚕️','🩻'] },
  { keywords: ['행정', '법률'],
    pool: ['⚖️','📜','🏛️','📋','🖊️','🗳️','📑','🔏'] },
  { keywords: ['식물', '농업'],
    pool: ['🌱','🌾','🪴','🚜','🍀','🌽','🥕','🌻'] },
  { keywords: ['기술', '인터넷'],
    pool: ['💻','📱','🛰️','🖥️','📡','🖨️','⌨️','🔌'] },
  { keywords: ['문화'],
    pool: ['🎭','🎊','🥁','🎏','🪘','🎋','🏮','🎇'] },
  { keywords: ['성경'],
    pool: ['📕','📔','📓','📃','📄','📗','🗒️','📘'] },
  { keywords: ['교리', '신학'],
    pool: ['🎓','🔍','🗝️','🪔','📐','🔬','💎','🪧'] },
  { keywords: ['교회', '사역'],
    pool: ['🤝','🫱','👐','🧑‍🤝‍🧑','🎗️','🛎️','🫂','🙌'] },
];

const poolIndex = new Map();
const usedEmojis = new Set();
const fallbackPool = [
  '📚','🌟','🗂️','📝','🔖','💬','🧩','🌏','🔑','🎠',
  '🧪','🔭','🎪','🎯','🪁','🎈','🧸','🪀','🎁','🔔',
  '🌈','⚓','🧊','🪐','🛸','🎢','🎡','🪄','🔮','🧲',
  '🪞','🧴','🪥','🧼','🪒','🧯','🔦','🪫','🗜️','🪤',
  '🪣','🧽','🪠','🎀',
];
let fallbackIndex = 0;

function getEmoji(name) {
  const lower = name.toLowerCase();
  for (const { keywords, pool } of emojiMap) {
    if (keywords.some(k => lower.includes(k))) {
      const key = keywords[0];
      const idx = poolIndex.get(key) || 0;
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[(idx + i) % pool.length];
        if (!usedEmojis.has(candidate)) {
          poolIndex.set(key, (idx + i + 1) % pool.length);
          usedEmojis.add(candidate);
          return candidate;
        }
      }
      const fallback = pool[idx % pool.length];
      poolIndex.set(key, (idx + 1) % pool.length);
      return fallback;
    }
  }
  for (let i = 0; i < fallbackPool.length; i++) {
    const candidate = fallbackPool[(fallbackIndex + i) % fallbackPool.length];
    if (!usedEmojis.has(candidate)) {
      fallbackIndex = (fallbackIndex + i + 1) % fallbackPool.length;
      usedEmojis.add(candidate);
      return candidate;
    }
  }
  return fallbackPool[fallbackIndex++ % fallbackPool.length];
}

// RFC4180 방식 CSV 파서. 따옴표로 감싼 필드 안의 쉼표·줄바꿈을 보존한다.
// 한국어 번역에 쉼표가 자주 들어가므로 단순 split(',')을 쓰면 열이 밀린다.
function parseCsv(text) {
  const clean = text.replace(new RegExp("^\\uFEFF"), "").replace(new RegExp("\\r\\n?", "g"), "\n");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// CSV는 4열(인니어,한국어,예문,예문뜻) 고정이다. 따옴표 없이 쉼표를 쓴 행은
// 5열 이상으로 밀리므로, 4열째부터 끝까지를 쉼표로 다시 이어붙여 예문뜻을 복원한다.
// 자르기 전 간격을 그대로 살려야 원문이 정확히 돌아온다
// ("미안해요, 그 책..." 은 쉼표 뒤 공백이 있고 "17,000개" 는 없다).
// 그래서 trim은 병합 뒤에 한 번만 한다.
// 해당 행 목록은 scripts/check-wordlist.js가 '쉼표 병합 행'으로 뽑아준다.
function normalizeRow(cols) {
  const merged = cols.length <= 4
    ? cols
    : [cols[0], cols[1], cols[2], cols.slice(3).join(',')];
  return merged.map((c) => c.trim());
}

const categories = [];
const words = [];

if (!fs.existsSync(categoriesDir)) {
  console.log('No /data/categories folder found, skipping seed generation.');
  fs.writeFileSync(outputFile, JSON.stringify({ version: 1, categories: [], words: [] }, null, 2));
  process.exit(0);
}

const files = fs.readdirSync(categoriesDir)
  .filter(f => f.endsWith('.csv'))
  .sort((a, b) => {
    const nameA = path.basename(a, '.csv');
    const nameB = path.basename(b, '.csv');
    const idxA = getSortIndex(nameA);
    const idxB = getSortIndex(nameB);
    if (idxA !== idxB) return idxA - idxB;
    return nameA.localeCompare(nameB);
  });

for (const file of files) {
  const categoryName = path.basename(file, '.csv');
  const categoryId = `shared_${categoryName.replace(/\s+/g, '_')}`;
  const emoji = getEmoji(categoryName);
  categories.push({ id: categoryId, name: categoryName, emoji, isShared: true });

  const content = fs.readFileSync(path.join(categoriesDir, file), 'utf-8');
  const rows = parseCsv(content);

  for (const row of rows) {
    const cols = normalizeRow(row);
    if (cols.length < 2) continue;
    const [word, meaning, example = '', exampleMeaning = ''] = cols;
    if (!word || !meaning) continue;
    words.push({
      id: `shared_${categoryId}_${word}`,
      word, meaning, example, exampleMeaning,
      categoryId, createdAt: 0, isShared: true,
    });
  }
}

// 개인 단어장: data/private/<owner>/*.csv -> owner 필드를 붙여 시드에 포함
// (앱은 설정에 해당 owner 이름을 입력한 기기에서만 이 단어장들을 반영)
const privateRoot = path.join(__dirname, '../data/private');
if (fs.existsSync(privateRoot)) {
  const owners = fs.readdirSync(privateRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  for (const owner of owners) {
    const ownerDir = path.join(privateRoot, owner);
    const ownerFiles = fs.readdirSync(ownerDir)
      .filter(f => f.endsWith('.csv'))
      .sort((a, b) => path.basename(a, '.csv').localeCompare(path.basename(b, '.csv')));
    for (const file of ownerFiles) {
      const categoryName = path.basename(file, '.csv');
      const categoryId = `private_${owner}_${categoryName.replace(/\s+/g, '_')}`;
      const emoji = getEmoji(categoryName);
      categories.push({ id: categoryId, name: categoryName, emoji, isShared: true, owner });

      const content = fs.readFileSync(path.join(ownerDir, file), 'utf-8');
      const rows = parseCsv(content);
      for (const row of rows) {
        const cols = normalizeRow(row);
        if (cols.length < 2) continue;
        const [word, meaning, example = '', exampleMeaning = ''] = cols;
        if (!word || !meaning) continue;
        words.push({
          id: `${categoryId}_${word}`,
          word, meaning, example, exampleMeaning,
          categoryId, createdAt: 0, isShared: true,
        });
      }
    }
  }
}

const seed = { version: Date.now(), categories, words };
fs.writeFileSync(outputFile, JSON.stringify(seed, null, 2));
console.log(`Seed generated: ${categories.length} categories, ${words.length} words.`);
