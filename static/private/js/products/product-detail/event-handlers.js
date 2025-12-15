// static/private/js/products/product-detail/event-handlers.js

export class EventHandlers {
  constructor(stateManager, uiRenderer, apiService, productId) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.api = apiService;
    this.productId = productId;
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
    // Navegar hacia atrás en el historial o ir a la lista de productos
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/productos/';
    }
  }

  async handleEdit() {
    const product = this.state.getProduct();
    if (!product) return;
    
    // Por ahora solo mostramos un mensaje
    // Aquí podrías abrir un modal de edición o navegar a una página de edición
    MessageHelper?.info(`Editar producto: ${product.name} (próximamente)`);
  }

  async handleDelete() {
    const product = this.state.getProduct();
    if (!product) return;
    
    const confirmed = confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`);
    if (!confirmed) return;
    
    try {
      await this.api.deleteProduct(this.productId);
      MessageHelper?.success(`Producto "${product.name}" eliminado exitosamente`);
      
      // Navegar de vuelta a la lista
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
      onDelete: () => this.handleDelete(),
      onRefresh: () => this.loadData(),
    };
  }
}