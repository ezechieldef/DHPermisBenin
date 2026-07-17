const APP_VERSION = '__APP_VERSION__';
const SHELL_CACHE = `${APP_VERSION}-shell`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const PACK_CACHE_PREFIX = 'dhp-pack-';
const SHELL_URLS = __PRECACHE_URLS__;
const cancelledPacks = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    for (const url of SHELL_URLS) {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch { /* A runtime request can retry this asset. */ }
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('dhp-') && !keep.has(key) && !key.startsWith(PACK_CACHE_PREFIX)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request, url.pathname));
    return;
  }
  if (url.pathname.startsWith('/assets/audio/')) {
    event.respondWith(cacheFirstAcrossPacks(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', (event) => {
  const { type, pack } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'DOWNLOAD_PACK' && pack) event.waitUntil(downloadPack(pack));
  if (type === 'CANCEL_PACK' && pack?.id) cancelledPacks.add(pack.id);
  if (type === 'DELETE_PACK' && pack?.id) event.waitUntil(deletePack(pack.id));
  if (type === 'GET_PACK_STATUS') event.waitUntil(sendPackStatus(event.source));
});

async function networkFirstNavigation(request, pathname) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const clean = pathname === '/' ? '/index' : pathname.replace(/\/$/, '');
    return (await cache.match(request, { ignoreSearch: true }))
      || (await cache.match(`${clean}.html`))
      || (await cache.match(`${clean}/index.html`))
      || (await cache.match('/index.html'))
      || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const update = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

async function cacheFirstAcrossPacks(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
    return response;
  } catch { return Response.error(); }
}

async function downloadPack(pack) {
  cancelledPacks.delete(pack.id);
  const cacheName = `${PACK_CACHE_PREFIX}${pack.id}`;
  const cache = await caches.open(cacheName);
  let completed = 0;
  try {
    for (const file of pack.files) {
      if (cancelledPacks.has(pack.id)) {
        await broadcast({ type: 'PACK_CANCELLED', packId: pack.id });
        return;
      }
      const request = new Request(file.url, { cache: 'no-store' });
      const existing = await cache.match(request);
      if (!existing) {
        const response = await fetch(request);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${file.url}`);
        if (file.bytes && Number(response.headers.get('content-length')) && Number(response.headers.get('content-length')) !== file.bytes) throw new Error(`Taille incorrecte: ${file.url}`);
        if (file.sha256 && !(await responseMatchesSha256(response.clone(), file.sha256))) throw new Error(`Empreinte incorrecte: ${file.url}`);
        await cache.put(request, response);
      }
      completed += 1;
      await broadcast({ type: 'PACK_PROGRESS', packId: pack.id, completed, total: pack.files.length });
    }
    await cache.put(new Request(`/__offline_pack__/${pack.id}`), new Response(JSON.stringify({ id: pack.id, version: pack.version, completedAt: new Date().toISOString() }), { headers: { 'content-type': 'application/json' } }));
    await broadcast({ type: 'PACK_COMPLETE', packId: pack.id });
  } catch (error) {
    await broadcast({ type: 'PACK_ERROR', packId: pack.id, message: String(error?.message || error) });
    throw error;
  }
}

async function deletePack(packId) {
  await caches.delete(`${PACK_CACHE_PREFIX}${packId}`);
  await broadcast({ type: 'PACK_DELETED', packId });
}

async function sendPackStatus(target) {
  const keys = await caches.keys();
  const candidates = keys.filter((key) => key.startsWith(PACK_CACHE_PREFIX));
  const installed = [];
  for (const key of candidates) {
    const packId = key.slice(PACK_CACHE_PREFIX.length);
    const cache = await caches.open(key);
    if (await cache.match(`/__offline_pack__/${packId}`)) installed.push(packId);
  }
  target?.postMessage({ type: 'PACK_STATUS', installed });
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

async function responseMatchesSha256(response, expected) {
  const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return actual === expected.toLowerCase();
}
