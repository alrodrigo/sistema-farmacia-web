// =====================================================
// SCRIPT DE MIGRACIÓN — USO ÚNICO
// Sincroniza el campo 'total_productos' en cada
// documento de la colección 'proveedores' contando
// los productos reales desde la colección 'products'.
//
// INSTRUCCIONES:
//   1. Añade temporalmente este script a dashboard.html
//   2. Abre el dashboard como admin
//   3. Ejecuta en consola: await window.sincronizarContadoresProveedores()
//   4. Elimina la etiqueta <script> cuando termine
// =====================================================

window.sincronizarContadoresProveedores = async function () {
    const db = window.firebaseDB;

    if (!db) {
        console.error('❌ firebaseDB no está disponible. Abre esta página como usuario autenticado.');
        return;
    }

    console.log('🔄 Iniciando sincronización de contadores de proveedores...');

    try {
        // ── PASO 1: Leer todos los productos ──────────────────────────
        console.log('📦 Leyendo colección "products"...');
        const productosSnap = await db.collection('products').get();
        console.log(`   → ${productosSnap.size} productos encontrados`);

        // ── PASO 2: Contar productos por proveedor ────────────────────
        const conteo = {}; // { supplierId: count }
        productosSnap.forEach(doc => {
            const supplierId = doc.data().supplier;
            if (supplierId) {
                conteo[supplierId] = (conteo[supplierId] || 0) + 1;
            }
        });
        console.log('📊 Conteo por proveedor:', conteo);

        // ── PASO 3: Leer todos los proveedores ────────────────────────
        console.log('🚛 Leyendo colección "proveedores"...');
        const proveedoresSnap = await db.collection('proveedores').get();
        console.log(`   → ${proveedoresSnap.size} proveedores encontrados`);

        // ── PASO 4: Construir batch de actualización ───────────────────
        // Firestore permite máx 500 operaciones por batch.
        // Si tienes más de 500 proveedores, este script necesitaría paginarse.
        const batch = db.batch();
        let actualizados = 0;

        proveedoresSnap.forEach(doc => {
            const totalProductos = conteo[doc.id] || 0;
            batch.update(doc.ref, { total_productos: totalProductos });
            actualizados++;
            console.log(`   ✏️  ${doc.data().nombre || doc.id}: ${totalProductos} productos`);
        });

        // ── PASO 5: Confirmar batch ────────────────────────────────────
        await batch.commit();

        console.log(`✅ Sincronización completada. ${actualizados} proveedores actualizados.`);
        console.log('💡 Recarga la página de proveedores para ver los badges actualizados.');

        // Invalidar caché de proveedores para que la próxima carga lea Firestore
        if (window.AppCache) {
            AppCache.invalidarProveedores();
            console.log('🗑️  Caché de proveedores invalidada.');
        }

    } catch (error) {
        console.error('❌ Error durante la sincronización:', error);
        console.error('   Código:', error.code);
        console.error('   Mensaje:', error.message);
    }
};

console.log('✅ window.sincronizarContadoresProveedores() cargada y lista.');
console.log('   Ejecuta: await window.sincronizarContadoresProveedores()');
