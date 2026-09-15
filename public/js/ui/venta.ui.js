// public/js/ui/venta.ui.js
import { ProductoService } from '../services/producto.service.js';

export const VentaUI = {
    updateDateTime() {
        const ahora = new Date();
        const el = document.getElementById('saleDate');
        if (el) {
            el.textContent = `${ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    highlightMatch(text, query) {
        if (!text) return '';
        const safeText = this.escapeHtml(text);
        if (!query || !query.trim()) return safeText;

        const cleanQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${cleanQuery})`, 'gi');
        return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
    },

    renderSkeletonQuick() {
        const container = document.getElementById('quickSaleContainer');
        if (!container) return;
        container.innerHTML = Array(6).fill(0).map(() => `
            <div class="skeleton-quick-card">
                <div class="skeleton-line" style="width: 75%; height: 14px; margin-bottom: 8px;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="skeleton-line" style="width: 35%; height: 12px;"></div>
                    <div class="skeleton-line" style="width: 40%; height: 14px;"></div>
                </div>
            </div>
        `).join('');
    },

    renderSkeletonSearch(count = 4) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        container.innerHTML = Array(count).fill(0).map(() => `
            <div class="product-card skeleton-prod-card" style="pointer-events: none;">
                <div class="product-info" style="flex: 1;">
                    <div class="skeleton-line" style="width: 60%; height: 16px; margin-bottom: 8px;"></div>
                    <div class="skeleton-line" style="width: 40%; height: 12px;"></div>
                </div>
                <div class="skeleton-line" style="width: 60px; height: 18px; margin-right: 15px;"></div>
                <div class="skeleton-line" style="width: 90px; height: 36px; border-radius: 6px;"></div>
            </div>
        `).join('');
    },

    renderQuickProducts(productos, activeTab = 'frecuentes') {
        const container = document.getElementById('quickSaleContainer');
        if (!container) return;

        if (!productos || productos.length === 0) {
            if (activeTab === 'prioridad') {
                container.innerHTML = `
                    <div class="quick-empty-state">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.3rem;"></i>
                        <div>
                            <strong>¡Excelente! Sin productos urgentes</strong>
                            <p style="margin: 0; font-size: 0.8rem; color: #64748b;">No hay medicamentos con vencimiento próximo ni salida urgente.</p>
                        </div>
                    </div>`;
            } else {
                container.innerHTML = `
                    <div class="quick-empty-state">
                        <i class="fas fa-box-open" style="color: #94a3b8; font-size: 1.3rem;"></i>
                        <div>
                            <strong>Sin productos disponibles</strong>
                            <p style="margin: 0; font-size: 0.8rem; color: #64748b;">No se encontraron productos frecuentes en stock.</p>
                        </div>
                    </div>`;
            }
            return;
        }

        container.innerHTML = productos.map(producto => {
            const priority = ProductoService.getPriorityStatus(producto);
            const stock = producto.current_stock || 0;
            const minStock = producto.min_stock || 1;
            const sinStock = stock <= 0;
            const stockBajo = stock < minStock;
            const isUrgent = priority.isUrgent;

            const badgeHtml = isUrgent
                ? `<span class="quick-badge urgent"><i class="fas fa-fire"></i> ${priority.label}</span>`
                : (priority.isPromo ? `<span class="quick-badge promo"><i class="fas fa-tag"></i> Promo</span>` : '');

            return `
                <button type="button" class="quick-prod-card ${isUrgent ? 'priority-card' : ''} ${sinStock ? 'out-of-stock' : ''}"
                    onclick="window.agregarAlCarrito('${producto.id}')"
                    ${sinStock ? 'disabled title="Sin stock disponible"' : `title="Agregar 1 unidad de ${this.escapeHtml(producto.name)}"`}>
                    <div class="quick-prod-top">
                        <span class="quick-prod-name">${this.escapeHtml(producto.name)}</span>
                        ${badgeHtml}
                    </div>
                    <div class="quick-prod-bottom">
                        <span class="quick-prod-stock ${stockBajo ? 'stock-low' : ''}">
                            <i class="fas fa-box"></i> ${stock}
                        </span>
                        <span class="quick-prod-price">
                            ${window.formatCurrency ? window.formatCurrency(producto.price || 0) : `Bs. ${producto.price}`}
                        </span>
                    </div>
                </button>
            `;
        }).join('');
    },

    renderSearchResults(productos, searchQuery = '') {
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
            const priority = ProductoService.getPriorityStatus(producto);

            const priorityBadge = priority.isUrgent
                ? `<span class="badge-priority badge-urgent" title="${priority.label}"><i class="fas fa-fire"></i> ${priority.label}</span>`
                : (priority.isPromo ? `<span class="badge-priority badge-promo"><i class="fas fa-tag"></i> Promo</span>` : '');

            return `
                <div class="product-card ${priority.isUrgent ? 'product-card-urgent' : ''}" data-id="${producto.id}">
                    <div class="product-info">
                        <div class="product-name">
                            ${this.highlightMatch(producto.name, searchQuery)}
                            ${priorityBadge}
                        </div>
                        <div class="product-details">
                            <span class="product-sku">SKU: ${this.highlightMatch(producto.sku || 'N/A', searchQuery)}</span>
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
        document.getElementById('modalPaymentMethod').textContent = paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia / QR';

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
    },

    mostrarModalCorte(datos, cajeroNombre, esAdmin = false, modoActivo = 'personal') {
        const modal = document.getElementById('modalCierreCaja');
        if (!modal) return;

        const modoContainer = document.getElementById('corteModoContainer');
        const btnPersonal = document.getElementById('btnCorteModoPersonal');
        const btnGeneral = document.getElementById('btnCorteModoGeneral');

        if (modoContainer) {
            modoContainer.style.display = esAdmin ? 'flex' : 'none';
        }

        if (btnPersonal && btnGeneral) {
            if (modoActivo === 'personal') {
                btnPersonal.style.background = 'white';
                btnPersonal.style.color = '#0284c7';
                btnPersonal.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                btnGeneral.style.background = 'transparent';
                btnGeneral.style.color = '#64748b';
                btnGeneral.style.boxShadow = 'none';
            } else {
                btnGeneral.style.background = 'white';
                btnGeneral.style.color = '#0284c7';
                btnGeneral.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                btnPersonal.style.background = 'transparent';
                btnPersonal.style.color = '#64748b';
                btnPersonal.style.boxShadow = 'none';
            }
        }

        const subDatos = datos[modoActivo] || datos;
        const nombreVisual = modoActivo === 'general' 
            ? '🏢 Toda la Farmacia (Todos los cajeros)' 
            : `${cajeroNombre} (Tus ventas)`;

        document.getElementById('cierreCajeroNombre').textContent = nombreVisual;
        const ahora = new Date();
        document.getElementById('cierreFechaHora').textContent = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('cierreTotalEfectivo').textContent = window.formatCurrency(subDatos.efectivo || 0);
        document.getElementById('cierreTotalTransferencia').textContent = window.formatCurrency(subDatos.transferencia || 0);
        document.getElementById('cierreTotalTarjeta').textContent = window.formatCurrency(subDatos.tarjeta || 0);
        document.getElementById('cierreTotalTickets').textContent = subDatos.totalTickets || 0;
        document.getElementById('cierreTotalGeneral').textContent = window.formatCurrency(subDatos.total || 0);

        // Desglose por categorías
        const catList = document.getElementById('cierreCategoriasList');
        const catCounter = document.getElementById('cierreTotalCategoriasContador');
        if (catList) {
            const cats = Object.entries(subDatos.porCategoria || {});
            if (cats.length === 0) {
                catList.innerHTML = '<span style="font-size: 0.82rem; color: #94a3b8; font-style: italic;">Sin ventas registradas en categorías</span>';
                if (catCounter) catCounter.textContent = '0 categorías';
            } else {
                if (catCounter) catCounter.textContent = `${cats.length} categoría${cats.length > 1 ? 's' : ''}`;
                cats.sort((a, b) => b[1] - a[1]);
                catList.innerHTML = cats.map(([catName, monto]) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; border-radius: 6px; background: white; border: 1px solid #e2e8f0; font-size: 0.82rem;">
                        <span style="color: #334155; font-weight: 500;">${catName}</span>
                        <strong style="color: #0284c7;">${window.formatCurrency(monto)}</strong>
                    </div>
                `).join('');
            }
        }

        modal.style.display = 'flex';
    },

    ocultarModalCorte() {
        const modal = document.getElementById('modalCierreCaja');
        if (modal) modal.style.display = 'none';
    },

    imprimirCorteTicket(datos, cajeroNombre, modoActivo = 'personal') {
        const subDatos = datos[modoActivo] || datos;
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true });
        const subtitulo = modoActivo === 'general' ? 'CORTE GENERAL DE FARMACIA' : 'CORTE INDIVIDUAL DE TURNO';
        const cajeroTexto = modoActivo === 'general' ? 'Todos los Cajeros' : cajeroNombre;

        const categorias = Object.entries(subDatos.porCategoria || {});
        let categoriasHTML = '';
        if (categorias.length > 0) {
            categorias.sort((a, b) => b[1] - a[1]);
            categoriasHTML = `
                <div class="receipt-divider"></div>
                <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Por Categorías:</div>
                ${categorias.map(([cat, m]) => `
                    <div class="receipt-info-row" style="font-size: 10px;">
                        <span>${cat}:</span><span>${window.formatCurrency(m)}</span>
                    </div>
                `).join('')}
            `;
        }

        const ticketHTML = `
            <div class="receipt-header">
                <div class="receipt-logo"><img src="img/logo-servisalud.png" alt="ServiSalud"></div>
                <div class="receipt-title">FARMACIA SERVISALUD</div>
                <div class="receipt-subtitle">${subtitulo}</div>
            </div>
            <div class="receipt-info">
                <div class="receipt-info-row"><span class="receipt-info-label">Fecha:</span><span>${fecha} - ${hora}</span></div>
                <div class="receipt-info-row"><span class="receipt-info-label">Alcance:</span><span>${cajeroTexto}</span></div>
                <div class="receipt-info-row"><span class="receipt-info-label">Tickets:</span><span>${subDatos.totalTickets}</span></div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-totals">
                <div class="receipt-total-row"><span>Efectivo:</span><strong>${window.formatCurrency(subDatos.efectivo)}</strong></div>
                <div class="receipt-total-row"><span>Transferencia / QR:</span><strong>${window.formatCurrency(subDatos.transferencia)}</strong></div>
                <div class="receipt-total-row"><span>Tarjeta:</span><strong>${window.formatCurrency(subDatos.tarjeta)}</strong></div>
                ${categoriasHTML}
                <div class="receipt-divider"></div>
                <div class="receipt-total-row main"><span>TOTAL CAJA:</span><strong>${window.formatCurrency(subDatos.total)}</strong></div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-footer" style="margin-top: 25px;">
                <div style="border-top: 1px solid #000; width: 80%; margin: 40px auto 5px; text-align: center; font-size: 11px;">Firma del Responsable</div>
            </div>`;

        const printContainer = document.getElementById('printReceipt');
        printContainer.innerHTML = ticketHTML;
        printContainer.style.display = 'block';
        setTimeout(() => {
            window.print();
            setTimeout(() => printContainer.style.display = 'none', 100);
        }, 100);
    }
};