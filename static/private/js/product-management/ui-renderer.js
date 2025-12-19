// static/private/js/product-management/ui-renderer.js

export class UIRenderer {
  constructor(elements) {
    this.elements = elements;
    this.initialSkeleton = document.getElementById('initial-skeleton');
    this.TABLE_HEIGHT = '300px';
  }

  hideInitialSkeleton() {
    if (this.initialSkeleton) {
      this.initialSkeleton.classList.add('hidden');
    }
    if (this.elements.appContent) {
      this.elements.appContent.classList.remove('hidden');
    }
    
    this.applyTableHeight();
  }

  applyTableHeight() {
    const availableContainer = this.elements.availableProducts?.closest('.overflow-x-auto');
    const transferContainer = this.elements.transferProducts?.closest('.overflow-x-auto');
    
    if (availableContainer) {
      availableContainer.style.height = this.TABLE_HEIGHT;
      availableContainer.style.maxHeight = this.TABLE_HEIGHT;
      availableContainer.style.overflowY = 'auto';
    }
    
    if (transferContainer) {
      transferContainer.style.height = this.TABLE_HEIGHT;
      transferContainer.style.maxHeight = this.TABLE_HEIGHT;
      transferContainer.style.overflowY = 'auto';
    }
  }

  setLoadingAvailable(loading) {
    if (this.elements.loadingAvailable) {
      this.elements.loadingAvailable.classList.toggle('hidden', !loading);
    }
  }

  setLoadingTarget(loading) {
    if (this.elements.loadingTarget) {
      this.elements.loadingTarget.classList.toggle('hidden', !loading);
    }
  }

  updateDepartmentSelects(departments) {
    if (this.elements.sourceDepartment) {
      const currentValue = this.elements.sourceDepartment.value;
      this.elements.sourceDepartment.innerHTML = `
        <option value="">Seleccionar...</option>
        <option value="unassigned">Sin asignar</option>
        ${departments.map(d => `<option value="${this.escape(d.slug)}">${this.escape(d.name)}</option>`).join('')}
      `;
      this.elements.sourceDepartment.value = currentValue;
    }
    
    if (this.elements.targetDepartment) {
      const currentValue = this.elements.targetDepartment.value;
      this.elements.targetDepartment.innerHTML = `
        <option value="">Seleccionar...</option>
        <option value="unassigned">Sin asignar</option>
        ${departments.map(d => `<option value="${this.escape(d.slug)}">${this.escape(d.name)}</option>`).join('')}
      `;
      this.elements.targetDepartment.value = currentValue;
    }
  }

  updateSourceCategories(categories) {
    if (!this.elements.sourceCategory) return;
    
    if (!categories || categories.length === 0) {
      this.elements.sourceCategory.innerHTML = '<option value="">Sin categorías</option>';
      this.elements.sourceCategory.disabled = true;
    } else {
      this.elements.sourceCategory.innerHTML = `
        <option value="">Seleccionar categoría...</option>
        ${categories.map(c => `<option value="${this.escape(c.slug)}">${this.escape(c.name)} (${c.product_count || 0})</option>`).join('')}
      `;
      this.elements.sourceCategory.disabled = false;
    }
  }

  updateTargetCategories(categories) {
    if (!this.elements.targetCategory) return;
    
    if (!categories || categories.length === 0) {
      this.elements.targetCategory.innerHTML = `
        <option value="">Seleccionar...</option>
        <option value="unassigned">Sin asignar</option>
      `;
      this.elements.targetCategory.disabled = true;
    } else {
      this.elements.targetCategory.innerHTML = `
        <option value="">Seleccionar...</option>
        <option value="unassigned">Sin asignar</option>
        ${categories.map(c => `<option value="${this.escape(c.slug)}">${this.escape(c.name)} (${c.product_count || 0})</option>`).join('')}
      `;
      this.elements.targetCategory.disabled = false;
    }
  }

