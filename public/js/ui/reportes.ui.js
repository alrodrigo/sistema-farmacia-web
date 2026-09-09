// public/js/ui/reportes.ui.js
let salesChart = null;
let productsChart = null;

export const ReportesUI = {
    setFechasPorDefecto() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('fechaInicio').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = today.toISOString().split('T')[0];
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

    renderTablaVentas(ventas) {
        const tbody = document.getElementById('salesTableBody');
        tbody.innerHTML = '';

        const labelsPago = { 'cash': 'Efectivo', 'card': 'Tarjeta', 'transfer': 'Transferencia' };

        ventas.forEach((sale, index) => {
            const saleNumber = ventas.length - index;
            const fecha = sale.fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
            const subtotal = sale.subtotal || sale.total;
            const discountText = sale.discount_amount > 0 ? `Bs. ${sale.discount_amount.toFixed(2)}` : '-';
            const paymentLabel = labelsPago[sale.payment_method] || 'Efectivo';

            tbody.innerHTML += `
                <tr>
                    <td><strong>#${saleNumber}</strong></td>
                    <td>${fecha}</td>
                    <td><span class="badge badge-${sale.payment_method || 'cash'}">${paymentLabel}</span></td>
                    <td>${totalItems}</td>
                    <td>Bs. ${subtotal.toFixed(2)}</td>
                    <td class="text-success">${discountText}</td>
                    <td><strong>Bs. ${sale.total.toFixed(2)}</strong></td>
                    <td>
                        <button class="btn-view-detail" onclick="window.verDetalleVenta('${sale.id}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    renderTopProductos(topProducts) {
        const grid = document.getElementById('topProductsGrid');
        grid.innerHTML = '';

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

        topProducts.forEach((product, index) => {
            grid.innerHTML += `
                <div class="product-card" style="background: ${gradients[index % gradients.length]}">
                    <div class="product-info">
                        <h4>${product.nombre}</h4>
                        <p><i class="fas fa-box"></i> ${product.cantidad} unidades vendidas</p>
                        <p><i class="fas fa-dollar-sign"></i> Bs. ${product.total.toFixed(2)} generado</p>
                    </div>
                    <div class="product-badge">#${index + 1}</div>
                </div>
            `;
        });
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

        const labels = { 'cash': 'Efectivo', 'card': 'Tarjeta', 'transfer': 'Transferencia' };
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
        document.getElementById('saleDetailModal').style.display = 'flex';
    },

    cerrarModalDetalle() {
        document.getElementById('saleDetailModal').style.display = 'none';
    },

    cambiarEstado(estado) {
        document.getElementById('loadingState').style.display = estado === 'loading' ? 'block' : 'none';
        document.getElementById('emptyState').style.display = estado === 'empty' ? 'block' : 'none';
        document.getElementById('salesTable').style.display = estado === 'data' ? 'table' : 'none';

        if (estado === 'empty') {
            document.getElementById('topProductsGrid').innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No hay datos de productos</p>';
            if (salesChart) salesChart.destroy();
            if (productsChart) productsChart.destroy();
            this.actualizarKPIs(0, 0, 0, 0);
        }
    }
};