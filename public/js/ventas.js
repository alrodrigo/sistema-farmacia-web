// =====================================================
// ARCHIVO: ventas.js
// PROPÓSITO: Lógica del sistema de ventas (POS)
// =====================================================

console.log('🛒 Ventas.js cargado');

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
  console.log('📄 DOM cargado, iniciando POS...');
  
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
  console.log('🔐 Verificando autenticación...');
  
  // MODO DE DESARROLLO: simular usuario
  if (MODO_DESARROLLO) {
    console.log('⚠️ MODO DE DESARROLLO ACTIVADO');
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
    console.error('❌ Firebase Auth no está inicializado');
    redirectTo('index.html');
    return Promise.resolve(false);
  }
  
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
    btnPrintReceipt.addEventListener('click', function() {
      alert('🚧 Función de impresión próximamente');
      // Aquí implementaremos la impresión después
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
    // Cargar todos los productos
    await cargarProductos();
    
    // Obtener el número de venta
    await obtenerNumeroVenta();
    
    console.log('✅ Datos iniciales cargados');
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
  }
}

// ===== 9. CARGAR PRODUCTOS =====
async function cargarProductos() {
  console.log('📦 Cargando productos desde Firestore...');
  
  // MODO DE DESARROLLO: usar productos de prueba
  if (MODO_DESARROLLO) {
    console.log('⚠️ Usando productos de prueba');
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
    console.log(`✅ ${todosLosProductos.length} productos de prueba cargados`);
    return;
  }
  
  try {
    const snapshot = await firebaseDB.collection('products').get();
    
    todosLosProductos = [];
    snapshot.forEach(doc => {
      todosLosProductos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ ${todosLosProductos.length} productos cargados`);
    
  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
    throw error;
  }
}

// ===== 10. OBTENER NÚMERO DE VENTA =====
async function obtenerNumeroVenta() {
  // MODO DE DESARROLLO: usar número fijo
  if (MODO_DESARROLLO) {
    numeroVentaActual = 1;
    document.getElementById('saleNumber').textContent = 
      String(numeroVentaActual).padStart(4, '0');
    console.log(`📝 Número de venta (DEV): ${numeroVentaActual}`);
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
    
    console.log(`📝 Número de venta actual: ${numeroVentaActual}`);
    
  } catch (error) {
    console.error('❌ Error al obtener número de venta:', error);
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
  console.log('🔍 Buscando productos:', termino);
  
  const terminoLower = termino.toLowerCase().trim();
  
  if (!terminoLower) {
    // Si no hay término, mostrar mensaje vacío
    mostrarResultadosVacios();
    return;
  }
  
  // Filtrar productos
  const resultados = todosLosProductos.filter(producto => {
    return producto.name.toLowerCase().includes(terminoLower) ||
           (producto.sku && producto.sku.toLowerCase().includes(terminoLower)) ||
           (producto.barcode && producto.barcode.includes(terminoLower));
  });
  
  console.log(`✅ ${resultados.length} productos encontrados`);
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
console.log('✅ Ventas.js parte 1 cargada');

// ===== 15. AGREGAR PRODUCTO AL CARRITO =====
/**
 * Agrega un producto al carrito
 * Si ya existe, aumenta la cantidad
 * @param {string} productoId - ID del producto
 */
function agregarAlCarrito(productoId) {
  console.log('➕ Agregar al carrito:', productoId);
  
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
    console.log(`📈 Cantidad aumentada: ${itemExistente.cantidad}`);
  } else {
    // Agregar nuevo item al carrito
    carrito.push({
      id: producto.id,
      name: producto.name,
      price: producto.price,
      cantidad: 1,
      stock_disponible: producto.current_stock
    });
    console.log('✅ Producto agregado al carrito');
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
  console.log('🔄 Actualizando carrito...');
  
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
          <span class="qty-value">${item.cantidad}</span>
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
  console.log(`🔢 Cambiar cantidad: ${productoId}, cambio: ${cambio}`);
  
  const item = carrito.find(i => i.id === productoId);
  
  if (!item) return;
  
  const nuevaCantidad = item.cantidad + cambio;
  
  // Validar cantidad mínima
  if (nuevaCantidad < 1) {
    quitarDelCarrito(productoId);
    return;
  }
  
  // Validar que no exceda el stock
  if (nuevaCantidad > item.stock_disponible) {
    alert(`⚠️ Stock insuficiente (disponible: ${item.stock_disponible})`);
    return;
  }
  
  item.cantidad = nuevaCantidad;
  actualizarCarrito();
}

// ===== 18. QUITAR DEL CARRITO =====
/**
 * Quita un producto del carrito
 * @param {string} productoId - ID del producto
 */
function quitarDelCarrito(productoId) {
  console.log('🗑️ Quitar del carrito:', productoId);
  
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
    console.log('🧹 Carrito limpiado');
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
  
  // Por ahora, el total es igual al subtotal
  // Aquí podrías agregar descuentos, IVA, etc.
  const total = subtotal;
  
  // Actualizar en el HTML
  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('total').textContent = formatCurrency(total);
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
    document.getElementById('searchProductInput').value = '';
    mostrarResultadosVacios();
    console.log('❌ Venta cancelada');
  }
}

// ===== 22. PROCESAR VENTA =====
/**
 * Procesa la venta: guarda en Firebase y actualiza inventario
 */
async function procesarVenta() {
  if (carrito.length === 0) {
    alert('⚠️ El carrito está vacío');
    return;
  }
  
  console.log('💰 Procesando venta...');
  
  // Deshabilitar botón para evitar doble clic
  const btnProcesar = document.getElementById('btnProcessSale');
  const textoOriginal = btnProcesar.innerHTML;
  btnProcesar.disabled = true;
  btnProcesar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
  
  try {
    // Calcular totales
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const total = carrito.reduce((sum, item) => sum + (item.price * item.cantidad), 0);
    
    // MODO DE DESARROLLO: simular venta exitosa
    if (MODO_DESARROLLO) {
      console.log('⚠️ MODO DE DESARROLLO: Simulando venta exitosa');
      console.log('📊 Datos de venta:', {
        numero: numeroVentaActual,
        items: carrito.length,
        total: total
      });
      
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
      
      // Restaurar botón
      btnProcesar.disabled = false;
      btnProcesar.innerHTML = textoOriginal;
      
      return;
    }
    
    // MODO PRODUCCIÓN: guardar en Firebase
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
      subtotal: total,
      total: total,
      seller_id: currentUser.uid,
      seller_name: currentUser.first_name || currentUser.email,
      fecha: firebase.firestore.FieldValue.serverTimestamp(), // Nombre en español
      created_at: firebase.firestore.FieldValue.serverTimestamp(), // Mantener por compatibilidad
      status: 'completed'
    };
    
    // Guardar la venta en Firestore
    const ventaRef = await firebaseDB.collection('sales').add(ventaData);
    console.log('✅ Venta guardada:', ventaRef.id);
    
    // Actualizar el inventario de cada producto
    for (const item of carrito) {
      const productoRef = firebaseDB.collection('products').doc(item.id);
      const productoDoc = await productoRef.get();
      
      if (productoDoc.exists) {
        const stockActual = productoDoc.data().current_stock;
        const nuevoStock = stockActual - item.cantidad;
        
        await productoRef.update({
          current_stock: nuevoStock,
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`📦 Stock actualizado: ${item.name} (${stockActual} → ${nuevoStock})`);
      }
    }
    
    // Mostrar modal de éxito
    mostrarModalExito(numeroVentaActual, total);
    
    // Incrementar número de venta para la próxima
    numeroVentaActual++;
    document.getElementById('saleNumber').textContent = 
      String(numeroVentaActual).padStart(4, '0');
    
    // Recargar productos (para actualizar stock disponible)
    await cargarProductos();
    
    console.log('✅ Venta procesada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al procesar venta:', error);
    alert('❌ Error al procesar la venta. Por favor, intenta nuevamente.');
    
    // Rehabilitar botón
    btnProcesar.disabled = false;
    btnProcesar.innerHTML = textoOriginal;
  }
}

// ===== 23. MOSTRAR MODAL DE ÉXITO =====
function mostrarModalExito(numeroVenta, total) {
  // Llenar datos del modal
  document.getElementById('modalSaleNumber').textContent = 
    '#' + String(numeroVenta).padStart(4, '0');
  
  document.getElementById('modalTotal').textContent = 
    formatCurrency(total);
  
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
}

// ===== 25. MOSTRAR NOTIFICACIÓN =====
/**
 * Muestra una notificación temporal (opcional)
 * @param {string} mensaje 
 */
function mostrarNotificacion(mensaje) {
  // Por ahora solo un console.log
  // Podrías implementar un toast notification aquí
  console.log('📢', mensaje);
}

console.log('✅ Ventas.js completamente cargado');

