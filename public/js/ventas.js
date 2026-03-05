// =====================================================
// ARCHIVO: ventas.js
// PROPÓSITO: Lógica del sistema de ventas (POS)
// =====================================================

// console.log('🛒 Ventas.js cargado');

// ===== 1. REFERENCIAS A FIREBASE =====
const firebaseAuth = window.firebaseAuth;
const firebaseDB = window.firebaseDB;

// ===== 2. VARIABLES GLOBALES =====
let currentUser = null;
let todosLosProductos = []; // Todos los productos disponibles
let carrito = []; // Array que guarda los productos en el carrito
let numeroVentaActual = 1; // Número de venta (se incrementará)

// MODO DE DESARROLLO (cambiar a false en producción)
const MODO_DESARROLLO = false;

// ===== 3. CUANDO LA PÁGINA CARGA =====
document.addEventListener('DOMContentLoaded', async function() {
  // console.log('📄 DOM cargado, iniciando POS...');
  
  // Verificar autenticación
  await verificarAutenticacion();
  
  // Configurar eventos
  configurarEventos();
  
  // Cargar datos iniciales
  await cargarDatosIniciales();
  
  // Actualizar fecha/hora
  actualizarFechaHora();
  
  // Actualizar fecha/hora cada minuto
  setInterval(actualizarFechaHora, 60000);
});

// ===== 4. VERIFICAR AUTENTICACIÓN =====
async function verificarAutenticacion() {
  // console.log('🔐 Verificando autenticación...');
  
  // MODO DE DESARROLLO: simular usuario
  if (MODO_DESARROLLO) {
    // console.log('⚠️ MODO DE DESARROLLO ACTIVADO');
    currentUser = {
      uid: 'dev-user-123',
      email: 'admin@farmacia.com',
      first_name: 'Admin',
      last_name: 'Desarrollo'
    };
    mostrarNombreUsuario();
    return Promise.resolve(true);
  }
  
  // MODO PRODUCCIÓN: verificar con Firebase
  if (!firebaseAuth) {
    // console.error('❌ Firebase Auth no está inicializado');
    redirectTo('index.html');
    return Promise.resolve(false);
  }
  
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
            
            mostrarNombreUsuario();
            actualizarMenuPorRol();
            
            // Aplicar restricciones de menú (helpers.js)
            if (typeof aplicarRestriccionesMenu === 'function') {
                aplicarRestriccionesMenu(currentUser);
            }
            
            resolve(true);
          } else {
            // console.error('❌ Documento de usuario no encontrado');
            redirectTo('index.html');
          }
        } catch (error) {
          // console.error('❌ Error al obtener datos del usuario:', error);
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
    menuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });
    
    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        const isClickInsideSidebar = sidebar.contains(e.target);
        const isClickOnToggle = menuToggle.contains(e.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
        }
      }
    });
    
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
      }
    });
  }
  
  // Búsqueda de productos
  const searchInput = document.getElementById('searchProductInput');
  const btnSearch = document.getElementById('btnSearch');
  
  if (searchInput) {
    // Búsqueda al escribir (con delay)
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        buscarProductos(this.value);
      }, 300); // Espera 300ms después de dejar de escribir
    });
    
    // Búsqueda al presionar Enter
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        buscarProductos(this.value);
      }
    });
  }
  
  if (btnSearch) {
    btnSearch.addEventListener('click', function() {
      const searchValue = searchInput.value;
      buscarProductos(searchValue);
    });
  }
  
  // Botón limpiar carrito
  const btnClearCart = document.getElementById('btnClearCart');
  if (btnClearCart) {
    btnClearCart.addEventListener('click', limpiarCarrito);
  }
  
  // Botón cancelar venta
  const btnCancelSale = document.getElementById('btnCancelSale');
  if (btnCancelSale) {
    btnCancelSale.addEventListener('click', cancelarVenta);
  }
  
  // Botón procesar venta
  const btnProcessSale = document.getElementById('btnProcessSale');
  if (btnProcessSale) {
    btnProcessSale.addEventListener('click', procesarVenta);
  }
  
  // Botón cerrar modal
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalOverlay = document.querySelector('#saleSuccessModal .modal-overlay');
  
  if (closeModalBtn) closeModalBtn.addEventListener('click', cerrarModal);
  if (modalOverlay) modalOverlay.addEventListener('click', cerrarModal);
  
  // Botón nueva venta
  const btnNewSale = document.getElementById('btnNewSale');
  if (btnNewSale) {
    btnNewSale.addEventListener('click', function() {
      cerrarModal();
      limpiarCarrito();
    });
  }
  
  // Botón imprimir recibo
  const btnPrintReceipt = document.getElementById('btnPrintReceipt');
  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', imprimirRecibo);
  }
  
  // ===== NUEVOS EVENTOS PARA PAGO Y DESCUENTOS =====
  
  // Método de pago
  const paymentMethod = document.getElementById('paymentMethod');
  if (paymentMethod) {
    paymentMethod.addEventListener('change', cambiarMetodoPago);
  }
  
  // Descuento
  const discountValue = document.getElementById('discountValue');
  const discountType = document.getElementById('discountType');
  
  if (discountValue) {
    discountValue.addEventListener('input', aplicarDescuento);
  }
  
  if (discountType) {
    discountType.addEventListener('change', aplicarDescuento);
  }
  
  // Monto recibido
  const amountReceived = document.getElementById('amountReceived');
  if (amountReceived) {
    amountReceived.addEventListener('input', calcularCambio);
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
    // Cargar todos los productos
    await cargarProductos();
    
    // Obtener el número de venta
    await obtenerNumeroVenta();
    
    // console.log('✅ Datos iniciales cargados');
  } catch (error) {
    // console.error('❌ Error al cargar datos:', error);
  }
}

