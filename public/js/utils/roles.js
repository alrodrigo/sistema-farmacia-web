// ===== SISTEMA DE ROLES Y PERMISOS =====

/**
 * Roles disponibles en el sistema
 */
const ROLES = {
    ADMIN: 'admin',
    EMPLEADO: 'empleado'
};

/**
 * Permisos por rol
 */
const PERMISSIONS = {
    admin: {
        productos: { view: true, create: true, edit: true, delete: true },
        ventas: { view: true, create: true, edit: true, delete: true },
        reportes: { view: true, export: true },
        usuarios: { view: true, create: true, edit: true, delete: true },
        categorias: { view: true, create: true, edit: true, delete: true },
        configuracion: { view: true, edit: true }
    },
    empleado: {
        productos: { view: false, create: false, edit: false, delete: false },
        ventas: { view: true, create: true, edit: false, delete: false },
        reportes: { view: true, export: false },
        usuarios: { view: false, create: false, edit: false, delete: false },
        categorias: { view: false, create: false, edit: false, delete: false },
        configuracion: { view: false, edit: false }
    }
};

/**
 * Obtener el rol del usuario actual
 * @returns {string|null} El rol del usuario o null si no está autenticado
 */
function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? (user.role || ROLES.EMPLEADO) : null;
}

/**
 * Verificar si el usuario es admin
 * @returns {boolean}
 */
function isAdmin() {
    return getCurrentUserRole() === ROLES.ADMIN;
}

/**
 * Verificar si el usuario es empleado
 * @returns {boolean}
 */
function isEmpleado() {
    return getCurrentUserRole() === ROLES.EMPLEADO;
}

/**
 * Verificar si el usuario tiene un permiso específico
 * @param {string} module - Módulo (productos, ventas, reportes, etc.)
 * @param {string} action - Acción (view, create, edit, delete, export)
 * @returns {boolean}
 */
function hasPermission(module, action) {
    const role = getCurrentUserRole();
    if (!role) return false;
    
    const modulePermissions = PERMISSIONS[role]?.[module];
    if (!modulePermissions) return false;
    
    return modulePermissions[action] === true;
}

/**
 * Proteger página según rol requerido
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @param {string} redirectUrl - URL de redirección si no tiene permiso
 */
async function protectPageByRole(allowedRoles = [], redirectUrl = 'dashboard.html') {
    const user = await checkAuth();
    
    if (!user) {
        redirectTo('index.html');
        return;
    }
    
    // Obtener datos del usuario desde Firestore
    const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
        console.error('Usuario no encontrado en Firestore');
        redirectTo('index.html');
        return;
    }
    
    const userData = userDoc.data();
    const userRole = userData.role || ROLES.EMPLEADO;
    
    // Si se especificaron roles permitidos, verificar
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.warn(`Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}, Rol actual: ${userRole}`);
        showAlert('No tienes permisos para acceder a esta página', 'error');
        setTimeout(() => {
            redirectTo(redirectUrl);
        }, 2000);
        return;
    }
    
    return { user, userData, role: userRole };
}

/**
 * Ocultar elementos del DOM según permisos
 * @param {string} module - Módulo
 * @param {string} action - Acción
 * @param {string} selector - Selector CSS del elemento a ocultar
 */
function hideIfNoPermission(module, action, selector) {
    if (!hasPermission(module, action)) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = 'none';
        });
    }
}

/**
 * Deshabilitar elementos del DOM según permisos
 * @param {string} module - Módulo
 * @param {string} action - Acción
 * @param {string} selector - Selector CSS del elemento a deshabilitar
 */
function disableIfNoPermission(module, action, selector) {
    if (!hasPermission(module, action)) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.disabled = true;
            el.classList.add('disabled');
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
        });
    }
}

/**
 * Actualizar menú lateral según permisos del usuario
 */
function updateSidebarByPermissions() {
    const role = getCurrentUserRole();
    
    if (!role) return;
    
    // Ocultar opciones según rol
    if (role === ROLES.EMPLEADO) {
        // Ocultar productos para empleados
        const productosMenu = document.querySelector('a[href="productos.html"]');
        if (productosMenu) {
            productosMenu.parentElement.style.display = 'none';
        }
        
        // Ocultar usuarios para empleados
        const usuariosMenu = document.querySelector('a[href="usuarios.html"]');
        if (usuariosMenu) {
            usuariosMenu.parentElement.style.display = 'none';
        }
        
        // Ocultar categorías para empleados
        const categoriasMenu = document.querySelector('a[href="categorias.html"]');
        if (categoriasMenu) {
            categoriasMenu.parentElement.style.display = 'none';
        }
    }
    
    // Agregar badge de rol al usuario en el sidebar
    const userInfo = document.querySelector('.user-info');
    if (userInfo && !document.querySelector('.role-badge')) {
        const roleBadge = document.createElement('span');
        roleBadge.className = 'role-badge';
        roleBadge.textContent = role === ROLES.ADMIN ? 'Administrador' : 'Empleado';
        roleBadge.style.cssText = `
            display: inline-block;
            background: ${role === ROLES.ADMIN ? '#6a5acd' : '#28a745'};
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            margin-left: 8px;
            font-weight: 500;
        `;
        userInfo.appendChild(roleBadge);
    }
}

/**
 * Actualizar usuario admin con rol (ejecutar una vez)
 */
async function updateAdminRole(userEmail = 'admin@farmacia.com') {
    try {
        // Buscar usuario por email
        const usersSnapshot = await firebaseDB.collection('users')
            .where('email', '==', userEmail)
            .get();
        
        if (usersSnapshot.empty) {
            console.error('Usuario no encontrado');
            return false;
        }
        
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            role: ROLES.ADMIN,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Rol de admin actualizado correctamente');
        return true;
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        return false;
    }
}

/**
 * Mostrar información de permisos en consola (para debugging)
 */
function debugPermissions() {
    const role = getCurrentUserRole();
    console.log('=== DEBUG DE PERMISOS ===');
    console.log('Rol actual:', role);
    console.log('Es admin:', isAdmin());
    console.log('Es empleado:', isEmpleado());
    console.log('Permisos:', PERMISSIONS[role]);
    console.log('========================');
}
