// public/js/controllers/categorias.js (El Controlador Modular)
import { CategoriaService } from '../services/categoria.service.js';
import { CategoriaUI } from '../ui/categoria.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let categoriasGlobal = [];
let currentUser = null;
// 1. Inicialización limpia: El Guardián protege, valida y llena el Navbar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await AuthGuard.protect();
        setupEventListeners();
        await refreshData();
    } catch (error) {
        // Si no tiene permisos o no está logueado, AuthGuard ya lo redirigió
        console.warn("Ejecución detenida por AuthGuard:", error);
    }
});
function setupEventListeners() {
    // Botones del Modal de Categorías
    document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => CategoriaUI.openModal());
    document.getElementById('btnCloseModal')?.addEventListener('click', CategoriaUI.closeModal);
    document.getElementById('btnCancelar')?.addEventListener('click', CategoriaUI.closeModal);
    // Selector de color interactivo
    document.getElementById('colorCategoria')?.addEventListener('input', (e) => {
        const colorHex = document.getElementById('colorHex');
        if (colorHex) colorHex.textContent = e.target.value;
    });
    // Envío del formulario
    document.getElementById('formCategoria')?.addEventListener('submit', handleSave);
}
async function refreshData() {
    try {
        categoriasGlobal = await CategoriaService.getAll();
        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);
        // Sincronizamos estadísticas de productos sin bloquear la interfaz
        const stats = await CategoriaService.syncCounters(categoriasGlobal);
        categoriasGlobal = stats.categoriasActualizadas;
        const activas = categoriasGlobal.filter(c => c.activa !== false).length;
        CategoriaUI.updateStats(categoriasGlobal.length, activas, stats.totalProductos);
        // Refrescamos la vista con los contadores actualizados
        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);
    } catch (error) {
        console.error("Error cargando el módulo de categorías:", error);
        Toast.error("Error al cargar categorías");
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
        await refreshData();
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        Toast.error('Error al guardar la categoría');
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
        await refreshData();
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        Toast.error('Error al eliminar la categoría');
    }
}
