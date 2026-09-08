const db = window.firebaseDB

export const CategoriaService = {
    //Obtener todas las categorias ordenadas
    async getAll() {
        try {
            const snapshot = await db.collection('categorias').orderBy('nombre', 'asc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            //Fallback si falta el indice en firestore
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                const snapshot = await db.collection('categorias').get();
                const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

            }
            throw error;
        }
    },

    //Crear nueva categoria
    async create(data) {
        data.created_at = window.firebase.firestore.FieldValue.serverTimestamp();
        data.productosCount = 0;
        return await db.collection('categorias').add(data);
    },

    //Actualizar categoria
    async update(id, data) {
        data.updated_at = window.firebase.firestore.FieldValue.serverTimestamp();
        return await db.collection('categorias').doc(id).update(data);
    },

    //Elminar categoria  y desvincular de productos
    async delete(id) {
        const batch = db.batch();

        //1.Borrar la categoria
        const catRef = db.collection('categorias').doc(id);
        batch.delete(catRef);

        //2. Desvincular productos(category: null)

        const productosSnapshot = await db.collection('productos').where('category', '==', id).get();
        productosSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { category: null })
        })

        await batch.commit();
        if (window.AppCache) window.AppCache.invalidarProductos();
    },
    // Sincronización temporal en memoria (Refactorizaremos al Enfoque Proactivo al tocar productos.js)
    async syncCounters(categoriasActuales) {
        const batch = db.batch();

        // 1. Descargamos los productos (Ahora es seguro porque la BD está limpia)
        const snapshot = await db.collection('products').get();
        const totalProductosGlobal = snapshot.size;

        // 2. Contamos en memoria RAM (Extremadamente rápido en el navegador)
        const conteos = {};
        snapshot.docs.forEach(doc => {
            const catId = doc.data().category;
            // Ya no validamos categoriaId porque nuestro script de migración saneó la BD
            if (catId) {
                conteos[catId] = (conteos[catId] || 0) + 1;
            }
        });

        // 3. Comparamos y actualizamos solo lo necesario
        categoriasActuales.forEach(cat => {
            const count = conteos[cat.id] || 0;
            if (cat.productosCount !== count) {
                batch.update(db.collection('categorias').doc(cat.id), { productosCount: count });
                cat.productosCount = count; // Actualizamos la memoria local
            }
        });

        // 4. Guardamos los cambios
        await batch.commit();

        return {
            totalProductos: totalProductosGlobal,
            categoriasActualizadas: categoriasActuales
        };
    }
};