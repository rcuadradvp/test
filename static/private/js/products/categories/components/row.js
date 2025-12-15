// static/private/js/products/categories/components/row.js

export const Row = {

  create(item, permissions, eventHandlers, departmentSlug) {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors', 'cursor-pointer');
    const showActions = permissions.canEdit || permissions.canDelete;
    tr.innerHTML = this.getTemplate(item, permissions, showActions, departmentSlug);
    this.attachEventHandlers(tr, item, permissions, eventHandlers);
    return tr;
  },

  getTemplate(item, permissions, showActions, departmentSlug) {
    // Construir URL con ambos slugs: department + category
    const categoryUrl = `/productos/${this.escape(departmentSlug)}/${this.escape(item.slug)}/`;
    
    return `
      <td class="category-link-cell" data-href="${categoryUrl}">
        <div class="font-semibold flex items-center gap-2">
          <i data-lucide="folder"></i>
          ${this.escape(item.name || '-')}
          ${item.description ? ' - ' + this.escape(item.description) : ''}
        </div>
      </td>
      <td class="text-center category-link-cell" data-href="${categoryUrl}">
        <span class="badge badge-primary badge-sm">${item.product_count ?? 0}</span>
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
    const linkCells = tr.querySelectorAll('.category-link-cell');
    linkCells.forEach(cell => {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', (e) => {
        const href = cell.getAttribute('data-href');
        if (href) {
          window.location.href = href;
        }
      });
    });
    
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