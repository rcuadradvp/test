// static/private/js/product-management/event-handlers.js

export class EventHandlers {
  constructor(stateManager, uiRenderer, modal, apiService) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.modal = modal;
    this.api = apiService;
    this.pendingRequests = new Map();
  }

  cancelPending(key) {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.get(key).cancelled = true;
      this.pendingRequests.delete(key);
    }
  }

  async loadDepartments() {
    try {
      const departments = await this.api.listDepartments();
      this.state.setDepartments(departments || []);
      this.ui.updateDepartmentSelects(departments || []);
    } catch (error) {
      console.error('[EVENTS] Error loading departments:', error);
      this.handleApiError(error, 'Error al cargar departamentos');
    }
  }

  handleApiError(error, defaultMessage) {
    const message = error?.message || defaultMessage;
    
    if (message.includes('autenticación') || 
        message.includes('401') || 
        message.includes('Unauthorized') ||
        message.includes('Authentication')) {
      MessageHelper?.error('Sesión expirada. Redirigiendo...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return;
    }
    
    MessageHelper?.error(message);
  }

  
  async onSourceDepartmentChange(e) {
    const slug = e.target.value;
    this.state.setSourceDepartment(slug);
    this.cancelPending('source-categories');
    this.cancelPending('source-products');
    
    if (!slug) {
      this.state.setSourceCategories([]);
      this.state.setAvailableProducts([]);
      return;
    }
    
    if (slug === 'unassigned') {
      this.state.setSourceCategories([]);
      await this.loadUnassignedProducts();
      return;
    }
    
    try {
      const requestId = { cancelled: false };
      this.pendingRequests.set('source-categories', requestId);
      
      const response = await this.api.listCategoriesBySlug(slug);
      
      if (requestId.cancelled) return;
      
      const categories = response?.categories || [];
      const noCategory = response?.no_category || null;
      const allCategories = noCategory ? [noCategory, ...categories] : categories;
      this.state.setSourceCategories(allCategories);
      this.state.setAvailableProducts([]);
      
      if (allCategories.length === 0) {
        MessageHelper?.info('Este departamento no tiene categorías');
      }
    } catch (error) {
      console.error('[EVENTS] Error loading source categories:', error);
      this.handleApiError(error, 'Error al cargar categorías');
      this.state.setLoadingAvailable(false);
    }
  }

  async onSourceCategoryChange(e) {
    const slug = e.target.value;
    this.state.setSourceCategory(slug);
    
    const { sourceDepartmentSlug } = this.state.getState();
    
    this.cancelPending('source-products');
    
    if (!sourceDepartmentSlug) return;
    
    if (!slug) {
      this.state.setAvailableProducts([]);
      return;
    }
    
    await this.loadProductsByCategory(sourceDepartmentSlug, slug);
  }

  async onTargetDepartmentChange(e) {
    const slug = e.target.value;
    this.state.setTargetDepartment(slug);
    
    this.cancelPending('target-categories');
    this.cancelPending('target-products');
    
    if (!slug || slug === 'unassigned') {
      this.state.setTargetCategories([]);
      this.state.setTargetProducts([]);
      return;
    }
    
    try {
      const requestId = { cancelled: false };
      this.pendingRequests.set('target-categories', requestId);
      
      const response = await this.api.listCategoriesBySlug(slug);
      
      if (requestId.cancelled) return;
      
      const categories = response?.categories || [];
      const noCategory = response?.no_category || null;     
      const allCategories = noCategory ? [noCategory, ...categories] : categories;
      
      this.state.setTargetCategories(allCategories);
      this.state.setLoadingTarget(false);
    } catch (error) {
      console.error('[EVENTS] Error loading target categories:', error);
      this.handleApiError(error, 'Error al cargar categorías de destino');
      this.state.setLoadingTarget(false);
    }
  }

  async onTargetCategoryChange(e) {
    const slug = e.target.value;
    this.state.setTargetCategory(slug);
    
    const { targetDepartmentSlug } = this.state.getState();
    
    this.cancelPending('target-products');
    
    if (!targetDepartmentSlug || !slug || slug === 'unassigned') {
      this.state.setTargetProducts([]);
      return;
    }
    
    await this.loadTargetProducts(targetDepartmentSlug, slug);
  }

  async loadUnassignedProducts() {
    try {
      this.state.setLoadingAvailable(true);
      
      const requestId = { cancelled: false };
      this.pendingRequests.set('source-products', requestId);
      
      const response = await this.api.listProductsNoAssociated();
      
      if (requestId.cancelled) return;
      
      const products = response?.products || [];
      this.state.setAvailableProductsFiltered(products);
      
      if (products.length === 0) {
        MessageHelper?.info('No hay productos sin asignar');
      }
    } catch (error) {
      console.error('[EVENTS] Error loading unassigned products:', error);
      this.handleApiError(error, 'Error al cargar productos sin asignar');
      this.state.setLoadingAvailable(false);
    }
  }

  async loadProductsByCategory(departmentSlug, categorySlug) {
    try {
      this.state.setLoadingAvailable(true);
      
      const requestId = { cancelled: false };
      this.pendingRequests.set('source-products', requestId);
      
      const response = await this.api.listProductsBySlugs(departmentSlug, categorySlug);
      
      if (requestId.cancelled) return;
      
      const products = response?.products || [];
      
      this.state.setAvailableProductsFiltered(products);
      
      if (products.length === 0) {
        MessageHelper?.info('Categoría vacía');
      }
    } catch (error) {
      console.error('[EVENTS] Error loading products by category:', error);
      this.handleApiError(error, 'Error al cargar productos');
      this.state.setLoadingAvailable(false);
    }
  }

  async loadTargetProducts(departmentSlug, categorySlug) {
    try {
      this.state.setLoadingTarget(true);
      
      const requestId = { cancelled: false };
      this.pendingRequests.set('target-products', requestId);
      
      const response = await this.api.listProductsBySlugs(departmentSlug, categorySlug);
      
      if (requestId.cancelled) return;
      
      const products = response?.products || [];
      this.state.setTargetProducts(products);
    } catch (error) {
      console.error('[EVENTS] Error loading target products:', error);
      this.state.setLoadingTarget(false);
    }
  }


  onSearchAvailable(searchTerm) {
    this.state.setAvailableSearchTerm(searchTerm);
  }

  onSearchTransfer(searchTerm) {
    this.state.setTransferSearchTerm(searchTerm);
  }


  onSelectAllAvailable(e) {
    this.state.selectAllAvailable(e.target.checked);
  }

  onSelectAllTransfer(e) {
    this.state.selectAllTransfer(e.target.checked);
  }


  onPageChange(panel, direction) {
    const currentState = this.state.getState();
    
    if (panel === 'available') {
      const paginated = this.state.getPaginatedAvailable();
      const newPage = currentState.availablePage + direction;
      
      if (newPage >= 1 && newPage <= paginated.totalPages) {
        this.state.setAvailablePage(newPage);
      }
    } else {
      const paginated = this.state.getPaginatedTransfer();
      const newPage = currentState.transferPage + direction;
      
      if (newPage >= 1 && newPage <= paginated.totalPages) {
        this.state.setTransferPage(newPage);
      }
    }
  }


  onMoveRight() {
    const { selectedAvailable } = this.state.getState();
    if (selectedAvailable.size === 0) return;
    
    this.state.moveToTransfer(Array.from(selectedAvailable));
  }

  onMoveAllRight() {
    const filtered = this.state.getFilteredAvailableProducts();
    if (filtered.length === 0) return;
    
    const allIds = filtered.map(p => String(p.id));
    this.state.moveToTransfer(allIds);
  }

  onMoveLeft() {
    const { selectedTransfer } = this.state.getState();
    if (selectedTransfer.size === 0) return;
    
    this.state.removeFromTransfer(Array.from(selectedTransfer));
    this.reloadAvailableProducts();
  }

  onMoveAllLeft() {
    const filtered = this.state.getFilteredTransferProducts();
    if (filtered.length === 0) return;
    
    const allIds = filtered.map(p => String(p.id));
    this.state.removeFromTransfer(allIds);
    this.reloadAvailableProducts();
  }

  async reloadAvailableProducts() {
    const { sourceDepartmentSlug, sourceCategorySlug } = this.state.getState();
    
    if (!sourceDepartmentSlug) return;
    
    if (sourceDepartmentSlug === 'unassigned') {
      await this.loadUnassignedProducts();
    } else if (sourceCategorySlug) {
      await this.loadProductsByCategory(sourceDepartmentSlug, sourceCategorySlug);
    }
  }


  onTransfer() {
    const currentState = this.state.getState();
    const { 
      transferProducts, 
      targetDepartmentSlug
    } = currentState;
    
    if (transferProducts.length === 0) {
      MessageHelper?.warning('No hay productos para transferir');
      return;
    }
    
    if (!targetDepartmentSlug) {
      MessageHelper?.warning('Selecciona un departamento de destino');
      return;
    }    
    this.modal.open(currentState);
  }

  async onConfirmTransfer() {
    const currentState = this.state.getState();
    const { 
      transferProducts, 
      targetDepartmentSlug, 
      targetCategorySlug,
      departments,
      targetCategories 
    } = currentState;
    
    try {
      const productIds = transferProducts.map(p => p.id);
      let departmentId = null;
      if (targetDepartmentSlug && targetDepartmentSlug !== 'unassigned') {
        const dept = departments.find(d => d.slug === targetDepartmentSlug);
        departmentId = dept?.id || null;
      }
      
      let categoryId = null;
      if (targetCategorySlug && targetCategorySlug !== 'unassigned' && targetCategorySlug !== 'no-category') {
        const cat = targetCategories.find(c => c.slug === targetCategorySlug);
        categoryId = cat?.id || null;
      }
      
      console.log('[EVENTS] Transferring products:', {
        productIds,
        departmentId,
        categoryId,
        targetDepartmentSlug,
        targetCategorySlug
      });
      
      await this.api.bulkUpdateProducts(productIds, departmentId, categoryId);
      
      MessageHelper?.success(`${productIds.length} producto${productIds.length !== 1 ? 's' : ''} transferido${productIds.length !== 1 ? 's' : ''}`);
      this.state.setTransferProducts([]);
      
      const { sourceDepartmentSlug, sourceCategorySlug } = this.state.getState();
      if (sourceDepartmentSlug === 'unassigned') {
        await this.loadUnassignedProducts();
      } else if (sourceCategorySlug) {
        await this.loadProductsByCategory(sourceDepartmentSlug, sourceCategorySlug);
      }
      
      if (targetDepartmentSlug && targetCategorySlug && targetCategorySlug !== 'unassigned') {
        await this.loadTargetProducts(targetDepartmentSlug, targetCategorySlug);
      }
      
    } catch (error) {
      console.error('[EVENTS] Error transferring products:', error);
      this.handleApiError(error, 'Error al transferir productos');
      throw error;
    }
  }

  getHandlers() {
    return {
      onSourceDepartmentChange: (e) => this.onSourceDepartmentChange(e),
      onSourceCategoryChange: (e) => this.onSourceCategoryChange(e),
      onTargetDepartmentChange: (e) => this.onTargetDepartmentChange(e),
      onTargetCategoryChange: (e) => this.onTargetCategoryChange(e),
      onSearchAvailable: (term) => this.onSearchAvailable(term),
      onSearchTransfer: (term) => this.onSearchTransfer(term),
      onSelectAllAvailable: (e) => this.onSelectAllAvailable(e),
      onSelectAllTransfer: (e) => this.onSelectAllTransfer(e),
      onPageChange: (panel, direction) => this.onPageChange(panel, direction),
      onMoveRight: () => this.onMoveRight(),
      onMoveAllRight: () => this.onMoveAllRight(),
      onMoveLeft: () => this.onMoveLeft(),
      onMoveAllLeft: () => this.onMoveAllLeft(),
      onTransfer: () => this.onTransfer(),
      onConfirmTransfer: () => this.onConfirmTransfer(),
    };
  }
}