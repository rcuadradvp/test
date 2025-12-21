// static/private/js/clients/modal-edit.js

export class EditModal {
  constructor() {
    this.modal = null;
    this.form = null;
    this.currentItem = null;
    this.onSubmitCallback = null;
    this.isSubmitting = false;
  }

  init(onSubmit) {
    this.modal = document.getElementById('modal-edit-client');
    this.form = document.getElementById('form-edit-client');
    this.onSubmitCallback = onSubmit;

    if (!this.modal || !this.form) {
      console.error('[EditModal] Modal or form not found');
      return;
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting || !this.currentItem) return;

      try {
        this.isSubmitting = true;
        this.setLoading(true);

        const formData = new FormData(this.form);
        const data = {
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          rut: formData.get('rut'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          credit_limit: formData.get('credit_limit'),
        };

        if (this.onSubmitCallback) {
          await this.onSubmitCallback(this.currentItem.id, data);
          this.close();
        }
      } catch (error) {
        console.error('[EditModal] Error submitting:', error);
        MessageHelper?.error(error.message || 'Error al actualizar cliente');
      } finally {
        this.isSubmitting = false;
        this.setLoading(false);
      }
    });

    const closeButtons = this.modal.querySelectorAll('[data-action="close"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
  }

  open(item) {
    if (!this.modal || !item) return;
    
    this.currentItem = item;
    this.populateForm(item);
    this.modal.showModal();
  }

  populateForm(item) {
    if (!this.form) return;

    const fields = ['first_name', 'last_name', 'rut', 'email', 'phone', 'address', 'credit_limit'];
    fields.forEach(field => {
      const input = this.form.querySelector(`[name="${field}"]`);
      if (input) {
        input.value = item[field] || '';
      }
    });
  }

  close() {
    if (!this.modal) return;
    this.modal.close();
    this.form?.reset();
    this.currentItem = null;
  }

  setLoading(isLoading) {
    const submitBtn = this.form?.querySelector('button[type="submit"]');
    const submitText = submitBtn?.querySelector('.submit-text');
    const submitLoader = submitBtn?.querySelector('.submit-loader');

    if (submitBtn) {
      submitBtn.disabled = isLoading;
    }

    if (submitText) {
      submitText.classList.toggle('hidden', isLoading);
    }

    if (submitLoader) {
      submitLoader.classList.toggle('hidden', !isLoading);
    }
  }
}