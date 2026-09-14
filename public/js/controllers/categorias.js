// public/js/controllers/categorias.js
import { CategoriaService } from '../services/categoria.service.js';
import { CategoriaUI } from '../ui/categoria.ui.js';
import { ModalUI } from '../ui/modal.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';
import { ErrorHandler } from '../utils/error-handler.js';

let categoriasGlobal = [];
let currentUser = null;

// Inicialización limpia protegida por AuthGuard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await AuthGuard.protect();
        setupEventListeners();
        await refreshData();
    } catch (error) {
        console.warn("Ejecución detenida por AuthGuard:", error);
    }
});

function setupEventListeners() {
    ModalUI.bind('modalCategoria', {
        form: 'formCategoria'
    });

    document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => CategoriaUI.openModal());

    // Selector interactivo de color
    document.getElementById('colorCategoria')?.addEventListener('input', (e) => {
        const colorHex = document.getElementById('colorHex');
        if (colorHex) colorHex.textContent = e.target.value;
    });

    // Envío del formulario
    document.getElementById('formCategoria')?.addEventListener('submit', handleSave);

    // Filtros y búsqueda en tiempo real
    document.getElementById('searchInputCategorias')?.addEventListener('input', aplicarFiltrosYRenderizar);
    document.getElementById('filterEstadoCategorias')?.addEventListener('change', aplicarFiltrosYRenderizar);
    document.getElementById('sortCategorias')?.addEventListener('change', aplicarFiltrosYRenderizar);
}

function aplicarFiltrosYRenderizar() {
    const searchVal = document.getElementById('searchInputCategorias')?.value.trim().toLowerCase() || '';
    const estadoVal = document.getElementById('filterEstadoCategorias')?.value || 'todas';
    const sortVal = document.getElementById('sortCategorias')?.value || 'nombre_asc';

    let filtradas = [...categoriasGlobal];

    // 1. Búsqueda por texto (nombre o descripción)
    if (searchVal) {
        filtradas = filtradas.filter(c =>
            (c.nombre && c.nombre.toLowerCase().includes(searchVal)) ||
            (c.descripcion && c.descripcion.toLowerCase().includes(searchVal))
        );
    }

    // 2. Filtro por estado
    if (estadoVal === 'activas') {
        filtradas = filtradas.filter(c => c.activa !== false);
    } else if (estadoVal === 'inactivas') {
        filtradas = filtradas.filter(c => c.activa === false);
    }

    // 3. Ordenación
    if (sortVal === 'nombre_asc') {
        filtradas.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    } else if (sortVal === 'nombre_desc') {
        filtradas.sort((a, b) => (b.nombre || '').localeCompare(a.nombre || ''));
    } else if (sortVal === 'productos_desc') {
        filtradas.sort((a, b) => (b.productosCount || 0) - (a.productosCount || 0));
    } else if (sortVal === 'productos_asc') {
        filtradas.sort((a, b) => (a.productosCount || 0) - (b.productosCount || 0));
    }

    CategoriaUI.renderGrid(filtradas, handleEdit, handleDelete, categoriasGlobal.length, resetFiltros);
}

function resetFiltros() {
    const searchInput = document.getElementById('searchInputCategorias');
    const filterEstado = document.getElementById('filterEstadoCategorias');
    const sort = document.getElementById('sortCategorias');
    if (searchInput) searchInput.value = '';
    if (filterEstado) filterEstado.value = 'todas';
    if (sort) sort.value = 'nombre_asc';
    aplicarFiltrosYRenderizar();
}

async function refreshData(forceRefresh = false) {
    try {
        categoriasGlobal = await CategoriaService.getAll(forceRefresh);
        aplicarFiltrosYRenderizar();

        // Sincronizar contadores de productos en segundo plano
        const stats = await CategoriaService.syncCounters(categoriasGlobal);
        categoriasGlobal = stats.categoriasActualizadas;
        const activas = categoriasGlobal.filter(c => c.activa !== false).length;
        CategoriaUI.updateStats(categoriasGlobal.length, activas, stats.totalProductos);

        aplicarFiltrosYRenderizar();
    } catch (error) {
        ErrorHandler.handle(error, 'al cargar categorías');
    }
}

async function handleSave(e) {
    e.preventDefault();
    const data = CategoriaUI.getFormData();
    if (!data) return;

    // Prevenir nombres duplicados
    const existe = categoriasGlobal.find(c =>
        c.nombre.toLowerCase() === data.nombre.toLowerCase() && c.id !== data.id
    );
    if (existe) {
        Toast.warning('Ya existe una categoría con ese nombre');
        return;
    }

    try {
        if (data.id) {
            const { id, ...updateData } = data;
            await CategoriaService.update(id, updateData);
            Toast.success('Categoría actualizada exitosamente');
        } else {
            const { id, ...createData } = data;
            await CategoriaService.create(createData);
            Toast.success('Categoría creada exitosamente');
        }
        CategoriaUI.closeModal();
        await refreshData(true);
    } catch (error) {
        ErrorHandler.handle(error, 'al guardar categoría');
    }
}

function handleEdit(id) {
    const categoria = categoriasGlobal.find(c => c.id === id);
    if (categoria) CategoriaUI.openModal(categoria);
}

async function handleDelete(id, nombre) {
    const confirmado = await ConfirmDialog.show(
        `Eliminar "${nombre}"`,
        'Sus productos asociados quedarán sin categoría.\nEsta acción no se puede deshacer.',
        'danger',
        'Sí, eliminar'
    );
    if (!confirmado) return;

    try {
        await CategoriaService.delete(id);
        Toast.success(`Categoría "${nombre}" eliminada exitosamente`);
        await refreshData(true);
    } catch (error) {
        ErrorHandler.handle(error, 'al eliminar categoría');
    }
}
