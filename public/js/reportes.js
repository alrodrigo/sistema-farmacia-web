// ==================== REPORTES.JS ====================

// Variables globales
let currentUser = null;
let allSales = [];
let filteredSales = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    initializeEventListeners();
    setDefaultDates();
});

// ==================== AUTENTICACIÓN ====================
function initializeAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            loadSalesData();
        } else {
            window.location.href = 'index.html';
        }
    });
}

async function loadUserData(uid) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Debug: Ver todos los campos del usuario
            console.log('📋 Datos completos del usuario:', userData);
            console.log('📋 Campos disponibles:', Object.keys(userData));
            
            // Buscar el nombre en diferentes campos posibles
            const userName = userData.name || 
                            userData.nombre || 
                            userData.first_name || 
                            userData.displayName ||
                            userData.email?.split('@')[0] || 
                            'Usuario';
            
            document.getElementById('userName').textContent = userName;
            console.log('👤 Usuario mostrado:', userName);
            
            // Actualizar menú según rol
            actualizarMenuPorRol(userData);
        } else {
            console.error('❌ Documento de usuario no encontrado');
        }
    } catch (error) {
        console.error('❌ Error cargando datos del usuario:', error);
    }
}

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    // Menú toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
    
    // Logout desde user menu (nuevo diseño)
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                logout();
            }
        });
    }

    // Filtros
    document.getElementById('btnFiltrar').addEventListener('click', applyFilters);
    document.getElementById('btnResetFiltros').addEventListener('click', resetFilters);

    // Filtros rápidos
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyQuickFilter(this.dataset.period);
        });
    });

    // Exportar Excel
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    
    // Exportar PDF
    document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);

    // Modal detalle
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);
}

// ==================== FECHAS POR DEFECTO ====================
function setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Formatear fechas en formato YYYY-MM-DD para los inputs
    const todayStr = today.toISOString().split('T')[0];
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    
    document.getElementById('fechaInicio').value = firstDayStr;
    document.getElementById('fechaFin').value = todayStr;
    
    console.log('📅 Fechas por defecto establecidas:');
    console.log('  Inicio:', firstDayStr);
    console.log('  Fin:', todayStr);
}

// ==================== CARGAR DATOS DE VENTAS ====================
async function loadSalesData() {
    showLoading();
    
    try {
        // Obtener todas las ventas (sin orderBy para evitar necesitar índice)
        const salesSnapshot = await firebase.firestore()
            .collection('sales')
            .get();

        // Filtrar y mapear ventas con manejo de errores
        allSales = salesSnapshot.docs
            .map(doc => {
                const data = doc.data();
                
                // Intentar obtener fecha de múltiples campos (compatibilidad)
                const fechaField = data.fecha || data.created_at;
                
                if (!fechaField) {
                    console.warn(`⚠️ Venta ${doc.id} no tiene campo 'fecha' ni 'created_at', se ignorará`);
                    return null;
                }

                try {
                    return {
                        id: doc.id,
                        ...data,
                        // Convertir Timestamp a Date con manejo de errores
                        fecha: fechaField.toDate ? fechaField.toDate() : new Date(fechaField)
                    };
                } catch (error) {
                    console.warn(`⚠️ Error procesando venta ${doc.id}:`, error);
                    return null;
                }
            })
            .filter(sale => sale !== null) // Eliminar ventas inválidas
            .sort((a, b) => b.fecha - a.fecha); // Ordenar en JavaScript

        console.log(`✅ ${allSales.length} ventas cargadas correctamente`);
        
        if (allSales.length === 0) {
            console.log('💡 No hay ventas en la base de datos. Crea algunas ventas primero.');
        }
        
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error cargando ventas:', error);
        showError('Error al cargar los datos de ventas. Verifica la consola.');
    }
}

