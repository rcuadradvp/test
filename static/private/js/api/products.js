// static/private/js/api/products.js


const ProductsAPI = {

  // Departamentos
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

  // Categorias
  async listCategoriesBySlug(department_slug) {
    try {
      const data = await APIHelper.get(`/api/products/${department_slug}/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing categories by slug:', error);
      throw new Error(error.message || 'Error al obtener categorías por departamento');
    }
  },

  // Productos
  async listProductsBySlugs(department_slug, categories_slug) {
    try {
      const data = await APIHelper.get(`/api/products/${department_slug}/${categories_slug}/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing products by slugs:', error);
      throw new Error(error.message || 'Error al obtener productos');
    }
  },

  /**
   * Obtiene el detalle de un producto por su UUID
   * @param {string} productId - UUID del producto
   * @returns {Promise<Object>} - Datos del producto
   */
  async getProductDetail(productId) {
    try {
      const data = await APIHelper.get(`/api/products/${productId}/`);
      return data;
    } catch (error) {
      console.error('[ProductsAPI] Error getting product detail:', error);
      throw new Error(error.message || 'Error al obtener el detalle del producto');
    }
  },

  /**
   * Actualiza un producto
   * @param {string} productId - UUID del producto
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>} - Producto actualizado
   */
  async updateProduct(productId, data) {
    try {
      return await APIHelper.put(`/api/products/${productId}/update/`, data);
    } catch (error) {
      console.error('[ProductsAPI] Error updating product:', error);
      throw new Error(error.message || 'Error al actualizar el producto');
    }
  },

  /**
   * Elimina un producto
   * @param {string} productId - UUID del producto
   * @returns {Promise<Object>} - Respuesta de eliminación
   */
  async deleteProduct(productId) {
    try {
      return await APIHelper.delete(`/api/products/${productId}/delete/`);
    } catch (error) {
      console.error('[ProductsAPI] Error deleting product:', error);
      throw new Error(error.message || 'Error al eliminar el producto');
    }
  },

  /**
   * Lista productos no asociados a ningún departamento
   * @returns {Promise<Object>} - Respuesta con productos
   */
  async listProductsNoAssociated() {
    try {
      const data = await APIHelper.get('/api/products/no-asociados/');
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing unassociated products:', error);
      throw new Error(error.message || 'Error al obtener productos no asociados');
    }
  },

  /**
   * Lista productos sin categoría de un departamento específico
   * @param {string} departmentSlug - Slug del departamento
   * @returns {Promise<Object>} - Respuesta con productos
   */
  async listProductsNoCategoryByDepartment(departmentSlug) {
    try {
      const data = await APIHelper.get(`/api/products/${departmentSlug}/no-category/`);
      return data || [];
    } catch (error) {
      console.error('[ProductsAPI] Error listing no-category products:', error);
      throw new Error(error.message || 'Error al obtener productos sin categoría');
    }
  },

  // Transferencia masiva de productos
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

};

window.ProductsAPI = ProductsAPI;