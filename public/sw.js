// Agro-IA-Tolima PWA Service Worker - Automatic Cache Busting & Remote Updates
const CACHE_NAME = 'agro-ia-tolima-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/updater.js',
  '/logo.svg',
  '/icon.svg',
  '/logo.png',
  '/icon.png',
  '/agro_ia_tolima_logo_1024-v2.png',
  '/agro_ia_tolima_icon_512-v2.png',
  '/agro_ia_tolima_icon_192-v2.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// Handle messages from client (e.g. SKIP_WAITING request)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: pre-cache core static shell and skip waiting immediately
self.addEventListener('install', (event) => {
  console.log('[SW Agro-IA-Tolima] Instalando nueva versión:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW Agro-IA-Tolima] Warning al precachear assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean legacy caches & claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating AgroIA Tolima SW:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor:
// 1. Never cache version.json (always fetch fresh)
// 2. Network-First strategy for /api/* endpoints
// 3. Cache-First with Network fallback for static assets & tiles
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or Chrome extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Always bypass cache for version control JSON
  if (url.pathname.includes('version.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-First Strategy for /api/* backend routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response(
              JSON.stringify({
                success: false,
                offline: true,
                message: 'Modo fuera de línea activo (Sin conexión a internet).',
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Cache-First Strategy for static assets, scripts, images & map tiles
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Asynchronously update cache in background (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});

// Background Sync Listener for offline survey queue flush when signal returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-surveys') {
    console.log('[SW BackgroundSync] Sincronización en segundo plano activada');
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BG_SYNC_TRIGGERED' });
        });
      })
    );
  }
});
