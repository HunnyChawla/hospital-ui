const CACHE_NAME = 'cura-hospital-v3'; // Bumping version to force update
const urlsToCache = [
  '/manifest.json',
  '/cura-logo-v2.png',
  '/favicon.ico',
];

// Install event - cache core static resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.error(`[Service Worker] Failed to cache ${url}:`, err))
          )
        );
      })
  );
  self.skipWaiting();
});

// Activate event - clean up ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate and clearing old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - use different strategies for different types of requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Strategy for HTML/navigation requests: Network First
  // We want the freshest HTML to get the newest chunk hashes.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a valid response (including 404 from server, which we should respect)
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch((err) => {
          console.log('[Service Worker] Network fetch failed for document, falling back to cache:', url.pathname);
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            // If even cache is missing, let it fail naturally
            throw err;
          });
        })
    );
    return;
  }

  // Strategy for static assets (JS, CSS, images, fonts): Cache First
  // These assets usually have hashes in their names, making them immutable.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // Only cache successful same-origin responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(err => {
          // For static assets, if fetch fails and not in cache, just return the error
          return null;
        });
      })
  );
});



