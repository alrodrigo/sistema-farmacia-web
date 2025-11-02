// =====================================================
// ARCHIVO: productos.js
// PROPÓSITO: Lógica de la página de gestión de productos
// =====================================================

console.log('📦 Productos.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;
let todosLosProductos = []; // Todos los productos de Firestore
let productosFiltrados = []; // Productos después de aplicar filtros
let paginaActual = 1;
const productosPorPagina = 10;

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, iniciando página de productos...');
    
    // Verificar autenticación
    await verificarAutenticacion();
    
    // Configurar eventos
    configurarEventos();
    
    // Cargar datos iniciales
    await cargarDatosIniciales();
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
async function verificarAutenticacion() {
    console.log('🔐 Verificando autenticación...');
    
    return new Promise((resolve) => {
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Usuario autenticado:', user.email);
                
                try {
                    const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        currentUser = {
                            uid: user.uid,
                            email: user.email,
                            ...userDoc.data()
                        };
                        
                        // Mostrar nombre del usuario en el navbar
                        mostrarNombreUsuario();
                        resolve(true);
                    } else {
                        console.error('❌ Documento de usuario no encontrado');
                        redirectTo('index.html');
                    }
                } catch (error) {
                    console.error('❌ Error al obtener datos del usuario:', error);
                    redirectTo('index.html');
                }
            } else {
                console.log('❌ No hay usuario autenticado');
                redirectTo('index.html');
            }
        });
    });
}

// ===== 5. MOSTRAR NOMBRE DEL USUARIO =====
function mostrarNombreUsuario() {
    const userNameElement = document.getElementById('userName');
    
    if (currentUser && userNameElement) {
        const displayName = currentUser.first_name || currentUser.email;
        userNameElement.textContent = displayName;
        console.log('👤 Usuario mostrado:', displayName);
    }
}

// ===== 6. CONFIGURAR EVENTOS =====
function configurarEventos() {
    console.log('🔘 Configurando eventos...');
    
    // Botón de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }
    
    // Botón de menú móvil
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        // Toggle del menú
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
        
        // Cerrar sidebar al hacer click fuera (solo en móviles)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnToggle = menuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
        
        // Cerrar sidebar al cambiar de tamaño de ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
            }
        });
    }
    
    // Botón nuevo producto
    const btnNuevoProducto = document.getElementById('btnNuevoProducto');
    if (btnNuevoProducto) {
        btnNuevoProducto.addEventListener('click', abrirModalNuevo);
    }
    
    // Eventos del modal
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const modalOverlay = document.getElementById('modalOverlay');
    const productoForm = document.getElementById('productoForm');
    
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
    if (modalOverlay) modalOverlay.addEventListener('click', cerrarModal);
    if (productoForm) productoForm.addEventListener('submit', guardarProducto);
    
    // Calcular margen de ganancia en tiempo real
    const inputCosto = document.getElementById('inputCosto');
    const inputPrecio = document.getElementById('inputPrecio');
    
    if (inputCosto && inputPrecio) {
        inputCosto.addEventListener('input', calcularMargen);
        inputPrecio.addEventListener('input', calcularMargen);
    }
    
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltros);
    }
    
    // Filtros
    const filterCategoria = document.getElementById('filterCategoria');
    const filterProveedor = document.getElementById('filterProveedor');
    const filterStock = document.getElementById('filterStock');
    
    if (filterCategoria) filterCategoria.addEventListener('change', aplicarFiltros);
    if (filterProveedor) filterProveedor.addEventListener('change', aplicarFiltros);
    if (filterStock) filterStock.addEventListener('change', aplicarFiltros);
    
    // Botón limpiar filtros
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }
    
    // Paginación
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (btnPrevPage) btnPrevPage.addEventListener('click', paginaAnterior);
    if (btnNextPage) btnNextPage.addEventListener('click', paginaSiguiente);
    
    // Botones de exportar e imprimir
    const btnExportar = document.getElementById('btnExportar');
    const btnImprimir = document.getElementById('btnImprimir');
    
    if (btnExportar) {
        btnExportar.addEventListener('click', function() {
            alert('🚧 Exportar a Excel próximamente');
        });
    }
    
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            window.print();
        });
    }
}