// ===== 8.5 CACHÉ DE PRODUCTOS =====
// Delegado a window.AppCache (helpers.js) — sessionStorage compartido entre páginas.

/** @deprecated Usa AppCache.invalidarProductos() directamente */
function invalidarCacheProductos() {
  AppCache.invalidarProductos();
}

// ===== 9. CARGAR PRODUCTOS =====
async function cargarProductos() {
  // console.log('📦 Cargando productos...');
  
  // MODO DE DESARROLLO: usar productos de prueba
  if (MODO_DESARROLLO) {
    // console.log('⚠️ Usando productos de prueba');
    todosLosProductos = [
      {
        id: 'prod-1',
        name: 'Paracetamol 500mg',
        sku: 'PAR-500',
        barcode: '7501234567890',
        price: 12.50,
        current_stock: 150,
        min_stock: 20
      },
      {
        id: 'prod-2',
        name: 'Ibuprofeno 400mg',
        sku: 'IBU-400',
        barcode: '7501234567891',
        price: 18.00,
        current_stock: 80,
        min_stock: 15
      },
      {
        id: 'prod-3',
        name: 'Amoxicilina 500mg',
        sku: 'AMO-500',
        barcode: '7501234567892',
        price: 45.00,
        current_stock: 60,
        min_stock: 10
      },
      {
        id: 'prod-4',
        name: 'Omeprazol 20mg',
        sku: 'OME-20',
        barcode: '7501234567893',
        price: 32.00,
        current_stock: 5,
        min_stock: 10
      },
      {
        id: 'prod-5',
        name: 'Losartán 50mg',
        sku: 'LOS-50',
        barcode: '7501234567894',
        price: 28.50,
        current_stock: 120,
        min_stock: 20
      },
      {
        id: 'prod-6',
        name: 'Metformina 850mg',
        sku: 'MET-850',
        barcode: '7501234567895',
        price: 22.00,
        current_stock: 95,
        min_stock: 15
      }
    ];
    // console.log(`✅ ${todosLosProductos.length} productos de prueba cargados`);
    return;
  }
  
  // Intentar obtener del caché primero
  // AppCache: lee de sessionStorage; solo llama a Firestore cuando es inválido
  // o fue invalidado después de una venta (actualiza stocks).
  todosLosProductos = await AppCache.getProductos(firebaseDB);
  // console.log(`✅ ${todosLosProductos.length} productos cargados`);
}

// ===== 10. OBTENER NÚMERO DE VENTA =====
async function obtenerNumeroVenta() {
  // MODO DE DESARROLLO: usar número fijo
  if (MODO_DESARROLLO) {
    numeroVentaActual = 1;
    document.getElementById('saleNumber').textContent = 
      String(numeroVentaActual).padStart(4, '0');
    // console.log(`📝 Número de venta (DEV): ${numeroVentaActual}`);
    return;
  }
  
  try {
    // Obtener la última venta para generar el número siguiente
    const snapshot = await firebaseDB.collection('sales')
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const ultimaVenta = snapshot.docs[0].data();
      numeroVentaActual = (ultimaVenta.sale_number || 0) + 1;
    }
    
    // Mostrar el número de venta con formato
    document.getElementById('saleNumber').textContent = 
      String(numeroVentaActual).padStart(4, '0');
    
    // console.log(`📝 Número de venta actual: ${numeroVentaActual}`);
    
  } catch (error) {
    // console.error('❌ Error al obtener número de venta:', error);
    // Si hay error, usar número por defecto
    numeroVentaActual = 1;
  }
}

// ===== 11. ACTUALIZAR FECHA Y HORA =====
function actualizarFechaHora() {
  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaFormateada = ahora.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  document.getElementById('saleDate').textContent = 
    `${fechaFormateada} - ${horaFormateada}`;
}

// ===== 12. BUSCAR PRODUCTOS =====
/**
 * Busca productos por nombre, SKU o código de barras
 * @param {string} termino - Término de búsqueda
 */
function buscarProductos(termino) {
  // console.log('🔍 Buscando productos:', termino);
  
  const terminoLower = termino.toLowerCase().trim();
  
  if (!terminoLower) {
    // Si no hay término, mostrar mensaje vacío
    mostrarResultadosVacios();
    return;
  }
  
  // Filtrar productos por nombre, SKU o descripción
  const resultados = todosLosProductos.filter(producto => {
    return producto.name.toLowerCase().includes(terminoLower) ||
           (producto.sku && producto.sku.toLowerCase().includes(terminoLower)) ||
           (producto.description && producto.description.toLowerCase().includes(terminoLower));
  });
  
  // console.log(`✅ ${resultados.length} productos encontrados`);
  mostrarResultados(resultados);
}

