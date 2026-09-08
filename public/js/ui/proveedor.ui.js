// public/js/ui/proveedor.ui.js
export const ProveedorUI = {
    renderGrid(proveedores) {
        const grid = document.getElementById('proveedoresGrid');
        const emptyState = document.getElementById('emptyState');

        if (proveedores.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        grid.innerHTML = proveedores.map(prov => `
            <div class="proveedor-card ${prov.activo === false ? 'inactive' : ''}">
                <span class="proveedor-badge ${prov.activo === false ? 'inactive' : 'active'}">
                    ${prov.activo === false ? 'Inactivo' : 'Activo'}
                </span>
                
                <div class="proveedor-header">
                    <div class="proveedor-icon">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="proveedor-info">
                        <h3>${prov.nombre}</h3>
                        ${prov.pais ? `<div class="pais"><i class="fas fa-globe"></i> ${prov.pais}</div>` : ''}
                    </div>
                </div>
                
                ${prov.telefono || prov.email || prov.direccion || prov.sitioWeb ? `
                    <div class="proveedor-details">
                        ${prov.telefono ? `
                            <div class="proveedor-detail">
                                <i class="fas fa-phone"></i>
                                <span>${prov.telefono}</span>
                            </div>
                        ` : ''}
                        ${prov.email ? `
                            <div class="proveedor-detail">
                                <i class="fas fa-envelope"></i>
                                <a href="mailto:${prov.email}">${prov.email}</a>
                            </div>
                        ` : ''}
                        ${prov.direccion ? `
                            <div class="proveedor-detail">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${prov.direccion}</span>
                            </div>
                        ` : ''}
                        ${prov.sitioWeb ? `
                            <div class="proveedor-detail">
                                <i class="fas fa-link"></i>
                                <a href="${prov.sitioWeb}" target="_blank">Sitio web</a>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="proveedor-stats">
                    <div class="proveedor-stat">
                        <strong>${prov.total_productos || 0}</strong>
                        <span>Productos</span>
                    </div>
                </div>
                
                <div class="proveedor-actions">
                    <button class="btn-edit" onclick="window.editarProveedor('${prov.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="window.confirmarEliminar('${prov.id}', '${prov.nombre}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderStats(proveedores) {
        document.getElementById('totalProveedores').textContent = proveedores.length;
        document.getElementById('proveedoresActivos').textContent = proveedores.filter(p => p.activo !== false).length;
        document.getElementById('paisesUnicos').textContent = [...new Set(proveedores.map(p => p.pais).filter(p => p))].length;
        document.getElementById('productosAsociados').textContent = proveedores.reduce((sum, p) => sum + (p.total_productos || 0), 0);
    },

    renderFilters(proveedores) {
        const paises = [...new Set(proveedores.map(p => p.pais).filter(p => p))].sort();
        const selectPais = document.getElementById('filtroPais');
        selectPais.innerHTML = '<option value="todos">Todos los países</option>';
        paises.forEach(pais => {
            selectPais.innerHTML += `<option value="${pais}">${pais}</option>`;
        });
    },

    openModal(proveedor = null) {
        const modal = document.getElementById('modalProveedor');
        const form = document.getElementById('formProveedor');
        const title = document.getElementById('modalTitle');

        form.reset();

        if (proveedor) {
            title.innerHTML = '<i class="fas fa-edit"></i> Editar Proveedor';
            document.getElementById('proveedorId').value = proveedor.id;
            document.getElementById('inputNombre').value = proveedor.nombre || '';
            document.getElementById('inputPais').value = proveedor.pais || '';
            document.getElementById('inputTelefono').value = proveedor.telefono || '';
            document.getElementById('inputEmail').value = proveedor.email || '';
            document.getElementById('inputDireccion').value = proveedor.direccion || '';
            document.getElementById('inputSitioWeb').value = proveedor.sitioWeb || '';
            document.getElementById('inputNotas').value = proveedor.notas || '';
            document.getElementById('inputActivo').checked = proveedor.activo !== false;
        } else {
            title.innerHTML = '<i class="fas fa-truck"></i> Nuevo Proveedor';
            document.getElementById('proveedorId').value = '';
            document.getElementById('inputActivo').checked = true;
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('modalProveedor').classList.remove('active');
        document.getElementById('formProveedor').reset();
    },

    setLoading(isLoading) {
        const btn = document.getElementById('btnGuardar');
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalText || '<i class="fas fa-save"></i> Guardar Proveedor';
        }
    }
};