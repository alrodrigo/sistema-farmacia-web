// public/js/controllers/usuarios.js
import { UsuarioService } from '../services/usuario.service.js';
import { UsuarioUI } from '../ui/usuario.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;
let todosLosUsuarios = [];
let usuariosFiltrados = [];
let paginaActual = 1;
const usuariosPorPagina = 10;
let modoEdicion = false;
let usuarioEditandoId = null;

const auth = window.firebaseAuth;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 🛡️ El Guardián valida sesión, restringe ruta exclusiva a admin y llena el Navbar
        currentUser = await AuthGuard.protect();

        UsuarioUI.updateMenuRole(currentUser.role);
        setupEventListeners();
        await cargarUsuarios();
    } catch (error) {
        console.warn('Ejecución detenida por AuthGuard:', error);
    }
});

function setupEventListeners() {
    // Logout centralizado con el Guardián
    document.getElementById('btnLogout')?.addEventListener('click', () => AuthGuard.logout());

    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', () => {
            if (currentUser?.role !== 'admin') {
                Toast.warning('Solo los administradores pueden crear usuarios');
                return;
            }
            modoEdicion = false;
            usuarioEditandoId = null;
            UsuarioUI.openUserModal(false);
        });
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
    window.enviarCorreoRecuperacion = (email) => enviarCorreoRecuperacionHandler(email);
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
        Toast.error('Error al cargar usuarios. Por favor, recarga la página.');
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
    if (event) event.preventDefault();
    if (!validarFormulario()) return;

    UsuarioUI.setLoading('btnGuardar', true, 'Guardando...', '<i class="fas fa-save"></i> Guardando...');

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
            Toast.success('Usuario actualizado correctamente');
            UsuarioUI.closeUserModal();
            await cargarUsuarios();
        } else {
            const password = document.getElementById('inputPassword').value;
            console.log('🚀 Creando nuevo usuario...', { nombre, email, rol });
            await UsuarioService.create({
                name: nombre,
                email: email,
                password: password,
                role: rol
            });
            Toast.success(`Usuario "${nombre}" creado exitosamente`);
            UsuarioUI.closeUserModal();
            await cargarUsuarios();
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        let msg = 'Error al guardar el usuario: ' + (error.message || error);
        if (error.code === 'auth/email-already-in-use') {
            msg = 'Este correo electrónico ya está registrado en Firebase.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'El formato del correo electrónico es inválido.';
        }
        Toast.error(msg);
    } finally {
        UsuarioUI.setLoading('btnGuardar', false, '', '<i class="fas fa-save"></i> <span id="btnGuardarText">' + (modoEdicion ? 'Actualizar Usuario' : 'Crear Usuario') + '</span>');
    }
}

function validarFormulario() {
    UsuarioUI.clearErrors();
    const errores = [];

    const nombre = document.getElementById('inputNombre').value.trim();
    if (!nombre || nombre.length < 2) {
        document.getElementById('errorNombre').textContent = 'Nombre inválido (mínimo 2 letras)';
        errores.push('Nombre: mínimo 2 caracteres');
    }

    if (!modoEdicion) {
        const email = document.getElementById('inputEmail').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('errorEmail').textContent = 'Email requerido o inválido';
            errores.push('Email: formato inválido');
        }

        const password = document.getElementById('inputPassword').value;
        const confirmPassword = document.getElementById('inputConfirmPassword').value;
        if (!password || password.length < 6) {
            document.getElementById('errorPassword').textContent = 'Mínimo 6 caracteres';
            errores.push('Contraseña: mínimo 6 caracteres');
        }
        if (password !== confirmPassword) {
            const errConfirm = document.getElementById('errorConfirmPassword');
            if (errConfirm) errConfirm.textContent = 'Las contraseñas no coinciden';
            errores.push('Contraseñas no coinciden');
        }
    }

    const rol = document.getElementById('inputRol').value;
    if (!rol || (rol !== 'admin' && rol !== 'empleado')) {
        document.getElementById('errorRol').textContent = 'Selecciona un rol válido';
        errores.push('Rol: selecciona Administrador o Empleado');
    }

    if (errores.length > 0) {
        Toast.warning('Por favor completa todos los campos requeridos correctamente');
        return false;
    }

    return true;
}

function editarUsuarioHandler(id) {
    if (currentUser.role !== 'admin') {
        Toast.warning('Solo los administradores pueden editar usuarios');
        return;
    }
    const usuario = todosLosUsuarios.find(u => u.id === id);
    if (!usuario) {
        Toast.error('Usuario no encontrado');
        return;
    }

    modoEdicion = true;
    usuarioEditandoId = id;
    UsuarioUI.openUserModal(true, usuario);
}

async function enviarCorreoRecuperacionHandler(email) {
    if (currentUser.role !== 'admin') {
        Toast.warning('Solo los administradores pueden enviar correos de recuperación');
        return;
    }

    if (!email) {
        Toast.warning('Este usuario no tiene un correo electrónico válido registrado');
        return;
    }

    const confirmar = await ConfirmDialog.show(
        'Enviar Correo de Recuperación',
        `¿Deseas enviar un enlace de restablecimiento a:\n📧 ${email}?\n\nEl usuario podrá definir su contraseña de forma segura.`,
        'warning',
        'Enviar Correo'
    );
    if (!confirmar) return;

    try {
        await UsuarioService.sendPasswordResetEmail(email);
        Toast.success(`Correo de recuperación enviado a ${email}`);
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
        Toast.error(`Error al enviar el correo: ${error.message || error}`);
    }
}

async function eliminarUsuarioHandler(id, nombre) {
    if (currentUser.role !== 'admin') {
        Toast.warning('Solo los administradores pueden eliminar usuarios');
        return;
    }
    if (id === currentUser.uid) {
        Toast.warning('No puedes eliminar tu propia cuenta');
        return;
    }

    const confirmado = await ConfirmDialog.show(
        `Eliminar a "${nombre}"`,
        'La cuenta de este usuario será eliminada del sistema.\nEsta acción no se puede deshacer.',
        'danger',
        'Sí, eliminar'
    );
    if (!confirmado) return;

    try {
        await UsuarioService.delete(id);
        Toast.success(`Usuario "${nombre}" eliminado correctamente`);
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al eliminar:', error);
        Toast.error('Error al eliminar el usuario');
    }
}