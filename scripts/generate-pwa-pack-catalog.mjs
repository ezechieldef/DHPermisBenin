import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioRoot = path.join(root, 'assets/audio');
const output = path.join(root, 'pwa-staging/offline-packs.json');
const withHash = process.argv.includes('--hash');

const walk = async (dir) => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(async (entry) => {
  const target = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(target) : target;
}))).flat();

const audioFiles = (await walk(audioRoot)).filter((file) => file.endsWith('.aac')).sort();
const groups = new Map();

for (const file of audioFiles) {
  const relative = path.relative(audioRoot, file).split(path.sep).join('/');
  let id;
  let title;
  if (relative.startsWith('courses/')) {
    const course = relative.match(/course-(\d+)/)?.[1] || 'autres';
    id = `cours-${course}`;
    title = `Audio du cours ${Number(course) || course}`;
  } else {
    const kind = relative.startsWith('questions/') ? 'questions' : 'options';
    const number = Number(relative.match(/q-(\d+)/)?.[1] || 0);
    const start = Math.floor(Math.max(0, number - 1) / 100) * 100 + 1;
    const end = start + 99;
    id = `${kind}-${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`;
    title = `${kind === 'questions' ? 'Questions' : 'Options'} ${start} à ${end}`;
  }
  if (!groups.has(id)) groups.set(id, { id, title, version: 1, files: [] });
  const stat = await fs.stat(file);
  const item = { url: `/assets/audio/${relative}`, bytes: stat.size };
  if (withHash) item.sha256 = createHash('sha256').update(await fs.readFile(file)).digest('hex');
  groups.get(id).files.push(item);
}

const packs = [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)).map((pack) => ({
  ...pack,
  bytes: pack.files.reduce((sum, file) => sum + file.bytes, 0),
  fileCount: pack.files.length,
}));

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  integrity: withHash ? 'sha256' : 'size-only',
  totalBytes: packs.reduce((sum, pack) => sum + pack.bytes, 0),
  totalFiles: packs.reduce((sum, pack) => sum + pack.fileCount, 0),
  packs,
};

await fs.writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Catalogue PWA: ${packs.length} packs, ${catalog.totalFiles} fichiers, ${(catalog.totalBytes / 1024 / 1024).toFixed(1)} Mo`);
