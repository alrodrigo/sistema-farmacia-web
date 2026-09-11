// public/js/ui/modal.ui.js

/**
 * Controlador Universal y Ortogonal de Modales (ModalUI)
 * - Manejo robusto de apertura y cierre sin bucles de recursión.
 * - Delegación de eventos en botones de cierre ('X' y 'Cancelar').
 * - Protegido contra cierres accidentales al hacer clic fuera del recuadro.
 */
export const ModalUI = {
    _activeModals: [],
    _globalListenersAttached: false,

    _attachGlobalListeners() {
        if (this._globalListenersAttached) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._activeModals.length > 0) {
                const topModal = this._activeModals[this._activeModals.length - 1];
                const opts = topModal._modalOptions || {};
                // Por defecto Escape está habilitado salvo que se configure lo contrario
                if (opts.closeOnEscape !== false) {
                    this.close(topModal);
                }
            }
        });
        
        this._globalListenersAttached = true;
    },

    /**
     * Resuelve un elemento modal a partir de un ID o elemento DOM
     * @param {string|HTMLElement} modalOrId 
     * @returns {HTMLElement|null}
     */
    _resolve(modalOrId) {
        if (!modalOrId) return null;
        if (typeof modalOrId === 'string') {
            return document.getElementById(modalOrId);
        }
        return modalOrId;
    },

    /**
     * Vincula eventos de cierre al modal.
     * @param {string|HTMLElement} modalOrId 
     * @param {Object} [options={}] 
     * @param {string|HTMLFormElement} [options.form] Formulario asociado a resetear
     * @param {boolean} [options.closeOnBackdrop=false] Si es false (por defecto), clic fuera NO cierra el modal para evitar pérdida de datos.
     * @param {boolean} [options.closeOnEscape=true]
     * @param {Function} [options.onClose] Callback ejecutado DESPUÉS de cerrar (no debe volver a llamar close)
     * @param {Function} [options.onOpen] Callback al abrir
     */
    bind(modalOrId, options = {}) {
        const modal = this._resolve(modalOrId);
        if (!modal) return;

        this._attachGlobalListeners();

        // Opciones con valores seguros por defecto: NO cerrar por clic afuera accidental
        modal._modalOptions = {
            closeOnBackdrop: false,
            closeOnEscape: true,
            ...options
        };

        // Selector exhaustivo de botones de cierre
        const closeSelector = '.modal-close, .quick-modal-close, [data-dismiss="modal"], #btnCerrarModal, #btnCloseModal, #btnCancelar, #btnCancelarModalActualizar, #btnCerrarModalActualizar, #btnCerrarNuevaCategoria, #btnCerrarNuevoProveedor, #btnCerrarModalCierre, #closeDetailModal, #closeCierreCajaModal, #closeModalBtn, .btn-cancelar, [data-modal-close], button[onclick*="cerrarModal"]';

        // Asegurar que ningún botón de cierre actúe como submit por defecto en formularios
        modal.querySelectorAll(closeSelector).forEach(btn => {
            if (btn.tagName === 'BUTTON' && !btn.getAttribute('type')) {
                btn.type = 'button';
            }
        });

        if (modal._modalBound) return;
        modal._modalBound = true;

        // Delegación de clics: captura precisa de botones de cierre ('X', 'Cancelar')
        // Funciona tanto si se hace clic en el botón, en el icono <i> o en el texto
        modal.addEventListener('click', (e) => {
            const closeBtn = e.target.closest(closeSelector);

            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.close(modal, !!modal._modalOptions.form);
                return;
            }

            // Clic en el fondo/backdrop exterior: SOLO si está explícitamente activado
            if (modal._modalOptions.closeOnBackdrop) {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    this.close(modal, !!modal._modalOptions.form);
                }
            }
        });
    },

    /**
     * Abre un modal
     * @param {string|HTMLElement} modalOrId 
     * @param {Object} [openOptions={}]
     */
    open(modalOrId, openOptions = {}) {
        const modal = this._resolve(modalOrId);
        if (!modal) return;

        this._attachGlobalListeners();

        // Asegurar visibilidad limpia
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        if (!this._activeModals.includes(modal)) {
            this._activeModals.push(modal);
        }

        document.body.style.overflow = 'hidden';

        // Auto-enfoque al primer campo disponible
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 120);

        const opts = modal._modalOptions || openOptions;
        if (typeof opts.onOpen === 'function') {
            opts.onOpen(modal);
        }
    },

    /**
     * Cierra un modal de forma inmediata y confiable sin bucles de recursión
     * @param {string|HTMLElement} modalOrId 
     * @param {boolean} [resetForm=false] 
     */
    close(modalOrId, resetForm = false) {
        const modal = this._resolve(modalOrId);
        if (!modal || modal._isClosing) return;

        modal._isClosing = true;

        try {
            // Ocultar de inmediato eliminando clase y restableciendo display
            modal.classList.remove('active');
            modal.style.display = 'none';

            this._activeModals = this._activeModals.filter(m => m !== modal);
            if (this._activeModals.length === 0) {
                document.body.style.overflow = '';
            }

            const opts = modal._modalOptions || {};

            // Resetear formulario si corresponde
            if (resetForm || opts.form) {
                const formElem = typeof opts.form === 'string'
                    ? document.getElementById(opts.form)
                    : (opts.form || modal.querySelector('form'));
                if (formElem && typeof formElem.reset === 'function') {
                    formElem.reset();
                }
            }

            if (typeof opts.onClose === 'function') {
                opts.onClose(modal);
            }
        } finally {
            modal._isClosing = false;
        }
    }
};

if (typeof window !== 'undefined') {
    window.ModalUI = ModalUI;
}
