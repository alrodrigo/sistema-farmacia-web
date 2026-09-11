// public/js/controllers/reportes.js
import { ReportesService } from '../services/reportes.service.js';
import { ReportesUI } from '../ui/reportes.ui.js';
import { ModalUI } from '../ui/modal.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';
import { ErrorHandler } from '../utils/error-handler.js';

let currentUser = null;
let currentUserData = null;
let allSales = [];
let filteredSales = [];
let paginaActual = 1;
const ventasPorPagina = 10;
let ultimoResumenCierre = null;

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
    ModalUI.bind('saleDetailModal', { onClose: () => ReportesUI.cerrarModalDetalle() });

    // Cierre de Caja
    document.getElementById('btnOpenCierreCaja')?.addEventListener('click', abrirCierreCaja);
    ModalUI.bind('cierreCajaModal', { onClose: () => ReportesUI.cerrarModalCierreCaja() });

    const inputFondo = document.getElementById('cierreFondoInicial');
    const inputContado = document.getElementById('cierreEfectivoContado');
    const recalcularArqueo = () => {
        const fondo = parseFloat(inputFondo?.value) || 0;
        const esperado = fondo + (ultimoResumenCierre?.efectivo?.monto || 0);
        const espElem = document.getElementById('cierreEfectivoEsperado');
        if (espElem) espElem.textContent = `Bs. ${esperado.toFixed(2)}`;

        const contadoVal = inputContado?.value;
        const diffBox = document.getElementById('cierreDiferenciaMensaje');
        if (!diffBox) return;

        if (contadoVal === '' || contadoVal === undefined || isNaN(parseFloat(contadoVal))) {
            diffBox.style.display = 'none';
            return;
        }

        const contado = parseFloat(contadoVal);
        const diferencia = contado - esperado;
        diffBox.style.display = 'block';

        if (Math.abs(diferencia) < 0.01) {
            diffBox.style.color = '#065f46';
            diffBox.style.background = '#d1fae5';
            diffBox.style.padding = '0.5rem';
            diffBox.style.borderRadius = '6px';
            diffBox.innerHTML = '<i class="fas fa-check-circle"></i> ¡Caja Cuadrada Exacta! (Diferencia: Bs. 0.00)';
        } else if (diferencia > 0) {
            diffBox.style.color = '#1e40af';
            diffBox.style.background = '#dbeafe';
            diffBox.style.padding = '0.5rem';
            diffBox.style.borderRadius = '6px';
            diffBox.innerHTML = `<i class="fas fa-info-circle"></i> Sobrante en Caja: +Bs. ${diferencia.toFixed(2)}`;
        } else {
            diffBox.style.color = '#991b1b';
            diffBox.style.background = '#fee2e2';
            diffBox.style.padding = '0.5rem';
            diffBox.style.borderRadius = '6px';
            diffBox.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Faltante en Caja: -Bs. ${Math.abs(diferencia).toFixed(2)}`;
        }
    };

    inputFondo?.addEventListener('input', recalcularArqueo);
    inputContado?.addEventListener('input', recalcularArqueo);
    document.getElementById('btnPrintCierreCaja')?.addEventListener('click', imprimirTicketCierre);

    // Controles de filtros en memoria dinámicos
    document.getElementById('turnoFilter')?.addEventListener('change', (e) => {
        const customGroup = document.getElementById('customHourGroup');
        if (customGroup) {
            customGroup.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        }
        aplicarFiltrosMemoria();
    });
    document.getElementById('horaInicio')?.addEventListener('change', aplicarFiltrosMemoria);
    document.getElementById('horaFin')?.addEventListener('change', aplicarFiltrosMemoria);
    document.getElementById('paymentMethod')?.addEventListener('change', aplicarFiltrosMemoria);
    document.getElementById('vendorFilter')?.addEventListener('change', aplicarFiltrosMemoria);

    // Paginación de tabla de ventas
    document.getElementById('btnPrevSalesPage')?.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarTablaPaginada();
        }
    });

    document.getElementById('btnNextSalesPage')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(filteredSales.length / ventasPorPagina);
        if (paginaActual < totalPaginas) {
            paginaActual++;
            actualizarTablaPaginada();
        }
    });

    // Delegación de eventos en la tabla de ventas (Arquitectura Ortogonal)
    document.getElementById('salesTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="ver-detalle"]');
        if (!btn) return;

        const id = btn.dataset.id;
        const sale = filteredSales.find(s => s.id === id);
        if (!sale) return;
        const saleIndex = filteredSales.indexOf(sale);
        const saleNumber = filteredSales.length - saleIndex;
        ReportesUI.abrirModalDetalle(sale, saleNumber);
    });

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

    try {
        allSales = await ReportesService.getVentasPorRango(fechaInicioStr, fechaFinStr, currentUserData.role, currentUserData.uid);
        paginaActual = 1;
        aplicarFiltrosMemoria();
    } catch (error) {
        ErrorHandler.handle(error, 'al cargar ventas');
        ReportesUI.cambiarEstado('empty');
    }
}

function getTurno(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 14) return 'manana';
    if (hour >= 14 && hour < 22) return 'tarde';
    return 'noche';
}

function formatDateToInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function aplicarFiltrosMemoria() {
    const fechaInicioStr = document.getElementById('fechaInicio').value;
    const fechaFinStr = document.getElementById('fechaFin').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const vendorFilter = document.getElementById('vendorFilter').value;
    const turnoFilter = document.getElementById('turnoFilter')?.value || 'all';
    const horaInicioVal = document.getElementById('horaInicio')?.value || '00:00';
    const horaFinVal = document.getElementById('horaFin')?.value || '23:59';

    const [yInicio, mInicio, dInicio] = fechaInicioStr.split('-').map(Number);
    const fechaInicio = new Date(yInicio, mInicio - 1, dInicio, 0, 0, 0, 0);
    const [yFin, mFin, dFin] = fechaFinStr.split('-').map(Number);
    const fechaFin = new Date(yFin, mFin - 1, dFin, 23, 59, 59, 999);

    filteredSales = allSales.filter(sale => {
        const enRango = sale.fecha >= fechaInicio && sale.fecha <= fechaFin;
        const coincideMetodo = paymentMethod === 'all' || sale.payment_method === paymentMethod;
        const coincideVendedor = vendorFilter === 'all' || sale.seller_id === vendorFilter;
        
        let coincideTurno = true;
        if (turnoFilter === 'custom') {
            const saleMinutes = sale.fecha.getHours() * 60 + sale.fecha.getMinutes();
            const [hI, mI] = horaInicioVal.split(':').map(Number);
            const [hF, mF] = horaFinVal.split(':').map(Number);
            const minInicio = (hI || 0) * 60 + (mI || 0);
            const minFin = (hF || 23) * 60 + (mF || 59);
            if (minInicio <= minFin) {
                coincideTurno = saleMinutes >= minInicio && saleMinutes <= minFin;
            } else {
                coincideTurno = saleMinutes >= minInicio || saleMinutes <= minFin;
            }
        } else if (turnoFilter !== 'all') {
            coincideTurno = getTurno(sale.fecha) === turnoFilter;
        }

        return enRango && coincideMetodo && coincideVendedor && coincideTurno;
    });

    paginaActual = 1;
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

    // 3. Renderizar tabla con paginación desacoplada
    actualizarTablaPaginada();

    // 4. Renderizar productos destacados y gráficos
    ReportesUI.renderTopProductos(topProducts);
    ReportesUI.renderGraficos(
        { labels: labelsGraficoVentas, data: dataGraficoVentas },
        { labels: labelsGraficoProductos, data: dataGraficoProductos }
    );
}

function actualizarTablaPaginada() {
    const inicio = (paginaActual - 1) * ventasPorPagina;
    const fin = inicio + ventasPorPagina;
    const ventasPaginadas = filteredSales.slice(inicio, fin);

    ReportesUI.renderTablaVentas(ventasPaginadas, filteredSales.length, paginaActual, ventasPorPagina);
}

function aplicarFiltroRapido(period) {
    const today = new Date();
    let startDate = new Date(today);
    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(today.getDate() - 7);
    else if (period === 'month') startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById('fechaInicio').value = formatDateToInput(startDate);
    document.getElementById('fechaFin').value = formatDateToInput(today);
    cargarVentas();
}

function resetFilters() {
    ReportesUI.setFechasPorDefecto();
    if (document.getElementById('turnoFilter')) document.getElementById('turnoFilter').value = 'all';
    if (document.getElementById('customHourGroup')) document.getElementById('customHourGroup').style.display = 'none';
    if (document.getElementById('vendorFilter')) document.getElementById('vendorFilter').value = 'all';
    if (document.getElementById('paymentMethod')) document.getElementById('paymentMethod').value = 'all';
    cargarVentas();
}

function abrirCierreCaja() {
    if (filteredSales.length === 0) {
        Toast.warning('No hay ventas registradas en el período seleccionado para realizar el cierre.');
        return;
    }

    let efectivoMonto = 0, efectivoCant = 0;
    let tarjetaMonto = 0, tarjetaCant = 0;
    let qrMonto = 0, qrCant = 0;

    filteredSales.forEach(sale => {
        const metodo = sale.payment_method || 'cash';
        if (metodo === 'cash') {
            efectivoMonto += sale.total;
            efectivoCant++;
        } else if (metodo === 'card') {
            tarjetaMonto += sale.total;
            tarjetaCant++;
        } else if (metodo === 'transfer' || metodo === 'qr') {
            qrMonto += sale.total;
            qrCant++;
        } else {
            efectivoMonto += sale.total;
            efectivoCant++;
        }
    });

    const totalVendido = efectivoMonto + tarjetaMonto + qrMonto;
    const totalItems = filteredSales.reduce((sum, s) => sum + s.items.reduce((acc, i) => acc + (i.quantity || i.cantidad || 0), 0), 0);

    const fInicio = document.getElementById('fechaInicio').value;
    const fFin = document.getElementById('fechaFin').value;
    const periodo = fInicio === fFin ? fInicio : `${fInicio} a ${fFin}`;

    const vendorSelect = document.getElementById('vendorFilter');
    let nombreVendedor = 'Todos los vendedores';
    if (vendorSelect && vendorSelect.value !== 'all') {
        nombreVendedor = vendorSelect.options[vendorSelect.selectedIndex]?.text || 'Vendedor';
    } else if (currentUserData && currentUserData.role !== 'admin') {
        nombreVendedor = currentUserData.name || currentUserData.nombre || 'Cajero';
    }

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    ultimoResumenCierre = {
        periodo,
        vendedor: nombreVendedor,
        hora: `${ahora.toLocaleDateString('es-BO')} ${hora}`,
        efectivo: { monto: efectivoMonto, cantidad: efectivoCant },
        tarjeta: { monto: tarjetaMonto, cantidad: tarjetaCant },
        qr: { monto: qrMonto, cantidad: qrCant },
        totalVendido,
        totalVentas: filteredSales.length,
        totalItems
    };

    ReportesUI.abrirModalCierreCaja(ultimoResumenCierre);
}

function imprimirTicketCierre() {
    if (!ultimoResumenCierre) return;

    const fondo = parseFloat(document.getElementById('cierreFondoInicial')?.value) || 0;
    const contadoVal = document.getElementById('cierreEfectivoContado')?.value;
    const contado = contadoVal !== '' && contadoVal !== undefined && !isNaN(parseFloat(contadoVal)) ? parseFloat(contadoVal) : null;
    const esperado = fondo + ultimoResumenCierre.efectivo.monto;
    const diferencia = contado !== null ? contado - esperado : null;

    let cuadreHtml = '';
    if (fondo > 0 || contado !== null) {
        cuadreHtml = `
            <div style="border-top: 1px dashed #000; margin: 8px 0; padding-top: 6px;">
                <p><strong>ARQUEO DE EFECTIVO:</strong></p>
                <p>Fondo Inicial: Bs. ${fondo.toFixed(2)}</p>
                <p>Efectivo Ventas: Bs. ${ultimoResumenCierre.efectivo.monto.toFixed(2)}</p>
                <p><strong>Total Esperado: Bs. ${esperado.toFixed(2)}</strong></p>
                ${contado !== null ? `<p>Efectivo Contado: Bs. ${contado.toFixed(2)}</p>` : ''}
                ${diferencia !== null ? `<p><strong>Diferencia: ${diferencia >= 0 ? '+' : ''}Bs. ${diferencia.toFixed(2)} (${Math.abs(diferencia) < 0.01 ? 'CUADRADO' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE'})</strong></p>` : ''}
            </div>
        `;
    }

    const printWindow = window.open('', '_blank');
    const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cierre de Caja - ${ultimoResumenCierre.periodo}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 15px; max-width: 320px; margin: 0 auto; font-size: 13px; }
                h2, h3, p { margin: 4px 0; }
                .text-center { text-align: center; }
                .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                .row { display: flex; justify-content: space-between; margin: 3px 0; }
                .firma { margin-top: 40px; border-top: 1px solid #000; text-align: center; padding-top: 4px; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h2>FARMACIA SERVISALUD</h2>
                <h3>COMPROBANTE DE CIERRE DE CAJA</h3>
                <p>Fecha Cierre: ${ultimoResumenCierre.hora}</p>
                <p>Período: ${ultimoResumenCierre.periodo}</p>
                <p>Cajero: ${ultimoResumenCierre.vendedor}</p>
            </div>
            <div class="divider"></div>
            <p><strong>DESGLOSE POR FORMA DE PAGO:</strong></p>
            <div class="row">
                <span>Efectivo (${ultimoResumenCierre.efectivo.cantidad}):</span>
                <strong>Bs. ${ultimoResumenCierre.efectivo.monto.toFixed(2)}</strong>
            </div>
            <div class="row">
                <span>Tarjeta (${ultimoResumenCierre.tarjeta.cantidad}):</span>
                <strong>Bs. ${ultimoResumenCierre.tarjeta.monto.toFixed(2)}</strong>
            </div>
            <div class="row">
                <span>QR / Transf. (${ultimoResumenCierre.qr.cantidad}):</span>
                <strong>Bs. ${ultimoResumenCierre.qr.monto.toFixed(2)}</strong>
            </div>
            <div class="divider"></div>
            <div class="row" style="font-size: 14px;">
                <strong>TOTAL VENDIDO:</strong>
                <strong>Bs. ${ultimoResumenCierre.totalVendido.toFixed(2)}</strong>
            </div>
            <p>Total Transacciones: ${ultimoResumenCierre.totalVentas}</p>
            <p>Total Ítems Vendidos: ${ultimoResumenCierre.totalItems}</p>
            
            ${cuadreHtml}

            <div class="firma">Firma del Cajero</div>
            <div class="firma">Firma Supervisor / Administrador</div>
            
            <script>setTimeout(()=>{window.print();window.close();}, 500);</script>
        </body>
        </html>
    `;
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
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