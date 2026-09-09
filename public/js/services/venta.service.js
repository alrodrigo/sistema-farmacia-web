// public/js/services/venta.service.js
const db = window.firebaseDB;

export const VentaService = {
    async getProductos() {
        return await window.AppCache.getProductos(db);
    },

    async getNextSaleNumber() {
        try {
            const snapshot = await db.collection('sales')
                .orderBy('created_at', 'desc')
                .limit(1)
                .get();

            if (!snapshot.empty) {
                return (snapshot.docs[0].data().sale_number || 0) + 1;
            }
            return 1;
        } catch (error) {
            console.error("Error al obtener número correlativo", error);
            return 1;
        }
    },

    async processSale(ventaData, carrito) {
        const nuevaVentaRef = db.collection('sales').doc();
        const productosRef = carrito.map(item => db.collection('products').doc(item.id));

        try {
            // CAMINO IDEAL: Transacción atómica
            await db.runTransaction(async (transaction) => {
                const snapshots = await Promise.all(productosRef.map(ref => transaction.get(ref)));

                // Validar stock
                for (let i = 0; i < carrito.length; i++) {
                    const snap = snapshots[i];
                    const item = carrito[i];

                    if (!snap.exists) {
                        const err = new Error(`El producto "${item.name}" ya no existe.`);
                        err.type = 'STOCK_ERROR';
                        err.item = item.name;
                        throw err;
                    }

                    const stockActual = snap.data().current_stock ?? 0;
                    if (stockActual < item.cantidad) {
                        const err = new Error(`Disponible: ${stockActual} — Solicitado: ${item.cantidad}.`);
                        err.type = 'STOCK_ERROR';
                        err.item = item.name;
                        throw err;
                    }
                }

                // Escribir venta y actualizar stock
                transaction.set(nuevaVentaRef, ventaData);
                for (let i = 0; i < carrito.length; i++) {
                    const nuevoStock = (snapshots[i].data().current_stock ?? 0) - carrito[i].cantidad;
                    transaction.update(productosRef[i], {
                        current_stock: nuevoStock,
                        updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

        } catch (error) {
            if (error.type === 'STOCK_ERROR') {
                throw error; // Propagar a la UI para avisar al cajero
            }

            // PLAN B SILENCIOSO: Batch fallback
            try {
                const silentBatch = db.batch();
                for (const item of carrito) {
                    silentBatch.update(db.collection('products').doc(item.id), {
                        current_stock: window.firebase.firestore.FieldValue.increment(-item.cantidad),
                        updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                silentBatch.set(nuevaVentaRef, { ...ventaData, _fallback: true });
                await silentBatch.commit();
            } catch (fallbackError) {
                console.error("Fallo crítico en ambos métodos de persistencia", fallbackError);
                throw new Error("Error de conexión. La venta no pudo registrarse.");
            }
        }
    }
};