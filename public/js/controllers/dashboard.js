// public/js/controllers/dashboard.js
import { DashboardService } from '../services/dashboard.service.js';
import { ProductoService } from '../services/producto.service.js';
import { DashboardUI } from '../ui/dashboard.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;
let todosLosProductos = [];
let categoriasMap = {};
let proveedoresMap = {};

// Estado de Stock Bajo
let stockBajoGlobal = [];
let stockBajoFiltrados = [];
let stockBajoPagina = 1;
const stockBajoPorPagina = 5;

// Estado de Próximos a Vencer
let proximosGlobal = [];
let proximosFiltrados = [];
let proximosPagina = 1;
const proximosPorPagina = 5;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await AuthGuard.protect();

        const displayName = currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0] || 'Usuario';
        const roleText = currentUser.role === 'admin' ? 'Administrador' : 'Empleado';
        DashboardUI.updateUser(displayName, roleText);

        setupEventListeners();
        await cargarEstadisticas();
    } catch (error) {
        console.warn("Ejecución detenida por AuthGuard:", error);
    }
});

function setupEventListeners() {
    document.getElementById('btnLogout')?.addEventListener('click', () => AuthGuard.logout());
    document.querySelector('.user-menu')?.addEventListener('click', async () => {
        const salir = await ConfirmDialog.show('Cerrar Sesión', '¿Estás seguro de que deseas salir del sistema?', 'warning', 'Cerrar Sesión');
        if (salir) AuthGuard.logout();
    });

    document.getElementById('btnScanQR')?.addEventListener('click', () => Toast.info('📷 Función de escaneo QR próximamente'));

    // Delegación de eventos para abrir modal de producto directamente en el Dashboard
    document.getElementById('stockBajoTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="actualizar-producto"]');
        if (!btn) return;
        abrirModalActualizar(btn.dataset.id);
    });

    document.getElementById('expiringTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="actualizar-producto"]');
        if (!btn) return;
        abrirModalActualizar(btn.dataset.id);
    });

    // Cierre del modal de actualización
    document.getElementById('btnCerrarModalActualizar')?.addEventListener('click', cerrarModalActualizar);
    document.getElementById('btnCancelarModalActualizar')?.addEventListener('click', cerrarModalActualizar);
    document.getElementById('modalOverlayActualizar')?.addEventListener('click', cerrarModalActualizar);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalActualizar();
    });

    // Guardado del formulario del modal
    document.getElementById('formActualizarProducto')?.addEventListener('submit', guardarActualizacionProducto);

    // Botones de incremento rápido de stock (+5, +10, +20, +50)
    document.querySelectorAll('.btn-incrementar-stock').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('editModalStockActual');
            if (!input) return;
            const cant = parseInt(btn.dataset.cant, 10) || 0;
            const actual = parseInt(input.value, 10) || 0;
            input.value = Math.max(0, actual + cant);
            actualizarIndicadoresModal();
        });
    });

    // Botón "Reponer Mínimo"
    document.getElementById('btnReponerFaltante')?.addEventListener('click', () => {
        const inputActual = document.getElementById('editModalStockActual');
        const inputMin = document.getElementById('editModalStockMinimo');
        if (!inputActual || !inputMin) return;
        const minVal = parseInt(inputMin.value, 10) || 0;
        inputActual.value = minVal;
        actualizarIndicadoresModal();
    });

    document.getElementById('editModalStockActual')?.addEventListener('input', actualizarIndicadoresModal);
    document.getElementById('editModalStockMinimo')?.addEventListener('input', actualizarIndicadoresModal);

    // Filtros interactivos para Stock Bajo
    document.getElementById('busquedaStockBajo')?.addEventListener('input', filtrarStockBajo);
    document.getElementById('filtroLabStockBajo')?.addEventListener('change', filtrarStockBajo);
    document.getElementById('filtroNivelStockBajo')?.addEventListener('change', filtrarStockBajo);
    document.getElementById('btnExportarStockBajo')?.addEventListener('click', exportarStockBajoExcel);

    // Controles de paginación Stock Bajo
    document.getElementById('btnPrevStockBajo')?.addEventListener('click', () => {
        if (stockBajoPagina > 1) {
            stockBajoPagina--;
            actualizarTablaStockBajo();
        }
    });

    document.getElementById('btnNextStockBajo')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(stockBajoFiltrados.length / stockBajoPorPagina);
        if (stockBajoPagina < totalPaginas) {
            stockBajoPagina++;
            actualizarTablaStockBajo();
        }
    });

    // Filtros interactivos para Próximos a Vencer
    document.getElementById('busquedaExpiring')?.addEventListener('input', filtrarProximosVencer);
    document.getElementById('filtroLabExpiring')?.addEventListener('change', filtrarProximosVencer);
    document.getElementById('filtroUrgenciaExpiring')?.addEventListener('change', filtrarProximosVencer);
    document.getElementById('btnExportarExpiring')?.addEventListener('click', exportarExpiringExcel);

    // Controles de paginación Próximos a Vencer
    document.getElementById('btnPrevExpiring')?.addEventListener('click', () => {
        if (proximosPagina > 1) {
            proximosPagina--;
            actualizarTablaProximos();
        }
    });

    document.getElementById('btnNextExpiring')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(proximosFiltrados.length / proximosPorPagina);
        if (proximosPagina < totalPaginas) {
            proximosPagina++;
            actualizarTablaProximos();
        }
    });
}