// ===== 13. MOSTRAR RESULTADOS VACÍOS =====
function mostrarResultadosVacios() {
  const container = document.getElementById('searchResults');
  container.innerHTML = `
    <div class="empty-results">
      <i class="fas fa-barcode"></i>
      <p>Busca un producto para comenzar</p>
      <small>Usa el buscador o escanea el código de barras</small>
    </div>
  `;
  
  document.getElementById('resultsCount').textContent = '0 productos';
}

// ===== 14. MOSTRAR RESULTADOS =====
/**
 * Muestra los productos encontrados
 * @param {Array} productos - Array de productos
 */
function mostrarResultados(productos) {
  const container = document.getElementById('searchResults');
  
  if (productos.length === 0) {
    container.innerHTML = `
      <div class="empty-results">
        <i class="fas fa-search"></i>
        <p>No se encontraron productos</p>
        <small>Intenta con otro término de búsqueda</small>
      </div>
    `;
    document.getElementById('resultsCount').textContent = '0 productos';
    return;
  }
  
  // Actualizar contador
  document.getElementById('resultsCount').textContent = 
    `${productos.length} producto${productos.length !== 1 ? 's' : ''}`;
  
  // Generar HTML de resultados
  container.innerHTML = productos.map(producto => {
    const stockBajo = producto.current_stock < producto.min_stock;
    const sinStock = producto.current_stock === 0;
    
    return `
      <div class="product-card" data-id="${producto.id}">
        <div class="product-info">
          <div class="product-name">${producto.name}</div>
          <div class="product-details">
            <span class="product-sku">SKU: ${producto.sku || 'N/A'}</span>
            <span class="product-stock ${stockBajo ? 'low' : ''}">
              <i class="fas fa-box"></i>
              Stock: ${producto.current_stock || 0}
            </span>
          </div>
        </div>
        <div class="product-price">${formatCurrency(producto.price || 0)}</div>
        <button 
          class="btn-add-to-cart" 
          onclick="agregarAlCarrito('${producto.id}')"
          ${sinStock ? 'disabled' : ''}
        >
          <i class="fas fa-${sinStock ? 'ban' : 'cart-plus'}"></i>
          ${sinStock ? 'Sin Stock' : 'Agregar'}
        </button>
      </div>
    `;
  }).join('');
}

// Continuará en el siguiente mensaje...
// console.log('✅ Ventas.js parte 1 cargada');

// ===== 15. AGREGAR PRODUCTO AL CARRITO =====
/**
 * Agrega un producto al carrito
 * Si ya existe, aumenta la cantidad
 * @param {string} productoId - ID del producto
 */
function agregarAlCarrito(productoId) {
  // console.log('➕ Agregar al carrito:', productoId);
  
  // Buscar el producto en el array de productos
  const producto = todosLosProductos.find(p => p.id === productoId);
  
  if (!producto) {
    alert('❌ Producto no encontrado');
    return;
  }
  
  // Verificar si hay stock
  if (producto.current_stock === 0) {
    alert('❌ Este producto no tiene stock disponible');
    return;
  }
  
  // Verificar si ya está en el carrito
  const itemExistente = carrito.find(item => item.id === productoId);
  
  if (itemExistente) {
    // Si ya existe, verificar que no exceda el stock
    if (itemExistente.cantidad >= producto.current_stock) {
      alert(`⚠️ No hay más stock disponible (máximo: ${producto.current_stock})`);
      return;
    }
    
    // Aumentar cantidad
    itemExistente.cantidad++;
    // console.log(`📈 Cantidad aumentada: ${itemExistente.cantidad}`);
  } else {
    // Agregar nuevo item al carrito
    carrito.push({
      id: producto.id,
      name: producto.name,
      price: producto.price,
      cantidad: 1,
      stock_disponible: producto.current_stock
    });
    // console.log('✅ Producto agregado al carrito');
  }
  
  // Actualizar la vista del carrito
  actualizarCarrito();
  
  // Feedback visual (opcional)
  mostrarNotificacion(`✅ ${producto.name} agregado al carrito`);
}

// ===== 16. ACTUALIZAR CARRITO =====
/**
 * Actualiza la vista del carrito y los totales
 */
function actualizarCarrito() {
  // console.log('🔄 Actualizando carrito...');
  
  const container = document.getElementById('cartContainer');
  
  // Si el carrito está vacío
  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>El carrito está vacío</p>
        <small>Agrega productos desde el buscador</small>
      </div>
    `;
    
    // Deshabilitar botones
    document.getElementById('btnClearCart').disabled = true;
    document.getElementById('btnProcessSale').disabled = true;
    
    // Resetear totales
    actualizarTotales();
    return;
  }
  
  // Generar HTML del carrito
  container.innerHTML = carrito.map(item => {
    const subtotal = item.price * item.cantidad;
    
    return `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatCurrency(item.price)} c/u</div>
        </div>
        <div class="cart-item-quantity">
          <button class="btn-qty" onclick="cambiarCantidad('${item.id}', -1)">
            <i class="fas fa-minus"></i>
          </button>
          <input 
            type="number" 
            class="qty-input" 
            value="${item.cantidad}" 
            min="1" 
            max="${item.stock_disponible}"
            onchange="actualizarCantidadDirecta('${item.id}', this.value)"
            onclick="this.select()"
          />
          <button class="btn-qty" onclick="cambiarCantidad('${item.id}', 1)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="cart-item-subtotal">${formatCurrency(subtotal)}</div>
        <button class="btn-remove-item" onclick="quitarDelCarrito('${item.id}')" title="Quitar del carrito">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
  
  // Habilitar botones
  document.getElementById('btnClearCart').disabled = false;
  document.getElementById('btnProcessSale').disabled = false;
  
  // Actualizar totales
  actualizarTotales();
}

