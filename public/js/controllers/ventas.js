// public/js/controllers/ventas.js
import { VentaService } from '../services/venta.service.js';
import { VentaUI } from '../ui/venta.ui.js';
import { AuthGuard } from '../middleware/auth.guard.js';
import { Toast } from '../utils/toast.js';
import { ConfirmDialog } from '../utils/confirm.js';

let currentUser = null;
let todosLosProductos = [];
let carrito = [];
let numeroVentaActual = 1;
let ultimaVentaItems = []; // Para el recibo

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentUser = await AuthGuard.protect();

    setupEventListeners();
    await cargarDatosIniciales();

    VentaUI.updateDateTime();
    setInterval(() => VentaUI.updateDateTime(), 60000);
  } catch (error) {
    console.warn("Ejecución detenida por AuthGuard:", error);
  }
});

function setupEventListeners() {
  document.getElementById('btnLogout')?.addEventListener('click', () => AuthGuard.logout());

  document.getElementById('menuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('sidebar')?.classList.toggle('active');
  });

  document.querySelector('.user-menu')?.addEventListener('click', async () => {
    const salir = await ConfirmDialog.show('Cerrar Sesión', '¿Estás seguro de que deseas salir del sistema?', 'warning', 'Cerrar Sesión');
    if (salir) AuthGuard.logout();
  });

  let searchTimeout;
  document.getElementById('searchProductInput')?.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => buscarProductos(this.value), 300);
  });

  document.getElementById('btnSearch')?.addEventListener('click', () => {
    buscarProductos(document.getElementById('searchProductInput').value);
  });

  document.getElementById('btnClearCart')?.addEventListener('click', limpiarCarrito);
  document.getElementById('btnCancelSale')?.addEventListener('click', cancelarVenta);
  document.getElementById('btnProcessSale')?.addEventListener('click', procesarVenta);

  document.getElementById('closeModalBtn')?.addEventListener('click', () => VentaUI.closeModal());
  document.querySelector('#saleSuccessModal .modal-overlay')?.addEventListener('click', () => VentaUI.closeModal());
  document.getElementById('btnNewSale')?.addEventListener('click', () => {
    VentaUI.closeModal();
    limpiarCarrito();
  });

  document.getElementById('paymentMethod')?.addEventListener('change', (e) => {
    VentaUI.togglePaymentFields(e.target.value);
    calcularCambioYTotales();
  });
  document.getElementById('discountValue')?.addEventListener('input', calcularCambioYTotales);
  document.getElementById('discountType')?.addEventListener('change', calcularCambioYTotales);
  document.getElementById('amountReceived')?.addEventListener('input', calcularCambioYTotales);
  document.getElementById('btnPrintReceipt')?.addEventListener('click', imprimirTicket);

  // Exposiciones globales para onclick en UI
  window.agregarAlCarrito = agregarAlCarrito;
  window.cambiarCantidad = cambiarCantidad;
  window.actualizarCantidadDirecta = actualizarCantidadDirecta;
  window.quitarDelCarrito = quitarDelCarrito;
}

async function cargarDatosIniciales() {
  todosLosProductos = await VentaService.getProductos();
  numeroVentaActual = await VentaService.getNextSaleNumber();
  document.getElementById('saleNumber').textContent = String(numeroVentaActual).padStart(4, '0');
}

function buscarProductos(termino) {
  const terminoLower = termino.toLowerCase().trim();
  if (!terminoLower) {
    VentaUI.renderEmptySearch();
    return;
  }
  const resultados = todosLosProductos.filter(p =>
    p.name.toLowerCase().includes(terminoLower) ||
    (p.sku && p.sku.toLowerCase().includes(terminoLower))
  );
  VentaUI.renderSearchResults(resultados);
}

function agregarAlCarrito(id) {
  const producto = todosLosProductos.find(p => p.id === id);
  if (!producto || producto.current_stock === 0) {
    Toast.warning('Producto sin stock o no encontrado.');
    return;
  }

  const item = carrito.find(i => i.id === id);
  if (item) {
    if (item.cantidad >= producto.current_stock) {
      Toast.warning(`Límite de stock alcanzado (${producto.current_stock})`);
      return;
    }
    item.cantidad++;
  } else {
    carrito.push({ id: producto.id, name: producto.name, price: producto.price, cantidad: 1, stock_disponible: producto.current_stock });
  }
  actualizarVistaCarrito();
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  const nueva = item.cantidad + cambio;
  if (nueva < 1) return quitarDelCarrito(id);
  if (nueva > item.stock_disponible) {
    Toast.warning('Stock insuficiente.');
    return;
  }
  item.cantidad = nueva;
  actualizarVistaCarrito();
}

function actualizarCantidadDirecta(id, valor) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  const nueva = parseInt(valor);
  if (isNaN(nueva) || nueva < 1) return actualizarVistaCarrito();
  if (nueva > item.stock_disponible) {
    Toast.warning('Stock insuficiente.');
    return actualizarVistaCarrito();
  }
  item.cantidad = nueva;
  actualizarVistaCarrito();
}

function quitarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  actualizarVistaCarrito();
}

