// static/private/js/products/products-unassociated/index.js

import { initProductPermissions, assertCanView } from '../permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';

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
    this.departmentInfo = null;
    this.state = new StateManager();
    this.ui = new UIRenderer(this.elements, { 
      hasDepartment: !!this.departmentSlug 
    });
    
    this.eventHandlers = null;
    this.state.subscribe((newState, oldState) => this.onStateChange(newState, oldState));
  }

  async init() {
    try {
      const hasPermission = await this.initPermissions();
      if (!hasPermission) {
        this.ui.hideInitialSkeleton();
        return;
      }

      if (this.departmentSlug) {
        await this.loadDepartmentInfo();
      }

      this.eventHandlers = new EventHandlers(
        this.state,
        this.ui,
        window.ProductsAPI,
        this.departmentSlug
      );

      this.updatePageUI();
      
      this.setupEventListeners();
      await this.eventHandlers.loadData();
    } catch (error) {
      console.error('[APP] Error during initialization:', error);
      this.ui.hideInitialSkeleton();
      this.state.setError('Error al inicializar la aplicación');
    }
  }

  async loadDepartmentInfo() {
    try {
      const response = await window.ProductsAPI.listCategoriesBySlug(this.departmentSlug);
      this.departmentInfo = response?.department || null;
      
      if (!this.departmentInfo) {
        console.warn('[APP] No se pudo obtener la información del departamento');
      }
    } catch (error) {
      console.error('[APP] Error loading department info:', error);
    }
  }

  updatePageUI() {
    const titleElement = document.getElementById('page-title');
    const subtitleElement = document.getElementById('page-subtitle');
    const backLink = document.getElementById('back-link');
    const backLinkText = document.getElementById('back-link-text');
    
    if (this.departmentSlug && this.departmentInfo) {
      if (titleElement) {
        titleElement.textContent = 'Productos sin categoría';
      }
      if (subtitleElement) {
        subtitleElement.textContent = `Productos del departamento "${this.departmentInfo.name}" que no tienen categoría asignada`;
      }
      if (backLink) {
        backLink.href = `/productos/${this.departmentSlug}/`;
      }
      if (backLinkText) {
        backLinkText.textContent = 'Volver a categorías';
      }
    } else {
      if (titleElement) {
        titleElement.textContent = 'Productos sin asignar';
      }
      if (subtitleElement) {
        subtitleElement.textContent = 'Productos que no tienen departamento ni categoría asignados';
      }
    }
    
    window.lucide?.createIcons?.();
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
      newState.permissions !== oldState.permissions
    ) {
      const handlers = this.eventHandlers?.getHandlers() || {};
      this.ui.render(
        newState.filteredData,
        newState.permissions,
        handlers
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});