import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorageKeys, AsyncStorageKeys } from '@/constants/storage';
import type { SecureStorageKey, AsyncStorageKey } from '@/constants/storage';

export const SecureStorage = {
  async set(key: SecureStorageKey, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error(`[SecureStorage] Error saving ${key}:`, error);
      return false;
    }
  },

  async get(key: SecureStorageKey): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error reading ${key}:`, error);
      return null;
    }
  },

  async remove(key: SecureStorageKey): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`[SecureStorage] Error removing ${key}:`, error);
      return false;
    }
  },

  async clearTokens(): Promise<boolean> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(SecureStorageKeys.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(SecureStorageKeys.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(SecureStorageKeys.TOKEN_EXPIRY),
      ]);
      return true;
    } catch (error) {
      console.error('[SecureStorage] Error clearing tokens:', error);
      return false;
    }
  },

  async clearAll(): Promise<boolean> {
    try {
      const keys = Object.values(SecureStorageKeys);
      await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
      return true;
    } catch (error) {
      console.error('[SecureStorage] Error clearing all:', error);
      return false;
    }
  },
};

export const AppStorage = {
  async set<T>(key: AsyncStorageKey, value: T): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`[AppStorage] Error saving ${key}:`, error);
      return false;
    }
  },

  async get(key: AsyncStorageKey): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[AppStorage] Error reading ${key}:`, error);
      return null;
    }
  },

  async getJSON<T>(key: AsyncStorageKey): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[AppStorage] Error parsing ${key}:`, error);
      return null;
    }
  },

  async remove(key: AsyncStorageKey): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[AppStorage] Error removing ${key}:`, error);
      return false;
    }
  },

  async clearAll(): Promise<boolean> {
    try {
      const keys = Object.values(AsyncStorageKeys);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('[AppStorage] Error clearing all:', error);
      return false;
    }
  },
};

export const clearAllStorage = async (): Promise<boolean> => {
  const [secureResult, appResult] = await Promise.all([
    SecureStorage.clearAll(),
    AppStorage.clearAll(),
  ]);
  return secureResult && appResult;
};