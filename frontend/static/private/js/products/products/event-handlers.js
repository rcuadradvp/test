// static/private/js/products/products/event-handlers.js

export class EventHandlers {
  constructor(stateManager, uiRenderer, apiService, departmentSlug, categorySlug) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.api = apiService;
    this.departmentSlug = departmentSlug;
    this.categorySlug = categorySlug;
  }

  async loadData() {
    try {
      this.state.setView('loading');
      const response = await this.api.listProductsBySlugs(this.departmentSlug, this.categorySlug);
      const data = response?.products || [];
      if (!data?.length) {
        this.state.setView('empty');
        return;
      }
      this.state.setData(data);
      this.state.setView('data');
    } catch (error) {
      console.error('[EVENTS] Error loading data:', error);
      this.state.setError(error.message || 'Error al cargar datos');
    }
  }

  async create(data) {
    try {
      const productData = {
        ...data,
        department_slug: this.departmentSlug,
        category_slug: this.categorySlug
      };
      
      const newItem = await this.api.createProduct(productData);
      MessageHelper?.success(`Producto "${newItem.name}" creado exitosamente`);
      await this.loadData();
      return newItem;
    } catch (error) {
      console.error('[EVENTS] Error creating:', error);
      throw error;
    }
  }

  async edit(item) {
    MessageHelper?.info(`Editar: ${item.name} (próximamente)`);
  }

  async delete(item) {
    const confirmed = confirm(`¿Eliminar "${item.name}"?`);
    if (!confirmed) return;
    
    try {
      await this.api.deleteProduct(item.id);
      MessageHelper?.success(`"${item.name}" eliminado exitosamente`);
      await this.loadData();
    } catch (error) {
      console.error('[EVENTS] Error deleting:', error);
      MessageHelper?.error(error.message || 'Error al eliminar');
    }
  }

  handleSearch(searchTerm) {
    this.state.setSearchTerm(searchTerm);
  }

  async handleExport() {
    try {
      MessageHelper?.info('Exportación (próximamente)');
    } catch (error) {
      console.error('[EVENTS] Error exporting:', error);
      MessageHelper?.error('Error al exportar');
    }
  }

  getHandlers() {
    return {
      onEdit: (item) => this.edit(item),
      onDelete: (item) => this.delete(item),
      onCreate: (data) => this.create(data),
      onRefresh: () => this.loadData(),
      onSearch: (term) => this.handleSearch(term),
      onExport: () => this.handleExport(),
    };
  }
}