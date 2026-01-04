// static/private/js/suppliers/event-handlers.js

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
      const data = await this.api.listSuppliers();
      if (!data?.length) {
        console.warn('[EVENTS] No data or empty array, showing empty state');
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
      const newItem = await this.api.createSupplier(data);
      MessageHelper?.success(`Proveedor "${newItem.name}" creado exitosamente`);
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
      const updatedItem = await this.api.updateSupplier(id, data);
      MessageHelper?.success(`Proveedor "${updatedItem.name}" actualizado exitosamente`);
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
      await this.api.deleteSupplier(item.id);
      MessageHelper?.success(`Proveedor "${item.name}" desactivado exitosamente`);
      await this.loadData();
    } catch (error) {
      console.error('[EVENTS] Error deleting:', error);
      throw error;
    }
  }

  handleSearch(searchTerm) {
    this.state.setSearchTerm(searchTerm);
  }

  getHandlers() {
    return {
      onEdit: (item) => this.edit(item),
      onDelete: (item) => this.delete(item),
      onCreate: (data) => this.create(data),
      onUpdate: (id, data) => this.update(id, data),
      onConfirmDelete: (item) => this.confirmDelete(item),
      onRefresh: () => this.loadData(),
      onSearch: (term) => this.handleSearch(term),
    };
  }
}