// ===== 17. CAMBIAR CANTIDAD =====
/**
 * Cambia la cantidad de un producto en el carrito
 * @param {string} productoId - ID del producto
 * @param {number} cambio - +1 o -1
 */
function cambiarCantidad(productoId, cambio) {
  // console.log(`🔢 Cambiar cantidad: ${productoId}, cambio: ${cambio}`);
  
  const item = carrito.find(i => i.id === productoId);
  
  if (!item) return;
  
  const nuevaCantidad = item.cantidad + cambio;
  
  // Validar cantidad mínima
  if (nuevaCantidad < 1) {
    quitarDelCarrito(productoId);
    return;
  }
  
  // Obtener stock actualizado del producto
  const producto = todosLosProductos.find(p => p.id === productoId);
  if (producto) {
    item.stock_disponible = producto.current_stock;
  }
  
  // Validar que no exceda el stock
  if (nuevaCantidad > item.stock_disponible) {
    alert(`⚠️ Stock insuficiente (disponible: ${item.stock_disponible} unidades)`);
    return;
  }
  
  item.cantidad = nuevaCantidad;
  actualizarCarrito();
}

// ===== NUEVA: ACTUALIZAR CANTIDAD DIRECTA =====
/**
 * Actualiza la cantidad desde el input directo
 * @param {string} productoId - ID del producto
 * @param {string} valor - Valor ingresado
 */
function actualizarCantidadDirecta(productoId, valor) {
  // console.log(`🔢 Actualizar cantidad directa: ${productoId}, valor: ${valor}`);
  
  const item = carrito.find(i => i.id === productoId);
  if (!item) return;
  
  const nuevaCantidad = parseInt(valor);
  
  // Validar que sea un número válido
  if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
    alert('⚠️ Ingresa una cantidad válida (mínimo 1)');
    actualizarCarrito(); // Restaurar valor anterior
    return;
  }
  
  // Obtener stock actualizado del producto
  const producto = todosLosProductos.find(p => p.id === productoId);
  if (producto) {
    item.stock_disponible = producto.current_stock;
  }
  
  // Validar que no exceda el stock
  if (nuevaCantidad > item.stock_disponible) {
    alert(`⚠️ Stock insuficiente. Disponible: ${item.stock_disponible} unidades`);
    actualizarCarrito(); // Restaurar valor anterior
    return;
  }
  
  item.cantidad = nuevaCantidad;
  actualizarCarrito();
  mostrarNotificacion(`✅ Cantidad actualizada: ${nuevaCantidad}`);
}

// ===== 18. QUITAR DEL CARRITO =====
/**
 * Quita un producto del carrito
 * @param {string} productoId - ID del producto
 */
function quitarDelCarrito(productoId) {
  // console.log('🗑️ Quitar del carrito:', productoId);
  
  // Filtrar el carrito quitando el producto
  carrito = carrito.filter(item => item.id !== productoId);
  
  actualizarCarrito();
  mostrarNotificacion('🗑️ Producto quitado del carrito');
}

// ===== 19. LIMPIAR CARRITO =====
function limpiarCarrito() {
  if (carrito.length === 0) return;
  
  const confirmar = confirm('¿Estás seguro de limpiar todo el carrito?');
  
  if (confirmar) {
    carrito = [];
    actualizarCarrito();
    // console.log('🧹 Carrito limpiado');
    mostrarNotificacion('🧹 Carrito limpiado');
  }
}

// ===== 20. ACTUALIZAR TOTALES =====
function actualizarTotales() {
  // Calcular total de items
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  
  // Calcular subtotal
  const subtotal = carrito.reduce((sum, item) => {
    return sum + (item.price * item.cantidad);
  }, 0);
  
  // Calcular descuento
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  const discountType = document.getElementById('discountType').value;
  
  let discountAmount = 0;
  
  if (discountValue > 0) {
    if (discountType === 'percent') {
      // Descuento porcentual
      discountAmount = subtotal * (discountValue / 100);
    } else {
      // Descuento fijo
      discountAmount = discountValue;
    }
    
    // Validar que el descuento no sea mayor al subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }
  }
  
  // Calcular total con descuento
  const total = subtotal - discountAmount;
  
  // Actualizar en el HTML
  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('total').textContent = formatCurrency(total);
  
  // Mostrar/ocultar fila de descuento
  const discountRow = document.getElementById('discountRow');
  if (discountAmount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('discountAmount').textContent = '- ' + formatCurrency(discountAmount);
  } else {
    discountRow.style.display = 'none';
  }
  
  // Recalcular cambio si corresponde
  calcularCambio();
}

// ===== NUEVAS FUNCIONES PARA PAGO =====

// Aplicar descuento
function aplicarDescuento() {
  actualizarTotales();
}

// Cambiar método de pago
function cambiarMetodoPago() {
  const paymentMethod = document.getElementById('paymentMethod').value;
  const amountSection = document.getElementById('amountSection');
  const amountReceived = document.getElementById('amountReceived');
  const changeRow = document.getElementById('changeRow');
  
  if (paymentMethod === 'cash') {
    // Mostrar campos de monto recibido y cambio
    amountSection.style.display = 'block';
    calcularCambio();
  } else {
    // Ocultar campos para tarjeta/transferencia
    amountSection.style.display = 'none';
    changeRow.style.display = 'none';
    amountReceived.value = '';
  }
}

