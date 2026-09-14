// public/js/ui/dashboard.ui.js
export const DashboardUI = {
    updateUser(displayName, roleText) {
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');
        if (userNameElement) userNameElement.textContent = displayName;
        if (userRoleElement) userRoleElement.textContent = roleText;
    },

    renderKpis(totalProductos, ventasHoy, ingresosHoy, role, salidaPrioritaria = 0, canViewReports = false) {
        document.getElementById('totalProductos').textContent = totalProductos;

        const elPrioritaria = document.getElementById('salidaPrioritariaCount');
        if (elPrioritaria) elPrioritaria.textContent = salidaPrioritaria;

        const cardVentas = document.getElementById('cardVentasHoy');
        const cardIngresos = document.getElementById('cardIngresosHoy');

        // Las métricas de ventas y dinero hoy solo son visibles si tiene permiso ver_reportes o es admin
        if (role === 'admin' || canViewReports) {
            if (cardVentas) cardVentas.style.display = 'flex';
            if (cardIngresos) cardIngresos.style.display = 'flex';

            document.getElementById('ventasHoy').textContent = ventasHoy;
            const formatted = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(ingresosHoy || 0);
            document.getElementById('ingresosHoy').textContent = ingresosHoy === null ? 'Bs. -' : formatted;
        } else {
            if (cardVentas) cardVentas.style.display = 'none';
            if (cardIngresos) cardIngresos.style.display = 'none';
        }
    },

    renderQuickActions(user) {
        const canVentas = user.role === 'admin' || user.permissions?.includes('realizar_ventas');
        const canGestionarProd = user.role === 'admin' || user.permissions?.includes('gestionar_productos');
        const canVerProd = canGestionarProd || user.permissions?.includes('ver_productos');
        const canReportes = user.role === 'admin' || user.permissions?.includes('ver_reportes');

        const btnVentas = document.getElementById('btnActionVentas');
        const btnProd = document.getElementById('btnActionProductos');
        const iconProd = document.getElementById('iconActionProductos');
        const textProd = document.getElementById('textActionProductos');
        const btnReportes = document.getElementById('btnActionReportes');
        const btnQR = document.getElementById('btnScanQR');

        if (btnVentas) btnVentas.style.display = canVentas ? 'flex' : 'none';

        if (btnProd) {
            if (canGestionarProd) {
                btnProd.style.display = 'flex';
                if (iconProd) iconProd.className = 'fas fa-plus-circle';
                if (textProd) textProd.textContent = 'Agregar Producto';
            } else if (canVerProd) {
                btnProd.style.display = 'flex';
                if (iconProd) iconProd.className = 'fas fa-pills';
                if (textProd) textProd.textContent = 'Ver Catálogo';
            } else {
                btnProd.style.display = 'none';
            }
        }

        if (btnReportes) btnReportes.style.display = canReportes ? 'flex' : 'none';
        if (btnQR) btnQR.style.display = (canVentas || canVerProd) ? 'flex' : 'none';
    },

    renderStockBajo(productosPaginados, totalFiltrados, totalGlobal, paginaActual = 1, porPagina = 5, canManage = false) {
        const section = document.getElementById('stockBajoSection');
        const badge = document.getElementById('badgeStockBajo');
        const tbody = document.getElementById('stockBajoTableBody');

        if (!section || !tbody) return;

        // Si el sistema no tiene ningún producto bajo de stock, ocultamos todo
        if (totalGlobal === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (badge) badge.textContent = totalFiltrados;

        // Si el filtro no devuelve resultados, mostramos la fila vacía (UX mejorado)
        if (totalFiltrados === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 20px; color: #666;">No hay productos con stock bajo para este laboratorio.</td></tr>`;
            const pag = document.getElementById('stockBajoPagination');
            if (pag) pag.style.display = 'none';
            return;
        }

        tbody.innerHTML = productosPaginados.map(producto => `
            <tr>
                <td><strong>${producto.name}</strong></td>
                <td>${producto.supplier}</td>
                <td><span class="badge-danger">${producto.currentStock} unidades</span></td>
                <td>${producto.minStock} unidades</td>
                <td><strong style="color: var(--danger-color);">Faltan ${producto.faltante} unidades</strong></td>
                <td>
                    <button class="btn-small" data-action="actualizar-producto" data-id="${producto.id}">
                        <i class="fas fa-${canManage ? 'edit' : 'eye'}"></i> ${canManage ? 'Actualizar' : 'Ver'}
                    </button>
                </td>
            </tr>
        `).join('');

        // Actualizar controles de paginación
        const totalPaginas = Math.ceil(totalFiltrados / porPagina) || 1;
        const paginationInfo = document.getElementById('stockBajoPaginationInfo');
        const btnPrev = document.getElementById('btnPrevStockBajo');
        const btnNext = document.getElementById('btnNextStockBajo');
        const paginationContainer = document.getElementById('stockBajoPagination');

        if (paginationInfo) {
            paginationInfo.textContent = `Página ${paginaActual} de ${totalPaginas} (${totalFiltrados} productos)`;
        }
        if (btnPrev) btnPrev.disabled = paginaActual <= 1;
        if (btnNext) btnNext.disabled = paginaActual >= totalPaginas;
        if (paginationContainer) {
            paginationContainer.style.display = totalFiltrados > porPagina ? 'flex' : 'none';
        }
    },

    renderFiltroLaboratorios(laboratorios) {
        const select = document.getElementById('filtroLabStockBajo');
        if (!select) return;

        select.innerHTML = '<option value="TODOS">Todos los Laboratorios</option>';
        laboratorios.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab;
            option.textContent = lab;
            select.appendChild(option);
        });
    },

    renderFiltroLaboratoriosExpiring(laboratorios) {
        const select = document.getElementById('filtroLabExpiring');
        if (!select) return;

        select.innerHTML = '<option value="TODOS">Todos los Laboratorios</option>';
        laboratorios.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab;
            option.textContent = lab;
            select.appendChild(option);
        });
    },

    renderProximosVencer(productosPaginados, totalFiltrados, totalGlobal, paginaActual = 1, porPagina = 5, canManage = false) {
        const section = document.getElementById('expiringSection');
        const badge = document.getElementById('badgeExpiring');
        const tbody = document.getElementById('expiringTableBody');

        if (!section || !tbody) return;

        if (totalGlobal === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (badge) badge.textContent = totalFiltrados;

        if (totalFiltrados === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 25px; color: #64748b;"><i class="fas fa-search" style="margin-right: 6px;"></i> No se encontraron productos próximos a vencer con los filtros seleccionados.</td></tr>`;
            const pag = document.getElementById('expiringPagination');
            if (pag) pag.style.display = 'none';
            return;
        }

        tbody.innerHTML = productosPaginados.map(producto => {
            let badgeClass = 'badge-warning';
            let diasTexto = `${producto.diasRestantes} días`;

            if (producto.diasRestantes < 0) {
                badgeClass = 'badge-danger';
                diasTexto = 'VENCIDO';
            } else if (producto.diasRestantes === 0) {
                badgeClass = 'badge-danger';
                diasTexto = 'Vence HOY';
            } else if (producto.diasRestantes <= 7) {
                badgeClass = 'badge-danger';
            } else if (producto.diasRestantes <= 15) {
                badgeClass = 'badge-warning';
            }

            const fechaFormateada = producto.expirationDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

            return `
                <tr>
                    <td><strong>${producto.name}</strong></td>
                    <td><code>${producto.sku}</code></td>
                    <td>${producto.supplier}</td>
                    <td>${fechaFormateada}</td>
                    <td><span class="${badgeClass}">${diasTexto}</span></td>
                    <td>${producto.stock} unidades</td>
                    <td class="text-center">
                        <button class="btn-small" data-action="actualizar-producto" data-id="${producto.id}">
                            <i class="fas fa-${canManage ? 'edit' : 'eye'}"></i> ${canManage ? 'Actualizar' : 'Ver'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Actualizar controles de paginación
        const totalPaginas = Math.ceil(totalFiltrados / porPagina) || 1;
        const paginationInfo = document.getElementById('expiringPaginationInfo');
        const btnPrev = document.getElementById('btnPrevExpiring');
        const btnNext = document.getElementById('btnNextExpiring');
        const paginationContainer = document.getElementById('expiringPagination');

        if (paginationInfo) {
            paginationInfo.textContent = `Página ${paginaActual} de ${totalPaginas} (${totalFiltrados} productos)`;
        }
        if (btnPrev) btnPrev.disabled = paginaActual <= 1;
        if (btnNext) btnNext.disabled = paginaActual >= totalPaginas;
        if (paginationContainer) {
            paginationContainer.style.display = totalFiltrados > porPagina ? 'flex' : 'none';
        }
    }
};