// Service Worker para actualización automática del sistema
const CACHE_VERSION = 'v1.0.2';
const CACHE_NAME = `farmacia-${CACHE_VERSION}`;

// Archivos a cachear
const urlsToCache = [
  '/public/',
  '/public/index.html',
  '/public/dashboard.html',
  '/public/ventas.html',
  '/public/productos.html',
  '/public/categorias.html',
  '/public/proveedores.html',
  '/public/usuarios.html',
  '/public/reportes.html',
  '/public/css/theme.css',
  '/public/css/components.css',
  '/public/css/layout.css',
  '/public/js/config/firebase.js',
  '/public/js/utils/helpers.js',
  '/public/img/logo-servisalud.png',
  '/public/favicon.svg'
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
  // Solo cachear peticiones GET (POST, PUT, DELETE no se pueden cachear)
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

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