  updateTargetPreview(stateManager) {
    const state = stateManager.getState();
    const { targetProducts, targetDepartmentSlug, targetCategorySlug, loadingTarget } = state;
    
    if (!this.elements.targetPreview) return;
    
    const showPreview = targetDepartmentSlug && 
                        targetCategorySlug && 
                        targetCategorySlug !== 'unassigned' &&
                        targetCategorySlug !== '';
    
    this.elements.targetPreview.classList.toggle('hidden', !showPreview);
    
    if (!showPreview) return;
    
    if (this.elements.targetProductCount) {
      if (loadingTarget) {
        this.elements.targetProductCount.textContent = '...';
      } else {
        this.elements.targetProductCount.textContent = targetProducts.length;
      }
    }
    
    if (this.elements.targetProductsList) {
      if (loadingTarget) {
        this.elements.targetProductsList.innerHTML = '<li class="text-base-content/50">Cargando...</li>';
      } else if (targetProducts.length === 0) {
        this.elements.targetProductsList.innerHTML = '<li class="text-base-content/50">Categoría vacía</li>';
      } else {
        const maxShow = 5;
        this.elements.targetProductsList.innerHTML = targetProducts
          .slice(0, maxShow)
          .map(p => `<li>${this.escape(p.name)}</li>`)
          .join('');
        
        if (targetProducts.length > maxShow) {
          this.elements.targetProductsList.innerHTML += `<li class="text-base-content/50 italic">... y ${targetProducts.length - maxShow} más</li>`;
        }
      }
    }
  }

  renderAvailableProducts(stateManager) {
    if (!this.elements.availableProducts) return;
    
    const state = stateManager.getState();
    const { loadingAvailable, sourceDepartmentSlug, sourceCategorySlug } = state;
    
    if (loadingAvailable) {
      this.elements.availableProducts.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="text-base-content/50 mt-3">Cargando productos...</p>
          </td>
        </tr>
      `;
      return;
    }
    
    if (!sourceDepartmentSlug) {
      this.elements.availableProducts.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-12 text-base-content/50">
            <i data-lucide="package" class="w-16 h-16 mx-auto mb-3 opacity-20"></i>
            <p class="font-medium">Selecciona un departamento origen</p>
            <p class="text-xs mt-1">Luego elige una categoría para ver productos</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }
    
    if (!sourceCategorySlug && sourceDepartmentSlug !== 'unassigned') {
      this.elements.availableProducts.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-12 text-base-content/50">
            <i data-lucide="folder" class="w-16 h-16 mx-auto mb-3 opacity-20"></i>
            <p class="font-medium">Selecciona una categoría</p>
            <p class="text-xs mt-1">Elige una categoría para ver sus productos</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }
    
    const paginated = stateManager.getPaginatedAvailable();
    const { items } = paginated;
    
    if (items.length === 0) {
      this.elements.availableProducts.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-12 text-base-content/50">
            <i data-lucide="inbox" class="w-16 h-16 mx-auto mb-3 opacity-20"></i>
            <p class="font-medium">No hay productos disponibles</p>
            <p class="text-xs mt-1">Todos los productos ya están en transferencia o la categoría está vacía</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }
    
    this.elements.availableProducts.innerHTML = items.map(product => `
      <tr class="hover cursor-pointer" data-product-id="${product.id}">
        <td>
          <input 
            type="checkbox" 
            class="checkbox checkbox-sm checkbox-primary checkbox-available-product" 
            data-product-id="${product.id}"
            ${state.selectedAvailable?.has(String(product.id)) ? 'checked' : ''}
          />
        </td>
        <td class="font-medium">${this.escape(product.name)}</td>
        <td class="hidden sm:table-cell">
          <span class="badge badge-sm badge-outline">${this.escape(product.category_name || '-')}</span>
        </td>
        <td class="hidden md:table-cell text-sm text-base-content/60 max-w-[200px] truncate">
          ${this.escape(product.description || '-')}
        </td>
      </tr>
    `).join('');
    
    this.attachCheckboxEvents('available', stateManager);
    this.attachRowClickEvents('available', stateManager);
    this.refreshIcons();
  }

  renderTransferProducts(stateManager) {
    if (!this.elements.transferProducts) return;
    
    const paginated = stateManager.getPaginatedTransfer();
    const state = stateManager.getState();
    const { items } = paginated;
    
    if (items.length === 0) {
      this.elements.transferProducts.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-12 text-base-content/50">
            <i data-lucide="inbox" class="w-16 h-16 mx-auto mb-3 opacity-20"></i>
            <p class="font-medium">Sin productos para transferir</p>
            <p class="text-xs mt-1">Usa los botones para mover productos aquí</p>
          </td>
        </tr>
      `;
      this.refreshIcons();
      return;
    }
    
    this.elements.transferProducts.innerHTML = items.map(product => `
      <tr class="hover cursor-pointer" data-product-id="${product.id}">
        <td>
          <input 
            type="checkbox" 
            class="checkbox checkbox-sm checkbox-success checkbox-transfer-product" 
            data-product-id="${product.id}"
            ${state.selectedTransfer?.has(String(product.id)) ? 'checked' : ''}
          />
        </td>
        <td>
          <div class="font-medium">${this.escape(product.name)}</div>
          <div class="text-xs text-base-content/50">
            ${this.escape(product.department_name || 'Sin depto.')} → ${this.escape(product.category_name || 'Sin cat.')}
          </div>
        </td>
        <td class="hidden sm:table-cell">
          <span class="badge badge-sm badge-outline badge-success">${this.escape(product.category_name || '-')}</span>
        </td>
        <td class="hidden md:table-cell text-sm text-base-content/60 max-w-[200px] truncate">
          ${this.escape(product.description || '-')}
        </td>
      </tr>
    `).join('');
    
    this.attachCheckboxEvents('transfer', stateManager);
    this.attachRowClickEvents('transfer', stateManager);
    this.refreshIcons();
  }

