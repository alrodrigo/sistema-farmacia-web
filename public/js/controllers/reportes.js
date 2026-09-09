// public/js/controllers/reportes.js
import { ReportesService } from '../services/reportes.service.js';
import { ReportesUI } from '../ui/reportes.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;
let currentUserData = null;
let allSales = [];
let filteredSales = [];

document.addEventListener('DOMContentLoaded', async () => {
    ReportesUI.setFechasPorDefecto();

    try {
        currentUserData = await AuthGuard.protect();
        currentUser = currentUserData;

        setupEventListeners();
        const vendedores = await ReportesService.getVendedores();
        ReportesUI.llenarSelectVendedores(vendedores);
        await cargarVentas();
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

    document.getElementById('btnFiltrar')?.addEventListener('click', cargarVentas);
    document.getElementById('btnResetFiltros')?.addEventListener('click', resetFilters);

    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            aplicarFiltroRapido(this.dataset.period);
        });
    });

    document.getElementById('btnExportExcel')?.addEventListener('click', exportarAExcel);
    document.getElementById('btnExportPDF')?.addEventListener('click', exportarAPDF);
    document.getElementById('closeDetailModal')?.addEventListener('click', () => ReportesUI.cerrarModalDetalle());
    document.getElementById('saleDetailModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'saleDetailModal') ReportesUI.cerrarModalDetalle();
    });

    // Exposiciones globales para botones generados por la UI
    window.verDetalleVenta = (id) => {
        const sale = filteredSales.find(s => s.id === id);
        if (!sale) return;
        const saleIndex = filteredSales.indexOf(sale);
        const saleNumber = filteredSales.length - saleIndex;
        ReportesUI.abrirModalDetalle(sale, saleNumber);
    };

    document.getElementById('btnPrintReceipt')?.addEventListener('click', function () {
        const saleId = this.dataset.saleId;
        const sale = filteredSales.find(s => s.id === saleId);
        if (sale) imprimirTicketRespaldo(sale, filteredSales.length - filteredSales.indexOf(sale));
    });
}

async function cargarVentas() {
    ReportesUI.cambiarEstado('loading');
    const fechaInicioStr = document.getElementById('fechaInicio').value;
    const fechaFinStr = document.getElementById('fechaFin').value;

    allSales = await ReportesService.getVentasPorRango(fechaInicioStr, fechaFinStr, currentUserData.role, currentUserData.uid);
    aplicarFiltrosMemoria();
}

function getTurno(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 14) return 'manana';
    if (hour >= 14 && hour < 22) return 'tarde';
    return 'noche';
}

function aplicarFiltrosMemoria() {
    const fechaInicioStr = document.getElementById('fechaInicio').value;
    const fechaFinStr = document.getElementById('fechaFin').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const vendorFilter = document.getElementById('vendorFilter').value;
    const turnoFilter = document.getElementById('turnoFilter')?.value || 'all';

    const [yInicio, mInicio, dInicio] = fechaInicioStr.split('-').map(Number);
    const fechaInicio = new Date(yInicio, mInicio - 1, dInicio, 0, 0, 0, 0);
    const [yFin, mFin, dFin] = fechaFinStr.split('-').map(Number);
    const fechaFin = new Date(yFin, mFin - 1, dFin, 23, 59, 59, 999);

    filteredSales = allSales.filter(sale => {
        const enRango = sale.fecha >= fechaInicio && sale.fecha <= fechaFin;
        const coincideMetodo = paymentMethod === 'all' || sale.payment_method === paymentMethod;
        const coincideVendedor = vendorFilter === 'all' || sale.seller_id === vendorFilter;
        const coincideTurno = turnoFilter === 'all' || getTurno(sale.fecha) === turnoFilter;

        return enRango && coincideMetodo && coincideVendedor && coincideTurno;
    });

    actualizarVistaCompleta();
}

