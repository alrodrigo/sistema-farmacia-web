// =====================================================
// ARCHIVO: public/js/services/venta.service.js
// DESCRIPCIÓN: Servicio de punto de venta (Firebase v10 Modular)
// =====================================================

import { db } from '../config/firebase.js';
import { 
    collection, 
    doc, 
    query, 
    orderBy, 
    limit, 
    getDocs, 
    runTransaction, 
    writeBatch, 
    serverTimestamp, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const VentaService = {
    async getProductos() {
        return await window.AppCache.getProductos(window.firebaseDB);
    },

    async getNextSaleNumber() {
        try {
            const q = query(collection(db, 'sales'), orderBy('created_at', 'desc'), limit(1));
            const snapshot = await getDocs(q);

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
        const nuevaVentaRef = doc(collection(db, 'sales'));
        const productosRefs = carrito.map(item => ({
            ref: doc(db, 'products', item.id),
            item
        }));

        try {
            // Transacción atómica en Firebase v10
            await runTransaction(db, async (transaction) => {
                const snapshots = await Promise.all(productosRefs.map(p => transaction.get(p.ref)));

                // Validar stock
                for (let i = 0; i < carrito.length; i++) {
                    const snap = snapshots[i];
                    const item = carrito[i];

                    if (!snap.exists()) {
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
                transaction.set(nuevaVentaRef, {
                    ...ventaData,
                    created_at: serverTimestamp()
                });

                for (let i = 0; i < carrito.length; i++) {
                    const nuevoStock = (snapshots[i].data().current_stock ?? 0) - carrito[i].cantidad;
                    transaction.update(productosRefs[i].ref, {
                        current_stock: nuevoStock,
                        updated_at: serverTimestamp()
                    });
                }
            });

        } catch (error) {
            if (error.type === 'STOCK_ERROR') {
                throw error;
            }

            // Fallback con writeBatch
            try {
                const batch = writeBatch(db);
                for (const item of carrito) {
                    const prodRef = doc(db, 'products', item.id);
                    batch.update(prodRef, {
                        current_stock: increment(-item.cantidad),
                        updated_at: serverTimestamp()
                    });
                }
                batch.set(nuevaVentaRef, {
                    ...ventaData,
                    created_at: serverTimestamp(),
                    _fallback: true
                });
                await batch.commit();
            } catch (fallbackError) {
                console.error("Fallo crítico en ambos métodos de persistencia", fallbackError);
                throw new Error("Error de conexión. La venta no pudo registrarse.");
            }
        }
    }
};