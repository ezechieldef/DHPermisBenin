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
const metroNodeAssets = path.join(dist, 'assets/node_modules');
if (await exists(metroNodeAssets)) {
  await fs.cp(metroNodeAssets, path.join(dist, 'pwa-runtime'), { recursive: true });
}
for (const name of ['manifest.webmanifest', 'offline-packs.json', 'offline-manager.js', '.htaccess']) {
  await fs.copyFile(path.join(staging, name), path.join(dist, name));
}

// Updates stay waiting until the user explicitly activates them in the app.
const registration = `<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).catch(console.error)});}</script>`;
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

async function rewriteMetroNodeAssetUrls(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await rewriteMetroNodeAssetUrls(target);
    else if (/\.(?:html|js|css|json)$/.test(entry.name)) {
      const source = await fs.readFile(target, 'utf8');
      const rewritten = source.replaceAll('/assets/node_modules/', '/pwa-runtime/');
      if (rewritten !== source) await fs.writeFile(target, rewritten);
    }
  }
}
await rewriteMetroNodeAssetUrls(dist);

// Metro fingerprints image URLs: catalog the exported files, not source paths.
const catalogPath = path.join(dist, 'offline-packs.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const imagePacks = [];
for (const [kind, title] of [['course', 'Illustrations des cours'], ['questions', 'Illustrations des questions']]) {
  const directory = path.join(dist, 'assets/assets', kind);
  const files = [];
  async function collectImages(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await collectImages(target);
      else if (/\.(png|jpe?g|webp|svg)$/i.test(entry.name)) {
        const body = await fs.readFile(target);
        files.push({ url: `/${path.relative(dist, target).split(path.sep).join('/')}`, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
      }
    }
  }
  if (await exists(directory)) await collectImages(directory);
  if (!files.length) throw new Error(`Illustrations absentes de l’export: ${kind}`);
  files.sort((a, b) => a.url.localeCompare(b.url));
  imagePacks.push({ id: `images-${kind}`, title, version: 1, files, fileCount: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) });
}
catalog.packs = [...catalog.packs.filter((pack) => !pack.id.startsWith('images-')), ...imagePacks];
catalog.totalBytes = catalog.packs.reduce((sum, pack) => sum + pack.bytes, 0);
catalog.totalFiles = catalog.packs.reduce((sum, pack) => sum + pack.fileCount, 0);
await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

const precacheFiles = [];
async function collectPrecache(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectPrecache(target);
    else {
      const relative = `/${path.relative(dist, target).split(path.sep).join('/')}`;
      if (relative.startsWith('/assets/node_modules/') || relative.includes('/audio/') || relative.startsWith('/assets/assets/course/') || relative.startsWith('/assets/assets/questions/') || relative.endsWith('.map') || ['/service-worker.js', '/offline-manager.js', '/.htaccess'].includes(relative)) continue;
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
