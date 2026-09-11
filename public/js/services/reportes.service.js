// public/js/services/reportes.service.js
import { db } from '../config/firebase.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const ReportesService = {
    /**
     * Obtiene la lista de usuarios vendedores registrados
     * @returns {Promise<Array>}
     */
    async getVendedores() {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            return snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }));
        } catch (error) {
            console.warn('Error cargando vendedores:', error);
            return [];
        }
    },

    /**
     * Obtiene el conteo total de ventas en un rango de fechas directamente en el servidor
     * sin descargar los documentos.
     * @param {string} fechaInicioStr 'YYYY-MM-DD'
     * @param {string} fechaFinStr 'YYYY-MM-DD'
     * @returns {Promise<number>}
     */
    async getCountVentasPorRango(fechaInicioStr, fechaFinStr) {
        const [yI, mI, dI] = fechaInicioStr.split('-').map(Number);
        const [yF, mF, dF] = fechaFinStr.split('-').map(Number);
        const startTs = new Date(yI, mI - 1, dI, 0, 0, 0, 0);
        const endTs = new Date(yF, mF - 1, dF, 23, 59, 59, 999);

        const q = query(
            collection(db, 'sales'),
            where('fecha', '>=', startTs),
            where('fecha', '<=', endTs)
        );

        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    /**
     * Consulta ventas filtradas por rango de fechas de forma modular.
     * @param {string} fechaInicioStr 'YYYY-MM-DD'
     * @param {string} fechaFinStr 'YYYY-MM-DD'
     * @param {string} role 'admin' | 'empleado'
     * @param {string} userId UID del usuario
     * @returns {Promise<Array>}
     */
    async getVentasPorRango(fechaInicioStr, fechaFinStr, role, userId) {
        // Parsear fechas en hora local (sin desfase UTC)
        const [yI, mI, dI] = fechaInicioStr.split('-').map(Number);
        const [yF, mF, dF] = fechaFinStr.split('-').map(Number);
        const startTs = new Date(yI, mI - 1, dI, 0, 0, 0, 0);
        const endTs = new Date(yF, mF - 1, dF, 23, 59, 59, 999);

        let snapshot;
        try {
            const q = query(
                collection(db, 'sales'),
                where('fecha', '>=', startTs),
                where('fecha', '<=', endTs),
                orderBy('fecha', 'desc')
            );
            snapshot = await getDocs(q);
        } catch (error) {
            console.warn('Consulta con orderBy falló, ejecutando consulta alternativa sin orderBy:', error);
            const fallbackQuery = query(
                collection(db, 'sales'),
                where('fecha', '>=', startTs),
                where('fecha', '<=', endTs)
            );
            snapshot = await getDocs(fallbackQuery);
        }

        let ventas = snapshot.docs
            .map(docSnap => {
                const data = docSnap.data();
                const fechaField = data.fecha || data.created_at;
                if (!fechaField) return null;

                try {
                    return {
                        id: docSnap.id,
                        ...data,
                        fecha: fechaField.toDate ? fechaField.toDate() : new Date(fechaField),
                        total: parseFloat(data.total) || 0,
                        subtotal: parseFloat(data.subtotal || data.total) || 0,
                        discount_amount: parseFloat(data.discount_amount) || 0
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(sale => sale !== null);

        // Asegurar ordenamiento descendente (más recientes primero)
        ventas.sort((a, b) => b.fecha - a.fecha);

        // Si es empleado, filtrar en memoria solo sus ventas
        if (role !== 'admin') {
            ventas = ventas.filter(sale => sale.seller_id === userId);
        }

        return ventas;
    }
};