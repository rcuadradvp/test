// static/private/js/api/suppliers.js

const SuppliersAPI = {

  async listSuppliers() {
    try {
      const data = await APIHelper.get('/api/suppliers/');
      return data || [];
    } catch (error) {
      console.error('[SuppliersAPI] Error listing suppliers:', error);
      throw new Error(error.message || 'Error al obtener proveedores');
    }
  },

  async createSupplier(data) {
    try {
      if (!data.name || data.name.trim().length < 3) {
        throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');
      }
      
      const payload = {
        name: data.name?.trim() || '',
        rut: data.rut?.trim() || '',
        representative: data.representative?.trim() || '',
        phone_1: data.phone_1?.trim() || '',
        phone_2: data.phone_2?.trim() || '',
        email_1: data.email_1?.trim() || '',
        email_2: data.email_2?.trim() || '',
        website: data.website?.trim() || '',
        address: data.address?.trim() || ''
      };
      
      return await APIHelper.post('/api/suppliers/create/', payload);
    } catch (error) {
      console.error('[SuppliersAPI] Error creating supplier:', error);
      throw new Error(error.message || 'Error al crear proveedor');
    }
  },

  async getSupplier(supplierId) {
    try {
      const data = await APIHelper.get(`/api/suppliers/${supplierId}/`);
      return data;
    } catch (error) {
      console.error('[SuppliersAPI] Error getting supplier:', error);
      throw new Error(error.message || 'Error al obtener el proveedor');
    }
  },

  async updateSupplier(supplierId, data) {
    try {
      const payload = {
        name: data.name?.trim() || '',
        rut: data.rut?.trim() || '',
        representative: data.representative?.trim() || '',
        phone_1: data.phone_1?.trim() || '',
        phone_2: data.phone_2?.trim() || '',
        email_1: data.email_1?.trim() || '',
        email_2: data.email_2?.trim() || '',
        website: data.website?.trim() || '',
        address: data.address?.trim() || ''
      };

      return await APIHelper.put(`/api/suppliers/${supplierId}/update/`, payload);
    } catch (error) {
      console.error('[SuppliersAPI] Error updating supplier:', error);
      throw new Error(error.message || 'Error al actualizar proveedor');
    }
  },

  async deleteSupplier(supplierId) {
    try {
      return await APIHelper.delete(`/api/suppliers/${supplierId}/delete/`);
    } catch (error) {
      console.error('[SuppliersAPI] Error deleting supplier:', error);
      throw new Error(error.message || 'Error al desactivar proveedor');
    }
  }
};

// Exponer globalmente
window.SuppliersAPI = SuppliersAPI;