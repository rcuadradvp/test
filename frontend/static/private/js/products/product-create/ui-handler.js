// static/private/js/products/product-create/ui-handler.js

import { PriceCalculator } from './price-calculator.js';

export class UIHandler {
  constructor(elements) {
    this.elements = elements;
    this.priceCalculator = new PriceCalculator();
  }

  setupConfigListeners() {
    this.elements.inputIsPackage?.addEventListener('change', (e) => {
      this.togglePackageFields(e.target.checked);
    });

    this.elements.inputIsTray?.addEventListener('change', (e) => {
      this.toggleTrayFields(e.target.checked);
    });

    this.elements.inputHasReturnable?.addEventListener('change', (e) => {
      this.toggleReturnableFields(e.target.checked);
    });

    this.elements.inputIsTaxExempt?.addEventListener('change', (e) => {
      this.updateFinalPrice();
    });

    this.elements.inputHasExtraTax?.addEventListener('change', (e) => {
      this.toggleExtraTaxField(e.target.checked);
      this.updateFinalPrice();
    });

    this.elements.inputExtraTaxRate?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (parseInt(e.target.value) > 100) {
        e.target.value = '100';
      }
      this.updateFinalPrice();
    });

    this.elements.inputUnitPrice?.addEventListener('input', (e) => {
      this.formatPriceInput(e.target);
      this.updateFinalPrice();
    });
  }

  toggleExtraTaxField(show) {
    const field = this.elements.fieldExtraTaxRate;
    if (field) {
      if (show) {
        field.classList.remove('hidden');
        this.elements.inputExtraTaxRate?.focus();
      } else {
        field.classList.add('hidden');
        if (this.elements.inputExtraTaxRate) {
          this.elements.inputExtraTaxRate.value = '';
        }
      }
    }
  }

  toggleFinalPriceField(show) {
    const field = this.elements.fieldFinalPrice;
    if (field) {
      if (show) {
        field.classList.remove('hidden');
      } else {
        field.classList.add('hidden');
      }
    }
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

      input.addEventListener('blur', (e) => {
        this.formatPriceInput(e.target);
      });

      input.addEventListener('focus', (e) => {
        const rawValue = e.target.dataset.rawValue || '0';
        if (rawValue !== '0') {
          e.target.value = rawValue;
          e.target.select();
        }
      });
    });
  }

  formatPriceInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    
    if (value === '') {
      value = '0';
    }

    input.dataset.rawValue = value;
    const formatted = this.priceCalculator.formatPriceCLP(parseInt(value));
    input.value = formatted;
  }

  formatPriceCLP(value) {
    return this.priceCalculator.formatPriceCLP(value);
  }

  getPriceValue(input) {
    return this.priceCalculator.getPriceValue(input);
  }

  updateFinalPrice() {
    const unitPrice = this.getPriceValue(this.elements.inputUnitPrice);
    const isTaxExempt = this.elements.inputIsTaxExempt?.checked || false;
    const hasExtraTax = this.elements.inputHasExtraTax?.checked || false;
    const extraTaxRate = parseInt(this.elements.inputExtraTaxRate?.value) || 0;
    const hasTax = !isTaxExempt;
    const calculation = this.priceCalculator.calculateFinalPrice(
      unitPrice,
      hasTax,
      hasExtraTax,
      extraTaxRate
    );

    if (this.elements.displayFinalPrice) {
      this.elements.displayFinalPrice.textContent = this.priceCalculator.formatPriceCLP(calculation.finalPrice);
    }

    if (this.elements.displayTaxInfo) {
      this.elements.displayTaxInfo.textContent = this.priceCalculator.getPriceDescription(calculation);
    }

    const hasAnyTax = hasTax || (hasExtraTax && extraTaxRate > 0);
    this.toggleFinalPriceField(hasAnyTax);
  }

  togglePackageFields(isPackage) {
    const fieldsToToggle = [
      this.elements.fieldUnitsPerPackage,
      this.elements.fieldPackagePrice
    ];

    fieldsToToggle.forEach(field => {
      if (field) {
        if (isPackage) {
          field.classList.remove('hidden');
        } else {
          field.classList.add('hidden');
          const input = field.querySelector('input');
          if (input) {
            input.value = '';
            input.dataset.rawValue = '0';
          }
        }
      }
    });
  }

  toggleTrayFields(isTray) {
    const fieldsToToggle = [
      this.elements.fieldPackagesPerTray,
      this.elements.fieldTrayPrice
    ];

    fieldsToToggle.forEach(field => {
      if (field) {
        if (isTray) {
          field.classList.remove('hidden');
        } else {
          field.classList.add('hidden');
          const input = field.querySelector('input');
          if (input) {
            input.value = '';
            input.dataset.rawValue = '0';
          }
        }
      }
    });
  }

  toggleReturnableFields(hasReturnable) {
    if (this.elements.fieldContainerPrice) {
      if (hasReturnable) {
        this.elements.fieldContainerPrice.classList.remove('hidden');
      } else {
        this.elements.fieldContainerPrice.classList.add('hidden');
        const input = this.elements.fieldContainerPrice.querySelector('input');
        if (input) {
          input.value = '';
          input.dataset.rawValue = '0';
        }
      }
    }
  }

  setupCharCounter() {
    const descInput = this.elements.inputDescription;
    const charCount = document.getElementById('char-count');
    
    if (descInput && charCount) {
      descInput.addEventListener('input', () => {
        charCount.textContent = descInput.value.length;
      });
    }
  }

  displayContext(departmentName, categoryName) {
    if (this.elements.displayDepartment) {
      const span = this.elements.displayDepartment.querySelector('span');
      if (span) {
        span.textContent = departmentName || 'Sin asignar';
      }
    }

    if (this.elements.displayCategory) {
      const span = this.elements.displayCategory.querySelector('span');
      if (span) {
        span.textContent = categoryName || 'Sin asignar';
      }
    }
  }

  setSubmitting(submitting) {
    if (this.elements.btnCreate) {
      this.elements.btnCreate.disabled = submitting;

      if (submitting) {
        this.elements.btnCreate.innerHTML = `
          <span class="loading loading-spinner loading-sm"></span>
          Creando...
        `;
      } else {
        this.elements.btnCreate.innerHTML = `
          <i data-lucide="plus" class="w-4 h-4"></i>
          Crear producto
        `;
        this.refreshIcons();
      }
    }

    if (this.elements.btnCancel) {
      this.elements.btnCancel.disabled = submitting;
    }

    if (this.elements.btnBack) {
      this.elements.btnBack.disabled = submitting;
    }
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }
}