async function cargarEstadisticas() {
    try {
        const [inventario, categorias, proveedores] = await Promise.all([
            DashboardService.getInventario(),
            ProductoService.getCategoriasCache(),
            ProductoService.getProveedoresCache()
        ]);

        todosLosProductos = inventario.productos;
        proveedoresMap = proveedores;
        categoriasMap = categorias;

        procesarStockBajo(inventario.productos, inventario.proveedoresMap);
        procesarProximosVencer(inventario.productos, inventario.proveedoresMap);

        // Resumen de ventas de hoy
        const { ventasHoy, ingresosHoy } = await DashboardService.getResumenHoy(currentUser.uid, currentUser.role);
        DashboardUI.renderKpis(inventario.productos.length, ventasHoy, ingresosHoy, currentUser.role);

    } catch (error) {
        console.error("Error al cargar estadísticas", error);
    }
}

function procesarStockBajo(productos, proveedoresMap) {
    stockBajoGlobal = productos
        .filter(p => p.current_stock < p.min_stock)
        .map(p => ({
            id: p.id,
            name: p.name,
            supplier: proveedoresMap[p.supplier] || p.supplier || p.supplier_name || 'Sin laboratorio',
            currentStock: p.current_stock,
            minStock: p.min_stock,
            faltante: p.min_stock - p.current_stock
        }));

    if (stockBajoGlobal.length > 0) {
        const laboratorios = [...new Set(stockBajoGlobal.map(p => p.supplier))].sort();
        DashboardUI.renderFiltroLaboratorios(laboratorios);
    }
    stockBajoFiltrados = stockBajoGlobal;
    stockBajoPagina = 1;
    actualizarTablaStockBajo();
}

function filtrarStockBajo() {
    const q = document.getElementById('busquedaStockBajo')?.value.trim().toLowerCase() || '';
    const lab = document.getElementById('filtroLabStockBajo')?.value || 'TODOS';
    const nivel = document.getElementById('filtroNivelStockBajo')?.value || 'TODOS';

    stockBajoFiltrados = stockBajoGlobal.filter(p => {
        const coincideTexto = !q || p.name.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
        const coincideLab = lab === 'TODOS' || p.supplier === lab;

        let coincideNivel = true;
        if (nivel === '0') coincideNivel = p.currentStock === 0;
        else if (nivel === '1') coincideNivel = p.currentStock === 1;
        else if (nivel === '2') coincideNivel = p.currentStock <= 2;
        else if (nivel === '5') coincideNivel = p.currentStock <= 5;

        return coincideTexto && coincideLab && coincideNivel;
    });

    stockBajoPagina = 1;
    actualizarTablaStockBajo();
}

