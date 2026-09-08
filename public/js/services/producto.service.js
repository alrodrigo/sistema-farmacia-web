// public/js/services/producto.service.js
const db = window.firebaseDB;

export const ProductoService = {
    async getAll() {
        // AppCache gestiona la caché compartida en sessionStorage
        return await window.AppCache.getProductos(db);
    },

    async getCategoriasCache() {
        const snapshot = await db.collection('categorias').get();
        const categoriasMap = {};
        snapshot.forEach(doc => {
            categoriasMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        return categoriasMap;
    },

    async getProveedoresCache() {
        const proveedoresArray = await window.AppCache.getProveedores(db);
        const proveedoresMap = {};
        proveedoresArray.forEach(prov => {
            proveedoresMap[prov.id] = { id: prov.id, ...prov };
        });
        return proveedoresMap;
    },

    async save(id, productoData, supplierAnterior, userId) {
        const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();

        if (id) {
            // Actualizar
            const supplierNuevo = productoData.supplier || null;
            await db.collection('products').doc(id).update({
                ...productoData,
                updated_at: timestamp,
                updated_by: userId
            });

            if (supplierAnterior !== supplierNuevo) {
                const batch = db.batch();
                if (supplierAnterior) {
                    batch.update(db.collection('proveedores').doc(supplierAnterior), {
                        total_productos: window.firebase.firestore.FieldValue.increment(-1)
                    });
                }
                if (supplierNuevo) {
                    batch.update(db.collection('proveedores').doc(supplierNuevo), {
                        total_productos: window.firebase.firestore.FieldValue.increment(1)
                    });
                }
                await batch.commit();
                window.AppCache.invalidarProveedores();
            }
        } else {
            // Crear
            productoData.created_at = timestamp;
            productoData.created_by = userId;
            const docRef = await db.collection('products').add(productoData);

            if (productoData.supplier) {
                await db.collection('proveedores').doc(productoData.supplier).update({
                    total_productos: window.firebase.firestore.FieldValue.increment(1)
                });
                window.AppCache.invalidarProveedores();
            }
            return docRef.id;
        }

        window.AppCache.invalidarProductos();
    },

    async delete(id, supplierId) {
        await db.collection('products').doc(id).delete();

        if (supplierId) {
            await db.collection('proveedores').doc(supplierId).update({
                total_productos: window.firebase.firestore.FieldValue.increment(-1)
            });
            window.AppCache.invalidarProveedores();
        }
        window.AppCache.invalidarProductos();
    },

    async crearCategoriaRapida(data) {
        const nueva = {
            ...data,
            activa: true,
            productosCount: 0,
            created_at: window.firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('categorias').add(nueva);
        return docRef.id;
    },

    async crearProveedorRapido(data) {
        const nuevo = {
            ...data,
            created_at: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('proveedores').add(nuevo);
        window.AppCache.invalidarProveedores();
        return docRef.id;
    }
};