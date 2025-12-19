// static/private/js/api/products.js

const ProductsAPI = {

  async listDepartments() {
    try {
      const data = await APIHelper.get('/api/departments/');
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing departments:', error);
      throw new Error(error.message || 'Error al obtener departamentos');
    }
  },

  async createDepartment(data) {
    try {
      if (!data.name || data.name.trim().length < 3) {
        throw new Error('El nombre del departamento debe tener al menos 3 caracteres');
      }
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || ''
      };
      return await APIHelper.post('/api/departments/create/', payload);
    } catch (error) {
      console.error('[ProductsAPI] Error creating department:', error);
      throw new Error(error.message || 'Error al crear departamento');
    }
  },

  async updateDepartment(id, data) {
    try {
      const payload = {
        name: data.name?.trim(),
        description: data.description?.trim() || ''
      };

      return await APIHelper.put(`/api/departments/${id}/update/`, payload);
    } catch (error) {
      console.error('[ProductsAPI] Error updating department:', error);
      throw new Error(error.message || 'Error al actualizar departamento');
    }
  },

  async deleteDepartment(id) {
    try {
      return await APIHelper.delete(`/api/departments/${id}/delete/`);
    } catch (error) {
      console.error('[ProductsAPI] Error deleting department:', error);
      throw new Error(error.message || 'Error al eliminar departamento');
    }
  },

  async exportDepartments(format = 'csv') {
    try {
      const response = await fetch(`/api/departments/export/?format=${format}`, {
        method: 'GET',
        headers: {
          'X-CSRFToken': APIHelper.getCSRFToken()
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      return await response.blob();
    } catch (error) {
      console.error('[ProductsAPI] Error exporting departments:', error);
      throw new Error(error.message || 'Error al exportar departamentos');
    }
  },

  async listCategoriesBySlug(department_slug) {
    try {
      const data = await APIHelper.get(`/api/products/${department_slug}/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing categories by slug:', error);
      throw new Error(error.message || 'Error al obtener categorías por departamento');
    }
  },

  async listProductsBySlugs(department_slug, categories_slug) {
    try {
      const data = await APIHelper.get(`/api/products/${department_slug}/${categories_slug}/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing products by slugs:', error);
      throw new Error(error.message || 'Error al obtener productos');
    }
  },

  async getProductDetail(productId) {
    try {
      const data = await APIHelper.get(`/api/products/${productId}/`);
      return data;
    } catch (error) {
      console.error('[ProductsAPI] Error getting product detail:', error);
      throw new Error(error.message || 'Error al obtener el detalle del producto');
    }
  },

  async updateProduct(productId, data) {
    try {
      return await APIHelper.put(`/api/products/${productId}/update/`, data);
    } catch (error) {
      console.error('[ProductsAPI] Error updating product:', error);
      throw new Error(error.message || 'Error al actualizar el producto');
    }
  },

  async deleteProduct(productId) {
    try {
      return await APIHelper.delete(`/api/products/${productId}/delete/`);
    } catch (error) {
      console.error('[ProductsAPI] Error deleting product:', error);
      throw new Error(error.message || 'Error al eliminar el producto');
    }
  },

  async listProductsNoAssociated() {
    try {
      const data = await APIHelper.get('/api/products/no-asociados/');
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing unassociated products:', error);
      throw new Error(error.message || 'Error al obtener productos no asociados');
    }
  },

  async listProductsNoCategoryByDepartment(departmentSlug) {
    try {
      const data = await APIHelper.get(`/api/products/${departmentSlug}/no-category/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing no-category products:', error);
      throw new Error(error.message || 'Error al obtener productos sin categoría');
    }
  },

  async bulkUpdateProducts(productIds, departmentId, categoryId) {
    try {
      const payload = {
        products: productIds,
        department: departmentId || null,
        category: categoryId || null
      };
      console.log('[ProductsAPI] Bulk update payload:', payload);
      return await APIHelper.put('/api/products/bulk-update/', payload);
    } catch (error) {
      console.error('[ProductsAPI] Error bulk updating products:', error);
      throw new Error(error.message || 'Error al transferir productos');
    }
  },

  async createProduct(data) {
    try {
      // Validaciones básicas
      if (!data.name || data.name.trim().length < 3) {
        throw new Error('El nombre del producto debe tener al menos 3 caracteres');
      }
      if (!data.barcode || data.barcode.trim().length < 3) {
        throw new Error('El código de barras es requerido');
      }

      const payload = {
        barcode: data.barcode?.trim() || '',
        barcode_package: data.barcode_package?.trim() || null,
        name: data.name?.trim() || '',
        description: data.description?.trim() || '',
        stock_units: parseInt(data.stock_units) || 0,
        min_stock: parseInt(data.min_stock) || 0,
        is_package: data.is_package || false,
        units_per_package: data.is_package ? (parseInt(data.units_per_package) || null) : null,
        is_tray: data.is_tray || false,
        packages_per_tray: data.is_tray ? (parseInt(data.packages_per_tray) || null) : null,
        unit_price: parseInt(data.unit_price) || 0,
        package_price: data.is_package ? (parseInt(data.package_price) || null) : null,
        tray_price: data.is_tray ? (parseInt(data.tray_price) || null) : null,
        cost_price: parseInt(data.cost_price) || null,
        has_returnable_container: data.has_returnable_container || false,
        container_price: data.has_returnable_container ? (parseInt(data.container_price) || null) : null,
        is_tax_exempt: data.is_tax_exempt || false,
        variable_tax_rate: data.variable_tax_rate || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        department: data.department || null,
        category: data.category || null,
      };

      console.log('[ProductsAPI] Creating product with payload:', payload);

      return await APIHelper.post('/api/products/create/', payload);
    } catch (error) {
      console.error('[ProductsAPI] Error creating product:', error);
      throw new Error(error.message || 'Error al crear el producto');
    }
  },

};

window.ProductsAPI = ProductsAPI;