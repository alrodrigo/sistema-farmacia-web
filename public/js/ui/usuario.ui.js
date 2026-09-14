// public/js/ui/usuario.ui.js
import { ModalUI } from './modal.ui.js';

export const ROLE_PRESETS = {
    admin: [
        'realizar_ventas', 'aplicar_descuentos',
        'ver_productos', 'gestionar_productos', 'gestionar_categorias', 'gestionar_proveedores',
        'ver_reportes', 'gestionar_usuarios'
    ],
    empleado: [
        'realizar_ventas'
    ],
    personalizado: []
};

export const UsuarioUI = {
    renderTable(usuarios, paginaActual, usuariosPorPagina, currentUserId, userRole) {
        const tbody = document.getElementById('usuariosTableBody');
        if (!tbody) return;

        const inicio = (paginaActual - 1) * usuariosPorPagina;
        const fin = inicio + usuariosPorPagina;
        const usuariosActuales = usuarios.slice(inicio, fin);

        if (usuariosActuales.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fas fa-users-slash"></i>
                            <h3>No se encontraron usuarios</h3>
                            <p>Intenta ajustar los filtros o crea un nuevo usuario</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = usuariosActuales.map(usuario => {
            const fechaRegistro = usuario.created_at ? this.formatDate(usuario.created_at.toDate()) : 'N/A';
            const ultimoAcceso = usuario.last_login ? this.formatDate(usuario.last_login.toDate()) : 'Nunca';
            const isCurrentUser = usuario.id === currentUserId;
            const deleteDisabled = isCurrentUser ? 'disabled' : '';
            const isAdmin = userRole === 'admin';

            const botonesAccion = isAdmin ? `
                <div class="action-buttons">
                    <button class="btn-action btn-edit" data-action="editar" data-id="${usuario.id}" title="Editar usuario y permisos">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-password" data-action="recuperar" data-email="${usuario.email}" title="Enviar correo de recuperación">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="btn-action btn-delete" data-action="eliminar" data-id="${usuario.id}" data-name="${encodeURIComponent(usuario.name || usuario.nombre || usuario.email || '')}" title="Eliminar" ${deleteDisabled}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : `<span class="text-muted">Solo lectura</span>`;

            const nombreVisual = usuario.nombre || usuario.name || usuario.first_name || usuario.email?.split('@')[0] || 'Sin nombre';

            let roleBadgeClass = usuario.role || 'empleado';
            let roleIcon = 'user-tag';
            let roleLabel = 'Empleado';

            if (usuario.role === 'admin') {
                roleIcon = 'user-shield';
                roleLabel = 'Administrador';
            } else if (usuario.role === 'personalizado') {
                roleIcon = 'user-cog';
                roleLabel = 'Personalizado';
            }

            return `
            <tr data-id="${usuario.id}">
                <td>
                    <div class="user-name">
                        <i class="fas fa-user-circle"></i>
                        ${nombreVisual}
                        ${isCurrentUser ? '<span class="badge-estado activo">(Tú)</span>' : ''}
                    </div>
                </td>
                <td><div class="user-email">${usuario.email}</div></td>
                <td>
                    <span class="badge-rol ${roleBadgeClass}">
                        <i class="fas fa-${roleIcon}"></i>
                        ${roleLabel}
                    </span>
                </td>
                <td>${fechaRegistro}</td>
                <td>${ultimoAcceso}</td>
                <td>
                    <span class="badge-estado activo">
                        <i class="fas fa-circle"></i> Activo
                    </span>
                </td>
                <td class="text-center">${botonesAccion}</td>
            </tr>
            `;
        }).join('');
    },

    renderStats(todosLosUsuarios) {
        document.getElementById('totalUsuarios').textContent = todosLosUsuarios.length;
        document.getElementById('totalAdmins').textContent = todosLosUsuarios.filter(u => u.role === 'admin').length;
        document.getElementById('totalEmpleados').textContent = todosLosUsuarios.filter(u => u.role !== 'admin').length;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const activosHoy = todosLosUsuarios.filter(u => {
            if (!u.last_login) return false;
            const loginDate = u.last_login.toDate();
            loginDate.setHours(0, 0, 0, 0);
            return loginDate.getTime() === hoy.getTime();
        }).length;

        document.getElementById('activosHoy').textContent = activosHoy;
    },

    renderPagination(paginaActual, totalFiltrados, usuariosPorPagina) {
        const totalPaginas = Math.ceil(totalFiltrados / usuariosPorPagina);
        document.getElementById('paginationInfo').textContent = `Página ${paginaActual} de ${totalPaginas || 1}`;
        document.getElementById('btnPrevPage').disabled = paginaActual === 1;
        document.getElementById('btnNextPage').disabled = paginaActual === totalPaginas || totalPaginas === 0;
    },

    updateMenuRole(role) {
        const infoMessage = document.querySelector('.info-message span');
        if (infoMessage) {
            if (role === 'admin') {
                infoMessage.textContent = 'Administra los usuarios del sistema, sus roles y accesos granulares.';
            } else {
                infoMessage.innerHTML = '<strong>Modo solo lectura:</strong> Solo los administradores pueden editar usuarios y permisos.';
            }
        }
    },

    applyRolePreset(rol) {
        const badge = document.getElementById('badgeRolPreset');
        const adminNotice = document.getElementById('permissionsAdminNotice');
        const checkboxes = document.querySelectorAll('.perm-checkbox');

        if (badge) {
            badge.className = `badge-preset ${rol || ''}`;
            if (rol === 'admin') {
                badge.textContent = '🛡️ Superusuario (Acceso Total)';
            } else if (rol === 'empleado') {
                badge.textContent = '💼 Empleado Base (Ventas)';
            } else if (rol === 'personalizado') {
                badge.textContent = '⚙️ Configuración Personalizada';
            } else {
                badge.textContent = 'Selecciona un rol';
            }
        }

        if (rol === 'admin') {
            checkboxes.forEach(cb => {
                cb.checked = true;
                cb.disabled = true;
            });
            if (adminNotice) adminNotice.style.display = 'flex';
        } else if (rol === 'empleado') {
            const defaultPerms = ROLE_PRESETS.empleado;
            checkboxes.forEach(cb => {
                cb.disabled = false;
                cb.checked = defaultPerms.includes(cb.value);
            });
            if (adminNotice) adminNotice.style.display = 'none';
        } else if (rol === 'personalizado') {
            checkboxes.forEach(cb => {
                cb.disabled = false;
            });
            if (adminNotice) adminNotice.style.display = 'none';
        } else {
            checkboxes.forEach(cb => {
                cb.disabled = false;
                cb.checked = false;
            });
            if (adminNotice) adminNotice.style.display = 'none';
        }
    },

    setPermissions(permissionsArray = []) {
        const checkboxes = document.querySelectorAll('.perm-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = permissionsArray.includes(cb.value);
        });
    },

    getPermissions() {
        const selected = [];
        document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
            selected.push(cb.value);
        });
        return selected;
    },

    selectAllPermissions(select = true) {
        const checkboxes = document.querySelectorAll('.perm-checkbox:not(:disabled)');
        checkboxes.forEach(cb => {
            cb.checked = select;
        });
    },

    syncHierarchy(changedCheckbox) {
        if (!changedCheckbox) return;
        const cbVer = document.getElementById('perm_ver_productos');
        const cbGestionar = document.getElementById('perm_gestionar_productos');

        if (changedCheckbox.value === 'gestionar_productos' && changedCheckbox.checked) {
            // Si puede gestionar productos, obligatoriamente debe poder verlos
            if (cbVer) cbVer.checked = true;
        } else if (changedCheckbox.value === 'ver_productos' && !changedCheckbox.checked) {
            // Si no puede ver productos, es imposible que los gestione
            if (cbGestionar) cbGestionar.checked = false;
        }
    },

    openUserModal(modoEdicion, usuario = null) {
        const form = document.getElementById('usuarioForm');
        form.reset();
        this.clearErrors();

        const titleText = document.getElementById('modalTitleText');
        const btnText = document.getElementById('btnGuardarText');
        const seccionPassword = document.getElementById('seccionPassword');
        const inputEmail = document.getElementById('inputEmail');
        const inputRol = document.getElementById('inputRol');

        if (modoEdicion) {
            titleText.innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario y Permisos';
            btnText.textContent = 'Actualizar Usuario';
            seccionPassword.style.display = 'none';
            document.getElementById('inputPassword').required = false;
            document.getElementById('inputConfirmPassword').required = false;

            document.getElementById('inputNombre').value = usuario.nombre || usuario.name || usuario.first_name || '';
            inputEmail.value = usuario.email || '';
            inputEmail.readOnly = true;
            inputEmail.style.backgroundColor = '#f5f5f5';
            inputEmail.style.cursor = 'not-allowed';
            inputEmail.title = 'El email no se puede modificar por seguridad';

            const userRole = usuario.role || 'empleado';
            inputRol.value = userRole;

            this.applyRolePreset(userRole);

            // Si el usuario ya tiene permisos guardados en Firestore, asignarlos
            if (Array.isArray(usuario.permissions)) {
                if (userRole !== 'admin') {
                    this.setPermissions(usuario.permissions);
                }
            } else if (userRole === 'empleado') {
                this.setPermissions(ROLE_PRESETS.empleado);
            }
        } else {
            titleText.innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Usuario';
            btnText.textContent = 'Crear Usuario';
            seccionPassword.style.display = 'block';
            document.getElementById('inputPassword').required = true;
            document.getElementById('inputConfirmPassword').required = true;

            inputEmail.readOnly = false;
            inputEmail.disabled = false;
            inputEmail.style.backgroundColor = '';
            inputEmail.style.cursor = '';
            inputEmail.title = '';

            inputRol.value = 'empleado';
            this.applyRolePreset('empleado');
        }

        ModalUI.open('usuarioModal');
    },

    initModal() {
        ModalUI.bind('usuarioModal', {
            form: 'usuarioForm',
            onClose: () => this.clearErrors()
        });
    },

    closeUserModal() {
        ModalUI.close('usuarioModal', true);
        this.clearErrors();
    },

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
    },

    setLoading(btnId, isLoading, textLoading, textOriginal) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin"></i> ${textLoading}` : textOriginal;
    },

    formatDate(date) {
        if (!date) return 'N/A';
        return date.toLocaleDateString('es-ES', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
};