/* eslint-disable no-restricted-globals */

// ── Cache Configuration ─────────────────────────────────────────────────────
const CACHE_VERSION = 'ob-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static shell files to pre-cache on install.
// Next.js static export places assets under the basePath.
const BASE_PATH = '/Operation-burrito';

const PRECACHE_URLS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192.svg`,
  `${BASE_PATH}/icons/icon-512.svg`,
  `${BASE_PATH}/icons/icon-180.svg`,
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────────────────────
// Remove old versioned caches when a new SW takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────────────────────

/**
 * Routing strategy:
 *  - api.github.com  => network-first (fresh Gist data, cached fallback)
 *  - same-origin     => cache-first  (static shell, fast offline loads)
 *  - everything else => passthrough  (no caching)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests — mutations go straight to network
  if (request.method !== 'GET') {
    return;
  }

  // GitHub Gist API — network-first
  if (url.hostname === 'api.github.com') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Same-origin static assets — cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // All other requests — passthrough (no caching)
});

// ── Strategies ──────────────────────────────────────────────────────────────

/**
 * Cache-first: return cached response if available, otherwise fetch from
 * network and store in cache for next time.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline and not in cache — return a basic offline page
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Network-first: try network, fall back to cache. When network succeeds,
 * update the cache for next time (stale-while-revalidate for API data).
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Notify clients that an API call failed offline so they can queue it
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_OFFLINE',
          url: request.url,
        });
      });
    });

    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline. This request has been queued.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ── Message handler ─────────────────────────────────────────────────────────
// Allow clients to communicate with the SW (e.g., skip waiting on update)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