// ==================== FILTROS ====================
function applyFilters() {
    // Obtener valores de los inputs (formato: YYYY-MM-DD)
    const fechaInicioStr = document.getElementById('fechaInicio').value;
    const fechaFinStr = document.getElementById('fechaFin').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // Parsear fechas en hora local (sin conversión UTC)
    const [yInicio, mInicio, dInicio] = fechaInicioStr.split('-').map(Number);
    const fechaInicio = new Date(yInicio, mInicio - 1, dInicio, 0, 0, 0, 0);
    
    const [yFin, mFin, dFin] = fechaFinStr.split('-').map(Number);
    const fechaFin = new Date(yFin, mFin - 1, dFin, 23, 59, 59, 999);

    console.log('📅 Filtrando ventas:');
    console.log('  Input inicio:', fechaInicioStr, '→', fechaInicio.toLocaleString('es-BO'));
    console.log('  Input fin:', fechaFinStr, '→', fechaFin.toLocaleString('es-BO'));
    console.log('  💳 Método de pago:', paymentMethod);
    console.log('  Total ventas sin filtrar:', allSales.length);

    filteredSales = allSales.filter(sale => {
        const saleDate = sale.fecha;
        const enRango = saleDate >= fechaInicio && saleDate <= fechaFin;
        
        // Filtro por método de pago
        let coincideMetodo = true;
        if (paymentMethod !== 'all') {
            coincideMetodo = sale.payment_method === paymentMethod;
        }
        
        if (!enRango || !coincideMetodo) {
            console.log(`  ❌ Venta excluida: ${saleDate.toLocaleString('es-BO')} - Método: ${sale.payment_method}`);
        }
        
        return enRango && coincideMetodo;
    });

    console.log('  ✅ Ventas filtradas:', filteredSales.length);
    updateUI();
}

function applyQuickFilter(period) {
    const today = new Date();
    let startDate;

    switch(period) {
        case 'today':
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
    }

    document.getElementById('fechaInicio').valueAsDate = startDate;
    document.getElementById('fechaFin').valueAsDate = today;
    applyFilters();
}

function resetFilters() {
    setDefaultDates();
    document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
    applyFilters();
}

// ==================== ACTUALIZAR UI ====================
function updateUI() {
    if (filteredSales.length === 0) {
        showEmptyState();
        destroyCharts();
        return;
    }

    hideLoading();
    updateSummaryCards();
    renderSalesTable();
    renderTopProducts();
    generateCharts();
}

function updateSummaryCards() {
    // Total de ventas
    const totalVentas = filteredSales.length;
    document.getElementById('totalVentas').textContent = totalVentas;

    // Ingresos totales
    const ingresosTotales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    document.getElementById('ingresosTotales').textContent = `Bs. ${ingresosTotales.toFixed(2)}`;

    // Productos vendidos (suma de cantidades - compatibilidad con diferentes nombres)
    const productosVendidos = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || item.cantidad || 0), 0);
    }, 0);
    document.getElementById('productosVendidos').textContent = productosVendidos;

    // Ticket promedio
    const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;
    document.getElementById('ticketPromedio').textContent = `Bs. ${ticketPromedio.toFixed(2)}`;

    // Contador de resultados
    document.getElementById('resultsCount').textContent = 
        `${totalVentas} ${totalVentas === 1 ? 'venta' : 'ventas'}`;
}