  attachCheckboxEvents(panel, stateManager) {
    const checkboxes = document.querySelectorAll(`.checkbox-${panel}-product`);
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const productId = e.target.dataset.productId;
        if (panel === 'available') {
          stateManager.toggleAvailableSelection(productId);
        } else {
          stateManager.toggleTransferSelection(productId);
        }
      });
    });
  }

  attachRowClickEvents(panel, stateManager) {
    const tbody = panel === 'available' ? this.elements.availableProducts : this.elements.transferProducts;
    if (!tbody) return;
    
    tbody.querySelectorAll('tr[data-product-id]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        
        const productId = row.dataset.productId;
        if (panel === 'available') {
          stateManager.toggleAvailableSelection(productId);
        } else {
          stateManager.toggleTransferSelection(productId);
        }
      });
    });
  }

  updateCounters(stateManager) {
    const availablePaginated = stateManager.getPaginatedAvailable();
    const transferPaginated = stateManager.getPaginatedTransfer();
    const state = stateManager.getState();
    
    if (this.elements.availableCount) {
      this.elements.availableCount.textContent = `${availablePaginated.totalItems} items`;
    }
    if (this.elements.transferCount) {
      this.elements.transferCount.textContent = `${transferPaginated.totalItems} items`;
    }
    
    if (this.elements.transferSummaryCount) {
      this.elements.transferSummaryCount.textContent = state.transferProducts?.length || 0;
    }
    
    if (this.elements.selectedAvailableCount) {
      const count = state.selectedAvailable?.size || 0;
      this.elements.selectedAvailableCount.textContent = count > 0 ? `${count} seleccionados` : '0 seleccionados';
    }
    if (this.elements.selectedTransferCount) {
      const count = state.selectedTransfer?.size || 0;
      this.elements.selectedTransferCount.textContent = count > 0 ? `${count} seleccionados` : '0 seleccionados';
    }
    
    if (this.elements.prevAvailable) {
      this.elements.prevAvailable.disabled = availablePaginated.currentPage <= 1;
    }
    if (this.elements.nextAvailable) {
      this.elements.nextAvailable.disabled = availablePaginated.currentPage >= availablePaginated.totalPages || availablePaginated.totalPages === 0;
    }
    if (this.elements.pageAvailable) {
      this.elements.pageAvailable.textContent = `${availablePaginated.currentPage}/${availablePaginated.totalPages || 1}`;
    }
    
    if (this.elements.prevTransfer) {
      this.elements.prevTransfer.disabled = transferPaginated.currentPage <= 1;
    }
    if (this.elements.nextTransfer) {
      this.elements.nextTransfer.disabled = transferPaginated.currentPage >= transferPaginated.totalPages || transferPaginated.totalPages === 0;
    }
    if (this.elements.pageTransfer) {
      this.elements.pageTransfer.textContent = `${transferPaginated.currentPage}/${transferPaginated.totalPages || 1}`;
    }
  }

  updateButtons(stateManager) {
    const state = stateManager.getState();
    const hasAvailable = state.availableProducts?.length > 0;
    const hasSelected = state.selectedAvailable?.size > 0;
    const hasTransfer = state.transferProducts?.length > 0;
    const hasTransferSelected = state.selectedTransfer?.size > 0;
    const hasTarget = state.targetDepartmentSlug !== '' && state.targetDepartmentSlug !== undefined;
    
    if (this.elements.btnMoveRight) {
      this.elements.btnMoveRight.disabled = !hasSelected;
    }
    if (this.elements.btnMoveAllRight) {
      this.elements.btnMoveAllRight.disabled = !hasAvailable;
    }
    if (this.elements.btnMoveLeft) {
      this.elements.btnMoveLeft.disabled = !hasTransferSelected;
    }
    if (this.elements.btnMoveAllLeft) {
      this.elements.btnMoveAllLeft.disabled = !hasTransfer;
    }
    
    if (this.elements.btnTransfer) {
      this.elements.btnTransfer.disabled = !hasTransfer || !hasTarget;
    }
  }

  escape(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  refreshIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }
}