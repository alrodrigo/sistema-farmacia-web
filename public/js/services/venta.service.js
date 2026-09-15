// =====================================================
// ARCHIVO: public/js/services/venta.service.js
// DESCRIPCIÓN: Servicio de punto de venta (Firebase v10 Modular)
// =====================================================

import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
import { 
    collection, 
    doc, 
    query, 
    where,
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
        return await CacheService.getProductos();
    },

    async getCorteTurnoHoy(userId, role) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        let snapshotDocs = [];
        try {
            const q = query(
                collection(db, 'sales'),
                where('created_at', '>=', hoy),
                where('created_at', '<=', finDia)
            );
            const snapshot = await getDocs(q);
            snapshotDocs = snapshot.docs;
        } catch (e) {
            try {
                const q2 = query(
                    collection(db, 'sales'),
                    where('fecha', '>=', hoy),
                    where('fecha', '<=', finDia)
                );
                const snapshot2 = await getDocs(q2);
                snapshotDocs = snapshot2.docs;
            } catch (err2) {
                console.warn("No se pudo obtener ventas del día para corte:", err2);
            }
        }

        const procesarVentas = (soloUsuario) => {
            let totalTickets = 0;
            let efectivo = 0;
            let transferencia = 0;
            let tarjeta = 0;
            let total = 0;
            const porCategoria = {};

            snapshotDocs.forEach(docSnap => {
                const d = docSnap.data();
                if (soloUsuario && d.seller_id !== userId) {
                    return;
                }
                totalTickets++;
                const monto = parseFloat(d.total) || 0;
                total += monto;

                const pm = (d.payment_method || '').toLowerCase();
                if (pm === 'cash' || pm === 'efectivo') {
                    efectivo += monto;
                } else if (pm === 'transfer' || pm === 'transferencia' || pm.includes('qr')) {
                    transferencia += monto;
                } else if (pm === 'card' || pm === 'tarjeta') {
                    tarjeta += monto;
                } else {
                    efectivo += monto;
                }

                if (Array.isArray(d.items)) {
                    d.items.forEach(item => {
                        const cat = item.category || item.categoria || 'General';
                        const sub = parseFloat(item.subtotal) || (parseFloat(item.unit_price || 0) * (item.quantity || 1));
                        porCategoria[cat] = (porCategoria[cat] || 0) + sub;
                    });
                }
            });

            return { totalTickets, efectivo, transferencia, tarjeta, total, porCategoria };
        };

        const personal = procesarVentas(true);
        const general = procesarVentas(false);

        return {
            personal,
            general,
            // Mantiene compatibilidad con propiedades en raíz
            ...(role === 'admin' ? general : personal)
        };
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

            // Notificar a todas las pestañas que el stock cambió tras la venta
            CacheService.invalidarProductos(true);

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

                // Notificar a todas las pestañas que el stock cambió tras la venta
                CacheService.invalidarProductos(true);
            } catch (fallbackError) {
                console.error("Fallo crítico en ambos métodos de persistencia", fallbackError);
                throw new Error("Error de conexión. La venta no pudo registrarse.");
            }
        }
    }
};