// ==================== RENDERIZAR TABLA DE VENTAS ====================
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    filteredSales.forEach((sale, index) => {
        const row = document.createElement('tr');
        
        // Número de venta (inverso para que la más reciente sea #1)
        const saleNumber = filteredSales.length - index;
        
        // Fecha formateada
        const fecha = sale.fecha.toLocaleDateString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Contar items y productos (compatibilidad con diferentes nombres de campo)
        const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
        
        // Método de pago
        const paymentMethodLabels = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia'
        };
        const paymentLabel = paymentMethodLabels[sale.payment_method] || 'Efectivo';
        
        // Calcular subtotal y descuento
        const subtotal = sale.subtotal || sale.total;
        const discountAmount = sale.discount_amount || 0;
        const discountText = discountAmount > 0 ? `Bs. ${discountAmount.toFixed(2)}` : '-';

        row.innerHTML = `
            <td><strong>#${saleNumber}</strong></td>
            <td>${fecha}</td>
            <td>
                <span class="badge badge-${sale.payment_method || 'cash'}">
                    ${paymentLabel}
                </span>
            </td>
            <td>${totalItems}</td>
            <td>Bs. ${subtotal.toFixed(2)}</td>
            <td class="text-success">${discountText}</td>
            <td><strong>Bs. ${sale.total.toFixed(2)}</strong></td>
            <td>
                <button class="btn-view-detail" onclick="viewSaleDetail('${sale.id}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    document.getElementById('salesTable').style.display = 'table';
}

// ==================== TOP PRODUCTOS ====================
function renderTopProducts() {
    console.log('🏆 Renderizando top productos...');
    console.log('  Ventas filtradas:', filteredSales.length);
    
    const productsMap = {};

    // Agrupar productos y sumar cantidades
    filteredSales.forEach(sale => {
        console.log('  Procesando venta:', sale.id);
        console.log('    Items:', sale.items);
        
        if (!sale.items || !Array.isArray(sale.items)) {
            console.warn('    ⚠️ Esta venta no tiene items válidos');
            return;
        }
        
        sale.items.forEach(item => {
            // Compatibilidad con diferentes nombres de campos
            const nombre = item.product_name || item.nombre || item.name;
            const cantidad = item.quantity || item.cantidad || item.qty || 0;
            const precio = item.unit_price || item.precio || item.price || 0;
            const subtotal = item.subtotal || item.total || (precio * cantidad) || 0;
            
            console.log('      - Producto:', nombre, 'Cantidad:', cantidad, 'Subtotal:', subtotal);
            
            if (productsMap[nombre]) {
                productsMap[nombre].cantidad += cantidad;
                productsMap[nombre].total += subtotal;
            } else {
                productsMap[nombre] = {
                    nombre: nombre,
                    cantidad: cantidad,
                    total: subtotal
                };
            }
        });
    });
    
    console.log('  Productos agrupados:', productsMap);

    // Convertir a array y ordenar por cantidad
    const topProducts = Object.values(productsMap)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6); // Top 6

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
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.background = gradients[index % gradients.length];
        
        card.innerHTML = `
            <div class="product-info">
                <h4>${product.nombre}</h4>
                <p><i class="fas fa-box"></i> ${product.cantidad} unidades vendidas</p>
                <p><i class="fas fa-dollar-sign"></i> Bs. ${product.total.toFixed(2)} generado</p>
            </div>
            <div class="product-badge">
                #${index + 1}
            </div>
        `;

        grid.appendChild(card);
    });
}

// ==================== DETALLE DE VENTA ====================
function viewSaleDetail(saleId) {
    const sale = filteredSales.find(s => s.id === saleId);
    if (!sale) return;

    // Número de venta
    const saleIndex = filteredSales.indexOf(sale);
    const saleNumber = filteredSales.length - saleIndex;
    document.getElementById('detailSaleNumber').textContent = `#${saleNumber}`;

    // Fecha
    const fecha = sale.fecha.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('detailSaleDate').textContent = fecha;

    // Vendedor (compatibilidad con diferentes nombres de campo)
    const vendedor = sale.vendedor || sale.seller_name || 'N/A';
    document.getElementById('detailSeller').textContent = vendedor;

    // Método de pago
    const paymentMethodLabels = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia'
    };
    const paymentLabel = paymentMethodLabels[sale.payment_method] || 'Efectivo';
    document.getElementById('detailPaymentMethod').textContent = paymentLabel;

    // Subtotal y descuento
    const subtotal = sale.subtotal || sale.total;
    const discountAmount = sale.discount_amount || 0;
    document.getElementById('detailSubtotal').textContent = `Bs. ${subtotal.toFixed(2)}`;
    
    if (discountAmount > 0) {
        document.getElementById('detailDiscountRow').style.display = 'flex';
        document.getElementById('detailDiscount').textContent = `- Bs. ${discountAmount.toFixed(2)}`;
    } else {
        document.getElementById('detailDiscountRow').style.display = 'none';
    }

    // Items
    const itemsBody = document.getElementById('detailItemsBody');
    itemsBody.innerHTML = '';

    sale.items.forEach(item => {
        // Compatibilidad con diferentes nombres de campo
        const nombre = item.product_name || item.nombre || item.name;
        const cantidad = item.quantity || item.cantidad || 0;
        const precio = item.unit_price || item.precio || item.price || 0;
        const subtotal = item.subtotal || item.total || (precio * cantidad);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nombre}</td>
            <td>${cantidad}</td>
            <td>Bs. ${precio.toFixed(2)}</td>
            <td><strong>Bs. ${subtotal.toFixed(2)}</strong></td>
        `;
        itemsBody.appendChild(row);
    });

    // Total
    document.getElementById('detailTotal').textContent = `Bs. ${sale.total.toFixed(2)}`;

    // Guardar ID para imprimir
    document.getElementById('btnPrintReceipt').dataset.saleId = saleId;

    // Mostrar modal
    document.getElementById('saleDetailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('saleDetailModal').style.display = 'none';
}

// ==================== IMPRIMIR RECIBO ====================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnPrintReceipt')?.addEventListener('click', function() {
        const saleId = this.dataset.saleId;
        printReceipt(saleId);
    });
});

function printReceipt(saleId) {
    const sale = filteredSales.find(s => s.id === saleId);
    if (!sale) return;

    const saleIndex = filteredSales.indexOf(sale);
    const saleNumber = filteredSales.length - saleIndex;

    const fecha = sale.fecha.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo de Venta #${saleNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .receipt {
                    border: 2px solid #000;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 15px;
                }
                .header h1 {
                    font-size: 24px;
                    margin-bottom: 5px;
                }
                .header p {
                    font-size: 12px;
                    margin: 3px 0;
                }
                .info {
                    margin-bottom: 20px;
                    font-size: 14px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .items {
                    margin-bottom: 20px;
                }
                .items-header {
                    border-bottom: 2px solid #000;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                }
                .item {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    font-size: 13px;
                }
                .item-name {
                    flex: 1;
                }
                .item-qty {
                    width: 50px;
                    text-align: center;
                }
                .item-price {
                    width: 80px;
                    text-align: right;
                }
                .total-section {
                    border-top: 2px dashed #000;
                    padding-top: 15px;
                    margin-top: 20px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 2px dashed #000;
                    font-size: 12px;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>💊 FARMACIA</h1>
                    <p>Sistema de Gestión</p>
                    <p>NIT: 123456789</p>
                </div>

                <div class="info">
                    <div class="info-row">
                        <span><strong>Recibo N°:</strong></span>
                        <span>#${saleNumber}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Fecha:</strong></span>
                        <span>${fecha}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Vendedor:</strong></span>
                        <span>${sale.vendedor || sale.seller_name || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Método de Pago:</strong></span>
                        <span>${(() => {
                            const labels = {'cash': 'Efectivo', 'card': 'Tarjeta', 'transfer': 'Transferencia'};
                            return labels[sale.payment_method] || 'Efectivo';
                        })()}</span>
                    </div>
                </div>

                <div class="items">
                    <div class="items-header">
                        <span>Producto</span>
                        <span>Cant.</span>
                        <span>Subtotal</span>
                    </div>
                    ${sale.items.map(item => {
                        const nombre = item.product_name || item.nombre || item.name;
                        const cantidad = item.quantity || item.cantidad || 0;
                        const precio = item.unit_price || item.precio || item.price || 0;
                        const subtotal = item.subtotal || item.total || (precio * cantidad);
                        
                        return `
                        <div class="item">
                            <span class="item-name">${nombre}</span>
                            <span class="item-qty">${cantidad}</span>
                            <span class="item-price">Bs. ${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="item" style="font-size: 11px; color: #666; margin-top: -5px;">
                            <span class="item-name">  @ Bs. ${precio.toFixed(2)} c/u</span>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div class="total-section">
                    <div class="info-row">
                        <span>Subtotal:</span>
                        <span>Bs. ${(sale.subtotal || sale.total).toFixed(2)}</span>
                    </div>
                    ${sale.discount_amount > 0 ? `
                    <div class="info-row" style="color: #15803d;">
                        <span>Descuento:</span>
                        <span>- Bs. ${sale.discount_amount.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>Bs. ${sale.total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>¡Gracias por su compra!</p>
                    <p>Vuelva pronto</p>
                </div>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">
                    🖨️ Imprimir
                </button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                    ❌ Cerrar
                </button>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
}

// ==================== EXPORTAR A EXCEL ====================
function exportToExcel() {
    if (filteredSales.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Preparar datos para Excel
    const excelData = filteredSales.map((sale, index) => {
        const saleNumber = filteredSales.length - index;
        const fecha = sale.fecha.toLocaleDateString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
        const productos = sale.items.map(item => {
            const nombre = item.product_name || item.nombre || item.name;
            const cantidad = item.quantity || item.cantidad || 0;
            return `${nombre} (${cantidad})`;
        }).join(', ');

        return {
            'N° Venta': saleNumber,
            'Fecha': fecha,
            'Vendedor': sale.vendedor || sale.seller_name || 'N/A',
            'Productos': productos,
            'Total Items': totalItems,
            'Total (Bs.)': sale.total.toFixed(2)
        };
    });

    // Crear hoja de resumen
    const summary = [{
        'Concepto': 'Total Ventas',
        'Valor': filteredSales.length
    }, {
        'Concepto': 'Ingresos Totales',
        'Valor': `Bs. ${filteredSales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}`
    }, {
        'Concepto': 'Productos Vendidos',
        'Valor': filteredSales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || item.cantidad || 0), 0);
        }, 0)
    }, {
        'Concepto': 'Ticket Promedio',
        'Valor': `Bs. ${(filteredSales.reduce((sum, sale) => sum + sale.total, 0) / filteredSales.length).toFixed(2)}`
    }];

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();

    // Agregar hoja de resumen
    const wsResumen = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Agregar hoja de ventas
    const wsVentas = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas Detalladas');

    // Generar archivo
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const filename = `Reporte_Ventas_${fechaInicio}_a_${fechaFin}.xlsx`;
    
    XLSX.writeFile(wb, filename);
}

// ==================== EXPORTAR A PDF ====================
function exportToPDF() {
    if (filteredSales.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear instancia de jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener fechas del filtro
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    // Configuración
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // ===== HEADER =====
    doc.setFillColor(106, 90, 205); // Color primary
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('FARMACIA', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Reporte de Ventas', pageWidth / 2, 25, { align: 'center' });
    doc.text(`Periodo: ${fechaInicio} a ${fechaFin}`, pageWidth / 2, 32, { align: 'center' });

    yPosition = 50;

    // ===== RESUMEN (KPIs) =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN GENERAL', 14, yPosition);
    yPosition += 10;

    // Calcular KPIs
    const totalVentas = filteredSales.length;
    const ingresosTotales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const productosVendidos = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || item.cantidad || 0), 0);
    }, 0);
    const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

    // Tabla de resumen
    doc.autoTable({
        startY: yPosition,
        head: [['Concepto', 'Valor']],
        body: [
            ['Total de Ventas', totalVentas.toString()],
            ['Ingresos Totales', `Bs. ${ingresosTotales.toFixed(2)}`],
            ['Productos Vendidos', productosVendidos.toString()],
            ['Ticket Promedio', `Bs. ${ticketPromedio.toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [106, 90, 205],
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 10
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { halign: 'right', cellWidth: 100 }
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // ===== DETALLE DE VENTAS =====
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLE DE VENTAS', 14, yPosition);
    yPosition += 5;

    // Preparar datos de ventas
    const ventasData = filteredSales.map((sale, index) => {
        const saleNumber = filteredSales.length - index;
        const fecha = sale.fecha.toLocaleDateString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const vendedor = sale.vendedor || sale.seller_name || 'N/A';
        const totalItems = sale.items.reduce((sum, item) => sum + (item.quantity || item.cantidad || 0), 0);
        const productos = sale.items.map(item => {
            const nombre = item.product_name || item.nombre || item.name;
            return nombre;
        }).join(', ');

        return [
            `#${saleNumber}`,
            fecha,
            vendedor,
            totalItems,
            `Bs. ${sale.total.toFixed(2)}`
        ];
    });

    // Agregar fila de TOTAL al final
    const totalItemsGeneral = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || item.cantidad || 0), 0);
    }, 0);
    
    ventasData.push([
        '',
        '',
        'TOTAL GENERAL',
        totalItemsGeneral,
        `Bs. ${ingresosTotales.toFixed(2)}`
    ]);

    // Tabla de ventas
    doc.autoTable({
        startY: yPosition,
        head: [['N° Venta', 'Fecha', 'Vendedor', 'Items', 'Total']],
        body: ventasData,
        theme: 'striped',
        headStyles: {
            fillColor: [106, 90, 205],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: [248, 249, 255]
        },
        // Estilo especial para la última fila (TOTAL GENERAL)
        didParseCell: function(data) {
            if (data.row.index === ventasData.length - 1) {
                data.cell.styles.fillColor = [106, 90, 205];
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
            }
        }
    });

    // ===== FOOTER EN TODAS LAS PÁGINAS =====
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
            `Generado el ${new Date().toLocaleString('es-BO')}`,
            14,
            doc.internal.pageSize.height - 10
        );
        doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - 14,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        );
    }

    // ===== GUARDAR PDF =====
    const filename = `Reporte_Ventas_${fechaInicio}_a_${fechaFin}.pdf`;
    doc.save(filename);
    
    console.log('✅ PDF generado:', filename);
}