function actualizarTablaStockBajo() {
    const inicio = (stockBajoPagina - 1) * stockBajoPorPagina;
    const fin = inicio + stockBajoPorPagina;
    const paginados = stockBajoFiltrados.slice(inicio, fin);
    DashboardUI.renderStockBajo(paginados, stockBajoFiltrados.length, stockBajoGlobal.length, stockBajoPagina, stockBajoPorPagina);
}

function procesarProximosVencer(productos, proveedoresMap) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const obtenerFechaReal = (valorFecha) => {
        if (!valorFecha) return null;
        if (typeof valorFecha.toDate === 'function') return valorFecha.toDate();
        if (valorFecha.seconds) return new Date(valorFecha.seconds * 1000);
        return new Date(valorFecha);
    };

    const proximos = productos
        .filter(p => {
            const f = obtenerFechaReal(p.expiration_date);
            return f && !isNaN(f.getTime()) && f <= fechaLimite;
        })
        .map(p => {
            const f = obtenerFechaReal(p.expiration_date);
            const diasRestantes = Math.ceil((f - hoy) / (1000 * 60 * 60 * 24));
            return {
                id: p.id,
                name: p.name,
                sku: p.sku || 'S/SKU',
                supplier: proveedoresMap[p.supplier] || p.supplier || p.supplier_name || 'Sin laboratorio',
                expirationDate: f,
                diasRestantes,
                stock: p.current_stock
            };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    if (proximos.length > 0) {
        const laboratorios = [...new Set(proximos.map(p => p.supplier))].sort();
        DashboardUI.renderFiltroLaboratoriosExpiring(laboratorios);
    }

    proximosGlobal = proximos;
    proximosFiltrados = proximos;
    proximosPagina = 1;
    actualizarTablaProximos();
}

function filtrarProximosVencer() {
    const q = document.getElementById('busquedaExpiring')?.value.trim().toLowerCase() || '';
    const lab = document.getElementById('filtroLabExpiring')?.value || 'TODOS';
    const urgencia = document.getElementById('filtroUrgenciaExpiring')?.value || 'TODOS';

    proximosFiltrados = proximosGlobal.filter(p => {
        const coincideTexto = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || p.supplier.toLowerCase().includes(q);
        const coincideLab = lab === 'TODOS' || p.supplier === lab;

        let coincideUrgencia = true;
        if (urgencia === 'POR_VENCER') {
            coincideUrgencia = p.diasRestantes >= 0;
        } else if (urgencia === 'VENCIDOS') {
            coincideUrgencia = p.diasRestantes < 0;
        } else if (urgencia === 'HOY') {
            coincideUrgencia = p.diasRestantes === 0;
        } else if (urgencia === '7') {
            coincideUrgencia = p.diasRestantes >= 0 && p.diasRestantes <= 7;
        } else if (urgencia === '15') {
            coincideUrgencia = p.diasRestantes >= 0 && p.diasRestantes <= 15;
        } else if (urgencia === '30') {
            coincideUrgencia = p.diasRestantes >= 0 && p.diasRestantes <= 30;
        }

        return coincideTexto && coincideLab && coincideUrgencia;
    });

    proximosPagina = 1;
    actualizarTablaProximos();
}

function actualizarTablaProximos() {
    const inicio = (proximosPagina - 1) * proximosPorPagina;
    const fin = inicio + proximosPorPagina;
    const paginados = proximosFiltrados.slice(inicio, fin);
    DashboardUI.renderProximosVencer(paginados, proximosFiltrados.length, proximosGlobal.length, proximosPagina, proximosPorPagina);
}

function exportarStockBajoExcel() {
    if (typeof XLSX === 'undefined') {
        Toast.warning('La librería para exportar Excel no está cargada.');
        return;
    }

    if (stockBajoFiltrados.length === 0) {
        Toast.warning('No hay datos filtrados para exportar.');
        return;
    }

    const datosLimpios = stockBajoFiltrados.map(p => ({
        "Producto": p.name,
        "Laboratorio": p.supplier,
        "Stock Actual": p.currentStock,
        "Stock Mínimo": p.minStock,
        "Cantidad a Pedir (Faltante)": p.faltante
    }));

    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Stock Bajo");

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Reporte_Stock_Bajo_${fecha}.xlsx`);
    Toast.success('Reporte de Stock Bajo exportado exitosamente.');
}

function exportarExpiringExcel() {
    if (typeof XLSX === 'undefined') {
        Toast.warning('La librería para exportar Excel no está cargada.');
        return;
    }

    if (proximosFiltrados.length === 0) {
        Toast.warning('No hay datos filtrados para exportar.');
        return;
    }

    const datosLimpios = proximosFiltrados.map(p => {
        let estado = `${p.diasRestantes} días`;
        if (p.diasRestantes < 0) estado = 'VENCIDO';
        else if (p.diasRestantes === 0) estado = 'VENCE HOY';

        return {
            "Producto": p.name,
            "SKU / Lote": p.sku,
            "Laboratorio": p.supplier,
            "Fecha Vencimiento": p.expirationDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            "Días Restantes": p.diasRestantes,
            "Estado": estado,
            "Stock Actual": p.stock
        };
    });

    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Proximos a Vencer");

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Reporte_Proximos_A_Vencer_${fecha}.xlsx`);
    Toast.success('Reporte de Próximos a Vencer exportado exitosamente.');
}

