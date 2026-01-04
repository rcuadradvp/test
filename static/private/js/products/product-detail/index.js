// static/private/js/products/product-detail/index.js

import { initProductPermissions, assertCanView } from '../permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';
import { SuppliersManager } from './suppliers-manager.js';

class ProductDetailApp {
  constructor() {
    this.elements = {
      appContent: document.getElementById('app-content'),
      noPermissionState: document.getElementById('no-permission-state'),
      loadingContainer: document.getElementById('loading-container'),
      container: document.getElementById('container'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      btnBack: document.getElementById('btn-back'),
      btnEdit: document.getElementById('btn-edit'),
      btnSave: document.getElementById('btn-save'),
      btnCancel: document.getElementById('btn-cancel'),
      btnDelete: document.getElementById('btn-delete'),
      btnRetry: document.getElementById('btn-retry'),
      // Botones de proveedores
      btnAddSupplier: document.getElementById('btn-add-supplier'),
      btnCancelAdd: document.getElementById('btn-cancel-add'),
      btnSaveSuppliers: document.getElementById('btn-save-suppliers'),
      btnDeleteSelectedSuppliers: document.getElementById('btn-delete-selected-suppliers'),
    };

    this.productId = this.elements.appContent?.dataset.productId || null;

    if (!this.productId) {
      console.error('[APP] No se encontró product_id');
    }

    this.state = new StateManager();
    this.ui = new UIRenderer(this.elements);
    this.eventHandlers = new EventHandlers(
      this.state, 
      this.ui, 
      window.ProductsAPI,
      this.productId
    );
    
    // Inicializar SuppliersManager
    this.suppliersManager = new SuppliersManager(
      this.productId,
      () => this.reloadSuppliers() // Callback para recargar solo proveedores
    );
    
    this.state.subscribe((newState, oldState) => this.onStateChange(newState, oldState));
  }

  async init() {
    try {
      const hasPermission = await this.initPermissions();
      if (!hasPermission) {
        this.ui.hideInitialSkeleton();
        return;
      }
      
      this.setupEventListeners();
      await this.eventHandlers.loadData();
    } catch (error) {
      console.error('[APP] Error during initialization:', error);
      this.ui.hideInitialSkeleton();
      this.state.setError('Error al inicializar la aplicación');
    }
  }

  async initPermissions() {
    try {
      const permissions = await initProductPermissions();
      assertCanView(permissions);
      this.state.setPermissions(permissions);
      return true;
    } catch (error) {
      if (error?.code === 'PERMISSION_DENIED' || error?.message === 'PERMISSION_DENIED') {
        this.state.setView('no-permission');
        return false;
      }
      console.error('[APP] Error checking permissions:', error);
      this.state.setError('No fue posible verificar permisos');
      return false;
    }
  }

  setupEventListeners() {
    const handlers = this.eventHandlers.getHandlers();
    const supplierHandlers = this.suppliersManager.getHandlers();

    // Event handlers del producto
    this.elements.btnBack?.addEventListener('click', handlers.onBack);
    this.elements.btnEdit?.addEventListener('click', handlers.onEdit);
    this.elements.btnSave?.addEventListener('click', handlers.onSave);
    this.elements.btnCancel?.addEventListener('click', handlers.onCancel);
    this.elements.btnDelete?.addEventListener('click', handlers.onDelete);
    this.elements.btnRetry?.addEventListener('click', handlers.onRefresh);

    // Event handlers de proveedores
    this.elements.btnAddSupplier?.addEventListener('click', supplierHandlers.onAdd);
    this.elements.btnCancelAdd?.addEventListener('click', supplierHandlers.onCancel);
    this.elements.btnSaveSuppliers?.addEventListener('click', supplierHandlers.onSave);
    this.elements.btnDeleteSelectedSuppliers?.addEventListener('click', supplierHandlers.onDeleteSelected);
  }

  onStateChange(newState, oldState) {
    if (newState.currentView !== oldState.currentView) {
      this.ui.showState(newState.currentView);
    }
    
    if (newState.errorMessage !== oldState.errorMessage) {
      this.ui.setErrorMessage(newState.errorMessage);
    }
    
    if (newState.product !== oldState.product) {
      this.ui.renderProduct(newState.product, newState.permissions);
      
      // Renderizar proveedores asociados
      if (newState.product?.suppliers) {
        this.suppliersManager.renderSuppliers(newState.product.suppliers);
      }
    }
    
    if (newState.permissions !== oldState.permissions) {
      this.ui.updateActionButtons(newState.permissions);
    }
  }

  /**
   * Recarga solo los proveedores del producto sin cambiar el estado de la página
   * Usado después de agregar o eliminar proveedores
   */
  async reloadSuppliers() {
    try {
      // Obtener el producto actualizado directamente
      const product = await window.ProductsAPI.getProductDetail(this.productId);
      
      if (product && product.suppliers) {
        // Solo actualizar los proveedores en el manager
        // No actualizar el estado completo para evitar recargar toda la página
        this.suppliersManager.renderSuppliers(product.suppliers);
      }
    } catch (error) {
      console.error('[APP] Error reloading suppliers:', error);
      MessageHelper?.error('Error al actualizar proveedores');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ProductDetailApp();
  app.init();
});