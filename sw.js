/* ===========================================================================
   ATMTL 2026 · Bénévoles — Service worker
   ---------------------------------------------------------------------------
   - Coquille applicative : network-first (mises à jour immédiates)
   - Assets / CDN / polices : cache-first (fonctionne dans les sous-sols)
   - Google Sheets         : jamais intercepté (géré par l'app + localStorage)

   ⚠️ Incrémenter VERSION à chaque modification d'un asset mis en cache.
   =========================================================================== */
const VERSION = 'atmtl26-v3';
const CACHE = VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-dark.png',
  './logo-light.png',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const CDN = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700&display=swap'
];

const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll() échoue en bloc si une seule URL manque : on tolère les échecs.
    await Promise.all([...SHELL, ...CDN].map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
      } catch (_) { /* hors-ligne pendant l'installation : ignoré */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    const cache = await caches.open(CACHE);
    return (await cache.match(request)) ||
           (await cache.match('./index.html')) ||
           (await cache.match('./')) ||
           new Response('Hors-ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  // Données : laisser le réseau + le cache applicatif (localStorage) gérer.
  if (url.hostname === 'docs.google.com' || url.hostname === 'sheets.googleapis.com') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin || CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }
});
