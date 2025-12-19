export const MINEW_MANUFACTURER_ID = 0xffe1;

export const MinewFrameType = {
  INFO: 0xa1,
  IBEACON: 0xa7,
  TEMPERATURE_HUMIDITY: 0xa1,
  ACCELERATION: 0xa2,
  BATTERY: 0xa8,
  DEVICE_INFO: 0xa0,
} as const;

export const BLE_SCAN_CONFIG = {
  SCAN_DURATION_MS: null,
  ALLOW_DUPLICATES: true,
  MIN_REPORT_INTERVAL_MS: 1000,
} as const;

export const BleScannerState = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

export type BleScannerStateType = (typeof BleScannerState)[keyof typeof BleScannerState];