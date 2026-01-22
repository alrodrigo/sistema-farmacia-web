// Script para eliminar ventas de prueba y restaurar inventario
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function eliminarVentasEspecificas(numerosVenta, nombreProducto = null) {
  try {
    console.log(`\n🔍 Buscando ventas específicas: ${numerosVenta.join(', ')}...\n`);
    
    // Obtener todas las ventas que coincidan con los números especificados
    const ventasSnapshot = await db.collection('sales')
      .where('sale_number', 'in', numerosVenta)
      .get();
    
    if (ventasSnapshot.empty) {
      console.log('❌ No se encontraron ventas para eliminar');
      return;
    }
    
    console.log(`📋 Se encontraron ${ventasSnapshot.docs.length} ventas:\n`);
    
    // Mostrar las ventas que se van a eliminar
    const ventasAEliminar = [];
    ventasSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Si se especificó nombre de producto, filtrar por items
      if (nombreProducto) {
        const tieneProducto = data.items.some(item => 
          item.product_name.toLowerCase().includes(nombreProducto.toLowerCase())
        );
        
        if (!tieneProducto) {
          console.log(`  ⚠️  Venta #${data.sale_number} omitida (no contiene producto "${nombreProducto}")`);
          return;
        }
      }
      
      const fecha = data.created_at ? data.created_at.toDate().toLocaleString('es-ES') : 'Sin fecha';
      console.log(`  - ID: ${doc.id}`);
      console.log(`    Venta #${data.sale_number}`);
      console.log(`    Fecha: ${fecha}`);
      console.log(`    Total: Bs. ${data.total.toFixed(2)}`);
      console.log(`    Vendedor: ${data.seller_name}`);
      console.log(`    Productos:`);
      data.items.forEach(item => {
        console.log(`      • ${item.product_name} x${item.quantity}`);
      });
      console.log('');
      
      ventasAEliminar.push({
        id: doc.id,
        data: data
      });
    });
    
    // Confirmar antes de eliminar
    console.log('⚠️  ¿Deseas eliminar estas ventas y restaurar el inventario? (Presiona Ctrl+C para cancelar)\n');
    
    // Esperar 3 segundos antes de proceder
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔄 Procesando eliminación...\n');
    
    // Procesar cada venta
    for (const venta of ventasAEliminar) {
      console.log(`📦 Restaurando inventario de venta #${venta.data.sale_number}...`);
      
      // Restaurar el stock de cada producto
      for (const item of venta.data.items) {
        try {
          const productoRef = db.collection('products').doc(item.product_id);
          const productoDoc = await productoRef.get();
          
          if (productoDoc.exists) {
            const stockActual = productoDoc.data().current_stock;
            const nuevoStock = stockActual + item.quantity;
            
            await productoRef.update({
              current_stock: nuevoStock,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`  ✓ ${item.product_name}: ${stockActual} → ${nuevoStock} (+${item.quantity})`);
          } else {
            console.log(`  ⚠️  Producto ${item.product_name} no encontrado (ID: ${item.product_id})`);
          }
        } catch (error) {
          console.error(`  ❌ Error al restaurar ${item.product_name}:`, error.message);
        }
      }
      
      // Eliminar la venta
      await db.collection('sales').doc(venta.id).delete();
      console.log(`  ✓ Venta #${venta.data.sale_number} eliminada\n`);
    }
    
    console.log('✅ Proceso completado exitosamente\n');
    console.log(`📊 Resumen:`);
    console.log(`  - Ventas eliminadas: ${ventasAEliminar.length}`);
    console.log(`  - Inventario restaurado correctamente\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
// Ventas específicas a eliminar: #163, 164, 165, 166 que contengan producto "juan"
const numerosVenta = [163, 164, 165, 166];
const nombreProducto = 'juan';

console.log('='.repeat(60));
console.log('  🗑️  ELIMINAR VENTAS DE PRUEBA Y RESTAURAR INVENTARIO');
console.log('='.repeat(60));

eliminarVentasEspecificas(numerosVenta, nombreProducto);
