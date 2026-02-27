const CACHE_NAME = 'photo-studio-v2';

// Only pre-cache the offline fallback itself
const PRECACHE_ASSETS = ['/offline.html'];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // ── 1. Skip non-GET requests ──────────────────────────────────────────────
  if (request.method !== 'GET') return;

  // ── 2. ALWAYS skip navigation requests (HTML page loads) ─────────────────
  //    Let Next.js / the browser handle these directly.
  //    This prevents the offline page from appearing on valid app routes.
  if (request.mode === 'navigate') return;

  // ── 3. Skip API / backend requests ───────────────────────────────────────
  const url = new URL(request.url);
  if (
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith('/api/') ||
    url.port === '3001'
  ) return;

  // ── 4. Cache-first for static assets (images, fonts, icons, etc.) ────────
  const isStaticAsset =
    /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
  // All other requests (JS chunks, CSS, etc.) — network only, no interference
});
