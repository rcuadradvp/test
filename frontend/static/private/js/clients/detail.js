// static/private/js/clients/detail.js

import { EditModal } from './modal-edit.js';
import { DeleteModal } from './modal-delete.js';

class ClientDetailPage {
  constructor() {
    this.clientId = window.CLIENT_ID;
    this.client = null;
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

      // Cargar detalles del cliente
      await this.loadClientDetails();

      // Inicializar modales
      this.editModal.init(this.handleUpdate.bind(this));
      this.deleteModal.init(this.handleDelete.bind(this));

      // Event listeners
      this.setupEventListeners();

      // Mostrar contenido
      this.showState('content');

    } catch (error) {
      console.error('[ClientDetail] Init error:', error);
      this.showError(error.message);
    }
  }

  async loadPermissions() {
    try {
      await window.PermissionsHelper.init();
      
      this.permissions = {
        canView: window.PermissionsHelper.hasPermission('clients', 'view'),
        canEdit: window.PermissionsHelper.hasPermission('clients', 'edit'),
        canDelete: window.PermissionsHelper.hasPermission('clients', 'delete'),
      };

      this.applyPermissions();
    } catch (error) {
      console.error('[ClientDetail] Error loading permissions:', error);
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

  async loadClientDetails() {
    try {
      this.client = await window.ClientsAPI.getClient(this.clientId);
      this.renderClientDetails();
    } catch (error) {
      console.error('[ClientDetail] Error loading client:', error);
      throw new Error('No se pudo cargar la información del cliente');
    }
  }

  renderClientDetails() {
    if (!this.client) return;

    const fullName = `${this.client.first_name || ''} ${this.client.last_name || ''}`.trim() || 'Sin nombre';

    // Breadcrumb y título
    const breadcrumbName = document.getElementById('breadcrumb-name');
    if (breadcrumbName) {
      breadcrumbName.textContent = fullName;
    }
    
    document.getElementById('client-name').textContent = fullName;
    document.getElementById('client-rut').textContent = `RUT: ${this.client.rut || '-'}`;

    // Información general
    this.setupContactLink('client-email', this.client.email, 'mailto:');
    this.setupContactLink('client-phone', this.client.phone, 'tel:');
    document.getElementById('client-address').textContent = this.client.address || '-';

    // Información de crédito
    document.getElementById('client-credit-limit').textContent = this.formatCurrency(this.client.credit_limit || 0);
    document.getElementById('client-current-debt').textContent = this.formatCurrency(this.client.current_debt || 0);
    
    const availableCredit = (this.client.credit_limit || 0) - (this.client.current_debt || 0);
    document.getElementById('client-available-credit').textContent = this.formatCurrency(availableCredit);

    // Estado
    const statusBadge = document.getElementById('client-status');
    if (statusBadge) {
      if (this.client.is_active) {
        statusBadge.textContent = 'Activo';
        statusBadge.className = 'badge badge-success';
      } else {
        statusBadge.textContent = 'Inactivo';
        statusBadge.className = 'badge badge-error';
      }
    }

    // Auditoría
    document.getElementById('client-created').textContent = this.formatDate(this.client.created_at);
    document.getElementById('client-updated').textContent = this.formatDate(this.client.updated_at);

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
      this.editModal.open(this.client);
    });

    deleteBtn?.addEventListener('click', () => {
      this.deleteModal.open(this.client);
    });

    retryBtn?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  async handleUpdate(clientId, data) {
    try {
      await window.ClientsAPI.updateClient(clientId, data);
      window.MessageHelper?.success('Cliente actualizado correctamente');
      await this.loadClientDetails();
    } catch (error) {
      console.error('[ClientDetail] Update error:', error);
      window.MessageHelper?.error(error.message || 'Error al actualizar cliente');
      throw error;
    }
  }

  async handleDelete(client) {
    try {
      await window.ClientsAPI.deleteClient(client.id);
      window.MessageHelper?.success('Cliente desactivado correctamente');
      
      // Redirigir a la lista después de 1 segundo
      setTimeout(() => {
        window.location.href = '/clientes/';
      }, 1000);
    } catch (error) {
      console.error('[ClientDetail] Delete error:', error);
      window.MessageHelper?.error(error.message || 'Error al desactivar cliente');
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
  const page = new ClientDetailPage();
  page.init();
});