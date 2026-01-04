// static/private/js/products/product-detail/event-handlers.js

import { FormValidator } from './form-validator.js';

export class EventHandlers {
  constructor(stateManager, uiRenderer, apiService, productId) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.api = apiService;
    this.productId = productId;
    this.validator = new FormValidator();
  }

  async loadData() {
    try {
      this.state.setView('loading');
      
      const product = await this.api.getProductDetail(this.productId);
      
      if (!product) {
        this.state.setError('Producto no encontrado');
        return;
      }
      
      this.state.setProduct(product);
      this.state.setView('data');
    } catch (error) {
      console.error('[EVENTS] Error loading product:', error);
      this.state.setError(error.message || 'Error al cargar el producto');
    }
  }

  handleBack() {
    if (this.ui.isEditMode) {
      const confirmed = confirm('¿Descartar los cambios sin guardar?');
      if (!confirmed) return;
    }
    
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/productos/';
    }
  }

  handleEdit() {
    const product = this.state.getProduct();
    if (!product) return;
    
    this.ui.enableEditMode();
  }

  handleCancel() {
    this.ui.restoreOriginalData();
    this.ui.disableEditMode();
  }

  async handleSave() {
    const product = this.state.getProduct();
    if (!product) return;
    
    const formData = this.ui.getFormData();
    
    if (!this.validator.validate(formData)) {
      return;
    }
    
    try {
      const btnSave = document.getElementById('btn-save');
      const originalText = btnSave?.innerHTML;
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = `
          <span class="loading loading-spinner loading-sm"></span>
          Guardando...
        `;
      }
      
      const updatedProduct = await this.api.updateProduct(this.productId, formData);
      this.state.setProduct(updatedProduct);
      this.ui.disableEditMode();
      
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
      }
      
      MessageHelper?.success('Producto actualizado exitosamente');
      
    } catch (error) {
      console.error('[EVENTS] Error updating product:', error);
      MessageHelper?.error(error.message || 'Error al actualizar el producto');
      
      const btnSave = document.getElementById('btn-save');
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Guardar';
        window.lucide?.createIcons?.();
      }
    }
  }

  async handleDelete() {
    const product = this.state.getProduct();
    if (!product) return;
    
    const confirmed = confirm(
      `¿Estás seguro de eliminar el producto "${product.name}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    
    try {
      await this.api.deleteProduct(this.productId);
      MessageHelper?.success(`Producto "${product.name}" eliminado exitosamente`);
      
      setTimeout(() => {
        window.location.href = '/productos/';
      }, 1500);
    } catch (error) {
      console.error('[EVENTS] Error deleting product:', error);
      MessageHelper?.error(error.message || 'Error al eliminar el producto');
    }
  }

  getHandlers() {
    return {
      onBack: () => this.handleBack(),
      onEdit: () => this.handleEdit(),
      onSave: () => this.handleSave(),
      onCancel: () => this.handleCancel(),
      onDelete: () => this.handleDelete(),
      onRefresh: () => this.loadData(),
    };
  }
}