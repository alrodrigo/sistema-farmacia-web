// public/js/services/producto.service.js
import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
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
     * Normaliza un producto a un esquema ortogonal predecible
     * @param {Object} raw
     * @returns {Object}
     */
    normalize(raw) {
        if (!raw) return null;
        return {
            id: raw.id,
            name: raw.name || raw.nombre || 'Sin nombre',
            sku: (raw.sku || '').toUpperCase(),
            category: raw.category || raw.categoriaId || '',
            supplier: raw.supplier || raw.laboratorio || raw.proveedorId || '',
            price: typeof raw.price === 'number' ? raw.price : parseFloat(raw.price || 0),
            price_per_box: raw.price_per_box ? parseFloat(raw.price_per_box) : null,
            cost: typeof raw.cost === 'number' ? raw.cost : parseFloat(raw.cost || 0),
            current_stock: typeof raw.current_stock === 'number' ? raw.current_stock : parseInt(raw.current_stock || 0, 10),
            min_stock: typeof raw.min_stock === 'number' ? raw.min_stock : parseInt(raw.min_stock || 0, 10),
            expiration_date: raw.expiration_date || null,
            description: raw.description || '',
            created_at: raw.created_at || null,
            updated_at: raw.updated_at || null
        };
    },

    /**
     * Obtiene todos los productos normalizados (con caché en sessionStorage vía CacheService).
     * @returns {Promise<Array>}
     */
    async getAll() {
        const rawList = await CacheService.getProductos();
        return rawList.map(p => this.normalize(p));
    },

    /**
     * Migra en lote documentos antiguos que pudieran tener 'categoriaId' a 'category'
     * @returns {Promise<number>} Cantidad de documentos migrados
     */
    async migrarCamposLegadosFirestore() {
        const q = query(collection(db, 'products'));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        let actualizados = 0;

        snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.categoriaId && !data.category) {
                batch.update(docSnap.ref, { category: data.categoriaId });
                actualizados++;
            }
        });

        if (actualizados > 0) {
            await batch.commit();
            CacheService.invalidarProductos();
        }
        return actualizados;
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
     * Obtiene mapa de proveedores (desde CacheService).
     * @returns {Promise<Object>}
     */
    async getProveedoresCache() {
        const proveedoresArray = await CacheService.getProveedores();
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
                CacheService.invalidarProveedores();
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
                CacheService.invalidarProveedores();
            }
            CacheService.invalidarProductos();
            return prodRef.id;
        }

        CacheService.invalidarProductos();
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
            CacheService.invalidarProveedores();
        }
        CacheService.invalidarProductos();
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
        CacheService.invalidarProveedores();
        return docRef.id;
    }
};