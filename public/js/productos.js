// =====================================================
// ARCHIVO: productos.js
// PROPÓSITO: Lógica de la página de gestión de productos
// =====================================================

// console.log('📦 Productos.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;
let todosLosProductos = []; // Todos los productos de Firestore
let productosFiltrados = []; // Productos después de aplicar filtros
let paginaActual = 1;
const productosPorPagina = 10;

// Caché de categorías y proveedores para lookups
let categoriasMap = {}; // { id: { nombre, color, icono, ... } }
let proveedoresMap = {}; // { id: { nombre, pais, ... } }

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
    // console.log('📄 DOM cargado, iniciando página de productos...');
    
    // Verificar autenticación
    await verificarAutenticacion();
    
    // Configurar eventos
    configurarEventos();
    
    // Cargar datos iniciales
    await cargarDatosIniciales();
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
async function verificarAutenticacion() {
    // console.log('🔐 Verificando autenticación...');
    
    return new Promise((resolve) => {
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // console.log('✅ Usuario autenticado:', user.email);
                
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
                        
                        // Actualizar menú según rol
                        actualizarMenuPorRol();
                        
                        // Aplicar restricciones de menú (helpers.js)
                        if (typeof aplicarRestriccionesMenu === 'function') {
                            aplicarRestriccionesMenu(currentUser);
                        }
                        
                        resolve(true);
                    } else {
                        // console.error('❌ Documento de usuario no encontrado');
                        await firebaseAuth.signOut();
                        alert('⚠️ Tu cuenta no está configurada correctamente.');
                        redirectTo('index.html');
                    }
                } catch (error) {
                    // console.error('❌ Error al obtener datos del usuario:', error);
                    await firebaseAuth.signOut();
                    alert('⚠️ Error al cargar tu perfil: ' + error.message);
                    redirectTo('index.html');
                }
            } else {
                // console.log('❌ No hay usuario autenticado');
                redirectTo('index.html');
            }
        });
    });
}

// ===== 5. MOSTRAR NOMBRE DEL USUARIO Y ROL =====
function mostrarNombreUsuario() {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (currentUser && userNameElement) {
        // Buscar nombre en diferentes campos posibles
        const displayName = currentUser.name || 
                          currentUser.nombre || 
                          currentUser.first_name || 
                          currentUser.displayName ||
                          currentUser.email?.split('@')[0] || 
                          'Usuario';
        
        userNameElement.textContent = displayName;
        // console.log('👤 Usuario mostrado:', displayName);
    }
    
    if (currentUser && userRoleElement) {
        const role = currentUser.role || 'empleado';
        const roleText = role === 'admin' ? 'Administrador' : 'Empleado';
        userRoleElement.textContent = roleText;
    }
}

// ===== 6. CONFIGURAR EVENTOS =====
function configurarEventos() {
    // console.log('🔘 Configurando eventos...');
    
    // Botón de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }
    
    // Logout desde user menu (nuevo diseño)
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                cerrarSesion();
            }
        });
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
    // console.log('🚪 Cerrando sesión...');
    
    try {
        await firebaseAuth.signOut();
        clearCurrentUser();
        // console.log('✅ Sesión cerrada exitosamente');
        redirectTo('index.html');
    } catch (error) {
        // console.error('❌ Error al cerrar sesión:', error);
        alert('Error al cerrar sesión. Intenta nuevamente.');
    }
}

// ===== 8. CARGAR DATOS INICIALES =====
async function cargarDatosIniciales() {
    // console.log('📊 Cargando datos iniciales...');
    
    try {
        // Cargar categorías y proveedores primero (para lookups)
        await Promise.all([
            cargarCategoriasCache(),
            cargarProveedoresCache()
        ]);
        
        // Cargar productos
        await cargarProductos();
        
        // Cargar filtros (categorías y proveedores únicos)
        cargarOpcionesFiltros();
        
        // Actualizar tarjetas informativas
        actualizarTarjetasInfo();
        
    } catch (error) {
        // console.error('❌ Error al cargar datos:', error);
        mostrarError('Error al cargar los datos. Por favor, recarga la página.');
    }
}

// ===== 8.1. CARGAR CACHÉ DE CATEGORÍAS =====
async function cargarCategoriasCache() {
    try {
        // Cargar TODAS las categorías (no solo activas) para lookup completo
        const snapshot = await firebaseDB.collection('categorias').get();
        
        // console.log('🔍 DEBUG CACHÉ: Snapshot size:', snapshot.size);
        
        categoriasMap = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            // console.log('🔍 DEBUG CACHÉ: Categoría:', doc.id, data.nombre);
            categoriasMap[doc.id] = {
                id: doc.id,
                ...data
            };
        });
        
        // console.log(`✅ ${Object.keys(categoriasMap).length} categorías cargadas en caché`);
    } catch (error) {
        // console.error('❌ Error al cargar categorías:', error);
    }
}

