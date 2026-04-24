const CACHE = 'harmonic-atlas-v11';
const ASSETS = ['./manifest.json',
  './icons/icon-192.png','./icons/icon-512.png',
  './icons/apple-touch-icon.png','./icons/favicon-32.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  // Network-first for HTML navigation — always get the latest app on reload
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for all other assets (icons, manifest)
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
