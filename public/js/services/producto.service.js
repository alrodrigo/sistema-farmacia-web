// public/js/services/producto.service.js
import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
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
        const parseNum = (v, def = 0) => {
            const n = typeof v === 'number' ? v : parseFloat(v || 0);
            return isNaN(n) ? def : n;
        };
        const parseIntNum = (v, def = 0) => {
            const n = typeof v === 'number' ? Math.floor(v) : parseInt(v || 0, 10);
            return isNaN(n) ? def : n;
        };

        return {
            id: raw.id,
            name: raw.name || raw.nombre || 'Sin nombre',
            sku: (raw.sku || '').toUpperCase(),
            category: raw.category || raw.categoriaId || raw.categoria || '',
            supplier: raw.supplier || raw.laboratorio || raw.proveedorId || raw.proveedor || '',
            price: parseNum(raw.price || raw.precio),
            price_per_box: raw.price_per_box ? parseNum(raw.price_per_box) : null,
            cost: parseNum(raw.cost || raw.costo),
            current_stock: parseIntNum(raw.current_stock !== undefined ? raw.current_stock : (raw.stock !== undefined ? raw.stock : 0)),
            min_stock: parseIntNum(raw.min_stock !== undefined ? raw.min_stock : (raw.stock_minimo !== undefined ? raw.stock_minimo : 0)),
            expiration_date: raw.expiration_date || raw.due_date || raw.fecha_vencimiento || null,
            priority_flag: raw.priority_flag || 'auto',
            is_favorite: raw.is_favorite === true,
            description: raw.description || raw.descripcion || '',
            created_at: raw.created_at || raw.fecha_creacion || null,
            updated_at: raw.updated_at || null
        };
    },

    /**
     * Parsea de manera robusta cualquier formato de fecha proveniente de Firestore
     * (Timestamp con toDate(), { seconds }, Date nativo, String ISO o YYYY-MM-DD)
     * @param {*} val 
     * @returns {Date|null}
     */
    parseExpirationDate(val) {
        if (!val) return null;
        let d = null;
        if (typeof val.toDate === 'function') {
            d = val.toDate();
        } else if (val.seconds !== undefined) {
            d = new Date(val.seconds * 1000);
        } else if (val._seconds !== undefined) {
            d = new Date(val._seconds * 1000);
        } else if (val instanceof Date) {
            d = new Date(val.getTime());
        } else if (typeof val === 'number') {
            d = new Date(val);
        } else if (typeof val === 'string') {
            const trimmed = val.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [y, m, day] = trimmed.split('-').map(Number);
                d = new Date(y, m - 1, day, 23, 59, 59);
            } else {
                d = new Date(trimmed);
            }
        }
        return (d && !isNaN(d.getTime())) ? d : null;
    },

    /**
     * Evalúa la prioridad comercial y de vencimiento (FEFO) de un producto
     * @param {Object} producto 
     * @returns {Object} { level: 'urgent'|'promo'|'expired'|'normal', label: string, isUrgent: boolean, isPromo: boolean, isExpired: boolean, isFefo: boolean, daysLeft: number|null }
     */
    getPriorityStatus(producto) {
        if (!producto) return { level: 'normal', label: 'Normal', isNormal: true, isUrgent: false, isPromo: false, isExpired: false, isFefo: false, daysLeft: null };

        let daysLeft = null;
        let isExpired = false;
        let isExpiringSoon = false;

        const expDate = this.parseExpirationDate(producto.expiration_date);

        if (expDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const target = new Date(expDate.getTime());
            target.setHours(23, 59, 59, 999);

            const diffTime = target.getTime() - today.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                isExpired = true;
            } else if (daysLeft <= 45) {
                isExpiringSoon = true;
            }
        }

        // Si ya está físicamente vencido
        if (isExpired) {
            return {
                level: 'expired',
                label: 'Vencido',
                isExpired: true,
                isUrgent: false,
                isPromo: false,
                isFefo: false,
                daysLeft
            };
        }

        const flag = producto.priority_flag || 'auto';

        // 1. Decisión Manual Forzada: Salida Urgente (siempre rojo)
        if (flag === 'urgent') {
            return {
                level: 'urgent',
                label: isExpiringSoon ? `Vence en ${daysLeft}d` : 'Salida Urgente',
                isUrgent: true,
                isFefo: isExpiringSoon,
                isPromo: false,
                isExpired: false,
                daysLeft
            };
        }

        // 2. Decisión Manual Forzada: En Promoción (siempre amarillo)
        if (flag === 'promo') {
            return {
                level: 'promo',
                label: 'En Promoción',
                isPromo: true,
                isUrgent: false,
                isExpired: false,
                isFefo: false,
                daysLeft
            };
        }

        // 3. Decisión Manual Forzada: Normal / Sin Alerta (el usuario desactiva la alerta)
        if (flag === 'normal') {
            return {
                level: 'normal',
                label: 'Normal',
                isNormal: true,
                isUrgent: false,
                isPromo: false,
                isExpired: false,
                isFefo: false,
                daysLeft
            };
        }

        // 4. Modo Automático (FEFO por vencimiento: 'auto')
        if (isExpiringSoon) {
            return {
                level: 'urgent',
                label: daysLeft === 0 ? 'Vence hoy' : (daysLeft === 1 ? 'Vence mañana' : `Vence en ${daysLeft}d`),
                isUrgent: true,
                isFefo: true,
                isPromo: false,
                isExpired: false,
                daysLeft
            };
        }

        return {
            level: 'normal',
            label: 'Normal',
            isNormal: true,
            isUrgent: false,
            isPromo: false,
            isExpired: false,
            isFefo: false,
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
            CacheService.invalidarProductos();
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
    },

    /**
     * Alterna el estado de favorito (fijado en mostrador) de un producto.
     * Invalida caché y emite notificación BroadcastChannel a todas las pestañas de ventas.
     * @param {string} id
     * @param {boolean} nuevoEstado
     * @returns {Promise<boolean>}
     */
    async toggleFavorite(id, nuevoEstado) {
        const prodRef = doc(db, 'products', id);
        await updateDoc(prodRef, {
            is_favorite: nuevoEstado,
            updated_at: serverTimestamp()
        });
        CacheService.invalidarProductos(true);
        return nuevoEstado;
    }
};