// static/private/js/products/products/modal-create.js  

export class CreateModal {
  constructor(modalId = 'my_modal_3') {
    this.modal = document.getElementById(modalId);
    this.form = this.modal?.querySelector('form');
    this.nameInput = this.form?.querySelector('input[type="text"]');
    this.descriptionInput = this.form?.querySelectorAll('input[type="text"]')[1];
    this.createBtn = this.form?.querySelector('#btn-create');
    this.cancelBtn = this.form?.querySelector('button[type="reset"]');
    this.onCreateCallback = null;
    this.isSubmitting = false;
    this.init();
  }

  init() {
    if (!this.form) {
      console.warn('[MODAL] Modal form not found');
      return;
    }
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
    });
    this.createBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleCreate();
    });
    this.cancelBtn?.addEventListener('click', () => {
      this.reset();
    });
    this.nameInput?.addEventListener('input', () => {
      this.validateForm();
    });
  }

  onCreate(callback) {
    this.onCreateCallback = callback;
  }

  async handleCreate() {
    if (this.isSubmitting) return;
    
    if (!this.validateForm()) {
      MessageHelper?.error('Por favor completa correctamente el formulario');
      return;
    }

    const data = this.getFormData();
    
    this.setSubmitting(true);

    try {
      if (this.onCreateCallback) {
        await this.onCreateCallback(data);
      }
      this.close();
      this.reset();
    } catch (error) {
      console.error('[MODAL] Error creating:', error);
      MessageHelper?.error(error.message || 'Error al crear');
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
    
    if (this.createBtn) {
      this.createBtn.disabled = submitting;
      
      if (submitting) {
        this.createBtn.innerHTML = `
          <span class="loading loading-spinner loading-sm"></span>
          Creando...
        `;
      } else {
        this.createBtn.textContent = 'CREAR';
      }
    }
  }

  open() {
    this.modal?.showModal();
  }

  close() {
    this.modal?.close();
  }

  reset() {
    this.form?.reset();
    this.nameInput?.parentElement?.classList.remove('input-error');
  }
}