// ===== 8.2. CARGAR CACHÉ DE PROVEEDORES =====
async function cargarProveedoresCache() {
    try {
        const snapshot = await firebaseDB.collection('proveedores').get();
        
        proveedoresMap = {};
        snapshot.forEach(doc => {
            proveedoresMap[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // console.log(`✅ ${Object.keys(proveedoresMap).length} proveedores cargados en caché`);
    } catch (error) {
        // console.error('❌ Error al cargar proveedores:', error);
    }
}

// ===== 9. CARGAR PRODUCTOS =====
// ===== 8.5 FUNCIONES DE CACHÉ =====
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const PRODUCTS_CACHE_KEY = 'productos_cache';
const PRODUCTS_CACHE_TIME_KEY = 'productos_cache_time';

function guardarProductosEnCache(productos) {
    try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productos));
        localStorage.setItem(PRODUCTS_CACHE_TIME_KEY, Date.now().toString());
    } catch (error) {
        console.warn('⚠️ No se pudo guardar caché:', error);
    }
}

function obtenerProductosDeCache() {
    try {
        const cacheTime = localStorage.getItem(PRODUCTS_CACHE_TIME_KEY);
        if (!cacheTime) return null;
        
        const edad = Date.now() - parseInt(cacheTime);
        if (edad > CACHE_DURATION) return null;
        
        const productos = localStorage.getItem(PRODUCTS_CACHE_KEY);
        return productos ? JSON.parse(productos) : null;
    } catch (error) {
        console.warn('⚠️ Error al leer caché:', error);
        return null;
    }
}

function invalidarCacheProductos() {
    try {
        localStorage.removeItem(PRODUCTS_CACHE_KEY);
        localStorage.removeItem(PRODUCTS_CACHE_TIME_KEY);
        // También invalidar caché de ventas
        localStorage.removeItem('ventas_productos_cache');
        localStorage.removeItem('ventas_productos_cache_time');
    } catch (error) {
        console.warn('⚠️ Error al invalidar caché:', error);
    }
}

