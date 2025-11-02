// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD7Li27bUVpcPv412xashHQqGpQnHa-17k",
  authDomain: "sistema-farmacia-web.firebaseapp.com",
  projectId: "sistema-farmacia-web",
  storageBucket: "sistema-farmacia-web.firebasestorage.app",
  messagingSenderId: "789396395435",
  appId: "1:789396395435:web:6857ba18bbf9ce1b672eee",
  measurementId: "G-V78KYB29R7"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Servicios de Firebase que usaremos
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configurar idioma español para errores de autenticación
auth.languageCode = 'es';

// Configurar persistencia de sesión
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error('Error al configurar persistencia:', error);
  });

// Exportar servicios para usar en otros archivos
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;

console.log('🔥 Firebase inicializado correctamente');
