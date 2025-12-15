// static/private/js/product-management/state-manager.js

export class StateManager {
  constructor() {
    this.state = {
      // Productos
      availableProducts: [],
      transferProducts: [],
      targetProducts: [],
      
      // Estados de carga
      loadingAvailable: false,
      loadingTarget: false,
      
      // Búsqueda y filtrado
      availableSearchTerm: '',
      transferSearchTerm: '',
      
      // Paginación
      availablePage: 1,
      transferPage: 1,
      itemsPerPage: 10,
      
      // Selección (usando Set de strings para UUIDs)
      selectedAvailable: new Set(),
      selectedTransfer: new Set(),
      
      // Departamentos y categorías
      departments: [],
      sourceDepartmentSlug: '',
      sourceCategories: [],
      sourceCategorySlug: '',
      
      targetDepartmentSlug: '',
      targetCategories: [],
      targetCategorySlug: '',
      
      // Permisos
      permissions: {
        canView: false,
        canEdit: false,
      },
    };
    
    this.listeners = new Set();
  }

  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state, oldState));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Estados de carga
  setLoadingAvailable(loading) {
    this.setState({ loadingAvailable: loading });
  }

  setLoadingTarget(loading) {
    this.setState({ loadingTarget: loading });
  }

  // Productos disponibles
  setAvailableProducts(products) {
    this.setState({
      availableProducts: products || [],
      availablePage: 1,
      selectedAvailable: new Set(),
      loadingAvailable: false
    });
  }

  // Productos disponibles filtrando los que ya están en transferencia
  setAvailableProductsFiltered(products) {
    const transferIds = new Set(this.state.transferProducts.map(p => String(p.id)));
    const filtered = (products || []).filter(p => !transferIds.has(String(p.id)));
    
    this.setState({
      availableProducts: filtered,
      availablePage: 1,
      selectedAvailable: new Set(),
      loadingAvailable: false
    });
  }

  // Productos a transferir
  setTransferProducts(products) {
    this.setState({
      transferProducts: products || [],
      transferPage: 1,
      selectedTransfer: new Set()
    });
  }

  // Productos en destino (para preview)
  setTargetProducts(products) {
    this.setState({
      targetProducts: products || [],
      loadingTarget: false
    });
  }

  // Búsqueda
  setAvailableSearchTerm(term) {
    this.setState({
      availableSearchTerm: term,
      availablePage: 1
    });
  }

  setTransferSearchTerm(term) {
    this.setState({
      transferSearchTerm: term,
      transferPage: 1
    });
  }

  // Paginación
  setAvailablePage(page) {
    this.setState({ availablePage: page });
  }

  setTransferPage(page) {
    this.setState({ transferPage: page });
  }

  // Selección - ahora usando string IDs
  toggleAvailableSelection(productId) {
    const id = String(productId);
    const selected = new Set(this.state.selectedAvailable);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.setState({ selectedAvailable: selected });
  }

  toggleTransferSelection(productId) {
    const id = String(productId);
    const selected = new Set(this.state.selectedTransfer);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.setState({ selectedTransfer: selected });
  }

  selectAllAvailable(selected) {
    const filtered = this.getFilteredAvailableProducts();
    const newSelected = new Set(this.state.selectedAvailable);
    
    if (selected) {
      filtered.forEach(p => newSelected.add(String(p.id)));
    } else {
      filtered.forEach(p => newSelected.delete(String(p.id)));
    }
    
    this.setState({ selectedAvailable: newSelected });
  }

  selectAllTransfer(selected) {
    const filtered = this.getFilteredTransferProducts();
    const newSelected = new Set(this.state.selectedTransfer);
    
    if (selected) {
      filtered.forEach(p => newSelected.add(String(p.id)));
    } else {
      filtered.forEach(p => newSelected.delete(String(p.id)));
    }
    
    this.setState({ selectedTransfer: newSelected });
  }

  clearAvailableSelection() {
    this.setState({ selectedAvailable: new Set() });
  }

  clearTransferSelection() {
    this.setState({ selectedTransfer: new Set() });
  }

  // Mover productos a transferencia
  moveToTransfer(productIds) {
    const idsSet = new Set(productIds.map(String));
    const toMove = this.state.availableProducts.filter(p => idsSet.has(String(p.id)));
    const remaining = this.state.availableProducts.filter(p => !idsSet.has(String(p.id)));
    
    // Evitar duplicados en transferProducts
    const existingTransferIds = new Set(this.state.transferProducts.map(p => String(p.id)));
    const newProducts = toMove.filter(p => !existingTransferIds.has(String(p.id)));
    
    this.setState({
      availableProducts: remaining,
      transferProducts: [...this.state.transferProducts, ...newProducts],
      selectedAvailable: new Set(),
      availablePage: Math.min(this.state.availablePage, Math.ceil(remaining.length / this.state.itemsPerPage) || 1)
    });
  }

  // Remover productos de transferencia (simplemente los elimina)
  removeFromTransfer(productIds) {
    const idsSet = new Set(productIds.map(String));
    const remaining = this.state.transferProducts.filter(p => !idsSet.has(String(p.id)));
    
    this.setState({
      transferProducts: remaining,
      selectedTransfer: new Set(),
      transferPage: Math.min(this.state.transferPage, Math.ceil(remaining.length / this.state.itemsPerPage) || 1)
    });
  }

  // Alias para compatibilidad - simplemente elimina de transferencia
  moveToAvailable(productIds) {
    this.removeFromTransfer(productIds);
  }

  // Departamentos y categorías
  setDepartments(departments) {
    this.setState({ departments: departments || [] });
  }

  setSourceDepartment(slug) {
    this.setState({
      sourceDepartmentSlug: slug,
      sourceCategorySlug: '',
      sourceCategories: [],
      loadingAvailable: !!slug
    });
  }

  setSourceCategories(categories) {
    this.setState({ sourceCategories: categories || [] });
  }

  setSourceCategory(slug) {
    this.setState({ 
      sourceCategorySlug: slug,
      loadingAvailable: true
    });
  }

  setTargetDepartment(slug) {
    this.setState({
      targetDepartmentSlug: slug,
      targetCategorySlug: '',
      targetCategories: [],
      targetProducts: [],
      loadingTarget: slug && slug !== 'unassigned'
    });
  }

  setTargetCategories(categories) {
    this.setState({ targetCategories: categories || [] });
  }

  setTargetCategory(slug) {
    this.setState({ 
      targetCategorySlug: slug,
      loadingTarget: !!slug && slug !== 'unassigned'
    });
  }

  // Permisos
  setPermissions(permissions) {
    this.setState({ permissions });
  }

  // Getters con filtros
  getFilteredAvailableProducts() {
    const { availableProducts, availableSearchTerm } = this.state;
    if (!availableSearchTerm) return availableProducts;
    
    const term = availableSearchTerm.toLowerCase();
    return availableProducts.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.name?.toLowerCase().includes(term)
    );
  }

  getFilteredTransferProducts() {
    const { transferProducts, transferSearchTerm } = this.state;
    if (!transferSearchTerm) return transferProducts;
    
    const term = transferSearchTerm.toLowerCase();
    return transferProducts.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.name?.toLowerCase().includes(term)
    );
  }

  getPaginatedAvailable() {
    const filtered = this.getFilteredAvailableProducts();
    const { availablePage, itemsPerPage } = this.state;
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 0;
    const currentPage = Math.min(availablePage, totalPages || 1);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    return {
      items: filtered.slice(start, end),
      totalItems: filtered.length,
      totalPages,
      currentPage
    };
  }

  getPaginatedTransfer() {
    const filtered = this.getFilteredTransferProducts();
    const { transferPage, itemsPerPage } = this.state;
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 0;
    const currentPage = Math.min(transferPage, totalPages || 1);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    return {
      items: filtered.slice(start, end),
      totalItems: filtered.length,
      totalPages,
      currentPage
    };
  }

  getState() {
    return { ...this.state };
  }
}