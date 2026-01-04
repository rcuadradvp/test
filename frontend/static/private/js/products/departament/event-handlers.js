// static/private/js/products/departament/event-handlers.js

export class EventHandlers {
  constructor(stateManager, uiRenderer, apiService) {
    this.state = stateManager;
    this.ui = uiRenderer;
    this.api = apiService;
    this.editModal = null;
    this.deleteModal = null;
  }

  setEditModal(editModal) {
    this.editModal = editModal;
  }

  setDeleteModal(deleteModal) {
    this.deleteModal = deleteModal;
  }

  async loadData() {
    try {
      this.state.setView('loading');
      const data = await this.api.listDepartments();
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
      const newItem = await this.api.createDepartment(data);
      
      MessageHelper?.success(`Departamento "${newItem.name}" creado exitosamente`);
      
      await this.loadData();
      
      return newItem;
      
    } catch (error) {
      console.error('[EVENTS] Error creating:', error);
      throw error;
    }
  }

  async edit(item) {
    if (!this.editModal) {
      console.error('[EVENTS] Edit modal not initialized');
      MessageHelper?.error('Error al abrir el modal de edición');
      return;
    }
    this.editModal.open(item);
  }

  async update(id, data) {
    try {
      const updatedItem = await this.api.updateDepartment(id, data);
      MessageHelper?.success(`Departamento "${updatedItem.name}" actualizado exitosamente`);
      await this.loadData();
      return updatedItem;
    } catch (error) {
      console.error('[EVENTS] Error updating:', error);
      throw error;
    }
  }

  async delete(item) {
    if (!this.deleteModal) {
      console.error('[EVENTS] Delete modal not initialized');
      MessageHelper?.error('Error al abrir el modal de confirmación');
      return;
    }
    this.deleteModal.open(item);
  }

  async confirmDelete(item) {
    try {
      await this.api.deleteDepartment(item.id);
      MessageHelper?.success(`"${item.name}" eliminado exitosamente`);
      await this.loadData();
    } catch (error) {
      console.error('[EVENTS] Error deleting:', error);
      MessageHelper?.error(error.message || 'Error al eliminar');
      throw error;
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
      onUpdate: (id, data) => this.update(id, data),
      onDelete: (item) => this.delete(item),
      onConfirmDelete: (item) => this.confirmDelete(item),
      onCreate: (data) => this.create(data),
      onRefresh: () => this.loadData(),
      onSearch: (term) => this.handleSearch(term),
      onExport: () => this.handleExport(),
    };
  }
}