// public/js/proveedores.js
import { ProveedorService } from './services/proveedor.service.js';
import { ProveedorUI } from './ui/proveedor.ui.js';

let proveedoresGlobal = [];
let currentUser = null;
const auth = window.firebaseAuth;
const db = window.firebaseDB;

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUser = { uid: user.uid, ...userDoc.data() };

                    if (currentUser.role !== 'admin') {
                        alert('⚠️ Solo administradores pueden gestionar proveedores');
                        window.location.href = 'dashboard.html';
                        return;
                    }

                    document.getElementById('userName').textContent = currentUser.name || user.email;
                    document.getElementById('userRole').textContent = 'Administrador';

                    setupEventListeners();
                    await refreshData();
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error("Error validando usuario", error);
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filtroEstado').addEventListener('change', applyFilters);
    document.getElementById('filtroPais').addEventListener('change', applyFilters);
    document.getElementById('formProveedor').addEventListener('submit', handleSave);

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
        alert("Hubo un problema al cargar los proveedores.");
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
        return alert('⚠️ El nombre debe tener entre 2 y 100 caracteres');
    }

    const nombreDuplicado = proveedoresGlobal.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== id);
    if (nombreDuplicado) return alert('⚠️ Ya existe un proveedor con este nombre');

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('⚠️ Email inválido');

    if (telefono) {
        const telLimpio = telefono.replace(/[\s\-\(\)]/g, '');
        if (telLimpio.length < 7 || telLimpio.length > 15) return alert('⚠️ El teléfono debe tener entre 7 y 15 dígitos');
    }

    if (sitioWeb) {
        try { new URL(sitioWeb); }
        catch (e) { return alert('⚠️ URL inválida (Ej: https://www.ejemplo.com)'); }
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
        alert(id ? '✅ Proveedor actualizado' : '✅ Proveedor creado');
        ProveedorUI.closeModal();
        await refreshData();
    } catch (error) {
        console.error("Error guardando:", error);
        alert("❌ Error al guardar el proveedor.");
    } finally {
        ProveedorUI.setLoading(false);
    }
}

async function handleDelete(id, nombre) {
    const prov = proveedoresGlobal.find(p => p.id === id);
    let msg = `¿Seguro que deseas eliminar "${nombre}"?`;
    if (prov && (prov.total_productos > 0 || prov.productosCount > 0)) {
        msg += `\n\n⚠️ Tiene productos asociados que quedarán sin proveedor.`;
    }

    if (confirm(msg)) {
        try {
            await ProveedorService.delete(id);
            alert('✅ Proveedor eliminado');
            await refreshData();
        } catch (error) {
            console.error("Error eliminando:", error);
            alert("❌ Error al eliminar proveedor.");
        }
    }
}