// ===== 7. CERRAR SESIÓN =====
async function cerrarSesion() {
    console.log('🚪 Cerrando sesión...');
    
    try {
        await firebaseAuth.signOut();
        clearCurrentUser();
        console.log('✅ Sesión cerrada exitosamente');
        redirectTo('index.html');
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        alert('Error al cerrar sesión. Intenta nuevamente.');
    }
}

// ===== 8. CARGAR DATOS INICIALES =====
async function cargarDatosIniciales() {
    console.log('📊 Cargando datos iniciales...');
    
    try {
        // Cargar productos
        await cargarProductos();
        
        // Cargar filtros (categorías y proveedores únicos)
        cargarOpcionesFiltros();
        
        // Actualizar tarjetas informativas
        actualizarTarjetasInfo();
        
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        mostrarError('Error al cargar los datos. Por favor, recarga la página.');
    }
}

// ===== 9. CARGAR PRODUCTOS =====
async function cargarProductos() {
    console.log('📦 Cargando productos desde Firestore...');
    
    try {
        const snapshot = await firebaseDB.collection('products').get();
        
        todosLosProductos = [];
        snapshot.forEach(doc => {
            todosLosProductos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordenar por nombre
        todosLosProductos.sort((a, b) => a.name.localeCompare(b.name));
        
        // Inicialmente, productos filtrados = todos los productos
        productosFiltrados = [...todosLosProductos];
        
        console.log(`✅ ${todosLosProductos.length} productos cargados`);
        
        // Mostrar en la tabla
        mostrarProductos();
        
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        throw error;
    }
}

// ===== 10. MOSTRAR PRODUCTOS EN LA TABLA =====
function mostrarProductos() {
    const tbody = document.getElementById('productosTableBody');
    
    if (!tbody) return;
    
    // Calcular productos de la página actual
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosActuales = productosFiltrados.slice(inicio, fin);
    
    // Si no hay productos
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
    
    // Generar filas de la tabla
    tbody.innerHTML = productosActuales.map(producto => `
        <tr data-id="${producto.id}">
            <td><strong>${producto.sku || 'N/A'}</strong></td>
            <td>${producto.name}</td>
            <td>${producto.category || 'Sin categoría'}</td>
            <td>${producto.supplier || 'Sin proveedor'}</td>
            <td>
                <strong>${producto.current_stock || 0}</strong>
            </td>
            <td>${producto.min_stock || 0}</td>
            <td><strong>${formatCurrency(producto.price || 0)}</strong></td>
            <td>${obtenerBadgeStock(producto)}</td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="verProducto('${producto.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editarProducto('${producto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="eliminarProducto('${producto.id}', '${producto.name}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Actualizar paginación
    actualizarPaginacion();
    
    console.log(`📋 Mostrando ${productosActuales.length} productos (página ${paginaActual})`);
}

// ===== 11. OBTENER BADGE DE ESTADO DE STOCK =====
function obtenerBadgeStock(producto) {
    const stock = producto.current_stock || 0;
    const minStock = producto.min_stock || 0;
    
    if (stock === 0) {
        return '<span class="badge badge-danger">Sin stock</span>';
    } else if (stock < minStock) {
        return '<span class="badge badge-warning">Stock bajo</span>';
    } else {
        return '<span class="badge badge-success">Normal</span>';
    }
}

// ===== 12. APLICAR FILTROS =====
function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterCategoria = document.getElementById('filterCategoria').value;
    const filterProveedor = document.getElementById('filterProveedor').value;
    const filterStock = document.getElementById('filterStock').value;
    
    productosFiltrados = todosLosProductos.filter(producto => {
        // Filtro de búsqueda (nombre, SKU, barcode)
        const coincideBusqueda = !searchTerm || 
            producto.name.toLowerCase().includes(searchTerm) ||
            (producto.sku && producto.sku.toLowerCase().includes(searchTerm)) ||
            (producto.barcode && producto.barcode.includes(searchTerm));
        
        // Filtro de categoría
        const coincideCategoria = !filterCategoria || producto.category === filterCategoria;
        
        // Filtro de proveedor
        const coincideProveedor = !filterProveedor || producto.supplier === filterProveedor;
        
        // Filtro de stock
        let coincideStock = true;
        if (filterStock === 'bajo') {
            coincideStock = producto.current_stock < producto.min_stock;
        } else if (filterStock === 'normal') {
            coincideStock = producto.current_stock >= producto.min_stock && producto.current_stock < producto.min_stock * 2;
        } else if (filterStock === 'alto') {
            coincideStock = producto.current_stock >= producto.min_stock * 2;
        }
        
        return coincideBusqueda && coincideCategoria && coincideProveedor && coincideStock;
    });
    
    // Resetear a la primera página
    paginaActual = 1;
    
    // Mostrar productos filtrados
    mostrarProductos();
    
    // Actualizar tarjetas info
    actualizarTarjetasInfo();
    
    console.log(`🔍 Filtros aplicados: ${productosFiltrados.length} productos encontrados`);
}

// ===== 13. LIMPIAR FILTROS =====
function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterProveedor').value = '';
    document.getElementById('filterStock').value = '';
    
    aplicarFiltros();
}

// ===== 14. CARGAR OPCIONES DE FILTROS =====
function cargarOpcionesFiltros() {
    // Obtener categorías únicas
    const categorias = [...new Set(todosLosProductos.map(p => p.category).filter(c => c))];
    const selectCategoria = document.getElementById('filterCategoria');
    
    if (selectCategoria) {
        categorias.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            selectCategoria.appendChild(option);
        });
    }
    
    // Obtener proveedores únicos
    const proveedores = [...new Set(todosLosProductos.map(p => p.supplier).filter(s => s))];
    const selectProveedor = document.getElementById('filterProveedor');
    
    if (selectProveedor) {
        proveedores.sort().forEach(prov => {
            const option = document.createElement('option');
            option.value = prov;
            option.textContent = prov;
            selectProveedor.appendChild(option);
        });
    }
    
    console.log(`📋 Filtros cargados: ${categorias.length} categorías, ${proveedores.length} proveedores`);
}

// ===== 15. ACTUALIZAR TARJETAS INFORMATIVAS =====
function actualizarTarjetasInfo() {
    // Total de productos (filtrados)
    document.getElementById('totalProductos').textContent = productosFiltrados.length;
    
    // Valor total del inventario
    const valorTotal = productosFiltrados.reduce((sum, p) => {
        return sum + (p.current_stock * p.cost || 0);
    }, 0);
    document.getElementById('valorInventario').textContent = formatCurrency(valorTotal);
    
    // Productos con stock bajo
    const stockBajo = productosFiltrados.filter(p => p.current_stock < p.min_stock).length;
    document.getElementById('stockBajo').textContent = stockBajo;
    
    // Total de categorías únicas
    const categoriasUnicas = [...new Set(todosLosProductos.map(p => p.category).filter(c => c))];
    document.getElementById('totalCategorias').textContent = categoriasUnicas.length;
}

// ===== 16. PAGINACIÓN =====
function actualizarPaginacion() {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    
    // Actualizar info
    document.getElementById('paginationInfo').textContent = 
        `Página ${paginaActual} de ${totalPaginas}`;
    
    // Habilitar/deshabilitar botones
    document.getElementById('btnPrevPage').disabled = paginaActual === 1;
    document.getElementById('btnNextPage').disabled = paginaActual === totalPaginas || totalPaginas === 0;
}

function paginaAnterior() {
    if (paginaActual > 1) {
        paginaActual--;
        mostrarProductos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function paginaSiguiente() {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    if (paginaActual < totalPaginas) {
        paginaActual++;
        mostrarProductos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== 17. ACCIONES DE PRODUCTOS =====
function verProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    if (producto) {
        console.log('👁️ Ver producto:', producto);
        // Por ahora, abrimos el modal en modo edición para ver los detalles
        abrirModalEditar(producto);
    }
}

function editarProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    if (producto) {
        console.log('✏️ Editar producto:', producto);
        abrirModalEditar(producto);
    }
}

async function eliminarProducto(id, nombre) {
    console.log('🗑️ Intentando eliminar producto:', id, nombre);
    
    const confirmar = confirm(`¿Estás seguro de eliminar el producto:\n\n"${nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) {
        return;
    }
    
    try {
        await firebaseDB.collection('products').doc(id).delete();
        console.log('✅ Producto eliminado:', id);
        
        alert(`✅ Producto "${nombre}" eliminado correctamente`);
        
        // Recargar productos
        await cargarProductos();
        
    } catch (error) {
        console.error('❌ Error al eliminar producto:', error);
        alert('❌ Error al eliminar el producto. Verifica tus permisos.');
    }
}

// ===== 18. GESTIÓN DEL MODAL =====
let modoEdicion = false;
let productoEditandoId = null;

function abrirModalNuevo() {
    console.log('📝 Abriendo modal para nuevo producto');
    
    modoEdicion = false;
    productoEditandoId = null;
    
    // Cambiar título del modal
    document.getElementById('modalTitleText').textContent = 'Nuevo Producto';
    document.getElementById('btnGuardarText').textContent = 'Guardar Producto';
    
    // Limpiar formulario
    document.getElementById('productoForm').reset();
    limpiarErrores();
    
    // Mostrar modal
    document.getElementById('productoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function abrirModalEditar(producto) {
    console.log('✏️ Abriendo modal para editar producto:', producto.name);
    
    modoEdicion = true;
    productoEditandoId = producto.id;
    
    // Cambiar título del modal
    document.getElementById('modalTitleText').textContent = 'Editar Producto';
    document.getElementById('btnGuardarText').textContent = 'Actualizar Producto';
    
    // Llenar formulario con datos del producto
    document.getElementById('inputNombre').value = producto.name || '';
    document.getElementById('inputSKU').value = producto.sku || '';
    document.getElementById('inputBarcode').value = producto.barcode || '';
    document.getElementById('inputCategoria').value = producto.category || '';
    document.getElementById('inputProveedor').value = producto.supplier || '';
    document.getElementById('inputCosto').value = producto.cost || '';
    document.getElementById('inputPrecio').value = producto.price || '';
    document.getElementById('inputStockActual').value = producto.current_stock || 0;
    document.getElementById('inputStockMinimo').value = producto.min_stock || 0;
    document.getElementById('inputDescripcion').value = producto.description || '';
    
    // Calcular margen
    calcularMargen();
    
    limpiarErrores();
    
    // Mostrar modal
    document.getElementById('productoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    console.log('❌ Cerrando modal');
    
    document.getElementById('productoModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Limpiar después de la animación
    setTimeout(() => {
        document.getElementById('productoForm').reset();
        limpiarErrores();
        modoEdicion = false;
        productoEditandoId = null;
    }, 300);
}

// ===== 19. VALIDACIÓN DEL FORMULARIO =====
function validarFormulario() {
    let esValido = true;
    limpiarErrores();
    
    // Nombre
    const nombre = document.getElementById('inputNombre').value.trim();
    if (!nombre) {
        mostrarError('inputNombre', 'El nombre es obligatorio');
        esValido = false;
    } else if (nombre.length < 3) {
        mostrarError('inputNombre', 'El nombre debe tener al menos 3 caracteres');
        esValido = false;
    }
    
    // SKU
    const sku = document.getElementById('inputSKU').value.trim();
    if (!sku) {
        mostrarError('inputSKU', 'El SKU es obligatorio');
        esValido = false;
    }
    
    // Categoría
    const categoria = document.getElementById('inputCategoria').value;
    if (!categoria) {
        mostrarError('inputCategoria', 'Selecciona una categoría');
        esValido = false;
    }
    
    // Proveedor
    const proveedor = document.getElementById('inputProveedor').value;
    if (!proveedor) {
        mostrarError('inputProveedor', 'Selecciona un laboratorio');
        esValido = false;
    }
    
    // Costo
    const costo = parseFloat(document.getElementById('inputCosto').value);
    if (isNaN(costo) || costo < 0) {
        mostrarError('inputCosto', 'El costo debe ser un número válido');
        esValido = false;
    }
    
    // Precio
    const precio = parseFloat(document.getElementById('inputPrecio').value);
    if (isNaN(precio) || precio < 0) {
        mostrarError('inputPrecio', 'El precio debe ser un número válido');
        esValido = false;
    } else if (precio <= costo) {
        mostrarError('inputPrecio', 'El precio debe ser mayor al costo');
        esValido = false;
    }
    
    // Stock actual
    const stockActual = parseInt(document.getElementById('inputStockActual').value);
    if (isNaN(stockActual) || stockActual < 0) {
        mostrarError('inputStockActual', 'El stock debe ser un número válido');
        esValido = false;
    }
    
    // Stock mínimo
    const stockMinimo = parseInt(document.getElementById('inputStockMinimo').value);
    if (isNaN(stockMinimo) || stockMinimo < 0) {
        mostrarError('inputStockMinimo', 'El stock mínimo debe ser un número válido');
        esValido = false;
    }
    
    return esValido;
}

function mostrarError(inputId, mensaje) {
    const input = document.getElementById(inputId);
    const formGroup = input.parentElement;
    const errorSpan = formGroup.querySelector('.error-message');
    
    formGroup.classList.add('error');
    if (errorSpan) {
        errorSpan.textContent = mensaje;
    }
}

function limpiarErrores() {
    const formGroups = document.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        group.classList.remove('error');
        const errorSpan = group.querySelector('.error-message');
        if (errorSpan) {
            errorSpan.textContent = '';
        }
    });
}

// ===== 20. GUARDAR PRODUCTO =====
async function guardarProducto(event) {
    event.preventDefault();
    console.log('💾 Intentando guardar producto...');
    
    // Validar formulario
    if (!validarFormulario()) {
        console.log('❌ Formulario inválido');
        alert('⚠️ Por favor corrige los errores en el formulario');
        return;
    }
    
    // Deshabilitar botón de guardar
    const btnGuardar = document.getElementById('btnGuardar');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        // Recopilar datos del formulario
        const productoData = {
            name: document.getElementById('inputNombre').value.trim(),
            sku: document.getElementById('inputSKU').value.trim().toUpperCase(),
            barcode: document.getElementById('inputBarcode').value.trim() || null,
            category: document.getElementById('inputCategoria').value,
            supplier: document.getElementById('inputProveedor').value,
            cost: parseFloat(document.getElementById('inputCosto').value),
            price: parseFloat(document.getElementById('inputPrecio').value),
            current_stock: parseInt(document.getElementById('inputStockActual').value),
            min_stock: parseInt(document.getElementById('inputStockMinimo').value),
            description: document.getElementById('inputDescripcion').value.trim() || null,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: currentUser.uid
        };
        
        if (modoEdicion) {
            // Actualizar producto existente
            await firebaseDB.collection('products').doc(productoEditandoId).update(productoData);
            console.log('✅ Producto actualizado:', productoEditandoId);
            alert('✅ Producto actualizado correctamente');
        } else {
            // Crear nuevo producto
            productoData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            productoData.created_by = currentUser.uid;
            
            const docRef = await firebaseDB.collection('products').add(productoData);
            console.log('✅ Producto creado:', docRef.id);
            alert('✅ Producto creado correctamente');
        }
        
        // Cerrar modal y recargar productos
        cerrarModal();
        await cargarProductos();
        
    } catch (error) {
        console.error('❌ Error al guardar producto:', error);
        alert('❌ Error al guardar el producto. Verifica tus permisos.');
    } finally {
        // Rehabilitar botón
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
    }
}

// ===== 21. CALCULAR MARGEN DE GANANCIA =====
function calcularMargen() {
    const costo = parseFloat(document.getElementById('inputCosto').value) || 0;
    const precio = parseFloat(document.getElementById('inputPrecio').value) || 0;
    const margenInput = document.getElementById('margenGanancia');
    
    if (costo > 0 && precio > 0) {
        const margen = ((precio - costo) / costo * 100).toFixed(2);
        margenInput.value = `${margen}%`;
        
        // Cambiar color según el margen
        if (margen < 10) {
            margenInput.style.color = '#e53935';
        } else if (margen < 30) {
            margenInput.style.color = '#fb8c00';
        } else {
            margenInput.style.color = '#43a047';
        }
    } else {
        margenInput.value = '0%';
        margenInput.style.color = '#757575';
    }
}

// ===== 22. FUNCIONES AUXILIARES =====
function mostrarError(mensaje) {
    const tbody = document.getElementById('productosTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 40px; color: #c62828;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <br>
                    <strong>${mensaje}</strong>
                </td>
            </tr>
        `;
    }
}

console.log('✅ Productos.js completamente cargado');
