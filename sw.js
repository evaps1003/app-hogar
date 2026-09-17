const CACHE_NAME = 'app-hogar-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          if (url.pathname.endsWith('/index.html') || url.pathname === '/') {
            return caches.match('./index.html').then((index) => {
              if (index) {
                return index;
              }
              return new Response('Sin conexion', {
                status: 503,
                statusText: 'Sin conexion',
              });
            });
          }
          return new Response('Sin conexion', {
            status: 503,
            statusText: 'Sin conexion',
          });
        }),
      ),
  );
});