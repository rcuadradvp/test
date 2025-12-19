import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { BASE_URL, ApiTimeouts, DefaultHeaders, Endpoints } from '@/constants/api';
import { SecureStorageKeys } from '@/constants/storage';
import { SecureStorage } from '@/services/storage';
import { isTokenExpiringSoon } from '@/utils/jwt';
import type { ApiResponse, RefreshTokenResponse } from '@/types';

const PUBLIC_ENDPOINTS = [
  Endpoints.AUTH.LOGIN,
  Endpoints.AUTH.REGISTER,
  Endpoints.AUTH.FORGOT_PASSWORD,
  Endpoints.AUTH.RESET_PASSWORD,
  Endpoints.AUTH.ACTIVATE,
];

const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  refreshQueue = [];
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: ApiTimeouts.DEFAULT,
  headers: DefaultHeaders,
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicEndpoint(config.url)) {
      return config;
    }
    if (!accessToken) {
      accessToken = await SecureStorage.get(SecureStorageKeys.ACCESS_TOKEN);
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (isPublicEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      if (!refreshToken) {
        refreshToken = await SecureStorage.get(SecureStorageKeys.REFRESH_TOKEN);
      }

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
        `${BASE_URL}${Endpoints.AUTH.REFRESH}`,
        {},
        {
          headers: {
            'Refresh-Token': refreshToken,
          },
        }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        response.data.data;

      accessToken = newAccessToken;
      refreshToken = newRefreshToken;

      await Promise.all([
        SecureStorage.set(SecureStorageKeys.ACCESS_TOKEN, newAccessToken),
        SecureStorage.set(SecureStorageKeys.REFRESH_TOKEN, newRefreshToken),
      ]);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {

      processQueue(refreshError as Error);
      await clearTokens();

      tokenEventEmitter.emit('onTokenExpired');

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

type TokenEventCallback = () => void;
const tokenEventEmitter = {
  listeners: new Set<TokenEventCallback>(),

  emit(event: 'onTokenExpired') {
    if (event === 'onTokenExpired') {
      this.listeners.forEach((callback) => callback());
    }
  },

  subscribe(callback: TokenEventCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
};

export const initializeTokens = async (): Promise<boolean> => {
  const [storedAccess, storedRefresh] = await Promise.all([
    SecureStorage.get(SecureStorageKeys.ACCESS_TOKEN),
    SecureStorage.get(SecureStorageKeys.REFRESH_TOKEN),
  ]);

  accessToken = storedAccess;
  refreshToken = storedRefresh;

  return !!(accessToken && refreshToken);
};

export const setTokens = async (
  newAccessToken: string,
  newRefreshToken: string
): Promise<void> => {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;

  await Promise.all([
    SecureStorage.set(SecureStorageKeys.ACCESS_TOKEN, newAccessToken),
    SecureStorage.set(SecureStorageKeys.REFRESH_TOKEN, newRefreshToken),
  ]);
};

export const clearTokens = async (): Promise<void> => {
  accessToken = null;
  refreshToken = null;

  await Promise.all([
    SecureStorage.remove(SecureStorageKeys.ACCESS_TOKEN),
    SecureStorage.remove(SecureStorageKeys.REFRESH_TOKEN),
    SecureStorage.remove(SecureStorageKeys.TOKEN_EXPIRY),
  ]);
};

export const getAccessToken = (): string | null => accessToken;

export const shouldRefreshToken = (): boolean => {
  if (!accessToken) return false;
  return isTokenExpiringSoon(accessToken, 5 * 60 * 1000);
};

export const onTokenExpired = (callback: TokenEventCallback) => {
  return tokenEventEmitter.subscribe(callback);
};

export default api;