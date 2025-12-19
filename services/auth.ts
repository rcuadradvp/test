import api, { setTokens, clearTokens } from '@/services/api';
import { AppStorage } from '@/services/storage';
import { AsyncStorageKeys } from '@/constants/storage';
import { Endpoints } from '@/constants/api';
import { DeviceService } from '@/services/device';
import type {
  User,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  ResetPasswordData,
  ChangePasswordData,
  ApiResponse,
} from '@/types';

const extractUserFromResponse = (data: LoginResponse): User => ({
  userId: data.userId,
  name: data.name,
  email: data.email,
  role: data.role,
  companyId: data.companyId,
  companyName: data.companyName,
  companyActive: data.companyActive,
  paths: data.paths,
  customRole: data.customRole,
});

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        Endpoints.AUTH.LOGIN,
        credentials
      );

      const data = response.data.data;

      if (!data.companyActive) {
        return {
          success: false,
          error: 'La empresa no se encuentra activa',
        };
      }
      await setTokens(data.token, data.refreshToken);
      const user = extractUserFromResponse(data);
      await AppStorage.set(AsyncStorageKeys.USER_DATA, user);
      await AppStorage.set(AsyncStorageKeys.SESSION_ACTIVE, 'true');

      try {
        await DeviceService.syncAuthorizedDevices();
      } catch (syncError) {
        console.warn('[Auth] Error syncing devices after login:', syncError);
      }

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Usuario o contraseña incorrectos';

      return {
        success: false,
        error: message,
      };
    }
  },

  async logout(): Promise<void> {
    await clearTokens();
    await DeviceService.clearAuthorizedDevices();
    await AppStorage.clearAll();
  },

  async register(data: RegisterData): Promise<AuthResult> {
    try {
      await api.post<ApiResponse<void>>(Endpoints.AUTH.REGISTER, data);

      return {
        success: true,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al registrar usuario';

      return {
        success: false,
        error: message,
      };
    }
  },

  async forgotPassword(email: string): Promise<AuthResult> {
    try {
      await api.post<ApiResponse<void>>(Endpoints.AUTH.FORGOT_PASSWORD, { email });

      return {
        success: true,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al solicitar recuperación';

      return {
        success: false,
        error: message,
      };
    }
  },

  async resetPassword(data: ResetPasswordData): Promise<AuthResult> {
    try {
      await api.post<ApiResponse<void>>(Endpoints.AUTH.RESET_PASSWORD, data);

      return {
        success: true,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al restablecer contraseña';

      return {
        success: false,
        error: message,
      };
    }
  },

  async changePassword(data: ChangePasswordData): Promise<AuthResult> {
    try {
      await api.post<ApiResponse<void>>(Endpoints.AUTH.CHANGE_PASSWORD, data);

      return {
        success: true,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Error al cambiar contraseña';

      return {
        success: false,
        error: message,
      };
    }
  },

  async hasActiveSession(): Promise<boolean> {
    try {
      const sessionActive = await AppStorage.get(AsyncStorageKeys.SESSION_ACTIVE);
      const userData = await AppStorage.get(AsyncStorageKeys.USER_DATA);
      
      return sessionActive === 'true' && !!userData;
    } catch (error) {
      console.error('[AuthService] Error checking active session:', error);
      return false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const userDataString = await AppStorage.get(AsyncStorageKeys.USER_DATA);
      
      if (!userDataString) {
        return null;
      }

      const userData: User = JSON.parse(userDataString);
      return userData;
    } catch (error) {
      console.error('[AuthService] Error getting current user:', error);
      return null;
    }
  },
};