// ==================== ESTADOS UI ====================
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('salesTable').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('salesTable').style.display = 'none';
    
    // Resetear tarjetas
    document.getElementById('totalVentas').textContent = '0';
    document.getElementById('ingresosTotales').textContent = 'Bs. 0.00';
    document.getElementById('productosVendidos').textContent = '0';
    document.getElementById('ticketPromedio').textContent = 'Bs. 0.00';
    document.getElementById('resultsCount').textContent = '0 ventas';
    
    // Limpiar top products
    document.getElementById('topProductsGrid').innerHTML = 
        '<p style="text-align: center; color: #999; padding: 2rem;">No hay datos de productos</p>';
}

function showError(message) {
    alert(message);
    hideLoading();
}

// ==================== LOGOUT ====================
function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error al cerrar sesión:', error);
        });
}

// ==================== ACTUALIZAR MENÚ POR ROL ====================
function actualizarMenuPorRol(userData) {
    if (!userData) return;
    
    const role = userData.role || 'empleado';
    console.log('🔐 Actualizando menú para rol:', role);
    
    // Si es empleado, ocultar opciones de admin
    if (role === 'empleado') {
        // Ocultar productos
        const productosMenu = document.querySelector('a[href="productos.html"]');
        if (productosMenu) productosMenu.style.display = 'none';
        
        // Ocultar categorías
        const categoriasMenu = document.querySelector('#menuCategorias');
        if (categoriasMenu) categoriasMenu.style.display = 'none';
        
        // Ocultar usuarios
        const usuariosMenu = document.querySelector('#menuUsuarios');
        if (usuariosMenu) usuariosMenu.style.display = 'none';
        
        // Ocultar utilidades
        const utilidadesMenu = document.querySelector('#menuUtilidades');
        if (utilidadesMenu) utilidadesMenu.style.display = 'none';
        
        // Ocultar configuración
        const configMenu = document.querySelector('a[href="configuracion.html"]');
        if (configMenu) configMenu.style.display = 'none';
        
        console.log('👤 Menú de empleado aplicado');
    } else {
        console.log('👑 Menú de admin aplicado (completo)');
    }
}

