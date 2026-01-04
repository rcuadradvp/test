// static/private/js/suppliers/components/row.js

export const Row = {

  create(item, permissions, eventHandlers) {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors', 'cursor-pointer');
    tr.style.cursor = 'pointer';
    
    tr.innerHTML = this.getTemplate(item);
    this.attachEventHandlers(tr, item, eventHandlers);
    
    return tr;
  },

  getTemplate(item) {
    return `
      <td>
        <div class="flex items-center gap-3">
          <i data-lucide="folder" class="w-5 h-5 text-primary"></i>
          <div>
            <div class="font-semibold">${this.escape(item.name || '-')}</div>
            <div class="text-sm text-base-content/70">${this.escape(item.address || 'Sin dirección')}</div>
          </div>
        </div>
      </td>
    `;
  },

  attachEventHandlers(tr, item, handlers) {
    tr.addEventListener('click', () => {
      window.location.href = `/proveedores/${item.id}/`;
    });
  },

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};