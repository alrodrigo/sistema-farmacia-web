// public/js/utils/confirm.js

export const ConfirmDialog = {
    /**
     * Muestra un modal de confirmación asíncrono basado en Promesas
     * @param {string|Object} titleOrOptions - Título principal u objeto de opciones
     * @param {string} [message] - Mensaje secundario (acepta \n)
     * @param {string} [type='danger'] - 'danger' (rojo), 'warning' (amarillo), 'info' (azul)
     * @param {string} [confirmText='Aceptar'] - Texto del botón de confirmar
     * @param {string} [cancelText='Cancelar'] - Texto del botón de cancelar
     * @returns {Promise<boolean>}
     */
    show(titleOrOptions, message = '', type = 'danger', confirmText = 'Aceptar', cancelText = 'Cancelar') {
        let opts = {};
        if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
            opts = {
                title: titleOrOptions.title || '¿Estás seguro?',
                message: titleOrOptions.message || '',
                type: titleOrOptions.type || 'danger',
                confirmText: titleOrOptions.confirmText || 'Aceptar',
                cancelText: titleOrOptions.cancelText || 'Cancelar',
                icon: titleOrOptions.icon
            };
        } else {
            opts = {
                title: titleOrOptions || '¿Estás seguro?',
                message,
                type,
                confirmText,
                cancelText
            };
        }

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';

            const defaultIcons = {
                danger: 'fa-trash-alt',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };
            const iconClass = opts.icon || defaultIcons[opts.type] || 'fa-question-circle';
            const btnClass = opts.type === 'danger' ? 'btn-danger' : 'btn-primary';

            overlay.innerHTML = `
                <div class="confirm-box" role="dialog" aria-modal="true">
                    <div class="confirm-icon ${opts.type}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="confirm-title">${opts.title}</div>
                    <div class="confirm-message">${opts.message}</div>
                    <div class="confirm-actions">
                        <button type="button" class="btn-confirm-cancel" id="btnConfirmCancel">${opts.cancelText}</button>
                        <button type="button" class="btn ${btnClass}" id="btnConfirmAccept">${opts.confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const closeAndResolve = (result) => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 200);
            };

            const btnAccept = overlay.querySelector('#btnConfirmAccept');
            const btnCancel = overlay.querySelector('#btnConfirmCancel');

            btnAccept?.addEventListener('click', () => closeAndResolve(true));
            btnCancel?.addEventListener('click', () => closeAndResolve(false));

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeAndResolve(false);
            });

            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    window.removeEventListener('keydown', onKeyDown);
                    closeAndResolve(false);
                }
            };
            window.addEventListener('keydown', onKeyDown, { once: true });
        });
    }
};

if (typeof window !== 'undefined') {
    window.ConfirmDialog = ConfirmDialog;
}
