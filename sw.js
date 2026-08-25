// Cache name is derived from the ?v= the page registers us with, so bumping
// window.APP_VERSION in index.html is the only edit a deploy needs.
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE   = 'harmonic-atlas-' + VERSION;        // app shell, replaced every deploy
const RUNTIME = 'harmonic-atlas-runtime';           // third-party audio, survives deploys

const ASSETS = ['./index.html', './manifest.json',
  './icons/icon-192.png','./icons/icon-512.png',
  './icons/apple-touch-icon.png','./icons/favicon-32.png'];

// Cross-origin hosts worth keeping offline: Tone.js itself, the Salamander piano
// and the acoustic guitar samples. Without these an installed app is silent.
const RUNTIME_HOSTS = [
  'cdn.jsdelivr.net',
  'tonejs.github.io',
  'nbrosowsky.github.io',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', e => {
  // Cache assets one at a time. addAll() is atomic: a single 404 or redirect
  // rejects the whole batch and leaves nothing precached, which is how a dev
  // server that redirects /index.html could silently kill the offline shell.
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(ASSETS.map(u =>
      c.add(u).catch(err => console.warn('[sw] precache skipped', u, err && err.message))
    ))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Drop old app-shell caches but keep RUNTIME, so a deploy does not force a
  // re-download of every piano sample.
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys
      .filter(k => k !== CACHE && k !== RUNTIME && k.startsWith('harmonic-atlas-'))
      .map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML: network-first so a deploy is picked up immediately.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Third-party audio and fonts: stale-while-revalidate into RUNTIME, so the app
  // has sound offline after one online visit.
  let host = '';
  try { host = new URL(req.url).hostname; } catch (err) { host = ''; }
  if (RUNTIME_HOSTS.indexOf(host) !== -1) {
    e.respondWith(caches.open(RUNTIME).then(cache =>
      cache.match(req).then(hit => {
        const network = fetch(req).then(res => {
          // Opaque (no-cors) responses have status 0 but are still cacheable.
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    ));
    return;
  }

  // Own static assets: cache-first.
  e.respondWith(caches.match(req).then(c => c || fetch(req)));
});
