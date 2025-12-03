import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Sistema de almacenamiento multiplataforma
 * - Web: Usa localStorage
 * - iOS/Android: Usa expo-secure-store (encriptado)
 */
class SecureStorage {
  /**
   * Guarda un valor de forma segura
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene un valor almacenado
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Elimina un valor almacenado
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  /**
   * Elimina múltiples valores de una vez
   */
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw error;
    }
  }
}

export const storage = new SecureStorage();