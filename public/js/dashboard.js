// public/js/dashboard.js
import { DashboardService } from './services/dashboard.service.js';
import { DashboardUI } from './ui/dashboard.ui.js';

let currentUser = null;
let stockBajoGlobal = [];

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
                    const roleText = currentUser.role === 'admin' ? 'Administrador' : 'Empleado';

                    DashboardUI.updateUser(displayName, roleText);

                    if (typeof window.aplicarRestriccionesMenu === 'function') {
                        window.aplicarRestriccionesMenu(currentUser);
                    }

                    setupEventListeners();
                    await cargarEstadisticas();
                } else {
                    alert('⚠️ Tu cuenta no está configurada correctamente.');
                    auth.signOut().then(() => window.location.href = 'index.html');
                }
            } catch (error) {
                console.error("Error validando usuario", error);
                auth.signOut().then(() => window.location.href = 'index.html');
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

function setupEventListeners() {
    document.getElementById('btnLogout')?.addEventListener('click', cerrarSesion);
    document.querySelector('.user-menu')?.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) cerrarSesion();
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

    document.getElementById('btnScanQR')?.addEventListener('click', () => alert('📷 Función de escaneo QR próximamente'));

    // EXPOSICIÓN AL OBJETO WINDOW (Corrección de Módulos vs Inline HTML)
    window.filtrarStockBajo = filtrarStockBajo;
    window.exportarStockBajoExcel = exportarStockBajoExcel;
    window.irAProducto = (productId) => {
        localStorage.setItem('editProductId', productId);
        window.location.href = 'productos.html';
    };
}

function cerrarSesion() {
    auth.signOut().then(() => {
        if (typeof window.clearCurrentUser === 'function') window.clearCurrentUser();
        window.location.href = 'index.html';
    });
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
        alert('La librería para exportar Excel no está cargada.');
        return;
    }

    const lab = document.getElementById('filtroLabStockBajo').value;
    const datos = lab === 'TODOS' ? stockBajoGlobal : stockBajoGlobal.filter(p => p.supplier === lab);

    if (datos.length === 0) return alert('No hay datos para exportar.');

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