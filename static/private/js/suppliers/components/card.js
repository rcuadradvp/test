// static/private/js/suppliers/components/card.js

export const Card = {

  create(item, permissions, eventHandlers) {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors';
    
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
          <p class="text-sm text-base-content/70">
            RUT: ${this.escape(item.rut || '-')}
          </p>
        </div>
        ${showActions ? `
        <div class="flex gap-2">
          ${this.getActionButtons(item, permissions)}
        </div>
        ` : ''}
      </div>
      
      <div class="space-y-2 text-sm">
        <div class="flex items-start gap-2">
          <i data-lucide="user" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Representante</div>
            <div class="text-base-content/70">${this.escape(item.representative || '-')}</div>
          </div>
        </div>
        
        <div class="flex items-start gap-2">
          <i data-lucide="phone" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Teléfono</div>
            <div class="text-base-content/70">
              ${this.escape(item.phone_1 || '-')}
              ${item.phone_2 ? ` / ${this.escape(item.phone_2)}` : ''}
            </div>
          </div>
        </div>
        
        <div class="flex items-start gap-2">
          <i data-lucide="mail" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Email</div>
            <div class="text-base-content/70">
              ${this.escape(item.email_1 || '-')}
              ${item.email_2 ? `<br>${this.escape(item.email_2)}` : ''}
            </div>
          </div>
        </div>
        
        ${item.website ? `
        <div class="flex items-start gap-2">
          <i data-lucide="globe" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Sitio Web</div>
            <div class="text-base-content/70">
              <a href="${this.escape(item.website)}" target="_blank" class="link link-primary">
                ${this.escape(item.website)}
              </a>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="flex items-start gap-2">
          <i data-lucide="map-pin" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Dirección</div>
            <div class="text-base-content/70">${this.escape(item.address || '-')}</div>
          </div>
        </div>
        
        ${item.pending_orders_count > 0 ? `
        <div class="flex items-start gap-2">
          <i data-lucide="package" class="w-4 h-4 text-base-content/50 mt-0.5"></i>
          <div>
            <div class="font-medium">Pedidos Pendientes</div>
            <div class="text-base-content/70">${item.pending_orders_count}</div>
          </div>
        </div>
        ` : ''}
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
                title="Desactivar" 
                data-action="delete" 
                data-id="${item.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      `;
    }
    
    return buttons;
  },

  attachEventHandlers(div, item, permissions, handlers) {
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