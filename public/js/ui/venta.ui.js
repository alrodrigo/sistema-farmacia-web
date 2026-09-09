// public/js/ui/venta.ui.js
export const VentaUI = {
    updateDateTime() {
        const ahora = new Date();
        const el = document.getElementById('saleDate');
        if (el) {
            el.textContent = `${ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        }
    },

    renderSearchResults(productos) {
        const container = document.getElementById('searchResults');
        const countEl = document.getElementById('resultsCount');

        if (productos.length === 0) {
            container.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron productos</p>
                    <small>Intenta con otro término</small>
                </div>`;
            if (countEl) countEl.textContent = '0 productos';
            return;
        }

        if (countEl) countEl.textContent = `${productos.length} producto${productos.length !== 1 ? 's' : ''}`;

        container.innerHTML = productos.map(producto => {
            const stockBajo = producto.current_stock < producto.min_stock;
            const sinStock = producto.current_stock === 0;
            return `
                <div class="product-card" data-id="${producto.id}">
                    <div class="product-info">
                        <div class="product-name">${producto.name}</div>
                        <div class="product-details">
                            <span class="product-sku">SKU: ${producto.sku || 'N/A'}</span>
                            <span class="product-stock ${stockBajo ? 'low' : ''}">
                                <i class="fas fa-box"></i> Stock: ${producto.current_stock || 0}
                            </span>
                        </div>
                    </div>
                    <div class="product-price">${window.formatCurrency ? window.formatCurrency(producto.price || 0) : `Bs. ${producto.price}`}</div>
                    <button class="btn-add-to-cart" onclick="window.agregarAlCarrito('${producto.id}')" ${sinStock ? 'disabled' : ''}>
                        <i class="fas fa-${sinStock ? 'ban' : 'cart-plus'}"></i> ${sinStock ? 'Sin Stock' : 'Agregar'}
                    </button>
                </div>`;
        }).join('');
    },

    renderEmptySearch() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-barcode"></i>
                    <p>Busca un producto para comenzar</p>
                    <small>Usa el buscador o escanea el código</small>
                </div>`;
        }
        const countEl = document.getElementById('resultsCount');
        if (countEl) countEl.textContent = '0 productos';
    },

    renderCart(carrito) {
        const container = document.getElementById('cartContainer');
        if (carrito.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>El carrito está vacío</p>
                    <small>Agrega productos desde el buscador</small>
                </div>`;
            document.getElementById('btnClearCart').disabled = true;
            document.getElementById('btnProcessSale').disabled = true;
            return;
        }

        container.innerHTML = carrito.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${window.formatCurrency(item.price)} c/u</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="btn-qty" onclick="window.cambiarCantidad('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                    <input type="number" class="qty-input" value="${item.cantidad}" min="1" max="${item.stock_disponible}" onchange="window.actualizarCantidadDirecta('${item.id}', this.value)" onclick="this.select()" />
                    <button class="btn-qty" onclick="window.cambiarCantidad('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                </div>
                <div class="cart-item-subtotal">${window.formatCurrency(item.price * item.cantidad)}</div>
                <button class="btn-remove-item" onclick="window.quitarDelCarrito('${item.id}')" title="Quitar"><i class="fas fa-times"></i></button>
            </div>`).join('');

        document.getElementById('btnClearCart').disabled = false;
        document.getElementById('btnProcessSale').disabled = false;
    },

    updateTotals(totalItems, subtotal, total, discountAmount) {
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('subtotal').textContent = window.formatCurrency(subtotal);
        document.getElementById('total').textContent = window.formatCurrency(total);

        const discountRow = document.getElementById('discountRow');
        if (discountAmount > 0) {
            discountRow.style.display = 'flex';
            document.getElementById('discountAmount').textContent = '- ' + window.formatCurrency(discountAmount);
        } else {
            discountRow.style.display = 'none';
        }
    },

    togglePaymentFields(method) {
        document.getElementById('amountSection').style.display = method === 'cash' ? 'block' : 'none';
        if (method !== 'cash') {
            document.getElementById('changeRow').style.display = 'none';
            document.getElementById('amountReceived').value = '';
        }
    },

    updateChange(change, amountReceived) {
        const changeRow = document.getElementById('changeRow');
        const changeAmount = document.getElementById('changeAmount');
        if (amountReceived > 0) {
            changeRow.style.display = 'flex';
            if (change >= 0) {
                changeAmount.textContent = window.formatCurrency(change);
                changeAmount.className = 'text-primary';
            } else {
                changeAmount.textContent = window.formatCurrency(Math.abs(change)) + ' faltante';
                changeAmount.className = 'text-error';
            }
        } else {
            changeRow.style.display = 'none';
        }
    },

    setProcessing(isProcessing) {
        const btn = document.getElementById('btnProcessSale');
        if (!btn) return;
        btn.disabled = isProcessing;
        btn.innerHTML = isProcessing ? '<i class="fas fa-spinner fa-spin"></i> Procesando...' : '<i class="fas fa-check-circle"></i> Procesar Venta';
    },

    showSuccessModal(numeroVenta, total, totalItems, paymentMethod, discountAmount, amountReceived, change) {
        document.getElementById('modalSaleNumber').textContent = '#' + String(numeroVenta).padStart(4, '0');
        document.getElementById('modalTotal').textContent = window.formatCurrency(total);
        document.getElementById('modalItems').textContent = totalItems;
        document.getElementById('modalPaymentMethod').textContent = paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia';

        if (discountAmount > 0) {
            document.getElementById('modalDiscountRow').style.display = 'flex';
            document.getElementById('modalDiscount').textContent = '- ' + window.formatCurrency(discountAmount);
        } else {
            document.getElementById('modalDiscountRow').style.display = 'none';
        }

        if (paymentMethod === 'cash') {
            document.getElementById('modalAmountRow').style.display = 'flex';
            document.getElementById('modalAmountReceived').textContent = window.formatCurrency(amountReceived);
            document.getElementById('modalChangeRow').style.display = 'flex';
            document.getElementById('modalChange').textContent = window.formatCurrency(change);
        } else {
            document.getElementById('modalAmountRow').style.display = 'none';
            document.getElementById('modalChangeRow').style.display = 'none';
        }

        const modal = document.getElementById('saleSuccessModal');
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        const modal = document.getElementById('saleSuccessModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    resetPaymentForm() {
        document.getElementById('paymentMethod').value = 'cash';
        document.getElementById('discountValue').value = '';
        document.getElementById('discountType').value = 'percent';
        document.getElementById('amountReceived').value = '';
        document.getElementById('changeRow').style.display = 'none';
        document.getElementById('discountRow').style.display = 'none';
        document.getElementById('amountSection').style.display = 'block';

        const search = document.getElementById('searchProductInput');
        if (search) {
            search.value = '';
            search.focus();
        }
    },

    printReceipt(numeroVenta, total, totalItems, paymentMethod, items, vendedor, config) {
        // Generador de ticket basado en el DOM anterior
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true });

        const itemsHTML = items.length > 0 ? items.map(item => `
            <div class="receipt-item">
                <div class="receipt-item-name">${item.name}</div>
                <div class="receipt-item-details">
                    <span>${item.cantidad} x ${window.formatCurrency(item.price)}</span>
                    <strong>${window.formatCurrency(item.price * item.cantidad)}</strong>
                </div>
            </div>`).join('') : `<div class="receipt-item"><div class="receipt-item-name">${totalItems} producto(s)</div></div>`;

        let extraPago = '';
        if (config.discountAmount > 0) extraPago += `<div class="receipt-total-row"><span>Descuento:</span><strong>- ${window.formatCurrency(config.discountAmount)}</strong></div>`;
        if (paymentMethod === 'Efectivo') {
            extraPago += `
                <div class="receipt-total-row"><span>Recibido:</span><strong>${window.formatCurrency(config.amountReceived)}</strong></div>
                <div class="receipt-total-row"><span>Cambio:</span><strong>${window.formatCurrency(config.change)}</strong></div>`;
        }

        const reciboHTML = `
            <div class="receipt-header">
                <div class="receipt-logo"><img src="img/logo-servisalud.png" alt="ServiSalud"></div>
                <div class="receipt-title">FARMACIA SERVISALUD</div>
                <div class="receipt-subtitle">NIT: 123456789</div>
                <div class="receipt-subtitle">Av. Principal #123, La Paz - Bolivia</div>
            </div>
            <div class="receipt-info">
                <div class="receipt-info-row"><span class="receipt-info-label">Nº Venta:</span><span>${numeroVenta}</span></div>
                <div class="receipt-info-row"><span class="receipt-info-label">Fecha:</span><span>${fecha} - ${hora}</span></div>
                <div class="receipt-info-row"><span class="receipt-info-label">Cajero:</span><span>${vendedor}</span></div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items">${itemsHTML}</div>
            <div class="receipt-totals">
                <div class="receipt-total-row main"><span>TOTAL A PAGAR:</span><strong>${window.formatCurrency(total)}</strong></div>
            </div>
            <div class="receipt-payment">
                <div class="receipt-total-row"><span>Método:</span><strong>${paymentMethod}</strong></div>
                ${extraPago}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-footer">
                <div class="receipt-thank-you">¡GRACIAS POR SU COMPRA!</div>
                <div class="receipt-footer-line">www.servisalud.com.bo</div>
            </div>`;

        const printContainer = document.getElementById('printReceipt');
        printContainer.innerHTML = reciboHTML;
        printContainer.style.display = 'block';
        setTimeout(() => {
            window.print();
            setTimeout(() => printContainer.style.display = 'none', 100);
        }, 100);
    }
};