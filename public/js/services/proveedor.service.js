// public/js/services/proveedor.service.js
import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    writeBatch,
    serverTimestamp,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const ProveedorService = {
    /**
     * Obtiene todos los proveedores ordenados alfabéticamente por nombre (vía CacheService)
     * @param {boolean} [forceRefresh=false]
     * @returns {Promise<Array>}
     */
    async getAll(forceRefresh = false) {
        if (forceRefresh) {
            CacheService.invalidarProveedores();
        }
        return await CacheService.getProveedores();
    },

    /**
     * Consulta el número total de proveedores directamente en el servidor sin descargar documentos.
     * @returns {Promise<number>}
     */
    async getTotalCountFromServer() {
        const snapshot = await getCountFromServer(collection(db, 'proveedores'));
        return snapshot.data().count;
    },

    /**
     * Cuenta en el servidor la cantidad de productos asociados a un proveedor específico.
     * Consume 1 lectura por cada 1,000 productos contados.
     * @param {string} supplierId
     * @returns {Promise<number>}
     */
    async getProductCountFromServer(supplierId) {
        const q = query(collection(db, 'products'), where('supplier', '==', supplierId));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    /**
     * Sincroniza en paralelo los contadores de productos de los proveedores
     * consultando directamente al servidor de Firestore sin descargar productos.
     * @param {Array} proveedores
     * @returns {Promise<Array>}
     */
    async syncCounters(proveedores) {
        return await Promise.all(proveedores.map(async (prov) => {
            try {
                const count = await this.getProductCountFromServer(prov.id);
                if (prov.total_productos !== count) {
                    updateDoc(doc(db, 'proveedores', prov.id), {
                        total_productos: count,
                        productosCount: count
                    }).catch(() => {});
                }
                return { ...prov, total_productos: count, productosCount: count };
            } catch (e) {
                return prov;
            }
        }));
    },

    /**
     * Guarda o actualiza un proveedor en Firestore
     * @param {string|null} id
     * @param {Object} data
     * @param {string} userId
     */
    async save(id, data, userId) {
        const timestamp = serverTimestamp();
        const payload = {
            ...data,
            updated_at: timestamp,
            updated_by: userId
        };

        if (id) {
            await updateDoc(doc(db, 'proveedores', id), payload);
        } else {
            payload.created_at = timestamp;
            payload.created_by = userId;
            payload.productosCount = 0;
            payload.total_productos = 0;
            await addDoc(collection(db, 'proveedores'), payload);
        }

        CacheService.invalidarProveedores();
    },

    /**
     * Elimina un proveedor y desvincula atómicamente sus productos asociados
     * @param {string} id
     */
    async delete(id) {
        const batch = writeBatch(db);

        // 1. Eliminar el documento del proveedor
        batch.delete(doc(db, 'proveedores', id));

        // 2. Liberar productos huérfanos (asignar supplier = null)
        const q = query(collection(db, 'products'), where('supplier', '==', id));
        const productosSnapshot = await getDocs(q);

        productosSnapshot.docs.forEach(docSnap => {
            batch.update(doc(db, 'products', docSnap.id), { supplier: null });
        });

        await batch.commit();

        CacheService.invalidarProveedores();
        CacheService.invalidarProductos();
    }
};