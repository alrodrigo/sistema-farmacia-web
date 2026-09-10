// public/js/services/producto.service.js
import { db } from '../config/firebase.js';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    writeBatch,
    serverTimestamp,
    increment,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const ProductoService = {
    /**
     * Obtiene todos los productos (con caché en sessionStorage vía AppCache).
     * @returns {Promise<Array>}
     */
    async getAll() {
        return await window.AppCache.getProductos(window.firebaseDB);
    },

    /**
     * Consulta el número total de productos directamente en el servidor sin descargar documentos.
     * Consume 1 lectura por cada 1,000 docs.
     * @returns {Promise<number>}
     */
    async getTotalCountFromServer() {
        const coll = collection(db, 'products');
        const snapshot = await getCountFromServer(coll);
        return snapshot.data().count;
    },

    /**
     * Cuenta productos por categoría directamente en el servidor.
     * @param {string} categoryId
     * @returns {Promise<number>}
     */
    async getCountPorCategoriaFromServer(categoryId) {
        const q = query(collection(db, 'products'), where('category', '==', categoryId));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    /**
     * Cuenta productos por laboratorio/proveedor directamente en el servidor.
     * @param {string} supplierId
     * @returns {Promise<number>}
     */
    async getCountPorProveedorFromServer(supplierId) {
        const q = query(collection(db, 'products'), where('supplier', '==', supplierId));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    /**
     * Verifica directamente en el servidor si un SKU ya está registrado.
     * @param {string} sku
     * @param {string|null} excludeId - ID a ignorar (en caso de edición)
     * @returns {Promise<boolean>}
     */
    async verificarSkuEnServidor(sku, excludeId = null) {
        if (!sku) return false;
        const q = query(collection(db, 'products'), where('sku', '==', sku.trim().toUpperCase()));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return false;
        if (!excludeId) return true;
        return snapshot.docs.some(d => d.id !== excludeId);
    },

    /**
     * Obtiene mapa de categorías ordenadas por nombre.
     * @returns {Promise<Object>}
     */
    async getCategoriasCache() {
        const q = query(collection(db, 'categorias'), orderBy('nombre', 'asc'));
        const snapshot = await getDocs(q);
        const categoriasMap = {};
        snapshot.forEach(docSnap => {
            categoriasMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
        });
        return categoriasMap;
    },

    /**
     * Obtiene mapa de proveedores (desde AppCache).
     * @returns {Promise<Object>}
     */
    async getProveedoresCache() {
        const proveedoresArray = await window.AppCache.getProveedores(window.firebaseDB);
        const proveedoresMap = {};
        proveedoresArray.forEach(prov => {
            proveedoresMap[prov.id] = { id: prov.id, ...prov };
        });
        return proveedoresMap;
    },

    /**
     * Guarda o actualiza un producto usando writeBatch para sincronización atómica
     * tanto del producto como de los contadores en proveedores y categorías.
     * @param {string|null} id
     * @param {Object} productoData
     * @param {string|null} supplierAnterior
     * @param {string} userId
     * @param {string|null} categoryAnterior
     * @returns {Promise<string|undefined>}
     */
    async save(id, productoData, supplierAnterior, userId, categoryAnterior = null) {
        const batch = writeBatch(db);
        const supplierNuevo = productoData.supplier || null;
        const categoryNuevo = productoData.category || null;

        if (id) {
            // Actualizar producto
            const prodRef = doc(db, 'products', id);
            batch.update(prodRef, {
                ...productoData,
                updated_at: serverTimestamp(),
                updated_by: userId
            });

            // Sincronización atómica de proveedores
            if (supplierAnterior !== supplierNuevo) {
                if (supplierAnterior) {
                    batch.update(doc(db, 'proveedores', supplierAnterior), {
                        total_productos: increment(-1)
                    });
                }
                if (supplierNuevo) {
                    batch.update(doc(db, 'proveedores', supplierNuevo), {
                        total_productos: increment(1)
                    });
                }
            }

            // Sincronización atómica de categorías
            if (categoryAnterior !== categoryNuevo) {
                if (categoryAnterior) {
                    batch.update(doc(db, 'categorias', categoryAnterior), {
                        productosCount: increment(-1)
                    });
                }
                if (categoryNuevo) {
                    batch.update(doc(db, 'categorias', categoryNuevo), {
                        productosCount: increment(1)
                    });
                }
            }

            await batch.commit();
            if (supplierAnterior !== supplierNuevo) {
                window.AppCache.invalidarProveedores();
            }
        } else {
            // Crear nuevo producto
            const prodRef = doc(collection(db, 'products'));
            batch.set(prodRef, {
                ...productoData,
                created_at: serverTimestamp(),
                created_by: userId
            });

            // Incrementar contador en proveedor
            if (productoData.supplier) {
                batch.update(doc(db, 'proveedores', productoData.supplier), {
                    total_productos: increment(1)
                });
            }

            // Incrementar contador en categoría
            if (productoData.category) {
                batch.update(doc(db, 'categorias', productoData.category), {
                    productosCount: increment(1)
                });
            }

            await batch.commit();
            if (productoData.supplier) {
                window.AppCache.invalidarProveedores();
            }
            window.AppCache.invalidarProductos();
            return prodRef.id;
        }

        window.AppCache.invalidarProductos();
    },

    /**
     * Elimina un producto y descuenta atómicamente sus contadores en proveedor y categoría.
     * @param {string} id
     * @param {string|null} supplierId
     * @param {string|null} categoryId
     */
    async delete(id, supplierId = null, categoryId = null) {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'products', id));

        if (supplierId) {
            batch.update(doc(db, 'proveedores', supplierId), {
                total_productos: increment(-1)
            });
        }

        if (categoryId) {
            batch.update(doc(db, 'categorias', categoryId), {
                productosCount: increment(-1)
            });
        }

        await batch.commit();
        if (supplierId) {
            window.AppCache.invalidarProveedores();
        }
        window.AppCache.invalidarProductos();
    },

    /**
     * Creación rápida de categoría desde el modal de productos
     * @param {Object} data
     * @returns {Promise<string>}
     */
    async crearCategoriaRapida(data) {
        const docRef = await addDoc(collection(db, 'categorias'), {
            ...data,
            activa: true,
            productosCount: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
        return docRef.id;
    },

    /**
     * Creación rápida de proveedor desde el modal de productos
     * @param {Object} data
     * @returns {Promise<string>}
     */
    async crearProveedorRapido(data) {
        const docRef = await addDoc(collection(db, 'proveedores'), {
            ...data,
            total_productos: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
        window.AppCache.invalidarProveedores();
        return docRef.id;
    }
};