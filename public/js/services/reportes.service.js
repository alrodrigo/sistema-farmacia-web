// public/js/services/reportes.service.js
const db = window.firebaseDB;

export const ReportesService = {
    async getVendedores() {
        try {
            const snapshot = await db.collection('users').get();
            return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        } catch (error) {
            console.warn('Error cargando vendedores:', error);
            return [];
        }
    },

    async getVentasPorRango(fechaInicioStr, fechaFinStr, role, userId) {
        // Parsear fechas en hora local (sin conversión UTC)
        const [yI, mI, dI] = fechaInicioStr.split('-').map(Number);
        const [yF, mF, dF] = fechaFinStr.split('-').map(Number);
        const startTs = new Date(yI, mI - 1, dI, 0, 0, 0, 0);
        const endTs = new Date(yF, mF - 1, dF, 23, 59, 59, 999);

        const snapshot = await db.collection('sales')
            .where('fecha', '>=', startTs)
            .where('fecha', '<=', endTs)
            .orderBy('fecha', 'desc')
            .get();

        let ventas = snapshot.docs
            .map(doc => {
                const data = doc.data();
                const fechaField = data.fecha || data.created_at;
                if (!fechaField) return null;

                try {
                    return {
                        id: doc.id,
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

        // Si es empleado, filtrar en memoria solo sus ventas
        if (role !== 'admin') {
            ventas = ventas.filter(sale => sale.seller_id === userId);
        }

        return ventas;
    }
};