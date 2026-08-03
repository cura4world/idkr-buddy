// 단어장 상태 점검 스크립트. 빌드에는 관여하지 않는다.
//   node scripts/check-wordlist.js
// data/categories/*.csv 와 data/private/<owner>/*.csv 를 모두 검사한다.
// 종료 코드는 항상 0이다 (CI를 막지 않기 위함).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesDir = path.join(__dirname, '../data/categories');
const privateRoot = path.join(__dirname, '../data/private');

// csv-to-seed.js의 parseCsv와 동일한 파싱 규칙에 줄 번호 추적만 더한 것.
// 따옴표로 감싼 필드 안의 쉼표·줄바꿈을 보존한다.
function parseCsvRows(text) {
  const clean = text.replace(new RegExp("^\\uFEFF"), "").replace(new RegExp("\\r\\n?", "g"), "\n");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let rowStarted = false;
  const flush = () => {
    if (row.some((c) => c.trim())) rows.push({ cols: row.map((c) => c.trim()), line: rowLine });
    row = [];
  };
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (!rowStarted && ch !== "\n") { rowLine = line; rowStarted = true; }
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n") {
      row.push(field);
      field = "";
      flush();
      line++;
      rowStarted = false;
      continue;
    }
    field += ch;
  }
  row.push(field);
  flush();
  return rows;
}

// 검사 대상 파일 목록: { label, fullPath }
const targets = [];
if (fs.existsSync(categoriesDir)) {
  for (const f of fs.readdirSync(categoriesDir).filter((f) => f.endsWith('.csv')).sort()) {
    targets.push({ label: f, fullPath: path.join(categoriesDir, f) });
  }
}
if (fs.existsSync(privateRoot)) {
  const owners = fs.readdirSync(privateRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const owner of owners) {
    const ownerDir = path.join(privateRoot, owner);
    for (const f of fs.readdirSync(ownerDir).filter((f) => f.endsWith('.csv')).sort()) {
      targets.push({ label: `${owner}/${f}`, fullPath: path.join(ownerDir, f) });
    }
  }
}

if (targets.length === 0) {
  console.log('검사할 CSV 파일이 없습니다.');
  process.exit(0);
}

const perFileCount = [];
const bomFiles = [];
const formatErrors = [];   // 열 부족 / 표제어·뜻 빈칸
const mergedRows = [];     // 따옴표 없는 쉼표로 5열 이상이 된 행
const missingExample = []; // 파일별 예문 누락 행 수
const wordFiles = new Map();

for (const { label, fullPath } of targets) {
  const raw = fs.readFileSync(fullPath, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) bomFiles.push(label);

  const rows = parseCsvRows(raw);
  let count = 0;
  let noExample = 0;

  for (const { cols, line } of rows) {
    if (cols.length > 4) mergedRows.push(`${label}:${line} ${cols[0]}`);
    if (cols.length < 2) {
      formatErrors.push(`${label}:${line} 열 부족(${cols.length}열)`);
      continue;
    }
    const [word, meaning, example = '', exampleMeaning = ''] = cols;
    if (!word || !meaning) {
      formatErrors.push(`${label}:${line} ${!word ? '표제어' : '뜻'} 비어 있음`);
      continue;
    }
    count++;
    if (!example && !exampleMeaning) noExample++;
    if (!wordFiles.has(word)) wordFiles.set(word, []);
    wordFiles.get(word).push(label);
  }

  perFileCount.push({ label, count });
  if (noExample > 0) missingExample.push({ label, noExample });
}

const totalWords = perFileCount.reduce((sum, f) => sum + f.count, 0);

// 서로 다른 파일에 같은 표제어가 있는 경우
const crossFileDups = [...wordFiles.entries()]
  .filter(([, files]) => new Set(files).size > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

// 같은 파일 안에서 표제어가 두 번 이상 나오는 경우
const sameFileDups = [];
for (const [word, files] of wordFiles) {
  const seen = new Set();
  const twice = new Set();
  for (const f of files) {
    if (seen.has(f)) twice.add(f);
    seen.add(f);
  }
  for (const f of twice) sameFileDups.push(`${word} → ${f}`);
}
sameFileDups.sort();

console.log('=== 1. 파일별 단어 수 ===');
for (const { label, count } of perFileCount) console.log(`  ${label}\t${count}`);
console.log(`  총 ${totalWords}단어 (${perFileCount.length}개 파일)`);

console.log('');
console.log(`=== 2. BOM이 남아 있는 파일 (${bomFiles.length}개) ===`);
if (bomFiles.length === 0) console.log('  없음');
else for (const f of bomFiles) console.log(`  ${f}`);

console.log('');
console.log(`=== 3. 중복 표제어 — 서로 다른 파일 (${crossFileDups.length}건) ===`);
if (crossFileDups.length === 0) console.log('  없음');
else for (const [word, files] of crossFileDups) console.log(`  ${word} → ${[...new Set(files)].join(', ')}`);
if (sameFileDups.length > 0) {
  console.log(`  [참고] 같은 파일 안 중복 ${sameFileDups.length}건`);
  for (const d of sameFileDups) console.log(`    ${d}`);
}

console.log('');
console.log(`=== 4. 형식 오류 행 (${formatErrors.length}건) ===`);
if (formatErrors.length === 0) console.log('  없음');
else for (const e of formatErrors) console.log(`  ${e}`);

console.log('');
console.log(`=== 5. 쉼표 병합 행 (${mergedRows.length}건) ===`);
console.log('  따옴표 없는 쉼표 때문에 열이 밀린 행. csv-to-seed.js가 4열로 합쳐 복구하지만,');
console.log('  다음 단계에서 CSV에 따옴표를 씌워 정리할 대상이다.');
if (mergedRows.length === 0) console.log('  없음');
else for (const r of mergedRows) console.log(`  쉼표 병합 행: ${r}`);

console.log('');
console.log('=== 6. 예문 누락 행 수 ===');
if (missingExample.length === 0) console.log('  없음');
else {
  let sum = 0;
  for (const { label, noExample } of missingExample) {
    console.log(`  ${label}\t${noExample}`);
    sum += noExample;
  }
  console.log(`  합계 ${sum}행`);
}

console.log('');
console.log(`총 ${totalWords}단어 / 중복 ${crossFileDups.length}건 / 형식오류 ${formatErrors.length}건`);
process.exit(0);
