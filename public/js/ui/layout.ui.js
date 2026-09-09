// public/js/ui/layout.ui.js

export const LayoutUI = {
    inject() {
        const navbarContainer = document.getElementById('navbar-container');
        const sidebarContainer = document.getElementById('sidebar-container');

        if (navbarContainer) {
            navbarContainer.outerHTML = this.getNavbarHTML();
        }

        if (sidebarContainer) {
            sidebarContainer.outerHTML = this.getSidebarHTML();
        }

        this.highlightActiveNavItem();
        this.bindEvents();
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

    getSidebarHTML() {
        return `
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            <aside class="sidebar" id="sidebar">
                <nav class="sidebar-nav">
                    <a href="dashboard.html" class="nav-item" data-page="dashboard.html">
                        <i class="fas fa-home"></i><span>Dashboard</span>
                    </a>
                    <a href="ventas.html" class="nav-item" data-page="ventas.html">
                        <i class="fas fa-cash-register"></i><span>Ventas</span>
                    </a>
                    <a href="productos.html" class="nav-item" data-page="productos.html">
                        <i class="fas fa-pills"></i><span>Productos</span>
                    </a>
                    <a href="categorias.html" class="nav-item admin-only" data-page="categorias.html">
                        <i class="fas fa-tags"></i><span>Categorías</span>
                    </a>
                    <a href="proveedores.html" class="nav-item admin-only" data-page="proveedores.html">
                        <i class="fas fa-truck"></i><span>Proveedores</span>
                    </a>
                    <a href="usuarios.html" class="nav-item admin-only" data-page="usuarios.html">
                        <i class="fas fa-users"></i><span>Usuarios</span>
                    </a>
                    <a href="reportes.html" class="nav-item admin-only" data-page="reportes.html">
                        <i class="fas fa-chart-bar"></i><span>Reportes</span>
                    </a>
                </nav>
            </aside>
        `;
    },

    bindEvents() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        const toggleSidebar = () => {
            const isActive = sidebar?.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active', !!isActive);
            if (isActive && window.innerWidth <= 768) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };

        const closeSidebar = () => {
            sidebar?.classList.remove('active');
            overlay?.classList.remove('active');
            document.body.style.overflow = '';
        };

        // Click en botón hamburguesa
        menuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        // Click en overlay de fondo cierra el menú
        overlay?.addEventListener('click', closeSidebar);

        // Click en enlaces del menú en móvil cierra el sidebar
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });

        // Click fuera del sidebar
        document.addEventListener('click', (e) => {
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        // Tecla Escape para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar?.classList.contains('active')) {
                closeSidebar();
            }
        });
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
