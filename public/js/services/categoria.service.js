// =====================================================
// ARCHIVO: public/js/services/categoria.service.js
// DESCRIPCIÓN: Servicio de Categorías con conteo optimizado en servidor (Firebase v10 Modular)
// =====================================================

import { db } from '../config/firebase.js';
import { CacheService } from './cache.service.js';
import { 
    collection, 
    doc, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    addDoc, 
    updateDoc, 
    writeBatch, 
    serverTimestamp,
    getCountFromServer 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const CategoriaService = {
    /**
     * Obtener todas las categorías ordenadas alfabéticamente
     * @returns {Promise<Array>}
     */
    async getAll() {
        try {
            const q = query(collection(db, 'categorias'), orderBy('nombre', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            // Fallback si falta el índice en Firestore
            console.warn('Fallback al obtener categorías sin índice:', error);
            const snapshot = await getDocs(collection(db, 'categorias'));
            const categorias = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            return categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        }
    },

    /**
     * Conteo ultra-eficiente en servidor para una categoría específica
     * @param {string} categoriaId 
     * @returns {Promise<number>}
     */
    async getProductCount(categoriaId) {
        try {
            const q = query(collection(db, 'products'), where('category', '==', categoriaId));
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count;
        } catch (error) {
            console.warn(`Error al contar productos de la categoría ${categoriaId}:`, error);
            return 0;
        }
    },

    /**
     * Crear nueva categoría
     * @param {object} data 
     * @returns {Promise<object>}
     */
    async create(data) {
        data.created_at = serverTimestamp();
        data.productosCount = 0;
        return await addDoc(collection(db, 'categorias'), data);
    },

    /**
     * Actualizar categoría existente
     * @param {string} id 
     * @param {object} data 
     * @returns {Promise<void>}
     */
    async update(id, data) {
        data.updated_at = serverTimestamp();
        return await updateDoc(doc(db, 'categorias', id), data);
    },

    /**
     * Eliminar categoría y desvincular productos asociados
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async delete(id) {
        const batch = writeBatch(db);

        // 1. Borrar categoría
        batch.delete(doc(db, 'categorias', id));

        // 2. Desvincular productos asociados (category: null)
        const q = query(collection(db, 'products'), where('category', '==', id));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(d => {
            batch.update(doc(db, 'products', d.id), { category: null });
        });

        await batch.commit();
        CacheService.invalidarProductos();
    },

    /**
     * Sincronización ultrarrápida de contadores usando getCountFromServer (Sin descargar productos)
     * @param {Array} categoriasActuales 
     * @returns {Promise<object>}
     */
    async syncCounters(categoriasActuales) {
        try {
            const batch = writeBatch(db);
            let huboCambios = false;

            // 1. Conteo total global directo del servidor
            const totalSnap = await getCountFromServer(collection(db, 'products'));
            const totalProductosGlobal = totalSnap.data().count;

            // 2. Conteo en paralelo para cada categoría
            const conteos = await Promise.all(
                categoriasActuales.map(async (cat) => {
                    const q = query(collection(db, 'products'), where('category', '==', cat.id));
                    const snap = await getCountFromServer(q);
                    return { id: cat.id, count: snap.data().count };
                })
            );

            // 3. Actualizar solo las categorías cuyo contador no coincida
            categoriasActuales.forEach(cat => {
                const match = conteos.find(c => c.id === cat.id);
                const count = match ? match.count : 0;
                if (cat.productosCount !== count) {
                    batch.update(doc(db, 'categorias', cat.id), { productosCount: count });
                    cat.productosCount = count;
                    huboCambios = true;
                }
            });

            // 4. Confirmar cambios si hubo discrepancias
            if (huboCambios) {
                await batch.commit();
            }

            return {
                totalProductos: totalProductosGlobal,
                categoriasActualizadas: categoriasActuales
            };
        } catch (error) {
            console.error('Error al sincronizar contadores de categorías:', error);
            return {
                totalProductos: 0,
                categoriasActualizadas: categoriasActuales
            };
        }
    }
};