// =====================================================
// ARCHIVO: public/js/services/auth.js
// DESCRIPCIÓN: Servicio de autenticación modular (Firebase v10)
// =====================================================

import { auth, db } from '../config/firebase.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Iniciar sesión de usuario
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Obtener datos adicionales del usuario desde Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };
            
            if (typeof saveCurrentUser === 'function') {
                saveCurrentUser(userData);
            }
            return userData;
        } else {
            throw new Error('Datos de usuario no encontrados en Firestore');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Cerrar sesión de usuario
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        if (typeof clearCurrentUser === 'function') {
            clearCurrentUser();
        }
        if (typeof redirectTo === 'function') {
            redirectTo('index.html');
        } else {
            window.location.href = '/index.html';
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Verificar si el usuario está autenticado
 * @returns {Promise<object|null>}
 */
export function checkAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}

/**
 * Proteger página (requiere autenticación)
 */
export async function protectPage() {
    const user = await checkAuth();
    if (!user) {
        if (typeof redirectTo === 'function') {
            redirectTo('index.html');
        } else {
            window.location.href = '/index.html';
        }
    }
}

// Exposición global para interoperabilidad
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.checkAuth = checkAuth;
window.protectPage = protectPage;

// ===== MANEJO DEL FORMULARIO DE LOGIN (index.html) =====
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');

    // Toggle mostrar/ocultar contraseña
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }

    // Verificar si ya está logueado (solo en la página de login)
    checkAuth().then(async (user) => {
        if (user && loginForm) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    if (typeof redirectTo === 'function') {
                        redirectTo('pages/dashboard.html');
                    } else {
                        window.location.href = 'pages/dashboard.html';
                    }
                } else {
                    await signOut(auth);
                    if (typeof showAlert === 'function') {
                        showAlert('Error: Tu cuenta no está configurada correctamente. Por favor contacta al administrador.', 'error');
                    }
                }
            } catch (error) {
                await signOut(auth);
                if (typeof showAlert === 'function') {
                    showAlert('Error al verificar tu cuenta. Intenta iniciar sesión nuevamente.', 'error');
                }
            }
        }
    });

    // Manejo del envío del formulario
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (typeof clearAlerts === 'function') clearAlerts();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Validaciones locales
            if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
                if (typeof showAlert === 'function') showAlert('Por favor ingresa un correo válido', 'error');
                return;
            }

            if (typeof isValidPassword === 'function' && !isValidPassword(password)) {
                if (typeof showAlert === 'function') showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            // Bloquear botón durante el login
            if (typeof toggleButtonLoading === 'function') {
                toggleButtonLoading(btnLogin, true);
            }

            try {
                const userData = await loginUser(email, password);
                
                const displayName = userData.nombre || 
                                  userData.name || 
                                  userData.first_name || 
                                  userData.displayName ||
                                  userData.email?.split('@')[0] || 
                                  'Usuario';
                
                if (typeof showAlert === 'function') {
                    showAlert(`¡Bienvenido ${displayName}!`, 'success', 2000);
                }
                
                setTimeout(() => {
                    if (typeof redirectTo === 'function') {
                        redirectTo('pages/dashboard.html');
                    } else {
                        window.location.href = 'pages/dashboard.html';
                    }
                }, 1500);
                
            } catch (error) {
                const errorMessage = typeof getFirebaseErrorMessage === 'function' 
                    ? getFirebaseErrorMessage(error) 
                    : (error.message || 'Error al iniciar sesión');
                
                if (typeof showAlert === 'function') {
                    showAlert(errorMessage, 'error');
                }
                
                if (typeof toggleButtonLoading === 'function') {
                    toggleButtonLoading(btnLogin, false);
                }
            }
        });
    }
});
