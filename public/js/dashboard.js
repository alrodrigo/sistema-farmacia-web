// =====================================================
// ARCHIVO: dashboard.js
// PROPÓSITO: Lógica del dashboard principal
// =====================================================

// console.log('🎯 Dashboard.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;
const firebaseStorage = window.firebaseStorage;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;  // Guardará los datos del usuario actual

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
    // console.log('📄 DOM cargado, iniciando dashboard...');
    
    // Verificar autenticación
    await verificarAutenticacion();
    
    // Configurar eventos de botones
    configurarEventos();
    
    // Cargar estadísticas
    await cargarEstadisticas();
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
/**
 * Verifica que el usuario esté logueado
 * Si no está logueado, lo redirige al login
 */
async function verificarAutenticacion() {
    // console.log('🔐 Verificando autenticación...');
    
    return new Promise((resolve) => {
        // Firebase nos avisa cuando cambia el estado de autenticación
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // ✅ Usuario logueado
                // console.log('✅ Usuario autenticado:', user.email);
                
                // Obtener datos adicionales del usuario desde Firestore
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
                        
                        // Aplicar restricciones de menú (función global de helpers.js)
                        aplicarRestriccionesMenu();
                        
                        resolve(true);
                    } else {
                        // console.error('❌ Documento de usuario no encontrado en Firestore');
                        alert('⚠️ Tu cuenta no está configurada correctamente. Cerrando sesión...');
                        await firebaseAuth.signOut();
                        redirectTo('index.html');
                    }
                } catch (error) {
                    // console.error('❌ Error al obtener datos del usuario:', error);
                    alert('⚠️ Error al cargar tu perfil: ' + error.message);
                    await firebaseAuth.signOut();
                    redirectTo('index.html');
                }
                
            } else {
                // ❌ No hay usuario logueado
                // console.log('❌ No hay usuario autenticado');
                redirectTo('index.html');
            }
        });
    });
}

// ===== 5. MOSTRAR NOMBRE DEL USUARIO Y ROL =====
/**
 * Muestra el nombre del usuario y su rol en la navbar
 */
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
        // Mostrar rol del usuario
        const role = currentUser.role || 'empleado';
        const roleText = role === 'admin' ? 'Administrador' : 'Empleado';
        userRoleElement.textContent = roleText;
        // console.log('👔 Rol mostrado:', roleText);
    }
}

// ===== 6. CONFIGURAR EVENTOS DE BOTONES =====
/**
 * Configura los eventos de clic de todos los botones
 */
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
    
    // Botón para abrir/cerrar menú en móviles
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        // Toggle del menú
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            // console.log('📱 Menú móvil toggled');
        });
        
        // Cerrar sidebar al hacer click fuera (solo en móviles)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnToggle = menuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    // console.log('📱 Menú cerrado al hacer click fuera');
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
    
    // Botón de escanear QR (por ahora solo un alert)
    const btnScanQR = document.getElementById('btnScanQR');
    if (btnScanQR) {
        btnScanQR.addEventListener('click', function() {
            alert('📷 Función de escaneo QR próximamente');
            // Aquí implementaremos el escáner QR después
        });
    }
}

// ===== 7. CERRAR SESIÓN =====
/**
 * Cierra la sesión del usuario y lo redirige al login
 */
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

// ===== 8. CARGAR ESTADÍSTICAS DEL DASHBOARD =====
async function cargarEstadisticas() {
    try {
        // Paso 1: poblar AppCache con products + proveedores (1 sola lectura por sesión)
        // cargarTotalProductos() depende de este cache, debe ir primero.
        await inicializarDashboardData();

        // Paso 2: el resto en paralelo — totalProductos ya lee del cache (0 lecturas extra)
        await Promise.all([
            cargarTotalProductos(),
            cargarVentasHoy(),
            cargarIngresosHoy()
        ]);
    } catch (error) {
        // console.error('❌ Error al cargar estadísticas:', error);
    }
}

// ===== 8. CONTAR TOTAL DE PRODUCTOS =====
/**
 * Lee del AppCache (sessionStorage) — 0 lecturas Firestore.
 * Los productos ya fueron descargados por inicializarDashboardData().
 */
async function cargarTotalProductos() {
    try {
        const productos = await AppCache.getProductos(firebaseDB);
        document.getElementById('totalProductos').textContent = productos.length;
    } catch (error) {
        // console.error('\u274c Error al cargar total productos:', error);
        document.getElementById('totalProductos').textContent = '0';
    }
}

// ===== 9. FUNCIÓN MAESTRA: descarga products + proveedores una sola vez =====
/**
 * Descarga las colecciones 'products' y 'proveedores' UNA sola vez
 * y reparte los datos a las funciones que los necesitan.
 * Elimina lecturas duplicadas.
 */
