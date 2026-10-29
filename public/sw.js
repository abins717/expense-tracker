// Expense Tracker service worker.
// Bump VERSION whenever you want to force every phone to drop old caches.
const VERSION = 'v1';
const CACHE = `expense-tracker-${VERSION}`;
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

// Third-party hosts that are safe to cache (page styling + fonts).
// Firebase / Google auth / database traffic is NEVER touched by this worker.
const CACHEABLE_CDNS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Leave Firebase auth helper paths alone.
  if (sameOrigin && url.pathname.startsWith('/__/')) return;
  // Anything that isn't our own files or an allowed CDN goes straight to the network.
  if (!sameOrigin && !CACHEABLE_CDNS.includes(url.hostname)) return;

  // Page loads: network first (so updates arrive), cached shell if offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Everything else: serve from cache instantly, refresh it in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
