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
            // console.log('🔒 Aplicando restricciones desde caché:', cachedRole);
            if (cachedRole === 'admin') {
                document.body.classList.add('show-admin-options');
            } else {
                document.body.classList.remove('show-admin-options');
            }
            return;
        }
        // console.warn('⚠️ No se puede aplicar restricciones: usuario no disponible');
        return;
    }
    
    const role = currentUser.role || 'empleado';
    // console.log('🔒 Aplicando restricciones de menú para rol:', role);
    
    // Guardar rol en localStorage para futuras cargas
    localStorage.setItem('userRole', role);
    
    // Si es ADMIN, mostrar todas las opciones agregando clase al body
    if (role === 'admin') {
        document.body.classList.add('show-admin-options');
        // console.log('✓ Opciones de admin mostradas');
    } else {
        // Si es EMPLEADO, asegurar que las opciones están ocultas
        document.body.classList.remove('show-admin-options');
        // console.log('✓ Restricciones de empleado aplicadas (opciones admin ocultas)');
    }
}

// console.log('✅ Utilidades cargadas correctamente');

// Aplicar restricciones inmediatamente al cargar (usa caché si está disponible)
aplicarRestriccionesMenu();

// ===== MENÚ MÓVIL =====
// ===== MENÚ MÓVIL =====
// Inicialización única y silenciosa
(function() {
    if (window.__mobileMenuReady) return;
    window.__mobileMenuReady = true;
    
    let overlay = null;
    
    // Crear overlay dinámicamente
    function createOverlay() {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'menu-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(overlay);
            
            // Click en overlay cierra menú
            overlay.addEventListener('click', closeMenu);
        }
        return overlay;
    }
    
    function openMenu() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        const overlayEl = createOverlay();
        sidebar.classList.add('active');
        overlayEl.style.display = 'block';
        
        // Pequeño delay para permitir transición de opacidad
        requestAnimationFrame(() => {
            overlayEl.style.opacity = '1';
        });
        
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
    
    function closeMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
            }, 300);
        }
        
        document.body.style.overflow = ''; // Restaurar scroll
        document.body.classList.remove('menu-open'); // Limpieza por si acaso
    }
    
    // Event delegation en document
    document.addEventListener('click', function(e) {
        // Toggle del botón hamburguesa
        if (e.target.closest('.menu-toggle, #menuToggle')) {
            e.preventDefault();
            e.stopPropagation();
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
            return;
        }
        
        // Cerrar al navegar en móvil
        if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
            closeMenu();
        }
    });
    
    // Limpieza inicial cuando el DOM esté listo
    function init() {
        createOverlay();
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // console.log('✅ Menú móvil listo');
})();
