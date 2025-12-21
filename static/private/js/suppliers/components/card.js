// static/private/js/suppliers/components/card.js

export const Card = {

  create(item, permissions, eventHandlers) {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors cursor-pointer';
    div.style.cursor = 'pointer';
    
    div.innerHTML = this.getTemplate(item);
    this.attachEventHandlers(div, item, eventHandlers);
    
    return div;
  },

  getTemplate(item) {
    return `
      <div class="flex items-center gap-3">
        <i data-lucide="folder" class="w-6 h-6 text-primary flex-shrink-0"></i>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-lg truncate">${this.escape(item.name || '-')}</div>
          <div class="text-sm text-base-content/70 truncate">${this.escape(item.address || 'Sin dirección')}</div>
        </div>
        <i data-lucide="chevron-right" class="w-5 h-5 text-base-content/50 flex-shrink-0"></i>
      </div>
    `;
  },

  attachEventHandlers(div, item, handlers) {
    div.addEventListener('click', () => {
      window.location.href = `/proveedores/${item.id}/`;
    });
  },

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};