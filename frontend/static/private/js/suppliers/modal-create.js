// static/private/js/suppliers/modal-create.js

export class CreateModal {
  constructor() {
    this.modal = null;
    this.form = null;
    this.onSubmitCallback = null;
    this.isSubmitting = false;
  }

  init(onSubmit) {
    this.modal = document.getElementById('modal-create-supplier');
    this.form = document.getElementById('form-create-supplier');
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
          name: formData.get('name'),
          rut: formData.get('rut'),
          representative: formData.get('representative'),
          phone_1: formData.get('phone_1'),
          phone_2: formData.get('phone_2'),
          email_1: formData.get('email_1'),
          email_2: formData.get('email_2'),
          website: formData.get('website'),
          address: formData.get('address'),
        };

        if (this.onSubmitCallback) {
          await this.onSubmitCallback(data);
          this.close();
        }
      } catch (error) {
        console.error('[CreateModal] Error submitting:', error);
        MessageHelper?.error(error.message || 'Error al crear proveedor');
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