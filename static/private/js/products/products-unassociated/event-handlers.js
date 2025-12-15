// static/private/js/products/products-unassociated/event-handlers.js

export class EventHandlers {
  constructor(stateManager, uiRenderer, apiService, departmentSlug = null) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.api = apiService;
    this.departmentSlug = departmentSlug; // Si es null, lista productos sin departamento
  }

  async loadData() {
    try {
      this.state.setView('loading');
      
      let response;
      if (this.departmentSlug) {
        // Productos sin categoría de un departamento específico
        response = await this.api.listProductsNoCategoryByDepartment(this.departmentSlug);
      } else {
        // Productos sin departamento asignado
        response = await this.api.listProductsNoAssociated();
      }
      
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
      onRefresh: () => this.loadData(),
      onSearch: (term) => this.handleSearch(term),
      onExport: () => this.handleExport(),
    };
  }
}