const db = window.firebaseDB;

export const ProveedorService = {
    async getAll() {
        const snapshot = await db.collection('proveedores').orderBy('nombre', 'asc').get()
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },
    async save(id, data, userId) {
        const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
        const payload = {
            ...data,
            updated_at: timestamp,
            updated_by: userId
        };
        if (id) {
            await db.collection('proveedores').doc(id).update(payload);
        } else {
            payload.created_at = timestamp;
            payload.created_by = userId;
            payload.productosCount = 0;
            payload.total_productos = 0; //mantenemos compatibilidad con campos legados
            await db.collection('proveedores').add(payload);
        }
        if (window.AppCache) window.AppCache.invalidarProveedores();
    },

    async delete(id) {
        const batch = db.batch();
        // 1. Eliminar el proveedor
        batch.delete(db.collection('proveedores').doc(id));

        // 2. Liberar a los productos huérfanos (poner supplier en null)
        const productosSnapshot = await db.collection('products')
            .where('supplier', '==', id)
            .get();

        productosSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { supplier: null });
        });

        await batch.commit();

        if (window.AppCache) {
            window.AppCache.invalidarProveedores();
            window.AppCache.invalidarProductos();
        }
    }
};