async function inicializarDashboardData() {
    try {
        // AppCache: 0 lecturas a Firestore si los datos ya están en sessionStorage
        const [productosArray, proveedoresArray] = await Promise.all([
            AppCache.getProductos(firebaseDB),
            AppCache.getProveedores(firebaseDB)
        ]);

        // Construir mapa id→nombre en memoria
        const proveedoresMap = {};
        proveedoresArray.forEach(prov => {
            proveedoresMap[prov.id] = prov.name || prov.nombre || 'Sin nombre';
        });

        // Pasar los datos en memoria (sin más lecturas a Firebase)
        procesarStockBajo(productosArray, proveedoresMap);
        procesarProximosVencer(productosArray, proveedoresMap);

    } catch (error) {
        // console.error('❌ Error al inicializar datos del dashboard:', error);
        document.getElementById('stockBajo').textContent = '-';
    }
}

// ===== 9a. PROCESAR STOCK BAJO (en memoria, sin Firebase) =====
/**
 * Recibe los datos ya descargados y filtra en memoria.
 * @param {Array} productosArray - Array de productos ya descargados
 * @param {Object} proveedoresMap - Mapa id→nombre de proveedores
 */
function procesarStockBajo(productosArray, proveedoresMap) {
    const productosStockBajo = productosArray
        .filter(producto => producto.current_stock < producto.min_stock)
        .map(producto => {
            let nombreLaboratorio = 'Sin laboratorio';
            if (producto.supplier) {
                nombreLaboratorio = proveedoresMap[producto.supplier] || producto.supplier;
            } else if (producto.supplier_name) {
                nombreLaboratorio = producto.supplier_name;
            }
            return {
                id: producto.id,
                name: producto.name,
                supplier: nombreLaboratorio,
                currentStock: producto.current_stock,
                minStock: producto.min_stock,
                faltante: producto.min_stock - producto.current_stock
            };
        });

    document.getElementById('stockBajo').textContent = productosStockBajo.length;

    if (productosStockBajo.length > 0) {
        mostrarTablaStockBajo(productosStockBajo);
    }
}

// ===== 9b. PROCESAR PRÓXIMOS A VENCER (en memoria, sin Firebase) =====
/**
 * Recibe los datos ya descargados y filtra en memoria.
 * @param {Array} productosArray - Array de productos ya descargados
 * @param {Object} proveedoresMap - Mapa id→nombre de proveedores
 */
