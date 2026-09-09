// public/js/services/usuario.service.js
const db = window.firebaseDB;
const auth = window.firebaseAuth;

export const UsuarioService = {
    async getAll() {
        const snapshot = await db.collection('users').get();
        const usuarios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        usuarios.sort((a, b) => {
            const nameA = (a.name || a.email).toLowerCase();
            const nameB = (b.name || b.email).toLowerCase();
            return nameA.localeCompare(nameB);
        });

        return usuarios;
    },

    async create({ name, email, password, role }) {
        const config = window.firebaseConfig || (window.firebase && window.firebase.apps.length ? window.firebase.app().options : null);
        if (!config) throw new Error('Configuración de Firebase no disponible.');

        // Instancia secundaria aislada en memoria RAM
        const tempAppName = `TempUserCreation_${Date.now()}`;
        const secondaryApp = window.firebase.initializeApp(config, tempAppName);

        try {
            // 1. Crear usuario en Firebase Auth
            const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // 2. Guardar perfil en Firestore
            await db.collection('users').doc(uid).set({
                name: name,
                nombre: name,
                email: email,
                role: role,
                active: true,
                created_at: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            return uid;
        } finally {
            // 3. Autodestruir conexión temporal para liberar memoria
            await secondaryApp.delete();
        }
    },

    async update(id, data) {
        await db.collection('users').doc(id).update({
            ...data,
            updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async delete(id) {
        await db.collection('users').doc(id).delete();
    },

    async updateOwnPassword(newPassword) {
        const user = auth.currentUser;
        if (!user) throw new Error('No autenticado');

        await user.updatePassword(newPassword);
        await db.collection('users').doc(user.uid).update({
            password_updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async reauthenticateAndChangePassword(currentPassword, newPassword) {
        const user = auth.currentUser;
        if (!user) throw new Error('No autenticado');

        const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);

        await db.collection('users').doc(user.uid).update({
            password_updated_at: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async sendPasswordResetEmail(email) {
        await auth.sendPasswordResetEmail(email);
    }
};