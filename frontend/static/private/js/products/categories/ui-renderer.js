// static/private/js/products/categories/ui-renderer.js

import { Row } from './components/row.js';
import { Card } from './components/card.js';

export class UIRenderer {
  constructor(elements, departmentSlug) {
    this.elements = elements;
    this.departmentSlug = departmentSlug;
    this.initialSkeleton = document.getElementById('initial-skeleton');
    this.departmentInfo = null;
  }

  setDepartmentInfo(departmentInfo) {
    this.departmentInfo = departmentInfo;
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

  render(data, permissions, eventHandlers, departmentInfo = null) {
    const { tableBody, cardsContainer } = this.elements;
    
    if (!tableBody || !cardsContainer) return;
    
    if (departmentInfo) {
      this.departmentInfo = departmentInfo;
    }
    
    tableBody.innerHTML = '';
    cardsContainer.innerHTML = '';
    
    data.forEach(item => {
      const row = Row.create(item, permissions, eventHandlers, this.departmentSlug);
      const card = Card.create(item, permissions, eventHandlers, this.departmentSlug);
      
      tableBody.appendChild(row);
      cardsContainer.appendChild(card);
    });

    if (this.departmentSlug) {
      const unassociatedRow = this.createUnassociatedRow();
      const unassociatedCard = this.createUnassociatedCard();

      tableBody.appendChild(unassociatedRow);
      cardsContainer.appendChild(unassociatedCard);
    }
    
    this.refreshIcons();
  }

  createUnassociatedRow() {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-base-200', 'transition-colors', 'cursor-pointer', 'border-t-2');
    tr.style.cursor = 'pointer';
    const url = `/productos/${this.departmentSlug}/no-asociados/`;
    
    tr.innerHTML = `
      <td colspan="3">
        <div class="font-semibold flex items-center justify-between gap-2 text-primary">
          <div class="flex items-center gap-2">
            <i data-lucide="package-x" class="w-5 h-5"></i>
            Ver productos sin categoría
          </div>
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </div>
      </td>
    `;
    
    tr.addEventListener('click', () => {
      window.location.href = url;
    });
    
    return tr;
  }

  createUnassociatedCard() {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-base-200 transition-colors cursor-pointer border-t-2';
    const url = `/productos/${this.departmentSlug}/no-asociados/`;
    
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-semibold flex items-center gap-2 text-primary">
          <i data-lucide="package-x" class="w-5 h-5"></i>
          Ver productos sin categoría
        </div>
        <i data-lucide="chevron-right" class="w-5 h-5"></i>
      </div>
    `;
    
    div.addEventListener('click', () => {
      window.location.href = url;
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