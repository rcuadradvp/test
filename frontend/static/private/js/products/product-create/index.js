// static/private/js/products/product-create/index.js

import { initProductPermissions, assertCanCreate } from '../permissions.js';
import { UIHandler } from './ui-handler.js';
import { FormValidator } from './form-validator.js';
import { StateManager } from './state-manager.js';

class ProductCreateApp {
  constructor() {
    this.elements = {
      appContent: document.getElementById('app-content'),
      noPermissionState: document.getElementById('no-permission-state'),
      loadingContainer: document.getElementById('loading-container'),
      container: document.getElementById('container'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      form: document.getElementById('product-form'),
      
      // Botones
      btnBack: document.getElementById('btn-back'),
      btnCancel: document.getElementById('btn-cancel'),
      btnCreate: document.getElementById('btn-create'),
      
      // Displays
      displayDepartment: document.getElementById('display-department'),
      displayCategory: document.getElementById('display-category'),
      displayFinalPrice: document.getElementById('display-final-price'),
      displayTaxInfo: document.getElementById('display-tax-info'),
      
      // Inputs - Información básica
      inputName: document.getElementById('input-name'),
      inputDescription: document.getElementById('input-description'),
      inputBarcode: document.getElementById('input-barcode'),
      inputBarcodePackage: document.getElementById('input-barcode-package'),
      
      // Inputs - Configuración
      inputIsPackage: document.getElementById('input-is-package'),
      inputIsTray: document.getElementById('input-is-tray'),
      inputHasReturnable: document.getElementById('input-has-returnable'),
      inputIsTaxExempt: document.getElementById('input-is-tax-exempt'),
      inputHasExtraTax: document.getElementById('input-has-extra-tax'),
      inputExtraTaxRate: document.getElementById('input-extra-tax-rate'),
      inputIsActive: document.getElementById('input-is-active'),
      
      // Inputs - Inventario
      inputStockUnits: document.getElementById('input-stock-units'),
      inputMinStock: document.getElementById('input-min-stock'),
      inputUnitsPerPackage: document.getElementById('input-units-per-package'),
      inputPackagesPerTray: document.getElementById('input-packages-per-tray'),
      
      // Inputs - Precios
      inputCostPrice: document.getElementById('input-cost-price'),
      inputUnitPrice: document.getElementById('input-unit-price'),
      inputPackagePrice: document.getElementById('input-package-price'),
      inputTrayPrice: document.getElementById('input-tray-price'),
      inputContainerPrice: document.getElementById('input-container-price'),
      
      // Campos condicionales
      fieldUnitsPerPackage: document.getElementById('field-units-per-package'),
      fieldPackagePrice: document.getElementById('field-package-price'),
      fieldPackagesPerTray: document.getElementById('field-packages-per-tray'),
      fieldTrayPrice: document.getElementById('field-tray-price'),
      fieldContainerPrice: document.getElementById('field-container-price'),
      fieldExtraTaxRate: document.getElementById('field-extra-tax-rate'),
      fieldFinalPrice: document.getElementById('field-final-price'),
    };
    this.departmentSlug = this.elements.appContent?.dataset.departmentSlug || null;
    this.categorySlug = this.elements.appContent?.dataset.categorySlug || null;
    this.backUrl = this.elements.appContent?.dataset.backUrl || '/productos/';
    this.departmentId = null;
    this.departmentName = '';
    this.categoryId = null;
    this.categoryName = '';
    this.isSubmitting = false;
    this.stateManager = new StateManager(this.elements);
    this.uiHandler = new UIHandler(this.elements);
    this.validator = new FormValidator(this.elements);
  }

  async init() {
    try {
      const hasPermission = await this.initPermissions();
      if (!hasPermission) {
        this.stateManager.hideInitialSkeleton();
        return;
      }

      await this.loadContextData();
      this.setupUI();
      this.setupEventListeners();
      this.validator.attachNumericValidation();    
      this.uiHandler.setupPriceFormatting();
      this.uiHandler.setupCharCounter();
      this.stateManager.showState('form');
    } catch (error) {
      console.error('[APP] Error during initialization:', error);
      this.stateManager.hideInitialSkeleton();
      this.stateManager.showError('Error al inicializar la aplicación');
    }
  }

  async initPermissions() {
    try {
      const permissions = await initProductPermissions();
      assertCanCreate(permissions);
      return true;
    } catch (error) {
      if (error?.code === 'PERMISSION_DENIED' || error?.message === 'PERMISSION_DENIED') {
        this.stateManager.showState('no-permission');
        return false;
      }
      console.error('[APP] Error checking permissions:', error);
      this.stateManager.showError('No fue posible verificar permisos');
      return false;
    }
  }

  async loadContextData() {
    if (!this.departmentSlug) {
      return;
    }

    try {
      if (this.departmentSlug && this.categorySlug) {
        const response = await window.ProductsAPI.listProductsBySlugs(
          this.departmentSlug, 
          this.categorySlug
        );
        if (response?.department) {
          this.departmentId = response.department.id;
          this.departmentName = response.department.name;
        }
        if (response?.category && response.category.id !== 'no-category') {
          this.categoryId = response.category.id;
          this.categoryName = response.category.name;
        }
      } else if (this.departmentSlug) {
        const response = await window.ProductsAPI.listProductsNoCategoryByDepartment(
          this.departmentSlug
        );
        if (response?.department) {
          this.departmentId = response.department.id;
          this.departmentName = response.department.name;
        }
      }
    } catch (error) {
      console.error('[APP] Error loading context data:', error);
    }
  }

  setupUI() {
    this.uiHandler.displayContext(this.departmentName, this.categoryName);
    this.uiHandler.updateFinalPrice();
  }

  setupEventListeners() {
    this.elements.btnBack?.addEventListener('click', () => this.handleBack());
    this.elements.btnCancel?.addEventListener('click', () => this.handleBack());
    this.elements.btnCreate?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleCreate();
    });

    this.elements.form?.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    this.uiHandler.setupConfigListeners();
  }

  handleBack() {
    const hasData = this.elements.inputName?.value?.trim() || 
                    this.elements.inputBarcode?.value?.trim();
    
    if (hasData) {
      const confirmed = confirm('¿Descartar los cambios sin guardar?');
      if (!confirmed) return;
    }

    window.location.href = this.backUrl;
  }

  async handleCreate() {
    if (this.isSubmitting) return;

    if (!this.validator.validate()) return;

    const data = this.validator.getFormData(this.departmentId, this.categoryId);
    this.isSubmitting = true;
    this.uiHandler.setSubmitting(true);

    try {
      const newProduct = await window.ProductsAPI.createProduct(data);
      MessageHelper?.success(`Producto "${newProduct.name}" creado exitosamente`);

      setTimeout(() => {
        if (newProduct.id) {
          window.location.href = `/productos/detalle/${newProduct.id}/`;
        } else {
          window.location.href = this.backUrl;
        }
      }, 1000);

    } catch (error) {
      console.error('[APP] Error creating product:', error);
      MessageHelper?.error(error.message || 'Error al crear el producto');
      this.isSubmitting = false;
      this.uiHandler.setSubmitting(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ProductCreateApp();
  app.init();
});