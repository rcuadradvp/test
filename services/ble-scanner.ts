import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { BlePermissionsService } from './ble-permissions';
import { isMinewBeacon, parseMinewBeacon, b64ToHex } from './minew-parser';
import { DeviceService } from './device';
import { BleScannerState } from '@/constants/ble';
import type {
  BleDevice,
  MinewBeacon,
  BleScannerStatus,
  OnDeviceFoundCallback,
  OnBeaconFoundCallback,
  OnErrorCallback,
  AuthorizedDevicesMap,
} from '@/types';

export class BleScanner {
  private static instance: BleScanner | null = null;
  private manager: BleManager | null = null;
  private state: BleScannerStatus['state'] = BleScannerState.IDLE;
  private isScanning = false;
  private error: string | null = null;
  private lastUpdate: number | null = null;
  private devices: Map<string, BleDevice> = new Map();
  private beacons: Map<string, MinewBeacon> = new Map();
  private authorizedDevicesMap: AuthorizedDevicesMap = {};
  private onDeviceFound: OnDeviceFoundCallback | null = null;
  private onBeaconFound: OnBeaconFoundCallback | null = null;
  private onError: OnErrorCallback | null = null;
  private onStateChange: ((status: BleScannerStatus) => void) | null = null;
  private lastReportTime: Map<string, number> = new Map();
  private readonly REPORT_INTERVAL = 5000;
  private constructor() {
    this.initializeManager();
    this.loadAuthorizedDevices();
  }

  static getInstance(): BleScanner {
    if (!BleScanner.instance) {
      BleScanner.instance = new BleScanner();
    }
    return BleScanner.instance;
  }

  private async loadAuthorizedDevices(): Promise<void> {
    try {
      const devicesMap = await DeviceService.getAuthorizedDevicesMap();
      this.authorizedDevicesMap = devicesMap || {};
      const deviceCount = Object.keys(this.authorizedDevicesMap).length;
      console.log('[BleScanner] Loaded authorized devices:', deviceCount);
    } catch (error) {
      console.error('[BleScanner] Error loading authorized devices:', error);
      this.authorizedDevicesMap = {};
    }
  }

  async reloadAuthorizedDevices(): Promise<void> {
    console.log('[BleScanner] Reloading authorized devices...');
    await this.loadAuthorizedDevices();
  }

  private initializeManager(): void {
    this.manager = new BleManager();
    this.setupStateListener();
  }

  private getManager(): BleManager {
    if (!this.manager) {
      this.initializeManager();
    }
    return this.manager!;
  }

  private setupStateListener(): void {
    const manager = this.getManager();

    manager.onStateChange((state) => {
      console.log('[BleScanner] Bluetooth state:', state);

      if (state === State.PoweredOff) {
        this.handleError('Bluetooth está apagado. Por favor, enciéndelo.');
        this.stopScan();
      } else if (state === State.Unauthorized) {
        this.handleError('No hay permisos para usar Bluetooth.');
      } else if (state === State.PoweredOn && this.state === BleScannerState.ERROR) {
        this.error = null;
        this.updateState(BleScannerState.IDLE);
      }
    }, true);
  }

