// public/js/ui/producto.ui.js
export const ProductoUI = {
    renderTable(productos, paginaActual, productosPorPagina, categoriasMap, proveedoresMap, role) {
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
                ? categoriasMap[producto.category].nombre
                : (producto.category || 'Sin categoría');

            const proveedorNombre = producto.supplier && proveedoresMap[producto.supplier]
                ? proveedoresMap[producto.supplier].nombre
                : (producto.supplier || 'Sin proveedor');

            const isAdmin = role === 'admin';
            const botonesAccion = isAdmin ? `
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="window.verProducto('${producto.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="window.editarProducto('${producto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="window.eliminarProducto('${producto.id}', '${producto.name}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : `
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="window.verProducto('${producto.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;

            return `
            <tr data-id="${producto.id}">
                <td><strong>${producto.sku || 'N/A'}</strong></td>
                <td>${producto.name}</td>
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
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        document.getElementById('productoModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            document.getElementById('productoForm').reset();
            this.limpiarErrores();
        }, 300);
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
        document.getElementById('inputDescripcion').value = producto.description || '';
    },

    formatearFechaVencimiento(valorFecha) {
        if (!valorFecha) return '';
        let fechaReal;
        if (typeof valorFecha.toDate === 'function') fechaReal = valorFecha.toDate();
        else if (valorFecha.seconds) fechaReal = new Date(valorFecha.seconds * 1000);
        else fechaReal = new Date(valorFecha);

        if (isNaN(fechaReal.getTime())) return '';
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