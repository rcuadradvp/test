// static/private/js/products/categories/components/card.js

export const Card = {

  create(item, permissions, eventHandlers, departmentSlug) {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors cursor-pointer';
    div.setAttribute('data-href', `/productos/${this.escape(departmentSlug)}/${this.escape(item.slug)}/`);
    
    const showActions = permissions.canEdit || permissions.canDelete;
    div.innerHTML = this.getTemplate(item, permissions, showActions);
    this.attachEventHandlers(div, item, permissions, eventHandlers);
    return div;
  },

  getTemplate(item, permissions, showActions) {
    return `
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="font-semibold text-lg">
            ${this.escape(item.name || '-')}
          </div>
          <p class="text-sm text-base-content/70 mt-1">
            ${this.escape(item.description || '-')}
          </p>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="folder" class="w-4 h-4 text-base-content/50"></i>
          <span class="text-sm">${item.product_count ?? 0} productos</span>
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

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};