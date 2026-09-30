/* ============================================================
   Mother Mary Primary School Limited – Service Worker
   Handles: Asset caching, offline fallback, background sync
   for attendance scans & payment records queued offline.
   ============================================================ */

   const CACHE_VERSION = 'mmps-cache-v1';
   const RUNTIME_CACHE = 'mmps-runtime-v1';
   const SYNC_QUEUE_STORE = 'mmps-sync-queue';
   
   // Core shell assets that must be available offline immediately
   const PRECACHE_ASSETS = [
     './',
     './index.html',
     './manifest.json',
     './icon-192.png',
     './icon-512.png',
   ];
   
   // ============================================================
   // 1. INSTALL — Precache the app shell
   // ============================================================
   self.addEventListener('install', (event) => {
     console.log('[SW] Installing…');
     event.waitUntil(
       caches
         .open(CACHE_VERSION)
         .then((cache) => cache.addAll(PRECACHE_ASSETS))
         .then(() => self.skipWaiting())
         .catch((err) => console.warn('[SW] Precache failed:', err))
     );
   });
   
   // ============================================================
   // 2. ACTIVATE — Clean up old caches
   // ============================================================
   self.addEventListener('activate', (event) => {
     console.log('[SW] Activating…');
     event.waitUntil(
       caches
         .keys()
         .then((keys) =>
           Promise.all(
             keys
               .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
               .map((key) => caches.delete(key))
           )
         )
         .then(() => self.clients.claim())
     );
   });
   
   // ============================================================
   // 3. FETCH — Smart caching strategy
   //    - Navigation requests: network-first with offline fallback
   //    - Static assets (JS/CSS/images): cache-first
   //    - Firestore / Google APIs: always network, never cached
   // ============================================================
   self.addEventListener('fetch', (event) => {
     const { request } = event;
     const url = new URL(request.url);
   
     // Skip non-GET requests (POST/PUT to Firestore must go straight to network)
     if (request.method !== 'GET') return;
   
     // Skip Firebase / Firestore / Google APIs — always live
     if (
       url.hostname.includes('firestore.googleapis.com') ||
       url.hostname.includes('identitytoolkit.googleapis.com') ||
       url.hostname.includes('securetoken.googleapis.com') ||
       url.hostname.includes('googleapis.com') ||
       url.hostname.includes('firebaseio.com') ||
       url.hostname.includes('gstatic.com')
     ) {
       return;
     }
   
     // Navigation requests (HTML pages) — network-first, fallback to cache
     if (request.mode === 'navigate') {
       event.respondWith(
         fetch(request)
           .then((response) => {
             const copy = response.clone();
             caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
             return response;
           })
           .catch(() =>
             caches.match(request).then((cached) => cached || caches.match('./index.html'))
           )
       );
       return;
     }
   
     // Everything else — cache-first, then network
     event.respondWith(
       caches.match(request).then((cached) => {
         if (cached) return cached;
         return fetch(request)
           .then((response) => {
             // Only cache valid same-origin or CDN responses
             if (!response || response.status !== 200 || response.type === 'opaque') {
               return response;
             }
             const copy = response.clone();
             caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
             return response;
           })
           .catch(() => caches.match('./index.html'));
       })
     );
   });
   
   // ============================================================
   // 4. BACKGROUND SYNC — Queue attendance/payment writes offline
   //    The main app can call:
   //      navigator.serviceWorker.ready.then(reg =>
   //        reg.sync.register('sync-attendance'))
   //    when it detects a scan/record made while offline.
   // ============================================================
   self.addEventListener('sync', (event) => {
     if (event.tag === 'sync-attendance') {
       event.waitUntil(flushQueue('attendance'));
     }
     if (event.tag === 'sync-payments') {
       event.waitUntil(flushQueue('payments'));
     }
   });
   
   // Simple in-memory queue (falls back to IndexedDB persistence inside app layer)
   const pendingQueue = {
     attendance: [],
     payments: [],
   };
   
   // App-side code posts a message to add to the queue when offline
   self.addEventListener('message', (event) => {
     const { type, payload, queue } = event.data || {};
     if (type === 'QUEUE_RECORD') {
       if (pendingQueue[queue]) {
         pendingQueue[queue].push(payload);
         console.log(`[SW] Queued ${queue} record:`, payload);
       }
     }
     if (type === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });
   
   // When back online, sync event fires and this flushes the queue
   async function flushQueue(queueName) {
     const items = pendingQueue[queueName] || [];
     console.log(`[SW] Flushing ${items.length} queued ${queueName} records…`);
     // The actual Firestore write is handled by the app when it reconnects,
     // since Firestore SDK already has its own offline persistence.
     // We simply notify all open clients to push the queue.
     const allClients = await self.clients.matchAll({ includeUncontrolled: true });
     allClients.forEach((client) => {
       client.postMessage({
         type: 'FLUSH_QUEUE',
         queue: queueName,
         items,
       });
     });
     pendingQueue[queueName] = [];
   }
   
   // ============================================================
   // 5. PUSH NOTIFICATIONS (optional groundwork)
   // ============================================================
   self.addEventListener('push', (event) => {
     if (!event.data) return;
     try {
       const data = event.data.json();
       event.waitUntil(
         self.registration.showNotification(data.title || 'MMPS Portal', {
           body: data.body || '',
           icon: './icon-192.png',
           badge: './icon-192.png',
           data: data.url || './',
         })
       );
     } catch (err) {
       console.warn('[SW] Push parse error:', err);
     }
   });
   
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     event.waitUntil(self.clients.openWindow(event.notification.data || './'));
   });