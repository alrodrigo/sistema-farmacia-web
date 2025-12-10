// Service Worker para actualización automática del sistema
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `farmacia-${CACHE_VERSION}`;

// Archivos a cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/ventas.html',
  '/productos.html',
  '/categorias.html',
  '/proveedores.html',
  '/usuarios.html',
  '/reportes.html',
  '/css/theme.css',
  '/css/components.css',
  '/css/layout.css',
  '/js/config/firebase.js',
  '/js/utils/helpers.js',
  '/img/logo-servisalud.png',
  '/favicon.svg'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forzar que el nuevo service worker tome control inmediatamente
        return self.skipWaiting();
      })
  );
});

// Activación - Limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando nueva versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim();
    })
  );
});

// Estrategia: Network First, fallback a Cache
// Siempre intenta obtener la versión más reciente de la red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si obtiene respuesta de la red, actualiza el caché
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intenta obtener del caché
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Si tampoco está en caché, retorna un error genérico
          return new Response('Offline - No se pudo cargar el recurso', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Escuchar mensajes para actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
