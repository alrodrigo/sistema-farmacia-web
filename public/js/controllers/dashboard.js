// public/js/controllers/dashboard.js
import { DashboardService } from '../services/dashboard.service.js';
import { DashboardUI } from '../ui/dashboard.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;
let stockBajoGlobal = [];

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

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    document.getElementById('btnScanQR')?.addEventListener('click', () => Toast.info('📷 Función de escaneo QR próximamente'));

    // EXPOSICIÓN AL OBJETO WINDOW (Corrección de Módulos vs Inline HTML)
    window.filtrarStockBajo = filtrarStockBajo;
    window.exportarStockBajoExcel = exportarStockBajoExcel;
    window.irAProducto = (productId) => {
        localStorage.setItem('editProductId', productId);
        window.location.href = 'productos.html';
    };
}

async function cargarEstadisticas() {
    try {
        const { productos, proveedoresMap } = await DashboardService.getInventario();

        procesarStockBajo(productos, proveedoresMap);
        procesarProximosVencer(productos, proveedoresMap);

        // Uso del servicio unificado (.get en lugar de .count)
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
    DashboardUI.renderStockBajo(stockBajoGlobal, stockBajoGlobal.length);
}

function filtrarStockBajo() {
    const lab = document.getElementById('filtroLabStockBajo').value;
    const filtrados = lab === 'TODOS' ? stockBajoGlobal : stockBajoGlobal.filter(p => p.supplier === lab);
    DashboardUI.renderStockBajo(filtrados, stockBajoGlobal.length);
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
                sku: p.sku,
                supplier: proveedoresMap[p.supplier] || p.supplier || p.supplier_name || 'Sin laboratorio',
                expirationDate: f,
                diasRestantes,
                stock: p.current_stock
            };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    DashboardUI.renderProximosVencer(proximos);
}

function exportarStockBajoExcel() {
    if (typeof XLSX === 'undefined') {
        Toast.warning('La librería para exportar Excel no está cargada.');
        return;
    }

    const lab = document.getElementById('filtroLabStockBajo').value;
    const datos = lab === 'TODOS' ? stockBajoGlobal : stockBajoGlobal.filter(p => p.supplier === lab);

    if (datos.length === 0) {
        Toast.warning('No hay datos para exportar.');
        return;
    }

    const datosLimpios = datos.map(p => ({
        "Producto": p.name,
        "Laboratorio": p.supplier,
        "Stock Actual": p.currentStock,
        "Stock Mínimo": p.minStock,
        "Cantidad a Pedir (Faltante)": p.faltante
    }));

    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedido de Stock");

    const fecha = new Date().toISOString().split('T')[0];
    const nombre = lab === 'TODOS' ? `Pedido_General_${fecha}.xlsx` : `Pedido_${lab}_${fecha}.xlsx`;

    XLSX.writeFile(libro, nombre);
}