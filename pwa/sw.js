// Service worker for the phone companion on GitHub Pages (copied into dist by the `pages` Vite build,
// which replaces __BUILD_ID__ so each deploy gets a fresh cache).
// Pages: network first, so a new deploy shows up on the next launch; cached copy when offline.
// Hashed build files (assets/*): cache first, they never change.
const CACHE = 'kk-phone-__BUILD_ID__';
const SCOPE = new URL(self.registration.scope);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('kk-phone-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(SCOPE.pathname + 'index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match(SCOPE.pathname + 'index.html').then((cached) => cached || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith(SCOPE.pathname + 'assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
