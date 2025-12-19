
import * as LocalAuthentication from 'expo-local-authentication';
import { SecureStorage, AppStorage } from '@/services/storage';
import { SecureStorageKeys, AsyncStorageKeys } from '@/constants/storage';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface StoredCredentials {
  username: string;
  password: string;
}

export const BiometricService = {
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  async getBiometricType(): Promise<BiometricType> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'facial';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'iris';
      }
      
      return 'none';
    } catch {
      return 'none';
    }
  },

  async getBiometricName(): Promise<string> {
    const type = await this.getBiometricType();
    
    switch (type) {
      case 'facial':
        return 'Face ID';
      case 'fingerprint':
        return 'huella digital';
      case 'iris':
        return 'escaneo de iris';
      default:
        return 'biometría';
    }
  },

  async authenticate(promptMessage?: string): Promise<BiometricResult> {
    try {
      const biometricName = await this.getBiometricName();
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Inicia sesión con ${biometricName}`,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        return { success: true };
      }

      switch (result.error) {
        case 'user_cancel':
          return { success: false, error: 'cancelled' };
        case 'user_fallback':
          return { success: false, error: 'fallback' };
        case 'lockout':
          return { success: false, error: 'Demasiados intentos. Intenta más tarde.' };
        default:
          return { success: false, error: 'Error de autenticación' };
      }
    } catch (error) {
      console.error('[Biometric] Error:', error);
      return { success: false, error: 'Error al verificar biometría' };
    }
  },

  async isEnabled(): Promise<boolean> {
    const enabled = await AppStorage.get(AsyncStorageKeys.BIOMETRIC_ENABLED);
    return enabled === 'true';
  },

  async enable(username: string, password: string): Promise<boolean> {
    try {

      const authResult = await this.authenticate(
        'Verifica tu identidad para habilitar inicio rápido'
      );

      if (!authResult.success) {
        return false;
      }

      await SecureStorage.set(SecureStorageKeys.BIOMETRIC_USERNAME, username);
      await SecureStorage.set(SecureStorageKeys.BIOMETRIC_PASSWORD, password);
      await AppStorage.set(AsyncStorageKeys.BIOMETRIC_ENABLED, 'true');
    
      return true;
    } catch (error) {
      console.error('[Biometric] Error enabling:', error);
      return false;
    }
  },

  /**
   * Deshabilita biometría y elimina credenciales
   */
  async disable(): Promise<boolean> {
    try {
      await SecureStorage.remove(SecureStorageKeys.BIOMETRIC_USERNAME);
      await SecureStorage.remove(SecureStorageKeys.BIOMETRIC_PASSWORD);
      await AppStorage.set(AsyncStorageKeys.BIOMETRIC_ENABLED, 'false');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Obtiene las credenciales después de verificar biometría
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const authResult = await this.authenticate();

      if (!authResult.success) {
        return null;
      }

      const username = await SecureStorage.get(SecureStorageKeys.BIOMETRIC_USERNAME);
      const password = await SecureStorage.get(SecureStorageKeys.BIOMETRIC_PASSWORD);

      if (!username || !password) {
        await this.disable();
        return null;
      }

      return { username, password };
    } catch (error) {
      console.error('[Biometric] Error getting credentials:', error);
      return null;
    }
  },

  async hasStoredCredentials(): Promise<boolean> {
    const username = await SecureStorage.get(SecureStorageKeys.BIOMETRIC_USERNAME);
    const password = await SecureStorage.get(SecureStorageKeys.BIOMETRIC_PASSWORD);
    return !!(username && password);
  },
};