// static/private/js/api/clients.js

const ClientsAPI = {

  async listClients() {
    try {
      const data = await APIHelper.get('/api/clients/');
      return data || [];
    } catch (error) {
      console.error('[ClientsAPI] Error listing clients:', error);
      throw new Error(error.message || 'Error al obtener clientes');
    }
  },

  async createClient(data) {
    try {
      if (!data.first_name || data.first_name.trim().length < 2) {
        throw new Error('El nombre del cliente debe tener al menos 2 caracteres');
      }
      if (!data.last_name || data.last_name.trim().length < 2) {
        throw new Error('El apellido del cliente debe tener al menos 2 caracteres');
      }
      
      const payload = {
        first_name: data.first_name?.trim() || '',
        last_name: data.last_name?.trim() || '',
        rut: data.rut?.trim() || '',
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        credit_limit: parseInt(data.credit_limit) || 0
      };
      
      return await APIHelper.post('/api/clients/create/', payload);
    } catch (error) {
      console.error('[ClientsAPI] Error creating client:', error);
      throw new Error(error.message || 'Error al crear cliente');
    }
  },

  async getClient(clientId) {
    try {
      const data = await APIHelper.get(`/api/clients/${clientId}/`);
      return data;
    } catch (error) {
      console.error('[ClientsAPI] Error getting client:', error);
      throw new Error(error.message || 'Error al obtener el cliente');
    }
  },

  async updateClient(clientId, data) {
    try {
      const payload = {
        first_name: data.first_name?.trim() || '',
        last_name: data.last_name?.trim() || '',
        rut: data.rut?.trim() || '',
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        credit_limit: parseInt(data.credit_limit) || 0
      };

      return await APIHelper.put(`/api/clients/${clientId}/update/`, payload);
    } catch (error) {
      console.error('[ClientsAPI] Error updating client:', error);
      throw new Error(error.message || 'Error al actualizar cliente');
    }
  },

  async deleteClient(clientId) {
    try {
      return await APIHelper.delete(`/api/clients/${clientId}/delete/`);
    } catch (error) {
      console.error('[ClientsAPI] Error deleting client:', error);
      throw new Error(error.message || 'Error al desactivar cliente');
    }
  }
};

// Exponer globalmente
window.ClientsAPI = ClientsAPI;