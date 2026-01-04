// static/private/js/clients/modal-create.js

export class CreateModal {
  constructor() {
    this.modal = null;
    this.form = null;
    this.onSubmitCallback = null;
    this.isSubmitting = false;
  }

  init(onSubmit) {
    this.modal = document.getElementById('modal-create-client');
    this.form = document.getElementById('form-create-client');
    this.onSubmitCallback = onSubmit;

    if (!this.modal || !this.form) {
      console.error('[CreateModal] Modal or form not found');
      return;
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;

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
          await this.onSubmitCallback(data);
          this.close();
        }
      } catch (error) {
        console.error('[CreateModal] Error submitting:', error);
        MessageHelper?.error(error.message || 'Error al crear cliente');
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

  open() {
    if (!this.modal) return;
    this.form?.reset();
    
    // Establecer valor por defecto de credit_limit en 0
    const creditLimitInput = this.form?.querySelector('[name="credit_limit"]');
    if (creditLimitInput) {
      creditLimitInput.value = '0';
    }
    
    this.modal.showModal();
  }

  close() {
    if (!this.modal) return;
    this.modal.close();
    this.form?.reset();
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