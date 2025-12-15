// static/private/js/products/products-unassociated/components/row.js

export const Row = {

  create(item, permissions, eventHandlers) {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors');
    const showActions = permissions.canEdit || permissions.canDelete;
    tr.innerHTML = this.getTemplate(item, permissions, showActions);
    this.attachEventHandlers(tr, item, permissions, eventHandlers);
    return tr;
  },

  getTemplate(item, permissions, showActions) {
    return `
      <td>
        <div class="font-semibold flex items-center gap-2">
          <i data-lucide="package" class="w-5 h-5 text-base-content/50"></i>
          ${this.escape(item.name || '-')}
          ${item.description ? ' - ' + this.escape(item.description) : ''}
        </div>
      </td>
      <td class="text-center">
        <span class="badge badge-info badge-sm">${item.stock ?? 0}</span>
      </td>
      <td class="text-center">
        <span class="font-semibold">$${this.formatPrice(item.price || 0)}</span>
      </td>
      ${showActions ? `
      <td class="text-center">
        <div class="flex items-center justify-center gap-2">
          ${this.getActionButtons(item, permissions)}
        </div>
      </td>` : ''}
    `;
  },

  getActionButtons(item, permissions) {
    let buttons = '';
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

  attachEventHandlers(tr, item, permissions, handlers) {
    if (permissions.canEdit) {
      const editBtn = tr.querySelector('[data-action="edit"]');
      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.onEdit(item);
      });
    }
    
    if (permissions.canDelete) {
      const deleteBtn = tr.querySelector('[data-action="delete"]');
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