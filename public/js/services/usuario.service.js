// public/js/services/usuario.service.js
import { db, auth } from '../config/firebase.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const UsuarioService = {
    /**
     * Obtiene todos los usuarios registrados en Firestore ordenados por nombre
     * @returns {Promise<Array>}
     */
    async getAll() {
        const snapshot = await getDocs(collection(db, 'users'));
        const usuarios = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        usuarios.sort((a, b) => {
            const nameA = (a.name || a.nombre || a.email || '').toLowerCase();
            const nameB = (b.name || b.nombre || b.email || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        return usuarios;
    },

    /**
     * Consulta el número total de usuarios directamente en el servidor sin descargar documentos.
     * @returns {Promise<number>}
     */
    async getTotalCountFromServer() {
        const snapshot = await getCountFromServer(collection(db, 'users'));
        return snapshot.data().count;
    },

    /**
     * Crea un nuevo usuario en Firebase Auth sin cerrar la sesión actual del administrador,
     * utilizando una instancia secundaria efímera de Firebase App.
     * @param {Object} param0
     * @returns {Promise<string>} UID del nuevo usuario
     */
    async create({ name, email, password, role, permissions = [] }) {
        const config = window.firebaseConfig;
        if (!config) throw new Error('Configuración de Firebase no disponible.');

        // Instancia secundaria aislada en memoria RAM
        const tempAppName = `TempUserCreation_${Date.now()}`;
        const secondaryApp = initializeApp(config, tempAppName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Garantizar jerarquía lógica de permisos (gestionar requiere ver productos)
            let sanitizedPerms = Array.isArray(permissions) ? [...permissions] : [];
            if (sanitizedPerms.includes('gestionar_productos') && !sanitizedPerms.includes('ver_productos')) {
                sanitizedPerms.push('ver_productos');
            }

            // 1. Crear usuario en Firebase Auth en la app aislada
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // 2. Guardar perfil en Firestore en la app principal
            await setDoc(doc(db, 'users', uid), {
                name: name,
                nombre: name,
                email: email,
                role: role,
                permissions: sanitizedPerms,
                active: true,
                created_at: serverTimestamp()
            });

            return uid;
        } finally {
            // 3. Autodestruir conexión temporal para liberar memoria
            await deleteApp(secondaryApp);
        }
    },

    /**
     * Actualiza los datos de un usuario en Firestore
     * @param {string} id
     * @param {Object} data
     */
    async update(id, data) {
        const updateData = { ...data };
        if (updateData.permissions && Array.isArray(updateData.permissions)) {
            if (updateData.permissions.includes('gestionar_productos') && !updateData.permissions.includes('ver_productos')) {
                updateData.permissions = [...updateData.permissions, 'ver_productos'];
            }
        }
        await updateDoc(doc(db, 'users', id), {
            ...updateData,
            updated_at: serverTimestamp()
        });
    },

    /**
     * Elimina el registro del usuario en Firestore
     * @param {string} id
     */
    async delete(id) {
        await deleteDoc(doc(db, 'users', id));
    },

    /**
     * Actualiza la contraseña del usuario actualmente logueado
     * @param {string} newPassword
     */
    async updateOwnPassword(newPassword) {
        const user = auth.currentUser;
        if (!user) throw new Error('No autenticado');

        await updatePassword(user, newPassword);
        await updateDoc(doc(db, 'users', user.uid), {
            password_updated_at: serverTimestamp()
        });
    },

    /**
     * Reautentica y cambia la contraseña del usuario actual
     * @param {string} currentPassword
     * @param {string} newPassword
     */
    async reauthenticateAndChangePassword(currentPassword, newPassword) {
        const user = auth.currentUser;
        if (!user) throw new Error('No autenticado');

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        await updateDoc(doc(db, 'users', user.uid), {
            password_updated_at: serverTimestamp()
        });
    },

    /**
     * Envía correo de recuperación de contraseña
     * @param {string} email
     */
    async sendPasswordResetEmail(email) {
        await firebaseSendPasswordResetEmail(auth, email);
    }
};