  private updateState(newState: BleScannerStatus['state']): void {
    this.state = newState;
    this.lastUpdate = Date.now();
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getStatus());
    }
  }

  private handleError(message: string): void {
    console.error('[BleScanner] Error:', message);
    this.error = message;
    this.updateState(BleScannerState.ERROR);

    if (this.onError) {
      this.onError(message);
    }
  }

  private handleDevice = (error: BleError | null, device: Device | null): void => {
    if (error) {
      console.warn('[BleScanner] Scan error:', error);
      return;
    }

    if (!device) return;

    const manufacturerDataB64 = device.manufacturerData;
    const manufacturerDataHex = b64ToHex(manufacturerDataB64);

    if (isMinewBeacon(manufacturerDataHex)) {
      const beacon = parseMinewBeacon(device.id, device.rssi ?? 0, manufacturerDataHex);

      if (beacon) {
        const authorizedName = this.authorizedDevicesMap[beacon.mac];

        if (!authorizedName) {
          return;
        }

        beacon.authorizedName = authorizedName;
        beacon.isAuthorized = true;

        const lastReport = this.lastReportTime.get(beacon.mac) || 0;
        const now = Date.now();

        if (now - lastReport >= this.REPORT_INTERVAL) {
          this.beacons.set(beacon.mac, beacon);
          this.lastReportTime.set(beacon.mac, now);

          if (this.onBeaconFound) {
            this.onBeaconFound(beacon);
          }
        } else {
          this.beacons.set(beacon.mac, beacon);
        }
      }
    }

    const bleDevice: BleDevice = {
      id: device.id,
      name: device.name,
      rssi: device.rssi ?? 0,
      manufacturerData: manufacturerDataHex,
      txPowerLevel: device.txPowerLevel,
      isConnectable: device.isConnectable,
      lastSeen: Date.now(),
    };

    this.devices.set(device.id, bleDevice);

    if (this.onDeviceFound) {
      this.onDeviceFound(bleDevice);
    }
  };

  getStatus(): BleScannerStatus {
    return {
      state: this.state,
      isScanning: this.isScanning,
      error: this.error,
      devicesCount: this.devices.size,
      lastUpdate: this.lastUpdate,
    };
  }

  getDevices(): BleDevice[] {
    return Array.from(this.devices.values());
  }

  getBeacons(): MinewBeacon[] {
    return Array.from(this.beacons.values());
  }

  getAuthorizedDevicesCount(): number {
    return Object.keys(this.authorizedDevicesMap).length;
  }

  setCallbacks(callbacks: {
    onDeviceFound?: OnDeviceFoundCallback;
    onBeaconFound?: OnBeaconFoundCallback;
    onError?: OnErrorCallback;
    onStateChange?: (status: BleScannerStatus) => void;
  }): void {
    this.onDeviceFound = callbacks.onDeviceFound || null;
    this.onBeaconFound = callbacks.onBeaconFound || null;
    this.onError = callbacks.onError || null;
    this.onStateChange = callbacks.onStateChange || null;
  }

  async startScan(options?: { minewOnly?: boolean }): Promise<boolean> {
    if (this.isScanning) {
      console.log('[BleScanner] Already scanning');
      return true;
    }

    const manager = this.getManager();

    const permissions = await BlePermissionsService.request();
    if (!permissions.allGranted) {
      this.handleError('Permisos no concedidos');
      return false;
    }

    const btState = await manager.state();
    if (btState !== State.PoweredOn) {
      this.handleError('Bluetooth no está disponible');
      return false;
    }

    await this.loadAuthorizedDevices();

    const deviceCount = this.getAuthorizedDevicesCount();
    this.devices.clear();
    this.beacons.clear();
    this.lastReportTime.clear();
    this.error = null;

    const minewOnly = options?.minewOnly ?? true;

    try {
      this.isScanning = true;
      this.updateState(BleScannerState.SCANNING);

      manager.startDeviceScan(
        null,
        {
          allowDuplicates: true,
        },
        this.handleDevice
      );

      console.log('[BleScanner] Scan started');
      return true;
    } catch (error: any) {
      this.handleError(`Error al iniciar escaneo: ${error.message}`);
      this.isScanning = false;
      return false;
    }
  }

  stopScan(): void {
    if (!this.isScanning) {
      console.log('[BleScanner] Not scanning');
      return;
    }

    const manager = this.getManager();
    manager.stopDeviceScan();

    this.isScanning = false;
    this.updateState(BleScannerState.IDLE);

    console.log('[BleScanner] Scan stopped');
  }

  clear(): void {
    this.devices.clear();
    this.beacons.clear();
    this.lastReportTime.clear();
    this.error = null;
    this.lastUpdate = null;
  }

  destroy(): void {
    this.stopScan();
    this.clear();
    
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }

    this.onDeviceFound = null;
    this.onBeaconFound = null;
    this.onError = null;
    this.onStateChange = null;

    BleScanner.instance = null;
  }
}