// ==================== GRÁFICOS CON CHART.JS ====================
let salesChart = null;
let productsChart = null;

function generateCharts() {
    destroyCharts();
    generateSalesChart();
    generateProductsChart();
}

function destroyCharts() {
    if (salesChart) {
        salesChart.destroy();
        salesChart = null;
    }
    if (productsChart) {
        productsChart.destroy();
        productsChart = null;
    }
}

function generateSalesChart() {
    // Agrupar ventas por día
    const salesByDate = {};
    
    filteredSales.forEach(sale => {
        const dateKey = sale.fecha.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = {
                fecha: dateKey,
                total: 0,
                cantidad: 0
            };
        }
        salesByDate[dateKey].total += sale.total || 0;
        salesByDate[dateKey].cantidad += 1;
    });
    
    // Convertir a array y ordenar por fecha
    const sortedData = Object.values(salesByDate).sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
    );
    
    // Preparar datos para el gráfico
    const labels = sortedData.map(item => {
        const date = new Date(item.fecha + 'T00:00:00');
        return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
    });
    
    const data = sortedData.map(item => item.total);
    
    // Crear gráfico
    const ctx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos (Bs.)',
                data: data,
                borderColor: '#0D3C61',
                backgroundColor: 'rgba(13, 60, 97, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#0D3C61',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#333',
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#0D3C61',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Ingresos: Bs. ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Bs. ' + value.toFixed(0);
                        },
                        color: '#666',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#666',
                        font: {
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    console.log('📊 Gráfico de ventas generado con', sortedData.length, 'puntos');
}

