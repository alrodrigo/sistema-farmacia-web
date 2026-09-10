// =====================================================
// ARCHIVO: public/js/services/dashboard.service.js
// DESCRIPCIÓN: Servicio de estadísticas del Dashboard (Firebase v10 Modular)
// =====================================================

import { db } from '../config/firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const DashboardService = {
    async getInventario() {
        const [productosArray, proveedoresArray] = await Promise.all([
            window.AppCache.getProductos(window.firebaseDB),
            window.AppCache.getProveedores(window.firebaseDB)
        ]);

        const proveedoresMap = {};
        proveedoresArray.forEach(prov => {
            proveedoresMap[prov.id] = prov.name || prov.nombre || 'Sin nombre';
        });

        return { productos: productosArray, proveedoresMap };
    },

    async getResumenHoy(userId, role) {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const finDia = new Date();
            finDia.setHours(23, 59, 59, 999);

            let q;
            if (role !== 'admin') {
                q = query(
                    collection(db, 'sales'),
                    where('created_at', '>=', hoy),
                    where('created_at', '<=', finDia),
                    where('seller_id', '==', userId)
                );
            } else {
                q = query(
                    collection(db, 'sales'),
                    where('created_at', '>=', hoy),
                    where('created_at', '<=', finDia)
                );
            }

            const snapshot = await getDocs(q);

            let totalIngresos = 0;
            snapshot.forEach(doc => {
                totalIngresos += doc.data().total || 0;
            });

            return {
                ventasHoy: snapshot.size,
                ingresosHoy: role === 'admin' ? totalIngresos : null
            };
        } catch (error) {
            console.warn('Error al obtener el resumen de ventas de hoy', error);
            return { ventasHoy: 0, ingresosHoy: null };
        }
    }
};