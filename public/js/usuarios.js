// public/js/usuarios.js
import { UsuarioService } from './services/usuario.service.js';
import { UsuarioUI } from './ui/usuario.ui.js';

let currentUser = null;
let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let modoEdicion = false;
let usuarioEditandoId = null;

const auth = window.firebaseAuth;
const db = window.firebaseDB;

document.addEventListener('DOMContentLoaded', async () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };

                    const displayName = currentUser.nombre || currentUser.name || currentUser.first_name || currentUser.email?.split('@')[0] || 'Usuario';
                    const userNameEl = document.getElementById('userName');
                    const userRoleEl = document.getElementById('userRole');

                    if (userNameEl) userNameEl.textContent = displayName;
                    if (userRoleEl) userRoleEl.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Empleado';

                    UsuarioUI.updateMenuRole(currentUser.role);

                    if (typeof window.aplicarRestriccionesMenu === 'function') {
                        window.aplicarRestriccionesMenu(currentUser);
                    }

                    setupEventListeners();
                    await cargarUsuarios();
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Error al validar usuario:', error);
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', () => { window.location.href = 'crear-usuarios.html'; });
    }

    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', () => UsuarioUI.closeUserModal());
    if (btnCancelar) btnCancelar.addEventListener('click', () => UsuarioUI.closeUserModal());

    const modal = document.getElementById('usuarioModal');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) UsuarioUI.closeUserModal(); });
    }

    const usuarioForm = document.getElementById('usuarioForm');
    if (usuarioForm) usuarioForm.addEventListener('submit', guardarUsuario);

    const inputRol = document.getElementById('inputRol');
    if (inputRol) {
        inputRol.addEventListener('change', () => {
            UsuarioUI.renderRolePermissions(inputRol.value);
        });
    }

    const btnTogglePassword = document.getElementById('btnTogglePassword');
    if (btnTogglePassword) {
        btnTogglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('inputPassword');
            const icon = btnTogglePassword.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    const btnCerrarPasswordModal = document.getElementById('btnCerrarPasswordModal');
    const btnCancelarPassword = document.getElementById('btnCancelarPassword');
    if (btnCerrarPasswordModal) btnCerrarPasswordModal.addEventListener('click', () => UsuarioUI.closePasswordModal());
    if (btnCancelarPassword) btnCancelarPassword.addEventListener('click', () => UsuarioUI.closePasswordModal());

    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => { if (e.target === passwordModal) UsuarioUI.closePasswordModal(); });
    }

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) passwordForm.addEventListener('submit', cambiarPassword);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', aplicarFiltros);

    const filterRol = document.getElementById('filterRol');
    if (filterRol) filterRol.addEventListener('change', aplicarFiltros);

    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual--;
                actualizarVistaTabla();
            }
        });
    }
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPaginas = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
            if (paginaActual < totalPaginas) {
                paginaActual++;
                actualizarVistaTabla();
            }
        });
    }

    // Exponer funciones globales requeridas por el renderizado de HTML de la tabla
    window.editarUsuario = (id) => editarUsuarioHandler(id);
    window.abrirModalPassword = (id) => abrirModalPasswordHandler(id);
    window.eliminarUsuario = (id, nombre) => eliminarUsuarioHandler(id, nombre);
    window.abrirModalNuevo = () => {
        modoEdicion = false;
        usuarioEditandoId = null;
        UsuarioUI.openUserModal(false);
    };
}

async function cargarUsuarios() {
    try {
        todosLosUsuarios = await UsuarioService.getAll();
        usuariosFiltrados = [...todosLosUsuarios];
        actualizarVistaTabla();
        UsuarioUI.renderStats(todosLosUsuarios);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        alert('Error al cargar usuarios. Por favor, recarga la página.');
    }
}

function actualizarVistaTabla() {
    UsuarioUI.renderTable(usuariosFiltrados, paginaActual, usuariosPorPagina, currentUser.uid, currentUser.role);
    UsuarioUI.renderPagination(paginaActual, usuariosFiltrados.length, usuariosPorPagina);
}

function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterRol = document.getElementById('filterRol').value;

    usuariosFiltrados = todosLosUsuarios.filter(usuario => {
        const coincideBusqueda = !searchTerm ||
            (usuario.name && usuario.name.toLowerCase().includes(searchTerm)) ||
            usuario.email.toLowerCase().includes(searchTerm);

        const coincideRol = !filterRol || usuario.role === filterRol;
        return coincideBusqueda && coincideRol;
    });

    paginaActual = 1;
    actualizarVistaTabla();
}