function generateProductsChart() {
    // Obtener productos más vendidos (ya calculados en renderTopProducts)
    const productCount = {};
    
    filteredSales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const productName = item.productoNombre || item.producto || 'Producto sin nombre';
                const cantidad = item.cantidad || 0;
                
                if (!productCount[productName]) {
                    productCount[productName] = 0;
                }
                productCount[productName] += cantidad;
            });
        }
    });
    
    // Convertir a array y ordenar
    const sortedProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10
    
    if (sortedProducts.length === 0) {
        console.warn('⚠️ No hay productos para mostrar en el gráfico');
        return;
    }
    
    // Preparar datos para el gráfico
    const labels = sortedProducts.map(([name]) => {
        // Truncar nombres largos
        return name.length > 25 ? name.substring(0, 25) + '...' : name;
    });
    
    const data = sortedProducts.map(([_, count]) => count);
    
    // Colores para las barras (gradiente azul-verde)
    const backgroundColors = [
        '#0D3C61', '#1A5078', '#27648F', '#3478A6', '#418CBD',
        '#5FA0C4', '#7CB342', '#8BC34A', '#9CCC65', '#AED581'
    ];
    
    // Crear gráfico
    const ctx = document.getElementById('productsChart').getContext('2d');
    productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unidades Vendidas',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#333',
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#7CB342',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Vendidas: ' + context.parsed.y + ' unidades';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#666',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    console.log('📊 Gráfico de productos generado con', sortedProducts.length, 'productos');
}