// Calcular cambio
function calcularCambio() {
  const paymentMethod = document.getElementById('paymentMethod').value;
  
  // Solo calcular cambio si es efectivo
  if (paymentMethod !== 'cash') {
    return;
  }
  
  const totalElement = document.getElementById('total');
  const amountReceivedInput = document.getElementById('amountReceived');
  const changeRow = document.getElementById('changeRow');
  const changeAmount = document.getElementById('changeAmount');
  
  if (!totalElement || !amountReceivedInput || !changeRow || !changeAmount) {
    return;
  }
  
  const totalText = totalElement.textContent;
  
  // Limpiar el texto del total para extraer solo el número
  let totalClean = totalText.replace('Bs', '').replace('Bs.', '').replace(/\s/g, '').replace(',', '.');
  
  const total = parseFloat(totalClean) || 0;
  const amountReceived = parseFloat(amountReceivedInput.value) || 0;
  
  if (amountReceived > 0) {
    const change = amountReceived - total;
    
    if (change >= 0) {
      changeRow.style.display = 'flex';
      changeAmount.textContent = formatCurrency(change);
      changeAmount.classList.remove('text-error');
      changeAmount.classList.add('text-primary');
    } else {
      // Monto insuficiente
      changeRow.style.display = 'flex';
      changeAmount.textContent = formatCurrency(Math.abs(change)) + ' faltante';
      changeAmount.classList.remove('text-primary');
      changeAmount.classList.add('text-error');
    }
  } else {
    changeRow.style.display = 'none';
  }
}

// ===== 21. CANCELAR VENTA =====
function cancelarVenta() {
  if (carrito.length === 0) {
    alert('⚠️ El carrito ya está vacío');
    return;
  }
  
  const confirmar = confirm('¿Estás seguro de cancelar esta venta?\n\nSe perderán todos los productos del carrito.');
  
  if (confirmar) {
    limpiarCarrito();
    resetearFormularioPago();
    mostrarResultadosVacios();
    // console.log('❌ Venta cancelada');
  }
}

// ===== 22. PROCESAR VENTA =====
/**
 * Procesa la venta: guarda en Firebase y actualiza inventario
 */
