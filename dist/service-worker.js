const APP_VERSION = 'dhp-v1';
const SHELL_CACHE = `${APP_VERSION}-shell`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const PACK_CACHE_PREFIX = `${APP_VERSION}-pack-`;
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/pwa-icons/icon-192.png', '/pwa-icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_URLS.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch { /* The offline screen reports incomplete installation. */ }
    }));
    await self.skipWaiting();
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
    event.respondWith(networkFirst(request, SHELL_CACHE, '/index.html'));
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
  if (type === 'DELETE_PACK' && pack?.id) event.waitUntil(deletePack(pack.id));
  if (type === 'GET_PACK_STATUS') event.waitUntil(sendPackStatus(event.source));
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackUrl)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

async function cacheFirstAcrossPacks(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
    return response;
  } catch { return Response.error(); }
}

async function downloadPack(pack) {
  const cacheName = `${PACK_CACHE_PREFIX}${pack.id}`;
  const cache = await caches.open(cacheName);
  let completed = 0;
  try {
    for (const file of pack.files) {
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
  const installed = keys.filter((key) => key.startsWith(PACK_CACHE_PREFIX)).map((key) => key.slice(PACK_CACHE_PREFIX.length));
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
