// static/private/js/products/product-create/form-validator.js

export class FormValidator {
  constructor(elements) {
    this.elements = elements;
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

        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const pastedText = (e.clipboardData || window.clipboardData).getData('text');
          const numericOnly = pastedText.replace(/[^0-9]/g, '');
          e.target.value = numericOnly;
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
    });
  }

  getPriceValue(input) {
    if (!input) return 0;
    return parseInt(input.dataset.rawValue || '0');
  }

  validate() {
    const name = this.elements.inputName?.value?.trim() || '';
    if (name.length < 3) {
      MessageHelper?.error('El nombre debe tener al menos 3 caracteres');
      this.elements.inputName?.focus();
      return false;
    }

    const barcode = this.elements.inputBarcode?.value?.trim() || '';
    const validLengths = [8, 12, 13, 14];
    
    if (!barcode) {
      MessageHelper?.error('El código de barras es requerido');
      this.elements.inputBarcode?.focus();
      return false;
    }
    
    if (!validLengths.includes(barcode.length)) {
      MessageHelper?.error('El código de barras debe tener 8, 12, 13 o 14 dígitos');
      this.elements.inputBarcode?.focus();
      return false;
    }

    const costPrice = this.getPriceValue(this.elements.inputCostPrice);
    if (costPrice <= 0) {
      MessageHelper?.error('El precio costo es requerido y debe ser mayor a 0');
      this.elements.inputCostPrice?.focus();
      return false;
    }

    if (this.elements.inputIsPackage?.checked) {
      const unitsPerPackage = parseInt(this.elements.inputUnitsPerPackage?.value) || 0;
      if (unitsPerPackage < 1) {
        MessageHelper?.error('Debes especificar las unidades por paquete');
        this.elements.inputUnitsPerPackage?.focus();
        return false;
      }
    }

    if (this.elements.inputIsTray?.checked) {
      const packagesPerTray = parseInt(this.elements.inputPackagesPerTray?.value) || 0;
      if (packagesPerTray < 1) {
        MessageHelper?.error('Debes especificar los paquetes por bandeja');
        this.elements.inputPackagesPerTray?.focus();
        return false;
      }
    }

    if (this.elements.inputHasExtraTax?.checked) {
      const extraTaxRate = parseInt(this.elements.inputExtraTaxRate?.value) || 0;
      if (extraTaxRate <= 0) {
        MessageHelper?.error('Debes especificar el porcentaje del impuesto adicional');
        this.elements.inputExtraTaxRate?.focus();
        return false;
      }
      if (extraTaxRate > 100) {
        MessageHelper?.error('El impuesto adicional no puede ser mayor a 100%');
        this.elements.inputExtraTaxRate?.focus();
        return false;
      }
    }

    return true;
  }

  getFormData(departmentId, categoryId) {
    const isPackage = this.elements.inputIsPackage?.checked || false;
    const isTray = this.elements.inputIsTray?.checked || false;
    const hasReturnable = this.elements.inputHasReturnable?.checked || false;
    const isTaxExempt = this.elements.inputIsTaxExempt?.checked || false;
    const hasExtraTax = this.elements.inputHasExtraTax?.checked || false;
    let variableTaxRate = null;
    if (!isTaxExempt) {
      variableTaxRate = 19;
    }
    if (hasExtraTax) {
      const extraRate = parseInt(this.elements.inputExtraTaxRate?.value) || 0;
      if (extraRate > 0) {
        variableTaxRate = (variableTaxRate || 0) + extraRate;
      }
    }

    return {
      name: this.elements.inputName?.value?.trim() || '',
      description: this.elements.inputDescription?.value?.trim() || '',
      barcode: this.elements.inputBarcode?.value?.trim() || '',
      barcode_package: this.elements.inputBarcodePackage?.value?.trim() || null,
      stock_units: this.elements.inputStockUnits?.value || '0',
      min_stock: this.elements.inputMinStock?.value || '0',
      is_package: isPackage,
      units_per_package: isPackage ? (this.elements.inputUnitsPerPackage?.value || null) : null,
      is_tray: isTray,
      packages_per_tray: isTray ? (this.elements.inputPackagesPerTray?.value || null) : null,
      cost_price: this.getPriceValue(this.elements.inputCostPrice).toString(),
      unit_price: this.getPriceValue(this.elements.inputUnitPrice).toString(),
      package_price: isPackage ? (this.getPriceValue(this.elements.inputPackagePrice).toString() || null) : null,
      tray_price: isTray ? (this.getPriceValue(this.elements.inputTrayPrice).toString() || null) : null,
      has_returnable_container: hasReturnable,
      container_price: hasReturnable ? (this.getPriceValue(this.elements.inputContainerPrice).toString() || null) : null,
      is_tax_exempt: isTaxExempt,
      variable_tax_rate: variableTaxRate,
      is_active: this.elements.inputIsActive?.checked || false,
      department: departmentId || null,
      category: categoryId || null,
    };
  }
}