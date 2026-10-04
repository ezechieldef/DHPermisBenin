const APP_VERSION = 'dhp-be6327ea5db1';
const SHELL_CACHE = `${APP_VERSION}-shell`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const PACK_CACHE_PREFIX = 'dhp-pack-';
const SHELL_URLS = ["/(tabs)/cours.html","/(tabs)/entrainement.html","/(tabs)/examen.html","/(tabs)/index.html","/(tabs)/progression.html","/(tabs)/settings.html","/+not-found.html","/_expo/.routes.json","/_expo/static/css/web-8c8856967fb2c6b4708c13abd4dbddc3.css","/_expo/static/js/web/entry-68c1f7a248eca5b2d7882bad218c3169.js","/_expo/static/js/web/worker-507efd358eac29d17d79fba7c96d55bb.js","/_sitemap.html","/assets/assets/database/permis.1d0316c499242c2594c7a0df56c173de.sqlite","/category/[id].html","/cours.html","/course-subjects/[id].html","/course/[id].html","/entrainement.html","/examen.html","/favicon.ico","/index.html","/manifest.webmanifest","/offline-packs.json","/offline.html","/progression.html","/pwa-icons/icon-192.png","/pwa-icons/icon-512.png","/pwa-icons/icon-maskable-512.png","/pwa-runtime/@expo-google-fonts/poppins/100Thin/Poppins_100Thin.9ec263601ee3fcd71763941207c9ad0d.ttf","/pwa-runtime/@expo-google-fonts/poppins/100Thin_Italic/Poppins_100Thin_Italic.01555d25092b213d2ea3a982123722c9.ttf","/pwa-runtime/@expo-google-fonts/poppins/200ExtraLight/Poppins_200ExtraLight.6f8391bbdaeaa540388796c858dfd8ca.ttf","/pwa-runtime/@expo-google-fonts/poppins/200ExtraLight_Italic/Poppins_200ExtraLight_Italic.a9bed017984a258097841902b696a7a6.ttf","/pwa-runtime/@expo-google-fonts/poppins/300Light/Poppins_300Light.fcc40ae9a542d001971e53eaed948410.ttf","/pwa-runtime/@expo-google-fonts/poppins/300Light_Italic/Poppins_300Light_Italic.0613c488cf7911af70db821bdd05dfc4.ttf","/pwa-runtime/@expo-google-fonts/poppins/400Regular/Poppins_400Regular.093ee89be9ede30383f39a899c485a82.ttf","/pwa-runtime/@expo-google-fonts/poppins/400Regular_Italic/Poppins_400Regular_Italic.c1034239929f4651cc17d09ed3a28c69.ttf","/pwa-runtime/@expo-google-fonts/poppins/500Medium/Poppins_500Medium.bf59c687bc6d3a70204d3944082c5cc0.ttf","/pwa-runtime/@expo-google-fonts/poppins/500Medium_Italic/Poppins_500Medium_Italic.cf5ba39d9ac24652e25df8c291121506.ttf","/pwa-runtime/@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.6f1520d107205975713ba09df778f93f.ttf","/pwa-runtime/@expo-google-fonts/poppins/600SemiBold_Italic/Poppins_600SemiBold_Italic.9841f3d906521f7479a5ba70612aa8c8.ttf","/pwa-runtime/@expo-google-fonts/poppins/700Bold/Poppins_700Bold.08c20a487911694291bd8c5de41315ad.ttf","/pwa-runtime/@expo-google-fonts/poppins/700Bold_Italic/Poppins_700Bold_Italic.19406f767addf00d2ea82cdc9ab104ce.ttf","/pwa-runtime/@expo-google-fonts/poppins/800ExtraBold/Poppins_800ExtraBold.d45bdbc2d4a98c1ecb17821a1dbbd3a4.ttf","/pwa-runtime/@expo-google-fonts/poppins/800ExtraBold_Italic/Poppins_800ExtraBold_Italic.8afe4dc13b83b66fec0ea671419954cc.ttf","/pwa-runtime/@expo-google-fonts/poppins/900Black/Poppins_900Black.14d00dab1f6802e787183ecab5cce85e.ttf","/pwa-runtime/@expo-google-fonts/poppins/900Black_Italic/Poppins_900Black_Italic.e9c5c588e39d0765d30bcd6594734102.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.3f78af31cca60105799838a1a7a59fbd.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.31b5ffea3daddc69dd01a1f3d6cf63c5.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.140c53a7643ea949007aa9a282153849.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.3b89dd103490708d19a95adcae52210e.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.1f77739ca9ff2188b539c36f30ffa2be.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.605ed7926cf39a2ad5ec2d1f9d391d3d.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.56c8d80832e37783f12c05db7c8849e2.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.370dd5af19f8364907b6e2c41f45dbbf.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.adec7d6f310bc577f05e8fe06a5daccf.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.b49ae8ab2dbccb02c4d11caaacf09eab.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.e20945d7c929279ef7a6f1db184a4470.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.871378c6eab492a3e689a9385dc45a12.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.d2285965fe34b05465047401b8595dd0.ttf","/pwa-runtime/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.1681f34aaca71b8dfb70756bca331eb2.ttf","/pwa-runtime/@react-navigation/elements/lib/module/assets/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png","/pwa-runtime/@react-navigation/elements/lib/module/assets/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png","/pwa-runtime/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png","/pwa-runtime/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png","/pwa-runtime/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png","/pwa-runtime/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png","/pwa-runtime/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png","/pwa-runtime/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png","/pwa-runtime/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png","/pwa-runtime/expo-sqlite/web/wa-sqlite/wa-sqlite.783a2e11efab57e42036efde040ea8fd.wasm","/quiz/index.html","/result/index.html","/settings.html"];
const cancelledPacks = new Set();
const downloadingPacks = new Set();

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
  if (url.pathname.startsWith('/assets/audio/') || url.pathname.startsWith('/assets/assets/course/') || url.pathname.startsWith('/assets/assets/questions/')) {
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
  const cached = (await cache.match(request, { ignoreSearch: true }))
    || (await (await caches.open(SHELL_CACHE)).match(request, { ignoreSearch: true }));
  const update = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

async function cacheFirstAcrossPacks(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return rangedResponse(request, cached);
  try {
    const response = await fetch(request);
    if (response.status === 200) await (await caches.open(RUNTIME_CACHE)).put(request, response.clone());
    return response;
  } catch { return Response.error(); }
}

// Safari media playback requests byte ranges even for downloaded audio.
async function rangedResponse(request, response) {
  const range = request.headers.get('range');
  if (!range) return response;
  const body = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const size = body.byteLength;
  const start = match?.[1] ? Number(match[1]) : Math.max(0, size - Number(match?.[2]));
  const end = match?.[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!match || (!match[1] && !match[2]) || start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  headers.set('accept-ranges', 'bytes');
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

async function downloadPack(pack) {
  if (downloadingPacks.has(pack.id)) return;
  downloadingPacks.add(pack.id);
  cancelledPacks.delete(pack.id);
  const cacheName = `${PACK_CACHE_PREFIX}${pack.id}`;
  let completed = 0;
  try {
    const cache = await caches.open(cacheName);
    await cache.delete(`/__offline_pack__/${pack.id}`);
    for (const file of pack.files) {
      if (cancelledPacks.has(pack.id)) {
        await broadcast({ type: 'PACK_CANCELLED', packId: pack.id });
        return;
      }
      const request = new Request(file.url, { cache: 'no-store' });
      const existing = await cache.match(request);
      if (!existing || !(await responseMatchesFile(existing.clone(), file))) {
        const response = await fetch(request);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${file.url}`);
        // Content-Length describes the compressed transfer on some hosts.
        // Fetch exposes the decoded body, which is what the catalog hashes.
        if (!(await responseMatchesFile(response.clone(), file))) throw new Error(`Contenu incorrect (taille ou empreinte): ${file.url}`);
        await cache.put(request, response);
      }
      completed += 1;
      await broadcast({ type: 'PACK_PROGRESS', packId: pack.id, completed, total: pack.files.length });
    }
    await cache.put(new Request(`/__offline_pack__/${pack.id}`), new Response(JSON.stringify({ id: pack.id, version: pack.version, completedAt: new Date().toISOString() }), { headers: { 'content-type': 'application/json' } }));
    await broadcast({ type: 'PACK_COMPLETE', packId: pack.id });
  } catch (error) {
    await broadcast({ type: 'PACK_ERROR', packId: pack.id, message: String(error?.message || error) });
  } finally {
    downloadingPacks.delete(pack.id);
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

async function responseMatchesFile(response, file) {
  if (response.headers.get('content-type')?.includes('text/html')) return false;
  const body = await response.arrayBuffer();
  if (body.byteLength !== file.bytes) return false;
  if (!file.sha256) return true;
  const digest = await crypto.subtle.digest('SHA-256', body);
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return actual === file.sha256.toLowerCase();
}
