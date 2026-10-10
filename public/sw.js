const CACHE_NAME = 'psa-shell-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/favicon-32x32.png?v=2',
  '/icons/favicon-16x16.png?v=2',
  '/icons/android-chrome-192x192.png?v=2',
  '/icons/android-chrome-512x512.png?v=2',
  '/icons/apple-touch-icon.png?v=2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isAsset = ['style', 'script', 'image', 'font'].includes(request.destination);

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          return cached || caches.match('/');
        }
      })()
    );
    return;
  }

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then(async (response) => {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          return response;
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
