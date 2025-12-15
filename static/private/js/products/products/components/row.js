// static/private/js/products/products/components/row.js
// ACTUALIZADO: Agrega navegación al detalle del producto

export const Row = {

  create(item, permissions, eventHandlers) {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors', 'cursor-pointer');
    const showActions = permissions.canEdit || permissions.canDelete;
    tr.innerHTML = this.getTemplate(item, permissions, showActions);
    this.attachEventHandlers(tr, item, permissions, eventHandlers);
    return tr;
  },

  getTemplate(item, permissions, showActions) {
    // URL al detalle del producto usando su UUID
    const productDetailUrl = `/productos/detalle/${item.id}/`;
    
    return `
      <td class="product-link-cell" data-href="${productDetailUrl}">
        <div class="font-semibold flex items-center gap-2">
          <i data-lucide="package"></i>
          ${this.escape(item.name || '-')}
          ${item.description ? ' - ' + this.escape(item.description) : ''}
        </div>
      </td>
      <td class="text-center product-link-cell" data-href="${productDetailUrl}">
        <span class="badge badge-info badge-sm">${item.stock ?? 0}</span>
      </td>
      <td class="text-center product-link-cell" data-href="${productDetailUrl}">
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
    
    // Botón de ver detalle (siempre visible si puede ver)
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

  attachEventHandlers(tr, item, permissions, handlers) {
    // Hacer clic en las celdas del producto navega al detalle
    const linkCells = tr.querySelectorAll('.product-link-cell');
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