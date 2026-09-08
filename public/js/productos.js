// public/js/productos.js
import { ProductoService } from './services/producto.service.js';
import { ProductoUI } from './ui/producto.ui.js';

let currentUser = null;
let todosLosProductos = [];
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 10;

let categoriasMap = {};
let proveedoresMap = {};

let modoEdicion = false;
let productoEditandoId = null;

const auth = window.firebaseAuth;
const db = window.firebaseDB;

document.addEventListener('DOMContentLoaded', async () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };

                    const displayName = currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0] || 'Usuario';
                    document.getElementById('userName').textContent = displayName;
                    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Empleado';

                    if (currentUser.role === 'empleado') {
                        const btnNuevo = document.querySelector('.btn-primary');
                        if (btnNuevo && btnNuevo.textContent.includes('Nuevo Producto')) btnNuevo.style.display = 'none';
                    }

                    setupEventListeners();
                    await cargarDatosIniciales();
                } else {
                    await auth.signOut();
                    window.location.href = 'index.html';
                }
            } catch (error) {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    // === EVENTOS DEL NAVBAR Y SIDEBAR ===
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    document.querySelector('.user-menu')?.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
            auth.signOut().then(() => window.location.href = 'index.html');
        }
    });

    // === EVENTOS DE PRODUCTOS ===
    document.getElementById('btnNuevoProducto')?.addEventListener('click', () => {
        modoEdicion = false;
        productoEditandoId = null;
        ProductoUI.openModal('nuevo');
    });

    document.getElementById('btnCerrarModal')?.addEventListener('click', () => ProductoUI.closeModal());
    document.getElementById('btnCancelar')?.addEventListener('click', () => ProductoUI.closeModal());
    document.getElementById('modalOverlay')?.addEventListener('click', () => ProductoUI.closeModal());
    document.getElementById('productoForm')?.addEventListener('submit', guardarProducto);

    document.getElementById('inputCosto')?.addEventListener('input', calcularMargen);
    document.getElementById('inputPrecio')?.addEventListener('input', calcularMargen);

    document.getElementById('searchInput')?.addEventListener('input', aplicarFiltros);
    document.getElementById('filterCategoria')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filterProveedor')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filterStock')?.addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);

    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
        if (paginaActual > 1) { paginaActual--; actualizarVistaTabla(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    document.getElementById('btnNextPage')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
        if (paginaActual < totalPaginas) { paginaActual++; actualizarVistaTabla(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    setupModalesRapidos();

    // === EXPOSICIÓN GLOBAL (Corregido) ===
    window.verProducto = (id) => {
        const prod = todosLosProductos.find(p => p.id === id);
        if (prod) ProductoUI.openModal('ver', prod);
    };
    window.editarProducto = (id) => {
        const prod = todosLosProductos.find(p => p.id === id);
        if (prod) {
            modoEdicion = true;
            productoEditandoId = id;
            ProductoUI.openModal('editar', prod);
        }
    };
    window.eliminarProducto = (id, nombre) => eliminarProducto(id, nombre);
}

async function cargarDatosIniciales() {
    try {
        [categoriasMap, proveedoresMap, todosLosProductos] = await Promise.all([
            ProductoService.getCategoriasCache(),
            ProductoService.getProveedoresCache(),
            ProductoService.getAll()
        ]);

        ProductoUI.renderSelectOptions('filterCategoria', categoriasMap, 'Todas las categorías');
        ProductoUI.renderSelectOptions('filterProveedor', proveedoresMap, 'Todos los laboratorios');
        ProductoUI.renderSelectOptions('inputCategoria', categoriasMap, 'Selecciona una categoría');
        ProductoUI.renderSelectOptions('inputProveedor', proveedoresMap, 'Selecciona un laboratorio');

        productosFiltrados = [...todosLosProductos];
        actualizarVistaTabla();
        ProductoUI.renderStats(productosFiltrados, todosLosProductos);
    } catch (error) {
        console.error('Error cargando datos:', error);
        ProductoUI.mostrarErrorTabla('Error al cargar los datos. Por favor, recarga la página.');
    }
}

function actualizarVistaTabla() {
    ProductoUI.renderTable(productosFiltrados, paginaActual, productosPorPagina, categoriasMap, proveedoresMap, currentUser.role);
    ProductoUI.renderPagination(paginaActual, productosFiltrados.length, productosPorPagina);
}

function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterCategoria = document.getElementById('filterCategoria').value;
    const filterProveedor = document.getElementById('filterProveedor').value;
    const filterStock = document.getElementById('filterStock').value;

    productosFiltrados = todosLosProductos.filter(producto => {
        const coincideBusqueda = !searchTerm ||
            producto.name.toLowerCase().includes(searchTerm) ||
            (producto.sku && producto.sku.toLowerCase().includes(searchTerm)) ||
            (producto.description && producto.description.toLowerCase().includes(searchTerm));

        const coincideCategoria = !filterCategoria || producto.category === filterCategoria;
        const coincideProveedor = !filterProveedor || producto.supplier === filterProveedor;

        let coincideStock = true;
        if (filterStock === 'bajo') coincideStock = producto.current_stock < producto.min_stock;
        else if (filterStock === 'normal') coincideStock = producto.current_stock >= producto.min_stock && producto.current_stock < producto.min_stock * 2;
        else if (filterStock === 'alto') coincideStock = producto.current_stock >= producto.min_stock * 2;

        return coincideBusqueda && coincideCategoria && coincideProveedor && coincideStock;
    });

    if (filterProveedor) {
        productosFiltrados.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
    }

    paginaActual = 1;
    actualizarVistaTabla();
    ProductoUI.renderStats(productosFiltrados, todosLosProductos);
}

function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterProveedor').value = '';
    document.getElementById('filterStock').value = '';
    aplicarFiltros();
}

async function guardarProducto(event) {
    event.preventDefault();
    if (!validarFormularioCompleto()) {
        alert('⚠️ Por favor corrige los errores en el formulario');
        return;
    }

    ProductoUI.setLoading(true);

    try {
        const fechaVencimiento = document.getElementById('inputFechaVencimiento').value;
        const productoData = {
            name: document.getElementById('inputNombre').value.trim(),
            sku: document.getElementById('inputSKU').value.trim().toUpperCase(),
            category: document.getElementById('inputCategoria').value,
            supplier: document.getElementById('inputProveedor').value,
            cost: parseFloat(document.getElementById('inputCosto').value),
            price: parseFloat(document.getElementById('inputPrecio').value),
            price_per_box: (() => {
                const val = document.getElementById('inputPrecioCaja').value;
                return val ? parseFloat(val) : null;
            })(),
            current_stock: parseInt(document.getElementById('inputStockActual').value),
            min_stock: parseInt(document.getElementById('inputStockMinimo').value),
            expiration_date: fechaVencimiento ? new Date(fechaVencimiento + 'T00:00:00') : null,
            description: document.getElementById('inputDescripcion').value.trim() || null
        };

        if (modoEdicion) {
            const productoAnterior = todosLosProductos.find(p => p.id === productoEditandoId);
            const supplierAnterior = productoAnterior?.supplier || null;

            await ProductoService.save(productoEditandoId, productoData, supplierAnterior, currentUser.uid);

            const index = todosLosProductos.findIndex(p => p.id === productoEditandoId);
            if (index !== -1) todosLosProductos[index] = { ...todosLosProductos[index], ...productoData };

            alert('✅ Producto actualizado correctamente');
        } else {
            const nuevoId = await ProductoService.save(null, productoData, null, currentUser.uid);
            const nuevoProductoCompleto = { id: nuevoId, ...productoData };
            todosLosProductos.unshift(nuevoProductoCompleto);

            alert('✅ Producto creado correctamente');
        }

        ProductoUI.closeModal();
        aplicarFiltros();
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('❌ Error al guardar el producto.');
    } finally {
        ProductoUI.setLoading(false);
    }
}

function validarFormularioCompleto() {
    let esValido = true;
    ProductoUI.limpiarErrores();

    const nombre = document.getElementById('inputNombre').value.trim();
    if (!nombre || nombre.length < 3) {
        ProductoUI.mostrarError('inputNombre', '⚠️ Nombre obligatorio (mínimo 3 caracteres)');
        esValido = false;
    }

    const sku = document.getElementById('inputSKU').value.trim().toUpperCase();
    if (!sku || !/^[A-Z0-9-_]+$/.test(sku)) {
        ProductoUI.mostrarError('inputSKU', '⚠️ SKU obligatorio (letras, números y guiones)');
        esValido = false;
    } else {
        const duplicado = todosLosProductos.find(p => p.sku === sku && p.id !== productoEditandoId);
        if (duplicado) {
            ProductoUI.mostrarError('inputSKU', `❌ El SKU "${sku}" ya existe.`);
            esValido = false;
        }
    }

    if (!document.getElementById('inputCategoria').value) {
        ProductoUI.mostrarError('inputCategoria', '⚠️ Selecciona una categoría');
        esValido = false;
    }

    if (!document.getElementById('inputProveedor').value) {
        ProductoUI.mostrarError('inputProveedor', '⚠️ Selecciona un proveedor');
        esValido = false;
    }

    const costo = parseFloat(document.getElementById('inputCosto').value);
    if (isNaN(costo) || costo <= 0) {
        ProductoUI.mostrarError('inputCosto', '⚠️ Costo inválido');
        esValido = false;
    }

    const precio = parseFloat(document.getElementById('inputPrecio').value);
    if (isNaN(precio) || precio <= costo) {
        ProductoUI.mostrarError('inputPrecio', '⚠️ El precio debe ser mayor al costo');
        esValido = false;
    }

    const stock = parseInt(document.getElementById('inputStockActual').value);
    if (isNaN(stock) || stock < 0) {
        ProductoUI.mostrarError('inputStockActual', '⚠️ Stock actual inválido');
        esValido = false;
    }

    return esValido;
}

function calcularMargen() {
    const costo = parseFloat(document.getElementById('inputCosto').value) || 0;
    const precio = parseFloat(document.getElementById('inputPrecio').value) || 0;
    const margenInput = document.getElementById('margenGanancia');

    if (costo > 0 && precio > 0) {
        const margen = ((precio - costo) / costo * 100).toFixed(2);
        margenInput.value = `${margen}%`;
        margenInput.style.color = margen < 10 ? '#e53935' : margen < 30 ? '#fb8c00' : '#43a047';
    } else {
        margenInput.value = '0%';
        margenInput.style.color = '#757575';
    }
}

async function eliminarProducto(id, nombre) {
    if (confirm(`¿Estás seguro de eliminar el producto:\n\n"${nombre}"?`)) {
        try {
            const prod = todosLosProductos.find(p => p.id === id);
            await ProductoService.delete(id, prod?.supplier);
            alert(`✅ Producto "${nombre}" eliminado correctamente`);
            todosLosProductos = todosLosProductos.filter(p => p.id !== id);
            aplicarFiltros();
        } catch (error) {
            alert('❌ Error al eliminar el producto.');
        }
    }
}

function setupModalesRapidos() {
    const modalCat = document.getElementById('modalNuevaCategoria');
    document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => modalCat?.classList.add('active'));
    document.getElementById('btnCerrarNuevaCategoria')?.addEventListener('click', () => modalCat?.classList.remove('active'));
    document.getElementById('btnGuardarCategoria')?.addEventListener('click', async () => {
        const nombre = document.getElementById('inputNombreCategoria')?.value.trim();
        if (!nombre) return alert('Nombre obligatorio');
        try {
            const id = await ProductoService.crearCategoriaRapida({
                nombre,
                descripcion: document.getElementById('inputDescripcionCategoria').value.trim(),
                color: document.getElementById('inputColorCategoria').value,
                icono: document.getElementById('inputIconoCategoria').value
            });
            categoriasMap = await ProductoService.getCategoriasCache();

            // Actualizar ambos selects
            ProductoUI.renderSelectOptions('inputCategoria', categoriasMap, 'Selecciona una categoría');
            ProductoUI.renderSelectOptions('filterCategoria', categoriasMap, 'Todas las categorías');

            document.getElementById('inputCategoria').value = id;
            modalCat?.classList.remove('active');
        } catch (err) { alert('Error al crear categoría'); }
    });

    const modalProv = document.getElementById('modalNuevoProveedor');
    document.getElementById('btnNuevoProveedor')?.addEventListener('click', () => modalProv?.classList.add('active'));
    document.getElementById('btnCerrarNuevoProveedor')?.addEventListener('click', () => modalProv?.classList.remove('active'));
    document.getElementById('btnGuardarProveedor')?.addEventListener('click', async () => {
        const nombre = document.getElementById('inputNombreProveedor')?.value.trim();
        if (!nombre) return alert('Nombre obligatorio');
        try {
            const id = await ProductoService.crearProveedorRapido({
                nombre,
                pais: document.getElementById('inputPaisProveedor').value.trim()
            });
            proveedoresMap = await ProductoService.getProveedoresCache();

            // Actualizar ambos selects
            ProductoUI.renderSelectOptions('inputProveedor', proveedoresMap, 'Selecciona un laboratorio');
            ProductoUI.renderSelectOptions('filterProveedor', proveedoresMap, 'Todos los laboratorios');

            document.getElementById('inputProveedor').value = id;
            modalProv?.classList.remove('active');
        } catch (err) { alert('Error al crear proveedor'); }
    });
}