/**
 * Service Worker with Workbox caching strategies
 * Provides offline support and optimized caching for IFC JSON Chunking Frontend
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { 
  StaleWhileRevalidate, 
  CacheFirst, 
  NetworkFirst,
  NetworkOnly 
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Enable navigation preload for faster page loads
self.addEventListener('activate', event => {
  if ('navigationPreload' in self.registration) {
    event.waitUntil(self.registration.navigationPreload.enable());
  }
});

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache and route static assets (this will be populated by Vite/Workbox)
precacheAndRoute(self.__WB_MANIFEST);

// Cache strategy for static assets (JS, CSS, images)
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'ifc-chunking-static-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache strategy for web fonts
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'ifc-chunking-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache strategy for API calls (with background sync for failed requests)
const bgSyncPlugin = new BackgroundSyncPlugin('ifc-api-queue', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'ifc-chunking-api-cache',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache strategy for uploaded files and analysis results
registerRoute(
  ({ url }) => 
    url.pathname.startsWith('/api/files/') ||
    url.pathname.startsWith('/api/queries/'),
  new StaleWhileRevalidate({
    cacheName: 'ifc-chunking-data-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Network-only strategy for real-time operations
registerRoute(
  ({ url }) => 
    url.pathname.startsWith('/api/upload') ||
    url.pathname.startsWith('/api/websocket') ||
    url.pathname.includes('realtime'),
  new NetworkOnly()
);

// Cache strategy for third-party resources (CDN, etc.)
registerRoute(
  ({ url }) => 
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com' ||
    url.origin.includes('cdn'),
  new StaleWhileRevalidate({
    cacheName: 'ifc-chunking-external-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Runtime caching for navigation requests
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'ifc-chunking-pages-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notify clients about cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Handle background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'ifc-api-queue') {
    event.waitUntil(bgSyncPlugin.replayRequests());
  }
});

// Offline fallback for navigation requests
const OFFLINE_FALLBACK_URL = '/offline.html';

// Install offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ifc-chunking-offline-cache')
      .then((cache) => cache.add(OFFLINE_FALLBACK_URL))
  );
});

// Serve offline fallback when network fails
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_FALLBACK_URL);
      })
    );
  }
});

// Cleanup old caches on activation
self.addEventListener('activate', (event) => {
  const currentCaches = [
    'ifc-chunking-static-cache',
    'ifc-chunking-fonts-cache', 
    'ifc-chunking-api-cache',
    'ifc-chunking-data-cache',
    'ifc-chunking-external-cache',
    'ifc-chunking-pages-cache',
    'ifc-chunking-offline-cache'
  ];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Performance monitoring
self.addEventListener('fetch', (event) => {
  const start = performance.now();
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const duration = performance.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`Slow request: ${event.request.url} took ${duration.toFixed(2)}ms`);
        }
        
        return response;
      })
      .catch((error) => {
        console.error(`Request failed: ${event.request.url}`, error);
        throw error;
      })
  );
});

console.log('🔧 Service Worker loaded with caching strategies');