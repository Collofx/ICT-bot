const CACHE = 'ict-bot-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;900&display=swap'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (twelvedata.com): always network, never cache (need live data)
// - Everything else: cache first, fallback to network
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Live API — always go to network
  if(url.includes('twelvedata.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"status":"error","message":"No internet connection"}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // App shell — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new successful responses
        if(response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// Background sync — notify when market opens
self.addEventListener('message', e => {
  if(e.data === 'CHECK_MARKET') {
    const now  = new Date();
    const day  = now.getUTCDay();
    const hour = now.getUTCHours();
    const hhmm = now.getUTCHours() * 100 + now.getUTCMinutes();
    const open = !(day === 6 || (day === 0 && hhmm < 2100) || (day === 5 && hhmm >= 2100));
    e.source.postMessage({ type: 'MARKET_STATUS', open });
  }
});
