// ==================== CONFIGURACIÓN MULTI-ENTORNO ====================

// 1. Configuración de PRODUCCIÓN (El negocio real)
const prodConfig = {
  apiKey: "AIzaSyD7Li27bUVpcPv412xashHQqGpQnHa-17k",
  authDomain: "sistema-farmacia-web.firebaseapp.com",
  projectId: "sistema-farmacia-web",
  storageBucket: "sistema-farmacia-web.firebasestorage.app",
  messagingSenderId: "789396395435",
  appId: "1:789396395435:web:6857ba18bbf9ce1b672eee"
};

// 2. Configuración de DESARROLLO (El búnker de pruebas)
const devConfig = {
  apiKey: "AIzaSyA5vahJBomeIVcGQNWFiM9PpPTdzReaJM4",
  authDomain: "servisalud-dev.firebaseapp.com",
  projectId: "servisalud-dev",
  storageBucket: "servisalud-dev.firebasestorage.app",
  messagingSenderId: "958591889656",
  appId: "1:958591889656:web:9ef6c704e85673e73e0b0d"
};

// 3. El Switch Automático
// Si la URL dice "localhost" o "127.0.0.1", usamos dev. Si no, usamos producción.
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const firebaseConfig = isLocalhost ? devConfig : prodConfig;

// ==================== INICIALIZACIÓN ====================
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const auth = firebase.auth();
const db = firebase.firestore();

auth.languageCode = 'es';
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { });

window.firebaseConfig = firebaseConfig;
window.firebaseAuth = auth;
window.firebaseDB = db;

// Mensaje de seguridad para la consola
console.log(`🔥 Conectado a la base de datos de: ${isLocalhost ? 'DESARROLLO (Búnker)' : 'PRODUCCIÓN (Real)'}`);