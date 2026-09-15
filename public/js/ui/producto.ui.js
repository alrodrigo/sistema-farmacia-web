// public/js/ui/producto.ui.js
import { ModalUI } from './modal.ui.js';
import { ProductoService } from '../services/producto.service.js';

export const ProductoUI = {
    renderSkeleton(filas = 5) {
        const tbody = document.getElementById('productosTableBody');
        if (!tbody) return;
        tbody.innerHTML = Array(filas).fill(0).map(() => `
            <tr class="skeleton-row">
                <td><div class="skeleton-line" style="width: 70px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 160px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 100px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 100px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 40px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 40px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 60px; height: 16px;"></div></td>
                <td><div class="skeleton-line" style="width: 80px; height: 20px; border-radius: 12px;"></div></td>
                <td class="text-center"><div class="skeleton-line" style="width: 70px; height: 24px; margin: 0 auto;"></div></td>
            </tr>
        `).join('');
    },

    renderTable(productos, paginaActual, productosPorPagina, categoriasMap, proveedoresMap, canManage = false) {
        const tbody = document.getElementById('productosTableBody');
        if (!tbody) return;

        const inicio = (paginaActual - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        const productosActuales = productos.slice(inicio, fin);

        if (productosActuales.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>No se encontraron productos</h3>
                            <p>Intenta ajustar los filtros o agrega nuevos productos</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = productosActuales.map(producto => {
            const categoriaNombre = producto.category && categoriasMap[producto.category]
                ? (categoriasMap[producto.category].nombre || categoriasMap[producto.category].name || 'Sin nombre')
                : (producto.category || 'Sin categoría');

            const proveedorNombre = producto.supplier && proveedoresMap[producto.supplier]
                ? (proveedoresMap[producto.supplier].nombre || proveedoresMap[producto.supplier].name || 'Sin nombre')
                : (producto.supplier || 'Sin proveedor');

            const canEdit = typeof canManage === 'boolean' ? canManage : (canManage === 'admin');
            const safeName = encodeURIComponent(producto.name || '');
            const botonesAccion = canEdit ? `
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-action="ver" data-id="${producto.id}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" data-action="editar" data-id="${producto.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-action="eliminar" data-id="${producto.id}" data-name="${safeName}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : `
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-action="ver" data-id="${producto.id}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;

            const priority = ProductoService.getPriorityStatus(producto);
            const priorityBadge = priority.isUrgent
                ? `<span class="badge badge-danger" title="${priority.label}" style="font-size: 0.7rem; padding: 2px 6px; margin-left: 6px; vertical-align: middle;"><i class="fas fa-fire"></i> ${priority.label}</span>`
                : (priority.isPromo ? `<span class="badge badge-warning" style="font-size: 0.7rem; padding: 2px 6px; margin-left: 6px; vertical-align: middle;"><i class="fas fa-tag"></i> Promo</span>` : '');

            const isFav = producto.is_favorite === true;
            const starIcon = isFav ? 'fas fa-star' : 'far fa-star';
            const starColor = isFav ? '#f59e0b' : '#cbd5e1';
            const starTitle = isFav ? 'Fijado en mostrador rápido (clic para quitar)' : 'Fijar en mostrador rápido (clic para fijar)';
            const starButton = canManage ? `
                <button type="button" class="btn-toggle-favorite" data-id="${producto.id}" data-fav="${isFav}" title="${starTitle}" style="background: none; border: none; cursor: pointer; padding: 2px 4px; margin-right: 6px; font-size: 0.95rem; vertical-align: middle; transition: transform 0.15s ease;">
                    <i class="${starIcon}" style="color: ${starColor};"></i>
                </button>
            ` : (isFav ? `<i class="fas fa-star" style="color: #f59e0b; margin-right: 6px; font-size: 0.85rem;" title="En mostrador rápido"></i>` : '');

            return `
            <tr data-id="${producto.id}">
                <td><strong>${producto.sku || 'N/A'}</strong></td>
                <td>
                    <div style="display: flex; align-items: center;">
                        ${starButton}
                        <span>${producto.name}</span>
                        ${priorityBadge}
                    </div>
                </td>
                <td>${categoriaNombre}</td>
                <td>${proveedorNombre}</td>
                <td><strong>${producto.current_stock || 0}</strong></td>
                <td>${producto.min_stock || 0}</td>
                <td><strong>${formatCurrency(producto.price || 0)}</strong></td>
                <td>${this.obtenerBadgeStock(producto)}</td>
                <td class="text-center">${botonesAccion}</td>
            </tr>
            `;
        }).join('');
    },

    obtenerBadgeStock(producto) {
        const stock = producto.current_stock || 0;
        const minStock = producto.min_stock || 0;
        if (stock === 0) return '<span class="badge badge-danger">Sin stock</span>';
        if (stock < minStock) return '<span class="badge badge-warning">Stock bajo</span>';
        return '<span class="badge badge-success">Normal</span>';
    },

    renderStats(productosFiltrados, todosLosProductos) {
        document.getElementById('totalProductos').textContent = productosFiltrados.length;

        const valorTotal = productosFiltrados.reduce((sum, p) => sum + (p.current_stock * (p.cost || 0) || 0), 0);
        document.getElementById('valorInventario').textContent = formatCurrency(valorTotal);

        const stockBajo = productosFiltrados.filter(p => p.current_stock < p.min_stock).length;
        document.getElementById('stockBajo').textContent = stockBajo;

        const categoriasUnicas = [...new Set(todosLosProductos.map(p => p.category).filter(c => c))];
        document.getElementById('totalCategorias').textContent = categoriasUnicas.length;
    },

    renderPagination(paginaActual, totalFiltrados, productosPorPagina) {
        const totalPaginas = Math.ceil(totalFiltrados / productosPorPagina);
        document.getElementById('paginationInfo').textContent = `Página ${paginaActual} de ${totalPaginas || 1}`;
        document.getElementById('btnPrevPage').disabled = paginaActual === 1;
        document.getElementById('btnNextPage').disabled = paginaActual === totalPaginas || totalPaginas === 0;
    },

    renderSelectOptions(selectId, dataMap, placeholder) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = `<option value="">${placeholder}</option>`;

        const sorted = Object.values(dataMap).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        sorted.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nombre;
            select.appendChild(option);
        });
        select.value = currentValue;
    },

    openModal(modo, producto = null) {
        const modal = document.getElementById('productoModal');
        const form = document.getElementById('productoForm');
        form.reset();
        this.limpiarErrores();

        const titleText = document.getElementById('modalTitleText');
        const btnGuardar = document.getElementById('btnGuardar');
        const inputs = form.querySelectorAll('input, select, textarea');

        if (modo === 'ver') {
            titleText.textContent = 'Ver Producto';
            btnGuardar.style.display = 'none';
            inputs.forEach(i => i.disabled = true);
            this.llenarFormulario(producto);
        } else if (modo === 'editar') {
            titleText.textContent = 'Editar Producto';
            btnGuardar.style.display = 'block';
            btnGuardar.textContent = 'Actualizar Producto';
            inputs.forEach(i => i.disabled = false);
            this.llenarFormulario(producto);
        } else {
            titleText.textContent = 'Nuevo Producto';
            btnGuardar.style.display = 'block';
            btnGuardar.textContent = 'Guardar Producto';
            inputs.forEach(i => i.disabled = false);
            document.getElementById('margenGanancia').value = '0%';
            const inputPrioridad = document.getElementById('inputPrioridad');
            if (inputPrioridad) inputPrioridad.value = 'auto';
        }

        ModalUI.open('productoModal');
    },

    closeModal() {
        ModalUI.close('productoModal', true);
        this.limpiarErrores();
    },

    llenarFormulario(producto) {
        document.getElementById('inputNombre').value = producto.name || '';
        document.getElementById('inputSKU').value = producto.sku || '';
        document.getElementById('inputCategoria').value = producto.category || '';
        document.getElementById('inputProveedor').value = producto.supplier || '';
        document.getElementById('inputCosto').value = producto.cost || '';
        document.getElementById('inputPrecio').value = producto.price || '';
        document.getElementById('inputPrecioCaja').value = producto.price_per_box || '';
        document.getElementById('inputStockActual').value = producto.current_stock || 0;
        document.getElementById('inputStockMinimo').value = producto.min_stock || 0;
        document.getElementById('inputFechaVencimiento').value = this.formatearFechaVencimiento(producto.expiration_date);
        const inputPrioridad = document.getElementById('inputPrioridad');
        if (inputPrioridad) inputPrioridad.value = producto.priority_flag || 'auto';
        document.getElementById('inputDescripcion').value = producto.description || '';
    },

    formatearFechaVencimiento(valorFecha) {
        const fechaReal = ProductoService.parseExpirationDate(valorFecha);
        if (!fechaReal) return '';
        const año = fechaReal.getFullYear();
        const mes = String(fechaReal.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaReal.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    },

    mostrarError(inputId, mensaje) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const formGroup = input.parentElement;
        formGroup.classList.add('error');
        const errorSpan = formGroup.querySelector('.error-message');
        if (errorSpan) errorSpan.textContent = mensaje;
    },

    limpiarErrores() {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
            const errorSpan = group.querySelector('.error-message');
            if (errorSpan) errorSpan.textContent = '';
        });
    },

    setLoading(isLoading) {
        const btn = document.getElementById('btnGuardar');
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i> Guardando...' : '<i class="fas fa-save"></i> Guardar';
    },

    mostrarErrorTabla(mensaje) {
        const tbody = document.getElementById('productosTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 40px; color: #c62828;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 15px;"></i><br>
                        <strong>${mensaje}</strong>
                    </td>
                </tr>
            `;
        }
    }
};