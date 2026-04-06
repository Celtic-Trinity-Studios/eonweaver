/**
 * Eon Weaver — Reusable Modal Component
 */

let activeModal = null;

/**
 * Show a modal with the given content.
 * @param {Object} options
 * @param {string} options.title - Modal title
 * @param {string} options.content - HTML content for the body
 * @param {string} [options.width] - 'normal' or 'wide'
 * @param {Function} [options.onClose] - Called when modal is dismissed
 * @returns {{ el: HTMLElement, close: Function }} Modal instance
 */
export function showModal({ title, content, width = 'normal', onClose }) {
    closeModal(); // Close any existing modal

    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
    <div class="modal-content ${width === 'wide' ? 'modal-wide' : ''}">
      <h2 class="modal-title">${title}</h2>
      <button class="modal-close" id="modal-close-btn">&times;</button>
      <div class="modal-body">${content}</div>
    </div>
  `;

    document.body.appendChild(overlay);
    activeModal = overlay;

    // Close on X button
    overlay.querySelector('#modal-close-btn').addEventListener('click', () => closeModal());

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Close on Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', escHandler);

    const close = () => {
        document.removeEventListener('keydown', escHandler);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (activeModal === overlay) activeModal = null;
        if (onClose) onClose();
    };

    return { el: overlay.querySelector('.modal-body'), close };
}

/**
 * Close the currently active modal.
 */
export function closeModal() {
    if (activeModal && activeModal.parentNode) {
        activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
}
