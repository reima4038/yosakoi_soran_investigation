// Service Worker for Yosakoi Performance Evaluation System
const CACHE_NAME = 'yosakoi-evaluation-v1';
const STATIC_CACHE_NAME = 'yosakoi-static-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/sessions\/\w+$/,
  /\/api\/videos\/\w+$/,
  /\/api\/templates\/\w+$/,
];

// API endpoints that should never be cached
const NON_CACHEABLE_API_PATTERNS = [
  /\/api\/evaluations\/.*\/submit$/,
  /\/api\/auth\//,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
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

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/static/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API should not be cached
  if (NON_CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return fetch(request);
  }

  // Check if this API should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!shouldCache) {
    return fetch(request);
  }

  try {
    // Try network first with timeout for better offline detection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Notify clients about successful network request
      notifyClients({
        type: 'NETWORK_STATUS',
        online: true,
        timestamp: Date.now(),
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Notify clients about network failure
    notifyClients({
      type: 'NETWORK_STATUS',
      online: false,
      timestamp: Date.now(),
      error: error.name,
    });
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator to cached response
      const responseClone = cachedResponse.clone();
      const responseBody = await responseClone.json();
      
      return new Response(
        JSON.stringify({
          ...responseBody,
          _offline: true,
          _cachedAt: Date.now(),
        }),
        {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: cachedResponse.headers,
        }
      );
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'オフラインです。ネットワーク接続を確認してください。',
        offline: true,
        timestamp: Date.now(),
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Helper function to notify all clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Network failed for navigation, serving cached index.html');
    
    // Fall back to cached index.html for SPA routing
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>オフライン - よさこい演舞評価システム</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .offline-container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .offline-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
            }
            p {
              color: #666;
              line-height: 1.5;
            }
            .retry-button {
              background: #1976d2;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 1rem;
              font-size: 1rem;
            }
            .retry-button:hover {
              background: #1565c0;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>オフラインです</h1>
            <p>インターネット接続を確認してください。<br>
            一部の機能はオフラインでも利用できます。</p>
            <button class="retry-button" onclick="window.location.reload()">
              再試行
            </button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'evaluation-sync') {
    event.waitUntil(syncEvaluationData());
  } else if (event.tag === 'offline-notification-sync') {
    event.waitUntil(syncOfflineNotifications());
  }
});

// Sync evaluation data when online
async function syncEvaluationData() {
  try {
    console.log('Syncing evaluation data...');
    
    // Send message to main thread to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_EVALUATIONS',
        timestamp: Date.now(),
      });
    });
    
    // Show notification for successful sync
    if (self.registration.showNotification) {
      self.registration.showNotification('同期完了', {
        body: '評価データの同期が完了しました',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'sync-complete',
        requireInteraction: false,
        silent: false,
      });
    }
  } catch (error) {
    console.error('Failed to sync evaluation data:', error);
    
    // Show error notification
    if (self.registration.showNotification) {
      self.registration.showNotification('同期エラー', {
        body: '評価データの同期に失敗しました',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'sync-error',
        requireInteraction: true,
      });
    }
  }
}

// Sync offline notifications
async function syncOfflineNotifications() {
  try {
    console.log('Syncing offline notifications...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_NOTIFICATIONS',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('Failed to sync offline notifications:', error);
  }
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.data,
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(data.url);
      }
    })
  );
});

console.log('Service Worker loaded successfully');