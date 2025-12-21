// static/private/js/suppliers/detail.js

import { EditModal } from './modal-edit.js';
import { DeleteModal } from './modal-delete.js';

class SupplierDetailPage {
  constructor() {
    this.supplierId = window.SUPPLIER_ID;
    this.supplier = null;
    this.permissions = {
      canView: false,
      canEdit: false,
      canDelete: false,
    };

    this.elements = {
      initialSkeleton: document.getElementById('initial-skeleton'),
      appContent: document.getElementById('app-content'),
      errorState: document.getElementById('error-state'),
      noPermissionState: document.getElementById('no-permission-state'),
    };

    this.editModal = new EditModal();
    this.deleteModal = new DeleteModal();
  }

  async init() {
    try {
      // Cargar permisos
      await this.loadPermissions();

      if (!this.permissions.canView) {
        this.showState('no-permission');
        return;
      }

      // Cargar detalles del proveedor
      await this.loadSupplierDetails();

      // Inicializar modales
      this.editModal.init(this.handleUpdate.bind(this));
      this.deleteModal.init(this.handleDelete.bind(this));

      // Event listeners
      this.setupEventListeners();

      // Mostrar contenido
      this.showState('content');

    } catch (error) {
      console.error('[SupplierDetail] Init error:', error);
      this.showError(error.message);
    }
  }

  async loadPermissions() {
    try {
      await window.PermissionsHelper.init();
      
      this.permissions = {
        canView: window.PermissionsHelper.hasPermission('suppliers', 'view'),
        canEdit: window.PermissionsHelper.hasPermission('suppliers', 'edit'),
        canDelete: window.PermissionsHelper.hasPermission('suppliers', 'delete'),
      };

      this.applyPermissions();
    } catch (error) {
      console.error('[SupplierDetail] Error loading permissions:', error);
      throw error;
    }
  }

  applyPermissions() {
    // Ocultar botones según permisos
    const editBtn = document.getElementById('btn-edit');
    const deleteBtn = document.getElementById('btn-delete');

    if (editBtn && !this.permissions.canEdit) {
      editBtn.classList.add('hidden');
    }

    if (deleteBtn && !this.permissions.canDelete) {
      deleteBtn.classList.add('hidden');
    }
  }

  async loadSupplierDetails() {
    try {
      this.supplier = await window.SuppliersAPI.getSupplier(this.supplierId);
      this.renderSupplierDetails();
    } catch (error) {
      console.error('[SupplierDetail] Error loading supplier:', error);
      throw new Error('No se pudo cargar la información del proveedor');
    }
  }

  renderSupplierDetails() {
    if (!this.supplier) return;

    // Breadcrumb y título (opcional si existe)
    const breadcrumbName = document.getElementById('breadcrumb-name');
    if (breadcrumbName) {
      breadcrumbName.textContent = this.supplier.name || 'Sin nombre';
    }
    
    document.getElementById('supplier-name').textContent = this.supplier.name || 'Sin nombre';
    document.getElementById('supplier-rut').textContent = `RUT: ${this.supplier.rut || '-'}`;

    // Información general
    document.getElementById('supplier-representative').textContent = this.supplier.representative || '-';
    document.getElementById('supplier-address').textContent = this.supplier.address || '-';
    
    const websiteEl = document.getElementById('supplier-website');
    if (this.supplier.website) {
      websiteEl.textContent = this.supplier.website;
      websiteEl.href = this.supplier.website;
      websiteEl.classList.remove('hidden');
    } else {
      websiteEl.textContent = '-';
      websiteEl.removeAttribute('href');
      websiteEl.classList.remove('link', 'link-primary');
    }

    // Contacto
    this.setupContactLink('supplier-phone-1', this.supplier.phone_1, 'tel:');
    this.setupContactLink('supplier-phone-2', this.supplier.phone_2, 'tel:');
    this.setupContactLink('supplier-email-1', this.supplier.email_1, 'mailto:');
    this.setupContactLink('supplier-email-2', this.supplier.email_2, 'mailto:');

    // Estadísticas
    document.getElementById('stat-purchases').textContent = this.supplier.total_purchases || 0;
    document.getElementById('stat-pending').textContent = this.supplier.pending_orders || 0;
    document.getElementById('stat-debt').textContent = this.formatCurrency(this.supplier.total_debt || 0);

    // Auditoría
    document.getElementById('supplier-created').textContent = this.formatDate(this.supplier.created_at);
    document.getElementById('supplier-updated').textContent = this.formatDate(this.supplier.updated_at);

    // Refrescar iconos
    this.refreshIcons();
  }

  setupContactLink(elementId, value, prefix) {
    const el = document.getElementById(elementId);
    if (value) {
      el.textContent = value;
      el.href = prefix + value;
      el.classList.add('link', 'link-primary');
    } else {
      el.textContent = '-';
      el.removeAttribute('href');
      el.classList.remove('link', 'link-primary');
    }
  }

  setupEventListeners() {
    const editBtn = document.getElementById('btn-edit');
    const deleteBtn = document.getElementById('btn-delete');
    const retryBtn = document.getElementById('btn-retry');

    editBtn?.addEventListener('click', () => {
      this.editModal.open(this.supplier);
    });

    deleteBtn?.addEventListener('click', () => {
      this.deleteModal.open(this.supplier);
    });

    retryBtn?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  async handleUpdate(supplierId, data) {
    try {
      await window.SuppliersAPI.updateSupplier(supplierId, data);
      window.MessageHelper?.success('Proveedor actualizado correctamente');
      await this.loadSupplierDetails();
    } catch (error) {
      console.error('[SupplierDetail] Update error:', error);
      window.MessageHelper?.error(error.message || 'Error al actualizar proveedor');
      throw error;
    }
  }

  async handleDelete(supplier) {
    try {
      await window.SuppliersAPI.deleteSupplier(supplier.id);
      window.MessageHelper?.success('Proveedor desactivado correctamente');
      
      // Redirigir a la lista después de 1 segundo
      setTimeout(() => {
        window.location.href = '/proveedores/';
      }, 1000);
    } catch (error) {
      console.error('[SupplierDetail] Delete error:', error);
      window.MessageHelper?.error(error.message || 'Error al desactivar proveedor');
      throw error;
    }
  }

  showState(state) {
    const { initialSkeleton, appContent, errorState, noPermissionState } = this.elements;

    [initialSkeleton, appContent, errorState, noPermissionState].forEach(el => {
      el?.classList.add('hidden');
    });

    switch (state) {
      case 'content':
        appContent?.classList.remove('hidden');
        break;
      case 'error':
        errorState?.classList.remove('hidden');
        break;
      case 'no-permission':
        noPermissionState?.classList.remove('hidden');
        break;
    }

    this.refreshIcons();
  }

  showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    this.showState('error');
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateString;
    }
  }

  refreshIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const page = new SupplierDetailPage();
  page.init();
});