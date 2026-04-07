/**
 * Service worker mínimo para habilitar o prompt de instalação PWA no Chrome/Android.
 * Necessário para o evento beforeinstallprompt ser disparado.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
