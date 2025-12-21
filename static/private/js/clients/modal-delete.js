// static/private/js/clients/modal-delete.js

export class DeleteModal {
  constructor() {
    this.modal = null;
    this.currentItem = null;
    this.onConfirmCallback = null;
    this.isDeleting = false;
  }

  init(onConfirm) {
    this.modal = document.getElementById('modal-delete-client');
    this.onConfirmCallback = onConfirm;

    if (!this.modal) {
      console.error('[DeleteModal] Modal not found');
      return;
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const confirmBtn = this.modal.querySelector('[data-action="confirm"]');
    const cancelBtn = this.modal.querySelector('[data-action="cancel"]');

    confirmBtn?.addEventListener('click', async () => {
      if (this.isDeleting || !this.currentItem) return;

      try {
        this.isDeleting = true;
        this.setLoading(true);

        if (this.onConfirmCallback) {
          await this.onConfirmCallback(this.currentItem);
          this.close();
        }
      } catch (error) {
        console.error('[DeleteModal] Error deleting:', error);
        MessageHelper?.error(error.message || 'Error al desactivar cliente');
      } finally {
        this.isDeleting = false;
        this.setLoading(false);
      }
    });

    cancelBtn?.addEventListener('click', () => this.close());
  }

  open(item) {
    if (!this.modal || !item) return;
    
    this.currentItem = item;
    this.updateContent(item);
    this.modal.showModal();
  }

  updateContent(item) {
    const nameElement = this.modal.querySelector('#delete-client-name');
    if (nameElement) {
      const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'este cliente';
      nameElement.textContent = fullName;
    }
  }

  close() {
    if (!this.modal) return;
    this.modal.close();
    this.currentItem = null;
  }

  setLoading(isLoading) {
    const confirmBtn = this.modal?.querySelector('[data-action="confirm"]');
    const confirmText = confirmBtn?.querySelector('.confirm-text');
    const confirmLoader = confirmBtn?.querySelector('.confirm-loader');

    if (confirmBtn) {
      confirmBtn.disabled = isLoading;
    }

    if (confirmText) {
      confirmText.classList.toggle('hidden', isLoading);
    }

    if (confirmLoader) {
      confirmLoader.classList.toggle('hidden', !isLoading);
    }
  }
}