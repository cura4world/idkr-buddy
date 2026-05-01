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
  const lower = name.toLowerCase();
  for (let i = 0; i < SORT_ORDER.length; i++) {
    if (lower.includes(SORT_ORDER[i])) return i;
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
];

const poolIndex = new Map();
const usedEmojis = new Set();
const fallbackPool = ['📚','🌟','💡','🎯','🗂️','📝','🔖','💬','🧩','🌏','🔑','🎠','🧪','🔭','🎪'];
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
  const lines = content.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim());
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

const seed = { version: Date.now(), categories, words };
fs.writeFileSync(outputFile, JSON.stringify(seed, null, 2));
console.log(`Seed generated: ${categories.length} categories, ${words.length} words.`);
