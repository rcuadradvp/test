// static/private/js/clients/components/row.js

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
    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || '-';
    
    return `
      <td>
        <div class="flex items-center gap-3">
          <i data-lucide="user" class="w-5 h-5 text-primary"></i>
          <div>
            <div class="font-semibold">${this.escape(fullName)}</div>
            <div class="text-sm text-base-content/70">${this.escape(item.rut || 'Sin RUT')}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="text-sm">${this.escape(item.email || '-')}</div>
        <div class="text-xs text-base-content/70">${this.escape(item.phone || '-')}</div>
      </td>
      <td>
        <div class="badge ${item.current_debt > 0 ? 'badge-warning' : 'badge-success'}">
          ${this.formatCurrency(item.current_debt || 0)}
        </div>
      </td>
    `;
  },

  attachEventHandlers(tr, item, handlers) {
    tr.addEventListener('click', () => {
      window.location.href = `/clientes/${item.id}/`;
    });
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  },

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};