const CACHE_NAME = 'app-static-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      '/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
    ]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 仅处理同源 GET 请求，避免干预后端 API（onrender.com）
  if (url.origin !== self.location.origin || req.method !== 'GET') return;

  // HTML 网络优先
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 静态资源网络优先，失败回退缓存
  if (/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|json)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 其他同源 GET：缓存优先
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
