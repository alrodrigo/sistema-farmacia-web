// ===== UTILIDADES GENERALES =====

/**
 * Muestra una alerta en el contenedor especificado
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta: 'success', 'error', 'warning'
 * @param {number} duration - Duración en ms (0 = permanente)
 */
function showAlert(message, type = 'info', duration = 5000) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 'info-circle';
    
    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    if (duration > 0) {
        setTimeout(() => {
            alert.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, duration);
    }
    
    return alert;
}

/**
 * Limpia todas las alertas
 */
function clearAlerts() {
    const container = document.getElementById('alert-container');
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Valida un email
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida una contraseña (mínimo 6 caracteres)
 * @param {string} password 
 * @returns {boolean}
 */
function isValidPassword(password) {
    return password && password.length >= 6;
}

/**
 * Formatea una fecha
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formatea un número como moneda
 * @param {number} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB'
    }).format(amount);
}

/**
 * Muestra un loader en un botón
 * @param {HTMLButtonElement} button 
 * @param {boolean} loading 
 */
function toggleButtonLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loader');
    
    if (loading) {
        button.disabled = true;
        if (text) text.style.display = 'none';
        if (loader) loader.style.display = 'inline-block';
    } else {
        button.disabled = false;
        if (text) text.style.display = 'inline-block';
        if (loader) loader.style.display = 'none';
    }
}

/**
 * Redirige a una página
 * @param {string} page 
 */
function redirectTo(page) {
    window.location.href = page;
}

/**
 * Obtiene el usuario actual desde localStorage
 * @returns {object|null}
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Guarda el usuario en localStorage
 * @param {object} user 
 */
function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

/**
 * Elimina el usuario de localStorage
 */
function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

/**
 * Verifica si hay un usuario logueado
 * @returns {boolean}
 */
function isUserLoggedIn() {
    return getCurrentUser() !== null && firebaseAuth.currentUser !== null;
}

/**
 * Obtiene el nombre de usuario de forma inteligente
 * Busca en diferentes campos posibles
 * @param {object} userData - Datos del usuario
 * @returns {string}
 */
function getUserDisplayName(userData) {
    if (!userData) return 'Usuario';
    
    // Intentar obtener el nombre de diferentes campos
    return userData.name || 
           userData.nombre || 
           userData.first_name || 
           userData.firstName ||
           userData.displayName ||
           userData.email?.split('@')[0] || 
           'Usuario';
}

/**
 * Manejo de errores de Firebase
 * @param {object} error 
 * @returns {string}
 */
function getFirebaseErrorMessage(error) {
    const errorMessages = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'El correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
        'auth/invalid-credential': 'Credenciales inválidas'
    };
    
    return errorMessages[error.code] || 'Error desconocido. Intenta nuevamente';
}

console.log('✅ Utilidades cargadas correctamente');
