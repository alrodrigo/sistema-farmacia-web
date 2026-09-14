// =====================================================
// ARCHIVO: public/js/middleware/auth.guard.js
// DESCRIPCIÓN: Route Guard y protección PBAC modular en tiempo real (Firebase v10)
// =====================================================

import { LayoutUI } from '../ui/layout.ui.js';
import { auth, db } from '../config/firebase.js';
import { CacheService } from '../services/cache.service.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DICCIONARIO DE RUTAS PBAC
// Mapea la ruta de la URL con el permiso específico requerido
export const ROUTE_PERMISSIONS = {
    '/ventas.html': 'realizar_ventas',
    '/productos.html': 'ver_productos',
    '/categorias.html': 'gestionar_categorias',
    '/proveedores.html': 'gestionar_proveedores',
    '/usuarios.html': 'gestionar_usuarios',
    '/reportes.html': 'ver_reportes'
};

export const AuthGuard = {
    _unsubscribeUserListener: null,

    async protect() {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    window.location.href = '/index.html';
                    return reject('No autenticado');
                }

                try {
                    // 1. CACHÉ DE SESIÓN (Rendimiento: 0 lecturas si ya está en RAM)
                    let userData = JSON.parse(sessionStorage.getItem('currentUserSession') || 'null');

                    if (!userData || userData.uid !== user.uid) {
                        const userRef = doc(db, 'users', user.uid);
                        const userDoc = await getDoc(userRef);
                        if (!userDoc.exists()) throw new Error('Usuario no encontrado en BD');

                        userData = { uid: user.uid, email: user.email, ...userDoc.data() };
                        sessionStorage.setItem('currentUserSession', JSON.stringify(userData));
                    }

                    // 1.1 Verificación de cuenta activa (Soft Delete)
                    if (userData.active === false) {
                        alert('⚠️ Tu cuenta ha sido desactivada por un administrador.');
                        await this.logout();
                        return reject('Cuenta desactivada');
                    }

                    // 2. VERIFICACIÓN DINÁMICA DE RUTAS (PBAC)
                    const currentPath = window.location.pathname;
                    const requiredRoute = Object.keys(ROUTE_PERMISSIONS).find(route => currentPath.endsWith(route));

                    if (requiredRoute) {
                        const requiredPermission = ROUTE_PERMISSIONS[requiredRoute];
                        if (!this.hasPermission(requiredPermission, userData)) {
                            alert('⚠️ Acceso denegado. No tienes permisos para acceder a esta sección.');
                            window.location.href = 'dashboard.html';
                            return reject('Falta de permisos');
                        }
                    }

                    // 3. RENDERIZADO VISUAL CENTRALIZADO
                    this.applyUnifiedUI(userData);

                    // 4. SUSCRIPCIÓN EN TIEMPO REAL (Protección contra el usuario fantasma)
                    this.listenToUserChanges(user.uid);

                    resolve(userData);

                } catch (error) {
                    console.error('Error crítico en AuthGuard:', error);
                    await this.logout();
                    reject(error);
                }
            });
        });
    },

    /**
     * Valida si un usuario tiene un permiso específico concedido
     * @param {string} requiredPermission 
     * @param {Object} [userData] 
     * @returns {boolean}
     */
    hasPermission(requiredPermission, userData = null) {
        if (!userData) {
            userData = JSON.parse(sessionStorage.getItem('currentUserSession') || '{}');
        }

        // 1. Administrador siempre tiene pase libre total (Superusuario)
        if (userData.role === 'admin') return true;

        // 2. Jerarquía de catálogo: gestionar_productos incluye implícitamente ver_productos
        if (requiredPermission === 'ver_productos') {
            if (Array.isArray(userData.permissions)) {
                if (userData.permissions.includes('ver_productos') || userData.permissions.includes('gestionar_productos')) {
                    return true;
                }
            }
        }

        // 3. Comprobar arreglo de permisos granular
        if (Array.isArray(userData.permissions)) {
            return userData.permissions.includes(requiredPermission);
        }

        // 4. Compatibilidad con usuarios previos/legacy sin arreglo 'permissions':
        if (userData.role === 'empleado') {
            return requiredPermission === 'realizar_ventas' || requiredPermission === 'ver_productos';
        }

        return false;
    },

    /**
     * Escucha cambios en Firestore sobre el usuario logueado en tiempo real.
     * Si le quitan un permiso o lo desactivan, actúa de inmediato.
     * @param {string} uid 
     */
    listenToUserChanges(uid) {
        if (this._unsubscribeUserListener) return;

        const userRef = doc(db, 'users', uid);
        this._unsubscribeUserListener = onSnapshot(userRef, (snapshot) => {
            if (!snapshot.exists()) {
                alert('⚠️ Tu cuenta ha sido eliminada por un administrador.');
                this.logout();
                return;
            }

            const data = snapshot.data();

            // 1. Si la cuenta fue desactivada por un administrador
            if (data.active === false) {
                alert('⚠️ Tu cuenta ha sido desactivada por un administrador.');
                this.logout();
                return;
            }

            // 2. Sincronizar datos actualizados en sessionStorage
            const currentCached = JSON.parse(sessionStorage.getItem('currentUserSession') || '{}');
            const updatedUserData = { uid: uid, email: currentCached.email, ...data };
            sessionStorage.setItem('currentUserSession', JSON.stringify(updatedUserData));

            // 3. Si está en una pantalla restringida y perdió el permiso, expulsarlo
            const currentPath = window.location.pathname;
            const requiredRoute = Object.keys(ROUTE_PERMISSIONS).find(route => currentPath.endsWith(route));
            if (requiredRoute) {
                const requiredPerm = ROUTE_PERMISSIONS[requiredRoute];
                if (!this.hasPermission(requiredPerm, updatedUserData)) {
                    alert('⚠️ Tus permisos han sido actualizados por un administrador. Ya no tienes acceso a esta sección.');
                    window.location.href = 'dashboard.html';
                    return;
                }
            }

            // 4. Actualizar Sidebar y Navbar en vivo
            LayoutUI.updateSidebar(updatedUserData);
            this.updateNavbarUserInfo(updatedUserData);

            // 5. Emitir evento para controladores que requieran reaccionar en caliente
            window.dispatchEvent(new CustomEvent('sessionPermissionsUpdated', { detail: updatedUserData }));
        }, (error) => {
            console.error('Error en listener de usuario en tiempo real:', error);
        });
    },

    updateNavbarUserInfo(userData) {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');

        if (userNameEl) {
            userNameEl.textContent = userData.displayName || userData.name || userData.nombre || userData.first_name || userData.email?.split('@')[0] || 'Usuario';
        }
        if (userRoleEl) {
            let roleLabel = 'Empleado';
            if (userData.role === 'admin') roleLabel = 'Administrador';
            else if (userData.role === 'personalizado') roleLabel = 'Personalizado';
            userRoleEl.textContent = roleLabel;
        }

        document.body.classList[userData.role === 'admin' ? 'add' : 'remove']('show-admin-options');
    },

    applyUnifiedUI(userData) {
        // 1. Inyectar Navbar y Sidebar limpios según permisos
        LayoutUI.inject(userData);

        // 2. Asignar Evento Global de Logout
        document.getElementById('btnLogout')?.addEventListener('click', () => this.logout());

        // 3. Llenar datos de usuario en Navbar
        this.updateNavbarUserInfo(userData);
    },

    async logout() {
        if (this._unsubscribeUserListener) {
            this._unsubscribeUserListener();
            this._unsubscribeUserListener = null;
        }
        sessionStorage.removeItem('currentUserSession'); // Limpiar caché de usuario
        CacheService.invalidarTodo(); // Limpiar caché de inventario
        await signOut(auth);
        window.location.href = '/index.html';
    }
};