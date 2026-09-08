// public/js/ui/categoria.ui.js

export const CategoriaUI = {
    renderGrid(categorias, onEdit, onDelete) {
        const grid = document.getElementById('categoriasGrid');
        const emptyState = document.getElementById('emptyState');

        if (!categorias || categorias.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        grid.innerHTML = ''; // Limpiar grilla

        categorias.forEach(cat => {
            const div = document.createElement('div');
            div.className = `categoria-card ${cat.activa !== false ? '' : 'inactive'}`;
            div.style.setProperty('--cat-color', cat.color || '#6a5acd');

            div.innerHTML = `
                <div class="cat-top">
                    <div class="cat-icon"><i class="fas ${cat.icono || 'fa-tag'}"></i></div>
                    <span class="cat-badge ${cat.activa !== false ? 'active' : 'inactive'}">
                        <i class="fas fa-${cat.activa !== false ? 'check' : 'pause'}"></i>
                        ${cat.activa !== false ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                <div class="cat-body">
                    <h3>${cat.nombre}</h3>
                    <p>${cat.descripcion || 'Sin descripción'}</p>
                </div>
                <div class="cat-footer">
                    <div class="cat-count">
                        <i class="fas fa-box"></i> <span>${cat.productosCount || 0} productos</span>
                    </div>
                    <div class="cat-actions">
                        <button class="cat-btn edit" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="cat-btn delete" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;

            // Asignar eventos de forma limpia, sin "onclick" en el string HTML
            div.querySelector('.edit').addEventListener('click', () => onEdit(cat.id));
            div.querySelector('.delete').addEventListener('click', () => onDelete(cat.id, cat.nombre));

            grid.appendChild(div);
        });
    },

    updateStats(totalCat, activasCat, totalProd) {
        document.getElementById('totalCategorias').textContent = totalCat;
        document.getElementById('categoriasActivas').textContent = activasCat;
        document.getElementById('totalProductos').textContent = totalProd;
    },

    openModal(categoria = null) {
        const isEdit = !!categoria;
        document.getElementById('modalTitle').innerHTML = isEdit ? '<i class="fas fa-edit"></i> Editar Categoría' : '<i class="fas fa-tag"></i> Nueva Categoría';

        document.getElementById('categoriaId').value = isEdit ? categoria.id : '';
        document.getElementById('nombreCategoria').value = isEdit ? categoria.nombre : '';
        document.getElementById('descripcionCategoria').value = isEdit ? (categoria.descripcion || '') : '';
        document.getElementById('colorCategoria').value = isEdit ? (categoria.color || '#6a5acd') : '#6a5acd';
        document.getElementById('colorHex').textContent = isEdit ? (categoria.color || '#6a5acd') : '#6a5acd';
        document.getElementById('iconoCategoria').value = isEdit ? (categoria.icono || 'fa-tag') : 'fa-tag';
        document.getElementById('activaCategoria').checked = isEdit ? (categoria.activa !== false) : true;

        document.getElementById('modalCategoria').classList.add('active');
    },

    closeModal() {
        document.getElementById('modalCategoria').classList.remove('active');
        document.getElementById('formCategoria').reset();
    },

    getFormData() {
        const nombreInput = document.getElementById('nombreCategoria');
        const nombre = nombreInput.value.trim();

        if (!nombre || nombre.length < 2 || nombre.length > 50) {
            alert('⚠️ El nombre es obligatorio (entre 2 y 50 caracteres).');
            nombreInput.focus();
            return null;
        }

        return {
            id: document.getElementById('categoriaId').value,
            nombre: nombre,
            descripcion: document.getElementById('descripcionCategoria').value.trim(),
            color: document.getElementById('colorCategoria').value,
            icono: document.getElementById('iconoCategoria').value,
            activa: document.getElementById('activaCategoria').checked
        };
    }
};