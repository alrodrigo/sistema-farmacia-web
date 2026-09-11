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
            priority_flag: raw.priority_flag || 'normal',
            description: raw.description || '',
            created_at: raw.created_at || null,
            updated_at: raw.updated_at || null
        };
    },

    /**
     * Evalúa la prioridad comercial y de vencimiento (FEFO) de un producto
     * @param {Object} producto 
     * @returns {Object} { level: 'urgent'|'promo'|'expired'|'normal', label: string, isUrgent: boolean, isPromo: boolean, isExpired: boolean, daysLeft: number|null }
     */
    getPriorityStatus(producto) {
        if (!producto) return { level: 'normal', label: 'Normal', isNormal: true, isUrgent: false, daysLeft: null };

        let daysLeft = null;
        let isExpired = false;
        let isExpiringSoon = false;

        if (producto.expiration_date) {
            const expDate = new Date(producto.expiration_date + 'T23:59:59');
            const today = new Date();
            const diffTime = expDate.getTime() - today.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                isExpired = true;
            } else if (daysLeft <= 45) {
                isExpiringSoon = true;
            }
        }

        if (isExpired) {
            return {
                level: 'expired',
                label: 'Vencido',
                isExpired: true,
                isUrgent: false,
                daysLeft
            };
        }

        if (isExpiringSoon) {
            return {
                level: 'urgent',
                label: daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`,
                isUrgent: true,
                isFefo: true,
                daysLeft
            };
        }

        if (producto.priority_flag === 'urgent') {
            return {
                level: 'urgent',
                label: 'Salida Urgente',
                isUrgent: true,
                isFefo: false,
                daysLeft
            };
        }

        if (producto.priority_flag === 'promo') {
            return {
                level: 'promo',
                label: 'En Promoción',
                isPromo: true,
                isUrgent: false,
                daysLeft
            };
        }

        return {
            level: 'normal',
            label: 'Normal',
            isNormal: true,
            isUrgent: false,
            daysLeft
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
     * Obtiene mapa de categorías ordenadas por nombre (desde CacheService).
     * @returns {Promise<Object>}
     */
    async getCategoriasCache() {
        const categoriasArray = await CacheService.getCategorias();
        const categoriasMap = {};
        categoriasArray.forEach(cat => {
            categoriasMap[cat.id] = { id: cat.id, ...cat };
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
            if (categoryAnterior !== categoryNuevo) {
                CacheService.invalidarCategorias();
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
            if (productoData.category) {
                CacheService.invalidarCategorias();
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
        if (categoryId) {
            CacheService.invalidarCategorias();
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
        CacheService.invalidarCategorias();
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