import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesDir = path.join(__dirname, '../data/categories');
const outputFile = path.join(__dirname, '../src/data/seed.json');

// src/data 폴더 없으면 생성
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const categories = [];
const words = [];

if (!fs.existsSync(categoriesDir)) {
  console.log('No /data/categories folder found, skipping seed generation.');
  fs.writeFileSync(outputFile, JSON.stringify({ version: 1, categories: [], words: [] }, null, 2));
  process.exit(0);
}

const files = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.csv'));

for (const file of files) {
  const categoryName = path.basename(file, '.csv');
  const categoryId = `shared_${categoryName.replace(/\s+/g, '_')}`;
  const emoji = '📚';

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
      word,
      meaning,
      example,
      exampleMeaning,
      categoryId,
      createdAt: 0,
      isShared: true,
    });
  }
}

const seed = { version: Date.now(), categories, words };
fs.writeFileSync(outputFile, JSON.stringify(seed, null, 2));
console.log(`Seed generated: ${categories.length} categories, ${words.length} words.`);