function actualizarVistaCompleta() {
    if (filteredSales.length === 0) {
        ReportesUI.cambiarEstado('empty');
        return;
    }

    ReportesUI.cambiarEstado('data');

    // 1. Cálculos de KPIs
    const totalVentas = filteredSales.length;
    const ingresosTotales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const productosVendidos = filteredSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || item.cantidad || 0), 0), 0);
    const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;
    ReportesUI.actualizarKPIs(totalVentas, ingresosTotales, productosVendidos, ticketPromedio);

    // 2. Cálculos para Gráficos
    const productsMap = {};
    const salesByDate = {};

    filteredSales.forEach(sale => {
        const dateKey = sale.fecha.toISOString().split('T')[0];
        if (!salesByDate[dateKey]) salesByDate[dateKey] = { fecha: dateKey, total: 0 };
        salesByDate[dateKey].total += sale.total;

        sale.items.forEach(item => {
            const nombre = item.product_name || item.nombre || item.name;
            const cantidad = item.quantity || item.cantidad || 0;
            const precio = item.unit_price || item.precio || item.price || 0;
            const subtotal = item.subtotal || item.total || (precio * cantidad);

            if (productsMap[nombre]) {
                productsMap[nombre].cantidad += cantidad;
                productsMap[nombre].total += subtotal;
            } else {
                productsMap[nombre] = { nombre, cantidad, total: subtotal };
            }
        });
    });

    const topProducts = Object.values(productsMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);

    const sortedSales = Object.values(salesByDate).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const labelsGraficoVentas = sortedSales.map(item => new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }));
    const dataGraficoVentas = sortedSales.map(item => item.total);

    const top10 = Object.values(productsMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
    const labelsGraficoProductos = top10.map(p => p.nombre.length > 25 ? p.nombre.substring(0, 25) + '...' : p.nombre);
    const dataGraficoProductos = top10.map(p => p.cantidad);

    // 3. Pasar a UI
    ReportesUI.renderTablaVentas(filteredSales);
    ReportesUI.renderTopProductos(topProducts);
    ReportesUI.renderGraficos(
        { labels: labelsGraficoVentas, data: dataGraficoVentas },
        { labels: labelsGraficoProductos, data: dataGraficoProductos }
    );
}

function aplicarFiltroRapido(period) {
    const today = new Date();
    let startDate = new Date(today);
    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(today.getDate() - 7);
    else if (period === 'month') startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById('fechaInicio').valueAsDate = startDate;
    document.getElementById('fechaFin').valueAsDate = today;
    cargarVentas();
}

function resetFilters() {
    ReportesUI.setFechasPorDefecto();
    document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
    if (document.getElementById('turnoFilter')) document.getElementById('turnoFilter').value = 'all';
    if (document.getElementById('vendorFilter')) document.getElementById('vendorFilter').value = 'all';
    if (document.getElementById('paymentMethod')) document.getElementById('paymentMethod').value = 'all';
    cargarVentas();
}

function imprimirTicketRespaldo(sale, saleNumber) {
    const fecha = sale.fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const printWindow = window.open('', '_blank');

    // Simplificación del HTML para la impresión del ticket
    const receiptHTML = `
        <!DOCTYPE html><html><head><title>Recibo #${saleNumber}</title>
        <style>body{font-family:'Courier New',monospace;padding:20px;max-width:400px;margin:0 auto;}</style>
        </head><body><h2>FARMACIA SERVISALUD</h2><p>Venta #${saleNumber}</p><p>Fecha: ${fecha}</p><hr>
        ${sale.items.map(i => `<p>${i.product_name || i.nombre} (x${i.quantity || i.cantidad}): Bs. ${(i.subtotal || (i.quantity * i.unit_price)).toFixed(2)}</p>`).join('')}
        <hr><h3>TOTAL: Bs. ${sale.total.toFixed(2)}</h3>
        <script>setTimeout(()=>{window.print();window.close();},500);</script>
        </body></html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
}

function exportarAExcel() {
    if (filteredSales.length === 0) {
        Toast.warning('No hay datos para exportar.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        Toast.warning('La librería para exportar Excel no está cargada.');
        return;
    }

    const excelData = filteredSales.map((sale, index) => {
        const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
        return {
            'N° Venta': filteredSales.length - index,
            'Fecha': sale.fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            'Vendedor': sale.vendedor || sale.seller_name || 'N/A',
            'Productos': sale.items.map(item => `${item.product_name || item.nombre} (${item.quantity || item.cantidad})`).join(', '),
            'Total Items': totalItems,
            'Total (Bs.)': sale.total.toFixed(2)
        };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excelData), 'Ventas Detalladas');
    XLSX.writeFile(wb, `Reporte_Ventas_${document.getElementById('fechaInicio').value}_a_${document.getElementById('fechaFin').value}.xlsx`);
    Toast.success('Reporte Excel generado correctamente');
}

function exportarAPDF() {
    if (filteredSales.length === 0) {
        Toast.warning('No hay datos para exportar.');
        return;
    }
    if (!window.jspdf) {
        Toast.warning('La librería para exportar PDF no está cargada.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    doc.setFontSize(18);
    doc.text('Reporte de Ventas', 14, 20);
    doc.setFontSize(11);
    doc.text(`Periodo: ${fechaInicio} a ${fechaFin}`, 14, 28);

    const ventasData = filteredSales.map((sale, index) => [
        `#${filteredSales.length - index}`,
        sale.fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        sale.vendedor || sale.seller_name || 'N/A',
        sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0),
        `Bs. ${sale.total.toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 35,
        head: [['N° Venta', 'Fecha', 'Vendedor', 'Items', 'Total']],
        body: ventasData,
    });

    doc.save(`Reporte_Ventas_${fechaInicio}_a_${fechaFin}.pdf`);
}