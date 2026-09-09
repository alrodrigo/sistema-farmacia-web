// public/js/ui/usuario.ui.js
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
                    <button class="btn-action btn-edit" onclick="window.editarUsuario('${usuario.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-password" onclick="window.enviarCorreoRecuperacion('${usuario.email}')" title="Enviar correo de recuperación">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="window.eliminarUsuario('${usuario.id}', '${usuario.name || usuario.email}')" title="Eliminar" ${deleteDisabled}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : `<span class="text-muted">Solo lectura</span>`;

            const nombreVisual = usuario.nombre || usuario.name || usuario.first_name || usuario.email?.split('@')[0] || 'Sin nombre';

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
                    <span class="badge-rol ${usuario.role}">
                        <i class="fas fa-${usuario.role === 'admin' ? 'user-shield' : 'user-tag'}"></i>
                        ${usuario.role === 'admin' ? 'Administrador' : 'Empleado'}
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
        document.getElementById('totalEmpleados').textContent = todosLosUsuarios.filter(u => u.role === 'empleado').length;

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
                infoMessage.textContent = 'Administra los usuarios del sistema, sus roles y accesos.';
            } else {
                infoMessage.innerHTML = '<strong>Modo solo lectura:</strong> Solo los administradores pueden editar usuarios.';
            }
        }
    },

    renderRolePermissions(rol) {
        const infoRol = document.getElementById('infoRol');
        if (!infoRol) return;

        if (rol === 'admin') {
            infoRol.innerHTML = `
                <i class="fas fa-user-shield"></i>
                <div>
                    <strong>Permisos de Administrador</strong>
                    <p>Acceso completo al sistema:</p>
                    <ul>
                        <li>Gestionar productos y categorías</li>
                        <li>Realizar y consultar ventas</li>
                        <li>Ver reportes y exportar datos</li>
                        <li>Administrar usuarios del sistema</li>
                    </ul>
                </div>
            `;
        } else if (rol === 'empleado') {
            infoRol.innerHTML = `
                <i class="fas fa-user-tag"></i>
                <div>
                    <strong>Permisos de Empleado</strong>
                    <p>Acceso limitado al sistema:</p>
                    <ul>
                        <li>Realizar ventas</li>
                        <li>Consultar productos</li>
                        <li>Ver reportes de ventas</li>
                        <li>No puede modificar productos ni usuarios</li>
                    </ul>
                </div>
            `;
        } else {
            infoRol.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <div><strong>Selecciona un rol para ver los permisos</strong></div>
            `;
        }
    },

    openUserModal(modoEdicion, usuario = null) {
        const modal = document.getElementById('usuarioModal');
        const form = document.getElementById('usuarioForm');
        form.reset();
        this.clearErrors();

        const titleText = document.getElementById('modalTitleText');
        const btnText = document.getElementById('btnGuardarText');
        const seccionPassword = document.getElementById('seccionPassword');
        const inputEmail = document.getElementById('inputEmail');

        if (modoEdicion) {
            titleText.innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
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

            document.getElementById('inputRol').value = usuario.role || '';
            this.renderRolePermissions(usuario.role);
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
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeUserModal() {
        document.getElementById('usuarioModal').classList.remove('active');
        document.body.style.overflow = 'auto';
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