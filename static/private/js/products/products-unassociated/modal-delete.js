// static/private/js/products/products-unassociated/modal-delete.js

export class DeleteModal {
  constructor(modalId = 'modal_delete_confirm') {
    this.modal = document.getElementById(modalId);
    this.itemNameElement = document.getElementById('delete-item-name');
    this.confirmBtn = document.getElementById('btn-confirm-delete');
    this.cancelBtn = document.getElementById('btn-cancel-delete');
    this.loadingOverlay = document.getElementById('modal-delete-loading-overlay');
    this.onConfirmCallback = null;
    this.isDeleting = false;
    this.currentItem = null;
    this.init();
  }

  init() {
    if (!this.modal) {
      console.warn('[DELETE_MODAL] Modal not found');
      return;
    }

    this.confirmBtn?.addEventListener('click', () => {
      this.handleConfirm();
    });

    this.cancelBtn?.addEventListener('click', () => {
      this.close();
    });
  }

  onConfirm(callback) {
    this.onConfirmCallback = callback;
  }

  open(item) {
    if (!item) {
      console.error('[DELETE_MODAL] No item provided');
      return;
    }

    this.currentItem = item;
    
    if (this.itemNameElement) {
      this.itemNameElement.textContent = `Departamento: "${item.name}"`;
    }

    this.modal?.showModal();
  }

  async handleConfirm() {
    if (this.isDeleting || !this.currentItem) return;

    this.setDeleting(true);

    try {
      if (this.onConfirmCallback) {
        await this.onConfirmCallback(this.currentItem);
      }
      this.close();
    } catch (error) {
      console.error('[DELETE_MODAL] Error during deletion:', error);
    } finally {
      this.setDeleting(false);
    }
  }

  setDeleting(deleting) {
    this.isDeleting = deleting;
    if (this.loadingOverlay) {
      if (deleting) {
        this.loadingOverlay.classList.remove('hidden');
      } else {
        this.loadingOverlay.classList.add('hidden');
      }
    }
    if (this.confirmBtn) {
      this.confirmBtn.disabled = deleting;
    }
    if (this.cancelBtn) {
      this.cancelBtn.disabled = deleting;
    }
  }

  close() {
    this.modal?.close();
    this.currentItem = null;
  }
}