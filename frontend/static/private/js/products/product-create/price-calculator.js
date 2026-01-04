// static/private/js/products/product-create/price-calculator.js

export class PriceCalculator {
  constructor() {
    this.IVA_RATE = 0.19;
  }

  calculateFinalPrice(unitPrice, hasTax, hasExtraTax, extraTaxRate = 0) {
    const basePrice = unitPrice || 0;
    
    let ivaAmount = 0;
    let extraTaxAmount = 0;
    let finalPrice = basePrice;

    if (hasTax) {
      ivaAmount = Math.round(basePrice * this.IVA_RATE);
      finalPrice += ivaAmount;
    }

    if (hasExtraTax && extraTaxRate > 0) {
      const extraRate = extraTaxRate / 100;
      extraTaxAmount = Math.round(basePrice * extraRate);
      finalPrice += extraTaxAmount;
    }

    return {
      basePrice,
      ivaAmount,
      ivaRate: hasTax ? this.IVA_RATE * 100 : 0,
      extraTaxAmount,
      extraTaxRate: hasExtraTax ? extraTaxRate : 0,
      finalPrice,
      hasTax,
      hasExtraTax: hasExtraTax && extraTaxRate > 0
    };
  }

  formatPriceCLP(value) {
    if (!value && value !== 0) return '$0';
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }

  getPriceValue(input) {
    if (!input) return 0;
    return parseInt(input.dataset.rawValue || '0') || 0;
  }

  getPriceDescription(calculation) {
    const parts = [];
    
    if (calculation.hasTax) {
      parts.push(`IVA ${calculation.ivaRate}%`);
    }
    
    if (calculation.hasExtraTax) {
      parts.push(`Imp. ${calculation.extraTaxRate}%`);
    }

    if (parts.length === 0) {
      return 'Sin impuestos';
    }

    return parts.join(' + ');
  }
}