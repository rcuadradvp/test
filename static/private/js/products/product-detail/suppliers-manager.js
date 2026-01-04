// static/private/js/products/product-detail/suppliers-manager.js

export class SuppliersManager {
  constructor(productId, onUpdate) {
    this.productId = productId;
    this.onUpdate = onUpdate; // Callback para actualizar el producto
    this.isAddMode = false;
    this.selectedSuppliers = new Set();
    this.currentSuppliers = [];
    this.allSuppliers = [];
  }

  setCurrentSuppliers(suppliers) {
    this.currentSuppliers = suppliers || [];
  }

  renderSuppliers(suppliers) {
    const container = document.getElementById('suppliers-table-body');
    if (!container) return;

    this.setCurrentSuppliers(suppliers);

    if (!suppliers || suppliers.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="2" class="text-center py-8 text-base-content/50">
            <i data-lucide="package-search" class="w-12 h-12 mx-auto mb-2 opacity-30"></i>
            <p>No hay proveedores asociados</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = suppliers.map(supplier => `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="checkbox checkbox-xs checkbox-primary supplier-checkbox" 
              data-supplier-id="${supplier.id}"
              ${this.selectedSuppliers.has(supplier.id) ? 'checked' : ''}
            />
            <div>
              <div class="font-medium text-sm">${supplier.name}</div>
              ${supplier.is_primary ? '<span class="badge badge-primary badge-xs mt-1">Principal</span>' : ''}
            </div>
          </div>
        </td>
        <td class="text-center">
          <button 
            type="button"
            class="btn btn-ghost btn-xs text-error btn-delete-supplier" 
            data-supplier-id="${supplier.id}"
            data-supplier-name="${supplier.name}"
          >
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        </td>
      </tr>
    `).join('');

    this.attachSupplierListeners();
    this.refreshIcons();
  }

  async showAddMode() {
    this.isAddMode = true;
    this.selectedSuppliers.clear();
    
    const btnAdd = document.getElementById('btn-add-supplier');
    const btnCancelAdd = document.getElementById('btn-cancel-add');
    const btnSaveSuppliers = document.getElementById('btn-save-suppliers');
    const btnDeleteSelected = document.getElementById('btn-delete-selected-suppliers');

    btnAdd?.classList.add('hidden');
    btnCancelAdd?.classList.remove('hidden');
    btnSaveSuppliers?.classList.remove('hidden');
    btnDeleteSelected?.classList.add('hidden');

    // Mostrar loading en la tabla mientras se cargan los proveedores
    this.showTableLoading('Cargando proveedores disponibles...');

    await this.loadAllSuppliers();
  }

  hideAddMode() {
    this.isAddMode = false;
    this.selectedSuppliers.clear();
    
    const btnAdd = document.getElementById('btn-add-supplier');
    const btnCancelAdd = document.getElementById('btn-cancel-add');
    const btnSaveSuppliers = document.getElementById('btn-save-suppliers');
    const btnDeleteSelected = document.getElementById('btn-delete-selected-suppliers');

    btnAdd?.classList.remove('hidden');
    btnCancelAdd?.classList.add('hidden');
    btnSaveSuppliers?.classList.add('hidden');
    btnDeleteSelected?.classList.remove('hidden');

    this.renderSuppliers(this.currentSuppliers);
  }

  async loadAllSuppliers() {
    try {
      const allSuppliers = await window.SuppliersAPI.listSuppliers();
      this.allSuppliers = allSuppliers;

      // Filtrar proveedores que ya están asociados
      const currentSupplierIds = this.currentSuppliers.map(s => s.id);
      const availableSuppliers = allSuppliers.filter(s => !currentSupplierIds.includes(s.id));

      this.renderAvailableSuppliers(availableSuppliers);
    } catch (error) {
      console.error('[SuppliersManager] Error loading suppliers:', error);
      MessageHelper?.error('Error al cargar proveedores');
    }
  }

  renderAvailableSuppliers(suppliers) {
    const container = document.getElementById('suppliers-table-body');
    if (!container) return;

    if (suppliers.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="2" class="text-center py-8 text-base-content/50">
            <i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-2 opacity-30"></i>
            <p>Todos los proveedores ya están asociados</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = suppliers.map(supplier => `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="checkbox checkbox-xs checkbox-primary supplier-checkbox-add" 
              data-supplier-id="${supplier.id}"
            />
            <div>
              <div class="font-medium text-sm">${supplier.name}</div>
              ${supplier.rut ? `<div class="text-xs text-base-content/60">${supplier.rut}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="text-center">
          <div class="text-xs text-base-content/60">
            ${supplier.representative || '-'}
          </div>
        </td>
      </tr>
    `).join('');

    this.attachAddModeListeners();
    this.refreshIcons();
  }

  attachSupplierListeners() {
    // Checkboxes para seleccionar
    document.querySelectorAll('.supplier-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const supplierId = e.target.dataset.supplierId;
        if (e.target.checked) {
          this.selectedSuppliers.add(supplierId);
        } else {
          this.selectedSuppliers.delete(supplierId);
        }
        this.updateDeleteButton();
      });
    });

    // Botones de eliminar individual
    document.querySelectorAll('.btn-delete-supplier').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const supplierId = e.currentTarget.dataset.supplierId;
        const supplierName = e.currentTarget.dataset.supplierName;
        this.deleteSingleSupplier(supplierId, supplierName);
      });
    });
  }

  attachAddModeListeners() {
    document.querySelectorAll('.supplier-checkbox-add').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const supplierId = e.target.dataset.supplierId;
        if (e.target.checked) {
          this.selectedSuppliers.add(supplierId);
        } else {
          this.selectedSuppliers.delete(supplierId);
        }
      });
    });
  }

  updateDeleteButton() {
    const btnDelete = document.getElementById('btn-delete-selected-suppliers');
    if (btnDelete) {
      if (this.selectedSuppliers.size > 0) {
        btnDelete.classList.remove('btn-disabled');
        btnDelete.disabled = false;
      } else {
        btnDelete.classList.add('btn-disabled');
        btnDelete.disabled = true;
      }
    }
  }

  async deleteSingleSupplier(supplierId, supplierName) {
    // Usar el sistema de confirmación de tu aplicación
    const confirmed = await this.showConfirmDialog(
      'Desasociar proveedor',
      `¿Estás seguro de desasociar el proveedor "${supplierName}"?`,
      'Desasociar',
      'error'
    );
    
    if (!confirmed) return;

    await this.deleteSuppliers([supplierId]);
  }

  async deleteSelectedSuppliers() {
    if (this.selectedSuppliers.size === 0) {
      MessageHelper?.warning('Selecciona al menos un proveedor');
      return;
    }

    const count = this.selectedSuppliers.size;
    const confirmed = await this.showConfirmDialog(
      'Desasociar proveedores',
      `¿Estás seguro de desasociar ${count} proveedor${count > 1 ? 'es' : ''}?`,
      'Desasociar',
      'error'
    );
    
    if (!confirmed) return;

    await this.deleteSuppliers(Array.from(this.selectedSuppliers));
  }

  async deleteSuppliers(supplierIds) {
    try {
      // Mostrar loading en el card
      this.showCardLoading('Eliminando proveedores...');
      
      await window.ProductSuppliersAPI.deleteProductSuppliers(this.productId, supplierIds);
      
      MessageHelper?.success('Proveedor(es) desasociado(s) exitosamente');
      this.selectedSuppliers.clear();
      
      // Actualizar el producto completo
      if (this.onUpdate) {
        await this.onUpdate();
      }
      
      // Ocultar loading
      this.hideCardLoading();
      
    } catch (error) {
      console.error('[SuppliersManager] Error deleting suppliers:', error);
      this.hideCardLoading();
      MessageHelper?.error(error.message || 'Error al desasociar proveedores');
    }
  }

  async saveNewSuppliers() {
    if (this.selectedSuppliers.size === 0) {
      MessageHelper?.warning('Selecciona al menos un proveedor');
      return;
    }

    try {
      // Mostrar loading en el card
      this.showCardLoading('Guardando proveedores...');

      await window.ProductSuppliersAPI.createProductSuppliers(
        this.productId, 
        Array.from(this.selectedSuppliers)
      );
      
      MessageHelper?.success('Proveedor(es) asociado(s) exitosamente');
      
      // Actualizar el producto completo
      if (this.onUpdate) {
        await this.onUpdate();
      }

      this.hideAddMode();
      this.hideCardLoading();
      
    } catch (error) {
      console.error('[SuppliersManager] Error saving suppliers:', error);
      this.hideCardLoading();
      MessageHelper?.error(error.message || 'Error al asociar proveedores');
    }
  }

  /**
   * Muestra un diálogo de confirmación
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje del modal
   * @param {string} confirmText - Texto del botón de confirmar
   * @param {string} type - Tipo de alerta ('error', 'warning', 'info')
   * @returns {Promise<boolean>} - true si confirmó, false si canceló
   */
  async showConfirmDialog(title, message, confirmText = 'Confirmar', type = 'warning') {
    return new Promise((resolve) => {
      // Crear modal dinámicamente
      const modalId = 'supplier-confirm-modal';
      
      // Eliminar modal anterior si existe
      const existingModal = document.getElementById(modalId);
      if (existingModal) {
        existingModal.remove();
      }

      // Crear el modal
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal modal-open';
      
      const typeColors = {
        error: 'text-error',
        warning: 'text-warning',
        info: 'text-info'
      };
      
      const typeIcons = {
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
      };

      modal.innerHTML = `
        <div class="modal-box">
          <h3 class="font-bold text-lg flex items-center gap-2 ${typeColors[type]}">
            <i data-lucide="${typeIcons[type]}" class="w-5 h-5"></i>
            ${title}
          </h3>
          <p class="py-4">${message}</p>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" id="${modalId}-cancel">Cancelar</button>
            <button type="button" class="btn btn-${type}" id="${modalId}-confirm">${confirmText}</button>
          </div>
        </div>
        <div class="modal-backdrop" id="${modalId}-backdrop"></div>
      `;

      document.body.appendChild(modal);
      
      // Refrescar iconos de Lucide
      this.refreshIcons();

      // Event listeners
      const btnConfirm = document.getElementById(`${modalId}-confirm`);
      const btnCancel = document.getElementById(`${modalId}-cancel`);
      const backdrop = document.getElementById(`${modalId}-backdrop`);

      const closeModal = (confirmed) => {
        modal.remove();
        resolve(confirmed);
      };

      btnConfirm?.addEventListener('click', () => closeModal(true));
      btnCancel?.addEventListener('click', () => closeModal(false));
      backdrop?.addEventListener('click', () => closeModal(false));
      
      // Cerrar con ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          closeModal(false);
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }

  getHandlers() {
    return {
      onAdd: () => this.showAddMode(),
      onCancel: () => this.hideAddMode(),
      onSave: () => this.saveNewSuppliers(),
      onDeleteSelected: () => this.deleteSelectedSuppliers(),
    };
  }

  /**
   * Muestra el loading skeleton en el card de proveedores
   */
  showCardLoading(message = 'Cargando...') {
    const loadingElement = document.getElementById('suppliers-loading');
    const contentElement = document.getElementById('suppliers-content');
    const actionsElement = document.getElementById('suppliers-actions');
    const messageElement = document.getElementById('suppliers-loading-message');
    
    if (loadingElement && contentElement) {
      // Mostrar loading
      loadingElement.classList.remove('hidden');
      contentElement.classList.add('hidden');
      
      // Deshabilitar botones
      if (actionsElement) {
        const buttons = actionsElement.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
      }
      
      // Actualizar mensaje
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  }

  /**
   * Oculta el loading skeleton del card de proveedores
   */
  hideCardLoading() {
    const loadingElement = document.getElementById('suppliers-loading');
    const contentElement = document.getElementById('suppliers-content');
    const actionsElement = document.getElementById('suppliers-actions');
    
    if (loadingElement && contentElement) {
      // Ocultar loading
      loadingElement.classList.add('hidden');
      contentElement.classList.remove('hidden');
      
      // Habilitar botones (excepto los que deben estar disabled)
      if (actionsElement) {
        const buttons = actionsElement.querySelectorAll('button:not(#btn-delete-selected-suppliers)');
        buttons.forEach(btn => btn.disabled = false);
      }
    }
  }

  /**
   * Muestra un loading spinner dentro de la tabla
   * Usado cuando se está consultando la API (modo agregar)
   */
  showTableLoading(message = 'Cargando...') {
    const container = document.getElementById('suppliers-table-body');
    if (!container) return;

    container.innerHTML = `
      <tr>
        <td colspan="2" class="text-center py-12">
          <div class="flex flex-col items-center gap-3">
            <span class="loading loading-spinner loading-md"></span>
            <span class="text-base-content/60 text-xs">${message}</span>
          </div>
        </td>
      </tr>
    `;
  }
}