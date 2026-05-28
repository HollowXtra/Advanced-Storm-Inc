const CACHE_NAME = 'storm-inc-shell-v8';
const SHELL_ASSETS = [
  './TCM.html',
  './a.png',
  './favicon/site.webmanifest',
  './favicon/apple-touch-icon.png',
  './favicon/android-chrome-192x192.png',
  './favicon/android-chrome-512x512.png',
  './favicon/favicon-32x32.png',
  './favicon/favicon-16x16.png',
  './js/audio.js',
  './js/city-data.js',
  './js/cyclone-model.js',
  './js/environment-model.js',
  './js/fictionia-map.js',
  './js/forecast-models.js',
  './js/impact-system.js',
  './js/invest-system.js',
  './js/main.js',
  './js/radar-doppler.js',
  './js/radar-system.js',
  './js/satellite-view.js',
  './js/terrain-data.js',
  './js/utils.js',
  './js/visualization.js',
  './js/world-f.json',
  './js/elevation_1080x540.png'
].map((asset) => new URL(asset, self.location.href).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  if (isDocument) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    return cached || caches.match(new URL('./TCM.html', self.location.href).toString());
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
