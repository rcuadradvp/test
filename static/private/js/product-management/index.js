// static/private/js/product-management/index.js

import { initProductPermissions, assertCanView } from '../products/permissions.js';
import { StateManager } from './state-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { EventHandlers } from './event-handlers.js';
import { TransferModal } from './modal-transfer.js';

class App {
  constructor() {
    this.elements = {
      appContent: document.getElementById('app-content'),
      noPermissionState: document.getElementById('no-permission-state'),
      
      // Filtros origen
      sourceDepartment: document.getElementById('source-department'),
      sourceCategory: document.getElementById('source-category'),
      
      // Filtros destino
      targetDepartment: document.getElementById('target-department'),
      targetCategory: document.getElementById('target-category'),
      
      // Botón de transferir
      btnTransfer: document.getElementById('btn-transfer'),
      
      // Controles de movimiento
      btnMoveRight: document.getElementById('btn-move-right'),
      btnMoveAllRight: document.getElementById('btn-move-all-right'),
      btnMoveLeft: document.getElementById('btn-move-left'),
      btnMoveAllLeft: document.getElementById('btn-move-all-left'),
      
      // Búsquedas
      searchAvailable: document.getElementById('search-available'),
      searchTransfer: document.getElementById('search-transfer'),
      
      // Tablas
      availableProducts: document.getElementById('available-products'),
      transferProducts: document.getElementById('transfer-products'),
      
      // Checkboxes select all
      selectAllAvailable: document.getElementById('select-all-available'),
      selectAllTransfer: document.getElementById('select-all-transfer'),
      
      // Contadores
      availableCount: document.getElementById('available-count'),
      transferCount: document.getElementById('transfer-count'),
      selectedAvailableCount: document.getElementById('selected-available-count'),
      selectedTransferCount: document.getElementById('selected-transfer-count'),
      transferSummaryCount: document.getElementById('transfer-summary-count'),
      
      // Paginación
      prevAvailable: document.getElementById('prev-available'),
      nextAvailable: document.getElementById('next-available'),
      pageAvailable: document.getElementById('page-available'),
      prevTransfer: document.getElementById('prev-transfer'),
      nextTransfer: document.getElementById('next-transfer'),
      pageTransfer: document.getElementById('page-transfer'),
      
      // Loading spinners
      loadingAvailable: document.getElementById('loading-available'),
      loadingTarget: document.getElementById('loading-target'),
      
      // Preview de destino
      targetPreview: document.getElementById('target-preview'),
      targetProductCount: document.getElementById('target-product-count'),
      targetProductsList: document.getElementById('target-products-list'),
    };

    this.state = new StateManager();
    this.ui = new UIRenderer(this.elements);
    this.modal = new TransferModal();
    this.eventHandlers = new EventHandlers(this.state, this.ui, this.modal, window.ProductsAPI);
    
    this.state.subscribe((newState, oldState) => this.onStateChange(newState, oldState));
  }

  async init() {
    try {
      const hasPermission = await this.initPermissions();
      if (!hasPermission) {
        this.ui.hideInitialSkeleton();
        return;
      }
      
      await this.eventHandlers.loadDepartments();
      this.setupEventListeners();
      this.ui.hideInitialSkeleton();
      
    } catch (error) {
      console.error('[APP] Error during initialization:', error);
      this.ui.hideInitialSkeleton();
      MessageHelper?.error('Error al inicializar la aplicación');
    }
  }

  async initPermissions() {
    try {
      const permissions = await initProductPermissions();
      assertCanView(permissions);
      
      if (!permissions.canEdit) {
        throw new Error('PERMISSION_DENIED');
      }
      
      this.state.setPermissions(permissions);
      return true;
    } catch (error) {
      if (error?.code === 'PERMISSION_DENIED' || error?.message === 'PERMISSION_DENIED') {
        this.elements.noPermissionState?.classList.remove('hidden');
        return false;
      }
      console.error('[APP] Error checking permissions:', error);
      MessageHelper?.error('No fue posible verificar permisos');
      return false;
    }
  }

