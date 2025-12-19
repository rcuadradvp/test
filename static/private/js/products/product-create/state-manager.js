// static/private/js/products/product-create/state-manager.js

export class StateManager {
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
    this.hideInitialSkeleton();
    const { appContent, noPermissionState, loadingContainer, container, errorState } = this.elements;
    [appContent, noPermissionState, loadingContainer, container, errorState].forEach(el => {
      el?.classList.add('hidden');
    });

    switch (state) {
      case 'loading':
        appContent?.classList.remove('hidden');
        loadingContainer?.classList.remove('hidden');
        break;
      case 'form':
        appContent?.classList.remove('hidden');
        container?.classList.remove('hidden');
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

  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    this.showState('error');
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }
}