async function procesarVenta() {
  // ===== VALIDACIONES INICIALES =====
  if (carrito.length === 0) {
    alert('⚠️ El carrito está vacío. Agrega productos antes de procesar la venta.');
    return;
  }
  
  // console.log('💰 Procesando venta...');
  
  // Validar stock disponible antes de procesar
  for (const item of carrito) {
    const producto = todosLosProductos.find(p => p.id === item.id);
    if (!producto) {
      alert(`❌ El producto "${item.name}" ya no existe en el sistema`);
      return;
    }
    if (producto.current_stock < item.cantidad) {
      alert(`❌ Stock insuficiente para "${item.name}"\nDisponible: ${producto.current_stock}, Solicitado: ${item.cantidad}`);
      return;
    }
  }
  
  // Guardar items para el recibo (antes de limpiar el carrito)
  guardarItemsParaRecibo();
  
  // Deshabilitar botón para evitar doble clic
  const btnProcesar = document.getElementById('btnProcessSale');
  const textoOriginal = btnProcesar.innerHTML;
  btnProcesar.disabled = true;
  btnProcesar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
  
  try {
    // ===== VALIDACIÓN DE MÉTODO DE PAGO =====
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!paymentMethod) {
      alert('⚠️ Debes seleccionar un método de pago');
      btnProcesar.disabled = false;
      btnProcesar.innerHTML = textoOriginal;
      return;
    }
    
    // ===== VALIDACIÓN DE DESCUENTO =====
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    const discountType = document.getElementById('discountType').value;
    
    if (discountValue < 0) {
      alert('⚠️ El descuento no puede ser negativo');
      btnProcesar.disabled = false;
      btnProcesar.innerHTML = textoOriginal;
      return;
    }
    
    if (discountType === 'percent' && discountValue > 100) {
      alert('⚠️ El descuento porcentual no puede ser mayor a 100%');
      btnProcesar.disabled = false;
      btnProcesar.innerHTML = textoOriginal;
      return;
    }
    
    // ===== CALCULAR TOTALES =====
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const subtotal = carrito.reduce((sum, item) => sum + (item.price * item.cantidad), 0);
    
    // Calcular descuento
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'percent') {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = discountValue;
      }
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }
    }
    
    const total = subtotal - discountAmount;
    
    // Validar que el total no sea negativo
    if (total < 0) {
      alert('⚠️ El total de la venta no puede ser negativo');
      btnProcesar.disabled = false;
      btnProcesar.innerHTML = textoOriginal;
      return;
    }
    
    // ===== VALIDACIÓN DE PAGO EN EFECTIVO =====
    if (paymentMethod === 'cash') {
      const amountReceivedInput = document.getElementById('amountReceived').value;
      const amountReceived = parseFloat(amountReceivedInput) || 0;
      
      if (!amountReceivedInput || amountReceivedInput.trim() === '') {
        alert('⚠️ Debes ingresar el monto recibido en efectivo');
        btnProcesar.disabled = false;
        btnProcesar.innerHTML = textoOriginal;
        document.getElementById('amountReceived').focus();
        return;
      }
      
      if (amountReceived < total) {
        const faltante = total - amountReceived;
        alert(`⚠️ El monto recibido es insuficiente\n\nTotal: ${formatCurrency(total)}\nRecibido: ${formatCurrency(amountReceived)}\nFaltante: ${formatCurrency(faltante)}`);
        btnProcesar.disabled = false;
        btnProcesar.innerHTML = textoOriginal;
        document.getElementById('amountReceived').focus();
        return;
      }
    }
    
    // MODO DE DESARROLLO: simular venta exitosa
    if (MODO_DESARROLLO) {
      // console.log('⚠️ MODO DE DESARROLLO: Simulando venta exitosa');
      // console.log('📊 Datos de venta:', {
      //   numero: numeroVentaActual,
      //   items: carrito.length,
      //   total: total
      // });
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mostrar modal de éxito
      mostrarModalExito(numeroVentaActual, total);
      
      // Limpiar carrito
      carrito = [];
      actualizarCarrito();
      
      // Incrementar número de venta
      numeroVentaActual++;
      document.getElementById('saleNumber').textContent = 
        String(numeroVentaActual).padStart(4, '0');
      
      // IMPORTANTE: Restaurar botón después de mostrar modal
      setTimeout(() => {
        btnProcesar.disabled = false;
        btnProcesar.innerHTML = textoOriginal;
      }, 100);
      
      return;
    }
    
    // MODO PRODUCCIÓN: guardar en Firebase con transacción atómica
    // Preparar datos de pago
    const paymentData = {
      payment_method: paymentMethod,
      payment_method_label: paymentMethod === 'cash' ? 'Efectivo' : 
                           paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'
    };
    
    // Agregar campos específicos de efectivo
    if (paymentMethod === 'cash') {
      const amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
      paymentData.amount_received = amountReceived;
      paymentData.change = amountReceived - total;
    }
    
    // Agregar información de descuento
    if (discountAmount > 0) {
      paymentData.discount_value = discountValue;
      paymentData.discount_type = discountType;
      paymentData.discount_amount = discountAmount;
    }
    
    // Preparar datos de la venta
    const ventaData = {
      sale_number: numeroVentaActual,
      items: carrito.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.cantidad,
        unit_price: item.price,
        subtotal: item.price * item.cantidad
      })),
      total_items: totalItems,
      subtotal: subtotal,
      discount_amount: discountAmount,
      total: total,
      ...paymentData,
      seller_id: currentUser.uid,
      seller_name: currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0] || 'Vendedor',
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    };

    // ── Transacción atómica: leer → validar → escribir ────────────────────────
    // Crear la referencia del documento de venta ANTES de entrar a la transacción
    const nuevaVentaRef = firebaseDB.collection('sales').doc();
    const productosRef  = carrito.map(item =>
      firebaseDB.collection('products').doc(item.id)
    );

    await firebaseDB.runTransaction(async (transaction) => {

      // 1. FASE DE LECTURA — todas las lecturas deben ir antes de cualquier escritura
      const snapshots = await Promise.all(
        productosRef.map(ref => transaction.get(ref))
      );

      // 2. VALIDACIÓN — abortar la transacción si hay stock insuficiente
      for (let i = 0; i < carrito.length; i++) {
        const snap = snapshots[i];
        const item = carrito[i];

        if (!snap.exists) {
          const err = new Error(
            `El producto "${item.name}" ya no existe en el sistema.`
          );
          err.code = 'STOCK_INSUFICIENTE';
          throw err;
        }

        const stockActual = snap.data().current_stock ?? 0;
        if (stockActual < item.cantidad) {
          const err = new Error(
            `Stock insuficiente para "${item.name}": disponible ${stockActual}, solicitado ${item.cantidad}.`
          );
          err.code      = 'STOCK_INSUFICIENTE';
          err.stockData = { nombre: item.name, disponible: stockActual, solicitado: item.cantidad };
          throw err;
        }
      }

      // 3. FASE DE ESCRITURA — solo se ejecuta si todos los stocks son válidos
      // 3a. Guardar el ticket de venta
      transaction.set(nuevaVentaRef, ventaData);

      // 3b. Decrementar el stock de cada producto con el valor exacto leído
      for (let i = 0; i < carrito.length; i++) {
        const snap     = snapshots[i];
        const item     = carrito[i];
        const nuevoStock = (snap.data().current_stock ?? 0) - item.cantidad;
        transaction.update(productosRef[i], {
          current_stock: nuevoStock,
          updated_at:    firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    // ────────────────────────────────────────────────────────────────────────

    // ── Éxito: actualizar el mundo local sin leer Firebase ──────────────────
    // 1. Mutar el array en memoria y persistir en sessionStorage
    carrito.forEach(item => {
      const prod = todosLosProductos.find(p => p.id === item.id);
      if (prod) {
        prod.current_stock = Math.max(0, (prod.current_stock || 0) - item.cantidad);
      }
    });
    AppCache.setProductos(todosLosProductos);

    // 2. Refrescar los resultados de búsqueda visibles con el stock actualizado
    const terminoBusqueda = document.getElementById('searchProductInput')?.value || '';
    if (terminoBusqueda) {
      buscarProductos(terminoBusqueda);
    }

    // 3. Mostrar modal de éxito (limpia el carrito y resetea el formulario internamente)
    mostrarModalExito(numeroVentaActual, total);

    // 4. Avanzar el contador de venta
    numeroVentaActual++;
    document.getElementById('saleNumber').textContent =
      String(numeroVentaActual).padStart(4, '0');

    // 5. Restaurar botón
    btnProcesar.disabled = false;
    btnProcesar.innerHTML = textoOriginal;

    // console.log('✅ Venta procesada exitosamente:', nuevaVentaRef.id);

  } catch (error) {
    // Rehabilitar botón siempre
    btnProcesar.disabled = false;
    btnProcesar.innerHTML = textoOriginal;

    if (error.code === 'STOCK_INSUFICIENTE') {
      // ⚠️ NO limpiar el carrito — el cajero debe poder corregir y reintentar
      alert(`⚠️ Venta rechazada por stock insuficiente\n\n${error.message}\n\nAjusta el carrito y vuelve a intentarlo.`);
    } else {
      // console.error('❌ Error al procesar venta:', error);
      alert('❌ Error al procesar la venta.\nVerifica tu conexión e intenta nuevamente.');
    }
  }
}

// ===== 23. MOSTRAR MODAL DE ÉXITO =====
function mostrarModalExito(numeroVenta, total) {
  // Llenar datos del modal
  document.getElementById('modalSaleNumber').textContent = 
    '#' + String(numeroVenta).padStart(4, '0');
  
  document.getElementById('modalTotal').textContent = 
    formatCurrency(total);
  
  // Mostrar número de productos
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById('modalItems').textContent = totalItems;
  
  // Mostrar descuento si existe
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  if (discountValue > 0) {
    const discountRow = document.getElementById('modalDiscountRow');
    const discountAmount = parseFloat(document.getElementById('discountAmount').textContent.replace('- Bs. ', '').replace(',', ''));
    discountRow.style.display = 'flex';
    document.getElementById('modalDiscount').textContent = '- ' + formatCurrency(discountAmount);
  } else {
    document.getElementById('modalDiscountRow').style.display = 'none';
  }
  
  // Mostrar método de pago
  const paymentMethod = document.getElementById('paymentMethod').value;
  const paymentMethodText = paymentMethod === 'cash' ? 'Efectivo' : 
                           paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia';
  document.getElementById('modalPaymentMethod').textContent = paymentMethodText;
  
  // Mostrar monto recibido y cambio (solo para efectivo)
  if (paymentMethod === 'cash') {
    const amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = amountReceived - total;
    
    document.getElementById('modalAmountRow').style.display = 'flex';
    document.getElementById('modalAmountReceived').textContent = formatCurrency(amountReceived);
    
    document.getElementById('modalChangeRow').style.display = 'flex';
    document.getElementById('modalChange').textContent = formatCurrency(change);
  } else {
    document.getElementById('modalAmountRow').style.display = 'none';
    document.getElementById('modalChangeRow').style.display = 'none';
  }
  
  // Limpiar carrito
  carrito = [];
  actualizarCarrito();
  
  // Resetear formulario de pago usando la función dedicada
  resetearFormularioPago();
  
  // Mostrar modal
  const modal = document.getElementById('saleSuccessModal');
  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== 24. CERRAR MODAL =====
function cerrarModal() {
  const modal = document.getElementById('saleSuccessModal');
  modal.classList.remove('active');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
  
  // Asegurar que el formulario esté limpio para la próxima venta
  resetearFormularioPago();
}

// ===== 24.5 RESETEAR FORMULARIO DE PAGO =====
/**
 * Resetea todos los campos del formulario de pago a sus valores por defecto
 */
function resetearFormularioPago() {
  // Resetear método de pago a efectivo (valor por defecto)
  document.getElementById('paymentMethod').value = 'cash';
  
  // Resetear campos de descuento
  document.getElementById('discountValue').value = '';
  document.getElementById('discountType').value = 'percent';
  
  // Resetear monto recibido
  document.getElementById('amountReceived').value = '';
  
  // Ocultar filas condicionales
  document.getElementById('changeRow').style.display = 'none';
  document.getElementById('discountRow').style.display = 'none';
  
  // Mostrar sección de monto recibido (ya que por defecto es efectivo)
  document.getElementById('amountSection').style.display = 'block';
  
  // Enfocar el buscador para la próxima venta
  const searchInput = document.getElementById('searchProductInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
}

// ===== 25. MOSTRAR NOTIFICACIÓN =====
/**
 * Muestra una notificación temporal (opcional)
 * @param {string} mensaje 
 */
function mostrarNotificacion(mensaje) {
  // Por ahora solo un console.log
  // Podrías implementar un toast notification aquí
  // console.log('📢', mensaje);
}

// ===== ACTUALIZAR MENÚ POR ROL =====
function actualizarMenuPorRol() {
  if (!currentUser) return;
  
  const role = currentUser.role || 'empleado';
  // console.log('🔐 Menú actualizado para rol:', role);
  
  // El menú se maneja completamente desde helpers.js con aplicarRestriccionesMenu()
  // y CSS con la clase 'admin-only'. No se necesita lógica adicional aquí.
}

// ===== 26. GENERAR E IMPRIMIR RECIBO =====
/**
 * Genera el HTML del recibo y lo imprime
 */
function imprimirRecibo() {
  // console.log('🖨️ Generando recibo para imprimir...');
  
  // Obtener datos del modal
  const numeroVenta = document.getElementById('modalSaleNumber').textContent;
  const totalItems = document.getElementById('modalItems').textContent;
  const total = document.getElementById('modalTotal').textContent;
  const paymentMethod = document.getElementById('modalPaymentMethod').textContent;
  
  // Obtener descuento si existe
  let descuentoHTML = '';
  const modalDiscountRow = document.getElementById('modalDiscountRow');
  if (modalDiscountRow && modalDiscountRow.style.display !== 'none') {
    const descuento = document.getElementById('modalDiscount').textContent;
    descuentoHTML = `
      <div class="receipt-total-row">
        <span>Descuento:</span>
        <strong>${descuento}</strong>
      </div>
    `;
  }
  
  // Obtener monto recibido y cambio si es efectivo
  let pagoHTML = '';
  const modalAmountRow = document.getElementById('modalAmountRow');
  if (modalAmountRow && modalAmountRow.style.display !== 'none') {
    const montoRecibido = document.getElementById('modalAmountReceived').textContent;
    const cambio = document.getElementById('modalChange').textContent;
    
    pagoHTML = `
      <div class="receipt-total-row">
        <span>Recibido:</span>
        <strong>${montoRecibido}</strong>
      </div>
      <div class="receipt-total-row">
        <span>Cambio:</span>
        <strong>${cambio}</strong>
      </div>
    `;
  }
  
  // Obtener fecha y hora actual
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const hora = ahora.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // Generar items desde el último carrito guardado
  let itemsHTML = '';
  
  // Intentar obtener items del último carrito procesado
  // (esto requeriría guardar temporalmente, por ahora mostramos resumen)
  const ultimosItems = window.ultimaVentaItems || [];
  
  if (ultimosItems.length > 0) {
    itemsHTML = ultimosItems.map(item => `
      <div class="receipt-item">
        <div class="receipt-item-name">${item.name}</div>
        <div class="receipt-item-details">
          <span>${item.cantidad} x ${formatCurrency(item.price)}</span>
          <strong>${formatCurrency(item.price * item.cantidad)}</strong>
        </div>
      </div>
    `).join('');
  } else {
    // Si no hay items guardados, mostrar solo el total
    itemsHTML = `
      <div class="receipt-item">
        <div class="receipt-item-name">${totalItems} producto(s)</div>
        <div class="receipt-item-details">
          <span>Ver detalle en sistema</span>
        </div>
      </div>
    `;
  }
  
  // Obtener nombre del vendedor
  const vendedor = currentUser ? 
    (currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0] || 'Vendedor') :
    'Vendedor';
  
  // Generar HTML del recibo
  const reciboHTML = `
    <div class="receipt-header">
      <div class="receipt-logo">
        <img src="img/logo-servisalud.png" alt="ServiSalud">
      </div>
      <div class="receipt-title">FARMACIA SERVISALUD</div>
      <div class="receipt-subtitle">NIT: 123456789</div>
      <div class="receipt-subtitle">Av. Principal #123, La Paz - Bolivia</div>
      <div class="receipt-subtitle">Tel: (591) 2-2345678</div>
    </div>
    <div class="receipt-info">
      <div class="receipt-info-row">
        <span class="receipt-info-label">Nº Venta:</span>
        <span>${numeroVenta}</span>
      </div>
      <div class="receipt-info-row">
        <span class="receipt-info-label">Fecha:</span>
        <span>${fecha} - ${hora}</span>
      </div>
      <div class="receipt-info-row">
        <span class="receipt-info-label">Vendedor:</span>
        <span>${vendedor}</span>
      </div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-items">
      ${itemsHTML}
    </div>
    <div class="receipt-totals">
      ${descuentoHTML}
      <div class="receipt-total-row main">
        <span>TOTAL A PAGAR:</span>
        <strong>${total}</strong>
      </div>
    </div>
    <div class="receipt-payment">
      <div class="receipt-total-row">
        <span>Método de Pago:</span>
        <strong>${paymentMethod}</strong>
      </div>
      ${pagoHTML}
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer">
      <div class="receipt-thank-you">¡GRACIAS POR SU COMPRA!</div>
      <div class="receipt-footer-line">Este documento es un comprobante de venta</div>
      <div class="receipt-footer-line">www.servisalud.com.bo</div>
    </div>
  `;
  
  // Insertar el recibo en el DOM
  const printContainer = document.getElementById('printReceipt');
  printContainer.innerHTML = reciboHTML;
  printContainer.style.display = 'block';
  
  // Esperar un momento para que el navegador renderice el contenido
  setTimeout(() => {
    // Imprimir
    window.print();
    
    // Ocultar el recibo después de imprimir
    setTimeout(() => {
      printContainer.style.display = 'none';
    }, 100);
  }, 100);
  
  // console.log('✅ Recibo generado y enviado a impresión');
}

// ===== 27. GUARDAR ITEMS DE ÚLTIMA VENTA =====
/**
 * Guarda los items del carrito antes de procesarla
 * Para poder mostrarlos en el recibo impreso
 */
function guardarItemsParaRecibo() {
  window.ultimaVentaItems = carrito.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    cantidad: item.cantidad
  }));
}

// console.log('✅ Ventas.js completamente cargado');

