import axios from 'axios';
import { BASE_URL } from '@/config/api.config';
import { storage } from '@/services/storage/SecureStorage';
import { STORAGE_KEYS } from '@/constants/storage';

/**
 * Instancia de Axios configurada con interceptores
 * - Agrega automáticamente el token de autenticación
 * - Maneja errores de forma centralizada
 */
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de Request: Agrega el token automáticamente
 */
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(STORAGE_KEYS.TOKEN_KEY);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Response: Maneja errores comunes
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 (Unauthorized) y no es un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar refrescar el token
        const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          const response = await axios.post(
            `${BASE_URL}/refresh-token`,
            {},
            {
              headers: {
                'Refresh-Token': refreshToken,
              },
            }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          // Guardar nuevos tokens
          await storage.setItem(STORAGE_KEYS.TOKEN_KEY, accessToken);
          await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN_KEY, newRefreshToken);

          // Reintentar request original con nuevo token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Si falla el refresh, limpiar sesión
        await storage.removeMultiple([
          STORAGE_KEYS.SESSION_KEY,
          STORAGE_KEYS.TOKEN_KEY,
          STORAGE_KEYS.REFRESH_TOKEN_KEY,
          STORAGE_KEYS.USER_DATA_KEY,
          STORAGE_KEYS.TOKEN_EXPIRY_KEY,
        ]);
        
        // Opcionalmente: redirigir al login
        // En React Native, puedes usar navegación aquí
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