async function guardarUsuario(event) {
    event.preventDefault();
    if (!validarFormulario()) return;

    UsuarioUI.setLoading('btnGuardar', true, 'Guardando...', '<i class="fas fa-save"></i> Guardar');

    try {
        const nombre = document.getElementById('inputNombre').value.trim();
        const email = document.getElementById('inputEmail').value.trim().toLowerCase();
        const rol = document.getElementById('inputRol').value;

        if (modoEdicion) {
            await UsuarioService.update(usuarioEditandoId, {
                nombre: nombre,
                name: nombre,
                role: rol
            });
            alert('✅ Usuario actualizado correctamente');
            UsuarioUI.closeUserModal();
            await cargarUsuarios();
        } else {
            const password = document.getElementById('inputPassword').value;
            alert(`📋 SOLICITUD DE NUEVO USUARIO\n\nContacta al administrador con:\n👤 ${nombre}\n📧 ${email}\n🔑 ${password}\n👔 ${rol}`);
            UsuarioUI.closeUserModal();
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('❌ Error al guardar el usuario.');
    } finally {
        UsuarioUI.setLoading('btnGuardar', false, '', '<i class="fas fa-save"></i> Guardar');
    }
}

function validarFormulario() {
    UsuarioUI.clearErrors();
    let esValido = true;

    const nombre = document.getElementById('inputNombre').value.trim();
    if (!nombre || nombre.length < 3 || nombre.length > 100 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
        document.getElementById('errorNombre').textContent = 'Nombre inválido (mínimo 3 letras, solo texto)';
        esValido = false;
    }

    if (!modoEdicion) {
        const email = document.getElementById('inputEmail').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('errorEmail').textContent = 'Email requerido o inválido';
            esValido = false;
        }

        const password = document.getElementById('inputPassword').value;
        const confirmPassword = document.getElementById('inputConfirmPassword').value;
        if (!password || password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            document.getElementById('errorPassword').textContent = 'Mínimo 6 caracteres, al menos una letra y un número';
            esValido = false;
        }
        if (password !== confirmPassword) {
            document.getElementById('errorConfirmNewPassword').textContent = 'Las contraseñas no coinciden';
            esValido = false;
        }
    }

    const rol = document.getElementById('inputRol').value;
    if (!rol || (rol !== 'admin' && rol !== 'empleado')) {
        document.getElementById('errorRol').textContent = 'Selecciona un rol válido';
        esValido = false;
    }

    return esValido;
}

function editarUsuarioHandler(id) {
    if (currentUser.role !== 'admin') {
        alert('⚠️ Solo los administradores pueden editar usuarios');
        return;
    }
    const usuario = todosLosUsuarios.find(u => u.id === id);
    if (!usuario) return alert('Usuario no encontrado');

    modoEdicion = true;
    usuarioEditandoId = id;
    UsuarioUI.openUserModal(true, usuario);
}

function abrirModalPasswordHandler(id) {
    if (currentUser.role !== 'admin') {
        alert('⚠️ Solo los administradores pueden cambiar contraseñas');
        return;
    }
    usuarioEditandoId = id;
    UsuarioUI.openPasswordModal();
}

async function cambiarPassword(event) {
    event.preventDefault();
    const newPassword = document.getElementById('inputNewPassword').value;
    const confirmPassword = document.getElementById('inputConfirmNewPassword').value;
    UsuarioUI.clearPasswordErrors();

    if (newPassword.length < 6) {
        document.getElementById('errorNewPassword').textContent = 'Mínimo 6 caracteres';
        return;
    }
    if (newPassword !== confirmPassword) {
        document.getElementById('errorConfirmNewPassword').textContent = 'Las contraseñas no coinciden';
        return;
    }

    UsuarioUI.setLoading('btnGuardarPassword', true, 'Cambiando...', 'Cambiar');

    try {
        const user = auth.currentUser;
        if (user.uid === usuarioEditandoId) {
            try {
                await UsuarioService.updateOwnPassword(newPassword);
                alert('✅ Tu contraseña ha sido actualizada correctamente');
                UsuarioUI.closePasswordModal();
            } catch (updateError) {
                if (updateError.code === 'auth/requires-recent-login') {
                    const passwordActual = prompt('🔐 Por seguridad, ingresa tu contraseña actual:');
                    if (!passwordActual) return;
                    await UsuarioService.reauthenticateAndChangePassword(passwordActual, newPassword);
                    alert('✅ Tu contraseña ha sido actualizada correctamente');
                    UsuarioUI.closePasswordModal();
                } else {
                    throw updateError;
                }
            }
        } else {
            const usuarioACambiar = todosLosUsuarios.find(u => u.id === usuarioEditandoId);
            if (!usuarioACambiar) return;
            const confirmar = confirm(`¿Deseas enviar el correo de recuperación a ${usuarioACambiar.email}?`);
            if (!confirmar) {
                UsuarioUI.closePasswordModal();
                return;
            }
            await UsuarioService.sendPasswordResetEmail(usuarioACambiar.email);
            alert(`✅ Correo de recuperación enviado a:\n${usuarioACambiar.email}`);
            UsuarioUI.closePasswordModal();
        }
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        alert('❌ Error al cambiar la contraseña.');
    } finally {
        UsuarioUI.setLoading('btnGuardarPassword', false, '', 'Cambiar Contraseña');
    }
}

async function eliminarUsuarioHandler(id, nombre) {
    if (currentUser.role !== 'admin') {
        alert('⚠️ Solo los administradores pueden eliminar usuarios');
        return;
    }
    if (id === currentUser.uid) {
        alert('⚠️ No puedes eliminar tu propia cuenta');
        return;
    }

    if (confirm(`¿Estás seguro de eliminar al usuario:\n\n"${nombre}"?\n\n⚠️ Esta acción no se puede deshacer.`)) {
        try {
            await UsuarioService.delete(id);
            alert(`✅ Usuario "${nombre}" eliminado correctamente.`);
            await cargarUsuarios();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('❌ Error al eliminar el usuario.');
        }
    }
}