// static/private/js/products/product-detail/form-validator.js

export class FormValidator {
  validate(formData) {
    if (!formData.name || formData.name.length < 3) {
      MessageHelper?.error('El nombre debe tener al menos 3 caracteres');
      document.getElementById('input-name')?.focus();
      return false;
    }

    const validLengths = [8, 12, 13, 14];
    if (!formData.barcode) {
      MessageHelper?.error('El código de barras es requerido');
      document.getElementById('input-barcode')?.focus();
      return false;
    }
    
    if (!validLengths.includes(formData.barcode.length)) {
      MessageHelper?.error('El código de barras debe tener 8, 12, 13 o 14 dígitos');
      document.getElementById('input-barcode')?.focus();
      return false;
    }

    const costPrice = parseInt(formData.cost_price) || 0;
    if (costPrice <= 0) {
      MessageHelper?.error('El precio costo es requerido y debe ser mayor a 0');
      document.getElementById('input-cost-price')?.focus();
      return false;
    }

    if (formData.is_package) {
      const unitsPerPackage = parseInt(formData.units_per_package) || 0;
      if (unitsPerPackage < 1) {
        MessageHelper?.error('Debes especificar las unidades por paquete');
        document.getElementById('input-units-per-package')?.focus();
        return false;
      }
    }

    if (formData.is_tray) {
      const packagesPerTray = parseInt(formData.packages_per_tray) || 0;
      if (packagesPerTray < 1) {
        MessageHelper?.error('Debes especificar los paquetes por bandeja');
        document.getElementById('input-packages-per-tray')?.focus();
        return false;
      }
    }

    const hasExtraTax = document.getElementById('input-has-extra-tax')?.checked || false;
    if (hasExtraTax) {
      const extraTaxRate = parseInt(document.getElementById('input-extra-tax-rate')?.value) || 0;
      if (extraTaxRate <= 0) {
        MessageHelper?.error('Debes especificar el porcentaje del impuesto adicional');
        document.getElementById('input-extra-tax-rate')?.focus();
        return false;
      }
      if (extraTaxRate > 100) {
        MessageHelper?.error('El impuesto adicional no puede ser mayor a 100%');
        document.getElementById('input-extra-tax-rate')?.focus();
        return false;
      }
    }

    return true;
  }
}