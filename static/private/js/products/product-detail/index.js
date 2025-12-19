// static/private/js/products/product-detail/index.js

import { initProductPermissions, assertCanView } from '../permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';

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

    this.elements.btnBack?.addEventListener('click', handlers.onBack);
    this.elements.btnEdit?.addEventListener('click', handlers.onEdit);
    this.elements.btnSave?.addEventListener('click', handlers.onSave);
    this.elements.btnCancel?.addEventListener('click', handlers.onCancel);
    this.elements.btnDelete?.addEventListener('click', handlers.onDelete);
    this.elements.btnRetry?.addEventListener('click', handlers.onRefresh);
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
    }
    
    if (newState.permissions !== oldState.permissions) {
      this.ui.updateActionButtons(newState.permissions);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ProductDetailApp();
  app.init();
});