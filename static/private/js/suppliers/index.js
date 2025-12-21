// static/private/js/suppliers/index.js

import { initSuppliersPermissions, assertCanView } from './permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';
import { CreateModal } from './modal-create.js';
import { EditModal } from './modal-edit.js';
import { DeleteModal } from './modal-delete.js';

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
      btnRetry: document.getElementById('btn-retry'),
      searchInput: document.getElementById('search-input'),
    };

    this.state = new StateManager();
    this.ui = new UIRenderer(this.elements);
    this.eventHandlers = new EventHandlers(this.state, this.ui, window.SuppliersAPI);
    
    this.createModal = new CreateModal();
    this.editModal = new EditModal();
    this.deleteModal = new DeleteModal();
    
    this.eventHandlers.setEditModal(this.editModal);
    this.eventHandlers.setDeleteModal(this.deleteModal);
    
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
      this.initModals();
      
      await this.eventHandlers.loadData();
    } catch (error) {
      console.error('[APP] Error during initialization:', error);
      this.ui.hideInitialSkeleton();
      this.state.setError('Error al inicializar la aplicación');
    }
  }

  async initPermissions() {
    try {
      const permissions = await initSuppliersPermissions();
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

  initModals() {
    const handlers = this.eventHandlers.getHandlers();
    
    this.createModal.init(handlers.onCreate);
    this.editModal.init(handlers.onUpdate);
    this.deleteModal.init(handlers.onConfirmDelete);
  }

  setupEventListeners() {
    // Búsqueda
    this.elements.searchInput?.addEventListener('input', (e) => {
      this.eventHandlers.handleSearch(e.target.value);
    });

    // Retry
    this.elements.btnRetry?.addEventListener('click', () => {
      this.eventHandlers.loadData();
    });

    // Botón abrir modal crear
    const btnOpenCreate = document.getElementById('btn-open-create-modal');
    btnOpenCreate?.addEventListener('click', () => {
      this.createModal.open();
    });
  }

  onStateChange(newState, oldState) {
    if (newState.view !== oldState.view) {
      this.ui.showState(newState.view);
    }

    // Renderizar cuando hay datos y la vista es 'data'
    if (newState.view === 'data') {
      const handlers = this.eventHandlers.getHandlers();
      this.ui.render(newState.filteredData, newState.permissions, handlers);
    }

    if (newState.view === 'error' && newState.error) {
      this.ui.showError(newState.error);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});