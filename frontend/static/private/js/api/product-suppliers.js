// static/private/js/api/product-suppliers.js

const ProductSuppliersAPI = {

  async createProductSuppliers(productId, supplierIds) {
    try {
      if (!productId || !Array.isArray(supplierIds) || supplierIds.length === 0) {
        throw new Error('Se requiere el ID del producto y al menos un proveedor');
      }

      const payload = {
        product: [productId],
        supplier: supplierIds
      };

      console.log('[ProductSuppliersAPI] Creating product-suppliers with payload:', payload);
      return await APIHelper.post('/api/product-suppliers/create/', payload);
    } catch (error) {
      console.error('[ProductSuppliersAPI] Error creating product-suppliers:', error);
      throw new Error(error.message || 'Error al asociar proveedores');
    }
  },

  async deleteProductSuppliers(productId, supplierIds) {
    try {
      if (!productId || !Array.isArray(supplierIds) || supplierIds.length === 0) {
        throw new Error('Se requiere el ID del producto y al menos un proveedor');
      }

      const payload = {
        product: [productId],
        supplier: supplierIds
      };

      console.log('[ProductSuppliersAPI] Deleting product-suppliers with payload:', payload);
      
      // Usar fetch directamente porque DELETE necesita enviar body
      const response = await fetch('/api/product-suppliers/by-product-supplier/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': APIHelper.getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Error al desasociar proveedores');
      }

      return await response.json().catch(() => ({}));
    } catch (error) {
      console.error('[ProductSuppliersAPI] Error deleting product-suppliers:', error);
      throw new Error(error.message || 'Error al desasociar proveedores');
    }
  }

};

// Exponer globalmente
window.ProductSuppliersAPI = ProductSuppliersAPI;