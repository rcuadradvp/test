// static/private/js/clients/ui-renderer.js

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
    const { 
      appContent, 
      noPermissionState, 
      loadingContainer, 
      container, 
      emptyState, 
      errorState 
    } = this.elements;

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
        this.updateEmptyState();
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

  updateEmptyState() {
    const searchInput = document.getElementById('search-input');
    const emptyTitle = document.getElementById('empty-title');
    const emptyMessage = document.getElementById('empty-message');
    
    if (searchInput?.value) {
      if (emptyTitle) emptyTitle.textContent = 'No se encontraron resultados';
      if (emptyMessage) emptyMessage.textContent = `No hay clientes que coincidan con "${searchInput.value}"`;
    } else {
      if (emptyTitle) emptyTitle.textContent = 'No hay clientes';
      if (emptyMessage) emptyMessage.textContent = 'No hay clientes registrados';
    }
  }

  render(data, permissions, eventHandlers) {
    const { tableBody, cardsContainer } = this.elements;
    if (!tableBody || !cardsContainer) {
      console.error('[UI] tableBody or cardsContainer not found!');
      return;
    }

    tableBody.innerHTML = '';
    cardsContainer.innerHTML = '';

    data.forEach((item) => {
      const row = Row.create(item);
      const card = Card.create(item);

      tableBody.appendChild(row);
      cardsContainer.appendChild(card);
    });
    this.refreshIcons();
  }

  showError(message) {
    const errorMessage = this.elements.errorMessage;
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  refreshIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }
}