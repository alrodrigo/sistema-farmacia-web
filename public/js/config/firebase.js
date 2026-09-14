// =====================================================
// ARCHIVO: public/js/config/firebase.js
// DESCRIPCIÓN: Configuración y conexión modular a Firebase v10
// =====================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    runTransaction,
    writeBatch,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==================== CONFIGURACIÓN MULTI-ENTORNO ====================

// 1. Configuración de PRODUCCIÓN (El negocio real)
const prodConfig = {
  apiKey: "AIzaSyD7Li27bUVpcPv412xashHQqGpQnHa-17k",
  authDomain: "sistema-farmacia-web.firebaseapp.com",
  projectId: "sistema-farmacia-web",
  storageBucket: "sistema-farmacia-web.firebasestorage.app",
  messagingSenderId: "789396395435",
  appId: "1:789396395435:web:6857ba18bbf9ce1b672eee"
};

// 2. Configuración de DESARROLLO (El búnker de pruebas)
const devConfig = {
  apiKey: "AIzaSyA5vahJBomeIVcGQNWFiM9PpPTdzReaJM4",
  authDomain: "servisalud-dev.firebaseapp.com",
  projectId: "servisalud-dev",
  storageBucket: "servisalud-dev.firebasestorage.app",
  messagingSenderId: "958591889656",
  appId: "1:958591889656:web:9ef6c704e85673e73e0b0d"
};

// 3. El Switch de Entorno (Producción real por defecto, con opción de activar búnker de pruebas con ?env=dev)
const urlParams = new URLSearchParams(window.location.search);
const paramEnv = urlParams.get('env');
if (paramEnv) {
    localStorage.setItem('sfs_force_env', paramEnv);
}
const forcedEnv = localStorage.getItem('sfs_force_env'); // 'prod' | 'dev'
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Si está en la nube o no se ha pedido explícitamente dev, usa PRODUCCIÓN (sistema-farmacia-web)
const isProd = !isLocalhost || forcedEnv !== 'dev';
const firebaseConfig = isProd ? prodConfig : devConfig;

// ==================== INICIALIZACIÓN MODULAR ====================
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

auth.languageCode = 'es';

// ==================== PUENTE DE INTEROPERABILIDAD ====================
// Permite que servicios y controladores aún en transición sigan consultando
// sin romperse mientras se refactorizan individualmente a módulos ES6 puros.

function createDocRef(colName, docId) {
    const dRef = docId ? doc(db, colName, docId) : doc(collection(db, colName));
    return {
        id: dRef.id,
        _ref: dRef,
        get: async () => {
            const snap = await getDoc(dRef);
            return {
                id: snap.id,
                exists: snap.exists(),
                data: () => snap.data()
            };
        },
        set: (data, opts) => setDoc(dRef, data, opts),
        update: (data) => updateDoc(dRef, data),
        delete: () => deleteDoc(dRef)
    };
}

function createQueryRef(colName, constraints = []) {
    return {
        where: (field, op, val) => createQueryRef(colName, [...constraints, where(field, op, val)]),
        orderBy: (field, dir = 'asc') => createQueryRef(colName, [...constraints, orderBy(field, dir)]),
        limit: (num) => createQueryRef(colName, [...constraints, limit(num)]),
        doc: (docId) => createDocRef(colName, docId),
        add: async (data) => {
            const docRef = await addDoc(collection(db, colName), data);
            return { id: docRef.id };
        },
        get: async () => {
            const q = constraints.length > 0 ? query(collection(db, colName), ...constraints) : collection(db, colName);
            const snap = await getDocs(q);
            return {
                size: snap.size,
                empty: snap.empty,
                docs: snap.docs.map(d => ({
                    id: d.id,
                    exists: d.exists(),
                    data: () => d.data()
                })),
                forEach: (cb) => snap.docs.forEach(d => cb({
                    id: d.id,
                    exists: d.exists(),
                    data: () => d.data()
                }))
            };
        }
    };
}

const bridgeDB = {
    ...db,
    _raw: db,
    collection: (colName) => createQueryRef(colName),
    batch: () => {
        const b = writeBatch(db);
        return {
            set: (docWrapper, data) => b.set(docWrapper._ref || docWrapper, data),
            update: (docWrapper, data) => b.update(docWrapper._ref || docWrapper, data),
            delete: (docWrapper) => b.delete(docWrapper._ref || docWrapper),
            commit: () => b.commit()
        };
    },
    runTransaction: (updateFn) => runTransaction(db, async (trans) => {
        return await updateFn({
            get: async (docWrapper) => {
                const rawRef = docWrapper._ref || docWrapper;
                const snap = await trans.get(rawRef);
                return {
                    id: snap.id,
                    exists: snap.exists(),
                    data: () => snap.data()
                };
            },
            set: (docWrapper, data, opts) => trans.set(docWrapper._ref || docWrapper, data, opts),
            update: (docWrapper, data) => trans.update(docWrapper._ref || docWrapper, data),
            delete: (docWrapper) => trans.delete(docWrapper._ref || docWrapper)
        });
    })
};

const bridgeAuth = {
    ...auth,
    _raw: auth,
    get currentUser() { return auth.currentUser; },
    onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
    signOut: () => signOut(auth),
    signInWithEmailAndPassword: (e, p) => signInWithEmailAndPassword(auth, e, p)
};

// Exposición global para interoperabilidad
window.firebase = window.firebase || {};
window.firebase.firestore = window.firebase.firestore || {};
window.firebase.firestore.FieldValue = {
    serverTimestamp: () => serverTimestamp(),
    increment: (n) => increment(n)
};

window.firebaseConfig = firebaseConfig;
window.firebaseApp = app;
window.firebaseAuth = bridgeAuth;
window.firebaseDB = bridgeDB;
window.firebaseStorage = storage;

// Guard para registrar el log solo una vez
if (!window.__firebaseModularInitLogged) {
    window.__firebaseModularInitLogged = true;
    console.log(`🔥 [Firebase v10 Modular] Conectado a: ${isProd ? 'PRODUCCIÓN (Real) [sistema-farmacia-web]' : 'DESARROLLO (Búnker) [servisalud-dev]'}`);
}

export { app, auth, db, storage, firebaseConfig };