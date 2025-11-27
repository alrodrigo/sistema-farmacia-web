// ===== SERVICIO DE AUTENTICACIÓN =====

/**
 * Login de usuario
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise}
 */

async function loginUser(email, password) {
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Obtener datos adicionales del usuario desde Firestore
        const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };
            
            saveCurrentUser(userData);
            return userData;
        } else {
            throw new Error('Datos de usuario no encontrados');
        }
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
}

/**
 * Logout de usuario
 */
async function logoutUser() {
    try {
        await firebaseAuth.signOut();
        clearCurrentUser();
        redirectTo('index.html');
    } catch (error) {
        console.error('Error en logout:', error);
        throw error;
    }
}

/**
 * Verificar si el usuario está autenticado
 */
function checkAuth() {
    return new Promise((resolve) => {
        firebaseAuth.onAuthStateChanged((user) => {
            resolve(user);
        });
    });
}

/**
 * Proteger página (requiere autenticación)
 */
async function protectPage() {
    const user = await checkAuth();
    if (!user) {
        redirectTo('index.html');
    }
}

// ===== MANEJO DEL FORMULARIO DE LOGIN =====
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
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Verificar si ya está logueado (solo si estamos en la página de login)
    checkAuth().then(async user => {
        if (user) {
            // Verificar que el usuario tenga documento en Firestore antes de redirigir
            try {
                const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    console.log('✅ Usuario ya logueado, redirigiendo a dashboard');
                    redirectTo('dashboard.html');
                } else {
                    console.error('❌ Usuario sin documento en Firestore, cerrando sesión');
                    await firebaseAuth.signOut();
                    showAlert('Error: Tu cuenta no está configurada correctamente. Por favor contacta al administrador.', 'error');
                }
            } catch (error) {
                console.error('❌ Error verificando usuario:', error);
                await firebaseAuth.signOut();
                showAlert('Error al verificar tu cuenta. Intenta iniciar sesión nuevamente.', 'error');
            }
        }
    });

    // Manejo del formulario
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearAlerts();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Validaciones
            if (!isValidEmail(email)) {
                showAlert('Por favor ingresa un correo válido', 'error');
                return;
            }

            if (!isValidPassword(password)) {
                showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            // Intentar login
            toggleButtonLoading(btnLogin, true);

            try {
                const userData = await loginUser(email, password);
                
                showAlert(`¡Bienvenido ${userData.first_name}!`, 'success', 2000);
                
                setTimeout(() => {
                    redirectTo('dashboard.html');
                }, 2000);
                
            } catch (error) {
                console.error('Error en login:', error);
                const errorMessage = getFirebaseErrorMessage(error);
                showAlert(errorMessage, 'error');
                toggleButtonLoading(btnLogin, false);
            }
        });
    }
});

console.log('🔐 Servicio de autenticación cargado');
