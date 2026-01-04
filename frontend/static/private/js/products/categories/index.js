// static/private/js/products/categories/index.js

import { initProductPermissions, assertCanView } from '../permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';
import { CreateModal } from './modal-create.js';

class App {
  constructor() {
    this.elements = {
      appContent: document.getElementById('app-content'),
      noPermissionState: document.getElementById('no-permission-state'),
      loadingContainer: document.getElementById('loading-container'),
      container: document.getElementById('container'),
      emptyState: document.getElementById('empty-state'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      tableBody: document.getElementById('table-body'),
      cardsContainer: document.getElementById('cards-container'),
      btnRefresh: document.getElementById('btn-refresh'),
      btnRetry: document.getElementById('btn-retry'),
      btnExport: document.getElementById('btn-export'),
      searchInput: document.getElementById('search-input'),
    };
    this.departmentSlug = this.elements.appContent?.dataset.departmentSlug || null;

    if (!this.departmentSlug) {
      console.error('[APP] No se encontró department_slug');
    }
    this.state = new StateManager();
    this.ui = new UIRenderer(this.elements, this.departmentSlug);
    this.modal = new CreateModal();
    this.eventHandlers = new EventHandlers(
      this.state, 
      this.ui, 
      window.ProductsAPI,
      this.departmentSlug
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
    
    this.elements.btnRefresh?.addEventListener('click', handlers.onRefresh);
    this.elements.btnRetry?.addEventListener('click', handlers.onRefresh);
    this.elements.btnExport?.addEventListener('click', handlers.onExport);
    
    let searchTimeout;
    this.elements.searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handlers.onSearch(e.target.value);
      }, 300);
    });
    
    this.modal.onCreate(handlers.onCreate);
  }

  onStateChange(newState, oldState) {
    if (newState.currentView !== oldState.currentView) {
      this.ui.showState(newState.currentView);
    }
    if (newState.errorMessage !== oldState.errorMessage) {
      this.ui.setErrorMessage(newState.errorMessage);
    }
    if (
      newState.filteredData !== oldState.filteredData ||
      newState.permissions !== oldState.permissions ||
      newState.departmentInfo !== oldState.departmentInfo
    ) {
      const handlers = this.eventHandlers.getHandlers();
      this.ui.render(
        newState.filteredData,
        newState.permissions,
        handlers,
        newState.departmentInfo
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});