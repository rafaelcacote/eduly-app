/**
 * Service worker mínimo para habilitar o prompt de instalação PWA no Chrome/Android.
 * O Chrome ainda exige um fetch handler para disparar beforeinstallprompt.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through: necessário para o evento beforeinstallprompt no Chrome/Android
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
