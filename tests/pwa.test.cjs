const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('la PWA déclare ses icônes, son mode autonome et sa langue', () => {
  const manifest = JSON.parse(read('pwa-staging/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'fr-BJ');
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
});

test('le serveur LWS fournit les en-têtes indispensables à SQLite Web', () => {
  const htaccess = read('pwa-staging/.htaccess');
  assert.match(htaccess, /Cross-Origin-Opener-Policy "same-origin"/);
  assert.match(htaccess, /Cross-Origin-Embedder-Policy "require-corp"/);
  assert.match(htaccess, /Cross-Origin-Resource-Policy "same-origin"/);
});

test('le service worker prend en charge précache, reprise et annulation', () => {
  const worker = read('pwa-staging/service-worker.js');
  assert.match(worker, /__PRECACHE_URLS__/);
  assert.match(worker, /DOWNLOAD_PACK/);
  assert.match(worker, /CANCEL_PACK/);
  assert.match(worker, /ignoreSearch: true/);
});

test('le build republie les dépendances Web hors du chemin node_modules ignoré par Git', () => {
  const prepare = read('scripts/prepare-pwa-dist.mjs');
  assert.match(prepare, /pwa-runtime/);
  assert.match(prepare, /replaceAll\('\/assets\/node_modules\/', '\/pwa-runtime\/'\)/);
});

test('le Web conserve les URL stables des quiz sans embarquer les audios de cours', () => {
  const assets = read('src/services/audio-assets.web.ts');
  assert.match(assets, /'\/assets\/audio\/questions\/q-0001\.aac'/);
  assert.doesNotMatch(assets, /\/assets\/audio\/courses\//);
  assert.doesNotMatch(assets, /require\(/);
});
