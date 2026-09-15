// public/js/services/cache.service.js
import { db } from '../config/firebase.js';
import {
    collection,
    getDocs,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const KEYS = {
    products:       'sfs_products',
    products_ts:    'sfs_products_ts',
    proveedores:    'sfs_proveedores',
    proveedores_ts: 'sfs_proveedores_ts',
    categorias:     'sfs_categorias',
    categorias_ts:  'sfs_categorias_ts'
};

const TTL = 10 * 60 * 1000; // 10 minutos de vigencia en sesión

// Canal de mensajería asíncrona entre pestañas para sincronización en tiempo real
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
    ? new BroadcastChannel('sfs_inventory_channel') 
    : null;

function _leer(key, tsKey) {
    try {
        const ts = sessionStorage.getItem(tsKey);
        if (!ts || (Date.now() - parseInt(ts, 10)) > TTL) return null;
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function _guardar(key, tsKey, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify(data));
        sessionStorage.setItem(tsKey, Date.now().toString());
    } catch (e) {
        console.warn('CacheService: sessionStorage lleno o bloqueado', e);
    }
}

function _borrar(...keys) {
    keys.forEach(k => {
        try {
            sessionStorage.removeItem(k);
        } catch (e) {}
    });
}

export const CacheService = {
    /**
     * Devuelve la colección 'products' desde sessionStorage o Firestore.
     * @returns {Promise<Array>}
     */
    async getProductos() {
        const cached = _leer(KEYS.products, KEYS.products_ts);
        if (cached) return cached;

        const q = query(collection(db, 'products'), orderBy('created_at', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        _guardar(KEYS.products, KEYS.products_ts, data);
        return data;
    },

    /**
     * Devuelve la colección 'proveedores' desde sessionStorage o Firestore.
     * @returns {Promise<Array>}
     */
    async getProveedores() {
        const cached = _leer(KEYS.proveedores, KEYS.proveedores_ts);
        if (cached) return cached;

        let snapshot;
        try {
            const q = query(collection(db, 'proveedores'), orderBy('nombre', 'asc'));
            snapshot = await getDocs(q);
        } catch (e) {
            snapshot = await getDocs(collection(db, 'proveedores'));
        }
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        _guardar(KEYS.proveedores, KEYS.proveedores_ts, data);
        return data;
    },

    /**
     * Devuelve la colección 'categorias' desde sessionStorage o Firestore.
     * @returns {Promise<Array>}
     */
    async getCategorias() {
        const cached = _leer(KEYS.categorias, KEYS.categorias_ts);
        if (cached) return cached;

        let snapshot;
        try {
            const q = query(collection(db, 'categorias'), orderBy('nombre', 'asc'));
            snapshot = await getDocs(q);
        } catch (e) {
            snapshot = await getDocs(collection(db, 'categorias'));
        }
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        _guardar(KEYS.categorias, KEYS.categorias_ts, data);
        return data;
    },

    /** Fuerza recarga de productos en la próxima llamada y notifica a otras pestañas. */
    invalidarProductos(broadcast = true) {
        _borrar(KEYS.products, KEYS.products_ts);
        if (broadcast && syncChannel) {
            try {
                syncChannel.postMessage({ type: 'INVENTORY_CHANGED', timestamp: Date.now() });
            } catch (e) {
                console.warn('CacheService: error al emitir BroadcastChannel', e);
            }
        }
    },

    /**
     * Escucha notificaciones en tiempo real cuando otra pestaña actualiza productos/inventario.
     * @param {Function} callback 
     * @returns {Function} Función para desuscribirse
     */
    onInventoryChange(callback) {
        if (!syncChannel || typeof callback !== 'function') return () => {};
        const handler = (event) => {
            if (event.data?.type === 'INVENTORY_CHANGED') {
                _borrar(KEYS.products, KEYS.products_ts);
                callback(event.data);
            }
        };
        syncChannel.addEventListener('message', handler);
        return () => syncChannel.removeEventListener('message', handler);
    },

    /** Sobrescribe el caché de productos en sessionStorage tras mutaciones en memoria. */
    setProductos(productosArray) {
        _guardar(KEYS.products, KEYS.products_ts, productosArray);
    },

    /** Fuerza recarga de proveedores en la próxima llamada. */
    invalidarProveedores() {
        _borrar(KEYS.proveedores, KEYS.proveedores_ts);
    },

    /** Sobrescribe el caché de proveedores. */
    setProveedores(proveedoresArray) {
        _guardar(KEYS.proveedores, KEYS.proveedores_ts, proveedoresArray);
    },

    /** Fuerza recarga de categorías en la próxima llamada. */
    invalidarCategorias() {
        _borrar(KEYS.categorias, KEYS.categorias_ts);
    },

    /** Sobrescribe el caché de categorías. */
    setCategorias(categoriasArray) {
        _guardar(KEYS.categorias, KEYS.categorias_ts, categoriasArray);
    },

    /** Limpia todo el caché de la aplicación. */
    invalidarTodo() {
        _borrar(
            KEYS.products, KEYS.products_ts,
            KEYS.proveedores, KEYS.proveedores_ts,
            KEYS.categorias, KEYS.categorias_ts
        );
    },

    clearAll() {
        this.invalidarTodo();
    }
};

if (typeof window !== 'undefined') {
    window.AppCache = CacheService;
}
