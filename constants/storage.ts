export const SecureStorageKeys = {
  ACCESS_TOKEN: 'secure_access_token',
  REFRESH_TOKEN: 'secure_refresh_token',
  TOKEN_EXPIRY: 'secure_token_expiry',
  BIOMETRIC_USERNAME: 'secure_biometric_username',
  BIOMETRIC_PASSWORD: 'secure_biometric_password',
} as const;

export const AsyncStorageKeys = {
  USER_DATA: 'user_data',
  SESSION_ACTIVE: 'session_active',
  THEME_MODE: 'theme_mode',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  AUTHORIZED_DEVICES_MAP: 'authorized_devices_map',
  LAST_DEVICE_SYNC: 'last_device_sync',
} as const;

export type SecureStorageKey = typeof SecureStorageKeys[keyof typeof SecureStorageKeys];
export type AsyncStorageKey = typeof AsyncStorageKeys[keyof typeof AsyncStorageKeys];