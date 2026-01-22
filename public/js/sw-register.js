// Registro y gestión del Service Worker
// Este script se encarga de registrar el SW y notificar actualizaciones

(function() {
  'use strict';

  // Verificar si el navegador soporta Service Workers
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado en este navegador');
    return;
  }

  let refreshing = false;

  // Función para mostrar notificación de actualización
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Poppins', sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <i class="fas fa-sync-alt" style="font-size: 20px; animation: spin 2s linear infinite;"></i>
        <div>
          <div style="font-weight: 600; font-size: 14px;">Nueva versión disponible</div>
          <div style="font-size: 12px; opacity: 0.9;">Actualizando sistema...</div>
        </div>
      </div>
      <style>
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(notification);

    // Auto-recargar después de 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  // Detectar cuando el SW está esperando para activarse
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    
    // Mostrar notificación y recargar
    showUpdateNotification();
  });

  // Registrar el Service Worker
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Si es la primera vez que se registra, mostrar mensaje
        if (!navigator.serviceWorker.controller) {
          console.log('🎉 Sistema de actualización automática activado. Las próximas actualizaciones serán automáticas.');
        }

        // Verificar actualizaciones cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);

        // Detectar cuando hay una nueva versión esperando
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              console.log('🔄 Nueva versión detectada');
              
              // Notificar al nuevo SW que tome control
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Error al registrar Service Worker:', error);
      });
  });

  // Verificar actualizaciones al recuperar el foco de la ventana
  window.addEventListener('focus', () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.update();
      }
    });
  });

})();
