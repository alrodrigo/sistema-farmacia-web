// ==================== CONFIGURACIÓN FIREBASE (DEV) ====================

// Tu configuración del proyecto servisalud-dev
const firebaseConfig = {
  apiKey: "AIzaSyA5vahJBomeIVcGQNWFiM9PpPTdzReaJM4",
  authDomain: "servisalud-dev.firebaseapp.com",
  projectId: "servisalud-dev",
  storageBucket: "servisalud-dev.firebasestorage.app",
  messagingSenderId: "958591889656",
  appId: "1:958591889656:web:9ef6c704e85673e73e0b0d"
};

// Inicializar Firebase (usando la versión compat que ya carga tu HTML)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

// Servicios de Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Configuración de idioma y persistencia
auth.languageCode = 'es';
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { });

// Exportar globalmente para que nuestros servicios y módulos los consuman
window.firebaseAuth = auth;
window.firebaseDB = db;

console.log('🔥 Firebase inicializado correctamente en el búnker: servisalud-dev');