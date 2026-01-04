// static/private/js/products/products-unassociated/ui-renderer.js

import { Row } from './components/row.js';
import { Card } from './components/card.js';

export class UIRenderer {
  constructor(elements, options = {}) {
    this.elements = elements;
    this.hasDepartment = options.hasDepartment || false;
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
      case 'empty': {
        appContent?.classList.remove('hidden');
        emptyState?.classList.remove('hidden');

        const query = document.getElementById('search-input')?.value?.trim();
        const title = document.getElementById('empty-title');
        const message = document.getElementById('empty-message');

        if (title) {
          if (query) {
            title.textContent = `No se encontraron resultados para "${query}"`;
          } else if (this.hasDepartment) {
            title.textContent = 'No hay productos sin categoría';
          } else {
            title.textContent = 'No hay productos sin asignar';
          }
        }
        
        if (message) {
          if (query) {
            message.textContent = 'Intenta con otro término de búsqueda';
          } else if (this.hasDepartment) {
            message.textContent = 'Todos los productos de este departamento tienen una categoría asignada';
          } else {
            message.textContent = 'Todos los productos están correctamente asignados a un departamento';
          }
        }
        break;
      }
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

    this.refreshIcons();
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