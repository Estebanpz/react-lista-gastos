/* eslint-disable no-restricted-globals */

// Service worker de la app (Workbox). CRA 5 lo detecta por su nombre y lo compila en
// `npm run build`; en `npm start` no se genera.
//
// Qué hace:
//  - Precachea la app (HTML, JS, CSS, iconos) para que abra sin conexión.
//  - Responde las rutas de React (/lista, /categorias...) con index.html (app SPA).
//  - Cachea las fuentes de Google.
//
// Qué NO hace (a propósito, por seguridad y privacidad):
//  - No intercepta ni cachea Firestore ni Auth: los datos offline los maneja Firestore con
//    su propia caché local, que se borra al cerrar sesión. Así nunca quedan respuestas
//    autenticadas en la caché del service worker.
//  - No usa importScripts de terceros (ni el SDK de Firebase: los push se manejan con el evento nativo).
//  - Muestra los recordatorios de pagos que llegan por push (texto armado aquí, nunca el recibido).

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { armarNotificacion, destinoAlTocar, OPCIONES_BASE } from './pwa/avisos';

clientsClaim();
cleanupOutdatedCaches();

// CRA inyecta aquí la lista de archivos generados por webpack. Se excluyen las capturas
// de pantalla y robots.txt (solo las usa el navegador/instalador) y los chunks del reporte
// (Excel y PDF, ~0,5 MB): se descargan al pedir el reporte y se guardan en caché entonces,
// para no encarecer la instalación de la app.
const archivos = self.__WB_MANIFEST.filter(
  (entrada) => !/(^|\/)captura-[^/]+\.png$|(^|\/)robots\.txt$|\/static\/js\/exportar-[^/]+\.js(\.map)?$/.test(entrada.url)
);
precacheAndRoute(archivos);

// Navegación SPA: toda ruta de página (sin extensión de archivo) devuelve index.html.
// Se excluye "/_" (rutas reservadas de Firebase, como /__/auth).
const tieneExtension = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    !url.pathname.startsWith('/_') &&
    !url.pathname.match(tieneExtension),
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Iconos y manifest de public/ (el precaché de webpack no los incluye): se sirven de caché
// y se actualizan en segundo plano.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    /^\/(manifest\.json|favicon\.ico|apple-touch-icon\.png|icono-[^/]+\.png|insignia-96\.png)$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'iconos-app',
    plugins: [new ExpirationPlugin({ maxEntries: 10 })],
  })
);

// Chunks de JavaScript que no están en el precaché (los pesados del reporte de Excel/PDF; ver
// scripts/sacar-reporte-del-precache.js): caché primero tras la primera descarga (llevan hash en el nombre).
// El precaché se registra antes, así que lo precacheado no pasa por aquí.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\/static\/js\/[^/]+\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'reporte-chunks',
    plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 6 })],
  })
);

// Hoja de estilos de Google Fonts: se sirve de caché y se actualiza en segundo plano.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-css',
    plugins: [new ExpirationPlugin({ maxEntries: 10 })],
  })
);

// Archivos de fuente (no cambian): caché primero, hasta 1 año.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-archivos',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// La actualización solo se activa cuando la persona acepta el aviso «Actualizar»
// (src/pwa/registroServiceWorker.js envía este mensaje); nunca de forma automática.
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Recordatorio de pagos enviado por el Worker de Cloudflare a través de FCM (solo `data`).
// El contenido se valida en src/pwa/avisos.js; un mensaje inválido muestra un aviso genérico.
self.addEventListener('push', (evento) => {
  let carga = null;
  try {
    carga = evento.data ? evento.data.json() : null;
  } catch (error) {
    carga = null;
  }
  const { titulo, opciones } = armarNotificacion(carga);
  const tareas = [self.registration.showNotification(titulo, { ...OPCIONES_BASE, ...opciones })];
  if (self.navigator.setAppBadge && opciones.data.cantidad) {
    tareas.push(self.navigator.setAppBadge(opciones.data.cantidad).catch(() => {}));
  }
  evento.waitUntil(Promise.all(tareas));
});

// Al tocar la notificación se abre la pantalla de pagos (siempre del mismo origen), reutilizando
// una ventana abierta de la app si la hay.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = destinoAlTocar(evento.notification.data, self.location.origin);
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        return abierta.focus().then((v) => (v && 'navigate' in v ? v.navigate(destino) : v));
      }
      return self.clients.openWindow(destino);
    })
  );
});
