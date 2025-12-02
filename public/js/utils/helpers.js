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
function aplicarRestriccionesMenu() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const role = currentUser.role || 'empleado';
    console.log('🔒 Aplicando restricciones de menú para rol:', role);
    
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

/**
 * Muestra una notificación toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duracion - Duración en ms (default 5000)
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
    // Crear contenedor de notificaciones si no existe
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Crear notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification-${tipo}`;
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colores = {
        success: '#7CB342',
        error: '#E53935',
        warning: '#FFA726',
        info: '#0D3C61'
    };
    
    notificacion.style.cssText = `
        background: white;
        border-left: 4px solid ${colores[tipo]};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease;
        min-width: 300px;
    `;
    
    notificacion.innerHTML = `
        <i class="fas ${iconos[tipo]}" style="color: ${colores[tipo]}; font-size: 20px;"></i>
        <span style="flex: 1; font-size: 14px; color: #333;">${mensaje}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            cursor: pointer;
            color: #999;
            font-size: 20px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">×</button>
    `;
    
    // Agregar animación de entrada
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    if (!document.getElementById('notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }
    
    container.appendChild(notificacion);
    
    // Auto-eliminar después de la duración especificada
    if (duracion > 0) {
        setTimeout(() => {
            notificacion.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notificacion.remove();
                // Eliminar contenedor si no hay más notificaciones
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duracion);
    }
    
    return notificacion;
}

/**
 * Verifica productos con stock bajo y muestra notificaciones
 * @param {object} db - Referencia a Firestore
 */
async function verificarStockBajo(db) {
    if (!db) {
        console.warn('⚠️ Firestore no está disponible para verificar stock');
        return;
    }
    
    try {
        const snapshot = await db.collection('products')
            .where('activo', '==', true)
            .get();
        
        const productosStockBajo = [];
        
        snapshot.forEach(doc => {
            const producto = doc.data();
            const stockActual = producto.current_stock || producto.stock || 0;
            const stockMinimo = producto.minimum_stock || producto.stockMinimo || 5;
            
            if (stockActual <= stockMinimo) {
                productosStockBajo.push({
                    id: doc.id,
                    nombre: producto.name || producto.nombre,
                    stock: stockActual,
                    stockMinimo: stockMinimo
                });
            }
        });
        
        // Mostrar notificación si hay productos con stock bajo
        if (productosStockBajo.length > 0) {
            const mensaje = productosStockBajo.length === 1
                ? `⚠️ Producto con stock bajo: ${productosStockBajo[0].nombre} (${productosStockBajo[0].stock} unidades)`
                : `⚠️ ${productosStockBajo.length} productos con stock bajo`;
            
            mostrarNotificacion(mensaje, 'warning', 8000);
            console.log('📊 Productos con stock bajo:', productosStockBajo);
        }
        
        return productosStockBajo;
    } catch (error) {
        console.error('❌ Error al verificar stock bajo:', error);
        return [];
    }
}

console.log('✅ Utilidades cargadas correctamente');
