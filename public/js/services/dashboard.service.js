// =====================================================
// ARCHIVO: public/js/services/dashboard.service.js
// DESCRIPCIÓN: Servicio de estadísticas del Dashboard (Firebase v10 Modular)
// =====================================================

import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
import { 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DashboardService = {
    async getInventario() {
        const [productosArray, proveedoresArray] = await Promise.all([
            CacheService.getProductos(),
            CacheService.getProveedores()
        ]);

        const proveedoresMap = {};
        proveedoresArray.forEach(prov => {
            proveedoresMap[prov.id] = prov.name || prov.nombre || 'Sin nombre';
        });

        return { productos: productosArray, proveedoresMap };
    },

    async getResumenHoy(userId, role, canViewReports = false) {
        // Si no es admin y no tiene permiso de ver reportes, evitar lecturas innecesarias en Firestore
        if (role !== 'admin' && !canViewReports) {
            return { ventasHoy: 0, ingresosHoy: null };
        }

        try {
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
            } catch (e1) {
                try {
                    const q2 = query(
                        collection(db, 'sales'),
                        where('fecha', '>=', hoy),
                        where('fecha', '<=', finDia)
                    );
                    const snapshot2 = await getDocs(q2);
                    snapshotDocs = snapshot2.docs;
                } catch (e2) {
                    snapshotDocs = [];
                }
            }

            let totalIngresos = 0;
            let ventasValidas = 0;
            snapshotDocs.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'anulada' && data.status !== 'cancelled') {
                    ventasValidas++;
                    totalIngresos += parseFloat(data.total) || 0;
                }
            });

            return {
                ventasHoy: ventasValidas,
                ingresosHoy: totalIngresos
            };
        } catch (error) {
            console.warn('Error al obtener el resumen de ventas de hoy', error);
            return { ventasHoy: 0, ingresosHoy: null };
        }
    }
};