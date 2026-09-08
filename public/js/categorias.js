// public/js/categorias.js (El Controlador)
import { CategoriaService } from './services/categoria.service.js';
import { CategoriaUI } from './ui/categoria.ui.js';

let categoriasGlobal = [];
const auth = window.firebaseAuth;
const db = window.firebaseDB;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificamos la sesión y protegemos la ruta antes de cargar nada
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();

                    // Expulsar si no es administrador
                    if (userData.role !== 'admin') {
                        alert('⚠️ Solo administradores pueden gestionar categorías');
                        window.location.href = 'dashboard.html';
                        return;
                    }

                    // Actualizar el Navbar (quitamos el "Cargando...")
                    document.getElementById('userName').textContent = userData.nombre;
                    document.getElementById('userRole').textContent = 'Administrador';

                    // 2. Sesión válida: Inicializamos el módulo de categorías
                    setupEventListeners();
                    await refreshData();
                } else {
                    window.location.href = 'index.html'; // No existe en base de datos
                }
            } catch (error) {
                console.error("Error validando usuario", error);
            }
        } else {
            window.location.href = 'index.html'; // No hay sesión activa
        }
    });
});
function setupEventListeners() {
    document.getElementById('btnNuevaCategoria').addEventListener('click', () => CategoriaUI.openModal());
    document.getElementById('btnCloseModal').addEventListener('click', CategoriaUI.closeModal);
    document.getElementById('btnCancelar').addEventListener('click', CategoriaUI.closeModal);

    document.getElementById('colorCategoria').addEventListener('input', (e) => {
        document.getElementById('colorHex').textContent = e.target.value;
    });

    document.getElementById('formCategoria').addEventListener('submit', handleSave);
}

async function refreshData() {
    try {
        categoriasGlobal = await CategoriaService.getAll();
        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);

        // Sincronizamos estadísticas de forma asíncrona sin bloquear la UI
        const stats = await CategoriaService.syncCounters(categoriasGlobal);
        categoriasGlobal = stats.categoriasActualizadas;

        const activas = categoriasGlobal.filter(c => c.activa !== false).length;
        CategoriaUI.updateStats(categoriasGlobal.length, activas, stats.totalProductos);

        // Refrescamos la vista final con los contadores correctos
        CategoriaUI.renderGrid(categoriasGlobal, handleEdit, handleDelete);
    } catch (error) {
        console.error("Error cargando el módulo de categorías", error);
    }
}

async function handleSave(e) {
    e.preventDefault();
    const data = CategoriaUI.getFormData();
    if (!data) return; // Falló la validación

    // Prevenir duplicados
    const existe = categoriasGlobal.find(c => c.nombre.toLowerCase() === data.nombre.toLowerCase() && c.id !== data.id);
    if (existe) {
        alert('Ya existe una categoría con ese nombre');
        return;
    }

    try {
        if (data.id) {
            const { id, ...updateData } = data;
            await CategoriaService.update(id, updateData);
            alert('✅ Categoría actualizada');
        } else {
            const { id, ...createData } = data;
            await CategoriaService.create(createData);
            alert('✅ Categoría creada');
        }
        CategoriaUI.closeModal();
        await refreshData();
    } catch (error) {
        alert('Error al guardar la categoría');
    }
}

function handleEdit(id) {
    const categoria = categoriasGlobal.find(c => c.id === id);
    if (categoria) CategoriaUI.openModal(categoria);
}

async function handleDelete(id, nombre) {
    if (!confirm(`¿Eliminar definitivamente "${nombre}"?\nSus productos quedarán sin categoría.`)) return;

    try {
        await CategoriaService.delete(id);
        alert('✅ Categoría eliminada');
        await refreshData();
    } catch (error) {
        alert('Error al eliminar');
    }
}