/**
 * Constantes para las keys del almacenamiento
 * Centralizar aquí evita errores de tipeo y facilita el mantenimiento
 */
export const STORAGE_KEYS = {
  // Autenticación
  SESSION_KEY: 'SESSION_ACTIVE',
  TOKEN_KEY: 'token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_DATA_KEY: 'user_data',
  TOKEN_EXPIRY_KEY: 'token_expiry',
  
  // Preferencias de usuario
  THEME_KEY: 'theme_preference',
  LANGUAGE_KEY: 'language_preference',
  
  // Onboarding
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];