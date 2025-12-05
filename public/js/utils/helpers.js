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

/**
 * Aplica restricciones de menú según el rol del usuario
 * Esta función se debe llamar después de verificar autenticación
 * Usa clases CSS para evitar parpadeo visual
 */
function aplicarRestriccionesMenu(user) {
    // Si se pasa un usuario, usarlo; si no, intentar obtenerlo
    const currentUser = user || getCurrentUser();
    
    // Si no hay usuario disponible, intentar obtener del localStorage como respaldo
    if (!currentUser) {
        const cachedRole = localStorage.getItem('userRole');
        if (cachedRole) {
            console.log('🔒 Aplicando restricciones desde caché:', cachedRole);
            if (cachedRole === 'admin') {
                document.body.classList.add('show-admin-options');
            } else {
                document.body.classList.remove('show-admin-options');
            }
            return;
        }
        console.warn('⚠️ No se puede aplicar restricciones: usuario no disponible');
        return;
    }
    
    const role = currentUser.role || 'empleado';
    console.log('🔒 Aplicando restricciones de menú para rol:', role);
    
    // Guardar rol en localStorage para futuras cargas
    localStorage.setItem('userRole', role);
    
    // Si es ADMIN, mostrar todas las opciones agregando clase al body
    if (role === 'admin') {
        document.body.classList.add('show-admin-options');
        console.log('✓ Opciones de admin mostradas');
    } else {
        // Si es EMPLEADO, asegurar que las opciones están ocultas
        document.body.classList.remove('show-admin-options');
        console.log('✓ Restricciones de empleado aplicadas (opciones admin ocultas)');
    }
}

console.log('✅ Utilidades cargadas correctamente');

// Aplicar restricciones inmediatamente al cargar (usa caché si está disponible)
aplicarRestriccionesMenu();

// ===== MENÚ MÓVIL =====
/**
 * Inicializa el toggle del menú móvil
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (!menuToggle || !sidebar) {
        console.warn('⚠️ Menú móvil: elementos no encontrados');
        return;
    }
    
    // Remover listeners anteriores si existen (prevenir duplicados)
    const oldToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(oldToggle, menuToggle);
    
    // Toggle del menú
    oldToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        console.log('🔄 Menú toggle:', sidebar.classList.contains('active') ? 'abierto' : 'cerrado');
    });
    
    // Cerrar menú al hacer click fuera (usando event delegation)
    const closeMenuOutside = (e) => {
        if (sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && 
            !oldToggle.contains(e.target)) {
            sidebar.classList.remove('active');
            document.body.classList.remove('menu-open');
            console.log('🔄 Menú cerrado (click fuera)');
        }
    };
    
    // Remover listener anterior si existe
    document.removeEventListener('click', window.closeMenuOutside);
    window.closeMenuOutside = closeMenuOutside;
    document.addEventListener('click', closeMenuOutside);
    
    // Cerrar menú al seleccionar una opción en móvil
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                document.body.classList.remove('menu-open');
                console.log('🔄 Menú cerrado (navegación)');
            }
        });
    });
    
    console.log('✅ Menú móvil inicializado correctamente');
}

// Inicializar cuando el DOM esté completamente cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    // Si ya está cargado, ejecutar inmediatamente
    initMobileMenu();
}

// Re-inicializar si la página se recarga desde caché (bfcache)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        console.log('🔄 Página restaurada desde caché, re-inicializando menú');
        initMobileMenu();
    }
});
