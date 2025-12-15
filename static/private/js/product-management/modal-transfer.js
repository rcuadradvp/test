// static/private/js/product-management/modal-transfer.js

export class TransferModal {
  constructor(modalId = 'modal_confirm_transfer') {
    this.modal = document.getElementById(modalId);
    this.transferSummary = document.getElementById('transfer-summary');
    this.destinationInfo = document.getElementById('destination-info');
    this.productsList = document.getElementById('products-list');
    this.confirmBtn = document.getElementById('btn-confirm-transfer');
    this.cancelBtn = document.getElementById('btn-cancel-transfer');
    this.loadingOverlay = document.getElementById('modal-loading-overlay');
    this.onConfirmCallback = null;
    this.isTransferring = false;
    this.currentState = null;
    this.init();
  }

  init() {
    if (!this.modal) {
      console.warn('[TRANSFER_MODAL] Modal not found');
      return;
    }

    this.confirmBtn?.addEventListener('click', () => {
      this.handleConfirm();
    });

    this.cancelBtn?.addEventListener('click', () => {
      this.close();
    });
  }

  onConfirm(callback) {
    this.onConfirmCallback = callback;
  }

  open(state) {
    if (!state || !state.transferProducts || state.transferProducts.length === 0) {
      console.error('[TRANSFER_MODAL] No products to transfer');
      return;
    }

    this.currentState = state;
    
    // Update summary
    if (this.transferSummary) {
      const count = state.transferProducts.length;
      this.transferSummary.textContent = `${count} producto${count !== 1 ? 's' : ''}`;
    }

    // Update destination info
    if (this.destinationInfo) {
      const dept = state.targetDepartmentSlug === 'unassigned' ? 
        'Sin asignar' : 
        this.getDepartmentName(state.targetDepartmentSlug, state);
      
      const cat = !state.targetCategorySlug || state.targetCategorySlug === 'unassigned' ? 
        'Sin asignar' : 
        this.getCategoryName(state.targetCategorySlug, state);
      
      this.destinationInfo.innerHTML = `
        <strong>Departamento:</strong> ${this.escape(dept)}<br>
        <strong>Categoría:</strong> ${this.escape(cat)}
      `;
    }

    // Update products list
    if (this.productsList) {
      const maxShow = 10;
      const products = state.transferProducts;
      
      let html = products
        .slice(0, maxShow)
        .map(p => `<li>• ${this.escape(p.name)}</li>`)
        .join('');
      
      if (products.length > maxShow) {
        html += `<li class="opacity-60">... y ${products.length - maxShow} más</li>`;
      }
      
      this.productsList.innerHTML = html;
    }

    this.modal?.showModal();
  }

  async handleConfirm() {
    if (this.isTransferring) return;

    this.setTransferring(true);

    try {
      if (this.onConfirmCallback) {
        await this.onConfirmCallback();
      }
      this.close();
    } catch (error) {
      console.error('[TRANSFER_MODAL] Error during transfer:', error);
    } finally {
      this.setTransferring(false);
    }
  }

  setTransferring(transferring) {
    this.isTransferring = transferring;
    
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.toggle('hidden', !transferring);
    }
    
    if (this.confirmBtn) {
      this.confirmBtn.disabled = transferring;
    }
    if (this.cancelBtn) {
      this.cancelBtn.disabled = transferring;
    }
  }

  getDepartmentName(slug, state) {
    const dept = state.departments?.find(d => d.slug === slug);
    return dept ? dept.name : slug;
  }

  getCategoryName(slug, state) {
    const cat = state.targetCategories?.find(c => c.slug === slug);
    return cat ? cat.name : slug;
  }

  close() {
    this.modal?.close();
    this.currentState = null;
  }

  escape(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}