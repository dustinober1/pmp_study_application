// PWA Service Worker for PMP 2026 Study App - Micro Learning
// Provides offline caching for micro-learning flashcards and study sessions

const CACHE_NAME = 'pmp-micro-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/micro/queue',
  '/api/micro/due',
  '/api/micro/stats',
  '/api/micro/sessions',
];

// Install event - precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
      // Skip waiting ensures the new service worker activates immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete outdated caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      // Take control of all clients immediately
      self.clients.claim();
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API routes with network-first strategy
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation with network-first, fallback to offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default: network-first for everything else
  event.respondWith(networkFirst(request));
});

// Network-first strategy: Try network first, fall back to cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Cache-first strategy: Try cache first, fall back to network
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a basic error response for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
        '<rect width="200" height="200" fill="#f3f4f6"/>' +
        '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="sans-serif" font-size="16" fill="#6b7280">' +
        'Image unavailable' +
        '</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw error;
  }
}

// Network-first with offline fallback for navigation
async function networkFirstWithOffline(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Fall back to offline page
    return cache.match(OFFLINE_URL) || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head>' +
      '<body><h1>You are offline</h1></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Background sync for queueing failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'micro-review-sync') {
    event.waitUntil(syncMicroReviews());
  }
});

// Sync pending micro-card reviews when back online
async function syncMicroReviews() {
  try {
    // Get pending reviews from IndexedDB
    const pendingReviews = await getPendingReviews();

    for (const review of pendingReviews) {
      try {
        await fetch('/api/micro/sessions/' + review.sessionId + '/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            micro_flashcard_id: review.microFlashcardId,
            quality: review.quality,
          }),
        });
        // Remove successfully synced review
        await removePendingReview(review.id);
      } catch (error) {
        console.error('Failed to sync review:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync reviews:', error);
  }
}

// IndexedDB helpers for offline queue
function getPendingReviews() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PMPMicroQueue', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('reviews', 'readonly');
      const store = tx.objectStore('reviews');
      const getAll = store.getAll();

      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('reviews', { keyPath: 'id' });
    };
  });
}

function removePendingReview(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PMPMicroQueue', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Push notifications for study reminders
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Time for your 2-minute PMP study session!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'micro-study-reminder',
    requireInteraction: false,
    actions: [
      {
        action: 'start',
        title: 'Start Now',
        icon: '/icon-192.png',
      },
      {
        action: 'snooze',
        title: 'Later',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('PMP Micro Study', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'start') {
    event.waitUntil(
      self.clients.openWindow('/micro/quick')
    );
  }
});
