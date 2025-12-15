// frontend/static/private/js/utils/message-helper.js

const MessageHelper = {
  /**
   * Muestra un mensaje toast/alert
   * @param {string} message - Mensaje a mostrar
   * @param {'success'|'error'|'warning'|'info'} [type='info'] - Tipo de alerta
   * @param {number} [duration=5000] - Duración en ms (0 = no autocerrar)
   */
  show(message, type = 'info', duration = 5000) {
    const container = this.getContainer();

    const typeClasses = {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info',
    };

    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info',
    };

    const alert = document.createElement('div');
    alert.className = `alert ${typeClasses[type]} shadow-lg`;
    alert.setAttribute('role', 'alert');

    alert.innerHTML = `
      <i data-lucide="${icons[type]}" class="w-5 h-5 shrink-0"></i>
      <span class="break-words">${message}</span>
      <button class="btn btn-sm btn-ghost btn-square ml-2" aria-label="Cerrar" onclick="this.closest('.alert').remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(alert);

    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    if (duration > 0) {
      setTimeout(() => alert.remove(), duration);
    }

    return alert;
  },

  getContainer() {
    let container = document.getElementById('message-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'message-container';
      document.body.appendChild(container);
    }

    container.classList.add('toast', 'toast-bottom', 'toast-end', 'z-[9999]');

    return container;
  },

  clear() {
    const container = document.getElementById('message-container');
    if (container) container.innerHTML = '';
  },

  setPosition(vertical = 'bottom', horizontal = 'end') {
    const container = this.getContainer();
    container.classList.remove('toast-top', 'toast-bottom', 'toast-start', 'toast-center', 'toast-end');
    container.classList.add(
      vertical === 'top' ? 'toast-top' : 'toast-bottom',
      horizontal === 'start' ? 'toast-start' : horizontal === 'center' ? 'toast-center' : 'toast-end'
    );
  },

  // Shortcuts
  success(message, duration = 5000) { return this.show(message, 'success', duration); },
  error(message, duration = 5000) { return this.show(message, 'error', duration); },
  warning(message, duration = 5000) { return this.show(message, 'warning', duration); },
  info(message, duration = 5000) { return this.show(message, 'info', duration); },
};

// Global
window.MessageHelper = MessageHelper;
// Atajo
window.showMessage = (message, type = 'info', duration = 5000) =>
  MessageHelper.show(message, type, duration);