async function limpiarCarrito() {
  if (carrito.length === 0) return;
  const confirmar = await ConfirmDialog.show(
    'Vaciar Carrito',
    '¿Deseas remover todos los productos del carrito?',
    'warning',
    'Sí, vaciar'
  );
  if (confirmar) {
    carrito = [];
    actualizarVistaCarrito();
    VentaUI.resetPaymentForm();
    Toast.info('Carrito vaciado');
  }
}

async function cancelarVenta() {
  if (carrito.length === 0) return;
  const confirmar = await ConfirmDialog.show(
    'Cancelar Venta',
    '¿Deseas cancelar la venta en curso y restablecer el formulario?',
    'warning',
    'Sí, cancelar venta'
  );
  if (confirmar) {
    carrito = [];
    actualizarVistaCarrito();
    VentaUI.resetPaymentForm();
    VentaUI.renderEmptySearch();
    Toast.info('Venta cancelada');
  }
}

function calcularCambioYTotales() {
  const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0);
  const subtotal = carrito.reduce((sum, i) => sum + (i.price * i.cantidad), 0);

  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  const discountType = document.getElementById('discountType').value;
  let discountAmount = 0;

  if (discountValue > 0) {
    discountAmount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
    if (discountAmount > subtotal) discountAmount = subtotal;
  }

  const total = subtotal - discountAmount;
  VentaUI.updateTotals(totalItems, subtotal, total, discountAmount);

  const paymentMethod = document.getElementById('paymentMethod').value;
  if (paymentMethod === 'cash') {
    const amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
    VentaUI.updateChange(amountReceived - total, amountReceived);
  }

  return { totalItems, subtotal, discountAmount, total, paymentMethod };
}

function actualizarVistaCarrito() {
  VentaUI.renderCart(carrito);
  calcularCambioYTotales();
}

async function procesarVenta() {
  if (carrito.length === 0) {
    Toast.warning('El carrito está vacío.');
    return;
  }

  const calc = calcularCambioYTotales();
  if (calc.total < 0) {
    Toast.warning('El total no puede ser negativo.');
    return;
  }

  let amountReceived = 0;
  let change = 0;

  if (calc.paymentMethod === 'cash') {
    amountReceived = parseFloat(document.getElementById('amountReceived').value) || 0;
    if (amountReceived < calc.total) {
      Toast.warning('El monto recibido es insuficiente.');
      return;
    }
    change = amountReceived - calc.total;
  }

  ultimaVentaItems = [...carrito];
  VentaUI.setProcessing(true);

  try {
    const ventaData = {
      sale_number: numeroVentaActual,
      items: carrito.map(i => ({ product_id: i.id, product_name: i.name, quantity: i.cantidad, unit_price: i.price, subtotal: i.price * i.cantidad })),
      total_items: calc.totalItems,
      subtotal: calc.subtotal,
      discount_amount: calc.discountAmount,
      total: calc.total,
      payment_method: calc.paymentMethod,
      payment_method_label: calc.paymentMethod === 'cash' ? 'Efectivo' : calc.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia',
      amount_received: amountReceived,
      change: change,
      seller_id: currentUser.uid,
      seller_name: currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0],
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    };

    // Llama al servicio (maneja transacción y fallback silencioso automáticamente)
    await VentaService.processSale(ventaData, carrito);

    // Actualizar caché RAM local
    carrito.forEach(item => {
      const prod = todosLosProductos.find(p => p.id === item.id);
      if (prod) prod.current_stock = Math.max(0, (prod.current_stock || 0) - item.cantidad);
    });
    window.AppCache.setProductos(todosLosProductos);

    // UI Updates
    VentaUI.showSuccessModal(numeroVentaActual, calc.total, calc.totalItems, calc.paymentMethod, calc.discountAmount, amountReceived, change);

    numeroVentaActual++;
    document.getElementById('saleNumber').textContent = String(numeroVentaActual).padStart(4, '0');
    carrito = [];
    actualizarVistaCarrito();
    VentaUI.resetPaymentForm();

    if (document.getElementById('searchProductInput').value) buscarProductos(document.getElementById('searchProductInput').value);

  } catch (error) {
    if (error.type === 'STOCK_ERROR') {
      Toast.error(`Stock insuficiente para "${error.item}": ${error.message}`);
    } else {
      console.error('Error al procesar la venta:', error);
      Toast.error('Error al procesar la venta.');
    }
  } finally {
    VentaUI.setProcessing(false);
  }
}

function imprimirTicket() {
  const calc = calcularCambioYTotales();
  const vendedor = currentUser.name || currentUser.nombre || currentUser.email?.split('@')[0];
  const conf = {
    discountAmount: parseFloat(document.getElementById('discountAmount').textContent.replace(/[^\d.-]/g, '')) || 0,
    amountReceived: parseFloat(document.getElementById('modalAmountReceived')?.textContent.replace(/[^\d.-]/g, '')) || 0,
    change: parseFloat(document.getElementById('modalChange')?.textContent.replace(/[^\d.-]/g, '')) || 0
  };

  VentaUI.printReceipt(
    document.getElementById('modalSaleNumber').textContent,
    parseFloat(document.getElementById('modalTotal').textContent.replace(/[^\d.-]/g, '')),
    document.getElementById('modalItems').textContent,
    document.getElementById('modalPaymentMethod').textContent,
    ultimaVentaItems,
    vendedor,
    conf
  );
}