  setupEventListeners() {
    const handlers = this.eventHandlers.getHandlers();
    
    // Filtros origen - cargan productos automáticamente
    this.elements.sourceDepartment?.addEventListener('change', handlers.onSourceDepartmentChange);
    this.elements.sourceCategory?.addEventListener('change', handlers.onSourceCategoryChange);
    
    // Filtros destino - muestran preview
    this.elements.targetDepartment?.addEventListener('change', handlers.onTargetDepartmentChange);
    this.elements.targetCategory?.addEventListener('change', handlers.onTargetCategoryChange);
    
    // Botones de movimiento
    this.elements.btnMoveRight?.addEventListener('click', handlers.onMoveRight);
    this.elements.btnMoveAllRight?.addEventListener('click', handlers.onMoveAllRight);
    this.elements.btnMoveLeft?.addEventListener('click', handlers.onMoveLeft);
    this.elements.btnMoveAllLeft?.addEventListener('click', handlers.onMoveAllLeft);
    
    // Búsquedas con debounce
    let searchAvailableTimeout;
    this.elements.searchAvailable?.addEventListener('input', (e) => {
      clearTimeout(searchAvailableTimeout);
      searchAvailableTimeout = setTimeout(() => {
        handlers.onSearchAvailable(e.target.value);
      }, 300);
    });
    
    let searchTransferTimeout;
    this.elements.searchTransfer?.addEventListener('input', (e) => {
      clearTimeout(searchTransferTimeout);
      searchTransferTimeout = setTimeout(() => {
        handlers.onSearchTransfer(e.target.value);
      }, 300);
    });
    
    // Select all
    this.elements.selectAllAvailable?.addEventListener('change', handlers.onSelectAllAvailable);
    this.elements.selectAllTransfer?.addEventListener('change', handlers.onSelectAllTransfer);
    
    // Paginación
    this.elements.prevAvailable?.addEventListener('click', () => handlers.onPageChange('available', -1));
    this.elements.nextAvailable?.addEventListener('click', () => handlers.onPageChange('available', 1));
    this.elements.prevTransfer?.addEventListener('click', () => handlers.onPageChange('transfer', -1));
    this.elements.nextTransfer?.addEventListener('click', () => handlers.onPageChange('transfer', 1));
    
    // Transferir
    this.elements.btnTransfer?.addEventListener('click', handlers.onTransfer);
    
    // Modal
    this.modal.onConfirm(handlers.onConfirmTransfer);
  }

  onStateChange(newState, oldState) {
    // Actualizar productos disponibles
    if (newState.availableProducts !== oldState.availableProducts ||
        newState.availableSearchTerm !== oldState.availableSearchTerm ||
        newState.availablePage !== oldState.availablePage ||
        newState.selectedAvailable !== oldState.selectedAvailable ||
        newState.loadingAvailable !== oldState.loadingAvailable) {
      this.ui.renderAvailableProducts(this.state);
    }
    
    // Actualizar productos a transferir
    if (newState.transferProducts !== oldState.transferProducts ||
        newState.transferSearchTerm !== oldState.transferSearchTerm ||
        newState.transferPage !== oldState.transferPage ||
        newState.selectedTransfer !== oldState.selectedTransfer) {
      this.ui.renderTransferProducts(this.state);
    }
    
    // Actualizar categorías origen
    if (newState.sourceDepartmentSlug !== oldState.sourceDepartmentSlug ||
        newState.sourceCategories !== oldState.sourceCategories) {
      this.ui.updateSourceCategories(newState.sourceCategories);
    }
    
    // Actualizar categorías destino
    if (newState.targetDepartmentSlug !== oldState.targetDepartmentSlug ||
        newState.targetCategories !== oldState.targetCategories) {
      this.ui.updateTargetCategories(newState.targetCategories);
    }
    
    // Actualizar preview del destino
    if (newState.targetProducts !== oldState.targetProducts ||
        newState.loadingTarget !== oldState.loadingTarget ||
        newState.targetDepartmentSlug !== oldState.targetDepartmentSlug ||
        newState.targetCategorySlug !== oldState.targetCategorySlug) {
      this.ui.updateTargetPreview(this.state);
    }
    
    // Actualizar estados de carga
    if (newState.loadingAvailable !== oldState.loadingAvailable) {
      this.ui.setLoadingAvailable(newState.loadingAvailable);
    }
    if (newState.loadingTarget !== oldState.loadingTarget) {
      this.ui.setLoadingTarget(newState.loadingTarget);
    }
    
    this.ui.updateButtons(this.state);
    this.ui.updateCounters(this.state);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});