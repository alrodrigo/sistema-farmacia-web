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
    proveedores_ts: 'sfs_proveedores_ts'
};

const TTL = 10 * 60 * 1000; // 10 minutos

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
     * Una sola lectura a Firestore por sesión (o cuando se invalide).
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

        const snapshot = await getDocs(collection(db, 'proveedores'));
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        _guardar(KEYS.proveedores, KEYS.proveedores_ts, data);
        return data;
    },

    /** Fuerza recarga de productos en la próxima llamada a getProductos(). */
    invalidarProductos() {
        _borrar(KEYS.products, KEYS.products_ts);
    },

    /**
     * Sobrescribe el caché de productos en sessionStorage con un array ya modificado.
     * Usar después de mutaciones en memoria (ej: descuento de stock post-venta).
     * @param {Array} productosArray
     */
    setProductos(productosArray) {
        _guardar(KEYS.products, KEYS.products_ts, productosArray);
    },

    /** Fuerza recarga de proveedores en la próxima llamada a getProveedores(). */
    invalidarProveedores() {
        _borrar(KEYS.proveedores, KEYS.proveedores_ts);
    },

    /** Limpia todo el caché de la aplicación. */
    invalidarTodo() {
        _borrar(KEYS.products, KEYS.products_ts, KEYS.proveedores, KEYS.proveedores_ts);
    },

    clearAll() {
        this.invalidarTodo();
    }
};

// Puente temporal de interoperabilidad
if (typeof window !== 'undefined') {
    window.AppCache = CacheService;
}
