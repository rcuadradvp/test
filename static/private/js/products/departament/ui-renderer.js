// static/private/js/products/departament/ui-renderer.js

import { Row } from './components/row.js';
import { Card } from './components/card.js';

export class UIRenderer {
  constructor(elements) {
    this.elements = elements;
    this.initialSkeleton = document.getElementById('initial-skeleton');
  }

  hideInitialSkeleton() {
    if (this.initialSkeleton) {
      this.initialSkeleton.classList.add('hidden');
    }
    if (this.elements.appContent) {
      this.elements.appContent.classList.remove('hidden');
    }
  }

  showState(state) {
    const { appContent, noPermissionState, loadingContainer, container, emptyState, errorState } = this.elements;

    if (this.initialSkeleton && !this.initialSkeleton.classList.contains('hidden')) {
      this.hideInitialSkeleton();
    }
    [appContent, noPermissionState, loadingContainer, container, emptyState, errorState].forEach(el => {
      el?.classList.add('hidden');
    });

    switch (state) {
      case 'loading':
        appContent?.classList.remove('hidden');
        loadingContainer?.classList.remove('hidden');
        break;
      case 'data':
        appContent?.classList.remove('hidden');
        container?.classList.remove('hidden');
        break;
      case 'empty':
        appContent?.classList.remove('hidden');
        emptyState?.classList.remove('hidden');
        const searchInput = document.getElementById('search-input');
        const emptyTitle = document.getElementById('empty-title');
        const emptyMessage = document.getElementById('empty-message');
        if (searchInput?.value) {
          emptyTitle.textContent = 'No se encontraron resultados';
          emptyMessage.textContent = `No hay categorías que coincidan con "${searchInput.value}"`;
        } else {
          emptyTitle.textContent = 'No hay datos';
          emptyMessage.textContent = 'No hay categorías registradas';
        }
        break;
      case 'error':
        appContent?.classList.remove('hidden');
        errorState?.classList.remove('hidden');
        break;
      case 'no-permission':
        noPermissionState?.classList.remove('hidden');
        break;
    }

    this.refreshIcons();
  }

  render(data, permissions, eventHandlers) {
    const { tableBody, cardsContainer } = this.elements;

    if (!tableBody || !cardsContainer) return;

    tableBody.innerHTML = '';
    cardsContainer.innerHTML = '';

    data.forEach(item => {
      const row = Row.create(item, permissions, eventHandlers);
      const card = Card.create(item, permissions, eventHandlers);

      tableBody.appendChild(row);
      cardsContainer.appendChild(card);
    });

    const unassociatedRow = this.createUnassociatedRow();
    const unassociatedCard = this.createUnassociatedCard();

    tableBody.appendChild(unassociatedRow);
    cardsContainer.appendChild(unassociatedCard);

    this.refreshIcons();
  }

  createUnassociatedRow() {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors', 'cursor-pointer', 'border-t-2');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td colspan="3">
        <div class="font-semibold flex items-center justify-between gap-2 text-primary">
          <div class="flex items-center gap-2">
            <i data-lucide="folder"></i>
            Ver productos no asociados
          </div>
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </div>
      </td>
    `;
    tr.addEventListener('click', () => {
      window.location.href = '/productos/no-asociados';
    });
    return tr;
  }

  createUnassociatedCard() {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors cursor-pointer border-t-2';
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="font-semibold flex items-center justify-between gap-2 text-primary">
          <div class="flex items-center gap-2">
            <i data-lucide="folder"></i>
            Ver productos no asociados
          </div>
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </div>
    `;
    div.addEventListener('click', () => {
      window.location.href = '/productos/no-asociados';
    });
    return div;
  }

  setErrorMessage(message) {
    const { errorMessage } = this.elements;
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }
}