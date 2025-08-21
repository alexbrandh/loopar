const CACHE_NAME = 'loopar-v3';
const urlsToCache = [
  '/',
  '/dashboard',
  '/help',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  try {
    const req = event.request;
    const url = new URL(req.url);

    // Let the browser handle cross-origin requests and HEAD requests (do not intercept)
    if (req.method === 'HEAD' || url.origin !== self.location.origin) {
      return; // No respondWith => falls back to default network behavior
    }

    // Do not intercept API calls to avoid interfering with server logic
    if (url.pathname.startsWith('/api/')) {
      return;
    }

    // Navigation requests: network-first, fallback to offline page
    if (req.mode === 'navigate' || req.destination === 'document') {
      event.respondWith(
        fetch(req).catch(() => caches.match('/offline.html'))
      );
      return;
    }

    // Other same-origin requests: cache-first, then network, always return a Response
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout (offline)' }));
      })
    );
  } catch (e) {
    // As a last resort, do not intercept on unexpected errors
    // This avoids TypeError: Failed to convert value to 'Response'
    return;
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});