// public/js/controllers/dashboard.js
import { DashboardService } from '../services/dashboard.service.js';
import { DashboardUI } from '../ui/dashboard.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;

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

    // Delegación de eventos en la tabla de stock bajo (Arquitectura Ortogonal)
    document.getElementById('stockBajoTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="ir-a-producto"]');
        if (!btn) return;
        localStorage.setItem('editProductId', btn.dataset.id);
        window.location.href = 'productos.html';
    });

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
        const { productos, proveedoresMap } = await DashboardService.getInventario();

        procesarStockBajo(productos, proveedoresMap);
        procesarProximosVencer(productos, proveedoresMap);

        // Resumen de ventas de hoy
        const { ventasHoy, ingresosHoy } = await DashboardService.getResumenHoy(currentUser.uid, currentUser.role);
        DashboardUI.renderKpis(productos.length, ventasHoy, ingresosHoy, currentUser.role);

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