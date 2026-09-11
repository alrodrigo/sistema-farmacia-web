// public/js/utils/error-handler.js
import { Toast } from './toast.js';

const FIREBASE_AUTH_MESSAGES = {
    'auth/invalid-email': 'El formato del correo electrónico no es válido.',
    'auth/user-disabled': 'Esta cuenta de usuario ha sido deshabilitada.',
    'auth/user-not-found': 'No existe ningún usuario registrado con este correo.',
    'auth/wrong-password': 'La contraseña ingresada es incorrecta.',
    'auth/invalid-credential': 'Las credenciales proporcionadas son incorrectas.',
    'auth/email-already-in-use': 'Este correo electrónico ya está registrado por otro usuario.',
    'auth/weak-password': 'La contraseña es demasiado débil (mínimo 6 caracteres).',
    'auth/requires-recent-login': 'Esta operación requiere que vuelvas a iniciar sesión.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Por favor, espera unos minutos.',
    'auth/network-request-failed': 'Error de conexión. Verifica tu acceso a internet.'
};

const FIRESTORE_MESSAGES = {
    'permission-denied': 'No tienes permisos suficientes para realizar esta operación.',
    'unavailable': 'El servicio de base de datos no está disponible temporalmente.',
    'deadline-exceeded': 'La operación tardó demasiado tiempo en responder.',
    'resource-exhausted': 'Se ha superado la cuota de operaciones disponibles.',
    'not-found': 'El documento solicitado no existe o fue eliminado.',
    'already-exists': 'El registro que intentas crear ya existe.',
    'failed-precondition': 'La operación no se puede ejecutar en el estado actual de los datos.',
    'cancelled': 'La operación fue cancelada.',
    'unauthenticated': 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.'
};

export const ErrorHandler = {
    /**
     * Parsea un error a un mensaje amigable y claro en español.
     * @param {Error|Object|string} error 
     * @param {string} [context=''] Contexto de la acción que falló (ej: 'al guardar el producto')
     * @returns {string}
     */
    parse(error, context = '') {
        if (!error) return 'Ocurrió un error inesperado.';

        // Si ya es un string
        if (typeof error === 'string') {
            return context ? `Error ${context}: ${error}` : error;
        }

        const code = error.code || '';
        let message = '';

        if (code && FIREBASE_AUTH_MESSAGES[code]) {
            message = FIREBASE_AUTH_MESSAGES[code];
        } else if (code && FIRESTORE_MESSAGES[code]) {
            message = FIRESTORE_MESSAGES[code];
        } else if (error.message) {
            // Manejar excepciones estándar o fallas de red
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                message = 'Sin conexión con el servidor. Verifica tu conexión a internet.';
            } else {
                message = error.message;
            }
        } else {
            message = 'No se pudo completar la operación.';
        }

        return context ? `Error ${context}: ${message}` : message;
    },

    /**
     * Procesa y muestra el error al usuario mediante Toast, registrándolo en consola.
     * @param {Error|Object|string} error 
     * @param {string} [context=''] 
     * @param {number} [duration=4500] 
     * @returns {string} El mensaje presentado
     */
    handle(error, context = '', duration = 4500) {
        console.error(`[ErrorHandler] ${context ? '(' + context + ') ' : ''}`, error);
        const userMessage = this.parse(error, context);
        Toast.error(userMessage, duration);
        return userMessage;
    }
};

if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}
