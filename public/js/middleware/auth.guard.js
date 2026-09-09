// public/js/middleware/auth.guard.js
import { LayoutUI } from '../ui/layout.ui.js';

const auth = window.firebaseAuth;
const db = window.firebaseDB;

// DICCIONARIO DE RUTAS PBAC (Preparado para la Fase 2)
// Mapea la ruta de la URL con el permiso futuro que se necesitará.
const ROUTE_PERMISSIONS = {
    '/categorias.html': 'gestionar_categorias',
    '/proveedores.html': 'gestionar_proveedores',
    '/usuarios.html': 'gestionar_usuarios',
    '/reportes.html': 'ver_reportes'
};

export const AuthGuard = {
    async protect() {
        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    window.location.href = '/index.html';
                    return reject('No autenticado');
                }

                try {
                    // 1. CACHÉ DE SESIÓN (Rendimiento: 0 lecturas a Firestore si ya está en RAM)
                    let userData = JSON.parse(sessionStorage.getItem('currentUserSession'));

                    if (!userData || userData.uid !== user.uid) {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (!userDoc.exists) throw new Error('Usuario no encontrado en BD');

                        userData = { uid: user.uid, email: user.email, ...userDoc.data() };
                        sessionStorage.setItem('currentUserSession', JSON.stringify(userData));
                    }

                    // 1.1 Verificación de cuenta activa (Soft Delete)
                    if (userData.active === false) {
                        alert('⚠️ Tu cuenta ha sido desactivada por un administrador.');
                        await this.logout();
                        return reject('Cuenta desactivada');
                    }

                    // 2. VERIFICACIÓN DINÁMICA DE RUTAS (Fase 1)
                    const currentPath = window.location.pathname;
                    const requiredPermission = Object.keys(ROUTE_PERMISSIONS).find(route => currentPath.endsWith(route));

                    if (requiredPermission) {
                        // FASE 1: Como aún no tenemos la consola de permisos, exigimos que sea 'admin'
                        if (userData.role !== 'admin') {
                            alert('⚠️ Acceso denegado. No tienes permisos para ver esta pantalla.');
                            window.location.href = 'dashboard.html';
                            return reject('Falta de permisos');
                        }
                    }

                    // 3. RENDERIZADO VISUAL CENTRALIZADO (KISS)
                    this.applyUnifiedUI(userData);

                    resolve(userData);

                } catch (error) {
                    console.error('Error crítico en AuthGuard:', error);
                    await this.logout();
                    reject(error);
                }
            });
        });
    },

    applyUnifiedUI(userData) {
        // 1. Inyectar Navbar y Sidebar limpios
        LayoutUI.inject();

        // 2. Asignar Evento Global de Logout
        document.getElementById('btnLogout')?.addEventListener('click', () => this.logout());

        // 3. Control de CSS global por rol
        document.body.classList[userData.role === 'admin' ? 'add' : 'remove']('show-admin-options');

        // 4. Llenar datos del usuario en el Navbar inyectado
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');

        if (userNameEl) {
            userNameEl.textContent = userData.displayName || userData.name || userData.nombre || userData.first_name || userData.email?.split('@')[0] || 'Usuario';
        }
        if (userRoleEl) {
            userRoleEl.textContent = userData.role === 'admin' ? 'Administrador' : 'Empleado';
        }
    },

    async logout() {
        sessionStorage.removeItem('currentUserSession'); // Limpiar caché de usuario
        if (window.AppCache && window.AppCache.clearAll) window.AppCache.clearAll(); // Limpiar caché de inventario
        await auth.signOut();
        window.location.href = '/index.html';
    }
};