self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-static-v1').then((cache) => cache.addAll([
      '/', '/index.html', '/manifest.json'
    ]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});