function procesarProximosVencer(productosArray, proveedoresMap) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const productosProximosVencer = productosArray
        .filter(producto => {
            if (!producto.expiration_date) return false;
            const fechaVencimiento = producto.expiration_date.toDate
                ? producto.expiration_date.toDate()
                : new Date(producto.expiration_date);
            return fechaVencimiento <= fechaLimite;
        })
        .map(producto => {
            const fechaVencimiento = producto.expiration_date.toDate
                ? producto.expiration_date.toDate()
                : new Date(producto.expiration_date);

            const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

            let nombreLaboratorio = 'Sin laboratorio';
            if (producto.supplier) {
                nombreLaboratorio = proveedoresMap[producto.supplier] || producto.supplier;
            } else if (producto.supplier_name) {
                nombreLaboratorio = producto.supplier_name;
            }

            return {
                id: producto.id,
                name: producto.name,
                sku: producto.sku,
                supplier: nombreLaboratorio,
                expirationDate: fechaVencimiento,
                diasRestantes,
                stock: producto.current_stock
            };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    if (productosProximosVencer.length > 0) {
        mostrarTablaProductosProximosVencer(productosProximosVencer);
    }
}



/**
 * Muestra la tabla con los productos que tienen stock bajo
 * @param {Array} productos - Array de productos con stock bajo
 */
function mostrarTablaStockBajo(productos) {
    // Mostrar la sección (por defecto está oculta)
    const section = document.getElementById('stockBajoSection');
    section.style.display = 'block';
    
    // Actualizar el badge con el número
    document.getElementById('badgeStockBajo').textContent = productos.length;
    
    // Obtener el tbody de la tabla
    const tbody = document.getElementById('stockBajoTableBody');
    tbody.innerHTML = '';  // Limpiar contenido anterior
    
    // Crear una fila por cada producto
    productos.forEach(producto => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${producto.name}</strong></td>
            <td>${producto.supplier}</td>
            <td>
                <span class="badge-danger">
                    ${producto.currentStock} unidades
                </span>
            </td>
            <td>${producto.minStock} unidades</td>
            <td>
                <strong style="color: var(--danger-color);">
                    Faltan ${producto.faltante} unidades
                </strong>
            </td>
            <td>
                <button class="btn-small" onclick="irAProducto('${producto.id}')">
                    <i class="fas fa-edit"></i> Actualizar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // console.log(`📋 Tabla de stock bajo mostrada con ${productos.length} productos`);
}

/**
 * Redirige a la página de productos para actualizar stock
 * @param {string} productId - ID del producto
 */
function irAProducto(productId) {
    // Guardar el ID en localStorage para abrir el modal
    localStorage.setItem('editProductId', productId);
    // Redirigir a la página de productos
    window.location.href = 'productos.html';
}

// cargarProductosProximosVencer() fue reemplazada por inicializarDashboardData() + procesarProximosVencer()

/**
 * Muestra la tabla con los productos próximos a vencer
 * @param {Array} productos - Array de productos próximos a vencer
 */
function mostrarTablaProductosProximosVencer(productos) {
    // Mostrar la sección (por defecto está oculta)
    const section = document.getElementById('expiringSection');
    section.style.display = 'block';
    
    // Actualizar el badge con el número
    document.getElementById('badgeExpiring').textContent = productos.length;
    
    // Obtener el tbody de la tabla
    const tbody = document.getElementById('expiringTableBody');
    tbody.innerHTML = '';  // Limpiar contenido anterior
    
    // Crear una fila por cada producto
    productos.forEach(producto => {
        const row = document.createElement('tr');
        
        // Determinar el color según los días restantes
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
        
        // Formatear fecha
        const fechaFormateada = producto.expirationDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td><strong>${producto.name}</strong></td>
            <td><code>${producto.sku}</code></td>
            <td>${producto.supplier}</td>
            <td>${fechaFormateada}</td>
            <td>
                <span class="${badgeClass}">
                    ${diasTexto}
                </span>
            </td>
            <td>${producto.stock} unidades</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // console.log(`📋 Tabla de productos próximos a vencer mostrada con ${productos.length} productos`);
}

// ===== 10. VENTAS DEL DÍA (con agregación .count()) =====
/**
 * Usa .count() de Firestore: no descarga documentos, solo cuenta.
 * Admin → cuenta todas las ventas del día.
 * Vendedor → cuenta solo sus ventas del día.
 */
async function cargarVentasHoy() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        let query = firebaseDB.collection('sales')
            .where('created_at', '>=', hoy)
            .where('created_at', '<=', finDia);

        // Si es vendedor, filtrar por su UID antes de contar
        if (currentUser && currentUser.role !== 'admin') {
            query = query.where('seller_id', '==', currentUser.uid);
        }

        const snapshot = await query.count().get();
        const totalVentas = snapshot.data().count;

        document.getElementById('ventasHoy').textContent = totalVentas;

    } catch (error) {
        // console.error('❌ Error al cargar ventas:', error);
        // Mostrar 0 en lugar de '-' cuando Firestore no responde (cuota agotada, etc.)
        document.getElementById('ventasHoy').textContent = '0';
    }
}

// ===== 11. INGRESOS DEL DÍA =====
/**
 * Suma el total de dinero ganado HOY
 * Solo visible para administradores (tarjeta oculta para vendedores)
 */
async function cargarIngresosHoy() {
    // Solo cargar ingresos si el usuario es admin
    if (!currentUser || currentUser.role !== 'admin') {
        // Ocultar la tarjeta para empleados/vendedores
        const cardIngresos = document.getElementById('cardIngresosHoy');
        if (cardIngresos) {
            cardIngresos.style.display = 'none';
        }
        return;
    }
    
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);
        
        // Construir consulta base
        let query = firebaseDB.collection('sales')
            .where('created_at', '>=', hoy)
            .where('created_at', '<=', finDia);
        
        // Los administradores ven TODAS las ventas (no filtrar)
        // (Si se quisiera que vean solo las suyas, se agregaría el filtro aquí)
        
        // Ejecutar consulta
        const snapshot = await query.get();
        
        // Sumar los totales de cada venta
        let totalIngresos = 0;
        
        snapshot.forEach(doc => {
            const venta = doc.data();
            totalIngresos += venta.total || 0;
        });
        
        // Formatear como moneda boliviana
        const formatted = new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB'
        }).format(totalIngresos);
        
        document.getElementById('ingresosHoy').textContent = formatted;
        
        // console.log(`💰 Ingresos hoy: ${formatted}`);
        
    } catch (error) {
        // console.error('❌ Error al cargar ingresos:', error);
        document.getElementById('ingresosHoy').textContent = 'Bs. -';
    }
}

// ===== ACTUALIZAR MENÚ POR ROL =====
/**
 * Oculta opciones del menú según el rol del usuario
 */
function actualizarMenuPorRol() {
    if (!currentUser) return;
    
    const role = currentUser.role || 'empleado';
    // console.log('🔐 Actualizando menú para rol:', role);
    
    // El menú se maneja completamente desde helpers.js con aplicarRestriccionesMenu()
    // y CSS con la clase 'admin-only'. No se necesita lógica adicional aquí.
    // console.log('✓ Restricciones de menú manejadas por helpers.js');
}

// ===== 12. LOG FINAL =====
// console.log('✅ Dashboard.js completamente cargado');
