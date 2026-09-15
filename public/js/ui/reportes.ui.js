// public/js/ui/reportes.ui.js
import { ModalUI } from './modal.ui.js';

let salesChart = null;
let productsChart = null;

export const ReportesUI = {
    setFechasPorDefecto() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const inputInicio = document.getElementById('fechaInicio');
        const inputFin = document.getElementById('fechaFin');
        if (inputInicio) inputInicio.value = todayStr;
        if (inputFin) inputFin.value = todayStr;

        // Activar visualmente botón 'Hoy'
        document.querySelectorAll('.btn-quick').forEach(b => {
            b.classList.toggle('active', b.dataset.period === 'today');
        });
    },

    actualizarUsuario(name, roleText) {
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');
        if (userNameElement) userNameElement.textContent = name;
        if (userRoleElement) userRoleElement.textContent = roleText;
    },

    llenarSelectVendedores(vendedores) {
        const select = document.getElementById('vendorFilter');
        if (!select) return;
        select.innerHTML = '<option value="all">Todos los vendedores</option>';
        vendedores.forEach(vendor => {
            const displayName = vendor.nombre || vendor.name || vendor.email?.split('@')[0] || 'Vendedor';
            const option = document.createElement('option');
            option.value = vendor.uid;
            option.textContent = displayName;
            select.appendChild(option);
        });
    },

    actualizarKPIs(totalVentas, ingresosTotales, productosVendidos, ticketPromedio) {
        document.getElementById('totalVentas').textContent = totalVentas;
        document.getElementById('ingresosTotales').textContent = `Bs. ${ingresosTotales.toFixed(2)}`;
        document.getElementById('productosVendidos').textContent = productosVendidos;
        document.getElementById('ticketPromedio').textContent = `Bs. ${ticketPromedio.toFixed(2)}`;
        document.getElementById('resultsCount').textContent = `${totalVentas} ${totalVentas === 1 ? 'venta' : 'ventas'}`;
    },

    renderTablaVentas(ventasPaginadas, totalFiltradas, paginaActual = 1, ventasPorPagina = 10, esAdmin = false) {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;

        const labelsPago = { 'cash': 'Efectivo', 'card': 'Tarjeta', 'transfer': 'Transferencia / QR' };
        const inicioIndex = (paginaActual - 1) * ventasPorPagina;

        const rowsHtml = ventasPaginadas.map((sale, index) => {
            const saleNumber = sale.sale_number || (totalFiltradas - (inicioIndex + index));
            const fecha = sale.fecha.toLocaleDateString('es-BO', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
            const subtotal = sale.subtotal || sale.total;
            const discountText = sale.discount_amount > 0 ? `Bs. ${sale.discount_amount.toFixed(2)}` : '-';
            const paymentLabel = labelsPago[sale.payment_method] || 'Efectivo';
            const esAnulada = sale.status === 'anulada' || sale.status === 'cancelled';

            const badgeEstado = esAnulada
                ? `<span class="badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700;">🚫 Anulada</span>`
                : `<span class="badge badge-${sale.payment_method || 'cash'}">${paymentLabel}</span>`;

            const botonAnular = (!esAnulada && esAdmin)
                ? `<button class="btn-cancel-sale" data-action="anular-venta" data-id="${sale.id}" data-number="${saleNumber}" data-total="${sale.total.toFixed(2)}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; transition: all 0.2s;" title="Anular venta y reponer stock">
                    <i class="fas fa-ban"></i> Anular
                   </button>`
                : '';

            return `
                <tr style="${esAnulada ? 'background-color: #fff7ed; opacity: 0.85;' : ''}">
                    <td><strong>#${saleNumber}</strong></td>
                    <td>${fecha}</td>
                    <td>${badgeEstado}</td>
                    <td>${totalItems}</td>
                    <td>Bs. ${subtotal.toFixed(2)}</td>
                    <td class="text-success">${discountText}</td>
                    <td><strong style="${esAnulada ? 'text-decoration: line-through; color: #94a3b8;' : ''}">Bs. ${sale.total.toFixed(2)}</strong></td>
                    <td>
                        <button class="btn-view-detail" data-action="ver-detalle" data-id="${sale.id}">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        ${botonAnular}
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;

        // Actualizar controles de paginación
        const totalPaginas = Math.ceil(totalFiltradas / ventasPorPagina) || 1;
        const paginationInfo = document.getElementById('salesPaginationInfo');
        const btnPrev = document.getElementById('btnPrevSalesPage');
        const btnNext = document.getElementById('btnNextSalesPage');
        const paginationContainer = document.getElementById('salesPagination');

        if (paginationInfo) {
            paginationInfo.textContent = `Página ${paginaActual} de ${totalPaginas} (${totalFiltradas} ventas)`;
        }
        if (btnPrev) btnPrev.disabled = paginaActual <= 1;
        if (btnNext) btnNext.disabled = paginaActual >= totalPaginas;
        if (paginationContainer) {
            paginationContainer.style.display = totalFiltradas > 0 ? 'flex' : 'none';
        }
    },

    renderTopProductos(topProducts) {
        const grid = document.getElementById('topProductsGrid');
        if (!grid) return;

        if (topProducts.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No hay datos de productos</p>';
            return;
        }

        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
        ];

        grid.innerHTML = topProducts.map((product, index) => `
            <div class="product-card" style="background: ${gradients[index % gradients.length]}">
                <div class="product-info">
                    <h4>${product.nombre}</h4>
                    <p><i class="fas fa-box"></i> ${product.cantidad} unidades vendidas</p>
                    <p><i class="fas fa-dollar-sign"></i> Bs. ${product.total.toFixed(2)} generado</p>
                </div>
                <div class="product-badge">#${index + 1}</div>
            </div>
        `).join('');
    },

    renderGraficos(datosVentasFechas, datosProductosTop) {
        if (salesChart) salesChart.destroy();
        if (productsChart) productsChart.destroy();

        if (!window.Chart) return;

        // Gráfico de Ingresos
        const ctxSales = document.getElementById('salesChart').getContext('2d');
        salesChart = new window.Chart(ctxSales, {
            type: 'line',
            data: {
                labels: datosVentasFechas.labels,
                datasets: [{
                    label: 'Ingresos (Bs.)',
                    data: datosVentasFechas.data,
                    borderColor: '#0D3C61',
                    backgroundColor: 'rgba(13, 60, 97, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Gráfico de Productos
        if (datosProductosTop.labels.length > 0) {
            const ctxProducts = document.getElementById('productsChart').getContext('2d');
            const bgColors = ['#0D3C61', '#1A5078', '#27648F', '#3478A6', '#418CBD', '#5FA0C4', '#7CB342', '#8BC34A', '#9CCC65', '#AED581'];

            productsChart = new window.Chart(ctxProducts, {
                type: 'bar',
                data: {
                    labels: datosProductosTop.labels,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: datosProductosTop.data,
                        backgroundColor: bgColors,
                        borderWidth: 2, borderRadius: 8
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },

    abrirModalDetalle(sale, saleNumber) {
        document.getElementById('detailSaleNumber').textContent = `#${saleNumber}`;
        document.getElementById('detailSaleDate').textContent = sale.fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('detailSeller').textContent = sale.vendedor || sale.seller_name || 'N/A';

        const labels = { 'cash': 'Efectivo', 'card': 'Tarjeta', 'transfer': 'Transferencia / QR' };
        document.getElementById('detailPaymentMethod').textContent = labels[sale.payment_method] || 'Efectivo';

        const subtotal = sale.subtotal || sale.total;
        document.getElementById('detailSubtotal').textContent = `Bs. ${subtotal.toFixed(2)}`;

        if (sale.discount_amount > 0) {
            document.getElementById('detailDiscountRow').style.display = 'flex';
            document.getElementById('detailDiscount').textContent = `- Bs. ${sale.discount_amount.toFixed(2)}`;
        } else {
            document.getElementById('detailDiscountRow').style.display = 'none';
        }

        const itemsBody = document.getElementById('detailItemsBody');
        itemsBody.innerHTML = sale.items.map(item => {
            const nombre = item.product_name || item.nombre || item.name;
            const cantidad = item.quantity || item.cantidad || 0;
            const precio = item.unit_price || item.precio || item.price || 0;
            const sub = item.subtotal || item.total || (precio * cantidad);
            return `<tr><td>${nombre}</td><td>${cantidad}</td><td>Bs. ${precio.toFixed(2)}</td><td><strong>Bs. ${sub.toFixed(2)}</strong></td></tr>`;
        }).join('');

        document.getElementById('detailTotal').textContent = `Bs. ${sale.total.toFixed(2)}`;
        document.getElementById('btnPrintReceipt').dataset.saleId = sale.id;
        ModalUI.open('saleDetailModal');
    },

    cerrarModalDetalle() {
        ModalUI.close('saleDetailModal');
    },

    abrirModalCierreCaja(resumen) {
        document.getElementById('cierrePeriodo').textContent = resumen.periodo;
        document.getElementById('cierreVendedor').textContent = resumen.vendedor;
        document.getElementById('cierreHora').textContent = resumen.hora;

        document.getElementById('cierreMontoEfectivo').textContent = `Bs. ${resumen.efectivo.monto.toFixed(2)}`;
        document.getElementById('cierreCantEfectivo').textContent = `${resumen.efectivo.cantidad} ${resumen.efectivo.cantidad === 1 ? 'venta' : 'ventas'}`;

        document.getElementById('cierreMontoTarjeta').textContent = `Bs. ${resumen.tarjeta.monto.toFixed(2)}`;
        document.getElementById('cierreCantTarjeta').textContent = `${resumen.tarjeta.cantidad} ${resumen.tarjeta.cantidad === 1 ? 'venta' : 'ventas'}`;

        document.getElementById('cierreMontoQR').textContent = `Bs. ${resumen.qr.monto.toFixed(2)}`;
        document.getElementById('cierreCantQR').textContent = `${resumen.qr.cantidad} ${resumen.qr.cantidad === 1 ? 'venta' : 'ventas'}`;

        document.getElementById('cierreGranTotal').textContent = `Bs. ${resumen.totalVendido.toFixed(2)}`;
        document.getElementById('cierreCantTotal').textContent = `${resumen.totalVentas} ventas registradas (${resumen.totalItems} productos)`;

        document.getElementById('cierreFondoInicial').value = '0.00';
        document.getElementById('cierreEfectivoContado').value = '';
        document.getElementById('cierreEfectivoEsperado').textContent = `Bs. ${resumen.efectivo.monto.toFixed(2)}`;
        
        const diffMsg = document.getElementById('cierreDiferenciaMensaje');
        if (diffMsg) diffMsg.style.display = 'none';

        ModalUI.open('cierreCajaModal');
    },

    cerrarModalCierreCaja() {
        ModalUI.close('cierreCajaModal');
    },

    cambiarEstado(estado) {
        const loading = document.getElementById('loadingState');
        const empty = document.getElementById('emptyState');
        const table = document.getElementById('salesTable');
        const pagination = document.getElementById('salesPagination');

        if (loading) loading.style.display = estado === 'loading' ? 'block' : 'none';
        if (empty) empty.style.display = estado === 'empty' ? 'block' : 'none';
        if (table) table.style.display = estado === 'data' ? 'table' : 'none';
        if (pagination && estado !== 'data') pagination.style.display = 'none';

        if (estado === 'empty') {
            const grid = document.getElementById('topProductsGrid');
            if (grid) grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No hay datos de productos</p>';
            if (salesChart) salesChart.destroy();
            if (productsChart) productsChart.destroy();
            this.actualizarKPIs(0, 0, 0, 0);
        }
    }
};