// public/js/controllers/proveedores.js
import { ProveedorService } from '../services/proveedor.service.js';
import { ProveedorUI } from '../ui/proveedor.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let proveedoresGlobal = [];
let currentUser = null;

// 1. Inicialización protegida por el Guardián
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 🛡️ Valida sesión, protege ruta exclusiva de admin y llena el Navbar
        currentUser = await AuthGuard.protect();

        setupEventListeners();
        await refreshData();
    } catch (error) {
        console.warn("Ejecución detenida por AuthGuard:", error);
    }
});

function setupEventListeners() {
    // Logout centralizado con el Guardián
    document.getElementById('btnLogout')?.addEventListener('click', () => AuthGuard.logout());

    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.getElementById('filtroEstado')?.addEventListener('change', applyFilters);
    document.getElementById('filtroPais')?.addEventListener('change', applyFilters);
    document.getElementById('formProveedor')?.addEventListener('submit', handleSave);

    // Sidebar toggle (si existe en el HTML actual)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', e => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    // Exponer funciones globales para los onclick del HTML inyectado
    window.abrirModalNuevo = () => ProveedorUI.openModal();
    window.cerrarModal = () => ProveedorUI.closeModal();
    window.editarProveedor = (id) => {
        const prov = proveedoresGlobal.find(p => p.id === id);
        if (prov) ProveedorUI.openModal(prov);
    };
    window.confirmarEliminar = (id, nombre) => handleDelete(id, nombre);
}

async function refreshData() {
    try {
        proveedoresGlobal = await ProveedorService.getAll();
        ProveedorUI.renderFilters(proveedoresGlobal);
        ProveedorUI.renderStats(proveedoresGlobal);
        applyFilters();
    } catch (error) {
        console.error("Error cargando proveedores:", error);
        Toast.error("Hubo un problema al cargar los proveedores.");
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const estadoFiltro = document.getElementById('filtroEstado').value;
    const paisFiltro = document.getElementById('filtroPais').value;

    const filtrados = proveedoresGlobal.filter(prov => {
        const matchSearch = prov.nombre.toLowerCase().includes(searchTerm) ||
            (prov.pais && prov.pais.toLowerCase().includes(searchTerm)) ||
            (prov.email && prov.email.toLowerCase().includes(searchTerm));

        const matchEstado = estadoFiltro === 'todos' ||
            (estadoFiltro === 'activo' && prov.activo !== false) ||
            (estadoFiltro === 'inactivo' && prov.activo === false);

        const matchPais = paisFiltro === 'todos' || prov.pais === paisFiltro;

        return matchSearch && matchEstado && matchPais;
    });

    ProveedorUI.renderGrid(filtrados);
}

async function handleSave(e) {
    e.preventDefault();

    const id = document.getElementById('proveedorId').value;
    const nombre = document.getElementById('inputNombre').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const telefono = document.getElementById('inputTelefono').value.trim();
    const sitioWeb = document.getElementById('inputSitioWeb').value.trim();

    // Validaciones
    if (nombre.length < 2 || nombre.length > 100) {
        Toast.warning('El nombre debe tener entre 2 y 100 caracteres');
        return;
    }

    const nombreDuplicado = proveedoresGlobal.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== id);
    if (nombreDuplicado) {
        Toast.warning('Ya existe un proveedor con este nombre');
        return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Toast.warning('Email inválido');
        return;
    }

    if (telefono) {
        const telLimpio = telefono.replace(/[\s\-\(\)]/g, '');
        if (telLimpio.length < 7 || telLimpio.length > 15) {
            Toast.warning('El teléfono debe tener entre 7 y 15 dígitos');
            return;
        }
    }

    if (sitioWeb) {
        try { new URL(sitioWeb); }
        catch (e) {
            Toast.warning('URL inválida (Ej: https://www.ejemplo.com)');
            return;
        }
    }

    const data = {
        nombre,
        pais: document.getElementById('inputPais').value.trim() || null,
        telefono: telefono || null,
        email: email || null,
        direccion: document.getElementById('inputDireccion').value.trim() || null,
        sitioWeb: sitioWeb || null,
        notas: document.getElementById('inputNotas').value.trim() || null,
        activo: document.getElementById('inputActivo').checked
    };

    try {
        ProveedorUI.setLoading(true);
        await ProveedorService.save(id, data, currentUser.uid);
        Toast.success(id ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente');
        ProveedorUI.closeModal();
        await refreshData();
    } catch (error) {
        console.error("Error guardando:", error);
        Toast.error("Error al guardar el proveedor.");
    } finally {
        ProveedorUI.setLoading(false);
    }
}

async function handleDelete(id, nombre) {
    const prov = proveedoresGlobal.find(p => p.id === id);
    let msg = 'Esta acción eliminará el proveedor del sistema.';
    if (prov && (prov.total_productos > 0 || prov.productosCount > 0)) {
        msg += '\n\n⚠️ Tiene productos asociados que quedarán sin proveedor.';
    }

    const confirmado = await ConfirmDialog.show(
        `Eliminar "${nombre}"`,
        msg,
        'danger',
        'Sí, eliminar'
    );
    if (!confirmado) return;

    try {
        await ProveedorService.delete(id);
        Toast.success('Proveedor eliminado exitosamente');
        await refreshData();
    } catch (error) {
        console.error("Error eliminando:", error);
        Toast.error("Error al eliminar el proveedor.");
    }
}