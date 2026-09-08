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