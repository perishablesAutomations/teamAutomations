const CACHE_NAME = 'awb-transmision-v2';
const ARCHIVOS_CACHE = [
  './transmision-awb.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-16.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: network-first para el JSON de datos y el HTML (siempre lo más fresco posible),
// cache-first para íconos y manifest (no cambian seguido).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('.json') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Permite que la página (main thread) pida al service worker que muestre una
// notificación real del sistema operativo, en vez de usar `new Notification()`
// directamente. Esto hace que se vea como notificación nativa (centro de
// notificaciones / pantalla de bloqueo en Android) cuando la app está
// instalada como PWA — no requiere push real del servidor, pero sí que la
// PWA siga corriendo en segundo plano (no cerrada del todo).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./transmision-awb.html');
      }
    })
  );
});
