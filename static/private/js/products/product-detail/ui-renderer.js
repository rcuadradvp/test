// static/private/js/products/product-detail/ui-renderer.js

import { PriceCalculator } from './price-calculator.js';

export class UIRenderer {
  constructor(elements) {
    this.elements = elements;
    this.initialSkeleton = document.getElementById('initial-skeleton');
    this.isEditMode = false;
    this.originalData = null;
    this.priceCalculator = new PriceCalculator();
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
    const { appContent, noPermissionState, loadingContainer, container, errorState } = this.elements;
    
    if (this.initialSkeleton && !this.initialSkeleton.classList.contains('hidden')) {
      this.hideInitialSkeleton();
    }
    
    [appContent, noPermissionState, loadingContainer, container, errorState].forEach(el => {
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

  renderProduct(product, permissions) {
    if (!product) return;

    // Guardar datos originales
    this.originalData = { ...product };

    // Actualizar título
    this.updatePageTitle(product);
    
    // Llenar formulario
    this.populateForm(product);
    
    // Actualizar badges
    this.updateStatusBadge(product.is_active);
    this.updateStockIndicator(
      parseInt(product.stock_units) || 0,
      parseInt(product.min_stock) || 0
    );
    
    this.updateDates(product);
    this.refreshIcons();
  }

  updatePageTitle(product) {
    const titleElement = document.getElementById('product-title');
    if (titleElement) {
      titleElement.textContent = product.name || 'Sin nombre';
    }
  }

  populateForm(product) {
    // Información básica
    this.setInputValue('input-name', product.name);
    this.setInputValue('input-description', product.description);
    this.updateCharCounter((product.description || '').length);
    this.setInputValue('input-barcode', product.barcode);
    this.setInputValue('input-barcode-package', product.barcode_package);
    
    // Departamento y categoría
    this.updateDepartmentCategory(product.department_name, product.category_name);
    
    // Precios (con formateo CLP)
    this.setPriceValue('input-cost-price', product.cost_price);
    this.setPriceValue('input-unit-price', product.unit_price);
    this.setPriceValue('input-package-price', product.package_price);
    this.setPriceValue('input-tray-price', product.tray_price);
    this.setPriceValue('input-container-price', product.container_price);
    
    // Inventario
    this.setInputValue('input-stock-units', product.stock_units);
    this.setInputValue('input-min-stock', product.min_stock);
    this.setInputValue('input-units-per-package', product.units_per_package);
    this.setInputValue('input-packages-per-tray', product.packages_per_tray);
    
    // Checkboxes
    this.setCheckboxValue('input-is-package', product.is_package);
    this.setCheckboxValue('input-is-tray', product.is_tray);
    this.setCheckboxValue('input-has-returnable', product.has_returnable_container);
    this.setCheckboxValue('input-is-tax-exempt', product.is_tax_exempt);
    this.setCheckboxValue('input-is-active', product.is_active);
    const extraTaxRate = this.calculateExtraTaxRate(product.is_tax_exempt, product.variable_tax_rate);
    const hasExtraTax = extraTaxRate > 0;
    this.setCheckboxValue('input-has-extra-tax', hasExtraTax);
    this.setInputValue('input-extra-tax-rate', hasExtraTax ? extraTaxRate : '');
    this.toggleConditionalFields(product, hasExtraTax, extraTaxRate);
    this.updateFinalPrice();
  }

  calculateExtraTaxRate(isTaxExempt, variableTaxRate) {
    if (!variableTaxRate) return 0;
    
    const totalRate = parseInt(variableTaxRate) || 0;
    
    if (!isTaxExempt) {
      return Math.max(0, totalRate - 19);
    }
    
    return totalRate;
  }

  toggleConditionalFields(product, hasExtraTax = false, extraTaxRate = 0) {
    if (product.is_package) {
      this.showElement('field-units-per-package');
      this.showElement('field-package-price');
    } else {
      this.hideElement('field-units-per-package');
      this.hideElement('field-package-price');
    }
    
    if (product.is_tray) {
      this.showElement('field-packages-per-tray');
      this.showElement('field-tray-price');
    } else {
      this.hideElement('field-packages-per-tray');
      this.hideElement('field-tray-price');
    }
    
    if (product.has_returnable_container) {
      this.showElement('field-container-price');
    } else {
      this.hideElement('field-container-price');
    }
    
    if (hasExtraTax) {
      this.showElement('field-extra-tax-rate');
    } else {
      this.hideElement('field-extra-tax-rate');
    }
    
    const hasAnyTax = !product.is_tax_exempt || (hasExtraTax && extraTaxRate > 0);
    this.toggleFinalPriceField(hasAnyTax);
  }

  toggleFinalPriceField(show) {
    const field = document.getElementById('field-final-price');
    if (field) {
      if (show) {
        field.classList.remove('hidden');
      } else {
        field.classList.add('hidden');
      }
    }
  }

  setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) {
      input.value = value || '';
    }
  }

  setPriceValue(id, value) {
    const input = document.getElementById(id);
    if (input) {
      const numericValue = parseInt(value) || 0;
      input.dataset.rawValue = numericValue.toString();
      input.value = this.formatPriceCLP(numericValue);
    }
  }

  setCheckboxValue(id, checked) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = !!checked;
    }
  }

  showElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.remove('hidden');
  }

  hideElement(id) {
    const element = document.getElementById(id);
    if (element) element.classList.add('hidden');
  }

  updateDepartmentCategory(departmentName, categoryName) {
    const deptDisplay = document.getElementById('display-department');
    if (deptDisplay) {
      const span = deptDisplay.querySelector('span');
      if (span) {
        span.textContent = departmentName || 'Sin asignar';
      }
    }
    
    const catDisplay = document.getElementById('display-category');
    if (catDisplay) {
      const span = catDisplay.querySelector('span');
      if (span) {
        span.textContent = categoryName || 'Sin asignar';
      }
    }
  }

  updateCharCounter(length) {
    const charCount = document.getElementById('char-count');
    if (charCount) {
      charCount.textContent = length;
    }
  }

  updateFinalPrice() {
    const unitPriceInput = document.getElementById('input-unit-price');
    const isTaxExempt = document.getElementById('input-is-tax-exempt')?.checked || false;
    const hasExtraTax = document.getElementById('input-has-extra-tax')?.checked || false;
    const extraTaxRate = parseInt(document.getElementById('input-extra-tax-rate')?.value) || 0;
    const unitPrice = parseInt(unitPriceInput?.dataset.rawValue || '0');

    const calculation = this.priceCalculator.calculateFinalPrice(
      unitPrice,
      !isTaxExempt,
      hasExtraTax,
      extraTaxRate
    );

    const displayFinalPrice = document.getElementById('display-final-price');
    if (displayFinalPrice) {
      displayFinalPrice.textContent = this.priceCalculator.formatPriceCLP(calculation.finalPrice);
    }

    const displayTaxInfo = document.getElementById('display-tax-info');
    if (displayTaxInfo) {
      displayTaxInfo.textContent = this.priceCalculator.getPriceDescription(calculation);
    }

    const hasAnyTax = !isTaxExempt || (hasExtraTax && extraTaxRate > 0);
    this.toggleFinalPriceField(hasAnyTax);
  }

  updateStockIndicator(currentStock, minStock) {
    const indicator = document.getElementById('stock-indicator');
    if (!indicator) return;
    
    if (currentStock <= 0) {
      indicator.className = 'badge badge-error badge-xs ml-auto';
      indicator.innerHTML = '<i data-lucide="x-circle" class="w-3 h-3"></i> Sin stock';
    } else if (currentStock <= minStock) {
      indicator.className = 'badge badge-warning badge-xs ml-auto';
      indicator.innerHTML = '<i data-lucide="alert-triangle" class="w-3 h-3"></i> Stock bajo';
    } else {
      indicator.className = 'badge badge-success badge-xs ml-auto';
      indicator.innerHTML = '<i data-lucide="check-circle" class="w-3 h-3"></i> En stock';
    }
    
    this.refreshIcons();
  }

  updateStatusBadge(isActive) {
    const badge = document.getElementById('status-badge');
    if (!badge) return;
    
    if (isActive) {
      badge.className = 'badge badge-success badge-sm gap-1';
      badge.innerHTML = '<i data-lucide="check-circle" class="w-3 h-3"></i> Activo';
    } else {
      badge.className = 'badge badge-error badge-sm gap-1';
      badge.innerHTML = '<i data-lucide="x-circle" class="w-3 h-3"></i> Inactivo';
    }
    
    this.refreshIcons();
  }

  updateDates(product) {
    const createdEl = document.getElementById('display-created-at');
    const updatedEl = document.getElementById('display-updated-at');
    
    if (createdEl) {
      createdEl.textContent = `Creado ${this.formatDateCompact(product.created_at)}`;
    }
    if (updatedEl) {
      updatedEl.textContent = `Actualizado ${this.formatDateCompact(product.updated_at)}`;
    }
  }

  updateActionButtons(permissions) {
    const { btnEdit, btnDelete } = this.elements;
    
    if (btnEdit) {
      btnEdit.classList.toggle('hidden', !permissions.canEdit);
    }
    
    if (btnDelete) {
      btnDelete.classList.toggle('hidden', !permissions.canDelete);
    }
  }

  // =============== MODO EDICIÓN ===============

  enableEditMode() {
    this.isEditMode = true;
    
    const inputs = document.querySelectorAll('#product-form input:not([id^="display-"])');
    inputs.forEach(input => {
      input.disabled = false;
    });
    
    document.getElementById('btn-save')?.classList.remove('hidden');
    document.getElementById('btn-cancel')?.classList.remove('hidden');
    document.getElementById('btn-edit')?.classList.add('hidden');
    
    this.setupEditListeners();
    this.setupPriceFormatting();
  }

  disableEditMode() {
    this.isEditMode = false;
    
    const inputs = document.querySelectorAll('#product-form input');
    inputs.forEach(input => {
      input.disabled = true;
    });
    
    document.getElementById('btn-save')?.classList.add('hidden');
    document.getElementById('btn-cancel')?.classList.add('hidden');
    document.getElementById('btn-edit')?.classList.remove('hidden');
  }

  setupEditListeners() {
    const isPackageCheckbox = document.getElementById('input-is-package');
    const isTrayCheckbox = document.getElementById('input-is-tray');
    const hasReturnableCheckbox = document.getElementById('input-has-returnable');
    const isTaxExemptCheckbox = document.getElementById('input-is-tax-exempt');
    const hasExtraTaxCheckbox = document.getElementById('input-has-extra-tax');
    const isActiveCheckbox = document.getElementById('input-is-active');
    
    isPackageCheckbox?.addEventListener('change', this.handlePackageToggle.bind(this));
    isTrayCheckbox?.addEventListener('change', this.handleTrayToggle.bind(this));
    hasReturnableCheckbox?.addEventListener('change', this.handleReturnableToggle.bind(this));
    isTaxExemptCheckbox?.addEventListener('change', this.handleTaxExemptToggle.bind(this));
    hasExtraTaxCheckbox?.addEventListener('change', this.handleExtraTaxToggle.bind(this));
    isActiveCheckbox?.addEventListener('change', this.handleActiveToggle.bind(this));
    
    const extraTaxRateInput = document.getElementById('input-extra-tax-rate');
    extraTaxRateInput?.addEventListener('input', this.handleExtraTaxRateChange.bind(this));
    
    const unitPriceInput = document.getElementById('input-unit-price');
    unitPriceInput?.addEventListener('input', this.updateFinalPrice.bind(this));
    
    const stockInput = document.getElementById('input-stock-units');
    const minStockInput = document.getElementById('input-min-stock');
    stockInput?.addEventListener('input', this.handleStockChange.bind(this));
    minStockInput?.addEventListener('input', this.handleStockChange.bind(this));
    
    const descInput = document.getElementById('input-description');
    descInput?.addEventListener('input', (e) => {
      this.updateCharCounter(e.target.value.length);
    });
    
    this.attachNumericValidation();
  }

  setupPriceFormatting() {
    const priceInputs = document.querySelectorAll('.price-input');
    
    priceInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.formatPriceInput(e.target);
        if (e.target.id === 'input-unit-price') {
          this.updateFinalPrice();
        }
      });

      input.addEventListener('focus', (e) => {
        const rawValue = e.target.dataset.rawValue || '0';
        if (rawValue !== '0') {
          e.target.value = rawValue;
          e.target.select();
        }
      });

      input.addEventListener('blur', (e) => {
        this.formatPriceInput(e.target);
      });
    });
  }

  formatPriceInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') value = '0';
    input.dataset.rawValue = value;
    input.value = this.formatPriceCLP(parseInt(value));
  }

  attachNumericValidation() {
    const numericInputs = [
      'input-stock-units',
      'input-min-stock',
      'input-units-per-package',
      'input-packages-per-tray',
      'input-extra-tax-rate'
    ];
    
    numericInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
      }
    });
  }

  handlePackageToggle(e) {
    if (e.target.checked) {
      this.showElement('field-units-per-package');
      this.showElement('field-package-price');
    } else {
      this.hideElement('field-units-per-package');
      this.hideElement('field-package-price');
      document.getElementById('input-units-per-package').value = '';
      document.getElementById('input-package-price').value = '';
      document.getElementById('input-package-price').dataset.rawValue = '0';
    }
  }

  handleTrayToggle(e) {
    if (e.target.checked) {
      this.showElement('field-packages-per-tray');
      this.showElement('field-tray-price');
    } else {
      this.hideElement('field-packages-per-tray');
      this.hideElement('field-tray-price');
      document.getElementById('input-packages-per-tray').value = '';
      document.getElementById('input-tray-price').value = '';
      document.getElementById('input-tray-price').dataset.rawValue = '0';
    }
  }

  handleReturnableToggle(e) {
    if (e.target.checked) {
      this.showElement('field-container-price');
    } else {
      this.hideElement('field-container-price');
      document.getElementById('input-container-price').value = '';
      document.getElementById('input-container-price').dataset.rawValue = '0';
    }
  }

  handleTaxExemptToggle(e) {
    this.updateFinalPrice();
  }

  handleExtraTaxToggle(e) {
    if (e.target.checked) {
      this.showElement('field-extra-tax-rate');
      document.getElementById('input-extra-tax-rate')?.focus();
    } else {
      this.hideElement('field-extra-tax-rate');
      document.getElementById('input-extra-tax-rate').value = '';
    }
    this.updateFinalPrice();
  }

  handleExtraTaxRateChange(e) {
    if (parseInt(e.target.value) > 100) {
      e.target.value = '100';
    }
    this.updateFinalPrice();
  }

  handleActiveToggle(e) {
    this.updateStatusBadge(e.target.checked);
  }

  handleStockChange() {
    const stockUnits = parseInt(document.getElementById('input-stock-units')?.value) || 0;
    const minStock = parseInt(document.getElementById('input-min-stock')?.value) || 0;
    this.updateStockIndicator(stockUnits, minStock);
  }

  restoreOriginalData() {
    if (this.originalData) {
      this.populateForm(this.originalData);
    }
  }

  getPriceValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return 0;
    return parseInt(input.dataset.rawValue || '0');
  }

  getFormData() {
    const isPackage = document.getElementById('input-is-package')?.checked || false;
    const isTray = document.getElementById('input-is-tray')?.checked || false;
    const hasReturnable = document.getElementById('input-has-returnable')?.checked || false;
    const isTaxExempt = document.getElementById('input-is-tax-exempt')?.checked || false;
    const hasExtraTax = document.getElementById('input-has-extra-tax')?.checked || false;
    const extraTaxRate = parseInt(document.getElementById('input-extra-tax-rate')?.value) || 0;

    let variableTaxRate = null;
    if (!isTaxExempt) {
      variableTaxRate = 19;
    }
    if (hasExtraTax && extraTaxRate > 0) {
      variableTaxRate = (variableTaxRate || 0) + extraTaxRate;
    }

    return {
      name: document.getElementById('input-name')?.value?.trim() || '',
      description: document.getElementById('input-description')?.value?.trim() || '',
      barcode: document.getElementById('input-barcode')?.value?.trim() || '',
      barcode_package: document.getElementById('input-barcode-package')?.value?.trim() || null,
      
      stock_units: document.getElementById('input-stock-units')?.value || '0',
      min_stock: document.getElementById('input-min-stock')?.value || '0',
      
      is_package: isPackage,
      units_per_package: isPackage ? (document.getElementById('input-units-per-package')?.value || null) : null,
      
      is_tray: isTray,
      packages_per_tray: isTray ? (document.getElementById('input-packages-per-tray')?.value || null) : null,
      
      cost_price: this.getPriceValue('input-cost-price').toString(),
      unit_price: this.getPriceValue('input-unit-price').toString(),
      package_price: isPackage ? (this.getPriceValue('input-package-price').toString() || null) : null,
      tray_price: isTray ? (this.getPriceValue('input-tray-price').toString() || null) : null,
      
      has_returnable_container: hasReturnable,
      container_price: hasReturnable ? (this.getPriceValue('input-container-price').toString() || null) : null,
      
      is_tax_exempt: isTaxExempt,
      variable_tax_rate: variableTaxRate,
      
      is_active: document.getElementById('input-is-active')?.checked || false,
    };
  }

  setErrorMessage(message) {
    const { errorMessage } = this.elements;
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  formatPriceCLP(value) {
    if (!value && value !== 0) return '$0';
    const formatted = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }

  formatDateCompact(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }
}