const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function worker(fetch) {
  const stores = new Map();
  const messages = [];
  const handlers = {};
  const url = (request) => new URL(typeof request === 'string' ? request : request.url, 'https://app.test').href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) { return store.get(url(request))?.clone(); },
        async put(request, response) { store.set(url(request), response.clone()); },
        async delete(request) { return store.delete(url(request)); },
      };
    },
    async match(request) { for (const name of stores.keys()) { const value = await (await this.open(name)).match(request); if (value) return value; } },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, Response, Headers, crypto: crypto.webcrypto, fetch, caches,
    Request: class extends Request { constructor(input, options) { super(url(input), options); } },
    self: { location: { origin: 'https://app.test' }, addEventListener(type, handler) { handlers[type] = handler; }, clients: { async matchAll() { return [{ postMessage(message) { messages.push(message); } }]; } } },
  });
  vm.runInContext(fs.readFileSync('pwa-staging/service-worker.js', 'utf8').replace('__PRECACHE_URLS__', '[]'), context);
  return { context, caches, messages, handlers, download: (pack) => { context.pack = pack; return vm.runInContext('downloadPack(pack)', context); } };
}
const body = Buffer.from('audio decoded data');
const file = { url: '/assets/audio/questions/q-0001.aac', bytes: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex') };
const pack = { id: 'questions-test', version: 1, files: [file] };

test('un transfert compressé est validé sur les octets décodés et reprend sans réseau', async () => {
  let requests = 0;
  const w = worker(async () => { requests++; return new Response(body, { headers: { 'content-length': String(body.length + 4), 'content-encoding': 'br', 'content-type': 'audio/aac' } }); });
  await w.download(pack);
  assert.equal(w.messages.at(-1).type, 'PACK_COMPLETE');
  await w.download(pack);
  assert.equal(requests, 1);
  assert.equal(w.messages.at(-1).type, 'PACK_COMPLETE');
});

test('un fichier altéré de même taille est rejeté, puis peut être retéléchargé', async () => {
  let corrupted = true;
  const w = worker(async () => new Response(corrupted ? Buffer.alloc(body.length) : body));
  await w.download(pack);
  assert.equal(w.messages.at(-1).type, 'PACK_ERROR');
  assert.equal(await (await w.caches.open('dhp-pack-questions-test')).match('/__offline_pack__/questions-test'), undefined);
  corrupted = false;
  await w.download(pack);
  assert.equal(w.messages.at(-1).type, 'PACK_COMPLETE');
});

test('les fichiers incomplets en cache sont revérifiés avant de reprendre', async () => {
  const w = worker(async () => new Response(body));
  await (await w.caches.open('dhp-pack-questions-test')).put(file.url, new Response('short'));
  await w.download(pack);
  assert.equal(w.messages.at(-1).type, 'PACK_COMPLETE');
  assert.equal(await (await w.caches.match(file.url)).text(), body.toString());
});

test('une illustration téléchargée est servie sans accès réseau', async () => {
  const image = { ...file, url: '/assets/assets/questions/q0001.hash.webp' };
  const w = worker(async () => new Response(body));
  await w.download({ ...pack, id: 'images-questions', files: [image] });
  w.context.fetch = async () => { throw new Error('offline'); };
  let response;
  w.handlers.fetch({ request: new w.context.Request(image.url), respondWith(promise) { response = promise; } });
  assert.equal(await (await response).text(), body.toString());
});

test('un ancien pack WebP doit être mis à jour avant d’être déclaré complet pour les SVG', async () => {
  const oldImage = { ...file, url: '/assets/assets/questions/q0001.old.webp' };
  const newImage = { ...file, url: '/assets/assets/questions/q0001.new.svg' };
  const w = worker(async () => new Response(body));
  const currentPack = { id: 'images-questions', version: 2, files: [newImage] };
  const status = async () => {
    let completion, message;
    w.handlers.message({
      data: { type: 'GET_PACK_STATUS', packs: [{ id: currentPack.id, version: currentPack.version }] },
      source: { postMessage(value) { message = value; } },
      waitUntil(promise) { completion = promise; },
    });
    await completion;
    return Array.from(message.installed);
  };
  await w.download({ ...currentPack, version: 1, files: [oldImage] });
  assert.deepEqual(await status(), []);
  await w.download(currentPack);
  assert.deepEqual(await status(), ['images-questions']);
  w.context.fetch = async () => { throw new Error('offline'); };
  let response;
  w.handlers.fetch({ request: new w.context.Request(newImage.url), respondWith(promise) { response = promise; } });
  assert.equal(await (await response).text(), body.toString());
});

test('l’enregistrement du service worker ne recharge pas et ne force pas une mise à jour', async () => {
  const source = fs.readFileSync('scripts/prepare-pwa-dist.mjs', 'utf8').match(/const registration = `<script>(.*?)<\/script>`;/s)[1];
  const callbacks = {};
  let registered = false;
  vm.runInNewContext(source, {
    window: { addEventListener(type, callback) { callbacks[type] = callback; } },
    navigator: { serviceWorker: { async register() { registered = true; return { waiting: { postMessage() { assert.fail('activation automatique'); } } }; } } },
    console,
    location: { reload() { assert.fail('rechargement automatique'); } },
  });
  callbacks.load();
  await Promise.resolve();
  assert.equal(registered, true);
});

function storageModule() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/quiz-storage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  return exports;
}

test('un rechargement restaure le sujet, les réponses, la question et les validations; quitter les efface', () => {
  const { restoreQuiz, persistQuiz, EMPTY_QUIZ } = storageModule();
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const snapshot = { session: { mode: 'subject', startedAt: 123, questions: [{ id: 1 }, { id: 2 }], answers: { 1: ['B', 'C'] } }, result: null, index: 1, submittedQuestionIds: [1] };
  persistQuiz(storage, snapshot);
  assert.equal(JSON.stringify(restoreQuiz(storage)), JSON.stringify(snapshot));
  persistQuiz(storage, EMPTY_QUIZ);
  assert.equal(restoreQuiz(storage).session, null);
  storage.getItem = () => '{invalid';
  assert.equal(restoreQuiz(storage).session, null);
  storage.getItem = () => JSON.stringify({ ...snapshot, index: 99 });
  assert.equal(restoreQuiz(storage).session, null);
});


test('les audios en cache répondent aux requêtes partielles Safari sans réseau', async () => {
  const w = worker(async () => new Response(body));
  await w.download(pack);
  w.context.fetch = async () => { throw new Error('offline'); };
  let response;
  w.handlers.fetch({ request: new w.context.Request(file.url, { headers: { range: 'bytes=2-5' } }), respondWith(promise) { response = promise; } });
  const partial = await response;
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), `bytes 2-5/${body.length}`);
  assert.equal(await partial.text(), body.subarray(2, 6).toString());
});

test('les ressources essentielles précachées restent accessibles hors ligne', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  await (await w.caches.open('__APP_VERSION__-shell')).put('/bundle.js', new Response('app code'));
  let response;
  w.handlers.fetch({ request: new w.context.Request('/bundle.js'), respondWith(promise) { response = promise; } });
  assert.equal(await (await response).text(), 'app code');
});