// =========================================================================
// LÓGICA DEL MODAL DE ACTUALIZACIÓN DE PRODUCTO / STOCK EN DASHBOARD
// =========================================================================

function abrirModalActualizar(id) {
    if (currentUser?.role !== 'admin') {
        Toast.warning('Solo los administradores pueden editar productos');
        return;
    }

    const prod = todosLosProductos.find(p => p.id === id);
    if (!prod) {
        Toast.error('No se encontró la información del producto');
        return;
    }

    document.getElementById('editModalProdId').value = prod.id;
    document.getElementById('editModalNombreHeader').textContent = prod.name;
    document.getElementById('editModalSkuBadge').textContent = prod.sku || 'S/SKU';

    document.getElementById('editModalNombre').value = prod.name || '';
    document.getElementById('editModalSKU').value = prod.sku || '';

    const currentStock = typeof prod.current_stock === 'number' ? prod.current_stock : (parseInt(prod.current_stock, 10) || 0);
    const minStock = typeof prod.min_stock === 'number' ? prod.min_stock : (parseInt(prod.min_stock, 10) || 0);

    document.getElementById('editModalStockActual').value = currentStock;
    document.getElementById('editModalStockMinimo').value = minStock;

    // Poblar selects de Categoría y Proveedor
    poblarSelectCategorias(prod.category);
    poblarSelectProveedores(prod.supplier);

    document.getElementById('editModalCosto').value = prod.cost !== undefined ? prod.cost : '';
    document.getElementById('editModalPrecio').value = prod.price !== undefined ? prod.price : '';

    // Fecha de vencimiento
    document.getElementById('editModalVencimiento').value = formatearFechaInput(prod.expiration_date);

    actualizarIndicadoresModal();

    const modal = document.getElementById('actualizarProductoModal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalActualizar() {
    const modal = document.getElementById('actualizarProductoModal');
    if (modal) modal.style.display = 'none';
}

function actualizarIndicadoresModal() {
    const inputActual = document.getElementById('editModalStockActual');
    const inputMin = document.getElementById('editModalStockMinimo');
    const badge = document.getElementById('editModalStockBadge');
    const faltanteText = document.getElementById('editModalFaltanteText');

    if (!inputActual || !inputMin) return;

    const actual = parseInt(inputActual.value, 10) || 0;
    const min = parseInt(inputMin.value, 10) || 0;

    if (badge) {
        badge.textContent = `Stock: ${actual}`;
        badge.className = actual <= min ? 'badge-danger' : 'badge-success';
    }

    if (faltanteText) {
        if (actual < min) {
            faltanteText.textContent = `⚠️ Faltan ${min - actual} unidades para el mínimo`;
            faltanteText.style.color = '#b45309';
        } else {
            faltanteText.textContent = `✅ Stock en nivel óptimo (≥ ${min})`;
            faltanteText.style.color = '#15803d';
        }
    }
}

function formatearFechaInput(valorFecha) {
    if (!valorFecha) return '';
    let fechaReal;
    if (typeof valorFecha.toDate === 'function') fechaReal = valorFecha.toDate();
    else if (valorFecha.seconds) fechaReal = new Date(valorFecha.seconds * 1000);
    else fechaReal = new Date(valorFecha);

    if (isNaN(fechaReal.getTime())) return '';
    const año = fechaReal.getFullYear();
    const mes = String(fechaReal.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaReal.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function poblarSelectCategorias(categoriaActual) {
    const select = document.getElementById('editModalCategoria');
    if (!select) return;
    select.innerHTML = '<option value="">Sin categoría</option>';
    Object.values(categoriasMap)
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
        .forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.nombre || cat.name || 'Sin nombre';
            if (cat.id === categoriaActual) opt.selected = true;
            select.appendChild(opt);
        });
}

function poblarSelectProveedores(proveedorActual) {
    const select = document.getElementById('editModalProveedor');
    if (!select) return;
    select.innerHTML = '<option value="">Sin laboratorio</option>';
    Object.values(proveedoresMap)
        .sort((a, b) => (a.nombre || a.name || '').localeCompare(b.nombre || b.name || ''))
        .forEach(prov => {
            const opt = document.createElement('option');
            opt.value = prov.id;
            opt.textContent = prov.nombre || prov.name || 'Sin nombre';
            if (prov.id === proveedorActual) opt.selected = true;
            select.appendChild(opt);
        });
}

async function guardarActualizacionProducto(e) {
    e.preventDefault();

    const id = document.getElementById('editModalProdId')?.value;
    if (!id) return;

    const prodOriginal = todosLosProductos.find(p => p.id === id);
    if (!prodOriginal) {
        Toast.error('Producto no encontrado');
        return;
    }

    const nombre = document.getElementById('editModalNombre')?.value.trim();
    if (!nombre) {
        Toast.warning('El nombre del producto es obligatorio');
        return;
    }

    const nuevoStock = parseInt(document.getElementById('editModalStockActual')?.value, 10);
    const nuevoMinStock = parseInt(document.getElementById('editModalStockMinimo')?.value, 10);
    const nuevoPrecio = parseFloat(document.getElementById('editModalPrecio')?.value);
    const nuevoCosto = parseFloat(document.getElementById('editModalCosto')?.value) || 0;
    const nuevoSku = document.getElementById('editModalSKU')?.value.trim().toUpperCase() || '';
    const nuevaCategoria = document.getElementById('editModalCategoria')?.value || null;
    const nuevoProveedor = document.getElementById('editModalProveedor')?.value || null;
    const fechaVencVal = document.getElementById('editModalVencimiento')?.value;

    if (isNaN(nuevoStock) || nuevoStock < 0) {
        Toast.warning('El stock actual debe ser un número mayor o igual a 0');
        return;
    }

    if (isNaN(nuevoMinStock) || nuevoMinStock < 0) {
        Toast.warning('El stock mínimo debe ser un número mayor o igual a 0');
        return;
    }

    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
        Toast.warning('El precio de venta debe ser un número mayor o igual a 0');
        return;
    }

    let expirationDate = prodOriginal.expiration_date;
    if (fechaVencVal) {
        const [y, m, d] = fechaVencVal.split('-').map(Number);
        expirationDate = new Date(y, m - 1, d, 12, 0, 0);
    } else if (fechaVencVal === '') {
        expirationDate = null;
    }

    const btnGuardar = document.getElementById('btnGuardarModalActualizar');
    const originalBtnHtml = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    try {
        const productoData = {
            name: nombre,
            sku: nuevoSku,
            category: nuevaCategoria,
            supplier: nuevoProveedor,
            current_stock: nuevoStock,
            min_stock: nuevoMinStock,
            price: nuevoPrecio,
            cost: nuevoCosto,
            expiration_date: expirationDate
        };

        await ProductoService.save(
            id,
            productoData,
            prodOriginal.supplier || null,
            currentUser.uid,
            prodOriginal.category || null
        );

        Toast.success(`Producto "${nombre}" actualizado correctamente`);
        cerrarModalActualizar();
        await cargarEstadisticas();
    } catch (error) {
        console.error("Error al actualizar producto:", error);
        Toast.error('Error al guardar los cambios del producto');
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = originalBtnHtml;
        }
    }
}