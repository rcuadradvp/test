// static/private/js/suppliers/components/row.js

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
        <div class="font-semibold">${this.escape(item.name || '-')}</div>
        <div class="text-sm text-base-content/70">${this.escape(item.rut || '-')}</div>
      </td>
      <td>
        <div>${this.escape(item.representative || '-')}</div>
        <div class="text-sm text-base-content/70">${this.escape(item.phone_1 || '-')}</div>
      </td>
      <td>
        <div>${this.escape(item.email_1 || '-')}</div>
        <div class="text-sm text-base-content/70">${this.escape(item.address || '-')}</div>
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
                title="Desactivar" 
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

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};