// ===== 9. CARGAR PRODUCTOS =====
async function cargarProductos() {
    // console.log('📦 Cargando productos...');
    
    // Intentar obtener del caché primero
    const productosEnCache = obtenerProductosDeCache();
    if (productosEnCache && productosEnCache.length > 0) {
        todosLosProductos = productosEnCache;
        todosLosProductos.sort((a, b) => a.name.localeCompare(b.name));
        productosFiltrados = [...todosLosProductos];
        // console.log(`✅ ${todosLosProductos.length} productos cargados desde caché`);
        mostrarProductos();
        return;
    }
    
    try {
        // console.log('📡 Cargando productos desde Firestore...');
        const snapshot = await firebaseDB.collection('products').get();
        
        todosLosProductos = [];
        snapshot.forEach(doc => {
            todosLosProductos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Guardar en caché
        guardarProductosEnCache(todosLosProductos);
        
        // Ordenar por nombre
        todosLosProductos.sort((a, b) => a.name.localeCompare(b.name));
        
        // Inicialmente, productos filtrados = todos los productos
        productosFiltrados = [...todosLosProductos];
        
        // console.log(`✅ ${todosLosProductos.length} productos cargados desde Firestore`);
        
        // Mostrar en la tabla
        mostrarProductos();
        
    } catch (error) {
        // console.error('❌ Error al cargar productos:', error);
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
    tbody.innerHTML = productosActuales.map(producto => {
        // Obtener nombres desde el caché
        const categoriaNombre = producto.category && categoriasMap[producto.category] 
            ? categoriasMap[producto.category].nombre 
            : (producto.category || 'Sin categoría');
        
        const proveedorNombre = producto.supplier && proveedoresMap[producto.supplier]
            ? proveedoresMap[producto.supplier].nombre
            : (producto.supplier || 'Sin proveedor');
        
        return `
        <tr data-id="${producto.id}">
            <td><strong>${producto.sku || 'N/A'}</strong></td>
            <td>${producto.name}</td>
            <td>${categoriaNombre}</td>
            <td>${proveedorNombre}</td>
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
        `;
    }).join('');
    
    // Actualizar paginación
    actualizarPaginacion();
    
    // console.log(`📋 Mostrando ${productosActuales.length} productos (página ${paginaActual})`);
    
    // Aplicar restricciones de rol después de renderizar
    aplicarRestriccionesPorRol();
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
        // Filtro de búsqueda (nombre, SKU, descripción)
        const coincideBusqueda = !searchTerm || 
            producto.name.toLowerCase().includes(searchTerm) ||
            (producto.sku && producto.sku.toLowerCase().includes(searchTerm)) ||
            (producto.description && producto.description.toLowerCase().includes(searchTerm));
        
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
    
    // console.log(`🔍 Filtros aplicados: ${productosFiltrados.length} productos encontrados`);
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
    // Obtener IDs de categorías únicas
    const categoriaIds = [...new Set(todosLosProductos.map(p => p.category).filter(c => c))];
    const selectCategoria = document.getElementById('filterCategoria');
    
    if (selectCategoria) {
        // Ordenar por nombre usando el caché
        const categoriasOrdenadas = categoriaIds
            .map(id => ({
                id: id,
                nombre: categoriasMap[id] ? categoriasMap[id].nombre : id
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        categoriasOrdenadas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });
    }
    
    // Obtener IDs de proveedores únicos
    const proveedorIds = [...new Set(todosLosProductos.map(p => p.supplier).filter(s => s))];
    const selectProveedor = document.getElementById('filterProveedor');
    
    if (selectProveedor) {
        // Ordenar por nombre usando el caché
        const proveedoresOrdenados = proveedorIds
            .map(id => ({
                id: id,
                nombre: proveedoresMap[id] ? proveedoresMap[id].nombre : id
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        proveedoresOrdenados.forEach(prov => {
            const option = document.createElement('option');
            option.value = prov.id;
            option.textContent = prov.nombre;
            selectProveedor.appendChild(option);
        });
    }
    
    // console.log(`📋 Filtros cargados: ${categoriaIds.length} categorías, ${proveedorIds.length} proveedores`);
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
        // console.log('👁️ Ver producto:', producto);
        abrirModalVer(producto);
    }
}

function editarProducto(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    if (producto) {
        // console.log('✏️ Editar producto:', producto);
        abrirModalEditar(producto);
    }
}

async function eliminarProducto(id, nombre) {
    // console.log('🗑️ Intentando eliminar producto:', id, nombre);
    
    const confirmar = confirm(`¿Estás seguro de eliminar el producto:\n\n"${nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) {
        return;
    }
    
    try {
        await firebaseDB.collection('products').doc(id).delete();
        // console.log('✅ Producto eliminado:', id);
        
        alert(`✅ Producto "${nombre}" eliminado correctamente`);
        
        // Invalidar caché y recargar productos
        invalidarCacheProductos();
        await cargarProductos();
        
    } catch (error) {
        // console.error('❌ Error al eliminar producto:', error);
        alert('❌ Error al eliminar el producto. Verifica tus permisos.');
    }
}

// ===== 18. GESTIÓN DEL MODAL =====
let modoEdicion = false;
let productoEditandoId = null;

async function abrirModalNuevo() {
    // console.log('📝 Abriendo modal para nuevo producto');
    
    modoEdicion = false;
    productoEditandoId = null;
    
    // Cambiar título del modal
    document.getElementById('modalTitleText').textContent = 'Nuevo Producto';
    document.getElementById('btnGuardarText').textContent = 'Guardar Producto';
    
    // Limpiar formulario
    document.getElementById('productoForm').reset();
    limpiarErrores();
    
    // Cargar categorías y proveedores (ESPERAR a que terminen)
    await Promise.all([
        cargarCategoriasSelect(),
        cargarProveedoresSelect()
    ]);
    
    // Mostrar modal
    document.getElementById('productoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function abrirModalVer(producto) {
    // console.log('👁️ Abriendo modal para ver producto:', producto.name);
    
    modoEdicion = false;
    productoEditandoId = null;
    
    // Cambiar título del modal
    document.getElementById('modalTitleText').textContent = 'Ver Producto';
    
    // Cargar categorías y proveedores primero
    Promise.all([
        cargarCategoriasSelect(),
        cargarProveedoresSelect()
    ]).then(() => {
        // Llenar formulario con datos del producto
        document.getElementById('inputNombre').value = producto.name || '';
        document.getElementById('inputSKU').value = producto.sku || '';
        document.getElementById('inputCategoria').value = producto.category || '';
        document.getElementById('inputProveedor').value = producto.supplier || '';
        document.getElementById('inputCosto').value = producto.cost || '';
        document.getElementById('inputPrecio').value = producto.price || '';
        document.getElementById('inputPrecioCaja').value = producto.price_per_box || '';
        document.getElementById('inputStockActual').value = producto.current_stock || 0;
        document.getElementById('inputStockMinimo').value = producto.min_stock || 0;
        
        // Cargar fecha de vencimiento si existe
        if (producto.expiration_date) {
            const fecha = producto.expiration_date.toDate ? producto.expiration_date.toDate() : new Date(producto.expiration_date);
            document.getElementById('inputFechaVencimiento').value = fecha.toISOString().split('T')[0];
        } else {
            document.getElementById('inputFechaVencimiento').value = '';
        }
        
        document.getElementById('inputDescripcion').value = producto.description || '';
        
        // Calcular margen
        calcularMargen();
        
        // Deshabilitar TODOS los campos (modo solo lectura)
        const inputs = document.querySelectorAll('#productoForm input, #productoForm select, #productoForm textarea');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        // Ocultar botón de guardar
        document.getElementById('btnGuardar').style.display = 'none';
    });
    
    limpiarErrores();
    
    // Mostrar modal
    document.getElementById('productoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function abrirModalEditar(producto) {
    // console.log('✏️ Abriendo modal para editar producto:', producto.name);
    
    modoEdicion = true;
    productoEditandoId = producto.id;
    
    // Cambiar título del modal
    document.getElementById('modalTitleText').textContent = 'Editar Producto';
    document.getElementById('btnGuardarText').textContent = 'Actualizar Producto';
    
    // Cargar categorías y proveedores primero
    Promise.all([
        cargarCategoriasSelect(),
        cargarProveedoresSelect()
    ]).then(() => {
        // Llenar formulario con datos del producto
        document.getElementById('inputNombre').value = producto.name || '';
        document.getElementById('inputSKU').value = producto.sku || '';
        document.getElementById('inputCategoria').value = producto.category || '';
        document.getElementById('inputProveedor').value = producto.supplier || '';
        document.getElementById('inputCosto').value = producto.cost || '';
        document.getElementById('inputPrecio').value = producto.price || '';
        document.getElementById('inputPrecioCaja').value = producto.price_per_box || '';
        document.getElementById('inputStockActual').value = producto.current_stock || 0;
        document.getElementById('inputStockMinimo').value = producto.min_stock || 0;
        
        // Cargar fecha de vencimiento si existe
        if (producto.expiration_date) {
            const fecha = producto.expiration_date.toDate ? producto.expiration_date.toDate() : new Date(producto.expiration_date);
            document.getElementById('inputFechaVencimiento').value = fecha.toISOString().split('T')[0];
        } else {
            document.getElementById('inputFechaVencimiento').value = '';
        }
        
        document.getElementById('inputDescripcion').value = producto.description || '';
        
        // Calcular margen
        calcularMargen();
    });
    
    limpiarErrores();
    
    // Mostrar modal
    document.getElementById('productoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    // console.log('❌ Cerrando modal');
    
    document.getElementById('productoModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Rehabilitar todos los campos
    const inputs = document.querySelectorAll('#productoForm input, #productoForm select, #productoForm textarea');
    inputs.forEach(input => {
        input.disabled = false;
    });
    
    // Mostrar botón de guardar
    document.getElementById('btnGuardar').style.display = 'block';
    
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
        mostrarError('inputNombre', '⚠️ El nombre del producto es obligatorio');
        esValido = false;
    } else if (nombre.length < 3) {
        mostrarError('inputNombre', '⚠️ El nombre debe tener al menos 3 caracteres');
        esValido = false;
    } else if (nombre.length > 100) {
        mostrarError('inputNombre', '⚠️ El nombre no debe exceder 100 caracteres');
        esValido = false;
    }
    
    // SKU
    const sku = document.getElementById('inputSKU').value.trim().toUpperCase();
    if (!sku) {
        mostrarError('inputSKU', '⚠️ El código SKU es obligatorio');
        esValido = false;
    } else if (sku.length < 2) {
        mostrarError('inputSKU', '⚠️ El código SKU debe tener al menos 2 caracteres');
        esValido = false;
    } else if (!/^[A-Z0-9-_]+$/.test(sku)) {
        mostrarError('inputSKU', '⚠️ El código SKU solo puede contener letras, números, guiones y guiones bajos');
        esValido = false;
    } else {
        // Validar SKU duplicado
        const skuDuplicado = todosLosProductos.find(p => 
            p.sku === sku && p.id !== productoEditandoId
        );
        if (skuDuplicado) {
            mostrarError('inputSKU', `❌ El código SKU "${sku}" ya existe en el producto: ${skuDuplicado.name}`);
            esValido = false;
        }
    }
    
    // Categoría
    const categoria = document.getElementById('inputCategoria').value;
    if (!categoria) {
        mostrarError('inputCategoria', '⚠️ Debes seleccionar una categoría para el producto');
        esValido = false;
    }
    
    // Proveedor
    const proveedor = document.getElementById('inputProveedor').value;
    if (!proveedor) {
        mostrarError('inputProveedor', '⚠️ Debes seleccionar el laboratorio/proveedor del producto');
        esValido = false;
    }
    
    // Costo
    const costoInput = document.getElementById('inputCosto').value;
    const costo = parseFloat(costoInput);
    if (!costoInput || costoInput.trim() === '') {
        mostrarError('inputCosto', '⚠️ El costo de compra es obligatorio');
        esValido = false;
    } else if (isNaN(costo)) {
        mostrarError('inputCosto', '❌ El costo debe ser un número válido (ej: 12.50)');
        esValido = false;
    } else if (costo < 0) {
        mostrarError('inputCosto', '❌ El costo no puede ser negativo');
        esValido = false;
    } else if (costo === 0) {
        mostrarError('inputCosto', '❌ El costo debe ser mayor a cero');
        esValido = false;
    } else if (costo > 999999) {
        mostrarError('inputCosto', '❌ El costo es demasiado alto (máximo: 999,999)');
        esValido = false;
    }
    
    // Precio
    const precioInput = document.getElementById('inputPrecio').value;
    const precio = parseFloat(precioInput);
    if (!precioInput || precioInput.trim() === '') {
        mostrarError('inputPrecio', '⚠️ El precio de venta es obligatorio');
        esValido = false;
    } else if (isNaN(precio)) {
        mostrarError('inputPrecio', '❌ El precio debe ser un número válido (ej: 25.00)');
        esValido = false;
    } else if (precio < 0) {
        mostrarError('inputPrecio', '❌ El precio no puede ser negativo');
        esValido = false;
    } else if (precio === 0) {
        mostrarError('inputPrecio', '❌ El precio debe ser mayor a cero');
        esValido = false;
    } else if (precio <= costo) {
        mostrarError('inputPrecio', `💰 El precio (Bs. ${precio}) debe ser mayor al costo (Bs. ${costo}) para obtener ganancia`);
        esValido = false;
    } else if (precio > 999999) {
        mostrarError('inputPrecio', '❌ El precio es demasiado alto (máximo: 999,999)');
        esValido = false;
    }
    
    // Stock actual
    const stockActualInput = document.getElementById('inputStockActual').value;
    const stockActual = parseInt(stockActualInput);
    if (!stockActualInput || stockActualInput.trim() === '') {
        mostrarError('inputStockActual', '⚠️ El stock actual en inventario es obligatorio');
        esValido = false;
    } else if (isNaN(stockActual)) {
        mostrarError('inputStockActual', '❌ El stock debe ser un número entero (ej: 50)');
        esValido = false;
    } else if (stockActual < 0) {
        mostrarError('inputStockActual', '❌ El stock no puede ser negativo');
        esValido = false;
    } else if (stockActual > 999999) {
        mostrarError('inputStockActual', '❌ El stock es demasiado alto (máximo: 999,999 unidades)');
        esValido = false;
    }
    
    // Stock mínimo
    const stockMinimoInput = document.getElementById('inputStockMinimo').value;
    const stockMinimo = parseInt(stockMinimoInput);
    if (!stockMinimoInput || stockMinimoInput.trim() === '') {
        mostrarError('inputStockMinimo', '⚠️ El stock mínimo de alerta es obligatorio');
        esValido = false;
    } else if (isNaN(stockMinimo)) {
        mostrarError('inputStockMinimo', '❌ El stock mínimo debe ser un número entero (ej: 10)');
        esValido = false;
    } else if (stockMinimo < 0) {
        mostrarError('inputStockMinimo', '❌ El stock mínimo no puede ser negativo');
        esValido = false;
    } else if (stockMinimo > stockActual && !modoEdicion) {
        // Advertencia (no bloquea) si el stock mínimo es mayor al actual en nuevo producto
        // console.warn('⚠️ Stock mínimo mayor al stock actual');
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
    // console.log('💾 Intentando guardar producto...');
    
    // Validar formulario
    if (!validarFormulario()) {
        // console.log('❌ Formulario inválido');
        // Encontrar el primer error y mostrarlo en el alert
        const primerError = document.querySelector('.error-message:not(:empty)');
        if (primerError) {
            alert('⚠️ ' + primerError.textContent);
        } else {
            alert('⚠️ Por favor corrige los errores en el formulario');
        }
        return;
    }
    
    // Deshabilitar botón de guardar
    const btnGuardar = document.getElementById('btnGuardar');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        // Recopilar datos del formulario
        const fechaVencimiento = document.getElementById('inputFechaVencimiento').value;
        const productoData = {
            name: document.getElementById('inputNombre').value.trim(),
            sku: document.getElementById('inputSKU').value.trim().toUpperCase(),
            category: document.getElementById('inputCategoria').value,
            supplier: document.getElementById('inputProveedor').value,
            cost: parseFloat(document.getElementById('inputCosto').value),
            price: parseFloat(document.getElementById('inputPrecio').value),
            price_per_box: (function(){
                const val = document.getElementById('inputPrecioCaja').value;
                return val !== undefined && val !== null && val !== '' ? parseFloat(val) : null;
            })(),
            current_stock: parseInt(document.getElementById('inputStockActual').value),
            min_stock: parseInt(document.getElementById('inputStockMinimo').value),
            expiration_date: fechaVencimiento ? new Date(fechaVencimiento + 'T00:00:00') : null,
            description: document.getElementById('inputDescripcion').value.trim() || null,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: currentUser.uid
        };
        
        if (modoEdicion) {
            // Actualizar producto existente
            await firebaseDB.collection('products').doc(productoEditandoId).update(productoData);
            // console.log('✅ Producto actualizado:', productoEditandoId);
            alert('✅ Producto actualizado correctamente');
        } else {
            // Crear nuevo producto
            productoData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            productoData.created_by = currentUser.uid;
            
            const docRef = await firebaseDB.collection('products').add(productoData);
            // console.log('✅ Producto creado:', docRef.id);
            alert('✅ Producto creado correctamente');
        }
        
        // Cerrar modal e invalidar caché
        cerrarModal();
        invalidarCacheProductos();
        await cargarProductos();
        
    } catch (error) {
        // console.error('❌ Error al guardar producto:', error);
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

// ===== APLICAR RESTRICCIONES POR ROL EN LA TABLA =====
function aplicarRestriccionesPorRol() {
    if (!currentUser) return;
    
    const role = currentUser.role || 'empleado';
    
    if (role === 'empleado') {
        // Ocultar botones de editar y eliminar
        const botonesEditar = document.querySelectorAll('.btn-edit');
        const botonesEliminar = document.querySelectorAll('.btn-delete');
        
        botonesEditar.forEach(btn => btn.style.display = 'none');
        botonesEliminar.forEach(btn => btn.style.display = 'none');
        
        // Dejar solo el botón de "Ver"
        // console.log('🔒 Restricciones aplicadas: solo lectura para empleado');
    }
}

// ===== ACTUALIZAR MENÚ Y PERMISOS POR ROL =====
function actualizarMenuPorRol() {
    if (!currentUser) return;
    
    const role = currentUser.role || 'empleado';
    // console.log('🔐 Actualizando menú para rol:', role);
    
    // Si es empleado, ocultar opciones de admin
    if (role === 'empleado') {
        // El menú se maneja desde helpers.js y CSS (clase admin-only)
        
        // MODO SOLO LECTURA EN PRODUCTOS
        // Ocultar botón "Nuevo Producto"
        const btnNuevo = document.querySelector('.btn-primary');
        if (btnNuevo && btnNuevo.textContent.includes('Nuevo Producto')) {
            btnNuevo.style.display = 'none';
        }
        
        // Deshabilitar botones de acción en la tabla (editar/eliminar)
        const deshabilitarBotonesAccion = () => {
            const botonesEditar = document.querySelectorAll('.btn-edit');
            const botonesEliminar = document.querySelectorAll('.btn-delete');
            
            botonesEditar.forEach(btn => {
                btn.style.display = 'none';
            });
            
            botonesEliminar.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // console.log('🔒 Botones de edición/eliminación ocultados para empleado');
        };
        
        // Aplicar después de cargar productos
        setTimeout(deshabilitarBotonesAccion, 500);
        
        // Aplicar después de búsquedas/filtros
        const searchInput = document.getElementById('searchProducto');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                setTimeout(deshabilitarBotonesAccion, 100);
            });
        }
        
        // console.log('👤 Menú de empleado aplicado - MODO SOLO LECTURA');
    } else {
        // console.log('👑 Menú de admin aplicado (completo)');
    }
}

// ===== CARGAR CATEGORÍAS DESDE FIRESTORE =====
async function cargarCategoriasSelect() {
    // console.log('📁 Cargando categorías desde Firestore...');
    
    const selectCategoria = document.getElementById('inputCategoria');
    if (!selectCategoria) return;
    
    try {
        // Cargar TODAS las categorías (activas e inactivas)
        let snapshot = await firebaseDB.collection('categorias').get();
        
        // console.log('🔍 DEBUG: Snapshot size:', snapshot.size);
        // console.log('🔍 DEBUG: Snapshot empty?', snapshot.empty);
        
        // Limpiar opciones excepto la primera
        selectCategoria.innerHTML = '<option value="">Selecciona una categoría</option>';
        
        if (snapshot.empty) {
            // console.log('⚠️ No hay categorías, creando categorías por defecto...');
            
            // Crear categorías por defecto
            await crearCategoriasPorDefecto();
            
            // Recargar
            snapshot = await firebaseDB.collection('categorias').get();
            
            if (snapshot.empty) {
                selectCategoria.innerHTML += '<option value="" disabled>No hay categorías disponibles</option>';
                return;
            }
        }
        
        // Ordenar alfabéticamente
        const categorias = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // console.log('🔍 DEBUG: Categoría encontrada:', doc.id, data.nombre, data);
            categorias.push({
                id: doc.id,
                ...data
            });
        });
        
        // console.log('🔍 DEBUG: Total categorías en array:', categorias.length);
        
        categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        
        // Agregar opciones
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });
        
        // console.log(`✅ ${categorias.length} categorías cargadas`);
        
    } catch (error) {
        // console.error('❌ Error al cargar categorías:', error);
        selectCategoria.innerHTML = '<option value="" disabled>Error al cargar categorías</option>';
    }
}

// ===== CREAR CATEGORÍAS POR DEFECTO =====
async function crearCategoriasPorDefecto() {
    const categoriasDefault = [
        { nombre: 'Medicamentos', descripcion: 'Medicamentos de venta libre y con receta', color: '#3b82f6', icono: 'fa-pills' },
        { nombre: 'Vitaminas y Suplementos', descripcion: 'Vitaminas, minerales y suplementos alimenticios', color: '#10b981', icono: 'fa-leaf' },
        { nombre: 'Cuidado Personal', descripcion: 'Productos de higiene y cuidado personal', color: '#8b5cf6', icono: 'fa-soap' },
        { nombre: 'Primeros Auxilios', descripcion: 'Vendas, curitas y material médico', color: '#ef4444', icono: 'fa-band-aid' },
        { nombre: 'Bebé y Maternidad', descripcion: 'Productos para bebés y madres', color: '#f59e0b', icono: 'fa-baby' },
        { nombre: 'Otros', descripcion: 'Otros productos de farmacia', color: '#6b7280', icono: 'fa-tag' }
    ];
    
    try {
        for (const cat of categoriasDefault) {
            await firebaseDB.collection('categorias').add({
                ...cat,
                activa: true,
                productosCount: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        // console.log('✅ Categorías por defecto creadas');
    } catch (error) {
        // console.error('❌ Error al crear categorías por defecto:', error);
    }
}

// ===== CARGAR PROVEEDORES DESDE FIRESTORE =====
async function cargarProveedoresSelect() {
    // console.log('🏭 Cargando proveedores desde Firestore...');
    
    const selectProveedor = document.getElementById('inputProveedor');
    if (!selectProveedor) return;
    
    try {
        const snapshot = await firebaseDB.collection('proveedores').get();
        
        // Limpiar opciones excepto la primera
        selectProveedor.innerHTML = '<option value="">Selecciona un laboratorio</option>';
        
        if (snapshot.empty) {
            // console.log('⚠️ No hay proveedores registrados, creando proveedores por defecto...');
            await crearProveedoresPorDefecto();
            // Recargar después de crear
            await cargarProveedoresSelect();
            return;
        }
        
        // Ordenar alfabéticamente
        const proveedores = [];
        snapshot.forEach(doc => {
            proveedores.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        proveedores.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        
        // Agregar opciones
        proveedores.forEach(prov => {
            const option = document.createElement('option');
            option.value = prov.id;
            option.textContent = prov.nombre;
            selectProveedor.appendChild(option);
        });
        
        // console.log(`✅ ${proveedores.length} proveedores cargados`);
        
    } catch (error) {
        // console.error('❌ Error al cargar proveedores:', error);
        selectProveedor.innerHTML = '<option value="" disabled>Error al cargar laboratorios</option>';
    }
}

// ===== CREAR PROVEEDORES POR DEFECTO =====
async function crearProveedoresPorDefecto() {
    const proveedoresDefault = [
        { nombre: 'Bayer', pais: 'Alemania' },
        { nombre: 'Pfizer', pais: 'Estados Unidos' },
        { nombre: 'Novartis', pais: 'Suiza' },
        { nombre: 'Genomma Lab', pais: 'México' },
        { nombre: 'Sanofi', pais: 'Francia' },
        { nombre: 'GSK', pais: 'Reino Unido' }
    ];
    
    try {
        for (const prov of proveedoresDefault) {
            await firebaseDB.collection('proveedores').add({
                ...prov,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        // console.log('✅ Proveedores por defecto creados');
    } catch (error) {
        // console.error('❌ Error al crear proveedores:', error);
    }
}

// ===== MODAL RÁPIDO: NUEVA CATEGORÍA =====
const modalNuevaCategoria = document.getElementById('modalNuevaCategoria');
const btnNuevaCategoria = document.getElementById('btnNuevaCategoria');
const btnCerrarNuevaCategoria = document.getElementById('btnCerrarNuevaCategoria');
const btnGuardarCategoria = document.getElementById('btnGuardarCategoria');

if (btnNuevaCategoria) {
    btnNuevaCategoria.addEventListener('click', () => {
        modalNuevaCategoria.classList.add('active');
        document.getElementById('inputNombreCategoria').focus();
    });
}

if (btnCerrarNuevaCategoria) {
    btnCerrarNuevaCategoria.addEventListener('click', () => {
        modalNuevaCategoria.classList.remove('active');
        limpiarFormularioCategoria();
    });
}

if (btnGuardarCategoria) {
    btnGuardarCategoria.addEventListener('click', async () => {
        const nombre = document.getElementById('inputNombreCategoria').value.trim();
        const descripcion = document.getElementById('inputDescripcionCategoria').value.trim();
        const color = document.getElementById('inputColorCategoria').value;
        const icono = document.getElementById('inputIconoCategoria').value;
        
        if (!nombre) {
            alert('Por favor, ingresa el nombre de la categoría');
            document.getElementById('inputNombreCategoria').focus();
            return;
        }
        
        try {
            btnGuardarCategoria.disabled = true;
            btnGuardarCategoria.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            
            const nuevaCategoria = {
                nombre: nombre,
                descripcion: descripcion || '',
                color: color,
                icono: icono,
                activa: true,
                productosCount: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await firebaseDB.collection('categorias').add(nuevaCategoria);
            
            // console.log('✅ Categoría creada:', docRef.id);
            
            // Recargar caché de categorías
            await cargarCategoriasCache();
            
            // Recargar select de categorías
            await cargarCategoriasSelect();
            
            // Seleccionar la nueva categoría
            document.getElementById('inputCategoria').value = docRef.id;
            
            // Cerrar modal
            modalNuevaCategoria.classList.remove('active');
            limpiarFormularioCategoria();
            
            // Mostrar mensaje de éxito
            mostrarExito('Categoría creada exitosamente');
            
        } catch (error) {
            // console.error('❌ Error al crear categoría:', error);
            alert('Error al crear la categoría: ' + error.message);
        } finally {
            btnGuardarCategoria.disabled = false;
            btnGuardarCategoria.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });
}

function limpiarFormularioCategoria() {
    document.getElementById('inputNombreCategoria').value = '';
    document.getElementById('inputDescripcionCategoria').value = '';
    document.getElementById('inputColorCategoria').value = '#6a5acd';
    document.getElementById('inputIconoCategoria').value = 'fa-pills';
}

// ===== MODAL RÁPIDO: NUEVO PROVEEDOR =====
const modalNuevoProveedor = document.getElementById('modalNuevoProveedor');
const btnNuevoProveedor = document.getElementById('btnNuevoProveedor');
const btnCerrarNuevoProveedor = document.getElementById('btnCerrarNuevoProveedor');
const btnGuardarProveedor = document.getElementById('btnGuardarProveedor');

if (btnNuevoProveedor) {
    btnNuevoProveedor.addEventListener('click', () => {
        modalNuevoProveedor.classList.add('active');
        document.getElementById('inputNombreProveedor').focus();
    });
}

if (btnCerrarNuevoProveedor) {
    btnCerrarNuevoProveedor.addEventListener('click', () => {
        modalNuevoProveedor.classList.remove('active');
        limpiarFormularioProveedor();
    });
}

if (btnGuardarProveedor) {
    btnGuardarProveedor.addEventListener('click', async () => {
        const nombre = document.getElementById('inputNombreProveedor').value.trim();
        const pais = document.getElementById('inputPaisProveedor').value.trim();
        
        if (!nombre) {
            alert('Por favor, ingresa el nombre del laboratorio');
            document.getElementById('inputNombreProveedor').focus();
            return;
        }
        
        try {
            btnGuardarProveedor.disabled = true;
            btnGuardarProveedor.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            
            const nuevoProveedor = {
                nombre: nombre,
                pais: pais || '',
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await firebaseDB.collection('proveedores').add(nuevoProveedor);
            
            // console.log('✅ Proveedor creado:', docRef.id);
            
            // Recargar caché de proveedores
            await cargarProveedoresCache();
            
            // Recargar select de proveedores
            await cargarProveedoresSelect();
            
            // Seleccionar el nuevo proveedor
            document.getElementById('inputProveedor').value = docRef.id;
            
            // Cerrar modal
            modalNuevoProveedor.classList.remove('active');
            limpiarFormularioProveedor();
            
            // Mostrar mensaje de éxito
            mostrarExito('Laboratorio creado exitosamente');
            
        } catch (error) {
            // console.error('❌ Error al crear proveedor:', error);
            alert('Error al crear el laboratorio: ' + error.message);
        } finally {
            btnGuardarProveedor.disabled = false;
            btnGuardarProveedor.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });
}

function limpiarFormularioProveedor() {
    document.getElementById('inputNombreProveedor').value = '';
    document.getElementById('inputPaisProveedor').value = '';
}

// ===== HELPER: MOSTRAR MENSAJE DE ÉXITO =====
function mostrarExito(mensaje) {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.className = 'notification success';
    notif.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notif);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// console.log('✅ Productos.js completamente cargado');
// console.log('🔄 Versión: 2025-11-14-16:50 - DEBUG ACTIVADO');

