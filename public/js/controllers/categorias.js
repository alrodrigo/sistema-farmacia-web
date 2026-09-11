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
    // Vinculación automática del modal con soporte de Escape, overlay y reset
    ModalUI.bind('modalCategoria', {
        form: 'formCategoria',
        onClose: () => CategoriaUI.closeModal()
    });

    document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => CategoriaUI.openModal());

    // Selector interactivo de color
    document.getElementById('colorCategoria')?.addEventListener('input', (e) => {
        const colorHex = document.getElementById('colorHex');
        if (colorHex) colorHex.textContent = e.target.value;
    });

    // Envío del formulario
    document.getElementById('formCategoria')?.addEventListener('submit', handleSave);
}

async function refreshData(forceRefresh = false) {
    try {
        categoriasGlobal = await CategoriaService.getAll(forceRefresh);
        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);

        // Sincronizar contadores de productos en segundo plano
        const stats = await CategoriaService.syncCounters(categoriasGlobal);
        categoriasGlobal = stats.categoriasActualizadas;
        const activas = categoriasGlobal.filter(c => c.activa !== false).length;
        CategoriaUI.updateStats(categoriasGlobal.length, activas, stats.totalProductos);

        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);
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
