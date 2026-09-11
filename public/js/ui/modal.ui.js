// public/js/ui/modal.ui.js

/**
 * Controlador Universal y Ortogonal de Modales (ModalUI)
 * Maneja apertura, cierre, accesibilidad, tecla Escape, clic en overlay y bloqueo de scroll.
 */
export const ModalUI = {
    _activeModals: [],
    _escapeListenerAttached: false,

    _attachGlobalListeners() {
        if (this._escapeListenerAttached) return;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._activeModals.length > 0) {
                const topModal = this._activeModals[this._activeModals.length - 1];
                this.close(topModal);
            }
        });
        this._escapeListenerAttached = true;
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
     * Vincula eventos estándar de cierre (botones X, Cancelar, clic en overlay) a un modal.
     * @param {string|HTMLElement} modalOrId 
     * @param {Object} [options={}] 
     * @param {string|HTMLFormElement} [options.form] Formulario opcional a resetear al cerrar
     * @param {Function} [options.onClose] Callback al cerrar
     * @param {Function} [options.onOpen] Callback al abrir
     */
    bind(modalOrId, options = {}) {
        const modal = this._resolve(modalOrId);
        if (!modal) return;

        this._attachGlobalListeners();

        // Botones de cierre estándar dentro del modal
        const closeSelectors = '.modal-close, #btnCerrarModal, #btnCloseModal, #btnCancelar, [data-modal-close]';
        const closeButtons = modal.querySelectorAll(closeSelectors);
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Si es un botón submit no cerramos accidentalmente
                if (btn.type !== 'submit') {
                    e.preventDefault();
                    this.close(modal, !!options.form);
                }
            });
        });

        // Clic en el overlay o fondo del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                this.close(modal, !!options.form);
            }
        });

        // Guardamos opciones en el elemento para recuperarlas
        modal._modalOptions = options;
    },

    /**
     * Abre un modal con transición suave y bloquea el scroll del fondo
     * @param {string|HTMLElement} modalOrId 
     * @param {Object} [openOptions={}]
     */
    open(modalOrId, openOptions = {}) {
        const modal = this._resolve(modalOrId);
        if (!modal) return;

        this._attachGlobalListeners();

        // Aseguramos visibilidad si tenía display: none
        if (modal.style.display === 'none') {
            modal.style.display = 'flex';
        }

        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        if (!this._activeModals.includes(modal)) {
            this._activeModals.push(modal);
        }

        document.body.style.overflow = 'hidden';

        // Auto-focus en el primer input accesible
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 150);

        const opts = modal._modalOptions || openOptions;
        if (typeof opts.onOpen === 'function') {
            opts.onOpen(modal);
        }
    },

    /**
     * Cierra un modal y restaura el scroll del fondo
     * @param {string|HTMLElement} modalOrId 
     * @param {boolean} [resetForm=false] 
     */
    close(modalOrId, resetForm = false) {
        const modal = this._resolve(modalOrId);
        if (!modal) return;

        modal.classList.remove('active');

        // Si usaba inline display: flex, esperar transición de opacidad (250ms)
        if (modal.style.display === 'flex') {
            setTimeout(() => {
                if (!modal.classList.contains('active')) {
                    modal.style.display = 'none';
                }
            }, 250);
        }

        this._activeModals = this._activeModals.filter(m => m !== modal);
        if (this._activeModals.length === 0) {
            document.body.style.overflow = '';
        }

        const opts = modal._modalOptions || {};
        if (resetForm || opts.form) {
            const form = typeof opts.form === 'string' ? document.getElementById(opts.form) : (opts.form || modal.querySelector('form'));
            if (form && typeof form.reset === 'function') {
                form.reset();
            }
        }

        if (typeof opts.onClose === 'function') {
            opts.onClose(modal);
        }
    }
};

if (typeof window !== 'undefined') {
    window.ModalUI = ModalUI;
}
