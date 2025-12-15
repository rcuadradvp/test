// static/private/js/products/product-detail/ui-renderer.js

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

    // Actualizar título de la página
    this.updatePageTitle(product);
    
    // Renderizar información básica
    this.renderBasicInfo(product);
    
    // Renderizar información de inventario
    this.renderInventoryInfo(product);
    
    // Renderizar información de precios
    this.renderPricingInfo(product);
    
    // Renderizar información adicional
    this.renderAdditionalInfo(product);
    
    // Renderizar estado y fechas
    this.renderStatusInfo(product);
    
    this.refreshIcons();
  }

  updatePageTitle(product) {
    const titleElement = document.getElementById('product-title');
    const barcodeElement = document.getElementById('product-barcode-header');
    
    if (titleElement) {
      titleElement.textContent = product.name || 'Sin nombre';
    }
    if (barcodeElement) {
      barcodeElement.textContent = product.barcode || 'Sin código';
    }
  }

  renderBasicInfo(product) {
    // Nombre
    this.setElementText('detail-name', product.name || '-');
    
    // Descripción
    const descElement = document.getElementById('detail-description');
    if (descElement) {
      descElement.textContent = product.description || 'Sin descripción';
      if (!product.description) {
        descElement.classList.add('text-base-content/50', 'italic');
      } else {
        descElement.classList.remove('text-base-content/50', 'italic');
      }
    }
    
    // Código de barras
    this.setElementText('detail-barcode', product.barcode || '-');
    this.setElementText('detail-barcode-package', product.barcode_package || '-');
    
    // Departamento
    this.setElementText('detail-department', product.department_name || 'Sin departamento');
  }

  renderInventoryInfo(product) {
    // Stock
    this.setElementText('detail-stock-units', product.stock_units || '0');
    this.setElementText('detail-stock-display', product.stock_display || '0');
    this.setElementText('detail-min-stock', product.min_stock || '0');
    
    // Indicador de stock bajo
    const stockIndicator = document.getElementById('stock-indicator');
    if (stockIndicator) {
      const currentStock = parseInt(product.stock_units) || 0;
      const minStock = parseInt(product.min_stock) || 0;
      
      if (currentStock <= 0) {
        stockIndicator.className = 'badge badge-error';
        stockIndicator.textContent = 'Sin stock';
      } else if (currentStock <= minStock) {
        stockIndicator.className = 'badge badge-warning';
        stockIndicator.textContent = 'Stock bajo';
      } else {
        stockIndicator.className = 'badge badge-success';
        stockIndicator.textContent = 'En stock';
      }
    }
    
    // Información de empaque
    const packageSection = document.getElementById('package-section');
    if (packageSection) {
      if (product.is_package) {
        packageSection.classList.remove('hidden');
        this.setElementText('detail-units-per-package', product.units_per_package || '-');
        this.setElementText('detail-packages-per-tray', product.packages_per_tray || '-');
      } else {
        packageSection.classList.add('hidden');
      }
    }
  }

  renderPricingInfo(product) {
    // Precio unitario
    this.setElementText('detail-unit-price', this.formatPrice(product.unit_price));
    
    // Precio con IVA
    this.setElementText('detail-price-iva', this.formatPrice(product.price_with_iva));
    
    // Precios de empaque (si aplica)
    const packagePricesSection = document.getElementById('package-prices-section');
    if (packagePricesSection) {
      if (product.is_package) {
        packagePricesSection.classList.remove('hidden');
        this.setElementText('detail-package-price', this.formatPrice(product.package_price));
        this.setElementText('detail-tray-price', this.formatPrice(product.tray_price));
        this.setElementText('detail-calculated-price-package', this.formatPrice(product.calculated_price_package));
      } else {
        packagePricesSection.classList.add('hidden');
      }
    }
    
    // Exento de IVA
    const taxExemptBadge = document.getElementById('tax-exempt-badge');
    if (taxExemptBadge) {
      if (product.is_tax_exempt) {
        taxExemptBadge.classList.remove('hidden');
        taxExemptBadge.textContent = 'Exento de IVA';
      } else {
        taxExemptBadge.classList.add('hidden');
      }
    }
  }

  renderAdditionalInfo(product) {
    // Envase retornable
    const returnableContainer = document.getElementById('detail-returnable');
    if (returnableContainer) {
      returnableContainer.textContent = product.has_returnable_container ? 'Sí' : 'No';
    }
    
    // Proveedores
    const suppliersContainer = document.getElementById('detail-suppliers');
    if (suppliersContainer) {
      if (product.suppliers && product.suppliers.length > 0) {
        suppliersContainer.innerHTML = product.suppliers.map(s => 
          `<span class="badge badge-outline badge-sm">${this.escape(s)}</span>`
        ).join(' ');
      } else {
        suppliersContainer.innerHTML = '<span class="text-base-content/50 italic">Sin proveedores asignados</span>';
      }
    }
  }

  renderStatusInfo(product) {
    // Estado activo/inactivo
    const statusBadge = document.getElementById('status-badge');
    if (statusBadge) {
      if (product.is_active) {
        statusBadge.className = 'badge badge-success gap-1';
        statusBadge.innerHTML = '<i data-lucide="check-circle" class="w-3 h-3"></i> Activo';
      } else {
        statusBadge.className = 'badge badge-error gap-1';
        statusBadge.innerHTML = '<i data-lucide="x-circle" class="w-3 h-3"></i> Inactivo';
      }
    }
    
    // Fechas
    this.setElementText('detail-created-at', this.formatDate(product.created_at));
    this.setElementText('detail-updated-at', this.formatDate(product.updated_at));
  }

  updateActionButtons(permissions) {
    const { btnEdit, btnDelete } = this.elements;
    
    if (btnEdit) {
      if (permissions.canEdit) {
        btnEdit.classList.remove('hidden');
      } else {
        btnEdit.classList.add('hidden');
      }
    }
    
    if (btnDelete) {
      if (permissions.canDelete) {
        btnDelete.classList.remove('hidden');
      } else {
        btnDelete.classList.add('hidden');
      }
    }
  }

  setElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  setErrorMessage(message) {
    const { errorMessage } = this.elements;
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  formatPrice(price) {
    if (!price && price !== 0) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  refreshIcons() {
    window.lucide?.createIcons?.();
  }
}