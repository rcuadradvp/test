// static/private/js/products/products/components/card.js

export const Card = {

  create(item, permissions, eventHandlers) {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors cursor-pointer';
    div.setAttribute('data-href', `/productos/detalle/${item.id}/`);
    const showActions = permissions.canEdit || permissions.canDelete;
    div.innerHTML = this.getTemplate(item, permissions, showActions);
    this.attachEventHandlers(div, item, permissions, eventHandlers);
    return div;
  },

  getTemplate(item, permissions, showActions) {
    return `
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="font-semibold text-lg flex items-center gap-2">
            <i data-lucide="package" class="w-5 h-5 text-base-content/50"></i>
            ${this.escape(item.name || '-')}
          </div>
          <p class="text-sm text-base-content/70 mt-1">
            ${this.escape(item.description || '-')}
          </p>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <i data-lucide="boxes" class="w-4 h-4 text-base-content/50"></i>
            <span class="text-sm">Stock: ${item.stock ?? 0}</span>
          </div>
          <div class="flex items-center gap-2">
            <i data-lucide="dollar-sign" class="w-4 h-4 text-base-content/50"></i>
            <span class="text-sm font-semibold">$${this.formatPrice(item.price || 0)}</span>
          </div>
        </div>
        ${showActions ? `
        <div class="flex items-center gap-2 action-buttons">
          ${this.getActionButtons(item, permissions)}
        </div>` : ''}
      </div>
    `;
  },

  getActionButtons(item, permissions) {
    let buttons = '';
    
    buttons += `
      <a href="/productos/detalle/${item.id}/" 
         class="btn btn-ghost btn-sm btn-square"
         title="Ver detalle"
         data-action="view"
         data-id="${item.id}">
        <i data-lucide="eye" class="w-4 h-4"></i>
      </a>
    `;
    
    if (permissions.canEdit) {
      buttons += `
        <button class="btn btn-ghost btn-sm btn-square" 
                title="Editar" 
                data-action="edit" 
                data-id="${item.id}">
          <i data-lucide="edit" class="w-4 h-4"></i>
        </button>
      `;
    }
    if (permissions.canDelete) {
      buttons += `
        <button class="btn btn-ghost btn-sm btn-square text-error" 
                title="Eliminar" 
                data-action="delete" 
                data-id="${item.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      `;
    }
    return buttons;
  },

  attachEventHandlers(div, item, permissions, handlers) {
    div.addEventListener('click', (e) => {
      if (e.target.closest('.action-buttons')) {
        return;
      }
      const href = div.getAttribute('data-href');
      if (href) {
        window.location.href = href;
      }
    });
    
    if (permissions.canEdit) {
      const editBtn = div.querySelector('[data-action="edit"]');
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.onEdit(item);
      });
    }
    
    if (permissions.canDelete) {
      const deleteBtn = div.querySelector('[data-action="delete"]');
      deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.onDelete(item);
      });
    }
  },

  formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  },

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};