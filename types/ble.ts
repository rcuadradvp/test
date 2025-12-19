import type { BleScannerStateType } from '@/constants/ble';

export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number;
  manufacturerData: string | null;
  txPowerLevel: number | null;
  isConnectable: boolean | null;
  lastSeen: number;
}

export interface MinewBeacon {
  name: string;
  battery: number;
  mac: string;
  rssi: number;
  frameType: number;
  productModel: number;
  batteryLevel: number | null;
  temperature: number | null;
  humidity: number | null;
  accelerometer: {
    x: number;
    y: number;
    z: number;
  } | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  rawData: string;
  timestamp: number;
  authorizedName?: string;
  isAuthorized?: boolean;
}

export interface BleScannerStatus {
  state: BleScannerStateType;
  isScanning: boolean;
  error: string | null;
  devicesCount: number;
  lastUpdate: number | null;
}

export interface BlePermissions {
  bluetooth: boolean;
  bluetoothScan: boolean;
  bluetoothConnect: boolean;
  location: boolean;
  allGranted: boolean;
}

export interface BleReading {
  mac: string;
  rssi: number;
  raw: string;
  lat: number | null;
  lon: number | null;
  timestamp: number;
  parsed: MinewBeacon | null;
}

export type OnDeviceFoundCallback = (device: BleDevice) => void;
export type OnBeaconFoundCallback = (beacon: MinewBeacon) => void;
export type OnErrorCallback = (error: string) => void;