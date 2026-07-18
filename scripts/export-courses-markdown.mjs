import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = join(projectRoot, 'assets', 'database', 'permis.sqlite');
const outputDirectory = join(projectRoot, 'exports', 'cours-markdown');

function slugify(value) {
  return value
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const records = JSON.parse(execFileSync(
  'sqlite3',
  [
    '-batch',
    '-json',
    databasePath,
    `SELECT id, display_order, title, content_markdown
     FROM cours
     WHERE is_published = 1
     ORDER BY display_order, id;`,
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
));

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const rows = records.map((record) => ({
  id: Number(record.id),
  displayOrder: Number(record.display_order),
  title: record.title,
  markdown: record.content_markdown,
}));

for (const course of rows) {
  const prefix = String(course.displayOrder).padStart(2, '0');
  const filename = `${prefix}-${slugify(course.title)}.md`;
  writeFileSync(join(outputDirectory, filename), `${course.markdown.trimEnd()}\n`, 'utf8');
}

console.log(`${rows.length} cours exportés dans ${outputDirectory}`);
