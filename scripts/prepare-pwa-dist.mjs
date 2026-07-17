import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.argv[2] || 'dist');
const staging = path.join(root, 'pwa-staging');

const exists = async (target) => fs.access(target).then(() => true).catch(() => false);
if (!(await exists(dist))) throw new Error(`Export web introuvable: ${dist}`);

await fs.cp(path.join(staging, 'pwa-icons'), path.join(dist, 'pwa-icons'), { recursive: true });
await fs.cp(path.join(root, 'assets/audio'), path.join(dist, 'assets/audio'), { recursive: true });
for (const name of ['manifest.webmanifest', 'offline-packs.json', 'offline-manager.js', '.htaccess']) {
  await fs.copyFile(path.join(staging, name), path.join(dist, name));
}

const registration = `<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).catch(console.error));}</script>`;
const manifest = `<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0B8F6A"><link rel="apple-touch-icon" href="/pwa-icons/icon-192.png">`;

const htmlFiles = [];
async function collectHtml(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectHtml(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}
await collectHtml(dist);

for (const file of htmlFiles) {
  let html = await fs.readFile(file, 'utf8');
  if (!html.includes('manifest.webmanifest')) html = html.replace('</head>', `${manifest}</head>`);
  if (!html.includes("serviceWorker.register('/service-worker.js'")) html = html.replace('</body>', `${registration}</body>`);
  await fs.writeFile(file, html);
}

const precacheFiles = [];
async function collectPrecache(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectPrecache(target);
    else {
      const relative = `/${path.relative(dist, target).split(path.sep).join('/')}`;
      if (relative.includes('/audio/') || relative.endsWith('.map') || ['/service-worker.js', '/offline-manager.js', '/.htaccess'].includes(relative)) continue;
      precacheFiles.push(relative);
    }
  }
}
await collectPrecache(dist);
if (!precacheFiles.includes('/index.html')) throw new Error('index.html absent du précache PWA');
precacheFiles.sort();
const versionSeed = await Promise.all(precacheFiles.map(async (url) => {
  const stat = await fs.stat(path.join(dist, url.slice(1)));
  return `${url}:${stat.size}:${stat.mtimeMs}`;
}));
let worker = await fs.readFile(path.join(staging, 'service-worker.js'), 'utf8');
versionSeed.push(worker);
const appVersion = `dhp-${createHash('sha256').update(versionSeed.join('|')).digest('hex').slice(0, 12)}`;
worker = worker.replace('__APP_VERSION__', appVersion).replace('__PRECACHE_URLS__', JSON.stringify(precacheFiles));
await fs.writeFile(path.join(dist, 'service-worker.js'), worker);

console.log(`PWA ${appVersion} préparée dans ${dist}: ${htmlFiles.length} page(s), ${precacheFiles.length} ressources essentielles et packs audio.`);
