// public/js/ui/layout.ui.js
import { CacheService } from '../services/cache.service.js';
import { Toast } from '../utils/toast.js';

let _eventsBound = false;
let _alertasCache = [];
let _filtroActivo = 'pendientes'; // 'pendientes' (sin ver) | 'vencimientos' | 'stock' | 'leidas' | 'todas'
let _searchQuery = '';
let _paginaActual = 1;
const _itemsPorPagina = 20;

function parsearFechaVencimiento(val) {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    if (val._seconds !== undefined) return new Date(val._seconds * 1000);
    if (val instanceof Date) return new Date(val.getTime());
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [y, m, day] = trimmed.split('-').map(Number);
            return new Date(y, m - 1, day, 23, 59, 59);
        }
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export const LayoutUI = {
    inject(userData = null) {
        const navbarContainer = document.getElementById('navbar-container');
        const sidebarContainer = document.getElementById('sidebar-container');

        if (navbarContainer) {
            navbarContainer.outerHTML = this.getNavbarHTML();
        }

        if (sidebarContainer) {
            sidebarContainer.outerHTML = this.getSidebarHTML(userData);
        }

        this.highlightActiveNavItem();
        this.bindEvents();
        this.loadNotifications();
    },

    updateSidebar(userData) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) {
            if (overlay) overlay.remove();
            sidebar.outerHTML = this.getSidebarHTML(userData);
            this.highlightActiveNavItem();
        }
    },

    closeSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        if (sb) sb.classList.remove('active');
        if (ov) ov.classList.remove('active');
        document.body.style.overflow = '';
    },

    getNavbarHTML() {
        return `
            <nav class="navbar" id="navbar">
                <div class="navbar-left">
                    <button class="menu-toggle" id="menuToggle" aria-label="Abrir menú" type="button">
                        <i class="fas fa-bars"></i>
                    </button>
                    <a href="dashboard.html" class="logo" title="Ir al Dashboard de inicio">
                        <img src="../img/logo-servisalud.png" alt="ServiSalud Logo" class="logo-image" onerror="this.src='../img/placeholder.png'">
                        <span class="logo-text">ServiSalud</span>
                    </a>
                </div>

                <div class="navbar-right">
                    <!-- Campana de Notificaciones Interactiva Nivel Pro -->
                    <div class="notif-wrapper">
                        <button id="btnNotifToggle" class="btn-icon" title="Notificaciones de Inventario" type="button" aria-label="Notificaciones">
                            <i class="fas fa-bell"></i>
                            <span id="notifBadgeCount" class="notif-badge" style="display: none;">0</span>
                        </button>
                        <div id="notifDropdown" class="notif-dropdown">
                            <!-- 1. Cabecera -->
                            <div class="notif-header">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <h4 style="margin: 0; font-size: 0.92rem; font-weight: 700; color: #1e293b;">
                                        <i class="fas fa-bell" style="color: #f59e0b;"></i> Alertas
                                    </h4>
                                    <span id="notifUnreadBadge" class="notif-counter-pill">0 sin ver</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <button type="button" id="btnMarkVisibleRead" class="notif-action-btn" title="Marcar las 20 de esta página como vistas (-20)">
                                        <i class="fas fa-check"></i> Marcar 20 vistas
                                    </button>
                                    <button type="button" id="btnMarkAllRead" class="notif-action-btn" title="Marcar todas las alertas como vistas">
                                        <i class="fas fa-check-double"></i> Todas
                                    </button>
                                    <button type="button" id="btnRefreshNotifs" class="notif-icon-btn" title="Sincronizar alertas con Firebase">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- 2. Buscador en vivo de alertas -->
                            <div class="notif-search-bar">
                                <div style="position: relative;">
                                    <i class="fas fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.75rem;"></i>
                                    <input type="text" id="notifSearchInput" placeholder="Buscar en 600+ alertas (ej: Paracetamol, agotado...)" style="width: 100%; padding: 6px 10px 6px 28px; font-size: 0.78rem; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; background: #f8fafc;">
                                </div>
                            </div>

                            <!-- 3. Pestañas de filtrado -->
                            <div class="notif-tabs">
                                <button type="button" class="notif-tab-btn active" data-tab="pendientes">Sin Ver (<span id="countTabPendientes">0</span>)</button>
                                <button type="button" class="notif-tab-btn" data-tab="vencimientos">Vencimientos (<span id="countTabVenc">0</span>)</button>
                                <button type="button" class="notif-tab-btn" data-tab="stock">Stock (<span id="countTabStock">0</span>)</button>
                                <button type="button" class="notif-tab-btn" data-tab="leidas">Vistas (<span id="countTabLeidas">0</span>)</button>
                                <button type="button" class="notif-tab-btn" data-tab="todas">Todas (<span id="countTabTodas">0</span>)</button>
                            </div>

                            <!-- 4. Cuerpo con lista -->
                            <div class="notif-body" id="notifList">
                                <div style="text-align: center; padding: 28px 16px; color: #94a3b8; font-size: 0.85rem;">
                                    <i class="fas fa-spinner fa-spin"></i> Verificando inventario...
                                </div>
                            </div>

                            <!-- 5. Pie con Paginación Fija -->
                            <div class="notif-footer" id="notifFooter">
                                <div class="notif-pagination">
                                    <button type="button" id="notifBtnPrev" class="notif-page-btn" disabled title="Página anterior">
                                        <i class="fas fa-chevron-left"></i> Anterior
                                    </button>
                                    <div class="notif-page-indicator">
                                        <span id="notifPageIndicatorText" style="font-weight: 700; color: #1e293b; font-size: 0.78rem;">Pág. 1 / 1</span>
                                        <span id="notifShowingCount" style="font-size: 0.7rem; color: #64748b;">(0 alertas)</span>
                                    </div>
                                    <button type="button" id="notifBtnNext" class="notif-page-btn" disabled title="Página siguiente">
                                        Siguiente 20 <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div class="notif-subfooter">
                                    <button type="button" id="btnResetSeenNotifs" class="notif-sublink-btn" title="Volver a marcar todas como pendientes">
                                        <i class="fas fa-undo"></i> Restablecer vistas
                                    </button>
                                    <a href="productos.html" style="font-size: 0.76rem; color: #0284c7; text-decoration: none; font-weight: 600;">
                                        Ver catálogo &rarr;
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="user-menu" id="userMenuBtn">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-details">
                            <span class="user-name" id="userName">Cargando...</span>
                            <span class="user-role" id="userRole">...</span>
                        </div>
                    </div>
                    <button id="btnLogout" class="btn-icon" title="Cerrar Sesión" type="button">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </nav>
        `;
    },

    getSidebarHTML(userData = null) {
        const hasPerm = (perm) => {
            if (!userData) return true;
            if (userData.role === 'admin') return true;
            if (Array.isArray(userData.permissions)) {
                return userData.permissions.includes(perm);
            }
            if (userData.role === 'empleado') {
                return perm === 'realizar_ventas';
            }
            return false;
        };

        const canVentas = hasPerm('realizar_ventas');
        const canProductos = hasPerm('ver_productos') || hasPerm('gestionar_productos');
        const canCategorias = hasPerm('gestionar_categorias');
        const canProveedores = hasPerm('gestionar_proveedores');
        const canUsuarios = hasPerm('gestionar_usuarios');
        const canReportes = hasPerm('ver_reportes');

        return `
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            <aside class="sidebar" id="sidebar">
                <nav class="sidebar-nav">
                    <a href="dashboard.html" class="nav-item" data-page="dashboard.html">
                        <i class="fas fa-home"></i><span>Dashboard</span>
                    </a>
                    ${canVentas ? `
                    <a href="ventas.html" class="nav-item" data-page="ventas.html">
                        <i class="fas fa-cash-register"></i><span>Ventas</span>
                    </a>` : ''}
                    ${canProductos ? `
                    <a href="productos.html" class="nav-item" data-page="productos.html">
                        <i class="fas fa-pills"></i><span>Productos</span>
                    </a>` : ''}
                    ${canCategorias ? `
                    <a href="categorias.html" class="nav-item" data-page="categorias.html">
                        <i class="fas fa-tags"></i><span>Categorías</span>
                    </a>` : ''}
                    ${canProveedores ? `
                    <a href="proveedores.html" class="nav-item" data-page="proveedores.html">
                        <i class="fas fa-truck"></i><span>Proveedores</span>
                    </a>` : ''}
                    ${canUsuarios ? `
                    <a href="usuarios.html" class="nav-item" data-page="usuarios.html">
                        <i class="fas fa-users"></i><span>Usuarios</span>
                    </a>` : ''}
                    ${canReportes ? `
                    <a href="reportes.html" class="nav-item" data-page="reportes.html">
                        <i class="fas fa-chart-bar"></i><span>Reportes</span>
                    </a>` : ''}
                </nav>
            </aside>
        `;
    },

    bindEvents() {
        if (_eventsBound) return;
        _eventsBound = true;

        // Delegación de eventos global a prueba de reconstrucción del DOM
        document.addEventListener('click', (e) => {
            // 1. Clic en botón toggle de notificaciones
            const notifBtn = e.target.closest('#btnNotifToggle');
            if (notifBtn) {
                e.stopPropagation();
                const dropdown = document.getElementById('notifDropdown');
                if (dropdown) {
                    const willShow = !dropdown.classList.contains('show');
                    dropdown.classList.toggle('show', willShow);
                    if (willShow) {
                        _paginaActual = 1; // reset a la primera página al abrir
                        this.renderListaNotificaciones();
                    }
                }
                return;
            }

            // 2. Clic en botón menú hamburguesa (sidebar)
            const menuBtn = e.target.closest('#menuToggle');
            if (menuBtn) {
                e.stopPropagation();
                const sb = document.getElementById('sidebar');
                const ov = document.getElementById('sidebarOverlay');
                if (sb) {
                    const isActive = sb.classList.toggle('active');
                    if (ov) ov.classList.toggle('active', isActive);
                    document.body.style.overflow = (isActive && window.innerWidth <= 768) ? 'hidden' : '';
                }
                return;
            }

            // 3. Clic en botón refrescar notificaciones (sincronizar con Firebase)
            const refreshBtn = e.target.closest('#btnRefreshNotifs');
            if (refreshBtn) {
                e.stopPropagation();
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('fa-spin');
                Toast.show('Sincronizando inventario con Firebase...', 'info', 1500);
                this.loadNotifications(true).then(() => {
                    Toast.show(`Inventario actualizado (${_alertasCache.length} alertas analizadas).`, 'success');
                }).finally(() => {
                    setTimeout(() => icon?.classList.remove('fa-spin'), 400);
                });
                return;
            }

            // 4. Clic en marcar visibles como leídas (botón en cabecera o banner)
            const markVisBtn = e.target.closest('#btnMarkVisibleRead') || e.target.closest('#btnQuickMarkCurrentPage');
            if (markVisBtn) {
                e.stopPropagation();
                this.marcarVisiblesComoLeidas();
                return;
            }

            // 5. Clic en marcar todas como leídas
            const markAllBtn = e.target.closest('#btnMarkAllRead');
            if (markAllBtn) {
                e.stopPropagation();
                this.marcarTodasComoLeidas();
                return;
            }

            // 6. Clic en restablecer vistas
            const resetBtn = e.target.closest('#btnResetSeenNotifs');
            if (resetBtn) {
                e.stopPropagation();
                this.restablecerVistas();
                return;
            }

            // 7. Clic en botón página anterior
            const prevBtn = e.target.closest('#notifBtnPrev');
            if (prevBtn) {
                e.stopPropagation();
                if (_paginaActual > 1) {
                    _paginaActual--;
                    this.renderListaNotificaciones();
                    const list = document.getElementById('notifList');
                    if (list) list.scrollTop = 0;
                }
                return;
            }

            // 8. Clic en botón página siguiente
            const nextBtn = e.target.closest('#notifBtnNext');
            if (nextBtn) {
                e.stopPropagation();
                const filtradas = this._obtenerFiltradas();
                const totalPags = Math.ceil(filtradas.length / _itemsPorPagina) || 1;
                if (_paginaActual < totalPags) {
                    _paginaActual++;
                    this.renderListaNotificaciones();
                    const list = document.getElementById('notifList');
                    if (list) list.scrollTop = 0;
                }
                return;
            }

            // 9. Clic en check individual de una notificación
            const checkBtn = e.target.closest('.notif-check-btn');
            if (checkBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = checkBtn.dataset.id;
                if (id) {
                    this.marcarUnaComoLeida(id);
                }
                return;
            }

            // 10. Clic en el texto/enlace de la notificación (marca como leída al navegar)
            const notifContent = e.target.closest('.notif-item-content');
            if (notifContent) {
                const parentItem = notifContent.closest('.notif-item');
                const btn = parentItem?.querySelector('.notif-check-btn');
                const id = btn?.dataset.id;
                if (id) {
                    this.marcarUnaComoLeida(id, false);
                }
            }

            // 11. Clic en tabs de notificaciones
            const tabBtn = e.target.closest('.notif-tab-btn');
            if (tabBtn) {
                e.stopPropagation();
                document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                _filtroActivo = tabBtn.dataset.tab || 'pendientes';
                _paginaActual = 1;
                this.renderListaNotificaciones();
                return;
            }

            // 12. Clic en overlay del sidebar
            if (e.target.closest('#sidebarOverlay')) {
                this.closeSidebar();
                return;
            }

            // 13. Clic en enlaces del sidebar en móvil
            if (e.target.closest('.sidebar-nav .nav-item') && window.innerWidth <= 768) {
                this.closeSidebar();
                return;
            }

            // 14. Clic fuera del desplegable de notificaciones para cerrarlo
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            }

            // 15. Clic fuera del sidebar para cerrarlo
            const sb = document.getElementById('sidebar');
            if (sb && sb.classList.contains('active')) {
                if (!sb.contains(e.target)) {
                    this.closeSidebar();
                }
            }
        });

        // Buscador en tiempo real dentro del desplegable
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'notifSearchInput') {
                _searchQuery = e.target.value.trim().toLowerCase();
                _paginaActual = 1;
                this.renderListaNotificaciones();
            }
        });

        // Tecla Escape para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
                const dropdown = document.getElementById('notifDropdown');
                if (dropdown && dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            }
        });
    },

    _getSeenSet() {
        try {
            const arr = JSON.parse(localStorage.getItem('sfs_notif_seen_ids') || '[]');
            return new Set(Array.isArray(arr) ? arr : []);
        } catch {
            return new Set();
        }
    },

    _saveSeenSet(set) {
        try {
            localStorage.setItem('sfs_notif_seen_ids', JSON.stringify([...set]));
        } catch (e) {
            console.warn("No se pudo guardar en localStorage:", e);
        }
    },

    marcarUnaComoLeida(id, notify = true) {
        const seen = this._getSeenSet();
        seen.add(id);
        this._saveSeenSet(seen);
        this.actualizarContadoresUI();
        
        const noLeidasRestantes = _alertasCache.filter(a => !seen.has(a.id)).length;
        if (notify) {
            Toast.show(`Alerta marcada como vista (-1). Quedan ${noLeidasRestantes} sin ver.`, 'info', 1800);
            const filtradas = this._obtenerFiltradas();
            const totalPags = Math.ceil(filtradas.length / _itemsPorPagina) || 1;
            if (_paginaActual > totalPags) {
                _paginaActual = totalPags;
            }
            this.renderListaNotificaciones();
        }
    },

    marcarVisiblesComoLeidas() {
        const seen = this._getSeenSet();
        const filtradas = this._obtenerFiltradas();
        const start = (_paginaActual - 1) * _itemsPorPagina;
        const visibles = filtradas.slice(start, start + _itemsPorPagina);
        
        let marcadas = 0;
        visibles.forEach(a => {
            if (!seen.has(a.id)) {
                seen.add(a.id);
                marcadas++;
            }
        });

        this._saveSeenSet(seen);
        this.actualizarContadoresUI();

        const noLeidasRestantes = _alertasCache.filter(a => !seen.has(a.id)).length;
        if (marcadas > 0) {
            Toast.show(`✓ ${marcadas} alertas marcadas como vistas (-${marcadas}). Quedan ${noLeidasRestantes} sin ver.`, 'success', 2500);
        } else {
            Toast.show('Las alertas de esta página ya estaban marcadas como vistas.', 'info', 2000);
        }

        const nuevasFiltradas = this._obtenerFiltradas();
        const totalPags = Math.ceil(nuevasFiltradas.length / _itemsPorPagina) || 1;
        if (_paginaActual > totalPags) {
            _paginaActual = totalPags;
        }
        this.renderListaNotificaciones();
    },

    marcarTodasComoLeidas() {
        const seen = this._getSeenSet();
        _alertasCache.forEach(a => seen.add(a.id));
        this._saveSeenSet(seen);
        this.actualizarContadoresUI();
        Toast.show(`✓ Todas las alertas han sido marcadas como vistas.`, 'success', 2500);
        _paginaActual = 1;
        this.renderListaNotificaciones();
    },

    restablecerVistas() {
        try {
            localStorage.removeItem('sfs_notif_seen_ids');
            this.actualizarContadoresUI();
            _paginaActual = 1;
            this.renderListaNotificaciones();
            Toast.show('Se han restablecido todas las alertas como no vistas.', 'info', 2500);
        } catch (e) {
            console.warn('Error al restablecer vistas:', e);
        }
    },

    actualizarContadoresUI() {
        const seen = this._getSeenSet();
        const noLeidas = _alertasCache.filter(a => !seen.has(a.id));
        const unreadCount = noLeidas.length;
        const leidasCount = _alertasCache.filter(a => seen.has(a.id)).length;

        // Badge en la campana (globo rojo exterior)
        const notifBadge = document.getElementById('notifBadgeCount');
        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.textContent = unreadCount > 999 ? '999+' : unreadCount;
                notifBadge.style.display = 'block';
            } else {
                notifBadge.style.display = 'none';
            }
        }

        // Contador pill en cabecera
        const unreadPill = document.getElementById('notifUnreadBadge');
        if (unreadPill) {
            if (unreadCount > 0) {
                unreadPill.textContent = `${unreadCount} sin ver`;
                unreadPill.className = 'notif-counter-pill';
            } else {
                unreadPill.textContent = 'Al día ✓';
                unreadPill.className = 'notif-counter-pill clean';
            }
        }

        // Deshabilitar botones de marcado si ya no hay nada sin ver
        const btnMarkVisible = document.getElementById('btnMarkVisibleRead');
        if (btnMarkVisible) {
            btnMarkVisible.disabled = (unreadCount === 0);
            btnMarkVisible.title = (unreadCount === 0) ? 'No hay alertas pendientes' : 'Marcar las 20 de esta página como vistas (-20)';
        }
        const btnMarkAll = document.getElementById('btnMarkAllRead');
        if (btnMarkAll) {
            btnMarkAll.disabled = (unreadCount === 0);
            btnMarkAll.title = (unreadCount === 0) ? 'Todas las alertas ya están al día' : 'Marcar todas las alertas como vistas';
        }

        // Tabs: ¡Contar ÚNICAMENTE las pendientes/sin ver en Vencimientos y Stock!
        const countPend = document.getElementById('countTabPendientes');
        const countVenc = document.getElementById('countTabVenc');
        const countStock = document.getElementById('countTabStock');
        const countLeidas = document.getElementById('countTabLeidas');
        const countTodas = document.getElementById('countTabTodas');

        const vencPendientes = _alertasCache.filter(a => a.categoria === 'vencimientos' && !seen.has(a.id)).length;
        const stockPendientes = _alertasCache.filter(a => a.categoria === 'stock' && !seen.has(a.id)).length;

        if (countPend) countPend.textContent = unreadCount;
        if (countVenc) countVenc.textContent = vencPendientes;
        if (countStock) countStock.textContent = stockPendientes;
        if (countLeidas) countLeidas.textContent = leidasCount;
        if (countTodas) countTodas.textContent = _alertasCache.length;
    },

    async loadNotifications(force = false) {
        const notifList = document.getElementById('notifList');
        if (!notifList) return;

        try {
            if (force) {
                sessionStorage.removeItem('sfs_products');
                sessionStorage.removeItem('sfs_products_ts');
            }

            const productos = await CacheService.getProductos();
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const alertas = [];

            productos.forEach(p => {
                const stock = parseInt(p.current_stock ?? p.stock ?? 0, 10);
                const minStock = parseInt(p.min_stock ?? 5, 10);
                const nombre = p.name || p.nombre || 'Producto';
                const id = p.id || nombre;

                // 1. Detección Exhaustiva de Vencimiento
                const rawFecha = p.expiration_date || p.expiry_date || p.fecha_vencimiento || p.fechaVencimiento || p.expirationDate;
                const expDate = parsearFechaVencimiento(rawFecha);

                if (expDate) {
                    const target = new Date(expDate.getTime());
                    target.setHours(23, 59, 59, 999);

                    const diffTime = target.getTime() - hoy.getTime();
                    const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const fechaStr = expDate.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    if (diffDias < 0) {
                        const diasVencido = Math.abs(diffDias);
                        alertas.push({
                            id: `${id}_vencido`,
                            categoria: 'vencimientos',
                            tipo: 'vencido',
                            nombre: nombre,
                            icono: 'fa-skull-crossbones',
                            color: '#dc2626',
                            bg: '#fee2e2',
                            etiqueta: 'VENCIDO',
                            titulo: nombre,
                            mensaje: `Venció hace ${diasVencido} ${diasVencido === 1 ? 'día' : 'días'} (${fechaStr}).`,
                            link: `productos.html?search=${encodeURIComponent(nombre)}`
                        });
                    } else if (diffDias <= 30) {
                        const urgenciaColor = diffDias <= 7 ? '#dc2626' : '#ea580c';
                        const urgenciaBg = diffDias <= 7 ? '#fee2e2' : '#ffedd5';
                        const textoMsg = diffDias === 0 ? `¡Vence hoy! (${fechaStr})` : `Vence en ${diffDias} ${diffDias === 1 ? 'día' : 'días'} (${fechaStr}).`;

                        alertas.push({
                            id: `${id}_por_vencer`,
                            categoria: 'vencimientos',
                            tipo: 'por_vencer',
                            nombre: nombre,
                            icono: 'fa-hourglass-half',
                            color: urgenciaColor,
                            bg: urgenciaBg,
                            etiqueta: diffDias === 0 ? 'HOY' : `${diffDias}D REST.`,
                            titulo: nombre,
                            mensaje: textoMsg,
                            link: `productos.html?search=${encodeURIComponent(nombre)}`
                        });
                    }
                }

                // 2. Stock Agotado (0)
                if (stock <= 0) {
                    alertas.push({
                        id: `${id}_agotado`,
                        categoria: 'stock',
                        tipo: 'agotado',
                        nombre: nombre,
                        icono: 'fa-ban',
                        color: '#dc2626',
                        bg: '#fee2e2',
                        etiqueta: 'SIN STOCK',
                        titulo: nombre,
                        mensaje: `Agotado por completo en farmacia (0 unid.).`,
                        link: `productos.html?search=${encodeURIComponent(nombre)}`
                    });
                } else if (stock <= minStock) {
                    // 3. Stock Crítico
                    alertas.push({
                        id: `${id}_stock_bajo`,
                        categoria: 'stock',
                        tipo: 'stock_bajo',
                        nombre: nombre,
                        icono: 'fa-box-open',
                        color: '#b45309',
                        bg: '#fef3c7',
                        etiqueta: 'STOCK BAJO',
                        titulo: nombre,
                        mensaje: `Quedan solo ${stock} unid. (Mínimo: ${minStock}).`,
                        link: `productos.html?search=${encodeURIComponent(nombre)}`
                    });
                }
            });

            // Ordenar por severidad: vencido (1) > agotado (2) > por_vencer (3) > stock_bajo (4)
            const prioridad = { vencido: 1, agotado: 2, por_vencer: 3, stock_bajo: 4 };
            alertas.sort((a, b) => (prioridad[a.tipo] || 5) - (prioridad[b.tipo] || 5));

            _alertasCache = alertas;

            this.actualizarContadoresUI();
            this.renderListaNotificaciones();

        } catch (err) {
            console.warn('Error al cargar alertas en LayoutUI:', err);
            if (notifList) {
                notifList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 0.82rem;">
                        No se pudieron cargar las alertas.
                    </div>
                `;
            }
        }
    },

    _obtenerFiltradas() {
        const seen = this._getSeenSet();
        let items = _alertasCache;

        // 1. Filtro por pestaña
        if (_filtroActivo === 'pendientes') {
            items = items.filter(a => !seen.has(a.id));
        } else if (_filtroActivo === 'vencimientos') {
            // Muestra estrictamente los vencimientos pendientes por revisar
            items = items.filter(a => a.categoria === 'vencimientos' && !seen.has(a.id));
        } else if (_filtroActivo === 'stock') {
            // Muestra estrictamente el stock pendiente por revisar
            items = items.filter(a => a.categoria === 'stock' && !seen.has(a.id));
        } else if (_filtroActivo === 'leidas') {
            // Muestra las que ya fueron vistas/marcadas
            items = items.filter(a => seen.has(a.id));
        }
        // 'todas' muestra todas (vistas y no vistas)

        // 2. Filtro por búsqueda de texto
        if (_searchQuery) {
            items = items.filter(a =>
                a.nombre.toLowerCase().includes(_searchQuery) ||
                a.titulo.toLowerCase().includes(_searchQuery) ||
                a.etiqueta.toLowerCase().includes(_searchQuery)
            );
        }

        return items;
    },

    renderListaNotificaciones() {
        const notifList = document.getElementById('notifList');
        const showingCount = document.getElementById('notifShowingCount');
        const pageIndicator = document.getElementById('notifPageIndicatorText');
        const btnPrev = document.getElementById('notifBtnPrev');
        const btnNext = document.getElementById('notifBtnNext');
        if (!notifList) return;

        const seen = this._getSeenSet();
        const filtradas = this._obtenerFiltradas();
        const totalFiltradas = filtradas.length;
        const totalPaginas = Math.max(1, Math.ceil(totalFiltradas / _itemsPorPagina));

        if (_paginaActual > totalPaginas) {
            _paginaActual = totalPaginas;
        }

        // Actualizar controles de paginación en el pie
        if (btnPrev) btnPrev.disabled = (_paginaActual <= 1);
        if (btnNext) btnNext.disabled = (_paginaActual >= totalPaginas);
        if (pageIndicator) pageIndicator.textContent = `Pág. ${_paginaActual} / ${totalPaginas}`;

        if (totalFiltradas === 0) {
            const msgs = {
                pendientes: '¡No tienes alertas pendientes por revisar!',
                vencimientos: '¡Vencimientos al día! No tienes medicamentos vencidos pendientes.',
                stock: '¡Stock al día! No tienes productos con stock crítico pendientes.',
                leidas: 'No tienes alertas marcadas como vistas todavía.',
                todas: 'Todo el inventario de la farmacia está al día.'
            };
            notifList.innerHTML = `
                <div style="text-align: center; padding: 32px 14px; color: #10b981;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 6px; display: block;"></i>
                    <strong style="color: #1e293b; font-size: 0.88rem; display: block;">¡Todo al día!</strong>
                    <span style="color: #64748b; font-size: 0.76rem;">${msgs[_filtroActivo] || 'No se encontraron alertas.'}</span>
                </div>
            `;
            if (showingCount) showingCount.textContent = '(0 alertas)';
            return;
        }

        const start = (_paginaActual - 1) * _itemsPorPagina;
        const end = Math.min(start + _itemsPorPagina, totalFiltradas);
        const visibles = filtradas.slice(start, end);

        if (showingCount) {
            showingCount.textContent = `(${start + 1}-${end} de ${totalFiltradas})`;
        }

        // Banner informativo en la página actual
        const noLeidasEnPagina = visibles.filter(a => !seen.has(a.id)).length;
        let bannerHtml = '';
        if (noLeidasEnPagina > 0) {
            bannerHtml = `
                <div class="notif-page-banner">
                    <span><strong>${noLeidasEnPagina}</strong> sin ver en esta página</span>
                    <button type="button" id="btnQuickMarkCurrentPage" class="btn-banner-mark" title="Marcar estas ${noLeidasEnPagina} como vistas">
                        <i class="fas fa-check"></i> Marcar vistas (-${noLeidasEnPagina})
                    </button>
                </div>
            `;
        }

        let itemsHtml = visibles.map(a => {
            const esLeida = seen.has(a.id);
            return `
                <div class="notif-item ${esLeida ? 'is-read' : 'is-unread'}" data-item-id="${a.id}">
                    <!-- Indicador dot no leído -->
                    <span class="notif-unread-dot ${esLeida ? 'read' : ''}" title="${esLeida ? 'Ya vista' : 'No vista'}"></span>

                    <!-- Icono representativo -->
                    <div class="notif-item-icon" style="background: ${a.bg}; color: ${a.color};">
                        <i class="fas ${a.icono}"></i>
                    </div>

                    <!-- Enlace directo al producto -->
                    <a href="${a.link}" class="notif-item-content" style="text-decoration: none; color: inherit;" title="Ver ${a.nombre} en productos">
                        <div class="notif-item-title">
                            <span class="notif-prod-title">${a.titulo}</span>
                            <span class="notif-pill-tag" style="background: ${a.bg}; color: ${a.color};">
                                ${a.etiqueta}
                            </span>
                        </div>
                        <div class="notif-item-desc">${a.mensaje}</div>
                    </a>

                    <!-- Botón check rápido para marcar como leída individualmente -->
                    <button type="button" class="notif-check-btn ${esLeida ? 'checked' : ''}" data-id="${a.id}" title="${esLeida ? 'Ya vista' : 'Marcar como vista (-1)'}">
                        <i class="fas ${esLeida ? 'fa-check-double' : 'fa-check'}"></i>
                    </button>

                    <i class="fas fa-chevron-right notif-item-arrow" style="font-size: 0.75rem;"></i>
                </div>
            `;
        }).join('');

        notifList.innerHTML = bannerHtml + itemsHtml;
    },

    highlightActiveNavItem() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            const page = item.getAttribute('data-page');
            if (page && currentPath.endsWith(page)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
};
