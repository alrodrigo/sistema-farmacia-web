// public/js/services/dashboard.service.js
const db = window.firebaseDB;

export const DashboardService = {
    async getInventario() {
        const [productosArray, proveedoresArray] = await Promise.all([
            window.AppCache.getProductos(db),
            window.AppCache.getProveedores(db)
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

            let query = db.collection('sales')
                .where('created_at', '>=', hoy)
                .where('created_at', '<=', finDia);

            // Si es empleado, cuenta solo sus ventas
            if (role !== 'admin') {
                query = query.where('seller_id', '==', userId);
            }

            // Usamos .get() compatible con el SDK actual
            const snapshot = await query.get();

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