// =====================================================
// ARCHIVO: dashboard.js
// PROPÓSITO: Lógica del dashboard principal
// =====================================================

console.log('🎯 Dashboard.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;
const firebaseStorage = window.firebaseStorage;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;  // Guardará los datos del usuario actual

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM cargado, iniciando dashboard...');
    
    // Verificar autenticación
    await verificarAutenticacion();
    
    // Configurar eventos de botones
    configurarEventos();
    
    // Cargar estadísticas
    await cargarEstadisticas();
    
    // Verificar stock bajo y mostrar notificaciones
    if (typeof verificarStockBajo === 'function' && firebaseDB) {
        await verificarStockBajo(firebaseDB);
    }
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
/**
 * Verifica que el usuario esté logueado
 * Si no está logueado, lo redirige al login
 */
async function verificarAutenticacion() {
    console.log('🔐 Verificando autenticación...');
    
    return new Promise((resolve) => {
        // Firebase nos avisa cuando cambia el estado de autenticación
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // ✅ Usuario logueado
                console.log('✅ Usuario autenticado:', user.email);
                
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
                        console.error('❌ Documento de usuario no encontrado en Firestore');
                        alert('⚠️ Tu cuenta no está configurada correctamente. Cerrando sesión...');
                        await firebaseAuth.signOut();
                        redirectTo('index.html');
                    }
                } catch (error) {
                    console.error('❌ Error al obtener datos del usuario:', error);
                    alert('⚠️ Error al cargar tu perfil: ' + error.message);
                    await firebaseAuth.signOut();
                    redirectTo('index.html');
                }
                
            } else {
                // ❌ No hay usuario logueado
                console.log('❌ No hay usuario autenticado');
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
        console.log('👤 Usuario mostrado:', displayName);
    }
    
    if (currentUser && userRoleElement) {
        // Mostrar rol del usuario
        const role = currentUser.role || 'empleado';
        const roleText = role === 'admin' ? 'Administrador' : 'Empleado';
        userRoleElement.textContent = roleText;
        console.log('👔 Rol mostrado:', roleText);
    }
}

// ===== 6. CONFIGURAR EVENTOS DE BOTONES =====
/**
 * Configura los eventos de clic de todos los botones
 */
function configurarEventos() {
    console.log('🔘 Configurando eventos...');
    
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
            console.log('📱 Menú móvil toggled');
        });
        
        // Cerrar sidebar al hacer click fuera (solo en móviles)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnToggle = menuToggle.contains(e.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    console.log('📱 Menú cerrado al hacer click fuera');
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

// ===== 8. CARGAR ESTADÍSTICAS DEL DASHBOARD =====
/**
 * Carga todas las estadísticas desde Firebase
 * Esta es la función MÁS IMPORTANTE - conecta con Firestore
 */
async function cargarEstadisticas() {
    console.log('📊 Cargando estadísticas...');
    
    try {
        // Cargar en paralelo para ser más rápido
        await Promise.all([
            cargarTotalProductos(),
            cargarProductosStockBajo(),
            cargarVentasHoy(),
            cargarIngresosHoy()
        ]);
        
        console.log('✅ Todas las estadísticas cargadas');
        
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

// ===== 8. CONTAR TOTAL DE PRODUCTOS =====
/**
 * Cuenta cuántos productos hay en total en Firebase
 */
async function cargarTotalProductos() {
    try {
        // Consultar la colección 'products' en Firestore
        const snapshot = await firebaseDB.collection('products').get();
        
        // snapshot.size nos da la cantidad de documentos
        const total = snapshot.size;
        
        // Actualizar el número en el HTML
        document.getElementById('totalProductos').textContent = total;
        
        console.log(`📦 Total productos: ${total}`);
        
    } catch (error) {
        console.error('❌ Error al cargar total productos:', error);
        document.getElementById('totalProductos').textContent = '-';
    }
}

// ===== 9. PRODUCTOS CON STOCK BAJO =====
/**
 * Cuenta productos con stock por debajo del mínimo
 * Y MUESTRA una lista detallada de cuáles son
 */
async function cargarProductosStockBajo() {
    try {
        // Obtener todos los productos
        const snapshot = await firebaseDB.collection('products').get();
        
        // Array para guardar los productos con stock bajo
        const productosStockBajo = [];
        
        snapshot.forEach(doc => {
            const producto = doc.data();
            
            // Si el stock actual es menor al stock mínimo
            if (producto.current_stock < producto.min_stock) {
                productosStockBajo.push({
                    id: doc.id,
                    name: producto.name,
                    currentStock: producto.current_stock,
                    minStock: producto.min_stock,
                    faltante: producto.min_stock - producto.current_stock
                });
            }
        });
        
        // Actualizar el contador en la tarjeta
        const total = productosStockBajo.length;
        document.getElementById('stockBajo').textContent = total;
        
        // Si hay productos con stock bajo, mostrar la tabla
        if (total > 0) {
            mostrarTablaStockBajo(productosStockBajo);
        }
        
        console.log(`⚠️ Productos con stock bajo: ${total}`);
        
    } catch (error) {
        console.error('❌ Error al cargar stock bajo:', error);
        document.getElementById('stockBajo').textContent = '-';
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
    
    console.log(`📋 Tabla de stock bajo mostrada con ${productos.length} productos`);
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

// ===== 10. VENTAS DEL DÍA =====
/**
 * Cuenta cuántas ventas se hicieron HOY
 */
async function cargarVentasHoy() {
    try {
        // Obtener fecha de inicio del día (00:00:00)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Obtener fecha de fin del día (23:59:59)
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);
        
        // Consultar ventas entre esas fechas
        const snapshot = await firebaseDB.collection('sales')
            .where('created_at', '>=', hoy)
            .where('created_at', '<=', finDia)
            .get();
        
        const totalVentas = snapshot.size;
        
        document.getElementById('ventasHoy').textContent = totalVentas;
        
        console.log(`🛒 Ventas hoy: ${totalVentas}`);
        
    } catch (error) {
        console.error('❌ Error al cargar ventas:', error);
        document.getElementById('ventasHoy').textContent = '-';
    }
}

// ===== 11. INGRESOS DEL DÍA =====
/**
 * Suma el total de dinero ganado HOY
 */
async function cargarIngresosHoy() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);
        
        // Obtener todas las ventas de hoy
        const snapshot = await firebaseDB.collection('sales')
            .where('created_at', '>=', hoy)
            .where('created_at', '<=', finDia)
            .get();
        
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
        
        console.log(`💰 Ingresos hoy: ${formatted}`);
        
    } catch (error) {
        console.error('❌ Error al cargar ingresos:', error);
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
    console.log('🔐 Actualizando menú para rol:', role);
    
    // El menú se maneja completamente desde helpers.js con aplicarRestriccionesMenu()
    // y CSS con la clase 'admin-only'. No se necesita lógica adicional aquí.
    console.log('✓ Restricciones de menú manejadas por helpers.js');
}

// ===== 12. LOG FINAL =====
console.log('✅ Dashboard.js completamente cargado');
