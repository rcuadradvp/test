// static/private/js/products/departament/modal-edit.js

export class EditModal {
  constructor(modalId = 'modal_edit') {
    this.modal = document.getElementById(modalId);
    this.form = this.modal?.querySelector('form');
    this.nameInput = document.getElementById('edit-name-input');
    this.descriptionInput = document.getElementById('edit-description-input');
    this.updateBtn = this.form?.querySelector('#btn-update');
    this.cancelBtn = this.form?.querySelector('button[type="reset"]');
    this.loadingOverlay = document.getElementById('modal-edit-loading-overlay');
    this.onUpdateCallback = null;
    this.isSubmitting = false;
    this.currentItem = null;
    this.init();
  }

  init() {
    if (!this.form) {
      console.warn('[EDIT_MODAL] Modal form not found');
      return;
    }

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    this.updateBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleUpdate();
    });

    this.cancelBtn?.addEventListener('click', () => {
      this.reset();
    });

    this.nameInput?.addEventListener('input', () => {
      this.validateForm();
    });
  }

  onUpdate(callback) {
    this.onUpdateCallback = callback;
  }

  open(item) {
    if (!item) {
      console.error('[EDIT_MODAL] No item provided');
      return;
    }

    this.currentItem = item;
    this.populateForm(item);
    this.modal?.showModal();
  }

  populateForm(item) {
    if (this.nameInput) {
      this.nameInput.value = item.name || '';
    }
    if (this.descriptionInput) {
      this.descriptionInput.value = item.description || '';
    }
    this.validateForm();
  }

  async handleUpdate() {
    if (this.isSubmitting) return;
    
    if (!this.validateForm()) {
      return;
    }

    if (!this.currentItem?.id) {
      MessageHelper?.error('Error: ID del departamento no encontrado');
      return;
    }

    const data = this.getFormData();
    
    this.setSubmitting(true);

    try {
      if (this.onUpdateCallback) {
        await this.onUpdateCallback(this.currentItem.id, data);
      }
      this.close();
      this.reset();
    } catch (error) {
      console.error('[EDIT_MODAL] Error updating:', error);
      MessageHelper?.error(error.message || 'Error al actualizar');
    } finally {
      this.setSubmitting(false);
    }
  }

  validateForm() {
    if (!this.nameInput) return false;
    
    const isValid = this.nameInput.checkValidity();
    
    if (isValid) {
      this.nameInput.parentElement?.classList.remove('input-error');
    } else {
      this.nameInput.parentElement?.classList.add('input-error');
    }
    
    return isValid;
  }

  getFormData() {
    return {
      name: this.nameInput?.value.trim() || '',
      description: this.descriptionInput?.value.trim() || ''
    };
  }

  setSubmitting(submitting) {
    this.isSubmitting = submitting;
    if (this.loadingOverlay) {
      if (submitting) {
        this.loadingOverlay.classList.remove('hidden');
      } else {
        this.loadingOverlay.classList.add('hidden');
      }
    }
    if (this.updateBtn) {
      this.updateBtn.disabled = submitting;
    }
    if (this.cancelBtn) {
      this.cancelBtn.disabled = submitting;
    }
  }

  close() {
    this.modal?.close();
  }

  reset() {
    this.form?.reset();
    this.nameInput?.parentElement?.classList.remove('input-error');
    this.currentItem = null;
  }
}